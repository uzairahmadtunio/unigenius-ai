import jsPDF from "jspdf";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

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
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  // (footer tagline removed per user request)
}

// ── Parse markdown into structured sections ──
interface Section {
  level: number;
  title: string;
  content: string;
}

// Strip stray markdown / table artifacts that don't render in PDF.
function sanitizeLine(s: string): string {
  return s
    // drop markdown table separator rows (|---|---|)
    .replace(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/g, "")
    // convert "| a | b | c |" → "a    b    c"
    .replace(/^\s*\|(.+)\|\s*$/g, (_m, inner) =>
      inner
        .split("|")
        .map((c: string) => c.replace(/\*\*/g, "").trim())
        .filter(Boolean)
        .join("    ")
    )
    // remove stray horizontal rules
    .replace(/^\s*-{3,}\s*$/g, "")
    // remove stray backticks around single words (e.g. `do-while`)
    .replace(/`([^`\n]{1,40})`/g, "$1")
    // collapse leftover bold markers
    .replace(/\*\*/g, "");
}

function parseMarkdownSections(markdown: string): Section[] {
  const lines = markdown.split("\n").map(sanitizeLine);
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

    // Reserve ~15mm on the right for the page number so titles never collide with it.
    const titleMaxW = CONTENT_W - indent - 15;
    const wrapped = doc.splitTextToSize(titleText, titleMaxW) as string[];

    if (y + wrapped.length * (isMain ? 7 : 6) > CONTENT_END_Y) return;

    wrapped.forEach((wl, i) => {
      doc.text(wl, LEFT_M + indent, y + i * (isMain ? 7 : 6));
    });

    if (pageNum) {
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`${pageNum}`, PAGE_W - RIGHT_M, y, { align: "right" });
    }

    y += wrapped.length * (isMain ? 7 : 6) + (isMain ? 3 : 2);
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
          // Render code block — wrap long lines so nothing overflows the page width.
          inCodeBlock = false;
          doc.setFont("courier", "normal");
          doc.setFontSize(9);
          const CODE_INNER_W = CONTENT_W - 10; // 5mm padding each side
          const wrappedCode: string[] = [];
          for (const codeLine of codeBuffer) {
            const expanded = codeLine.replace(/\t/g, "    ");
            const parts = doc.splitTextToSize(expanded || " ", CODE_INNER_W) as string[];
            wrappedCode.push(...(parts.length ? parts : [" "]));
          }

          // Render in chunks so blocks that exceed a page break cleanly.
          let idx = 0;
          while (idx < wrappedCode.length) {
            y = checkPageBreak(doc, y, CODE_LINE_H * 3);
            const available = Math.floor((CONTENT_END_Y - y - 8) / CODE_LINE_H);
            const take = Math.max(1, Math.min(available, wrappedCode.length - idx));
            const slice = wrappedCode.slice(idx, idx + take);
            const blockH = slice.length * CODE_LINE_H + 10;

            doc.setFillColor(245, 245, 250);
            doc.setDrawColor(190, 190, 205);
            doc.roundedRect(LEFT_M, y - 3, CONTENT_W, blockH, 2, 2, "FD");

            if (codeLang && idx === 0) {
              doc.setFillColor(50, 55, 75);
              doc.roundedRect(PAGE_W - RIGHT_M - 30, y - 2, 29, 6, 1.5, 1.5, "F");
              doc.setFont("courier", "bold");
              doc.setFontSize(7);
              doc.setTextColor(210, 215, 230);
              doc.text(codeLang.toUpperCase(), PAGE_W - RIGHT_M - 15.5, y + 2, { align: "center" });
            }

            let cy = y + 6;
            doc.setFont("courier", "normal");
            doc.setFontSize(9);
            doc.setTextColor(35, 35, 45);
            for (const wl of slice) {
              doc.text(wl, LEFT_M + 5, cy);
              cy += CODE_LINE_H;
            }
            y = cy + 4;
            idx += take;
          }
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

  // (Originality Report removed per user request)

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
// ── Native DOCX Export (real Word document, not HTML) ──
// ══════════════════════════════════════════════════════
const PAGE_W_DXA = 11906;
const PAGE_H_DXA = 16838;
const DOC_LEFT = 2160; // 1.5"
const DOC_RIGHT = 1440;
const DOC_TOP = 1440;
const DOC_BOTTOM = 1440;
const DOC_CONTENT_W = PAGE_W_DXA - DOC_LEFT - DOC_RIGHT;

function cleanMd(text = "") {
  return text.replace(/\*\*/g, "").replace(/`([^`]+)`/g, "$1").trim();
}

