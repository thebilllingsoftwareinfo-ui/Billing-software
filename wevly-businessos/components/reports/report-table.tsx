'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: any) => React.ReactNode;
}

interface ReportTableProps {
  columns: ColumnDef[];
  rows: any[];
  isLoading?: boolean;
  totalCount?: number;
  page?: number;
  limit?: number;
  onPageChange?: (newPage: number) => void;
  summaryRow?: Record<string, any>;
  emptyMessage?: string;
}

export function ReportTable({
  columns,
  rows,
  isLoading,
  totalCount = 0,
  page = 1,
  limit = 20,
  onPageChange,
  summaryRow,
  emptyMessage = 'No report records found for the selected period.',
}: ReportTableProps) {
  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="bg-gray-50 border-b text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-500">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-gray-50/60 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 font-medium text-gray-800 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row) : row[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {/* Grand Totals Footer */}
          {summaryRow && rows.length > 0 && !isLoading && (
            <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900 text-xs">
              <tr>
                {columns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {idx === 0 ? 'GRAND TOTAL' : summaryRow[col.key] ?? ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
          <div>
            Showing <span className="font-semibold text-gray-800">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-semibold text-gray-800">{Math.min(page * limit, totalCount)}</span> of{' '}
            <span className="font-semibold text-gray-800">{totalCount}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange && onPageChange(page - 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium text-gray-700">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange && onPageChange(page + 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
