'use client'

import {
  Banknote,
  Receipt,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Activity,
} from 'lucide-react'
import Link from 'next/link'

export default function DefaultDashboard() {
  const metrics = [
    {
      title: 'Total Revenue (MTD)',
      value: '₹ 1,45,230',
      change: '+12.5%',
      trend: 'up',
      icon: TrendingUp,
      color: 'bg-indigo-500/10 text-indigo-600',
    },
    {
      title: 'Outstanding Dues',
      value: '₹ 32,500',
      change: '-5.2%',
      trend: 'up', // Less dues is better
      icon: Banknote,
      color: 'bg-amber-500/10 text-amber-600',
    },
    {
      title: 'Invoices Generated',
      value: '84',
      change: '+12',
      trend: 'up',
      icon: Receipt,
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      title: 'Active Clients',
      value: '45',
      change: '+3 new',
      trend: 'up',
      icon: Users,
      color: 'bg-emerald-500/10 text-emerald-600',
    },
  ]

  const recentInvoices = [
    { id: 'INV-2026-084', client: 'Acme Corp', amount: '₹ 12,500', status: 'Paid', date: 'Today' },
    { id: 'INV-2026-083', client: 'Global Industries', amount: '₹ 45,000', status: 'Pending', date: 'Yesterday' },
    { id: 'INV-2026-082', client: 'Tech Solutions Ltd', amount: '₹ 8,200', status: 'Overdue', date: '12 Sep' },
    { id: 'INV-2026-081', client: 'Nexus Enterprises', amount: '₹ 15,000', status: 'Paid', date: '10 Sep' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Overview</h1>
          <p className="text-sm text-gray-500">Monitor your cashflow, outstanding invoices, and client activity.</p>
        </div>
        <Link
          href="/sales/invoices/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 shadow-sm transition-colors"
        >
          + Create Invoice
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
                      : 'bg-gray-100 text-gray-600'
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
        {/* Revenue Trend Chart (Placeholder) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" /> Revenue & Cashflow
            </h3>
            <select className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none">
              <option>Last 30 Days</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="h-64 w-full bg-gray-50/50 rounded-xl flex items-end px-4 gap-2 pt-10 pb-2 relative">
            {/* Mock Chart Bars */}
            {[40, 30, 45, 60, 50, 70, 85, 65, 80, 95, 85, 100].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center group">
                <div
                  className="w-full max-w-[32px] bg-indigo-200 group-hover:bg-indigo-600 rounded-t-sm transition-all relative"
                  style={{ height: `${height}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded font-medium transition-opacity">
                    ₹{height * 1000}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 mt-2">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" /> Recent Invoices
            </h3>
          </div>
          <div className="space-y-3">
            {recentInvoices.map((inv, idx) => (
              <div key={idx} className="flex flex-col p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">{inv.client}</p>
                  <p className="text-sm font-bold text-gray-900">{inv.amount}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 font-mono">{inv.id}</span>
                    <span className="text-[10px] text-gray-400">• {inv.date}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                    inv.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/sales/invoices" className="block text-center text-xs font-semibold text-indigo-600 mt-4 hover:text-indigo-500">
            View All Invoices →
          </Link>
        </div>
      </div>
    </div>
  )
}
