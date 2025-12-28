# Supabase Setup Guide (English)

This guide walks through creating the `notes` table, basic policies, getting API keys, wiring the extension, and configuring an authoritative DB size endpoint.

## 1. Create a Supabase Project

1. Go to https://supabase.com and sign up
2. Click "New Project"
3. Choose a name and set a database password
4. Select a region near you
5. Wait for provisioning (~2 minutes)

## 2. Create the `notes` table

In Dashboard → SQL Editor → New query, run:

```sql
-- Create notes table (with user_email)
CREATE TABLE notes (
  id BIGSERIAL PRIMARY KEY,
  time BIGINT NOT NULL,
  user_email TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  opinion TEXT,
  url TEXT,
  youtube_title TEXT,
  youtube_published TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(time, user_email)
);

-- Indexes for performance
CREATE INDEX idx_notes_time ON notes(time DESC);
CREATE INDEX idx_notes_user_email ON notes(user_email);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Personal use policy (simplest): everyone can access everything
-- For personal projects or testing only
DROP POLICY IF EXISTS "Enable all access for all users" ON notes;
CREATE POLICY "Enable all access for all users" ON notes
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

Table schema notes:
- `time` + `user_email` are the unique composite key
- `tags` is an array of text
- `youtube_title`, `youtube_published`, and `url` are optional metadata

For production, create stricter RLS policies with Supabase Auth and user IDs.

## 3. Get API keys

Dashboard → Settings → API:
- Project URL: `https://xxxxx.supabase.co`
- anon public key: `eyJhbGciOi...`

Important: Use only the `anon` key in the extension. Never expose `service_role` on the client.

## 4. Extension Settings

Open the extension Options page and enter:
- Supabase URL: your Project URL
- Supabase API Key (anon/public): your anon key
- Manual user email / ID: required. This identifier is used to separate your notes from other users.
- Save, then use "Test Connection" and "Test REST".

## 5. Sync usage

- Save a note → auto-sync uploads to Supabase if configured
- Click "⇅ Sync" → two-way sync: upload local-only, download remote-only, then merge
- Use the same Settings on another machine to access your notes

## 6. Check data

Dashboard → Table Editor → `notes` to view stored notes.

## 7. Security considerations

Personal/testing:
- Simple policy allows all access (not recommended for shared projects)
- The extension still filters by your `user_email` when calling REST

Production:
- Use Supabase Auth and JWT
- Add `user_id` (`UUID REFERENCES auth.users(id)`) and policies with `auth.uid()`
- Keep service role keys only on server-side (Edge Functions)

## 8. Troubleshooting

Connection failed:
- Verify URL and anon key
- Check project provisioning and REST availability

Sync failed:
- Ensure `notes` exists and includes `user_email`
- Review RLS policy behavior

Duplicate key errors:
- `time` + `user_email` must be unique per note

## 9. REST API endpoints (used by extension)

```text
GET  /rest/v1/notes?select=*&user_email=eq.<email>&order=time.desc
POST /rest/v1/notes  (JSON body: note payload)
GET  /rest/v1/notes?select=*&user_email=eq.<email>&time=gt.<timestamp>
DELETE /rest/v1/notes?time=eq.<time>&user_email=eq.<email>
```

All requests include `user_email` filters.

## 10. Costs

Free plan (typical): database/storage/user limits suitable for personal use.

## 11. DB Size Endpoint (authoritative)

To display accurate DB size in the extension, set one of:

### A. `notes` table total size (recommended)

Run this function in SQL Editor:

```sql
create or replace function public.get_notes_table_size_json()
returns jsonb
language sql
stable
security definer
as $$
  select jsonb_build_object('bytes', pg_total_relation_size('public.notes'::regclass));
$$;
```

Grant permissions (RPC):

```sql
grant execute on function public.get_notes_table_size_json() to anon;
```

RPC endpoint:
- URL: `<SUPABASE_URL>/rest/v1/rpc/get_notes_table_size_json`
- Headers: `apikey: <anon-key>`, `Accept: application/json`, `Content-Type: application/json`
- Body: `{}`

Test (PowerShell):

```powershell
$url = "<SUPABASE_URL>/rest/v1/rpc/get_notes_table_size_json"
$headers = @{ apikey = "<anon-key>"; Accept = "application/json"; "Content-Type" = "application/json" }
Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body "{}"
```

Returns: `{ "bytes": 123456 }`

### B. Whole database size (optional)

```sql
create or replace function public.get_db_size_bytes_json()
returns jsonb
language sql
stable
security definer
as $$
  select jsonb_build_object('bytes', pg_database_size(current_database()));
$$;
```

### C. Edge Function (secure server-side)

Prefer this if you need service role or more logic on the server:
- Example: `https://<project-ref>.functions.supabase.co/db-size`
- Call the RPC internally and return `{bytes}`

### D. Extension wiring

- The extension auto-derives the RPC endpoint from your Supabase URL: `<SUPABASE_URL>/rest/v1/rpc/get_notes_table_size_json`.
- If you use an Edge Function, set `DB_SIZE_ENDPOINT_DEFAULT` in `popup.js` to your function URL.
- If the endpoint fails, the extension falls back to a local JSON size estimate.

### User identifier (required)

- The Options page field "Manual user email / ID" is required. It is used as the per-user key (`user_email`) for syncing.
