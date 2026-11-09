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

Blog data is stored separately from ordinary application state: MongoDB `blog_cms` (`_id: main`) or PostgreSQL `laleh_app_records` (`collection: __blog_cms`, `recordId: main`). Writes require a durable database and use revision-based compare-and-set. Provider migration copies and verifies blog data along with other operational data; no schema migration is needed.

The blog supports a maximum 12 MiB state and 200,000 characters per article. Images are stored externally. Blog settings offer JSON export/import; imports are validated, sanitized and applied atomically within blog storage. Full-site backups also include a `blog` field. Restoring an older site backup without that field preserves existing blog data. Full-site state and blog restoration are separate writes, not a cross-store transaction.

## Validation

After installing dependencies, run `npm run build`, `npm run test:blog` and `npm run test:maintenance`. Blog tests use isolated in-memory fixtures, never production data. The optional browser test runs when `PLAYWRIGHT_MODULE` points to an installed Playwright package; `BROWSER_EXECUTABLE` can select Edge/Chromium and `BLOG_EVIDENCE` can save screenshots. It exercises administrator editing/publication, anonymous reading/commenting, moderation, mobile layouts and trash. Existing transaction tests remain available through `npm run test:transactions`.


## AI-assisted article generation

The post editor includes **تولید خودکار توسط هوش مصنوعی**. It asks AvalAI for a Persian article (maximum 2,000 words), SEO fields, a category and tags, then generates a cover image with the configured Sunbrost image model and publishes through the normal CMS flow. Published articles enter the dynamic sitemap automatically. News generation requires the operator to provide both the source text and its URL; the model is instructed to use only those supplied facts.

The generator first reads the AvalAI key, base URL and image model from the existing administrator AI settings. Environment variables can override those values:

- `AVALAI_API_KEY` (optional override): secret AvalAI API key. It is never sent to the browser.
- `AVALAI_BASE_URL` (optional): defaults to `https://api.avalai.ir/v1`.
- `AVALAI_TEXT_MODEL` (optional): defaults to `gpt-4o-mini`.
- `AVALAI_IMAGE_MODEL` (optional): defaults to `gpt-image-2.5-sunburst`.

If there is no saved key or an environment override, generation fails with a clear error and no article is published. Generated image URLs are saved as the featured image; use a durable image URL from the provider or configure the provider to return persistent URLs.
