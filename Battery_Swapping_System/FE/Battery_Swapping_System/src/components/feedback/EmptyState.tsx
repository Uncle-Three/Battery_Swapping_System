import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Không tìm thấy dữ liệu',
  description = 'Hiện tại không có mục nào để hiển thị ở đây.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/20 max-w-lg mx-auto my-6">
      <div className="h-16 w-16 text-gray-400 dark:text-gray-650 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-150 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm shadow-green-100 dark:shadow-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
