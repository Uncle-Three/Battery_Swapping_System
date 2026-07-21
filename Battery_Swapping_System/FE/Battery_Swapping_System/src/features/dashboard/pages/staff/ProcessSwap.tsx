import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { swapService, type InspectionInput, type ScannedBatteryInfo, type StaffSwap } from '../../../../services/swapService';
import { getApiErrorMessage } from '../../../../services/apiClient';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { statusLabel } from '../../../../utils/viLabels';

const steps = ['NOT_STARTED', 'VERIFIED', 'OLD_BATTERY_REMOVED', 'OLD_BATTERY_INSPECTED', 'REPLACEMENT_ASSIGNED', 'INSTALLED', 'PAYMENT_PENDING', 'COMPLETED'];

const formatNumber = (value?: number | null) => value === undefined || value === null ? '-' : value.toLocaleString('vi-VN');

export const ProcessSwap = () => {
  const { swapId = '' } = useParams();
  const [swap, setSwap] = useState<StaffSwap | null>(null);
  const [serial, setSerial] = useState('');
  const [soc, setSoc] = useState('');
  const [scanInfo, setScanInfo] = useState<ScannedBatteryInfo | null>(null);
  const [inspection, setInspection] = useState({
    soh: '',
    temperature: '',
    voltage: '',
    physicalCondition: '',
    outcome: 'MAINTENANCE' as InspectionInput['outcome'],
    notes: '',
  });
  const [rollbackReason, setRollbackReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  const load = useCallback(() => swapService.get(swapId).then(setSwap).catch((cause) => setError(getApiErrorMessage(cause))), [swapId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setLoading(true);
    setError('');
    try {
      await action();
      setScanInfo(null);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const scanBattery = async () => {
    if (!serial.trim() || !swap) return;
    setScanLoading(true);
    setError('');
    try {
      const info = await swapService.scanBattery(swap.id, serial.trim());
      setScanInfo(info);
      setSoc(String(info.battery.soc));
      setInspection((current) => ({
        ...current,
        soh: String(info.estimate.estimatedSoh),
        temperature: info.battery.temperature === undefined || info.battery.temperature === null ? current.temperature : String(info.battery.temperature),
        voltage: info.battery.voltage === undefined || info.battery.voltage === null ? current.voltage : String(info.battery.voltage),
      }));
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setScanLoading(false);
    }
  };

  if (!swap && !error) return <LoadingSpinner label="Dang tai quy trinh thay pin..." />;
  if (!swap) return <p role="alert" className="bg-red-50 p-4 text-red-700">{error}</p>;

  const status = swap.workflowStatus;
  const oldSerial = swap.batteryIn?.serialNumber;
  const reservedSerial = swap.booking?.battery?.serialNumber ?? swap.batteryOut?.serialNumber;
  const canScan = ['VERIFIED', 'OLD_BATTERY_REMOVED', 'OLD_BATTERY_INSPECTED', 'REPLACEMENT_ASSIGNED'].includes(status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Quy trinh thay pin</h1>
        <p className="text-slate-500">Ma giao dich {swap.id}; staff quet ma pin truoc khi thao, kiem tra va lap pin.</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}

      <ol className="grid gap-2 md:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step} className={`rounded-lg border p-3 text-xs font-bold ${index <= steps.indexOf(status) ? 'border-green-500 bg-green-50' : 'text-slate-400'}`}>
            {statusLabel(step)}
          </li>
        ))}
      </ol>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-black">Thong tin xac minh</h2>
        <p>{swap.booking?.user.fullName} - {swap.booking?.vehicle?.name} - {swap.booking?.vehicle?.plateNumber}</p>
        <p>Loai pin: <strong>{swap.booking?.vehicle?.batteryType || swap.vehicle?.batteryType || 'Khong ro'}</strong></p>
        <p>Pin dat truoc: <strong>{reservedSerial ?? '-'}</strong></p>
        {swap.booking?.reason && <p>Ghi chu / Yeu cau: <strong className="text-blue-700">{swap.booking.reason}</strong></p>}
        <p>Hanh dong tiep theo: {swap.nextActions?.map(statusLabel).join(', ') || 'Khong co'}</p>
      </section>

      {canScan && (
        <section className="rounded-2xl border bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input label="Quet / nhap ma pin" value={serial} onChange={(event) => setSerial(event.target.value)} />
            <Button variant="secondary" disabled={!serial.trim()} loading={scanLoading} onClick={() => void scanBattery()}>Lay info pin</Button>
          </div>
          {scanInfo && (
            <div className={`mt-4 rounded-lg border p-4 text-sm ${scanInfo.expectedForCurrentStep ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <p className="font-bold">{scanInfo.expectedForCurrentStep ? 'Dung pin cho buoc hien tai' : 'Can kiem tra lai: pin nay khong khop ky vong cua buoc hien tai'}</p>
              <p>Serial: {scanInfo.battery.serialNumber || scanInfo.battery.batteryCode} - SOC {scanInfo.battery.soc}% - SOH hien tai {scanInfo.battery.soh}%</p>
              <p>Uoc tinh SOH: {scanInfo.estimate.estimatedSoh}% tu {formatNumber(scanInfo.estimate.accumulatedMileageKm)} km va {scanInfo.estimate.ageYears} nam su dung.</p>
              <p>Trang thai: {statusLabel(scanInfo.battery.operationalStatus)} - An toan: {statusLabel(scanInfo.battery.safetyState)}</p>
            </div>
          )}
        </section>
      )}

      {status === 'NOT_STARTED' && (
        <Button loading={loading} onClick={() => void run(() => swapService.verify(swap.id))}>Xac minh khach hang, xe va pin</Button>
      )}

      {status === 'VERIFIED' && (
        <section className="rounded-2xl border bg-white p-5">
          <Input label="Muc pin cu (SOC)" type="number" value={soc} onChange={(event) => setSoc(event.target.value)} />
          <Button className="mt-3" disabled={!serial || soc === ''} loading={loading} onClick={() => void run(() => swapService.remove(swap.id, serial, Number(soc)))}>Xac nhan thao pin cu</Button>
        </section>
      )}

      {status === 'OLD_BATTERY_REMOVED' && (
        <section className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2">
          <Input label="Ma pin da thao" value={serial || oldSerial || ''} onChange={(event) => setSerial(event.target.value)} />
          <Input label="Muc pin (SOC)" type="number" value={soc} onChange={(event) => setSoc(event.target.value)} />
          <Input label="Suc khoe pin (SOH)" type="number" value={inspection.soh} onChange={(event) => setInspection({ ...inspection, soh: event.target.value })} />
          <Input label="Nhiet do" type="number" value={inspection.temperature} onChange={(event) => setInspection({ ...inspection, temperature: event.target.value })} />
          <Input label="Dien ap" type="number" value={inspection.voltage} onChange={(event) => setInspection({ ...inspection, voltage: event.target.value })} />
          <Input label="Tinh trang vat ly" value={inspection.physicalCondition} onChange={(event) => setInspection({ ...inspection, physicalCondition: event.target.value })} />
          <label className="text-sm font-semibold">
            Ket luan
            <select aria-label="Ket luan kiem tra" className="mt-1 w-full rounded-lg border p-3" value={inspection.outcome} onChange={(event) => setInspection({ ...inspection, outcome: event.target.value as InspectionInput['outcome'] })}>
              {['AVAILABLE','MAINTENANCE','QUARANTINED','RETIRED'].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
            </select>
          </label>
          <Input label="Ghi chu" value={inspection.notes} onChange={(event) => setInspection({ ...inspection, notes: event.target.value })} />
          <Button disabled={!serial || soc === '' || !inspection.soh || !inspection.physicalCondition} loading={loading} onClick={() => void run(() => swapService.inspect(swap.id, { serialNumber: serial, soc: Number(soc), soh: Number(inspection.soh), temperature: inspection.temperature ? Number(inspection.temperature) : undefined, voltage: inspection.voltage ? Number(inspection.voltage) : undefined, physicalCondition: inspection.physicalCondition, outcome: inspection.outcome, notes: inspection.notes || undefined }))}>Luu bien ban kiem tra</Button>
        </section>
      )}

      {status === 'OLD_BATTERY_INSPECTED' && (
        <section className="rounded-2xl border bg-white p-5">
          <p>Pin an toan da giu: <strong>{reservedSerial}</strong></p>
          <Button className="mt-3" disabled={!serial} loading={loading} onClick={() => void run(() => swapService.assign(swap.id, serial))}>Gan dung pin da giu</Button>
        </section>
      )}

      {status === 'REPLACEMENT_ASSIGNED' && (
        <section className="rounded-2xl border bg-white p-5">
          <Button className="mt-3" disabled={!serial} loading={loading} onClick={() => void run(() => swapService.install(swap.id, serial))}>Xac nhan lap pin thanh cong</Button>
        </section>
      )}

      {status === 'INSTALLED' && (
        <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="font-black">Yeu cau thanh toan truc tiep</h2>
          <p className="mt-2 text-sm text-slate-500">Pin moi da duoc gan vao xe. Tao hoa don va gui thong bao VNPay cho khach hang.</p>
          <Button className="mt-4" loading={loading} onClick={() => void run(() => swapService.requestDirectPayment(swap.id))}>Gui yeu cau thanh toan VNPay</Button>
        </section>
      )}

      {status === 'PAYMENT_PENDING' && <p className="rounded-xl bg-amber-50 p-5 font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Dang cho khach hang thanh toan truc tiep qua VNPay. He thong tu hoan tat sau khi ket qua thanh toan duoc xac minh.</p>}
      {status === 'COMPLETED' && <p className="rounded-xl bg-green-50 p-5 font-bold text-green-700">Thay pin va thanh toan da hoan tat.</p>}

      {!['COMPLETED','ROLLED_BACK'].includes(status) && (
        <section className="rounded-2xl border border-red-200 p-5">
          <Input label="Ly do hoan tac" value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} />
          <Button className="mt-3" variant="danger" disabled={rollbackReason.trim().length < 3} loading={loading} onClick={() => void run(() => swapService.rollback(swap.id, rollbackReason))}>Hoan tac giao dich</Button>
        </section>
      )}
    </div>
  );
};

export default ProcessSwap;
