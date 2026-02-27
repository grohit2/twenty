# Learning Log

Lessons learned during setup, debugging, and development.

---

## 2026-02-27: Server Crash During Email Import

### What happened

After connecting a Gmail account via IMAP/SMTP in Twenty (Settings > Accounts > Mail Account), the server crashed and restarted **twice**. The browser showed:

- `ERR_CONNECTION_RESET` on `/graphql` and `/metadata` endpoints
- `ERR_INCOMPLETE_CHUNKED_ENCODING` on `/metadata`
- `Failed to fetch` retry errors from Apollo Client

### Root cause

**Unhandled IMAP socket timeout** in the `imapflow` library.

The IMAP connection to Gmail timed out during the initial bulk email import. The `imapflow` library emitted an `error` event on the socket, but the Twenty server didn't have a handler for it — causing Node.js to throw an unhandled error and crash the process.

```
Error: Socket timeout
    at TLSSocket.<anonymous> (/app/node_modules/imapflow/lib/imap-flow.js:795:29)
    at TLSSocket.emit (node:events:508:28)
    at Socket._onTimeout (node:net:604:8)
```

The error is `throw er; // Unhandled 'error' event` — Node.js's default behavior when an EventEmitter emits `error` with no listener.

### Timeline of events

1. First failed connection attempts — wrong credentials (email in password field, name instead of email as username)
   ```
   ERROR [ImapSmtpCaldavService] IMAP connection failed: Command failed
   ERROR [ExceptionsHandler] UserInputError: IMAP authentication failed
   ```

2. Successful connection — email import started

3. **IMAP socket timeout** — Gmail closed the connection during bulk import (30-second timeout hit)
   - Server process crashed (exit code 0, clean shutdown after unhandled error)
   - Docker `restart: always` restarted the container

4. **Second socket timeout** — same thing on restart (import resumed, hit timeout again)
   - Server restarted again (total restart count: 2)

5. Third startup — server stabilized. Email import continued in smaller batches via the worker's 5-minute cron cycle

### Why it resolved itself

- Docker's `restart: always` policy auto-restarted the server
- After restart, the email sync resumes from where it left off (using IMAP UID tracking)
- Subsequent syncs fetch smaller incremental batches, avoiding the timeout
- The initial bulk import is the only time this is likely to happen

### Other console errors (harmless)

| Error | Cause | Impact |
|-------|-------|--------|
| `Uncompiled message detected` | Lingui i18n translations not compiled for some messages | Cosmetic only — messages display in English |
| `tokenPair is undefined` | Normal on page load before authentication completes | None |
| `Apollo cache merge warnings` (CompanyConnection, PersonConnection) | Apollo Client cache policy warnings for connection types | Cosmetic — data still loads correctly |
| `fragment with name X already exists` | Duplicate GraphQL fragment names in generated code | Cosmetic warning |
| `404 on twenty-icons.com` | Missing company favicon | Cosmetic |
| `url.parse() deprecation` | Node.js deprecation warning in imapflow library | None — still works |

### Lessons

1. **Initial email import can crash the server** — The first sync after connecting a large Gmail account triggers a bulk import that may timeout the IMAP socket. The server auto-recovers via Docker restart, and subsequent syncs work fine.

2. **The imapflow socket timeout is a known issue** — The Twenty server has a hard-coded 30-second connection timeout and 16-second greeting timeout in `imap-client.provider.ts`. Large mailboxes can exceed these during initial sync.

3. **Most browser console errors in Twenty are harmless** — i18n warnings, Apollo cache warnings, and fragment warnings are all cosmetic. Only `ERR_CONNECTION_RESET` indicates a real problem (server down).

4. **Gmail IMAP requires specific credentials** — Regular Google password doesn't work. Need: 2FA enabled → App Password generated → use full email as username (not display name).

### If it happens again

- Wait ~1-2 minutes for Docker to auto-restart the server
- Refresh the browser
- Email sync resumes automatically from where it left off
- If it keeps crashing repeatedly, increase Docker memory limit in `docker-compose.yml`:
  ```yaml
  server:
    deploy:
      resources:
        limits:
          memory: 2G
  ```

---
