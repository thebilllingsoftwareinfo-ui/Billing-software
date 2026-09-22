'use client'

import {
  Pill,
  AlertTriangle,
  Stethoscope,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

export default function PharmacyDashboard() {
  const metrics = [
    {
      title: 'Prescription Sales',
      value: '₹ 22,450',
      change: '+14%',
      trend: 'up',
      icon: Stethoscope,
      color: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      title: 'OTC Sales (General)',
      value: '₹ 15,300',
      change: '+5%',
      trend: 'up',
      icon: Pill,
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      title: 'Expiring Soon (< 30d)',
      value: '24 Items',
      change: 'Needs Review',
      trend: 'neutral',
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-600',
    },
    {
      title: 'Out of Stock',
      value: '8 Items',
      change: 'Urgent Restock',
      trend: 'down',
      icon: AlertTriangle,
      color: 'bg-rose-500/10 text-rose-600',
    },
  ]

  const expiringItems = [
    { name: 'Amoxicillin 500mg', batch: 'B-29301', expiry: '12 Nov 2026', qty: 140, status: 'Warning' },
    { name: 'Paracetamol Syrup', batch: 'B-84729', expiry: '05 Nov 2026', qty: 45, status: 'Warning' },
    { name: 'Cough Drops (Honey)', batch: 'C-11234', expiry: '28 Oct 2026', qty: 12, status: 'Critical' },
    { name: 'Vitamin C Tablets', batch: 'V-99821', expiry: '15 Oct 2026', qty: 5, status: 'Critical' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy & Medical Overview</h1>
          <p className="text-sm text-gray-500">Track prescriptions, OTC sales, and crucial expiry alerts.</p>
        </div>
        <Link
          href="/sales/invoices/new"
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 shadow-sm transition-colors"
        >
          + New Medical Bill
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon
          return (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${metric.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
                    metric.trend === 'up'
                      ? 'bg-emerald-50 text-emerald-700'
                      : metric.trend === 'down'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {metric.trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
                  {metric.trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
                  {metric.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">{metric.title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</h3>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Breakdown (Placeholder) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" /> Hourly Sales (Rx vs OTC)
            </h3>
            <select className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none">
              <option>Today</option>
              <option>Yesterday</option>
            </select>
          </div>
          <div className="h-64 w-full bg-gray-50/50 rounded-xl flex items-end px-4 gap-2 pt-10 pb-2 relative">
            {/* Mock Chart Bars - Stacked */}
            {[
              { rx: 30, otc: 20 }, { rx: 40, otc: 15 }, { rx: 50, otc: 30 }, 
              { rx: 60, otc: 25 }, { rx: 80, otc: 40 }, { rx: 40, otc: 10 }, 
              { rx: 90, otc: 20 }, { rx: 70, otc: 35 }, { rx: 50, otc: 20 }, 
              { rx: 65, otc: 30 }, { rx: 85, otc: 15 }, { rx: 70, otc: 45 }
            ].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center group">
                <div className="w-full max-w-[24px] h-full flex flex-col justify-end">
                  {/* RX bar */}
                  <div
                    className="w-full bg-emerald-400 group-hover:bg-emerald-500 rounded-t-sm transition-all"
                    style={{ height: `${height.rx}%` }}
                  />
                  {/* OTC bar */}
                  <div
                    className="w-full bg-blue-300 group-hover:bg-blue-400 rounded-b-sm transition-all"
                    style={{ height: `${height.otc}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-2">{i + 9}h</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-emerald-400" /> Prescriptions (Rx)
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-blue-300" /> Over-The-Counter (OTC)
            </div>
          </div>
        </div>

        {/* Expiry Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" /> Expiry Alerts
            </h3>
          </div>
          <div className="space-y-4">
            {expiringItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Batch: {item.batch} • Qty: {item.qty}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${item.status === 'Critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {item.expiry}
                  </p>
                  <p className={`text-[10px] font-medium mt-1 ${item.status === 'Critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {item.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/inventory" className="block text-center text-xs font-semibold text-indigo-600 mt-4 hover:text-indigo-500">
            View Expiring Stock →
          </Link>
        </div>
      </div>
    </div>
  )
}
