import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const sourceRef = process.argv.find((argument) => argument.startsWith("--source-ref="))?.split("=")[1];

if (sourceRef && !/^[0-9a-f]{7,40}$/i.test(sourceRef)) {
  throw new Error("--source-ref must be a Git commit SHA");
}

const articles = [
  {
    id: 8,
    title: "Big Model, Small GPU",
    fullTitle: "Big Model, Small GPU — Running GLM‑5.3‑Flash at Home",
    description: "How a single RTX 5070 Ti, 128 GB of RAM, aggressive quantization, and CPU offloading made a 321B GLM‑5.3‑Flash model run at home.",
    category: "Local AI",
    date: "2026-09-04",
    displayDate: "September 2026",
    minutes: 5,
    keywords: ["GLM-5.3-Flash", "llama.cpp", "RTX 5070 Ti", "GGUF", "quantization", "local AI", "Mixture of Experts"]
  },
  {
    id: 7,
    title: "The Top 8 LLM Vulnerabilities",
    fullTitle: "The Top 8 LLM Vulnerabilities: A Blueprint for Enterprise AI Security",
    description: "A practical blueprint for identifying, assessing, and remediating AI-specific risks in enterprise environments.",
    category: "AI security",
    date: "2026-03-16",
    displayDate: "March 2026",
    minutes: 6,
    keywords: ["AI security", "LLM vulnerabilities", "prompt injection", "red teaming", "AIBOM"]
  },
  {
    id: 6,
    title: "Learning Ray on K3s",
    fullTitle: "Learning Ray on K3s: From Setup to Production-Ready CyberLLM RAG",
    description: "A hands-on guide to building, scaling, and validating a cybersecurity retrieval system with Ray, K3s, and Kubernetes.",
    category: "AI infrastructure",
    date: "2025-10-05",
    displayDate: "October 2025",
    minutes: 5,
    keywords: ["Ray", "K3s", "Kubernetes", "RAG", "cybersecurity AI"]
  },
  {
    id: 5,
    title: "Governing AI, One Boardroom at a Time",
    fullTitle: "Governing AI, One Boardroom at a Time",
    description: "A practical guide to AI governance, standards, and regulatory playbooks for leaders scaling AI responsibly.",
    category: "AI governance",
    date: "2025-09-23",
    displayDate: "September 2025",
    minutes: 15,
    keywords: ["AI governance", "ISO 42001", "NIST AI RMF", "AI regulation", "leadership"]
  },
  {
    id: 4,
    title: "The Way of the Voice in AI Prompts",
    fullTitle: "The Way of the Voice in AI Prompts: A Field Guide",
    description: "A field guide to building reliable voice profiles that make AI-assisted writing sound recognizably yours.",
    category: "Prompt engineering",
    date: "2025-09-21",
    displayDate: "September 2025",
    minutes: 17,
    keywords: ["prompt engineering", "writing style", "voice profile", "generative AI"]
  },
  {
    id: 3,
    title: "From Autonomous Pilots to Profit",
    fullTitle: "From Autonomous Pilots to Profit: What 2025 Taught Us About Enterprise AI Agents",
    description: "How constrained workflows, observability, and proven infrastructure turn enterprise AI agents into durable value.",
    category: "Enterprise AI",
    date: "2025-09-17",
    displayDate: "September 2025",
    minutes: 10,
    keywords: ["AI agents", "enterprise AI", "workflow automation", "observability", "AI security"]
  },
  {
    id: 1,
    title: "Blackwell Brawl: vLLM Meets RTX 5070 Ti",
    fullTitle: "Blackwell Brawl: vLLM Meets the RTX 5070 Ti",
    description: "A hands-on account of running vLLM on an NVIDIA RTX 5070 Ti with Debian 12 and CUDA 12.8, including build steps and benchmarks.",
    category: "Lab notes",
    date: "2024-12-01",
    displayDate: "December 2024",
    minutes: 4,
    keywords: ["vLLM", "RTX 5070 Ti", "Blackwell GPU", "CUDA 12.8", "Debian 12"]
  },
  {
    id: 2,
    title: "5 Security Practices for Small Businesses",
    fullTitle: "5 Security Practices for Small Businesses",
    description: "Five practical cybersecurity controls that help small businesses reduce avoidable risk and recover faster.",
    category: "Security fundamentals",
    date: "2024-12-01",
    displayDate: "December 2024",
    minutes: 3,
    keywords: ["small business security", "cybersecurity", "backups", "patching", "security awareness"]
  }
];

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const header = `
    <a class="skip-link" href="#article">Skip to article</a>
    <header class="site-header">
      <a class="brand" href="../" aria-label="LIGMA.BLOG home">
        <img src="../img/alen-peric.webp" alt="" width="512" height="512" />
        <span class="brand-copy"><strong>LIGMA.BLOG</strong><small>Alen Peric · Field notes</small></span>
      </a>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="../#articles">Articles</a>
        <a href="https://alenperic.com/" rel="me">AlenPeric.com ↗</a>
      </nav>
    </header>`;

