'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2, X } from 'lucide-react';
import { MultiTabContainer } from '@/components/common/multi-tab-container';
import { PurchaseBillForm } from '@/components/purchases/purchase-bill-form';

export default function CreatePurchaseBillPage() {
  const router = useRouter();
  const [isFullDesktop, setIsFullDesktop] = useState(true);

  if (isFullDesktop) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f4f6fa] flex flex-col overflow-hidden font-sans">
        {/* Desktop Window Titlebar */}
        <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center justify-between select-none shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-indigo-600 text-white font-bold text-[11px] rounded tracking-wider uppercase">
              Purchase
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-gray-900 tracking-tight">Record Purchase Bill</h1>
              <span className="hidden sm:inline-block text-[11px] text-gray-400 font-medium">
                • Desktop Fullscreen View
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFullDesktop(false)}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
              title="Switch to Standard Dashboard Layout"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-[11px]">Normal View</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/purchases/bills')}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1 cursor-pointer"
              title="Close (Back to Purchases)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Desktop Workspace Canvas with Tabs */}
        <div className="flex-1 overflow-hidden bg-[#f4f6fa] flex flex-col min-h-0">
          <MultiTabContainer 
            baseTitle="Purchase" 
            renderContent={(tabId) => (
              <div className="h-full overflow-y-auto p-4 md:p-6">
                <div className="max-w-[1750px] mx-auto pb-20">
                  <PurchaseBillForm key={`desktop-purchase-${tabId}`} />
                </div>
              </div>
            )} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/purchases/bills"
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Record Purchase Bill</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Record supplier invoices, compute input GST, and increase stock inventory upon finalization.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFullDesktop(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors shadow-2xs"
          title="Switch to Full Desktop View"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Full Desktop View
        </button>
      </div>

      <div className="flex-1 bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden flex flex-col min-h-0">
        <MultiTabContainer 
          baseTitle="Purchase" 
          renderContent={(tabId) => (
            <div className="h-full overflow-y-auto p-4 md:p-6 pb-20">
              <PurchaseBillForm key={`standard-purchase-${tabId}`} />
            </div>
          )} 
        />
      </div>
    </div>
  );
}
