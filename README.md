# LIGMA.BLOG

Static cybersecurity and applied AI publication by Alen Peric, hosted on GitHub Pages at [ligma.blog](https://ligma.blog/).

## Structure

- `index.html` — searchable, filterable article archive
- `post1/` through `post7/` — standalone article pages
- `assets/blog.css` — shared visual and reading system
- `assets/blog.js` — archive filters, reading progress, code-copy controls, and remote-media fallbacks
- `scripts/rebuild-articles.mjs` — rebuilds article shells without modifying article content
- `scripts/validate-site.mjs` — checks metadata, structured data, image paths, and local links
- `feed.xml` and `sitemap.xml` — RSS and search discovery

Run `node scripts/rebuild-articles.mjs` after changing article-shell metadata or shared navigation. Article prose remains between the generated content markers in each post.

To reconstruct article content from a historical version, pass a commit SHA: `node scripts/rebuild-articles.mjs --source-ref=<commit>`. The rebuild keeps inline article media, applies lazy-loading safeguards, and replaces the retired TechCrunch image URL used in post 5.

Run `node scripts/validate-site.mjs` before publishing.