const footer = `
    <footer class="site-footer">
      <div class="footer-top">
        <span class="footer-mark">LIGMA.BLOG // © 2026 ALEN PERIC</span>
        <nav class="footer-links" aria-label="Footer navigation">
          <a href="../">Archive</a>
          <a href="https://alenperic.com/">Homepage</a>
          <a href="https://www.linkedin.com/in/alen-peric/" rel="me">LinkedIn</a>
          <a href="https://github.com/alenperic" rel="me">GitHub</a>
        </nav>
      </div>
      <p class="footer-note"><strong>Privacy note:</strong> This static publication has no accounts or comments. Google Analytics may use cookies or similar browser storage to measure readership. Some articles load media from third-party content networks. Research and analysis are personal and do not represent current or former employers.</p>
    </footer>`;

function extractContent(raw) {
  const generated = raw.match(/<!-- ARTICLE CONTENT START -->([\s\S]*?)<!-- ARTICLE CONTENT END -->/);
  if (generated) return generated[1].trim();

  const marker = raw.search(/<(?:div|article) class="blog-post">/);
  if (marker < 0) throw new Error("Could not locate article content");
  const start = raw.indexOf(">", marker) + 1;
  const back = raw.lastIndexOf('<a href="../" class="read-more"');
  if (back < start) throw new Error("Could not locate article back link");
  return raw.slice(start, back).trim();
}

