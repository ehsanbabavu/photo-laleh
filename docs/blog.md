# Blog CMS

The administrator's **نوشته‌ها** menu expands into independent pages in both the desktop sidebar and mobile drawer:

| Page | Route |
| --- | --- |
| All posts | `/admin/posts` |
| Add or edit a post | `/admin/posts/write` (editing uses `?id=POST_ID`) |
| Categories | `/admin/posts/categories` |
| Tags | `/admin/posts/tags` |
| Comments | `/admin/posts/comments` |
| Media | `/admin/posts/media` |
| AI article settings and generation | `/admin/posts/ai-settings` |
| Settings | `/admin/posts/settings` |
| Trash | `/admin/posts/trash` |

Refresh and browser history retain the selected page. Existing `/admin/posts?section=...` links still work and resolve to the corresponding page. Leaving an unsaved post prompts for confirmation. Run `npm run test:admin-posts` to verify routing compatibility.

## Publishing

- Save drafts, publish immediately or choose a future publication time. Scheduled posts become public when that time arrives; no cron is required.
- Each post has a slug, excerpt, author, cover image and alt text, categories, tags, featured flag, comment switch and SEO fields. Draft previews require an administrator session and show the saved version.
- The editor retains the last ten content revisions. Restoring a revision fills the editor; saving applies it. Concurrent edits are rejected rather than overwritten.
- Posts can be duplicated, moved to trash, restored as drafts or permanently deleted from trash. Permanent deletion removes their comments too.
- Comments remain private until approved. Administrator moderation supports approval, spam, trash and permanent deletion. Comment email addresses are never exposed publicly.
- Media can be uploaded through the existing Vercel Blob integration or registered by URL. Removing a library entry does not delete the remote file; images referenced by posts cannot be removed from the library.

## Public routes and SEO

| Route | Content |
| --- | --- |
| `/blog/` | Post index with search and pagination |
| `/blog/:slug/` | Published article |
| `/blog/category/:slug/` | Category archive, including child categories |
| `/blog/tag/:slug/` | Tag archive |
| `/blog/feed.xml` | RSS feed |
| `/sitemap.xml` | Dynamic sitemap with the home page, blog and indexable published articles and archives |

Public HTML is rendered on the server with canonical URLs, Open Graph metadata and structured data. Published slug changes redirect old URLs. Drafts, future posts and trashed posts return 404 publicly. Previews, search results and posts with the no-index option are excluded from indexing. The Vercel rewrites route blog pages and the sitemap to dedicated API handlers; `public/blog.css` and `public/blog-client.js` supply the standalone presentation and comment form.

The blog rewrite uses `/blog/(.*)` to preserve trailing slashes and nested archive URLs. `sanitize-html` is pinned to 2.17.0 because the Vercel Node wrapper disables CommonJS `require()` of ES modules; newer sanitizer versions require an ESM-only parser. The test suite checks loading with that runtime restriction enabled.

## Storage and backups

Published article pages show a Persian-formatted view count beside the author, date and reading time. Each GET of the canonical article URL records one view, including reloads; HEAD requests, redirects, archives, missing/unpublished articles and administrator previews do not. Counts are page loads, not unique visitors, and existing articles start at zero because historical views were not recorded.

The count uses the existing revision-based compare-and-set storage, so concurrent visits and edits preserve it without changing the article's edit version or modification date. Editing ignores client-supplied counts, duplicates start at zero, and blog/site backups preserve counts. Older backups without a count restore it as zero. If a count write fails, the article still renders with its last saved count.

Blog data is stored separately from ordinary application state: MongoDB `blog_cms` (`_id: main`) or PostgreSQL `laleh_app_records` (`collection: __blog_cms`, `recordId: main`). Writes require a durable database and use revision-based compare-and-set. Provider migration copies and verifies blog data along with other operational data; no schema migration is needed.

The blog supports a maximum 12 MiB state and 200,000 characters per article. Images are stored externally. Blog settings offer JSON export/import; imports are validated, sanitized and applied atomically within blog storage. Full-site backups also include a `blog` field. Restoring an older site backup without that field preserves existing blog data. Full-site state and blog restoration are separate writes, not a cross-store transaction.

## Validation

After installing dependencies, run `npm run build`, `npm run test:blog` and `npm run test:maintenance`. Blog tests use isolated in-memory fixtures, never production data. The optional browser test runs when `PLAYWRIGHT_MODULE` points to an installed Playwright package; `BROWSER_EXECUTABLE` can select Edge/Chromium and `BLOG_EVIDENCE` can save screenshots. It exercises administrator editing/publication, anonymous reading/commenting, moderation, mobile layouts and trash. Existing transaction tests remain available through `npm run test:transactions`.


