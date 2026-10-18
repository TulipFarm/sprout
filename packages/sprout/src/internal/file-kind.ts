import { languageForFilename } from "./syntax.js";

export type FileKind =
  | "image"
  | "pdf"
  | "json"
  | "text"
  | "markdown"
  | "code"
  | "sheet"
  | "document"
  | "slides"
  | "google"
  | "unsupported";

export const defaultFileAccept =
  ".docx,.xlsx,.xls,.csv,.tsv,.pptx,.ppt,.pdf,.json,.txt,.md,.markdown,.gdoc,.gsheet,.gslides,image/*," +
  ".js,.jsx,.ts,.tsx,.py,.rb,.go,.rs,.java,.kt,.swift,.c,.h,.cpp,.cs,.php,.sh,.sql,.yaml,.yml,.toml,.xml,.html,.css,.scss,.log";

const imageExtensions = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "svg",
  "bmp",
  "ico",
  "heic",
  "heif",
  "tif",
  "tiff",
];
const sheetTypes = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

export function fileKind(name: string, mediaType: string): FileKind {
  const extension = name.toLowerCase().split(".").at(-1) ?? "";
  if (mediaType.startsWith("image/") || imageExtensions.includes(extension))
    return "image";
  if (
    mediaType.startsWith("application/vnd.google-apps.") ||
    ["gdoc", "gsheet", "gslides"].includes(extension)
  )
    return "google";
  if (extension === "pdf" || mediaType === "application/pdf") return "pdf";
  if (extension === "json" || mediaType === "application/json") return "json";
  if (["md", "markdown"].includes(extension) || mediaType === "text/markdown")
    return "markdown";
  if (
    ["xls", "xlsx", "csv", "tsv"].includes(extension) ||
    sheetTypes.includes(mediaType)
  )
    return "sheet";
  if (
    extension === "docx" ||
    mediaType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "document";
  if (
    extension === "pptx" ||
    mediaType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
    return "slides";
  if (languageForFilename(name)) return "code";
  if (mediaType.startsWith("text/") || extension === "txt") return "text";
  return "unsupported";
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 bytes";
  if (bytes >= 1024 ** 3)
    return `${(bytes / 1024 ** 3).toFixed(1).replace(/\.0$/, "")} GB`;
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
