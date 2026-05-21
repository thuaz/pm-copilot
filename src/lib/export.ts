export type ExportFormat = "md" | "html" | "docx" | "pdf";

export function exportPRD(content: string, title: string, format: ExportFormat) {
  const safeTitle = title.replace(/[^a-zA-Z0-9一-鿿-_ ]/g, "").substring(0, 50) || "PRD";

  switch (format) {
    case "md":
      downloadFile(`${safeTitle}.md`, content, "text/markdown");
      break;
    case "html":
      downloadFile(`${safeTitle}.html`, wrapHTML(content, title), "text/html");
      break;
    case "docx":
      downloadFile(`${safeTitle}.doc`, wrapDoc(content, title), "application/msword");
      break;
    case "pdf":
      printAsPDF(content, title);
      break;
  }
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function markdownToHTML(md: string): string {
  let html = md;

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_match, header: string, _sep: string, body: string) => {
    const ths = header.split("|").filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join("");
    const rows = body.trim().split("\n").map((row: string) => {
      const tds = row.split("|").filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join("");
      return `<tr>${tds}</tr>`;
    }).join("");
    return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Headers
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="ul-item">$1</li>');
  html = html.replace(/(<li class="ul-item">.*<\/li>\n?)+/g, (m) => `<ul>${m.replace(/ class="ul-item"/g, "")}</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ol>${m}</ol>`);

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #2563eb;padding-left:12px;color:#555;margin:12px 0;">$1</blockquote>');

  // Paragraphs
  html = html.replace(/\n{2,}/g, "</p><p>");
  html = html.replace(/\n/g, "<br>");

  return html;
}

function commonDocStyles(): string {
  return `
    body {
      font-family: "微软雅黑", "PingFang SC", "Microsoft YaHei", sans-serif;
      font-size: 14px;
      line-height: 1.8;
      color: #333;
      padding: 0 20px;
    }
    h1 {
      font-size: 22px;
      color: #1a1a1a;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
      margin-top: 32px;
      margin-bottom: 16px;
      letter-spacing: 0.5px;
    }
    h2 {
      font-size: 18px;
      color: #1d4ed8;
      margin-top: 28px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e7eb;
    }
    h3 {
      font-size: 15px;
      color: #374151;
      margin-top: 22px;
      margin-bottom: 10px;
    }
    h4 {
      font-size: 14px;
      color: #4b5563;
      margin-top: 18px;
      margin-bottom: 8px;
    }
    ul {
      padding-left: 24px;
      margin: 8px 0;
    }
    li {
      margin: 5px 0;
    }
    ol {
      padding-left: 24px;
      margin: 8px 0;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
      font-family: "Menlo", "Consolas", monospace;
    }
    strong {
      color: #111827;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      font-size: 13px;
    }
    th {
      background: #eff6ff;
      color: #1e40af;
      font-weight: 600;
      text-align: left;
      padding: 10px 14px;
      border: 1px solid #bfdbfe;
    }
    td {
      padding: 8px 14px;
      border: 1px solid #e5e7eb;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #f9fafb;
    }
    blockquote {
      border-left: 3px solid #2563eb;
      padding-left: 12px;
      color: #6b7280;
      margin: 12px 0;
    }
    hr {
      border: none;
      border-top: 1px solid #d1d5db;
      margin: 24px 0;
    }
    .cover-page {
      text-align: center;
      padding-top: 120px;
      padding-bottom: 80px;
      margin-bottom: 40px;
      border-bottom: 2px solid #2563eb;
    }
    .cover-page h1 {
      border: none;
      font-size: 28px;
      color: #1a1a1a;
      margin-bottom: 20px;
    }
    .cover-meta {
      color: #6b7280;
      font-size: 13px;
      line-height: 2;
    }
    .cover-meta td {
      border: none;
      padding: 4px 12px;
      text-align: left;
    }
    .version-table {
      width: auto;
      margin: 20px 0;
    }
  `;
}

function wrapHTML(content: string, title: string): string {
  const body = markdownToHTML(content);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { max-width: 800px; margin: 40px auto; padding: 0 20px; }
  ${commonDocStyles()}
</style>
</head>
<body>
<div class="cover-page">
  <h1>${title}</h1>
  <table class="cover-meta" style="margin:0 auto;">
    <tr><td><strong>导出时间</strong></td><td>${new Date().toLocaleString("zh-CN")}</td></tr>
    <tr><td><strong>工具</strong></td><td>PM Copilot</td></tr>
  </table>
</div>
${body}
</body>
</html>`;
}

function wrapDoc(content: string, title: string): string {
  const body = markdownToHTML(content);
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  ${commonDocStyles()}
  /* Word-specific fixes */
  @page {
    size: A4;
    margin: 2.54cm;
  }
  body {
    max-width: 100%;
  }
</style>
</head>
<body>
<div class="cover-page">
  <h1>${title}</h1>
  <table class="cover-meta" style="margin:0 auto;border:none;">
    <tr><td style="border:none;"><strong>文档版本</strong></td><td style="border:none;">V1.0</td></tr>
    <tr><td style="border:none;"><strong>创建日期</strong></td><td style="border:none;">${new Date().toLocaleDateString("zh-CN")}</td></tr>
    <tr><td style="border:none;"><strong>导出工具</strong></td><td style="border:none;">PM Copilot</td></tr>
  </table>
</div>
<hr style="border:none;border-top:2px solid #2563eb;margin:0 0 30px 0;">

<!-- Version history table -->
<table class="version-table">
  <thead>
    <tr><th>版本</th><th>日期</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td>V1.0</td><td>${new Date().toLocaleDateString("zh-CN")}</td><td>初始版本</td></tr>
  </tbody>
</table>
<hr>

${body}
</body>
</html>`;
}

function printAsPDF(content: string, title: string) {
  const html = wrapHTML(content, title);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
  }
}