## AI-assisted article generation

The **نوشته‌ها → تنظیمات هوش مصنوعی** page (`/admin/posts/ai-settings`) contains the connection/model settings and **تولید خودکار توسط هوش مصنوعی**. The text-model input is no longer shown in the general photo AI settings, and the generator is no longer embedded in the post editor. Its optional key and base URL are saved separately as `avalaiBlogApiKey` and `avalaiBlogBaseUrl`; each empty field inherits its corresponding value from `/admin/chatgpt`. Clearing an override restores inheritance, including later changes to ChatGPT settings. Connection testing uses the same per-field fallback. The enabled flag and image model remain shared with photo processing; saving the general photo settings does not overwrite the blog text model or connection overrides.

The generator offers guides, practical tips, comparisons, buying guides and source-based news. Topics include photo printing/paper/sizes, mobile photography, portrait/ID photography, restoration, photo preservation, editing, home decor and family occasions, plus automatic topic selection. The server validates both selectors and includes their instructions in the text-generation request. News still requires source text and its URL and uses only those supplied facts.

AvalAI returns a Persian article (maximum 2,000 words), SEO fields, a category and tags, then generates a cover image with the saved image model and publishes through the normal CMS flow. The page opens the generated article in the editor after publication. Published articles enter the dynamic sitemap automatically.

Save the AI settings once before generating. The panel sends its connection overrides, text model, image model and enabled flag in one `/api/settings` request and reports success only after the database acknowledges it. Failed writes are shown in the panel. Generation reads these settings afresh from the active MongoDB/PostgreSQL database for every request:

- `settings.avalaiTextModel` selects the text model; `settings.avalaiModel` selects the image model. Missing models cause an error before any billed request. `AVALAI_TEXT_MODEL`, `AVALAI_IMAGE_MODEL` and request-body model fields cannot override these database values.
- The saved `avalaiBlogApiKey` and `avalaiBlogBaseUrl` take priority for both text and cover generation. Each empty override falls back to `avalaiApiKey` or `avalaiBaseUrl` from ChatGPT settings, then to `AVALAI_API_KEY` or `AVALAI_BASE_URL` when those defaults are empty. The final default base URL is `https://api.avalai.ir/v1`. Both saved API keys are hidden from non-administrator application-state responses.
- Connection testing uses the administrator-only `/api/settings/ai-test` endpoint, keeping provider requests on the server under the existing browser CSP. It tests the entered unsaved connection values, inherits current ChatGPT defaults for empty blog fields, and never writes settings itself. The panel saves after a successful test.
- `aiEnabled: false` stops generation before contacting the provider.

The saved cover model determines the request route:

- Mainline GPT models (`gpt-5.1`, `gpt-5.2` and newer GPT families, GPT-4.1/4o, or `chat-latest`) use `/responses` with the selected model at the top level and a forced `image_generation` tool call. The tool requests a new 1024×1024 image at medium quality. AvalAI resolves the tool's underlying image renderer; the app does not substitute another saved model or fall back to Images on rejection. This requires the selected AvalAI model and account to support the hosted image tool. See [AvalAI GPT-5.1 tool support](https://docs.avalai.org/en/news/2025-11-14-gpt-5-1-model-added), [AvalAI Responses image examples](https://docs.avalai.org/fa/api-reference/images) and [OpenAI image tool parameters](https://developers.openai.com/api/docs/guides/tools-image-generation).
- Gemini image models use `/chat/completions` with image/text modalities; their image data is read from `choices[0].message.images`.
- Dedicated image models such as `gpt-image-2.5-sunburst` use `/images/generations` without the legacy `response_format: "url"` parameter.

Responses images are read from `output` items of type `image_generation_call`, using their Base64 `result`. Incomplete or failed Responses/tool results and text-only responses fail before upload or publication. Both Base64 and remote image URLs are supported. Base64 images are validated and uploaded to Vercel Blob, requiring the existing `BLOB_READ_WRITE_TOKEN`; a data URL is never saved as the article cover. See [AvalAI Gemini image examples](https://docs.avalai.org/en/providers/google) and [GPT Image response formats](https://developers.openai.com/api/reference/resources/images/methods/generate).

Provider errors show the stage, actual selected model, HTTP status and bounded error message with API keys redacted. Network requests have deadlines. Vercel routes generation to `api/blog-ai-generate.ts` with a 300-second budget; the handler retains the normal administrator/session checks. Other API functions retain their 60-second budget. No schema migration is required.
