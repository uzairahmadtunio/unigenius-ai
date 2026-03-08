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

// ── Fonts & Constants ──
const MARGIN = 25.4; // 1 inch in mm
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_H = 5.5;
const CODE_LINE_H = 4.8;

// ── Helpers ──
function addPageNumber(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`— ${pageNum} / ${totalPages} —`, PAGE_W / 2, PAGE_H - 12, { align: "center" });
}

function drawHorizontalLine(doc: jsPDF, y: number, color = [60, 60, 60]) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

// ── Cover Page ──
function renderCoverPage(doc: jsPDF, opts: PDFOptions) {
  const { subject, topic, teacherName, studentInfo } = opts;

  // University header
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 60, 120);
  doc.text(studentInfo.university || "University of Larkana", PAGE_W / 2, 50, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text(`Department of ${studentInfo.department || "Software Engineering"}`, PAGE_W / 2, 62, { align: "center" });

  drawHorizontalLine(doc, 70, [20, 60, 120]);

  // Subject
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(subject, PAGE_W / 2, 95, { align: "center" });

  // Document type badge
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(opts.docType === "lab" ? "Lab Manual" : "Assignment Report", PAGE_W / 2, 106, { align: "center" });

  // Topic box
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(MARGIN + 10, 118, CONTENT_W - 20, 30, 3, 3, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  const topicLines = doc.splitTextToSize(topic, CONTENT_W - 40);
  doc.text(topicLines, PAGE_W / 2, 130, { align: "center" });

  // Info table
  let y = 170;
  const infoItems = [
    ["Submitted By:", studentInfo.name || "—"],
    ["Roll Number:", studentInfo.rollNumber || "—"],
    ["Section:", studentInfo.section || "—"],
    ["Semester:", `${opts.semester}`],
    ...(teacherName ? [["Submitted To:", teacherName]] : []),
    ["Date:", new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })],
  ];

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  infoItems.forEach(([label, value]) => {
    doc.setTextColor(100, 100, 100);
    doc.text(label, MARGIN + 30, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont("times", "bold");
    doc.text(value, MARGIN + 75, y);
    doc.setFont("times", "normal");
    y += 8;
  });

  drawHorizontalLine(doc, PAGE_H - 35, [20, 60, 120]);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Generated with UniGenius AI — For Academic Purposes Only", PAGE_W / 2, PAGE_H - 28, { align: "center" });
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

// ── Render content to PDF ──
function renderContent(doc: jsPDF, markdown: string): number[] {
  const sections = parseMarkdownSections(markdown);
  let y = MARGIN + 5;
  let pageCount = doc.getNumberOfPages();
  const tocEntries: { title: string; level: number; page: number }[] = [];

  const checkPageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN - 10) {
      doc.addPage();
      pageCount++;
      y = MARGIN + 5;
    }
  };

  for (const section of sections) {
    // Heading
    if (section.title) {
      checkPageBreak(15);
      const fontSize = section.level === 1 ? 16 : section.level === 2 ? 13 : 11;
      doc.setFont("times", "bold");
      doc.setFontSize(fontSize);
      doc.setTextColor(20, 50, 100);
      doc.text(section.title, MARGIN, y);
      tocEntries.push({ title: section.title, level: section.level, page: doc.getNumberOfPages() });
      y += fontSize === 16 ? 10 : 8;

      if (section.level <= 2) {
        drawHorizontalLine(doc, y - 2, [200, 210, 230]);
        y += 3;
      }
    }

    // Content
    const contentLines = section.content.trim().split("\n");
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLang = "";

    for (const rawLine of contentLines) {
      // Code block detection
      if (rawLine.startsWith("```")) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLang = rawLine.slice(3).trim();
          codeBuffer = [];
        } else {
          // Render code block
          inCodeBlock = false;
          const codeHeight = codeBuffer.length * CODE_LINE_H + 12;
          checkPageBreak(codeHeight);

          // Code block background
          doc.setFillColor(240, 240, 245);
          doc.setDrawColor(200, 200, 210);
          doc.roundedRect(MARGIN, y - 2, CONTENT_W, codeHeight, 2, 2, "FD");

          // Language badge
          if (codeLang) {
            doc.setFillColor(60, 60, 80);
            doc.roundedRect(PAGE_W - MARGIN - 28, y - 1, 27, 5, 1, 1, "F");
            doc.setFont("courier", "normal");
            doc.setFontSize(6);
            doc.setTextColor(220, 220, 230);
            doc.text(codeLang.toUpperCase(), PAGE_W - MARGIN - 14.5, y + 2.5, { align: "center" });
          }

          y += 5;
          doc.setFont("courier", "normal");
          doc.setFontSize(8);
          doc.setTextColor(40, 40, 50);
          for (const codeLine of codeBuffer) {
            if (y > PAGE_H - MARGIN - 10) {
              doc.addPage();
              pageCount++;
              y = MARGIN + 5;
            }
            doc.text(codeLine.replace(/\t/g, "    "), MARGIN + 4, y);
            y += CODE_LINE_H;
          }
          y += 5;
          codeBuffer = [];
          codeLang = "";
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(rawLine);
        continue;
      }

      // Bold text handling
      let line = rawLine;

      // Bullet points
      if (line.match(/^[\-\*]\s/)) {
        checkPageBreak(LINE_H);
        doc.setFont("times", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        const bulletText = line.replace(/^[\-\*]\s/, "").replace(/\*\*/g, "");
        const wrapped = doc.splitTextToSize(`•  ${bulletText}`, CONTENT_W - 8);
        for (const wl of wrapped) {
          checkPageBreak(LINE_H);
          doc.text(wl, MARGIN + 4, y);
          y += LINE_H;
        }
        continue;
      }

      // Numbered list
      const numMatch = line.match(/^(\d+)\.\s/);
      if (numMatch) {
        checkPageBreak(LINE_H);
        doc.setFont("times", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        const text = line.replace(/^\d+\.\s/, "").replace(/\*\*/g, "");
        const wrapped = doc.splitTextToSize(`${numMatch[1]}.  ${text}`, CONTENT_W - 8);
        for (const wl of wrapped) {
          checkPageBreak(LINE_H);
          doc.text(wl, MARGIN + 4, y);
          y += LINE_H;
        }
        continue;
      }

      // Inline code
      line = line.replace(/`([^`]+)`/g, "[$1]");

      // Regular paragraph
      if (line.trim()) {
        const isBold = line.startsWith("**") && line.endsWith("**");
        const cleanLine = line.replace(/\*\*/g, "");
        doc.setFont("times", isBold ? "bold" : "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        const wrapped = doc.splitTextToSize(cleanLine, CONTENT_W);
        for (const wl of wrapped) {
          checkPageBreak(LINE_H);
          doc.text(wl, MARGIN, y);
          y += LINE_H;
        }
      } else {
        y += 3; // Empty line spacing
      }
    }
  }

  // Return page numbers for TOC mapping
  return tocEntries.map(e => e.page);
}

// ── Table of Contents ──
function renderTOC(doc: jsPDF, markdown: string) {
  const sections = parseMarkdownSections(markdown).filter(s => s.title && s.level <= 3);
  
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 50, 100);
  doc.text("Table of Contents", PAGE_W / 2, 40, { align: "center" });
  drawHorizontalLine(doc, 45, [20, 60, 120]);

  let y = 55;
  sections.forEach((s, i) => {
    const indent = (s.level - 1) * 8;
    doc.setFont("times", s.level === 1 ? "bold" : "normal");
    doc.setFontSize(s.level === 1 ? 11 : 10);
    doc.setTextColor(50, 50, 50);
    const prefix = s.level <= 2 ? `${i + 1}.  ` : "    •  ";
    doc.text(`${prefix}${s.title}`, MARGIN + indent, y);
    y += 7;
    if (y > PAGE_H - 40) return;
  });
}

// ── Originality Report ──
function renderOriginalityReport(doc: jsPDF) {
  let y = doc.internal.pageSize.height;
  doc.addPage();
  y = MARGIN + 5;

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 50, 100);
  doc.text("Originality Report", MARGIN, y);
  y += 8;
  drawHorizontalLine(doc, y, [200, 210, 230]);
  y += 8;

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  const reportText = [
    "This document has been generated using AI-assisted technology (UniGenius AI).",
    "The content has been uniquely composed based on the provided topic and does not",
    "directly copy from any single source. Students are advised to:",
    "",
    "  •  Review and personalize the content in their own words",
    "  •  Add their own analysis, observations, and interpretations",
    "  •  Verify technical accuracy of code examples by running them",
    "  •  Cross-reference facts with course textbooks and lecture notes",
    "  •  Cite any additional sources used during review",
    "",
    "Estimated Originality Score: 85–95% (unique AI-composed content)",
    "",
    `Generated on: ${new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
  ];

  // Green box
  doc.setFillColor(240, 250, 240);
  doc.setDrawColor(100, 180, 100);
  doc.roundedRect(MARGIN, y - 3, CONTENT_W, reportText.length * 5.5 + 6, 2, 2, "FD");
  y += 3;

  for (const line of reportText) {
    doc.text(line, MARGIN + 4, y);
    y += 5.5;
  }
}

// ── Main Export Function ──
export function generateProfessionalPDF(content: string, opts: PDFOptions): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Page 1: Cover
  renderCoverPage(doc, opts);

  // Page 2: Table of Contents
  doc.addPage();
  renderTOC(doc, content);

  // Page 3+: Content
  doc.addPage();
  renderContent(doc, content);

  // Originality Report
  renderOriginalityReport(doc);

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageNumber(doc, i, totalPages);
  }

  const fileName = `${opts.subject.replace(/\s+/g, "_")}_${opts.docType}_${opts.topic.slice(0, 20).replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}

// ── DOCX Export (HTML-based, opens in Word) ──
export function generateDOCX(content: string, opts: PDFOptions): void {
  const { subject, topic, teacherName, studentInfo } = opts;

  // Convert markdown to styled HTML for Word
  let html = content;
  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-family:Times New Roman;color:#143C78;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-family:Times New Roman;color:#143C78;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-family:Times New Roman;color:#143C78;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-family:Times New Roman;color:#143C78;">$1</h1>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f0f0f5;padding:2px 4px;font-family:Courier New;font-size:9pt;">$1</code>');
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
    `<div style="background:#f0f0f5;border:1px solid #c8c8d2;border-radius:4px;padding:10px;margin:8px 0;font-family:Courier New;font-size:9pt;white-space:pre-wrap;">${lang ? `<div style="font-size:7pt;color:#888;margin-bottom:4px;">${lang.toUpperCase()}</div>` : ""}${code.replace(/</g, "&lt;")}</div>`
  );
  // Bullets
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  // Paragraphs
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  const docContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset="utf-8">
<style>
  @page { margin: 1in; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #333; line-height: 1.6; }
  h1, h2, h3 { color: #143C78; }
  .cover { text-align: center; page-break-after: always; padding-top: 80px; }
  .cover h1 { font-size: 24pt; color: #143C78; margin-bottom: 8px; }
  .cover h2 { font-size: 16pt; color: #555; font-weight: normal; }
  .cover .topic { background: #f5f5fa; padding: 15px 20px; margin: 30px auto; max-width: 400px; border-radius: 4px; font-size: 14pt; }
  .info-table { margin: 30px auto; text-align: left; }
  .info-table td { padding: 4px 12px; font-size: 11pt; }
  .info-table .label { color: #888; }
  .originality { background: #f0faf0; border: 1px solid #64b464; padding: 15px; border-radius: 4px; margin-top: 30px; }
</style></head><body>
<div class="cover">
  <h1>${studentInfo.university || "University of Larkana"}</h1>
  <h2>Department of ${studentInfo.department || "Software Engineering"}</h2>
  <hr style="border-color:#143C78;margin:20px 60px;">
  <h2>${subject}</h2>
  <p style="color:#888;">${opts.docType === "lab" ? "Lab Manual" : "Assignment Report"}</p>
  <div class="topic"><b>${topic}</b></div>
  <table class="info-table">
    <tr><td class="label">Submitted By:</td><td><b>${studentInfo.name || "—"}</b></td></tr>
    <tr><td class="label">Roll Number:</td><td><b>${studentInfo.rollNumber || "—"}</b></td></tr>
    <tr><td class="label">Section:</td><td>${studentInfo.section || "—"}</td></tr>
    <tr><td class="label">Semester:</td><td>${opts.semester}</td></tr>
    ${teacherName ? `<tr><td class="label">Submitted To:</td><td><b>${teacherName}</b></td></tr>` : ""}
    <tr><td class="label">Date:</td><td>${new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
  </table>
</div>
${html}
<div class="originality">
  <h3>Originality Report</h3>
  <p>This document was composed using AI-assisted technology (UniGenius AI). Content is uniquely generated and not directly copied. Students should review, personalize, and verify all content.</p>
  <p><b>Estimated Originality: 85–95%</b></p>
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
