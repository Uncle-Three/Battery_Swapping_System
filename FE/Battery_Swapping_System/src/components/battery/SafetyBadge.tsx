import type { SafetyState } from '../../services/memberService';

export const SafetyBadge = ({ state }: { state: SafetyState }) => {
  const isSafe = state !== 'UNSAFE';
  
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${
      isSafe 
        ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
        : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
    }`}>
      {isSafe ? 'An toàn' : 'Yêu cầu thay'}
    </span>
  );
};
