import { useState, useCallback, DragEvent } from "react";
import { toast } from "sonner";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface AttachedFile {
  name: string;
  type: string;
  dataUrl: string;
  file: File;
  uploadProgress: number;
  thumbnailUrl?: string;
}

export function useFileDrop(
  attachedFiles: AttachedFile[],
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>,
  maxFiles: number,
  isStreaming: boolean
) {
  const [isDragOver, setIsDragOver] = useState(false);

  const processFiles = useCallback((files: File[]) => {
    if (attachedFiles.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed per message for best AI analysis.`);
      return;
    }
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`File too large: ${f.name} (max 20MB)`);
        continue;
      }
      if (!ALLOWED_TYPES.some(t => f.type === t || f.type.startsWith(t.split("/")[0] + "/"))) {
        toast.error(`Unsupported file: ${f.name}`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAttachedFiles(prev => {
          if (prev.length >= maxFiles) return prev;
          return [...prev, {
            name: f.name,
            type: f.type,
            dataUrl,
            file: f,
            uploadProgress: 0,
            thumbnailUrl: f.type.startsWith("image/") ? dataUrl : undefined,
          }];
        });
      };
      reader.readAsDataURL(f);
    }
  }, [attachedFiles, setAttachedFiles, maxFiles]);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isStreaming) setIsDragOver(true);
  }, [isStreaming]);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isStreaming) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  }, [isStreaming, processFiles]);

  return { isDragOver, onDragOver, onDragLeave, onDrop };
}
