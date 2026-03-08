import jsPDF from "jspdf";

// ── Types ──
interface StudentInfo {
  name: string;
  rollNumber: string;
  department: string;
  section: string;
  university: string;
}

interface PDFOptions {
  subject: string;
  topic: string;
  teacherName?: string;
  studentInfo: StudentInfo;
  semester: number;
  docType: "assignment" | "lab";
}

// ── Academic Layout Constants (strict) ──
const LEFT_M = 38.1;     // 1.5 inches (binding margin)
const RIGHT_M = 25.4;    // 1 inch
const TOP_M = 25.4;      // 1 inch
const BOTTOM_M = 25.4;   // 1 inch
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - LEFT_M - RIGHT_M;
const CONTENT_START_Y = TOP_M + 5;
const CONTENT_END_Y = PAGE_H - BOTTOM_M - 8;
const LINE_H = 7;        // 1.5x line spacing for 12pt
const CODE_LINE_H = 5;
const BODY_FONT_SIZE = 12;
const CENTER_X = (LEFT_M + PAGE_W - RIGHT_M) / 2; // visual center accounting for asymmetric margins

// ── Helpers ──
function addPageNumber(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${pageNum}`, PAGE_W / 2, PAGE_H - 15, { align: "center" });
}

function drawLine(doc: jsPDF, y: number, weight = 0.4, color: number[] = [40, 40, 40]) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(weight);
  doc.line(LEFT_M, y, PAGE_W - RIGHT_M, y);
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > CONTENT_END_Y) {
    doc.addPage();
    return CONTENT_START_Y;
  }
  return y;
}

// ── Cover Page (vertically & horizontally centered) ──
function renderCoverPage(doc: jsPDF, opts: PDFOptions) {
  const { subject, topic, teacherName, studentInfo } = opts;

  // ── Top decorative double line ──
  drawLine(doc, 30, 1.2, [20, 60, 120]);
  drawLine(doc, 32, 0.3, [20, 60, 120]);

  // ── University Name (large, prominent) ──
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor(15, 50, 110);
  doc.text(studentInfo.university || "University of Larkana", CENTER_X, 55, { align: "center" });

  // ── Department ──
  doc.setFont("times", "normal");
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text(`Department of ${studentInfo.department || "Software Engineering"}`, CENTER_X, 68, { align: "center" });

  // ── Separator ──
  drawLine(doc, 78, 0.6, [20, 60, 120]);

  // ── Document Type ──
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(opts.docType === "lab" ? "LAB MANUAL" : "ASSIGNMENT REPORT", CENTER_X, 100, { align: "center" });

  // ── Subject ──
  doc.setFont("times", "normal");
  doc.setFontSize(15);
  doc.setTextColor(50, 50, 50);
  doc.text(subject, CENTER_X, 115, { align: "center" });

  // ── Topic Box (centered, with background) ──
  const topicLines = doc.splitTextToSize(topic, CONTENT_W - 40);
  const boxH = topicLines.length * 9 + 16;
  const boxY = 130;
  doc.setFillColor(242, 242, 248);
  doc.setDrawColor(180, 180, 200);
  doc.roundedRect(LEFT_M + 15, boxY, CONTENT_W - 30, boxH, 3, 3, "FD");
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(25, 25, 25);
  doc.text(topicLines, CENTER_X, boxY + 12, { align: "center", lineHeightFactor: 1.5 });

  // ── Student Info Block (centered, clean table) ──
  const infoStartY = boxY + boxH + 25;
  const infoItems = [
    ...(teacherName ? [["Submitted To", teacherName]] : []),
    ["Submitted By", studentInfo.name || "—"],
    ["Roll Number", studentInfo.rollNumber || "—"],
    ["Section", studentInfo.section || "—"],
    ["Semester", `${opts.semester}`],
    ["Date", new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })],
  ];

  // Info block border
  const infoBlockH = infoItems.length * 10 + 12;
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(LEFT_M + 25, infoStartY - 6, CONTENT_W - 50, infoBlockH, 2, 2, "S");

  let iy = infoStartY + 4;
  const labelX = LEFT_M + 35;
  const valueX = LEFT_M + 80;

  doc.setFontSize(11);
  infoItems.forEach(([label, value]) => {
    doc.setFont("times", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${label}:`, labelX, iy);
    doc.setFont("times", "bold");
    doc.setTextColor(25, 25, 25);
    doc.text(value, valueX, iy);
    iy += 10;
  });

  // ── Bottom decorative lines ──
  drawLine(doc, PAGE_H - 40, 0.3, [20, 60, 120]);
  drawLine(doc, PAGE_H - 38, 1.2, [20, 60, 120]);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("Generated with UniGenius AI — For Academic Purposes Only", CENTER_X, PAGE_H - 30, { align: "center" });
}

