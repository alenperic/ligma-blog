import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const htmlFiles = [
  "index.html",
  "404.html",
  ...Array.from({ length: 9 }, (_, index) => `post${index + 1}/index.html`)
];
const errors = [];
let schemaBlocks = 0;
let checkedReferences = 0;
let remoteArticleImages = 0;

for (const filename of htmlFiles) {
  const html = fs.readFileSync(path.join(root, filename), "utf8");
  const headings = html.match(/<h1\b/gi) || [];
  if (headings.length !== 1) errors.push(`${filename}: expected one h1, found ${headings.length}`);
  if (!html.includes('<html lang="en-CA">')) errors.push(`${filename}: missing en-CA language`);
  if (!html.includes("<title>")) errors.push(`${filename}: missing title`);
  if (html.includes('name="keywords"')) errors.push(`${filename}: obsolete keywords metadata remains`);
  remoteArticleImages += (html.match(/<img\b[^>]*\bdata-remote-media\b/gi) || []).length;

  if (filename !== "404.html") {
    if (!html.includes('rel="canonical"')) errors.push(`${filename}: missing canonical URL`);
    if (!html.includes('name="description"')) errors.push(`${filename}: missing description`);
    if (!html.includes('rel="alternate" hreflang="en-CA"')) errors.push(`${filename}: missing hreflang`);
    if (!html.includes('property="og:image:secure_url"')) errors.push(`${filename}: missing secure Open Graph image`);
    if (!html.includes('name="twitter:image:alt"')) errors.push(`${filename}: missing Twitter image alt text`);
    if (!html.includes("G-VMD9STL32Q")) errors.push(`${filename}: homepage analytics tag is not aligned`);
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
if (cards.length !== 10) errors.push(`index.html: expected 10 article cards, found ${cards.length}`);

const featuredCards = homepage.match(/class="[^"]*\bfeatured\b[^"]*"/g) || [];
if (featuredCards.length !== 2) errors.push(`index.html: expected 2 featured cards, found ${featuredCards.length}`);

if (!/<div class="post-grid">\s*<a class="post-card featured reveal" href="\.\/post9\/"/.test(homepage)) {
  errors.push("index.html: post9 must be the first article card");
}

const rayPost = fs.readFileSync(path.join(root, "post6/index.html"), "utf8");
const technicalImages = rayPost.match(/<img\b[^>]*src="img\//g) || [];
if (technicalImages.length !== 8) errors.push(`post6: expected 8 technical screenshots, found ${technicalImages.length}`);

const glmPost = fs.readFileSync(path.join(root, "post8/index.html"), "utf8");
const originalMemes = glmPost.match(/<figure\b[^>]*class="meme-panel"/g) || [];
if (originalMemes.length !== 3) errors.push(`post8: expected 3 original meme panels, found ${originalMemes.length}`);
if (!glmPost.includes('class="results-panel"')) errors.push("post8: missing scan-friendly results panel");
if (!glmPost.includes('class="industry-section"')) errors.push("post8: missing industry implications section");
if (glmPost.includes("routes each request")) errors.push("post8: obsolete per-request MoE wording remains");
if (glmPost.includes("clearest confirmed bottleneck")) errors.push("post8: bottleneck claim remains unqualified");

const requiredPost8Links = [
  "https://huggingface.co/zai-org/GLM-5.3-Flash",
  "https://huggingface.co/unsloth/GLM-5.3-Flash-GGUF/tree/main/UD-IQ2_XXS",
  "https://github.com/unslothai/llama.cpp/tree/glm5next/upstream",
  "https://github.com/ggml-org/llama.cpp/pull/27754",
  "https://github.com/unslothai/llama.cpp/commit/949f7efb097eb20ef36fecdb1afaebff9a4ae7ed"
];
for (const url of requiredPost8Links) {
  if (!glmPost.includes(url)) errors.push(`post8: missing source link ${url}`);
}

const post8SocialImage = "https://ligma.blog/post8/img/og-glm-5-3-flash.png";
if (!glmPost.includes(`<meta property="og:image" content="${post8SocialImage}"`)) {
  errors.push("post8: missing post-specific Open Graph image");
}
if (!glmPost.includes(`<meta name="twitter:image" content="${post8SocialImage}"`)) {
  errors.push("post8: missing post-specific Twitter image");
}

const socialImagePath = path.join(root, "post8/img/og-glm-5-3-flash.png");
if (fs.existsSync(socialImagePath)) {
  const png = fs.readFileSync(socialImagePath);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== 1200 || height !== 630) {
    errors.push(`post8: social image must be 1200x630, found ${width}x${height}`);
  }
}

const expectedRestoredImages = new Map([["post4/index.html", 14], ["post5/index.html", 17], ["post7/index.html", 8]]);
for (const [filename, expected] of expectedRestoredImages) {
  const html = fs.readFileSync(path.join(root, filename), "utf8");
  const actual = (html.match(/<img\b[^>]*\bdata-remote-media\b/gi) || []).length;
  if (actual !== expected) errors.push(`${filename}: expected ${expected} restored article images, found ${actual}`);
}

for (const filename of ["robots.txt", "sitemap.xml", "feed.xml", "img/og-blog.png", "post8/img/og-glm-5-3-flash.png"]) {
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
  restoredRemoteArticleImages: remoteArticleImages
}, null, 2));

