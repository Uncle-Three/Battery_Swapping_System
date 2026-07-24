import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ headers, children }) => {
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className={`px-6 py-3 font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider ${header === 'Hành động' || header === 'Thao tác' ? 'text-right' : ''}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
          {children}
        </tbody>
      </table>
    </div>
  );
};