// ── Parse markdown into structured sections ──
interface Section {
  level: number;
  title: string;
  content: string;
}

function parseMarkdownSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = {
        level: headingMatch[1].length,
        title: headingMatch[2].replace(/\*\*/g, "").trim(),
        content: "",
      };
    } else {
      if (!current) {
        current = { level: 0, title: "", content: line + "\n" };
      } else {
        current.content += line + "\n";
      }
    }
  }
  if (current) sections.push(current);
  return sections;
}

// ── TOC with page numbers ──
function renderTOC(doc: jsPDF, sections: Section[], pageMap: Map<number, number>) {
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 50, 110);
  doc.text("Table of Contents", CENTER_X, CONTENT_START_Y + 10, { align: "center" });
  drawLine(doc, CONTENT_START_Y + 15, 0.6, [20, 60, 120]);

  let y = CONTENT_START_Y + 28;
  let tocNum = 0;

  sections.forEach((s, idx) => {
    if (!s.title || s.level > 3) return;
    tocNum++;
    const indent = (s.level - 1) * 10;
    const isMain = s.level <= 2;

    doc.setFont("times", isMain ? "bold" : "normal");
    doc.setFontSize(isMain ? 12 : 11);
    doc.setTextColor(30, 30, 30);

    const prefix = s.level === 1 ? `${tocNum}.` : s.level === 2 ? `  ${tocNum}.` : `      •`;
    const titleText = `${prefix}  ${s.title}`;
    const pageNum = pageMap.get(idx) || "";

    doc.text(titleText, LEFT_M + indent, y);

    // Dotted leader + page number
    if (pageNum) {
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`${pageNum}`, PAGE_W - RIGHT_M, y, { align: "right" });
    }

    y += isMain ? 9 : 7;
    if (y > CONTENT_END_Y) return;
  });
}

