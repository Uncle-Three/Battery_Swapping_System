import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, Battery, CheckCircle2, Info, Loader2, QrCode, RefreshCw, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { addNewBatterySchema, type AddNewBatteryFormData } from '../../../schemas/batterySchema';
import { batteryService } from '../../../services/batteryService';
import { vehicleModelService, type VehicleModelItem } from '../../../services/vehicleModelService';
import type { BatteryType, StationOption } from '../../../types/battery';
import { getApiErrorMessage } from '../../../services/apiClient';

interface AddNewBatteryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultStationId?: string;
}

const VINFAST_MODELS = [
  "VF 3", "VF 5", "VF e34", 
  "VF 6 Eco", "VF 6 Plus", 
  "VF 7 Eco", "VF 7 Plus", 
  "VF 8 Eco", "VF 8 Plus", 
  "VF 9 Eco", "VF 9 Plus"
];

const getBatteryCodesForModel = (modelName: string): string[] => {
  switch (modelName) {
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

export const AddNewBatteryModal: React.FC<AddNewBatteryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultStationId,
}) => {
  const [vehicleModels, setVehicleModels] = useState<VehicleModelItem[]>([]);
  const [batteryTypes, setBatteryTypes] = useState<BatteryType[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<AddNewBatteryFormData | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const generateRandomBatteryCode = () => {
    const year = new Date().getFullYear();
    const randomSeq = String(Math.floor(100000 + Math.random() * 900000));
    return `BAT-HCM-${year}-${randomSeq}`;
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(addNewBatterySchema),
    defaultValues: {
      code: generateRandomBatteryCode(),
      vehicleModelId: '',
      batteryTypeId: '',
      manufacturer: 'VinES',
      soc: 100,
      manufacturedAt: todayStr,
      receivedAt: todayStr,
      stationId: defaultStationId || '',
      note: '',
    },
  });

  const currentCode = watch('code') || 'BAT-HCM-2026-000005';
  const selectedVehicleModelId = watch('vehicleModelId');
  const selectedStationId = watch('stationId');

  // Load models, battery types, and stations when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        setLoadingData(true);
        setApiError(null);
        const [models, types, stationList] = await Promise.all([
          vehicleModelService.getVehicleModels(),
          batteryService.getBatteryTypes(),
          batteryService.getAuthorizedStations(),
        ]);
        setVehicleModels(models);
        setBatteryTypes(types);
        setStations(stationList);

        if (defaultStationId) {
          setValue('stationId', defaultStationId);
        } else if (stationList.length > 0) {
          setValue('stationId', stationList[0].id);
        }
      } catch (err) {
        setApiError(getApiErrorMessage(err, 'Không thể tải danh sách loại xe hoặc trạm.'));
      } finally {
        setLoadingData(false);
      }
    };

    void fetchData();
  }, [isOpen, defaultStationId, setValue]);

  // Find model name for the selected vehicle model safely with useMemo
  const selectedModelObj = useMemo(() => {
    return vehicleModels.find(
      (m) => m.id === selectedVehicleModelId || m.name === selectedVehicleModelId
    );
  }, [vehicleModels, selectedVehicleModelId]);

  const selectedModelName = selectedModelObj ? selectedModelObj.name : selectedVehicleModelId;

  // Expected codes for selected vehicle model
  const expectedCodes = useMemo(() => {
    return getBatteryCodesForModel(selectedModelName);
  }, [selectedModelName]);

  // Filter battery types safely using useMemo to avoid re-render loops
  const availableBatteryTypes = useMemo(() => {
    if (!selectedVehicleModelId) return batteryTypes;
    return batteryTypes.filter((t) => {
      if (expectedCodes.length > 0 && expectedCodes.includes(t.code)) return true;
      return (
        t.compatibilities?.some(
          (c) =>
            c.vehicleModelId === selectedVehicleModelId ||
            c.vehicleModel?.id === selectedVehicleModelId ||
            c.vehicleModel?.name === selectedModelName
        ) ?? false
      );
    });
  }, [selectedVehicleModelId, batteryTypes, expectedCodes, selectedModelName]);

  // Handle vehicle selection explicitly without infinite useEffect loops
  const handleVehicleModelChange = (val: string) => {
    setValue('vehicleModelId', val, { shouldValidate: true });

    const modelObj = vehicleModels.find((m) => m.id === val || m.name === val);
    const modelName = modelObj ? modelObj.name : val;
    const codes = getBatteryCodesForModel(modelName);

    const matchingType = batteryTypes.find((t) => codes.includes(t.code));
    if (matchingType) {
      setValue('batteryTypeId', matchingType.id, { shouldValidate: true });
    } else if (codes.length > 0) {
      setValue('batteryTypeId', codes[0], { shouldValidate: true });
    } else {
      setValue('batteryTypeId', '');
    }
  };

  // Combined options list for vehicle models
  const displayModelsList = VINFAST_MODELS.map((modelName) => {
    const found = vehicleModels.find((m) => m.name === modelName);
    return {
      id: found ? found.id : modelName,
      name: modelName,
    };
  });

  // Reset form when modal closes
  const handleModalClose = () => {
    reset({
      code: generateRandomBatteryCode(),
      vehicleModelId: '',
      batteryTypeId: '',
      manufacturer: 'VinES',
      soc: 100,
      manufacturedAt: todayStr,
      receivedAt: todayStr,
      stationId: defaultStationId || '',
      note: '',
    });
    setApiError(null);
    setIsConfirmOpen(false);
    onClose();
  };

  // Handle random generator button
  const handleGenerateCode = () => {
    const newCode = generateRandomBatteryCode();
    setValue('code', newCode, { shouldValidate: true });
  };

  // Step 1: Form submission -> Open confirmation dialog
  const onFormSubmit = (data: any) => {
    setPendingData(data as AddNewBatteryFormData);
    setIsConfirmOpen(true);
  };

  // Step 2: Confirm -> Execute API call
  const handleConfirmSubmit = async () => {
    if (!pendingData) return;

    try {
      setIsSubmitting(true);
      setApiError(null);

      const codeVal = pendingData.code.trim().toUpperCase().slice(0, 25);

      // Find real batteryTypeId if pendingData has code name or id
      let targetBatteryTypeId = pendingData.batteryTypeId;
      const matchedType = batteryTypes.find((t) => t.id === targetBatteryTypeId || t.code === targetBatteryTypeId);
      if (matchedType) {
        targetBatteryTypeId = matchedType.id;
      }

      await batteryService.createBattery({
        code: codeVal,
        serialNumber: codeVal,
        batteryTypeId: targetBatteryTypeId,
        vehicleModelId: pendingData.vehicleModelId,
        manufacturer: 'VinES',
        soc: Number(pendingData.soc),
        manufacturedAt: pendingData.manufacturedAt,
        receivedAt: pendingData.receivedAt,
        stationId: pendingData.stationId,
        storageLocation: 'Kho trạm',
        note: pendingData.note?.trim() || undefined,
      });

      setToastMessage('Đã thêm pin mới vào kho thành công.');
      setIsConfirmOpen(false);

      setTimeout(() => {
        setToastMessage(null);
        handleModalClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err) {
      setIsConfirmOpen(false);
      setApiError(getApiErrorMessage(err, 'Mã pin hoặc số serial đã tồn tại trong hệ thống.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStation = stations.find((s) => s.id === selectedStationId);

  if (!isOpen) return null;

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-3 text-white shadow-xl animate-bounce">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Modal Backdrop */}
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Battery className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thêm pin mới vào kho</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tạo mã pin tự động và nhập thông tin pin mới vào trạm</p>
              </div>
            </div>
            <button
              onClick={handleModalClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Content / Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Error Banner */}
            {apiError && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Không thể thực hiện</p>
                  <p className="mt-0.5 text-xs">{apiError}</p>
                </div>
              </div>
            )}

            {/* Read-Only System Default Values Box */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider mb-2">
                <Info className="h-4 w-4" />
                <span>Thuộc tính tự động gán bởi hệ thống (Chỉ đọc)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="rounded-lg bg-white p-2.5 shadow-sm border border-emerald-100 dark:bg-slate-800 dark:border-slate-700">
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">SOH (Sức khỏe)</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">100%</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 shadow-sm border border-emerald-100 dark:bg-slate-800 dark:border-slate-700">
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">Tình trạng</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Pin mới</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 shadow-sm border border-emerald-100 dark:bg-slate-800 dark:border-slate-700">
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">Số chu kỳ sạc</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">0</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 shadow-sm border border-emerald-100 dark:bg-slate-800 dark:border-slate-700">
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">Quãng đường</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">0 km</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 shadow-sm border border-emerald-100 dark:bg-slate-800 dark:border-slate-700 col-span-2 sm:col-span-1">
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">Trạng thái</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Sẵn sàng</span>
                </div>
              </div>
            </div>

            {loadingData ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Form Controls */}
                <form id="add-battery-form" onSubmit={handleSubmit(onFormSubmit)} className="lg:col-span-7 space-y-4">
                  {/* Mã Pin + Random Button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                        Mã pin (Tối đa 25 ký tự) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>🎲 Tạo mã ngẫu nhiên</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={25}
                        placeholder="Ví dụ: BAT-HCM-2026-000005"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-3.5 pr-14 py-2.5 text-sm font-mono font-bold uppercase text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        {...register('code')}
                        onBlur={(e) => setValue('code', e.target.value.trim().toUpperCase().slice(0, 25))}
                      />
                      <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-400">
                        {currentCode.length}/25
                      </span>
                    </div>
                    {errors.code?.message && <p className="mt-1 text-xs font-medium text-rose-500">{String(errors.code.message)}</p>}
                  </div>

                  {/* Step 1: Select Vehicle Model */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Loại xe tương thích <span className="text-rose-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                      {...register('vehicleModelId')}
                      onChange={(e) => handleVehicleModelChange(e.target.value)}
                    >
                      <option value="">--- Chọn loại xe trước ---</option>
                      {displayModelsList.map((m) => (
                        <option key={m.id} value={m.id}>
                          VinFast {m.name}
                        </option>
                      ))}
                    </select>
                    {errors.vehicleModelId?.message && <p className="mt-1 text-xs font-medium text-rose-500">{String(errors.vehicleModelId.message)}</p>}
                  </div>

                  {/* Step 2: Select Battery Type */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Loại pin tương ứng với dòng xe <span className="text-rose-500">*</span>
                    </label>
                    <select
                      disabled={!selectedVehicleModelId}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      {...register('batteryTypeId')}
                    >
                      <option value="">
                        {!selectedVehicleModelId
                          ? '--- Vui lòng chọn loại xe trước ---'
                          : availableBatteryTypes.length === 0
                          ? '--- Chọn loại pin ---'
                          : '--- Chọn loại pin ---'}
                      </option>
                      {availableBatteryTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code}
                        </option>
                      ))}
                      {/* Fallback to expected battery codes if not in DB list */}
                      {availableBatteryTypes.length === 0 &&
                        expectedCodes.map((code) => (
                          <option key={code} value={code}>
                            {code} (Tự động nhận diện)
                          </option>
                        ))}
                    </select>
                    {errors.batteryTypeId?.message && <p className="mt-1 text-xs font-medium text-rose-500">{String(errors.batteryTypeId.message)}</p>}
                  </div>

                  {/* Manufacturer: Fixed VinES */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Nhà sản xuất
                    </label>
                    <input
                      type="text"
                      disabled
                      value="VinES"
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Current SOC (0-100%) */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Mức pin hiện tại (SOC 0 - 100%) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Nhập mức sạc từ 0 đến 100"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-3.5 pr-12 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        {...register('soc')}
                        onKeyDown={(e) => {
                          if (['-', 'e', 'E', '+', '.', ','].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onInput={(e) => {
                          const inputVal = e.currentTarget.value;
                          if (!inputVal) return;
                          const num = Number(inputVal);
                          if (num > 100) {
                            const trimmed = inputVal.slice(0, -1);
                            const trimmedNum = Number(trimmed);
                            if (trimmed && !isNaN(trimmedNum) && trimmedNum <= 100) {
                              e.currentTarget.value = trimmed;
                              setValue('soc', trimmedNum, { shouldValidate: true });
                            } else {
                              e.currentTarget.value = '';
                              setValue('soc', '', { shouldValidate: true });
                            }
                          } else if (num < 0) {
                            e.currentTarget.value = '0';
                            setValue('soc', 0, { shouldValidate: true });
                          }
                        }}
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                    {errors.soc?.message && <p className="mt-1 text-xs font-medium text-rose-500">{String(errors.soc.message)}</p>}
                  </div>

                  {/* Manufactured & Received Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                        Ngày sản xuất <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        max={todayStr}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        {...register('manufacturedAt')}
                      />
                      {errors.manufacturedAt?.message && <p className="mt-1 text-xs font-medium text-rose-500">{String(errors.manufacturedAt.message)}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                        Ngày nhập kho <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        max={todayStr}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        {...register('receivedAt')}
                      />
                      {errors.receivedAt?.message && <p className="mt-1 text-xs font-medium text-rose-500">{String(errors.receivedAt.message)}</p>}
                    </div>
                  </div>

                  {/* Station: Fixed Read-only */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Trạm lưu trữ (Cố định tại trạm hiện tại)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentStation ? `${currentStation.name} (${currentStation.code})` : 'Trạm hiện tại'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 cursor-not-allowed"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Ghi chú thêm
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Nhập ghi chú thêm nếu có..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      {...register('note')}
                    />
                  </div>
                </form>

                {/* Right Side: Generated QR Code Card matching Image 1 */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-200 mb-4">
                    <QrCode className="h-4 w-4 text-emerald-600" />
                    <span>Mã QR pin chụp hình tự động</span>
                  </div>

                  {/* QR Code Container */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-md inline-block">
                    <QRCodeSVG
                      value={currentCode}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  {/* Battery Code label */}
                  <div className="mt-4">
                    <p className="font-mono font-black text-lg tracking-wider text-slate-900 dark:text-white">
                      {currentCode}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl">
            <Button variant="secondary" onClick={handleModalClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="add-battery-form"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting || loadingData}
            >
              Thêm pin mới
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 font-bold text-lg mb-2">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <span>Xác nhận nhập kho pin</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 my-4">
              Bạn có chắc muốn thêm pin mới với mã <strong className="font-mono">{pendingData?.code}</strong> này vào kho của trạm?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button variant="primary" loading={isSubmitting} onClick={handleConfirmSubmit}>
                Xác nhận thêm
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
