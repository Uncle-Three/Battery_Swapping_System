import { useState, useEffect, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../../../components/ui/Button';
import { adminService } from '../../../../../services/adminService';
import { MapPin, Settings, CheckCircle2, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import type { Station } from '../../../../../types';

export const CreateStation: FC = () => {
  const navigate = useNavigate();
  const { stationId } = useParams();
  const isEditMode = !!stationId;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [vehicleModels, setVehicleModels] = useState<any[]>([]);
  const [batteryTypes, setBatteryTypes] = useState<any[]>([]);

  const [formData, setFormData] = useState<Partial<Station>>({
    name: '',
    description: '',
    phone: '',
    email: '',
    status: 'DRAFT',
    country: 'Việt Nam',
    province: '',
    ward: '',
    address: '',
    latitude: 10.7769,
    longitude: 106.7009,
    openingTime: '06:00',
    closingTime: '22:00',
    workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    holidaySupport: true,
    maintenanceDay: '',
    serviceBaysCount: 1,
    maxVehiclesPerSlot: 1,
    defaultSlotDuration: 30,
    allowParallelReplacement: false,
    supportedVehicleModelIds: [],
    supportedBatteryTypeIds: [],
  });

  useEffect(() => {
    adminService.getVehicleModels().then(setVehicleModels).catch(console.error);
    adminService.getBatteryTypes().then(setBatteryTypes).catch(console.error);
    
    if (isEditMode && stationId) {
      setLoading(true);
      adminService.getStations().then(data => {
        const st = data.find(s => s.id === stationId);
        if (st) setFormData({ ...st, country: 'Việt Nam' });
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [isEditMode, stationId]);

  const handleCreate = async (isDraft = false) => {
    try {
      setLoading(true);
      if (isEditMode) {
        const { id, code, createdAt, updatedAt, slots, assignments, ...updateData } = formData as any;
        await adminService.updateStation(stationId as string, {
          ...updateData,
          country: 'Việt Nam',
          supportedVehicleModelIds: vehicleModels.map(v => v.id),
          supportedBatteryTypeIds: batteryTypes.map(b => b.id),
          status: isDraft ? 'DRAFT' : 'ACTIVE',
        } as any);
      } else {
        const generatedCode = 'ST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        await adminService.createStation({
          ...formData,
          country: 'Việt Nam',
          code: generatedCode,
          supportedVehicleModelIds: vehicleModels.map(v => v.id),
          supportedBatteryTypeIds: batteryTypes.map(b => b.id),
          status: isDraft ? 'DRAFT' : 'ACTIVE',
        } as any);
      }
      navigate('/admin/stations');
    } catch (error: any) {
      console.error('Failed to create station', error);
      alert(error?.response?.data?.message || 'Lỗi tạo trạm đổi pin');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { icon: Info, label: 'Thông tin chung' },
    { icon: MapPin, label: 'Vị trí & Hoạt động' },
    { icon: Settings, label: 'Dịch vụ' },
    { icon: CheckCircle2, label: 'Xác nhận' },
  ];

  const updateField = (field: keyof Station, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isPhoneValid = /^0\d{0,9}$/.test(formData.phone || '');
  const isEmailValid = !!formData.email && formData.email.endsWith('@gmail.com');
  const isStep1Valid = !!formData.name && isPhoneValid && isEmailValid;
  const isStep2Valid = !!formData.province && !!formData.ward && !!formData.address && !!formData.openingTime && !!formData.closingTime && formData.openingTime < formData.closingTime;
  const isStep3Valid = (formData.serviceBaysCount ?? 0) >= 1 && (formData.defaultSlotDuration ?? 0) >= 1;

  const hoursOptions = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const workingDays = [
    ['MON', 'Thứ 2'], ['TUE', 'Thứ 3'], ['WED', 'Thứ 4'], ['THU', 'Thứ 5'],
    ['FRI', 'Thứ 6'], ['SAT', 'Thứ 7'], ['SUN', 'Chủ nhật'],
  ];
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800';

  if (loading && isEditMode && !formData.name) {
    return <div className="p-12 text-center font-semibold text-slate-500">Đang tải thông tin trạm...</div>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <button onClick={() => navigate('/admin/stations')} className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-600"><ChevronLeft className="h-4 w-4" /> Quay lại danh sách</button>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{isEditMode ? 'Chỉnh sửa Trạm Đổi Pin' : 'Tạo Trạm Đổi Pin Mới'}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Thiết lập thông tin vận hành cơ bản cho trạm.</p>
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {steps.map((item, index) => {
          const number = index + 1;
          const Icon = item.icon;
          return <div key={item.label} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${step === number ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' : step > number ? 'text-emerald-600' : 'text-slate-400'}`}><span className={`grid h-8 w-8 place-items-center rounded-lg ${step >= number ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{step > number ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span className="hidden text-xs font-bold sm:block">{item.label}</span></div>;
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {step === 1 && <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold">Tên trạm *<input className={`${inputClass} mt-2`} value={formData.name || ''} onChange={e => updateField('name', e.target.value)} /></label>
          <label className="text-sm font-bold">Trạng thái<select className={`${inputClass} mt-2`} value={formData.status} onChange={e => updateField('status', e.target.value)}><option value="DRAFT">Bản nháp</option><option value="ACTIVE">Hoạt động</option></select></label>
          <label className="text-sm font-bold">Số điện thoại *<input type="tel" inputMode="numeric" maxLength={10} className={`${inputClass} mt-2`} value={formData.phone || ''} onChange={e => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /><span className={`mt-1 block text-xs ${formData.phone && !isPhoneValid ? 'text-red-500' : 'text-slate-400'}`}>Bắt buộc bắt đầu bằng số 0 và tối đa 10 chữ số.</span></label>
          <label className="text-sm font-bold">Email *<input className={`${inputClass} mt-2`} type="email" value={formData.email || ''} onChange={e => updateField('email', e.target.value)} /><span className={`mt-1 block text-xs ${formData.email && !isEmailValid ? 'text-red-500' : 'text-slate-400'}`}>Sử dụng địa chỉ @gmail.com.</span></label>
          <label className="text-sm font-bold md:col-span-2">Mô tả<textarea rows={4} className={`${inputClass} mt-2`} value={formData.description || ''} onChange={e => updateField('description', e.target.value)} /></label>
        </div>}

        {step === 2 && <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold">Quốc gia<input className={`${inputClass} mt-2 cursor-not-allowed bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`} value="Việt Nam" readOnly aria-readonly="true" /></label>
          <label className="text-sm font-bold">Tỉnh/Thành phố *<input className={`${inputClass} mt-2`} value={formData.province || ''} onChange={e => updateField('province', e.target.value)} /></label>
          <label className="text-sm font-bold">Phường/Xã *<input className={`${inputClass} mt-2`} value={formData.ward || ''} onChange={e => updateField('ward', e.target.value)} /></label>
          <label className="text-sm font-bold">Địa chỉ *<input className={`${inputClass} mt-2`} value={formData.address || ''} onChange={e => updateField('address', e.target.value)} /></label>
          <label className="text-sm font-bold">Giờ mở cửa *<select className={`${inputClass} mt-2`} value={formData.openingTime || ''} onChange={e => updateField('openingTime', e.target.value)}>{hoursOptions.map(hour => <option key={hour}>{hour}</option>)}</select></label>
          <label className="text-sm font-bold">Giờ đóng cửa *<select className={`${inputClass} mt-2`} value={formData.closingTime || ''} onChange={e => updateField('closingTime', e.target.value)}>{hoursOptions.map(hour => <option key={hour}>{hour}</option>)}</select></label>
          <div className="md:col-span-2"><p className="mb-2 text-sm font-bold">Ngày làm việc</p><div className="flex flex-wrap gap-2">{workingDays.map(([value, label]) => <button type="button" key={value} onClick={() => { const days = formData.workingDays || []; updateField('workingDays', days.includes(value) ? days.filter(day => day !== value) : [...days, value]); }} className={`rounded-lg border px-3 py-2 text-xs font-bold ${formData.workingDays?.includes(value) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>{label}</button>)}</div></div>
          <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={!!formData.holidaySupport} onChange={e => updateField('holidaySupport', e.target.checked)} /> Hỗ trợ ngày lễ</label>
        </div>}

        {step === 3 && <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold">Số khoang thay pin *<input type="number" min={1} className={`${inputClass} mt-2`} value={formData.serviceBaysCount || 1} onChange={e => updateField('serviceBaysCount', Number(e.target.value))} /></label>
          <label className="text-sm font-bold">Thời lượng mặc định<select className={`${inputClass} mt-2`} value={formData.defaultSlotDuration || 30} onChange={e => updateField('defaultSlotDuration', Number(e.target.value))}>{[15, 30, 45, 60].map(value => <option key={value} value={value}>{value} phút</option>)}</select></label>
        </div>}

        {step === 4 && <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 p-5 dark:bg-emerald-950/20">
            <h2 className="font-extrabold text-emerald-800 dark:text-emerald-300">Xác nhận cấu hình trạm</h2>
            <p className="mt-2 text-sm font-semibold text-emerald-700">Kiểm tra toàn bộ thông tin trước khi lưu bản nháp hoặc kích hoạt.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
              <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-600">Thông tin chung</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div><dt className="font-semibold text-slate-500">Tên trạm</dt><dd className="mt-1 font-extrabold">{formData.name || '—'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Trạng thái đã chọn</dt><dd className="mt-1 font-bold">{formData.status === 'ACTIVE' ? 'Hoạt động' : 'Bản nháp'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Số điện thoại</dt><dd className="mt-1 font-bold">{formData.phone || '—'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Email</dt><dd className="mt-1 break-all font-bold">{formData.email || '—'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Mô tả</dt><dd className="mt-1 whitespace-pre-wrap font-medium text-slate-700 dark:text-slate-300">{formData.description || 'Chưa có mô tả'}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
              <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-600">Vị trí</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div><dt className="font-semibold text-slate-500">Quốc gia</dt><dd className="mt-1 font-bold">{formData.country || '—'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Tỉnh/Thành phố</dt><dd className="mt-1 font-bold">{formData.province || '—'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Phường/Xã</dt><dd className="mt-1 font-bold">{formData.ward || '—'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Địa chỉ</dt><dd className="mt-1 font-bold">{formData.address || '—'}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
              <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-600">Lịch hoạt động</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div><dt className="font-semibold text-slate-500">Giờ mở cửa</dt><dd className="mt-1 font-bold">{formData.openingTime || '—'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Giờ đóng cửa</dt><dd className="mt-1 font-bold">{formData.closingTime || '—'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Ngày làm việc</dt><dd className="mt-1 font-bold">{workingDays.filter(([value]) => formData.workingDays?.includes(value)).map(([, label]) => label).join(', ') || '—'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Hỗ trợ ngày lễ</dt><dd className="mt-1 font-bold">{formData.holidaySupport ? 'Có' : 'Không'}</dd></div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
              <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-600">Cấu hình dịch vụ</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div><dt className="font-semibold text-slate-500">Số khoang thay pin</dt><dd className="mt-1 font-bold">{formData.serviceBaysCount || '—'} khoang</dd></div>
                <div><dt className="font-semibold text-slate-500">Thời lượng mặc định</dt><dd className="mt-1 font-bold">{formData.defaultSlotDuration || '—'} phút</dd></div>
              </dl>
            </div>
          </div>
        </div>}

        <div className="mt-8 flex justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
          <Button variant="outline" onClick={() => step === 1 ? navigate('/admin/stations') : setStep(step - 1)}><ChevronLeft className="h-4 w-4" />{step === 1 ? 'Hủy' : 'Quay lại'}</Button>
          {step < 4 ? <Button disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid)} onClick={() => setStep(step + 1)}>Tiếp tục<ChevronRight className="h-4 w-4" /></Button> : <div className="flex gap-3"><Button variant="outline" loading={loading} onClick={() => handleCreate(true)}>Lưu nháp</Button><Button loading={loading} onClick={() => handleCreate(false)}>{isEditMode ? 'Lưu & Kích hoạt' : 'Kích hoạt trạm'}</Button></div>}
        </div>
      </div>
    </div>
  );
};

export default CreateStation;
