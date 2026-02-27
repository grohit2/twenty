# Email & Calendar Setup Guide

**Created:** 2026-02-27
**Feature:** IMAP/SMTP/CalDAV Connected Accounts (added in Twenty v1.3.0)

## Overview

Twenty supports three email/calendar providers:
1. **Google (Gmail)** — OAuth-based, requires Google Cloud project
2. **Microsoft (Outlook)** — OAuth-based, requires Azure AD app
3. **IMAP/SMTP/CalDAV** — Credentials-based, works with any email provider

IMAP/SMTP/CalDAV is the simplest to set up — no OAuth app registration needed. Each user enters their own credentials in the UI.

---

## Server Configuration

### Environment Variable

Only one env var is needed (and it's **enabled by default**):

```
IS_IMAP_SMTP_CALDAV_ENABLED=true
```

This is already `true` by default — you don't need to set it unless you want to disable it.

**For Docker Compose:** If you want to be explicit, add it to both `server` and `worker` environment sections in `docker-compose.yml`:

```yaml
environment:
  IS_IMAP_SMTP_CALDAV_ENABLED: "true"
```

No other server-side configuration is required for IMAP/SMTP/CalDAV.

---

## Gmail Setup — Step by Step (Verified Working)

This was tested and confirmed working on 2026-02-27.

### Prerequisites (do these FIRST)

**Step 1: Enable 2-Step Verification on Google**
1. Go to https://myaccount.google.com/security
2. Find "2-Step Verification" → click it → turn it **ON**
3. Follow Google's prompts (phone number, backup codes, etc.)

**Step 2: Enable IMAP in Gmail**
1. Go to https://mail.google.com
2. Click gear icon (top right) → **See all settings**
3. Go to **Forwarding and POP/IMAP** tab
4. Under "IMAP Access" → select **Enable IMAP**
5. Click **Save Changes**

**Step 3: Generate a Google App Password**
1. Go to https://myaccount.google.com/apppasswords
2. If this page doesn't load, 2FA isn't enabled yet (go back to Step 1)
3. Enter a name like "Twenty CRM" → click **Create**
4. Google shows a **16-character code** (e.g., `abcd efgh ijkl mnop`)
5. **Copy this code** — you'll need it below. This is your password for IMAP/SMTP.

### Fill in the Twenty Form

In Twenty: **Settings > Accounts > Add Account > Mail Account**

**IMAP Configuration (receiving emails):**

| Field | Value |
|-------|-------|
| IMAP Server | `imap.gmail.com` |
| IMAP Username | `your.email@gmail.com` (your full email address) |
| IMAP Password | `<16-char App Password from Step 3>` |
| IMAP Port | `993` |
| IMAP Encryption | `SSL/TLS` |

**SMTP Configuration (sending emails):**

| Field | Value |
|-------|-------|
| SMTP Server | `smtp.gmail.com` |
| SMTP Username | `your.email@gmail.com` (your full email address) |
| SMTP Password | `<same App Password>` |
| SMTP Port | `465` |
| SMTP Encryption | `SSL/TLS` |

**CalDAV Configuration:** Leave all fields blank for now (skip calendar sync).

Click **Save**. Twenty tests the connection — if it passes, import begins immediately.

### Common Mistakes to Avoid

| Mistake | Fix |
|---------|-----|
| Put email address in the password field | Password = the 16-char App Password from Google |
| Used your name as username (e.g., "rohit garlapati") | Username = your full email address (e.g., `grc9731@gmail.com`) |
| Used regular Gmail password | Must use App Password — regular password won't work with IMAP |
| Used SMTP port 587 | For Gmail with SSL/TLS, use port **465** |
| Didn't enable IMAP in Gmail settings | Go to Gmail Settings > Forwarding and POP/IMAP > Enable IMAP |
| 2FA not enabled | App Passwords require 2-Step Verification to be ON |

### What Happens After Connecting

1. Twenty starts **importing all your emails** — this takes a few minutes depending on mailbox size
2. Email addresses are **matched to Person/Company records** automatically
3. Matched emails appear on each contact's **Timeline**
4. New emails sync every **~5 minutes** via background cron jobs

---

## Per-User Setup (General)

Each user connects their own email account:

1. Go to **Settings > Accounts**
2. Click **Add Account** (or the + button)
3. Select **Mail Account** (IMAP/SMTP/CalDAV option)
4. Fill in the connection details (see provider settings below)
5. Click **Save** — Twenty tests the connection before saving

### What to fill in

You can configure any combination of:
- **IMAP** — to receive/sync emails (required for email timeline)
- **SMTP** — to send emails from Twenty
- **CalDAV** — to sync calendar events

At least one protocol must be configured.

---

## Provider Settings

### Gmail

**Prerequisites:** Enable 2FA on your Google account, then generate an [App Password](https://support.google.com/accounts/answer/185833).

| Field | Value |
|-------|-------|
| **Email Address** | your.email@gmail.com |
| **IMAP Server** | imap.gmail.com |
| **IMAP Port** | 993 |
| **IMAP Encryption** | SSL/TLS |
| **IMAP Username** | (leave blank — defaults to email) |
| **IMAP Password** | Your App Password (NOT your Google password) |
| **SMTP Server** | smtp.gmail.com |
| **SMTP Port** | 465 |
| **SMTP Encryption** | SSL/TLS |
| **SMTP Username** | your.email@gmail.com |
| **SMTP Password** | Same App Password |

**CalDAV (Google Calendar):**

| Field | Value |
|-------|-------|
| **CalDAV Server** | https://apidata.googleusercontent.com/caldav/v2 |
| **CalDAV Username** | your.email@gmail.com |
| **CalDAV Password** | Same App Password |

### Office 365 / Outlook

**Prerequisites:** If 2FA is enabled, generate an [App Password](https://support.microsoft.com/en-us/account-billing/manage-app-passwords-for-two-step-verification-d6dc8c6d-4bf7-4851-ad95-6d07799387e9).

| Field | Value |
|-------|-------|
| **Email Address** | your.email@outlook.com |
| **IMAP Server** | outlook.office365.com |
| **IMAP Port** | 993 |
| **IMAP Encryption** | SSL/TLS |
| **IMAP Password** | Your password or App Password |
| **SMTP Server** | smtp.office365.com |
| **SMTP Port** | 587 |
| **SMTP Encryption** | SSL/TLS (uses STARTTLS) |
| **SMTP Password** | Same password |

**CalDAV (Outlook Calendar):**

| Field | Value |
|-------|-------|
| **CalDAV Server** | https://outlook.office365.com |
| **CalDAV Username** | your.email@outlook.com |
| **CalDAV Password** | Same password |

### Yahoo Mail

**Prerequisites:** Generate a Yahoo [App Password](https://login.yahoo.com/account/security/app-passwords).

| Field | Value |
|-------|-------|
| **Email Address** | your.email@yahoo.com |
| **IMAP Server** | imap.mail.yahoo.com |
| **IMAP Port** | 993 |
| **IMAP Encryption** | SSL/TLS |
| **IMAP Password** | Your App Password |
| **SMTP Server** | smtp.mail.yahoo.com |
| **SMTP Port** | 465 |
| **SMTP Encryption** | SSL/TLS |
| **SMTP Password** | Same App Password |

### Custom / Self-hosted (e.g., Fastmail, Zoho, Proton Bridge)

Ask your email provider for IMAP/SMTP server details, or check their documentation. The form fields map directly to standard IMAP/SMTP settings.

---

## How Email Sync Works

1. **Initial sync:** Twenty fetches all folders, discovers Sent folder, and imports messages
2. **Ongoing sync:** Cron jobs poll every ~5 minutes for new messages
3. **Participant matching:** Email addresses are matched to Person/Company records
4. **Timeline:** Matched emails appear on the contact's timeline, across ALL connected accounts

### Admin Visibility

If 10 employees each connect their email:
- Employee A emails candidate@example.com
- Employee B emails candidate@example.com
- Open the candidate's record → Timeline shows **all emails from both employees** in chronological order

This works because:
- Each connected account syncs independently
- `match-participant` module links email addresses to records
- Timeline aggregates all activities per record across all workspace members

---

## Sync Protocols Used

| Protocol | Library | Purpose |
|----------|---------|---------|
| IMAP | `imapflow` | Receive/sync emails. Supports CONDSTORE and QRESYNC (RFC 5162) for efficient incremental sync |
| SMTP | `nodemailer` | Send emails. Also appends sent messages to IMAP Sent folder |
| CalDAV | `tsdav` | Sync calendar events. Uses RFC 6578 sync-collection for incremental sync |

---

## Known Limitations

| Limitation | Details |
|------------|---------|
| **No email aliases** | IMAP protocol doesn't expose alias info. Only the primary email address is synced |
| **No attachments yet** | Coming in H1 2026 per Twenty roadmap |
| **Polling only** | No IMAP IDLE/push — sync runs on 5-minute cron intervals |
| **True mailboxes only** | Forwarding aliases (e.g., support@domain.com forwarding to john@domain.com) can't be connected |
| **Passwords stored in plain text** | Credentials stored unencrypted in DB (Twenty's design decision — DB access implies broader compromise) |
| **CalDAV requires RFC 6578** | Server must support incremental sync. Compatible: Nextcloud, iCloud, Fastmail. Incompatible: some older servers |
| **Drafts need IMAP + SMTP** | Creating drafts requires IMAP to append to Drafts folder |
| **Self-signed TLS accepted** | `rejectUnauthorized: false` is hard-coded — potential MitM risk in strict environments |
| **SSRF protection** | Cannot connect to localhost or private IPs (security measure for multi-user deployments) |

---

## Troubleshooting

### Connection fails immediately
- Check server hostname (no `https://` prefix for IMAP/SMTP — just the hostname)
- Verify port is correct (993 for IMAP SSL, 587 for SMTP STARTTLS, 465 for SMTP SSL)
- For Gmail/Outlook: make sure you're using an **App Password**, not your regular password

### Emails not syncing
- Check Docker logs: `docker compose logs -f worker`
- Ensure cron jobs are registered (they run on the server container by default)
- Wait 5 minutes for the next sync cycle

### CalDAV connection rejected
- Ensure your CalDAV server supports RFC 6578 (sync-collection)
- For CalDAV, the host field should be a full URL (e.g., `https://caldav.example.com`)
- For IMAP/SMTP, the host field should be just the hostname (e.g., `imap.gmail.com`)

---

## Key Source Files

| Purpose | Path |
|---------|------|
| Env var declaration | `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts` |
| Connection types | `packages/twenty-server/src/engine/core-modules/imap-smtp-caldav-connection/types/` |
| GraphQL resolver | `packages/twenty-server/src/engine/core-modules/imap-smtp-caldav-connection/imap-smtp-caldav-connection.resolver.ts` |
| IMAP client | `packages/twenty-server/src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider.ts` |
| IMAP sync logic | `packages/twenty-server/src/modules/messaging/message-import-manager/drivers/imap/services/imap-sync.service.ts` |
| SMTP send | `packages/twenty-server/src/modules/messaging/message-outbound-manager/drivers/imap/services/imap-smtp-message-outbound.service.ts` |
| CalDAV client | `packages/twenty-server/src/modules/calendar/calendar-event-import-manager/drivers/caldav/lib/caldav.client.ts` |
| Frontend form | `packages/twenty-front/src/modules/settings/accounts/components/SettingsAccountsConnectionForm.tsx` |
| User guide | `packages/twenty-docs/user-guide/calendar-emails/overview.mdx` |

---

*Created: 2026-02-27*
*Feature available since: Twenty v1.3.0*
