import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const htmlFiles = [
  "index.html",
  "404.html",
  ...Array.from({ length: 7 }, (_, index) => `post${index + 1}/index.html`)
];
const errors = [];
let schemaBlocks = 0;
let checkedReferences = 0;

for (const filename of htmlFiles) {
  const html = fs.readFileSync(path.join(root, filename), "utf8");
  const headings = html.match(/<h1\b/gi) || [];
  if (headings.length !== 1) errors.push(`${filename}: expected one h1, found ${headings.length}`);
  if (!html.includes('<html lang="en-CA">')) errors.push(`${filename}: missing en-CA language`);
  if (!html.includes("<title>")) errors.push(`${filename}: missing title`);
  if (html.includes('name="keywords"')) errors.push(`${filename}: obsolete keywords metadata remains`);
  if (/<img\b[^>]*\bsrc=["']https?:\/\//i.test(html)) errors.push(`${filename}: remote image hotlink remains`);

  if (filename !== "404.html") {
    if (!html.includes('rel="canonical"')) errors.push(`${filename}: missing canonical URL`);
    if (!html.includes('name="description"')) errors.push(`${filename}: missing description`);
  }

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(match[1]);
      schemaBlocks += 1;
    } catch (error) {
      errors.push(`${filename}: invalid JSON-LD (${error.message})`);
    }
  }

  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/.test(reference)) continue;
    const clean = reference.split("#")[0].split("?")[0];
    if (!clean) continue;
    let target = path.resolve(root, path.dirname(filename), clean);
    if (clean.endsWith("/")) target = path.join(target, "index.html");
    if (!fs.existsSync(target)) errors.push(`${filename}: missing local reference ${reference}`);
    checkedReferences += 1;
  }
}

const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");
const cards = homepage.match(/\bdata-post\b/g) || [];
if (cards.length !== 8) errors.push(`index.html: expected 8 article cards, found ${cards.length}`);

const rayPost = fs.readFileSync(path.join(root, "post6/index.html"), "utf8");
const technicalImages = rayPost.match(/<img\b[^>]*src="img\//g) || [];
if (technicalImages.length !== 8) errors.push(`post6: expected 8 technical screenshots, found ${technicalImages.length}`);

for (const filename of ["robots.txt", "sitemap.xml", "feed.xml", "img/og-blog.png"]) {
  if (!fs.existsSync(path.join(root, filename))) errors.push(`missing ${filename}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  htmlFiles: htmlFiles.length,
  schemaBlocks,
  articleCards: cards.length,
  technicalImages: technicalImages.length,
  checkedReferences,
  remoteImageHotlinks: 0
}, null, 2));
