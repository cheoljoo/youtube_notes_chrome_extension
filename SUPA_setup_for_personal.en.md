# Personal Supabase Setup Guide (YouTube Notes Extension)

Use your own free Supabase project to store more notes and run the extension reliably. This guide focuses only on obtaining the values needed for the extension Settings: "Supabase URL" and "Supabase API Key (anon/public)".

Goal
- Create your own Supabase free project
- Obtain the `Supabase URL` and `Supabase API Key (anon/public)` for the extension Settings
- For schema, RLS, and optional DB size endpoint, see the full guide: [SUPABASE_SETUP.en.md](SUPABASE_SETUP.en.md)

Prereqs
- Sign up at https://supabase.com
- Access the Supabase Dashboard

Steps (Get Settings values)
1) Create a new Supabase project
   - Click "New Project" → choose organization/project → set region and database password → keep Free plan
   - Wait 1–2 minutes for provisioning
2) Go to Project Settings → API
   - Copy `Project URL` → this is the extension "Supabase URL"
   - Find `Project API Keys` → copy `anon` (public) key → this is the extension "Supabase API Key (anon/public)"
3) Enter values in the extension Settings (Options page)
   - Supabase URL: e.g., `https://xxxxx.supabase.co`
   - Supabase API Key (anon/public): e.g., `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Manual user email / ID: required. Use your email or a unique ID.
   - Click "Save".
4) Test the connection
   - Click "Test Connection" to check base API reachability
   - Click "Test REST" to check `notes` table REST access

Schema & Security (Reference)
- The extension needs a `notes` table and RLS policy for proper operation.
- Follow [SUPABASE_SETUP.en.md](SUPABASE_SETUP.en.md) for SQL and step-by-step instructions.
- Optional: set up a DB size endpoint (RPC recommended) to get authoritative size metrics. The extension auto-uses the RPC from your Supabase URL.

Notes
- Use only the `anon` (public) key in the extension. Never expose `service_role` in the client.
- Free plan limits storage and requests. If you get size warnings, clean up or consider paid.
- The email/ID in Settings is required and acts as your per-user key for syncing.

Troubleshooting
- If the connection fails after saving Settings:
  - Double-check your Supabase URL and anon key
  - Ensure the project is fully provisioned
  - Confirm you applied the `notes` table and RLS from [SUPABASE_SETUP.en.md](SUPABASE_SETUP.en.md)
- Check Dashboard logs or test REST calls directly if issues persist.
