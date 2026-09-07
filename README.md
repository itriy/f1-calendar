# F1 Calendar

## Architecture

The frontend is organized with Feature-Sliced Design. See [the layer guide](src/ARCHITECTURE.md) for ownership and import-direction rules. Cloudflare Worker handlers live separately in `src/server`.

## News feed

The Worker collects recent Formula 1 news from configured public RSS/Atom feeds, stores normalized entries in D1, and exposes them at `/api/f1-feed`. Apply `migrations/0003_news_feed.sql` to the configured D1 database before deployment. The publisher headline and source link remain available without AI processing. Telegram is intentionally not ingested in this version.

## Scheduled refresh Worker

`f1-calendar-refresh` runs every five minutes and owns RSS refreshes and push-reminder delivery. It shares the `f1-calendar-push` D1 database with the website/API Worker. Configure the VAPID variables and `VAPID_PRIVATE_KEY` secret in each production Worker. CI deploys with `--keep-vars`, so those Cloudflare-managed runtime bindings persist without being stored in GitHub.

For manual releases, apply D1 migrations before deploying either Worker, and pass `--keep-vars` to both deployments. Migration `0006_push_delivery_expiry.sql` adds delivery deadlines; expired pending attempts become failed without sending stale reminders. Existing pending rows receive a conservative deadline one hour after their recorded next attempt.

Both Workers need the same original `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` pair and a valid `VAPID_SUBJECT`. Restore missing bindings from the original pair rather than generating new keys for existing subscriptions. `/api/push/config` returns 503 when required bindings are missing. Refresh Worker logs include `push_not_configured`, `push_delivery_failed` (HTTP status when available), `push_sent`, and `push_deliveries_expired`; application diagnostics omit keys, subscription URLs, and provider response bodies. A `push_sent` event means the push service accepted the request, not that the device displayed it.

## Local development

Run `npm run dev` and open [http://localhost:8787](http://localhost:8787). It builds the frontend, watches frontend assets, and serves them through the local Cloudflare Worker, so `/api/f1-videos` uses the same origin as the application. Worker code reloads through Wrangler; stop both processes with `Ctrl+C`.

The video feature works without configuration through Formula 1's official recent-video RSS feed. The only action required for full historical video discovery is to create a YouTube Data API v3 key in Google Cloud, copy `.dev.vars.example` to the ignored `.dev.vars`, and set `YOUTUBE_API_KEY` there. Keep the key on your machine; never send it in chat or add a `VITE_` prefix.

## Official Formula 1 video highlights

The race-history details load videos only from Formula 1's official YouTube channel. The browser calls `/api/f1-videos`; it never receives a YouTube API key, and each result is checked for Formula 1's fixed channel ID, an 11-character YouTube ID, and a matching season/race title. Accepted official formats are Race Highlights, Qualifying Highlights, Sprint Highlights, and short key-moment, overtake, battle, or top-moment videos. Every matching result from the official source is retained; the UI initially shows four and can expand to the complete set.

For full historical discovery, create a restricted YouTube Data API v3 key, enable the API in Google Cloud, and add it as the `YOUTUBE_API_KEY` Worker secret (or locally in `.dev.vars`). Do not prefix it with `VITE_` and do not commit it. The Worker uses the key only for a channel-restricted search.

Without a key, the Worker uses Formula 1's official YouTube RSS feed to discover recent highlights automatically. A small verified fallback covers selected older races when they have fallen out of that feed. If neither source returns a matching official upload, the UI says that the video has not yet been found.
