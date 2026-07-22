import { useState } from "react";
import { Upload, X, FileText, Image, AlertCircle } from "lucide-react";

export type DocumentField = "registrationDocumentUrl" | "identityDocumentUrl" | "purchaseContractUrl";

interface DocumentUploaderProps {
  label: string;
  hint?: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  required?: boolean;
}

export function DocumentUploader({ label, hint, value, onChange, required }: DocumentUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const isImage = value && /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(value);
  const isPdf = value && /\.pdf(\?.*)?$/i.test(value);

  const handleUrlInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    setError(null);
    if (!url) { onChange(undefined); return; }
    try {
      new URL(url);
      onChange(url);
    } catch {
      setError("Vui lòng nhập đường dẫn URL hợp lệ");
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {value ? (
        <div className="relative rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
              {isImage ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <a href={value} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-emerald-800 dark:text-emerald-300 hover:underline">
                {isPdf ? "Tài liệu PDF" : isImage ? "Hình ảnh tài liệu" : "Tài liệu đã đính kèm"}
              </a>
              <p className="text-xs text-slate-500 truncate">{value}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <Upload className="mx-auto h-7 w-7 text-slate-400 mb-1" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Dán URL tài liệu đã tải lên cloud vào ô bên dưới</p>
          </div>
          <input
            type="url"
            placeholder="https://your-storage.com/document.pdf"
            onChange={handleUrlInput}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

interface AdditionalDocumentsProps {
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export function AdditionalDocumentsUploader({ values, onChange, max = 10 }: AdditionalDocumentsProps) {
  const [input, setInput] = useState("");

  const add = () => {
    const url = input.trim();
    if (!url) return;
    try {
      new URL(url);
      onChange([...values, url]);
      setInput("");
    } catch {
      // ignore invalid
    }
  };

  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
        Tài liệu bổ sung <span className="text-slate-400 font-normal">(tùy chọn, tối đa {max})</span>
      </label>

      <div className="space-y-2">
        {values.map((url, idx) => (
          <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="flex-1 truncate text-xs">{url}</span>
            <button type="button" onClick={() => remove(idx)} className="text-slate-400 hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {values.length < max && (
        <div className="flex gap-2">
          <input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Dán URL tài liệu khác"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          />
          <button
            type="button"
            onClick={add}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            Thêm
          </button>
        </div>
      )}
    </div>
  );
}
