# F1 Calendar

## News feed

The Worker collects recent Formula 1 news from configured public RSS/Atom feeds, stores normalized entries in D1, and exposes them at `/api/f1-feed`. Apply `migrations/0003_news_feed.sql` to the configured D1 database before deployment. With `GEMINI_API_KEY`, new headlines receive a short Ukrainian synopsis; without it, the publisher headline and source link remain available. Telegram is intentionally not ingested in this version.

## Local development

Run `npm run dev` and open [http://localhost:8787](http://localhost:8787). It builds the frontend, watches frontend assets, and serves them through the local Cloudflare Worker, so `/api/f1-videos` uses the same origin as the application. Worker code reloads through Wrangler; stop both processes with `Ctrl+C`.

The video feature works without configuration through Formula 1's official recent-video RSS feed. The only action required for full historical video discovery is to create a YouTube Data API v3 key in Google Cloud, copy `.dev.vars.example` to the ignored `.dev.vars`, and set `YOUTUBE_API_KEY` there. Keep the key on your machine; never send it in chat or add a `VITE_` prefix.

## Official Formula 1 video highlights

The race-history details load videos only from Formula 1's official YouTube channel. The browser calls `/api/f1-videos`; it never receives a YouTube API key, and each result is checked for Formula 1's fixed channel ID, an 11-character YouTube ID, and a matching season/race title. Accepted official formats are Race Highlights, Qualifying Highlights, Sprint Highlights, and short key-moment, overtake, battle, or top-moment videos. Every matching result from the official source is retained; the UI initially shows four and can expand to the complete set.

For full historical discovery, create a restricted YouTube Data API v3 key, enable the API in Google Cloud, and add it as the `YOUTUBE_API_KEY` Worker secret (or locally in `.dev.vars`). Do not prefix it with `VITE_` and do not commit it. The Worker uses the key only for a channel-restricted search.

Without a key, the Worker uses Formula 1's official YouTube RSS feed to discover recent highlights automatically. A small verified fallback covers selected older races when they have fallen out of that feed. If neither source returns a matching official upload, the UI says that the video has not yet been found.
