import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label = 'Đang tải...',
}) => {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div
        className={`animate-spin rounded-full border-t-green-600 border-r-green-600/30 border-b-green-600/30 border-l-green-600/30 ${sizes[size]}`}
      />
      {label && <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>}
    </div>
  );
};
