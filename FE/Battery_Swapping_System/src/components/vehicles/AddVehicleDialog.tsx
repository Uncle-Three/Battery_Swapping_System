import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addVehicleSchema, type AddVehicleFormInput, type AddVehicleFormValues } from "../../schemas/vehicleSchemas";
import { vehicleService } from "../../services/vehicleService";
import { X, Loader2, ChevronDown, Upload, CheckCircle2, ArrowRight, Search } from "lucide-react";
import jsQR from "jsqr";

// Custom Dropdown to limit height to ~7 items
function CustomDropdown({ value, onChange, options, placeholder, disabled = false, className = "" }: {
  value: string | number;
  onChange: (val: string | number) => void;
  options: { label: string | number; value: string | number }[];
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 250) {
        setDropdownPosition("top");
      } else {
        setDropdownPosition("bottom");
      }
    }
    setIsOpen(!isOpen);
  };

  const selectedLabel = options.find(o => o.value === value)?.label || "";

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        onClick={handleToggle}
        className={`w-full px-4 py-2 border rounded-xl outline-none flex justify-between items-center transition ${
          disabled 
            ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800/50" 
            : "bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer dark:border-slate-700"
        }`}
      >
        <span className={selectedLabel ? "" : "text-slate-400"}>{selectedLabel || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </div>
      
      {isOpen && !disabled && (
        <div className={`absolute z-50 w-full ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'mt-1'} bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-lg max-h-56 overflow-y-auto`}>
          {options.map((opt) => (
            <div 
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2 cursor-pointer transition ${value === opt.value ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AddVehicleDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddVehicleDialog({ onClose, onSuccess }: AddVehicleDialogProps) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } = useForm<AddVehicleFormInput, unknown, AddVehicleFormValues>({
    resolver: zodResolver(addVehicleSchema),
    defaultValues: {
      brand: "VinFast",
      model: "",
      batteryType: "",
      qrCodeValue: "",
    }
  });

  const selectedModel = watch("model");
  const selectedYear = watch("manufactureYear");
  const selectedBattery = watch("batteryType");
  const selectedColor = watch("color");
  const qrCodeValue = watch("qrCodeValue");

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanError("");
    setValue("qrCodeValue", "");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            setValue("qrCodeValue", code.data);
            trigger("qrCodeValue");
          } else {
            setScanError("Không tìm thấy mã QR hợp lệ trong ảnh.");
          }
        }
        setIsScanning(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Models
  const models = [
    "VF 3", "VF 5", "VF e34", 
    "VF 6 Eco", "VF 6 Plus", 
    "VF 7 Eco", "VF 7 Plus", 
    "VF 8 Eco", "VF 8 Plus", 
    "VF 9 Eco", "VF 9 Plus"
  ];

  // Battery mapping based on model
  const getBatteryOptions = (model: string) => {
    switch(model) {
      case "VF 3": return ["VF3_LFP_18"];
      case "VF 5": return ["VF5_LFP_37"];
      case "VF e34": return ["VFE34_LIION_42"];
      case "VF 6 Eco": 
      case "VF 6 Plus": return ["VF6_LFP_59"];
      case "VF 7 Eco": return ["VF7_59"];
      case "VF 7 Plus": return ["VF7_70"];
      case "VF 8 Eco":
      case "VF 8 Plus": return ["VF8_LARGE"];
      case "VF 9 Eco":
      case "VF 9 Plus": return ["VF9_SDI", "VF9_CATL"];
      default: return [];
    }
  };

  // Color mapping based on model
  const getColors = (model: string) => {
    if (model.startsWith("VF 3")) return ["Trắng Infinity Blanc", "Xám Zenith Grey", "Đỏ Solar Ruby/Crimson Red", "Vàng Summer Yellow", "Hồng Rose Pink", "Xanh dương Sky Blue", "Xanh lá nhạt Urban Mint"];
    if (model.startsWith("VF 5") || model.startsWith("VF e34") || model.startsWith("VF 6") || model.startsWith("VF 7")) return ["Trắng", "Đen", "Xám", "Đỏ", "Xanh dương", "Bạc"];
    if (model.startsWith("VF 8")) return ["Infinity Blanc", "Jet Black", "Crimson Red", "Ivy Green", "Crimson Velvet – Mystery Bronze Roof", "Zenith Grey – Desat Silver Roof", "Infinity Blanc – Zenith Grey Roof", "Jet Black – Mystery Bronze Roof"];
    if (model.startsWith("VF 9")) return ["Infinity Blanc", "Jet Black", "Zenith Grey", "Crimson Red", "Urban Mint", "Ivy Green", "Desat Silver"];
    return [];
  };

  // Update battery type when model changes
  useEffect(() => {
    if (selectedModel) {
      const options = getBatteryOptions(selectedModel);
      if (options.length === 1) {
        setValue("batteryType", options[0]);
      } else {
        setValue("batteryType", "");
      }
      setValue("color", ""); // reset color when model changes
    }
  }, [selectedModel, setValue]);

  const currentYear = new Date().getFullYear();
  
  const getMinManufactureYear = (model: string) => {
    if (!model) return 2019;
    if (model.startsWith("VF e34")) return 2021;
    if (model.startsWith("VF 3")) return 2024;
    if (model.startsWith("VF 5")) return 2023;
    if (model.startsWith("VF 6")) return 2023;
    if (model.startsWith("VF 7")) return 2023;
    if (model.startsWith("VF 8")) return 2022;
    if (model.startsWith("VF 9")) return 2023;
    return 2019;
  };
  
  const minManufactureYear = getMinManufactureYear(selectedModel);
  const manufactureYears = Array.from({ length: currentYear - minManufactureYear + 1 }, (_, i) => minManufactureYear + i);
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const availablePurchaseYears = selectedYear 
    ? Array.from({ length: currentYear - selectedYear + 1 }, (_, i) => selectedYear + i)
    : Array.from({ length: currentYear - minManufactureYear + 1 }, (_, i) => minManufactureYear + i);

  useEffect(() => {
    if (selectedModel && selectedYear && selectedYear < getMinManufactureYear(selectedModel)) {
      setValue("manufactureYear", NaN, { shouldValidate: true });
    }
  }, [selectedModel, selectedYear, setValue]);

  const [purchaseDay, setPurchaseDay] = useState("");
  const [purchaseMonth, setPurchaseMonth] = useState("");
  const [purchaseYear, setPurchaseYear] = useState("");

  useEffect(() => {
    if (selectedYear && purchaseYear && parseInt(purchaseYear) < selectedYear) {
      setPurchaseYear("");
    }
  }, [selectedYear, purchaseYear]);

  useEffect(() => {
    if (purchaseDay && purchaseMonth && purchaseYear) {
      setValue("purchaseDate", `${purchaseYear}-${purchaseMonth.padStart(2, '0')}-${purchaseDay.padStart(2, '0')}`);
    }
  }, [purchaseDay, purchaseMonth, purchaseYear, setValue]);

  const onSubmit = async (data: AddVehicleFormValues) => {
    setError("");
    try {
      await vehicleService.createVehicle(data);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Thêm xe thất bại");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 border-b flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold">Thêm Xe Mới</h2>
            <p className="text-xs text-slate-500">Đăng ký xe chưa từng có trong hệ thống</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Notice banner for used vehicle purchase */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-semibold text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Bạn đang mua lại xe cũ từ người khác?</span>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); navigate("/app/vehicles/add"); }}
              className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-bold dark:text-emerald-400 shrink-0"
            >
              Tra cứu & Yêu cầu chuyển quyền <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {error && (
            <div className="p-4 bg-amber-50 text-amber-900 rounded-xl text-sm font-medium border border-amber-200 space-y-3 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
              <p className="font-bold">{error}</p>
              <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs text-amber-800 dark:text-amber-300">Xe này đã có trong hệ thống? Bạn có thể gửi yêu cầu chuyển quyền sở hữu.</span>
                <button
                  type="button"
                  onClick={() => { onClose(); navigate("/app/vehicles/add"); }}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition shrink-0 inline-flex items-center gap-1"
                >
                  Tra cứu & Chuyển quyền ngay <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Biển số xe *</label>
              <input 
                {...register("plateNumber")} 
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700" 
                placeholder="vd: 51A-123.45"
              />
              {errors.plateNumber && <p className="text-red-500 text-xs mt-1">{errors.plateNumber.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Mã số khung (VIN) (Không bắt buộc)</label>
              <input 
                {...register("vin")} 
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700" 
                placeholder="Nhập số VIN nếu có"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Hãng xe *</label>
              <input 
                {...register("brand")} 
                readOnly
                className="w-full px-4 py-2 border rounded-xl bg-slate-100 text-slate-500 outline-none dark:bg-slate-800 dark:border-slate-700 cursor-not-allowed" 
              />
              {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Dòng xe *</label>
              <CustomDropdown
                value={selectedModel}
                onChange={(val) => { setValue("model", String(val)); trigger("model"); }}
                options={models.map(m => ({ label: m, value: m }))}
                placeholder="Chọn dòng xe"
              />
              <input type="hidden" {...register("model")} />
              {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Năm sản xuất *</label>
              <CustomDropdown
                value={selectedYear || ""}
                onChange={(val) => { setValue("manufactureYear", Number(val)); trigger("manufactureYear"); }}
                options={manufactureYears.map(y => ({ label: y, value: y }))}
                placeholder="Chọn năm"
                disabled={!selectedModel}
              />
              <input type="hidden" {...register("manufactureYear", { valueAsNumber: true })} />
              {errors.manufactureYear && <p className="text-red-500 text-xs mt-1">{errors.manufactureYear.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Ngày mua *</label>
              <div className="grid grid-cols-3 gap-2">
                <CustomDropdown
                  value={purchaseDay}
                  onChange={(val) => setPurchaseDay(String(val))}
                  options={days.map(d => ({ label: d, value: d }))}
                  placeholder="Ngày"
                  className="w-full"
                  disabled={!selectedModel}
                />
                <CustomDropdown
                  value={purchaseMonth}
                  onChange={(val) => setPurchaseMonth(String(val))}
                  options={months.map(m => ({ label: m, value: m }))}
                  placeholder="Tháng"
                  className="w-full"
                  disabled={!selectedModel}
                />
                <CustomDropdown
                  value={purchaseYear}
                  onChange={(val) => setPurchaseYear(String(val))}
                  options={availablePurchaseYears.map(y => ({ label: String(y), value: String(y) }))}
                  placeholder="Năm"
                  className="w-full"
                  disabled={!selectedModel}
                />
              </div>
              <input type="hidden" {...register("purchaseDate")} />
              {errors.purchaseDate && <p className="text-red-500 text-xs mt-1">{errors.purchaseDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Số Km hiện tại (ODO) *</label>
                <input 
                  type="number"
                  {...register("currentMileageKm", { valueAsNumber: true })} 
                  onKeyDown={(e) => {
                    if (['-', 'e', 'E', '+', '.', ',', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onInput={(e) => {
                    if (e.currentTarget.value.length > 6) {
                      e.currentTarget.value = e.currentTarget.value.slice(0, 6);
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700" 
                />
              {errors.currentMileageKm && <p className="text-red-500 text-xs mt-1">{errors.currentMileageKm.message}</p>}
            </div>

            <div className="p-3 border rounded-xl dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 self-start">
              <label className="block text-sm font-semibold mb-1">Mã QR Pin *</label>
              <p className="text-xs text-slate-500 mb-2">Tải ảnh QR để hệ thống tự động quét mã.</p>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-sm text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-xl font-medium hover:bg-blue-200 transition">
                    {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isScanning ? "Đang quét..." : "Tải ảnh QR lên"}
                  </div>
                </div>
                
                <div className="min-w-0 flex-1">
                  {qrCodeValue ? (
                    <div className="flex items-center gap-2 text-green-600 text-xs font-medium px-3 py-2 border border-green-200 bg-green-50 rounded-xl dark:bg-green-900/20 dark:border-green-800">
                       <CheckCircle2 className="w-4 h-4 shrink-0" />
                       Đã quét mã thành công
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-xs py-1 whitespace-nowrap">
                      Chưa tải ảnh
                    </div>
                  )}
                  <input type="hidden" {...register("qrCodeValue")} />
                  {errors.qrCodeValue && <p className="text-red-500 text-xs mt-1">{errors.qrCodeValue.message}</p>}
                  {scanError && <p className="text-red-500 text-xs mt-1">{scanError}</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Loại Pin *</label>
              <CustomDropdown
                value={selectedBattery}
                onChange={(val) => { setValue("batteryType", String(val)); trigger("batteryType"); }}
                options={selectedModel ? getBatteryOptions(selectedModel).map(b => ({ label: b, value: b })) : []}
                placeholder="Chọn loại pin"
                disabled={!selectedModel}
              />
              <input type="hidden" {...register("batteryType")} />
              {errors.batteryType && <p className="text-red-500 text-xs mt-1">{errors.batteryType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Màu sắc</label>
              <CustomDropdown
                value={selectedColor || ""}
                onChange={(val) => setValue("color", String(val))}
                options={selectedModel ? getColors(selectedModel).map(c => ({ label: c, value: c })) : []}
                placeholder="Chọn màu xe"
                disabled={!selectedModel}
              />
              <input type="hidden" {...register("color")} />
            </div>
          </div>
          
          <div className="pt-4 border-t flex justify-end gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 rounded-xl border hover:bg-slate-50 font-semibold dark:hover:bg-slate-800 transition"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu Thông Tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