function sanitizeContent(content) {
  return content
    .replace(/\r\n?/g, "\n")
    .replaceAll("https://techcrunch.com/wp-content/uploads/2017/12/pushup.gif", "https://assets.rbl.ms/25581692/origin.gif")
    .replace(/<img\b(?![^>]*\bdata-remote-media\b)([^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*)>/gi, '<img class="article-media" loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer" data-remote-media$1>')
    .replace(/\sstyle=["'][^"']*["']/gi, "")
    .replace(/target=["']_blank["'](?!\s+rel=)/gi, 'target="_blank" rel="noopener noreferrer"')
    .replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"')
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function articleHead(article) {
  const url = `https://ligma.blog/post${article.id}/`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        url,
        headline: article.fullTitle,
        description: article.description,
        datePublished: article.date,
        dateModified: "2026-09-04",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        image: {
          "@type": "ImageObject",
          url: "https://ligma.blog/img/og-blog.png",
          width: 1200,
          height: 630,
          caption: "LIGMA.BLOG by Alen Peric"
        },
        thumbnailUrl: "https://ligma.blog/img/og-blog.png",
        inLanguage: "en-CA",
        isAccessibleForFree: true,
        articleSection: article.category,
        keywords: article.keywords,
        author: { "@id": "https://alenperic.com/#person" },
        publisher: { "@id": "https://alenperic.com/#person" },
        isPartOf: { "@id": "https://ligma.blog/#blog" }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "LIGMA.BLOG", item: "https://ligma.blog/" },
          { "@type": "ListItem", position: 2, name: article.fullTitle, item: url }
        ]
      },
      {
        "@type": "Person",
        "@id": "https://alenperic.com/#person",
        name: "Alen Peric",
        url: "https://alenperic.com/",
        image: "https://ligma.blog/img/alen-peric.webp",
        jobTitle: "Senior Threat Intelligence Analyst",
        worksFor: { "@type": "Organization", name: "CrowdStrike" },
        alumniOf: { "@type": "CollegeOrUniversity", name: "Fanshawe College" },
        sameAs: [
          "https://www.linkedin.com/in/alen-peric",
          "https://github.com/alenperic",
          "https://ligma.blog/"
        ]
      }
    ]
  };

  return `<!doctype html>
<html lang="en-CA">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="author" content="Alen Peric" />
    <meta name="theme-color" content="#061c18" />
    <meta name="color-scheme" content="dark" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="description" content="${escapeHtml(article.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="author" href="https://alenperic.com/" />
    <link rel="alternate" hreflang="en-CA" href="${url}" />
    <link rel="alternate" type="application/rss+xml" title="LIGMA.BLOG RSS" href="https://ligma.blog/feed.xml" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="en_CA" />
    <meta property="og:site_name" content="LIGMA.BLOG" />
    <meta property="og:title" content="${escapeHtml(article.fullTitle)}" />
    <meta property="og:description" content="${escapeHtml(article.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="https://ligma.blog/img/og-blog.png" />
    <meta property="og:image:secure_url" content="https://ligma.blog/img/og-blog.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="LIGMA.BLOG by Alen Peric" />
    <meta property="article:published_time" content="${article.date}" />
    <meta property="article:modified_time" content="2026-09-04" />
    <meta property="article:author" content="Alen Peric" />
    <meta property="article:section" content="${escapeHtml(article.category)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(article.fullTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(article.description)}" />
    <meta name="twitter:image" content="https://ligma.blog/img/og-blog.png" />
    <meta name="twitter:image:alt" content="LIGMA.BLOG by Alen Peric" />
    <title>${escapeHtml(article.fullTitle)} | LIGMA.BLOG</title>
    <link rel="icon" type="image/png" sizes="64x64" href="../img/favicon-64.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="../img/apple-touch-icon.png" />
    <link rel="preload" href="../assets/fonts/sora-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="../assets/blog.css" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-VMD9STL32Q"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-VMD9STL32Q');
    </script>
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
    <script src="../assets/blog.js" defer></script>
  </head>`;
}

articles.forEach((article, index) => {
  const filename = path.join(root, `post${article.id}`, "index.html");
  const raw = sourceRef
    ? execFileSync("git", ["show", `${sourceRef}:post${article.id}/index.html`], { cwd: root, encoding: "utf8" })
    : fs.readFileSync(filename, "utf8");
  const content = sanitizeContent(extractContent(raw));
  const next = articles[(index + 1) % articles.length];
  const html = `${articleHead(article)}
  <body class="article-page">
${header}
    <div class="reading-progress" aria-hidden="true"><span></span></div>
    <main id="article">
      <section class="article-masthead">
        <p class="article-meta">${escapeHtml(article.category)} // <time datetime="${article.date}">${article.displayDate}</time> // ${article.minutes} min read</p>
        <h1>${escapeHtml(article.fullTitle)}</h1>
        <p class="article-standfirst">${escapeHtml(article.description)}</p>
      </section>
      <div class="article-shell">
        <article class="blog-post">
          <!-- ARTICLE CONTENT START -->
${content}
          <!-- ARTICLE CONTENT END -->
        </article>
      </div>
      <nav class="article-pagination" aria-label="Article navigation">
        <a href="../"><small>Archive</small><span>View all research</span></a>
        <a href="../post${next.id}/"><small>Continue reading</small><span>${escapeHtml(next.title)} →</span></a>
      </nav>
    </main>
${footer}
  </body>
</html>
`;
  fs.writeFileSync(filename, html);
});

console.log(`Rebuilt ${articles.length} article pages.`);
