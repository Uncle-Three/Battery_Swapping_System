import { useState, useRef } from "react";
import { Upload, X, FileText, Image, AlertCircle, RefreshCw } from "lucide-react";

export type DocumentField = "registrationDocumentUrl" | "identityDocumentUrl" | "purchaseContractUrl";

interface DocumentUploaderProps {
  label: string;
  hint?: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  required?: boolean;
  readOnly?: boolean;
}

export function DocumentUploader({ label, hint, value, onChange, required, readOnly }: DocumentUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDataUrl = value?.startsWith("data:");
  const isImage = Boolean(
    value &&
      (isDataUrl
        ? value.startsWith("data:image/")
        : /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(value) || value.includes("image"))
  );
  const isPdf = Boolean(
    value &&
      (isDataUrl
        ? value.startsWith("data:application/pdf")
        : /\.pdf(\?.*)?$/i.test(value))
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("Dung lượng tệp tối đa là 15MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.onerror = () => {
      setError("Không thể đọc tệp từ thiết bị.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {value ? (
        <div className="relative rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/30 shadow-sm transition">
          <div className="flex items-center gap-3">
            {isImage ? (
              <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-emerald-200 bg-white shrink-0 dark:border-emerald-800">
                <img src={value} alt="Document Preview" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0 dark:bg-emerald-900/50 dark:text-emerald-400">
                {isPdf ? <FileText className="h-6 w-6" /> : <Image className="h-6 w-6" />}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300 truncate">
                {isImage ? "Hình ảnh tài liệu đã chọn" : isPdf ? "Tài liệu PDF" : "Tài liệu đã đính kèm"}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {isDataUrl ? "Tệp đã chọn từ thiết bị" : value}
              </p>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Đổi tệp khác"
                  className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-100 transition dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(undefined)}
                  title="Xóa tệp"
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 transition dark:hover:bg-red-900/30 dark:hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-6 text-center transition hover:border-emerald-500 hover:bg-emerald-50/30 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-emerald-600"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition group-hover:scale-110 dark:bg-emerald-950 dark:text-emerald-400">
              <Upload className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              Nhấp để chọn hình ảnh / tệp từ thiết bị
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hỗ trợ tất cả hình ảnh (PNG, JPG, WEBP...) & tài liệu PDF
            </p>
          </div>
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

interface TwoSideDocumentUploaderProps {
  label: string;
  hint?: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  required?: boolean;
}

export function TwoSideDocumentUploader({
  label,
  hint,
  value,
  onChange,
  required,
}: TwoSideDocumentUploaderProps) {
  const parts = value ? value.split("|") : [];
  const frontUrl = parts[0] || undefined;
  const backUrl = parts[1] || undefined;

  const updateSide = (front?: string, back?: string) => {
    if (!front && !back) {
      onChange(undefined);
    } else if (front && back) {
      onChange(`${front}|${back}`);
    } else {
      onChange(front || back);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/40">
      <div>
        <label className="block text-sm font-bold text-slate-900 dark:text-white">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DocumentUploader
          label="Mặt trước (Mặt 1)"
          value={frontUrl}
          onChange={(url) => updateSide(url, backUrl)}
          required={required}
        />
        <DocumentUploader
          label="Mặt sau (Mặt 2)"
          value={backUrl}
          onChange={(url) => updateSide(frontUrl, url)}
          required={required}
        />
      </div>
    </div>
  );
}

interface AdditionalDocumentsProps {
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export function AdditionalDocumentsUploader({ values, onChange, max = 10 }: AdditionalDocumentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = max - values.length;
    const filesToProcess = files.slice(0, remainingSlots);

    const newUrls: string[] = [];
    let processed = 0;

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          newUrls.push(reader.result);
        }
        processed++;
        if (processed === filesToProcess.length) {
          onChange([...values, ...newUrls]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
        Tài liệu bổ sung <span className="text-slate-400 font-normal">(tùy chọn, tối đa {max})</span>
      </label>

      {values.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {values.map((val, idx) => {
            const isData = val.startsWith("data:");
            const isImg = isData
              ? val.startsWith("data:image/")
              : /\.(jpg|jpeg|png|webp|gif|svg)/i.test(val);
            return (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900"
              >
                {isImg ? (
                  <img
                    src={val}
                    alt="thumb"
                    className="h-9 w-9 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <FileText className="h-5 w-5 text-slate-400 shrink-0 ml-1" />
                )}
                <span className="flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isData ? `Tệp đính kèm ${idx + 1}` : val}
                </span>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="p-1 text-slate-400 hover:text-red-600 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {values.length < max && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFilesSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 py-3 px-4 text-xs font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/30 transition dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-emerald-600"
          >
            <Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Chọn hình ảnh / tệp từ thiết bị
          </button>
        </div>
      )}
    </div>
  );
}