function textPara(text: string, opts: { bold?: boolean; color?: string; size?: number; align?: keyof typeof AlignmentType; spacingAfter?: number; heading?: typeof HeadingLevel[keyof typeof HeadingLevel] } = {}) {
  return new Paragraph({
    heading: opts.heading,
    alignment: opts.align ? AlignmentType[opts.align] : undefined,
    spacing: { after: opts.spacingAfter ?? 120, line: 360 },
    children: [new TextRun({ text: cleanMd(text), bold: opts.bold, color: opts.color || "1E1E1E", size: opts.size ?? 24, font: "Times New Roman" })],
  });
}

function labeledPara(label: string, value: string) {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text: `${label}: `, bold: true, color: "0F326E", size: 24, font: "Times New Roman" }),
      new TextRun({ text: cleanMd(value), size: 24, font: "Times New Roman" }),
    ],
  });
}

function codeBlock(lines: string[]) {
  const children = lines.length
    ? lines.map((line) => new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: line || " ", font: "Courier New", size: 18, color: "20232A" })] }))
    : [new Paragraph({ text: " " })];

  return new Table({
    width: { size: DOC_CONTENT_W, type: WidthType.DXA },
    columnWidths: [DOC_CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: DOC_CONTENT_W, type: WidthType.DXA },
      shading: { fill: "F3F6FB", type: ShadingType.CLEAR },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "B8C2D6" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "B8C2D6" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "B8C2D6" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "B8C2D6" },
      },
      margins: { top: 140, bottom: 140, left: 180, right: 180 },
      children,
    })] })],
  });
}

function markdownToDocxChildren(markdown: string) {
  const children: any[] = [];
  const lines = markdown.split("\n").map(sanitizeLine);
  let inCode = false;
  let codeLines: string[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("```")) {
      if (!inCode) { inCode = true; codeLines = []; }
      else { children.push(codeBlock(codeLines)); children.push(textPara("", { spacingAfter: 80 })); inCode = false; }
      continue;
    }
    if (inCode) { codeLines.push(raw); continue; }
    if (!line.trim()) { children.push(textPara("", { spacingAfter: 80 })); continue; }

    const heading = line.match(/^(#{1,4})\s+(.+)/);
    if (heading) {
      const level = heading[1].length;
      children.push(new Paragraph({
        heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        spacing: { before: level <= 2 ? 260 : 180, after: 120 },
        border: level <= 2 ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: "B4BED2", space: 4 } } : undefined,
        children: [new TextRun({ text: cleanMd(heading[2]), bold: true, color: "0F326E", size: level === 1 ? 32 : level === 2 ? 28 : 24, font: "Times New Roman" })],
      }));
      continue;
    }

    const labeled = line.match(/^\*\*(.+?):\*\*\s*(.*)$/) || line.match(/^(.{2,35}?):\s+(.+)$/);
    if (labeled) { children.push(labeledPara(cleanMd(labeled[1]), labeled[2] || "")); continue; }

    const bullet = line.match(/^[\-*]\s+(.+)/);
    if (bullet) {
      children.push(new Paragraph({ numbering: { reference: "doc-bullets", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: cleanMd(bullet[1]), size: 24, font: "Times New Roman" })] }));
      continue;
    }

    const numbered = line.match(/^(\d+)\.\s+(.+)/);
    if (numbered) {
      children.push(new Paragraph({ numbering: { reference: "doc-numbers", level: 0 }, spacing: { after: 80, line: 360 }, children: [new TextRun({ text: cleanMd(numbered[2]), size: 24, font: "Times New Roman" })] }));
      continue;
    }

    children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 360 }, children: [new TextRun({ text: cleanMd(line), size: 24, font: "Times New Roman" })] }));
  }

  if (inCode) children.push(codeBlock(codeLines));
  return children;
}

