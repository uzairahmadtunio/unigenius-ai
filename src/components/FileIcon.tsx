import { FileText, Image as ImageIcon, Presentation, Music, Video, File, Archive } from "lucide-react";
import { getFileCategory, FILE_CATEGORY_STYLES } from "@/lib/file-types";

interface FileIconProps {
  fileName?: string;
  mimeType?: string;
  size?: "xs" | "sm" | "md";
}

const sizeMap = { xs: "w-2.5 h-2.5", sm: "w-3.5 h-3.5", md: "w-5 h-5" };

const FileIcon = ({ fileName = "", mimeType = "", size = "sm" }: FileIconProps) => {
  const cat = getFileCategory(mimeType || fileName);
  const style = FILE_CATEGORY_STYLES[cat];
  const cls = `${sizeMap[size]} ${style.color}`;

  switch (cat) {
    case "image":        return <ImageIcon className={cls} />;
    case "pdf":          return <FileText className={cls} />;
    case "word":         return <FileText className={cls} />;
    case "presentation": return <Presentation className={cls} />;
    case "audio":        return <Music className={cls} />;
    case "video":        return <Video className={cls} />;
    case "text":         return <FileText className={cls} />;
    case "archive":      return <Archive className={cls} />;
    default:             return <File className={cls} />;
  }
};

export default FileIcon;
