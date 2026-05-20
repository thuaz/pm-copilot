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
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li class=\"ul-item\">$1</li>")
    .replace(/(<li class=\"ul-item\">.*<\/li>\n?)+/g, (m) => `<ul>${m.replace(/ class="ul-item"/g, "")}</ul>`)
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ol>${m}</ol>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>");
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
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.8; }
  h1 { font-size: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
  h2 { font-size: 20px; margin-top: 28px; color: #1d4ed8; }
  h3 { font-size: 16px; margin-top: 20px; color: #374151; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
  strong { color: #111; }
  .header { text-align: center; margin-bottom: 32px; }
  .header h1 { border: none; font-size: 28px; }
  .meta { color: #888; font-size: 13px; margin-top: 4px; }
</style>
</head>
<body>
<div class="header">
  <h1>${title}</h1>
  <div class="meta">导出时间：${new Date().toLocaleString("zh-CN")}</div>
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
<style>
  body { font-family: "微软雅黑", "PingFang SC", sans-serif; font-size: 14px; line-height: 1.8; color: #333; }
  h1 { font-size: 22px; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 6px; }
  h2 { font-size: 18px; color: #1d4ed8; margin-top: 24px; }
  h3 { font-size: 15px; color: #374151; margin-top: 18px; }
  ul { padding-left: 20px; }
  li { margin: 3px 0; }
  code { background: #f5f5f5; padding: 1px 4px; }
  .header { text-align: center; margin-bottom: 24px; }
  .header h1 { border: none; font-size: 24px; }
  .meta { color: #999; font-size: 12px; }
</style>
</head>
<body>
<div class="header">
  <h1>${title}</h1>
  <div class="meta">导出时间：${new Date().toLocaleString("zh-CN")} | PM Copilot</div>
</div>
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