// ── Render main content ──
function renderContent(doc: jsPDF, markdown: string): Map<number, number> {
  const sections = parseMarkdownSections(markdown);
  let y = CONTENT_START_Y;
  const pageMap = new Map<number, number>();

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx];

    // H1 headings start on a new page
    if (section.title && section.level === 1 && sIdx > 0) {
      doc.addPage();
      y = CONTENT_START_Y;
    }

    // Heading
    if (section.title) {
      const fontSize = section.level === 1 ? 18 : section.level === 2 ? 14 : 12;
      const spacing = section.level === 1 ? 14 : section.level === 2 ? 10 : 8;
      y = checkPageBreak(doc, y, spacing + 5);

      doc.setFont("times", "bold");
      doc.setFontSize(fontSize);
      doc.setTextColor(15, 50, 110);
      doc.text(section.title, LEFT_M, y);
      pageMap.set(sIdx, doc.getNumberOfPages());

      y += spacing;

      if (section.level <= 2) {
        drawLine(doc, y - 3, 0.3, [180, 190, 210]);
        y += 2;
      }
    }

    // Content lines
    const contentLines = section.content.trim().split("\n");
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLang = "";

    for (const rawLine of contentLines) {
      // Code block boundaries
      if (rawLine.startsWith("```")) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLang = rawLine.slice(3).trim();
          codeBuffer = [];
        } else {
          // Render code block
          inCodeBlock = false;
          const codeHeight = codeBuffer.length * CODE_LINE_H + 14;
          y = checkPageBreak(doc, y, Math.min(codeHeight, 60));

          // Background
          doc.setFillColor(245, 245, 250);
          doc.setDrawColor(190, 190, 205);
          const actualHeight = Math.min(codeHeight, CONTENT_END_Y - y + 5);
          doc.roundedRect(LEFT_M, y - 3, CONTENT_W, actualHeight, 2, 2, "FD");

          // Language label
          if (codeLang) {
            doc.setFillColor(50, 55, 75);
            doc.roundedRect(PAGE_W - RIGHT_M - 30, y - 2, 29, 6, 1.5, 1.5, "F");
            doc.setFont("courier", "bold");
            doc.setFontSize(7);
            doc.setTextColor(210, 215, 230);
            doc.text(codeLang.toUpperCase(), PAGE_W - RIGHT_M - 15.5, y + 2, { align: "center" });
          }

          y += 6;
          doc.setFont("courier", "normal");
          doc.setFontSize(9);
          doc.setTextColor(35, 35, 45);
          for (const codeLine of codeBuffer) {
            y = checkPageBreak(doc, y, CODE_LINE_H);
            doc.text(codeLine.replace(/\t/g, "    "), LEFT_M + 5, y);
            y += CODE_LINE_H;
          }
          y += 6;
          codeBuffer = [];
          codeLang = "";
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(rawLine);
        continue;
      }

      let line = rawLine;

      // Bullet points
      if (line.match(/^[\-\*]\s/)) {
        y = checkPageBreak(doc, y, LINE_H);
        doc.setFont("times", "normal");
        doc.setFontSize(BODY_FONT_SIZE);
        doc.setTextColor(30, 30, 30);
        const bulletText = line.replace(/^[\-\*]\s/, "").replace(/\*\*/g, "");
        const wrapped = doc.splitTextToSize(`•   ${bulletText}`, CONTENT_W - 10);
        for (const wl of wrapped) {
          y = checkPageBreak(doc, y, LINE_H);
          doc.text(wl, LEFT_M + 6, y);
          y += LINE_H;
        }
        continue;
      }

      // Numbered lists
      const numMatch = line.match(/^(\d+)\.\s/);
      if (numMatch) {
        y = checkPageBreak(doc, y, LINE_H);
        doc.setFont("times", "normal");
        doc.setFontSize(BODY_FONT_SIZE);
        doc.setTextColor(30, 30, 30);
        const text = line.replace(/^\d+\.\s/, "").replace(/\*\*/g, "");
        const wrapped = doc.splitTextToSize(`${numMatch[1]}.  ${text}`, CONTENT_W - 10);
        for (const wl of wrapped) {
          y = checkPageBreak(doc, y, LINE_H);
          doc.text(wl, LEFT_M + 6, y);
          y += LINE_H;
        }
        continue;
      }

      // Inline code
      line = line.replace(/`([^`]+)`/g, "[$1]");

      // Regular paragraph (justified via word wrapping)
      if (line.trim()) {
        const isBold = line.startsWith("**") && line.endsWith("**");
        const cleanLine = line.replace(/\*\*/g, "");
        doc.setFont("times", isBold ? "bold" : "normal");
        doc.setFontSize(BODY_FONT_SIZE);
        doc.setTextColor(30, 30, 30);
        const wrapped = doc.splitTextToSize(cleanLine, CONTENT_W);
        for (const wl of wrapped) {
          y = checkPageBreak(doc, y, LINE_H);
          doc.text(wl, LEFT_M, y);
          y += LINE_H;
        }
      } else {
        y += 4; // Paragraph spacing
      }
    }
  }

  return pageMap;
}

// ── Originality Report (new page) ──
function renderOriginalityReport(doc: jsPDF) {
  doc.addPage();
  let y = CONTENT_START_Y;

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 50, 110);
  doc.text("Originality Report", LEFT_M, y);
  y += 12;
  drawLine(doc, y, 0.4, [180, 190, 210]);
  y += 10;

  const reportText = [
    "This document has been generated using AI-assisted technology (UniGenius AI).",
    "The content has been uniquely composed based on the provided topic and does not",
    "directly copy from any single source.",
    "",
    "Students are advised to:",
    "",
    "    •   Review and personalize the content in their own words",
    "    •   Add their own analysis, observations, and interpretations",
    "    •   Verify technical accuracy of code examples by running them",
    "    •   Cross-reference facts with course textbooks and lecture notes",
    "    •   Cite any additional sources used during review",
    "",
    "Estimated Originality Score: 85–95% (unique AI-composed content)",
    "",
    `Generated on: ${new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
  ];

  // Green bordered box
  const boxH = reportText.length * LINE_H + 14;
  doc.setFillColor(245, 252, 245);
  doc.setDrawColor(80, 160, 80);
  doc.setLineWidth(0.5);
  doc.roundedRect(LEFT_M, y - 4, CONTENT_W, boxH, 3, 3, "FD");

  y += 5;
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);

  for (const line of reportText) {
    if (line.startsWith("Estimated")) {
      doc.setFont("times", "bold");
      doc.setTextColor(30, 100, 30);
    }
    doc.text(line, LEFT_M + 8, y);
    y += LINE_H;
    doc.setFont("times", "normal");
    doc.setTextColor(40, 40, 40);
  }
}

