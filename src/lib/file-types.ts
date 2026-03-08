import { FileText, Image as ImageIcon, FileSpreadsheet, Presentation, Music, Video } from "lucide-react";
import { ReactNode } from "react";

// ── Allowed MIME types for upload ──────────────────────────────
export const ALLOWED_MIME_TYPES = [
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "text/plain", // .txt
  // Presentations
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-powerpoint", // .ppt
  // Images
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  // Audio
  "audio/mpeg", // .mp3
  "audio/wav",
  "audio/x-m4a",
  "audio/mp4",
  // Video
  "video/mp4",
  "video/quicktime", // .mov
];

// File extensions for the accept attribute
export const ACCEPT_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.doc,.txt,.pptx,.ppt,.mp3,.wav,.m4a,.mp4,.mov";

// ── File type detection ───────────────────────────────────────
export type FileCategory = "image" | "pdf" | "word" | "presentation" | "audio" | "video" | "text" | "document";

export function getFileCategory(typeOrName: string): FileCategory {
  const t = typeOrName.toLowerCase();
  if (t.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif)$/i.test(t)) return "image";
  if (t === "application/pdf" || t.endsWith(".pdf")) return "pdf";
  if (t.includes("wordprocessingml") || t === "application/msword" || /\.(docx?|doc)$/i.test(t)) return "word";
  if (t.includes("presentationml") || t === "application/vnd.ms-powerpoint" || /\.(pptx?|ppt)$/i.test(t)) return "presentation";
  if (t.startsWith("audio/") || /\.(mp3|wav|m4a)$/i.test(t)) return "audio";
  if (t.startsWith("video/") || /\.(mp4|mov)$/i.test(t)) return "video";
  if (t === "text/plain" || /\.(txt|md)$/i.test(t)) return "text";
  return "document";
}

// ── Color-coded icon styles ───────────────────────────────────
export const FILE_CATEGORY_STYLES: Record<FileCategory, { color: string; bgColor: string; label: string }> = {
  image:        { color: "text-blue-500",    bgColor: "bg-blue-500/10",    label: "Image" },
  pdf:          { color: "text-red-500",     bgColor: "bg-red-500/10",     label: "PDF" },
  word:         { color: "text-blue-600",    bgColor: "bg-blue-600/10",    label: "Word" },
  presentation: { color: "text-orange-500",  bgColor: "bg-orange-500/10",  label: "PPT" },
  audio:        { color: "text-green-500",   bgColor: "bg-green-500/10",   label: "Audio" },
  video:        { color: "text-purple-500",  bgColor: "bg-purple-500/10",  label: "Video" },
  text:         { color: "text-muted-foreground", bgColor: "bg-muted",     label: "Text" },
  document:     { color: "text-primary",     bgColor: "bg-primary/10",     label: "File" },
};

// ── Check if a file is allowed ────────────────────────────────
export function isFileAllowed(file: File): boolean {
  return ALLOWED_MIME_TYPES.some(t => file.type === t || file.type.startsWith(t.split("/")[0] + "/"));
}

// ── Get descriptive text for drop zone ────────────────────────
export const DROP_ZONE_TEXT = "PDF, Images, Word, PPT, Audio, Video";

// ── Build AI-friendly content parts for a file ────────────────
export function buildFileContentParts(
  file: { name: string; type: string; dataUrl: string },
  index: number,
  total: number,
  subjectContext?: string,
): any[] {
  const parts: any[] = [];
  const cat = getFileCategory(file.type);
  const ctx = subjectContext ? ` for ${subjectContext}` : "";

  switch (cat) {
    case "image":
      parts.push({ type: "image_url", image_url: { url: file.dataUrl } });
      parts.push({ type: "text", text: `[Image ${index + 1}/${total}: ${file.name}] — Analyze this image${ctx}. Extract text/code via OCR if present.` });
      break;
    case "pdf":
      parts.push({ type: "file", file: { name: file.name, mime_type: file.type, data: file.dataUrl.split(",")[1] } });
      parts.push({ type: "text", text: `[PDF ${index + 1}/${total}: ${file.name}] — Read and analyze this PDF${ctx}.` });
      break;
    case "word":
      parts.push({ type: "file", file: { name: file.name, mime_type: file.type, data: file.dataUrl.split(",")[1] } });
      parts.push({ type: "text", text: `[Word Document ${index + 1}/${total}: ${file.name}] — Extract and analyze the text content from this Word document${ctx}.` });
      break;
    case "presentation":
      parts.push({ type: "file", file: { name: file.name, mime_type: file.type, data: file.dataUrl.split(",")[1] } });
      parts.push({ type: "text", text: `[Presentation ${index + 1}/${total}: ${file.name}] — Extract all slide text, notes, and diagrams from this PowerPoint file${ctx}. Summarize each slide.` });
      break;
    case "audio":
      parts.push({ type: "file", file: { name: file.name, mime_type: file.type, data: file.dataUrl.split(",")[1] } });
      parts.push({ type: "text", text: `[Audio ${index + 1}/${total}: ${file.name}] — This is a recorded lecture/audio. Transcribe it and provide key points${ctx}.` });
      break;
    case "video":
      parts.push({ type: "file", file: { name: file.name, mime_type: file.type, data: file.dataUrl.split(",")[1] } });
      parts.push({ type: "text", text: `[Video ${index + 1}/${total}: ${file.name}] — This is a video recording. Analyze any extractable content (audio track, metadata)${ctx}.` });
      break;
    default:
      parts.push({ type: "file", file: { name: file.name, mime_type: file.type, data: file.dataUrl.split(",")[1] } });
      parts.push({ type: "text", text: `[Document ${index + 1}/${total}: ${file.name}] — Analyze this document${ctx}.` });
  }

  return parts;
}
