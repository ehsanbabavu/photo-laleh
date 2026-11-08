# Maintenance announcements

Changing maintenance mode saves the new flag and an ordered recipient list atomically. The API responds after persistence; Telegram and Eitaa delivery continues in the background. The admin sidebar and mobile menu show processed, successful and failed counts, refreshing every five seconds while work remains.

Each Vercel Queue invocation handles one recipient/channel. A database compare-and-set lease prevents concurrent workers from sending together. Successful sends are spaced by at least one second. Failed deliveries retry after five seconds, up to three attempts, then the worker continues with the next recipient. A new toggle replaces unsent announcements from the previous state while allowing an already-running send to finish.

`vercel.json` registers `api/maintenance-notifications.ts` for the `maintenance-notifications` queue topic. Vercel supplies queue authentication through OIDC. Self-hosted Node uses timers and resumes persisted work on startup. A durable MongoDB or PostgreSQL connection is required to change the flag. Tokens stay in existing settings/environment variables and are read at delivery time; they are not copied into the queue.

The queue state is authoritative for the maintenance flag and is separate from ordinary settings writes. Storage-provider migrations include it. The signed-in administrator can inspect recipient statuses through `GET /api/admin/maintenance?includeRecipients=1`. If initial queue publication fails, a subsequent admin status request retries dispatch. A worker failure is retried by Vercel; delivery checkpoints are saved before publishing the next tick.

Delivery is at least once: a process crash after the provider accepts a message but before the database checkpoint can cause a duplicate. Checkpoints and stale-tick checks prevent repeats after normal completion or a failure publishing the next tick.

Run `npm run test:maintenance` for deterministic queue and mocked Express API tests, and `npm run test:transactions` for existing payment/deletion regressions. These tests use fixture tokens and do not send production messages. The API suite optionally runs browser checks when `PLAYWRIGHT_MODULE` points to an installed Playwright module; `BROWSER_EXECUTABLE` and `MAINTENANCE_EVIDENCE` select a browser binary and screenshot directory.