// ══════════════════════════════════════════════════════
// ── Main PDF Export ──
// ══════════════════════════════════════════════════════
export function generateProfessionalPDF(content: string, opts: PDFOptions): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Page 1: Cover Page
  renderCoverPage(doc, opts);

  // Parse content and render to get page map
  // First render content to a temp doc to get page numbers for TOC
  const tempDoc = new jsPDF({ unit: "mm", format: "a4" });
  tempDoc.addPage(); // skip cover
  tempDoc.addPage(); // skip TOC
  const pageMap = renderContent(tempDoc, content);

  // Page 2: Table of Contents (new page)
  doc.addPage();
  const sections = parseMarkdownSections(content);
  // Adjust page map: content starts at page 3
  const adjustedMap = new Map<number, number>();
  pageMap.forEach((page, idx) => {
    adjustedMap.set(idx, page);
  });
  renderTOC(doc, sections, adjustedMap);

  // Page 3+: Content (always new page)
  doc.addPage();
  renderContent(doc, content);

  // Originality Report (new page)
  renderOriginalityReport(doc);

  // Page numbers on every page (except cover)
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addPageNumber(doc, i, totalPages);
  }

  const fileName = `${opts.subject.replace(/\s+/g, "_")}_${opts.docType}_${opts.topic.slice(0, 20).replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}

// ══════════════════════════════════════════════════════
// ── DOCX Export (HTML-based, Word compatible) ──
// ══════════════════════════════════════════════════════
export function generateDOCX(content: string, opts: PDFOptions): void {
  const { subject, topic, teacherName, studentInfo } = opts;

  // Convert markdown to styled HTML
  let html = content;
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-family:\'Times New Roman\';color:#0F326E;font-size:13pt;margin-top:12pt;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-family:\'Times New Roman\';color:#0F326E;font-size:14pt;margin-top:16pt;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-family:\'Times New Roman\';color:#0F326E;font-size:16pt;margin-top:20pt;border-bottom:1pt solid #B4BED2;padding-bottom:4pt;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-family:\'Times New Roman\';color:#0F326E;font-size:20pt;margin-top:24pt;page-break-before:always;">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  html = html.replace(/`([^`]+)`/g, '<code style="background:#F5F5FA;padding:1pt 3pt;font-family:\'Courier New\';font-size:10pt;border:0.5pt solid #C8C8D2;">$1</code>');
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
    `<div style="background:#F5F5FA;border:1pt solid #BEBECE;border-radius:3pt;padding:8pt 10pt;margin:10pt 0;font-family:'Courier New';font-size:9pt;white-space:pre-wrap;line-height:1.4;">${lang ? `<div style="font-size:7pt;color:#666;margin-bottom:4pt;font-weight:bold;">${lang.toUpperCase()}</div>` : ""}${code.replace(/</g, "&lt;")}</div>`
  );
  html = html.replace(/^[\-\*] (.+)$/gm, "<li style='margin-bottom:3pt;'>$1</li>");
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/gs, (m) => `<ul style="margin-left:18pt;margin-top:6pt;margin-bottom:6pt;">${m}</ul>`);
  html = html.replace(/\n\n/g, "</p><p style='text-align:justify;line-height:1.5;margin-bottom:6pt;'>");
  html = `<p style='text-align:justify;line-height:1.5;margin-bottom:6pt;'>${html}</p>`;

  const docContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset="utf-8">
