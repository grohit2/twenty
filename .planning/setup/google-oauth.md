# Google OAuth Setup (Gmail + Calendar + SSO)

Reference: [Official Twenty Docs](https://docs.twenty.com/developers/self-host/capabilities/setup)
Source: `packages/twenty-docs/developers/self-host/capabilities/setup.mdx`

---

## 1. Prerequisites

### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### Enable Required APIs

Enable these three APIs in the project:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [People API](https://console.cloud.google.com/apis/library/people.googleapis.com)

---

## 2. OAuth Consent Screen

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select **External** user type (unless you have a Google Workspace org)
3. Fill in required app information (name, support email, etc.)
4. Add the required scopes (see section 6 below)
5. If the app is in **test mode**, add test users (see section 8)

---

## 3. OAuth Credentials

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. Select **Web application** as the application type
4. Add these **Authorized redirect URIs**:

| URI | Purpose |
|-----|---------|
| `https://{your-domain}/auth/google/redirect` | Google SSO login |
| `https://{your-domain}/auth/google-apis/get-access-token` | Gmail & Calendar integration |

For local development, use:
- `http://localhost:3000/auth/google/redirect`
- `http://localhost:3000/auth/google-apis/get-access-token`

5. Copy the **Client ID** and **Client Secret**

---

## 4. Configure in Twenty (Admin Panel — Recommended)

This is the default method when `IS_CONFIG_VARIABLES_IN_DB_ENABLED=true` (the default).

1. Access your Twenty instance (e.g. `http://localhost:3000`)
2. Go to **Settings > Admin Panel > Configuration Variables**
3. Find the **Google Auth** section and set:

| Variable | Value |
|----------|-------|
| `MESSAGING_PROVIDER_GMAIL_ENABLED` | `true` |
| `CALENDAR_PROVIDER_GOOGLE_ENABLED` | `true` |
| `AUTH_GOOGLE_CLIENT_ID` | Your Google Client ID |
| `AUTH_GOOGLE_CLIENT_SECRET` | Your Google Client Secret |
| `AUTH_GOOGLE_CALLBACK_URL` | `https://{your-domain}/auth/google/redirect` |
| `AUTH_GOOGLE_APIS_CALLBACK_URL` | `https://{your-domain}/auth/google-apis/get-access-token` |

Changes take effect immediately (within 15 seconds for multi-container deployments).

---

## 5. Alternative: .env Method

Use this if `IS_CONFIG_VARIABLES_IN_DB_ENABLED=false`.

Add to your `.env` file:

```bash
MESSAGING_PROVIDER_GMAIL_ENABLED=true
CALENDAR_PROVIDER_GOOGLE_ENABLED=true
AUTH_GOOGLE_CLIENT_ID=your-client-id
AUTH_GOOGLE_CLIENT_SECRET=your-client-secret
AUTH_GOOGLE_CALLBACK_URL=https://{your-domain}/auth/google/redirect
AUTH_GOOGLE_APIS_CALLBACK_URL=https://{your-domain}/auth/google-apis/get-access-token
```

Restart containers after changes.

---

## 6. Required Scopes

These are automatically requested by Twenty (no manual configuration needed):

- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/profile.emails.read`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.compose` (only when draft email is enabled)

Source: `packages/twenty-server/src/engine/core-modules/auth/utils/get-google-apis-oauth-scopes.ts`

---

## 7. Background Jobs

After configuring the integration, register these recurring jobs in your **worker container**:

```bash
yarn command:prod cron:messaging:messages-import
yarn command:prod cron:messaging:message-list-fetch
yarn command:prod cron:calendar:calendar-event-list-fetch
yarn command:prod cron:calendar:calendar-events-import
yarn command:prod cron:messaging:ongoing-stale
yarn command:prod cron:calendar:ongoing-stale
yarn command:prod cron:workflow:automated-cron-trigger
```

---

## 8. Test Mode Note

If your Google Cloud app is in **test mode** (not published):

- Only users added as test users can authenticate
- Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
- Add test users in the **Test users** section
- You can add up to 100 test users

---

## 9. Known Issues (Community)

- **Sync stuck**: Background cron jobs not running — ensure all cron commands from section 7 are registered in the worker container
- **Missing scopes**: If Gmail or Calendar sync fails, verify all three APIs (Gmail, Calendar, People) are enabled in Google Cloud Console
- **Token refresh**: Ensure `offline` access type is configured (handled automatically by Twenty)
- **Multi-container**: Both server and worker must be able to reach the database — admin panel changes propagate to both automatically

---

## 10. Key Source Files

| File | Purpose |
|------|---------|
| `packages/twenty-server/src/engine/core-modules/auth/utils/get-google-apis-oauth-scopes.ts` | OAuth scopes definition |
| `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts` | All config variables including Google auth |
| `packages/twenty-docs/developers/self-host/capabilities/setup.mdx` | Official setup documentation source |
