import React, { useState } from "react";
import { FileText, Maximize2, X, Image as ImageIcon } from "lucide-react";

interface DocumentPreviewCardProps {
  label: string;
  url?: string | null;
  required?: boolean;
}

export const DocumentPreviewCard: React.FC<DocumentPreviewCardProps> = ({
  label,
  url,
  required,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // If the document has 2 sides (joined by '|'), render 2 separate side-by-side cards
  if (url && url.includes("|")) {
    const [frontUrl, backUrl] = url.split("|");
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 col-span-1 md:col-span-2">
        <DocumentPreviewCard
          label={`${label} (Mặt trước)`}
          url={frontUrl}
          required={required}
        />
        <DocumentPreviewCard
          label={`${label} (Mặt sau)`}
          url={backUrl}
          required={required}
        />
      </div>
    );
  }

  // Helper to check if URL looks like an image
  const isImage = (link?: string | null) => {
    if (!link) return false;
    if (link.startsWith("data:image/")) return true;
    const lower = link.toLowerCase();
    return (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".gif") ||
      lower.includes("image")
    );
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 transition hover:border-slate-300 dark:hover:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {label}
              </h4>
              {required && (
                <span className="text-[11px] font-semibold text-slate-400">
                  Bắt buộc
                </span>
              )}
            </div>
          </div>
        </div>

        {url ? (
          <div className="relative group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
            {isImage(url) ? (
              <div
                onClick={() => setIsPreviewOpen(true)}
                className="relative cursor-pointer group"
              >
                <img
                  src={url}
                  alt={label}
                  className="w-full h-48 object-cover object-center transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-[2px]">
                  <span className="p-2.5 rounded-full bg-white/20 backdrop-blur-md shadow-lg">
                    <Maximize2 className="h-5 w-5" />
                  </span>
                  Bấm để xem hình to
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsPreviewOpen(true)}
                className="p-6 text-center cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition flex flex-col items-center justify-center gap-2"
              >
                <ImageIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Xem trước tài liệu
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Maximize2 className="h-3 w-3" /> Click để mở ảnh / tài liệu
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center bg-slate-100/50 dark:bg-slate-800/30">
            <span
              className={`text-xs font-bold ${
                required ? "text-red-500" : "text-slate-400"
              }`}
            >
              {required ? "⚠️ Chưa nộp tài liệu" : "Không áp dụng"}
            </span>
          </div>
        )}
      </div>

      {/* Lightbox Fullscreen Modal */}
      {isPreviewOpen && url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {label}
                </h3>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/20 dark:bg-slate-950/80 min-h-[400px]">
              {isImage(url) ? (
                <img
                  src={url}
                  alt={label}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg border border-slate-200/20"
                />
              ) : (
                <iframe
                  src={url}
                  title={label}
                  className="w-full h-[75vh] rounded-xl border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