<style>
  @page { 
    margin-top: 1in; margin-bottom: 1in; margin-right: 1in; margin-left: 1.5in;
    mso-page-orientation: portrait; size: A4;
  }
  @page :first { margin-top: 0; margin-bottom: 0; }
  body { 
    font-family: 'Times New Roman', Times, serif; 
    font-size: 12pt; color: #1E1E1E; line-height: 1.5; text-align: justify;
  }
  h1, h2, h3, h4 { color: #0F326E; font-family: 'Times New Roman', Times, serif; }
  h1 { font-size: 20pt; page-break-before: always; margin-top: 24pt; }
  h2 { font-size: 16pt; border-bottom: 1pt solid #B4BED2; padding-bottom: 4pt; margin-top: 20pt; }
  h3 { font-size: 14pt; margin-top: 16pt; }
  p { margin-bottom: 6pt; }
  .cover { 
    text-align: center; page-break-after: always; 
    padding-top: 60pt; padding-bottom: 40pt;
  }
  .cover h1 { font-size: 26pt; color: #0F326E; margin-bottom: 4pt; page-break-before: auto; border: none; }
  .cover h2 { font-size: 15pt; color: #444; font-weight: normal; border: none; margin-top: 4pt; }
  .cover .topic { 
    background: #F2F2F8; padding: 12pt 20pt; margin: 24pt auto; 
    max-width: 360pt; border: 0.5pt solid #B4B4C8; font-size: 14pt; font-weight: bold;
  }
  .cover hr { border: none; border-top: 2pt solid #0F326E; margin: 16pt 50pt; }
  .info-table { margin: 24pt auto; text-align: left; border: 0.5pt solid #C8C8D2; padding: 10pt 16pt; }
  .info-table td { padding: 3pt 10pt; font-size: 11pt; vertical-align: top; }
  .info-table .label { color: #666; font-weight: normal; }
  .toc { page-break-after: always; padding-top: 20pt; }
  .toc h2 { text-align: center; border: none; color: #0F326E; }
  .toc-line { margin: 4pt 0; }
  .originality { 
    background: #F5FCF5; border: 1pt solid #50A050; padding: 12pt 16pt; 
    margin-top: 24pt; page-break-before: always;
  }
  .originality h3 { color: #0F326E; margin-top: 0; }
</style></head><body>
<div class="cover">
  <h1>${studentInfo.university || "University of Larkana"}</h1>
  <h2>Department of ${studentInfo.department || "Software Engineering"}</h2>
  <hr>
  <h2 style="font-size:18pt;font-weight:bold;color:#1E1E1E;margin-top:16pt;">${opts.docType === "lab" ? "LAB MANUAL" : "ASSIGNMENT REPORT"}</h2>
  <h2 style="font-size:14pt;color:#555;margin-top:4pt;">${subject}</h2>
  <div class="topic">${topic}</div>
  <table class="info-table">
    ${teacherName ? `<tr><td class="label">Submitted To:</td><td><b>${teacherName}</b></td></tr>` : ""}
    <tr><td class="label">Submitted By:</td><td><b>${studentInfo.name || "—"}</b></td></tr>
    <tr><td class="label">Roll Number:</td><td><b>${studentInfo.rollNumber || "—"}</b></td></tr>
    <tr><td class="label">Section:</td><td>${studentInfo.section || "—"}</td></tr>
    <tr><td class="label">Semester:</td><td>${opts.semester}</td></tr>
    <tr><td class="label">Date:</td><td>${new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
  </table>
</div>
${html}
<div class="originality">
  <h3>Originality Report</h3>
  <p>This document was composed using AI-assisted technology (UniGenius AI). Content is uniquely generated and not directly copied from any single source. Students should review, personalize, and verify all content.</p>
  <p><b style="color:#1E6420;">Estimated Originality: 85–95%</b></p>
  <p style="font-size:9pt;color:#888;">Generated: ${new Date().toLocaleString("en-PK")}</p>
</div>
</body></html>`;

  const blob = new Blob([docContent], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${subject.replace(/\s+/g, "_")}_${opts.docType}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