export async function generateDOCX(content: string, opts: PDFOptions): Promise<void> {
  const { subject, topic, teacherName, studentInfo } = opts;
  const date = new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" });
  const infoRows = [
    ...(teacherName ? [["Submitted To", teacherName]] : []),
    ["Submitted By", studentInfo.name || "—"],
    ["Roll Number", studentInfo.rollNumber || "—"],
    ["Section", studentInfo.section || "—"],
    ["Semester", `${opts.semester}`],
    ["Date", date],
  ];

  const doc = new Document({
    title: topic,
    creator: "UniGenius AI",
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: "Times New Roman", size: 24 }, paragraph: { spacing: { line: 360 } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, color: "0F326E", font: "Times New Roman" }, paragraph: { spacing: { before: 260, after: 140 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: "0F326E", font: "Times New Roman" }, paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, color: "0F326E", font: "Times New Roman" }, paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: "doc-bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "doc-numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: PAGE_W_DXA, height: PAGE_H_DXA }, margin: { top: DOC_TOP, right: DOC_RIGHT, bottom: DOC_BOTTOM, left: DOC_LEFT } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "777777", font: "Times New Roman" })] })] }) },
      children: [
        textPara(studentInfo.university || "University of Larkana", { bold: true, color: "0F326E", size: 52, align: "CENTER", spacingAfter: 80 }),
        textPara(`Department of ${studentInfo.department || "Software Engineering"}`, { size: 26, align: "CENTER", spacingAfter: 420 }),
        textPara(opts.docType === "lab" ? "LAB MANUAL" : "ASSIGNMENT REPORT", { bold: true, size: 36, align: "CENTER", spacingAfter: 120 }),
        textPara(subject, { size: 28, align: "CENTER", spacingAfter: 300 }),
        new Table({
          width: { size: DOC_CONTENT_W, type: WidthType.DXA },
          columnWidths: [DOC_CONTENT_W],
          rows: [new TableRow({ children: [new TableCell({ width: { size: DOC_CONTENT_W, type: WidthType.DXA }, shading: { fill: "F2F5FA", type: ShadingType.CLEAR }, borders: { top: { style: BorderStyle.SINGLE, size: 8, color: "B4BED2" }, bottom: { style: BorderStyle.SINGLE, size: 8, color: "B4BED2" }, left: { style: BorderStyle.SINGLE, size: 8, color: "B4BED2" }, right: { style: BorderStyle.SINGLE, size: 8, color: "B4BED2" } }, margins: { top: 220, bottom: 220, left: 240, right: 240 }, children: [textPara(topic, { bold: true, size: 26, align: "CENTER", spacingAfter: 0 })] })] })],
        }),
        textPara("", { spacingAfter: 360 }),
        new Table({
          width: { size: 5200, type: WidthType.DXA },
          columnWidths: [2100, 3100],
          alignment: AlignmentType.CENTER,
          rows: infoRows.map(([label, value]) => new TableRow({ children: [
            new TableCell({ width: { size: 2100, type: WidthType.DXA }, borders: {}, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [textPara(`${label}:`, { size: 22, color: "666666", spacingAfter: 0 })] }),
            new TableCell({ width: { size: 3100, type: WidthType.DXA }, borders: {}, margins: { top: 100, bottom: 100, left: 120, right: 120 }, children: [textPara(value, { size: 22, bold: label.includes("Submitted") || label.includes("Roll"), spacingAfter: 0 })] }),
          ] })),
        }),
        new Paragraph({ children: [new PageBreak()] }),
        textPara("Table of Contents", { bold: true, color: "0F326E", size: 36, align: "CENTER", spacingAfter: 240 }),
        new TableOfContents("", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),
        ...markdownToDocxChildren(content),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${subject.replace(/\s+/g, "_")}_${opts.docType}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
