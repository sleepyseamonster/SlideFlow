import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "policy-docs");

const docs = [
  {
    src: path.join(root, "docs", "privacy_policy.md"),
    out: "privacy-policy.html",
    title: "SlideFlow Privacy Policy",
  },
  {
    src: path.join(root, "docs", "data_deletion.md"),
    out: "data-deletion.html",
    title: "SlideFlow Data Deletion Instructions",
  },
  {
    src: path.join(root, "docs", "terms_of_service.md"),
    out: "terms-of-service.html",
    title: "SlideFlow Terms of Service",
  },
];

function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHtml({ title, markdown }) {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(markdown);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        padding: 32px 16px;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        line-height: 1.5;
        background: #ffffff;
        color: #111827;
      }
      .container { max-width: 900px; margin: 0 auto; }
      header { margin-bottom: 18px; }
      nav a { margin-right: 12px; color: #2563eb; text-decoration: none; }
      nav a:hover { text-decoration: underline; }
      h1 { font-size: 24px; margin: 0 0 8px; }
      .hint { color: #6b7280; font-size: 13px; }
      pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        padding: 16px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #f9fafb;
        overflow: auto;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1>${safeTitle}</h1>
        <nav>
          <a href="./privacy-policy.html">Privacy Policy</a>
          <a href="./terms-of-service.html">Terms</a>
          <a href="./data-deletion.html">Data Deletion</a>
        </nav>
        <div class="hint">This page is generated from Markdown for hosting purposes.</div>
      </header>
      <pre>${safeBody}</pre>
    </div>
  </body>
</html>
`;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  await Promise.all(
    docs.map(async (doc) => {
      const markdown = await readFile(doc.src, "utf8");
      const html = renderHtml({ title: doc.title, markdown });
      await writeFile(path.join(outDir, doc.out), html, "utf8");
    })
  );

  // Also include a simple index for convenience.
  const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SlideFlow Policy Docs</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 32px 16px; }
      .container { max-width: 900px; margin: 0 auto; }
      ul { line-height: 1.8; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>SlideFlow Policy Docs</h1>
      <ul>
        <li><a href="./privacy-policy.html">Privacy Policy</a></li>
        <li><a href="./terms-of-service.html">Terms of Service</a></li>
        <li><a href="./data-deletion.html">Data Deletion Instructions</a></li>
      </ul>
    </div>
  </body>
</html>`;

  await writeFile(path.join(outDir, "index.html"), index, "utf8");
  process.stdout.write(`Wrote policy docs to ${outDir}\n`);
}

await main();
