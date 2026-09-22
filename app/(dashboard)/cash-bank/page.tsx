'use client'

import React, { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  MoreVertical,
  ChevronDown,
  Share2,
  Filter,
  X,
  ArrowUpDown,
  CornerUpRight,
  Calendar,
  Info,
  QrCode,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/helpers'

// Interfaces
interface BankAccount {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  ifsc: string
  upiId: string
  balance: number
  accountType: 'Current' | 'Savings' | 'Overdraft'
  isDefault: boolean
}

interface BankTransaction {
  id: string
  type: string
  name: string
  date: string
  amount: number
}

// Initial Data
const INITIAL_BANKS: BankAccount[] = [
  {
    id: 'bank-1',
    bankName: 'State Bank of India',
    accountName: 'rahul',
    accountNumber: '50200098765432',
    ifsc: 'SBIN0001234',
    upiId: 'rahul.bca1922@oksbi',
    balance: 1200.0,
    accountType: 'Current',
    isDefault: true,
  },
]

const INITIAL_TRANSACTIONS: Record<string, BankTransaction[]> = {
  'bank-1': [
    { id: 'tx-1', type: 'Sale', name: 'abhi', date: '20/09/2026', amount: 0.0 },
    { id: 'tx-2', type: 'Sale', name: 'abhi', date: '20/09/2026', amount: 800.0 },
    { id: 'tx-3', type: 'Sale', name: 'abhi', date: '20/09/2026', amount: 400.0 },
  ],
}

export default function CashAndBankPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(INITIAL_BANKS)
  const [transactions, setTransactions] = useState<Record<string, BankTransaction[]>>(INITIAL_TRANSACTIONS)
  
  const [selectedBankId, setSelectedBankId] = useState<string>(INITIAL_BANKS[0].id)
  const [accountSearchQuery, setAccountSearchQuery] = useState('')
  
  // Modals state
  const [isAddBankMode, setIsAddBankMode] = useState(false)
  const [newBankName, setNewBankName] = useState('')
  const [newAccountNum, setNewAccountNum] = useState('')
  const [newIfsc, setNewIfsc] = useState('')
  const [newUpi, setNewUpi] = useState('')
  const [newOpeningBal, setNewOpeningBal] = useState<number | ''>('')
  
  // Selected Bank & Transactions
  const selectedBank = useMemo(() => bankAccounts.find(b => b.id === selectedBankId), [bankAccounts, selectedBankId])
  const selectedTransactions = useMemo(() => transactions[selectedBankId] || [], [transactions, selectedBankId])
  
  const filteredBanks = useMemo(() => {
    return bankAccounts.filter(b => 
      b.accountName.toLowerCase().includes(accountSearchQuery.toLowerCase()) || 
      b.balance.toString().includes(accountSearchQuery)
    )
  }, [bankAccounts, accountSearchQuery])
  
  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBankName.trim() || !newAccountNum.trim()) {
      toast.error('Bank name and account number are required')
      return
    }

    const newAcc: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: newBankName,
      accountName: newBankName,
      accountNumber: newAccountNum,
      ifsc: newIfsc.toUpperCase(),
      upiId: newUpi || `${newAccountNum.slice(-4)}@upi`,
      balance: newOpeningBal ? Number(newOpeningBal) : 0,
      accountType: 'Current',
      isDefault: false,
    }

    setBankAccounts((prev) => [...prev, newAcc])
    toast.success(`${newBankName} account added successfully!`)
    setIsAddBankMode(false)
    setNewBankName('')
    setNewAccountNum('')
    setNewIfsc('')
    setNewUpi('')
    setNewOpeningBal('')
  }
  
  if (isAddBankMode) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] -m-6 bg-white overflow-y-auto select-none">
        {/* Top Header */}
        <div className="flex items-center px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h1 className="text-xl font-bold text-[#232f3e]">Add Bank Account</h1>
        </div>
        
        {/* Form Content */}
        <div className="p-6 max-w-[1200px] w-full flex-1">
          <form className="space-y-5" onSubmit={handleAddBank}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                  Account Display Name <span className="text-red-500">*</span>
                </label>
                <input type="text" placeholder="Enter Account Display Name" required className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                  Opening Balance
                </label>
                <input type="number" placeholder="Enter Opening Balance" className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500" value={newOpeningBal} onChange={(e) => setNewOpeningBal(e.target.value ? Number(e.target.value) : '')} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                  As of Date
                </label>
                <div className="relative">
                  <input type="text" defaultValue="18/09/2026" className="w-full pl-3 pr-10 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500" />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                </div>
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                  Account Number
                </label>
                <input type="text" placeholder="Enter Account Number" required className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500" value={newAccountNum} onChange={(e) => setNewAccountNum(e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                  IFSC Code
                </label>
                <div className="relative">
                  <input type="text" placeholder="Enter IFSC" className="w-full pl-3 pr-10 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500" value={newIfsc} onChange={(e) => setNewIfsc(e.target.value)} />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                  UPI ID for QR Code
                </label>
                <input type="text" placeholder="Enter UPI ID" className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500" value={newUpi} onChange={(e) => setNewUpi(e.target.value)} />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                  Bank Name
                </label>
                <input type="text" placeholder="Enter Bank Name" className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                  Account Holder Name
                </label>
                <input type="text" placeholder="Enter Account Holder Name" className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            
            <div className="space-y-3 mt-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                <span className="text-[13px] text-gray-700">Print offline UPI QR on Invoices (Only UPI, No automatic reconciliation)</span>
                <Info className="h-4 w-4 text-gray-400" />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                <span className="text-[13px] text-gray-700">Print Bank Details on Invoices</span>
                <Info className="h-4 w-4 text-gray-400" />
              </label>
            </div>
            
            <div className="mt-6 bg-[#f8f9fa] border border-gray-100 rounded-xl p-4">
              <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                <span className="text-[13px] text-gray-700">Accept Payments Online</span>
                <Info className="h-4 w-4 text-gray-400" />
              </label>
              <div className="flex items-start gap-2 text-[13px] text-gray-500 ml-6">
                <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <p>Accept UPI, debit cards, credit cards, and net banking to boost revenue and reconcile incoming payments with invoices directly</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* PhonePe */}
              <div className="bg-[#eef8ff] p-4 rounded-xl flex justify-between items-end border border-transparent hover:border-blue-100 transition-colors cursor-pointer group">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">PhonePe SQR</h4>
                  <p className="text-[12px] text-gray-500 mt-0.5 mb-4">Scan, pay, auto-reconcile</p>
                  <button type="button" className="text-[13px] font-medium text-blue-600 flex items-center gap-1 group-hover:text-blue-700 transition-colors">Link PhonePe QR &gt;</button>
                </div>
                <div className="w-12 h-12 bg-white rounded border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden p-1">
                  <div className="w-full h-full relative">
                    <QrCode className="w-full h-full text-black" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-purple-700 text-white text-[5px] font-bold px-1 rounded-sm">PhonePe</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* EDC */}
              <div className="bg-[#eef8ff] p-4 rounded-xl flex justify-between items-end border border-transparent hover:border-blue-100 transition-colors cursor-pointer group">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Card Machine (EDC)</h4>
                  <p className="text-[12px] text-gray-500 mt-0.5 mb-4">Card payments at your counter</p>
                  <button type="button" className="text-[13px] font-medium text-blue-600 flex items-center gap-1 group-hover:text-blue-700 transition-colors">Add Card Machine &gt;</button>
                </div>
                <div className="w-10 h-14 bg-[#2b2b2b] rounded-md flex flex-col justify-end items-center pb-1 relative overflow-hidden shadow-sm shadow-gray-400 border border-gray-300">
                   <div className="absolute top-1 left-1 right-1 h-6 bg-gradient-to-b from-blue-400 to-blue-500 rounded-[2px]"></div>
                   <div className="absolute top-8 grid grid-cols-3 gap-0.5 w-7">
                     {[...Array(9)].map((_, i) => <div key={i} className="w-2 h-1 bg-gray-500 rounded-full"></div>)}
                   </div>
                   <div className="w-6 h-1 bg-[#1eb53a] rounded-full mt-auto mb-0.5"></div>
                </div>
              </div>
              
              {/* Razorpay */}
              <div className="bg-[#eef8ff] p-4 rounded-xl flex justify-between items-end border border-transparent hover:border-blue-100 transition-colors cursor-pointer group">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Payment Gateway (Razorpay)</h4>
                  <p className="text-[12px] text-gray-500 mt-0.5 mb-4">Collect payments online & via links</p>
                  <button type="button" className="text-[13px] font-medium text-blue-600 flex items-center gap-1 group-hover:text-blue-700 transition-colors">Add Payment Gateway &gt;</button>
                </div>
                <div className="bg-white p-2 rounded border border-gray-200 shadow-sm flex items-center justify-center w-[72px] h-11">
                   <div className="flex flex-col items-center">
                     <svg viewBox="0 0 460 460" className="w-4 h-4 mb-0.5 text-[#0A2665]" fill="currentColor"><path d="M229.418,172.955l-33.864,153.292l97.359-223.111l41.693,17.414c11.393,4.606,16.897,17.72,12.291,29.112L249.53,391.802 c-4.606,11.393-17.72,16.897-29.112,12.291l-18.497-7.485c-11.393-4.606-16.897-17.72-12.291-29.112l104.97-248.16l-33.473-13.945 L135.253,391.802c-4.606,11.393-17.72,16.897-29.112,12.291l-41.693-17.414L229.418,172.955z"/></svg>
                     <span className="text-[9px] font-bold text-[#0A2665] tracking-tighter italic">Razorpay</span>
                   </div>
                </div>
              </div>
            </div>
            
            {/* Hidden Submit Button just in case */}
            <button type="submit" className="hidden">Submit</button>
          </form>
        </div>
        
        {/* Bottom Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white mt-auto sticky bottom-0 w-full z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <button onClick={() => setIsAddBankMode(false)} className="px-5 py-2 text-[13px] font-medium text-gray-700 bg-[#f8f9fa] hover:bg-gray-200 rounded-full transition-colors">
            Cancel
          </button>
          <button onClick={handleAddBank} className="px-5 py-2 text-[13px] font-bold text-white bg-[#ef4444] hover:bg-red-600 rounded-full shadow-sm transition-colors">
            Save Details
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6 bg-white overflow-hidden select-none text-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <h1 className="text-[22px] font-bold text-gray-800">Banks</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddBankMode(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-[#ef4444] hover:bg-red-600 text-white text-[13px] font-medium rounded-full transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" /> Add Bank
          </button>
          <div className="relative flex items-center justify-center p-1.5 text-gray-500 hover:text-gray-700 cursor-pointer">
            <MoreVertical className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#ef4444] rounded-full"></span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Bank Accounts List */}
        <div className="w-[320px] flex flex-col border-r border-gray-200 bg-white flex-shrink-0">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Account/Amount"
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gray-300"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="flex items-center justify-between px-4 py-2 bg-[#f8f9fa] text-[11px] font-bold uppercase text-gray-500 border-b border-gray-200">
            <div className="flex items-center gap-1.5">
              Account Name <ArrowUpDown className="h-3 w-3 text-blue-500" />
            </div>
            <div>Amount</div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredBanks.map((bank) => (
              <div
                key={bank.id}
                onClick={() => setSelectedBankId(bank.id)}
                className={cn(
                  "flex items-center justify-between px-4 py-3 cursor-pointer border-b border-gray-100",
                  selectedBankId === bank.id ? "bg-[#dbeafe]" : "hover:bg-gray-50"
                )}
              >
                <div>
                  <div className="font-medium text-gray-900">{bank.accountName}</div>
                  <div className="text-xs text-gray-500 mt-1">Online Payment</div>
                </div>
                <div className={cn(
                  "font-medium",
                  bank.balance >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {bank.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Column: Selected Bank Details & Transactions */}
        {selectedBank ? (
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Bank Header Info */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-800">{selectedBank.accountName}</h2>
                    <button className="text-blue-500 hover:text-blue-700 cursor-pointer">
                      <CornerUpRight className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">UPI ID</div>
                    <div className="text-sm text-gray-600 mt-0.5">{selectedBank.upiId}</div>
                  </div>
                </div>
                <div>
                  <div className="inline-flex items-center border border-[#ef4444] text-[#ef4444] rounded-full text-[13px] font-medium transition-colors overflow-hidden">
                    <button className="px-4 py-1.5 hover:bg-red-50 cursor-pointer transition-colors">Deposit / Withdraw</button>
                    <button className="px-2 py-1.5 border-l border-[#ef4444] hover:bg-red-50 cursor-pointer transition-colors">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Transactions Section */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 text-base">Transactions</h3>
                <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <Search className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-6 py-2.5 font-semibold text-gray-500">
                        <div className="flex items-center gap-1.5">
                          Type <Filter className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="px-6 py-2.5 font-semibold text-gray-500">
                        <div className="flex items-center gap-1.5">
                          Name
                        </div>
                      </th>
                      <th className="px-6 py-2.5 font-semibold text-gray-500">
                        <div className="flex items-center gap-1.5 cursor-pointer">
                          Date <ArrowUpDown className="h-3 w-3 text-blue-500" />
                        </div>
                      </th>
                      <th className="px-6 py-2.5 font-semibold text-gray-500 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          Amount <Filter className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="px-6 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransactions.map((tx, idx) => (
                      <tr key={tx.id} className={cn("border-b border-gray-100 hover:bg-gray-50", idx === 0 ? "bg-[#dbeafe]" : "")}>
                        <td className="px-6 py-3.5 text-gray-800">{tx.type}</td>
                        <td className="px-6 py-3.5 text-gray-800">{tx.name}</td>
                        <td className="px-6 py-3.5 text-gray-800">{tx.date}</td>
                        <td className="px-6 py-3.5 text-emerald-500 text-right font-medium">
                          ₹ {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
            Select a bank account to view details
          </div>
        )}
      </div>
    </div>
  )
}
