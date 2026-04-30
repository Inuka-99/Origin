# Origin Chat

Native team chat backed by Supabase. No Rocket.Chat, no Matrix — just
Postgres tables, Supabase Storage for attachments, and the existing
Supabase realtime broadcast channels for live message delivery.

## What v1 ships

- **Direct messages** between any two workspace members. The server
  reuses an existing DM if one already exists between the two users,
  so opening a DM with the same person twice doesn't create dupes.
- **Group channels** with arbitrary membership and a name. Anyone in
  the group can add new members; anyone can leave.
- **Message history** — paginated, loaded oldest-first.
- **Realtime** — every send broadcasts on `chat:<channelId>`; the
  message panel subscribes and de-dupes.
- **Attachments** — files upload directly from the browser to a
  `chat-attachments` Supabase Storage bucket via a server-minted
  signed URL. Image attachments render inline; everything else
  renders as a download chip with size + filename.
- **Unread counts** per channel, computed from each member's
  `last_read_at`. Marked-as-read happens automatically when the user
  opens a channel.

Not in v1 (intentionally): typing/read indicators (the user
deselected those in the planning question), threads, reactions,
message edit/delete UI, mentions/notifications, calls.

## Rollout steps

1. **Apply the migration**

   `supabase/migrations/create_chat.sql` creates the three tables
   (`chat_channels`, `chat_channel_members`, `chat_messages`), the
   indexes, and a trigger that bumps `chat_channels.updated_at` on
   every insert so the channel list can sort by activity. Run it via
   the Supabase SQL editor or the CLI.

2. **Create the Storage bucket**

   In the Supabase Dashboard:
   - **Storage → New Bucket**, name `chat-attachments`.
   - Toggle **Public bucket** ON (the message rows store the
     resulting public URL; for fully private attachments, leave it
     off and switch the controller's `getPublicUrl` call to
     `createSignedUrl(path, 60 * 60)` for hour-long signed URLs).
   - No additional policies are needed — the server uses the
     service-role key for the upload-URL mint, and reads happen via
     the public URL.

3. **Restart the backend**

   `Ctrl+C` the Nest server, then `npm run dev`. You should see the
   new routes register:

   ```
   RoutesResolver ChatController {/chat}:
   Mapped {/chat/channels, GET}
   Mapped {/chat/channels, POST}
   Mapped {/chat/channels/:id, GET}
   Mapped {/chat/channels/:id/messages, GET}
   Mapped {/chat/channels/:id/messages, POST}
   Mapped {/chat/channels/:id/read, POST}
   Mapped {/chat/channels/:id/members, POST}
   Mapped {/chat/channels/:id/members/me, DELETE}
   Mapped {/chat/attachments/upload-url, POST}
   Mapped {/chat/people, GET}
   ```

4. **Use it**

   The frontend is already wired. Visit **Messages** in the sidebar.
   Click **New DM** or **New Group**, search for a teammate by name
   or email, send a message. Drop a file on the paperclip to attach
   one (10 MB-ish keeps things snappy; Supabase Storage's default
   per-request limit is generous).

## Known TODOs

- **ChatMobile.tsx still uses mock data.** The mobile route hasn't
  been migrated to the new hooks. Any pass through the mobile
  surface should reuse `useChannels` / `useMessages` from
  `src/app/lib/chat`.
- **No file-size enforcement on the client.** Add a check in
  `useMessages.send` if you want to reject oversized files before
  the upload starts.
- **Workspace people listing is unbounded.** `searchPeople` returns
  the first 30 profiles matching the query (or the first 30 alpha-
  ordered if no query). Fine for hundreds of users; if you grow
  past that, paginate it.

## Architecture reminder

```
Browser ──fetch──▶ Nest /chat/* ──▶ Supabase Postgres (chat_*)
                              └──▶ Supabase Storage (chat-attachments)
Browser ──realtime──▶ Supabase Realtime ──broadcast 'chat:<id>'──▶ Browser
```

Server-side broadcasts happen from `ChatService.broadcast`, fired
from `sendMessage`. Clients subscribe per-channel in
`useMessages.tsx`.
