'use client';

import React from 'react';
import { Calendar, Search, Download, Printer, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportDatePreset } from '@/lib/services/report.service';

interface SubTypeOption {
  value: string;
  label: string;
}

interface ReportFilterBarProps {
  range: ReportDatePreset;
  setRange: (r: ReportDatePreset) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  subType: string;
  setSubType: (st: string) => void;
  subTypeOptions: SubTypeOption[];
  search: string;
  setSearch: (s: string) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  isLoading?: boolean;
}

export function ReportFilterBar({
  range,
  setRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  subType,
  setSubType,
  subTypeOptions,
  search,
  setSearch,
  onExportCSV,
  onExportPDF,
  isLoading,
}: ReportFilterBarProps) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Sub-report selector tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {subTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSubType(opt.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                subType === opt.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Action Buttons: CSV & PDF */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCSV}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportPDF}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            Print / PDF Report
          </Button>
        </div>
      </div>

      {/* Date Range & Search Controls */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t text-xs">
        {/* Preset Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            Range:
          </span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as ReportDatePreset)}
            className="h-8 text-xs border border-gray-300 rounded-md px-2 bg-white font-medium text-gray-800 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Date Pickers */}
        {range === 'custom' && (
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-6 text-xs bg-transparent border-0 focus:ring-0 text-gray-700 font-medium"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-6 text-xs bg-transparent border-0 focus:ring-0 text-gray-700 font-medium"
            />
          </div>
        )}

        {/* Search Input */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search report records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 text-xs pl-8 pr-3 border border-gray-300 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
