import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { swapService, type StaffSwap } from '../../../../services/swapService';
import { getApiErrorMessage } from '../../../../services/apiClient';
import { LoadingSpinner } from '../../../../components/feedback/LoadingSpinner';
import { statusLabel } from '../../../../utils/viLabels';
export const StaffHistory = () => { const [items, setItems] = useState<StaffSwap[] | null>(null); const [error, setError] = useState(''); useEffect(() => { swapService.history().then(setItems).catch((cause) => setError(getApiErrorMessage(cause))); }, []); if (!items && !error) return <LoadingSpinner label="Đang tải lịch sử nhân viên..." />; return <div className="space-y-5"><h1 className="text-3xl font-black">Lịch sử thay pin tại trạm</h1>{error && <p role="alert" className="bg-red-50 p-4 text-red-700">{error}</p>}<div className="grid gap-3">{items?.map((item) => <Link key={item.id} to={`/staff/swaps/${item.id}`} className="rounded-xl border bg-white p-5"><strong>{item.booking?.vehicle?.name} · {item.booking?.vehicle?.plateNumber}</strong><p>{item.booking?.user.fullName}</p><span className="text-sm font-bold">{statusLabel(item.workflowStatus)}</span></Link>)}</div>{items?.length === 0 && <p>Chưa có giao dịch tại trạm.</p>}</div>; };
