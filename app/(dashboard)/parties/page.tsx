'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Plus,
  Edit2,
  Phone,
  MessageCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  Settings,
  MoreVertical,
  ChevronDown,
  Filter,
  ArrowUpDown,
  BookOpen,
  Sparkles,
  Users,
  FileText,
  ShoppingCart,
  DollarSign,
  Download,
  Trash2,
  Eye,
  Share2,
} from 'lucide-react'
import { toast } from 'sonner'
import { RowActionsMenu } from '@/components/common/row-actions-menu'
import { AddPartyModal, type PartyData } from '@/components/parties/add-party-modal'
import {
  PartyTransactionMenu,
  type PartyTransaction,
  type TransactionActionType,
} from '@/components/parties/party-transaction-menu'
import { TransactionActionModals } from '@/components/parties/transaction-modals'
import { WhatsAppConnectView } from '@/components/parties/whatsapp-connect-view'
import { VaniraNetworkView } from '@/components/parties/vanira-network-view'

export interface ExtendedParty extends PartyData {
  id: string
  transactions: PartyTransaction[]
}

const INITIAL_PARTIES: ExtendedParty[] = [
  {
    id: 'p-asdf',
    name: 'asdf',
    partyType: 'customer',
    phone: '7360815930',
    gstin: '',
    email: '',
    gstType: 'Unregistered/Consumer',
    state: 'Maharashtra',
    billingAddress: '',
    openingBalance: 0,
    balanceType: 'receive',
    transactions: [
      {
        id: 'tx-1',
        type: 'Sale',
        number: '1',
        date: '20/09/2026',
        total: 1000,
        balance: 0,
        status: 'paid',
      },
      {
        id: 'tx-2',
        type: 'Sale',
        number: '2',
        date: '20/09/2026',
        total: 500,
        balance: 500,
        status: 'active',
      },
      {
        id: 'tx-3',
        type: 'Sale',
        number: '3',
        date: '20/09/2026',
        total: 1000,
        balance: 0,
        status: 'paid',
      },
    ],
  },
  {
    id: 'p-sunil',
    name: 'Sunil Enterprises',
    partyType: 'customer',
    phone: '9820198201',
    gstin: '27AABCS1429B1Z8',
    email: 'sunil@enterprises.in',
    gstType: 'Registered Regular',
    state: 'Maharashtra',
    billingAddress: '42, Lamington Road, Mumbai',
    openingBalance: 12000,
    balanceType: 'receive',
    transactions: [
      {
        id: 'tx-s1',
        type: 'Sale',
        number: '4',
        date: '19/09/2026',
        total: 12000,
        balance: 12000,
        status: 'active',
      },
    ],
  },
  {
    id: 'p-pooja',
    name: 'Pooja Jewellers & Gems',
    partyType: 'customer',
    phone: '9819098190',
    gstin: '27AADCP8812A1ZX',
    email: 'pooja@jewels.com',
    gstType: 'Registered Regular',
    state: 'Maharashtra',
    billingAddress: 'Zaveri Bazaar, Mumbai',
    openingBalance: 4500,
    balanceType: 'receive',
    transactions: [
      {
        id: 'tx-p1',
        type: 'Sale',
        number: '5',
        date: '18/09/2026',
        total: 4500,
        balance: 4500,
        status: 'active',
      },
    ],
  },
]

export default function PartiesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentTabParam = searchParams.get('tab')
  const [activeView, setActiveView] = useState<'details' | 'whatsapp' | 'network'>(
    currentTabParam === 'whatsapp' ? 'whatsapp' : currentTabParam === 'network' ? 'network' : 'details'
  )

  const [parties, setParties] = useState<ExtendedParty[]>(INITIAL_PARTIES)
  const [selectedPartyId, setSelectedPartyId] = useState<string>('p-asdf')
  const [partySearch, setPartySearch] = useState('')
  const [txSearch, setTxSearch] = useState('')
  const [selectedTxId, setSelectedTxId] = useState<string>('tx-2') // Row 2 selected by default matching Screenshot 3

  // Modals state
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(searchParams.get('action') === 'new')
  const [editingParty, setEditingParty] = useState<PartyData | null>(null)

  // Three dots menu state
  const [menuOpenTx, setMenuOpenTx] = useState<PartyTransaction | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | undefined>(undefined)

  // Action Modals (View/Edit, Preview/PDF, Receive Payment, View History)
  const [actionModalType, setActionModalType] = useState<
    'view_edit' | 'preview' | 'preview_challan' | 'receive_payment' | 'view_history' | null
  >(null)
  const [activeModalTx, setActiveModalTx] = useState<PartyTransaction | null>(null)

  useEffect(() => {
    if (currentTabParam === 'whatsapp') {
      setActiveView('whatsapp')
    } else if (currentTabParam === 'network') {
      setActiveView('network')
    } else {
      setActiveView('details')
    }
  }, [currentTabParam])

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingParty(null)
      setIsAddPartyOpen(true)
    }
  }, [searchParams])

  const selectedParty = parties.find((p) => p.id === selectedPartyId) || parties[0]

  // Calculate party balance dynamically from transactions + opening balance
  const calculatePartyBalance = (party: ExtendedParty) => {
    const txBalance = party.transactions.reduce((sum, tx) => sum + (tx.status !== 'cancelled' ? tx.balance : 0), 0)
    return txBalance + (party.openingBalance || 0)
  }

  // Filter parties by search
  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
    p.phone.includes(partySearch)
  )

  // Filter transactions
  const filteredTransactions = selectedParty?.transactions.filter((tx) =>
    txSearch
      ? tx.number.includes(txSearch) || tx.type.toLowerCase().includes(txSearch.toLowerCase()) || tx.date.includes(txSearch)
      : true
  ) || []

  // Add / Edit Party handler
  const handleSaveParty = (partyData: PartyData, saveAndNew = false) => {
    if (editingParty && editingParty.id) {
      setParties((prev) =>
        prev.map((p) =>
          p.id === editingParty.id
            ? {
                ...p,
                ...partyData,
              }
            : p
        )
      )
      toast.success(`Party "${partyData.name}" updated successfully!`)
    } else {
      const newId = `p-${Date.now()}`
      const newParty: ExtendedParty = {
        ...partyData,
        id: newId,
        transactions: partyData.openingBalance
          ? [
              {
                id: `tx-op-${Date.now()}`,
                type: 'Opening Balance',
                number: '—',
                date: partyData.asOfDate || new Date().toLocaleDateString('en-GB'),
                total: partyData.openingBalance,
                balance: partyData.openingBalance,
                status: 'active',
              },
            ]
          : [],
      }
      setParties((prev) => [newParty, ...prev])
      setSelectedPartyId(newId)
      toast.success(`Party "${partyData.name}" added successfully!`)
    }

    if (!saveAndNew) {
      setIsAddPartyOpen(false)
      setEditingParty(null)
    }
  }

  // Handle 11 actions from Three Dots Menu
  const handleTransactionAction = (action: TransactionActionType, tx: PartyTransaction) => {
    setActiveModalTx(tx)

    switch (action) {
      case 'view_edit':
        setActionModalType('view_edit')
        break

      case 'cancel_invoice':
        setParties((prev) =>
          prev.map((p) =>
            p.id === selectedParty.id
              ? {
                  ...p,
                  transactions: p.transactions.map((t) =>
                    t.id === tx.id ? { ...t, status: 'cancelled', balance: 0 } : t
                  ),
                }
              : p
          )
        )
        toast.info(`Invoice #${tx.number} has been cancelled`)
        break

      case 'delete':
        setParties((prev) =>
          prev.map((p) =>
            p.id === selectedParty.id
              ? {
                  ...p,
                  transactions: p.transactions.filter((t) => t.id !== tx.id),
                }
              : p
          )
        )
        toast.success(`Invoice #${tx.number} deleted successfully`)
        break

      case 'duplicate':
        const nextNum = String(selectedParty.transactions.length + 1)
        const duplicatedTx: PartyTransaction = {
          ...tx,
          id: `tx-${Date.now()}`,
          number: nextNum,
          date: new Date().toLocaleDateString('en-GB'),
          balance: tx.total,
          status: 'active',
        }
        setParties((prev) =>
          prev.map((p) =>
            p.id === selectedParty.id
              ? {
                  ...p,
                  transactions: [duplicatedTx, ...p.transactions],
                }
              : p
          )
        )
        setSelectedTxId(duplicatedTx.id)
        toast.success(`Invoice #${tx.number} duplicated as #${nextNum}!`)
        break

      case 'open_pdf':
      case 'preview':
        setActionModalType('preview')
        break

      case 'print':
        window.print()
        break

      case 'preview_delivery_challan':
        setActionModalType('preview_challan')
        break

      case 'convert_to_return':
        toast.success(`Generated Sale Return credit note against Invoice #${tx.number}!`)
        break

      case 'receive_payment':
        setActionModalType('receive_payment')
        break

      case 'view_history':
        setActionModalType('view_history')
        break

      default:
        break
    }
  }

  const handleUpdateTransaction = (updatedTx: PartyTransaction) => {
    setParties((prev) =>
      prev.map((p) =>
        p.id === selectedParty.id
          ? {
              ...p,
              transactions: p.transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t)),
            }
          : p
      )
    )
    toast.success(`Transaction #${updatedTx.number} updated!`)
  }

  const handleReceivePaymentDone = (amount: number, mode: string) => {
    if (!activeModalTx) return
    const newBal = Math.max(0, activeModalTx.balance - amount)
    setParties((prev) =>
      prev.map((p) =>
        p.id === selectedParty.id
          ? {
              ...p,
              transactions: p.transactions.map((t) =>
                t.id === activeModalTx.id
                  ? { ...t, balance: newBal, status: newBal === 0 ? 'paid' : 'active' }
                  : t
              ),
            }
          : p
      )
    )
    toast.success(`Received ₹${amount.toLocaleString('en-IN')} via ${mode}!`)
  }

  const sendWhatsApp = () => {
    if (!selectedParty.phone) {
      toast.error('No phone number registered for this party')
      return
    }
    const cleanPhone = selectedParty.phone.replace(/\D/g, '')
    const target = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    const balance = calculatePartyBalance(selectedParty)
    const text = encodeURIComponent(
      `Dear ${selectedParty.name}, greetings from VANIRA! Your current outstanding balance is ₹${balance.toLocaleString('en-IN')}. Please let us know if you have any questions. Thank you!`
    )
    window.open(`https://wa.me/${target}?text=${text}`, '_blank')
  }

  const sendReminder = () => {
    const balance = calculatePartyBalance(selectedParty)
    toast.success(`Payment reminder dispatched to ${selectedParty.name} (${selectedParty.phone}) for ₹${balance.toLocaleString('en-IN')}`)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] select-none bg-[#f4f6f9] overflow-hidden -m-4 sm:-m-6">
      
      {/* Top Bar matching Screenshot 3: Parties ⌄ + Add Party, Settings */}
      <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 cursor-pointer group">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Parties</h1>
            <ChevronDown className="h-4 w-4 text-gray-500 group-hover:text-gray-800 transition-colors" />
          </div>

          {/* Module Sub-tabs */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-semibold ml-4">
            <button
              onClick={() => setActiveView('details')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeView === 'details' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Party Details
            </button>
            <button
              onClick={() => setActiveView('whatsapp')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeView === 'whatsapp' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Whatsapp Connect
            </button>
            <button
              onClick={() => setActiveView('network')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeView === 'network' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              VANIRA Network
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingParty(null)
              setIsAddPartyOpen(true)
            }}
            className="h-8.5 px-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Party</span>
          </button>

          <button
            type="button"
            className="h-8.5 w-8.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            title="Party Settings"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            className="h-8.5 w-8.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            title="More Options"
          >
            <MoreVertical className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Subviews: WhatsApp Connect / Network */}
      {activeView === 'whatsapp' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          <WhatsAppConnectView />
        </div>
      )}
      {activeView === 'network' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          <VaniraNetworkView />
        </div>
      )}

      {/* MAIN VIEW: MASTER-DETAIL SPLIT SCREEN MATCHING SCREENSHOT 3 */}
      {activeView === 'details' && (
        <div className="flex-1 flex overflow-hidden">
          
          {/* ── LEFT COLUMN: PARTY LIST ──────────────────────────────── */}
          <div className="w-72 md:w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
            {/* Search Input */}
            <div className="p-2.5 border-b border-gray-100">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Party Name"
                  value={partySearch}
                  onChange={(e) => setPartySearch(e.target.value)}
                  className="w-full h-8 pl-8.5 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* List Table Header */}
            <div className="px-3.5 py-2 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wide">
              <div className="flex items-center gap-1 cursor-pointer hover:text-gray-800">
                <span>Party Name</span>
                <Filter className="h-3 w-3 text-red-500 fill-red-500" />
              </div>
              <div className="cursor-pointer hover:text-gray-800">
                <span>Amount</span>
              </div>
            </div>

            {/* Parties Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredParties.map((party) => {
                const isSelected = party.id === selectedParty.id
                const balance = calculatePartyBalance(party)
                return (
                  <div
                    key={party.id}
                    onClick={() => setSelectedPartyId(party.id)}
                    className={`px-3.5 py-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#eaf4fd] border-l-4 border-l-blue-600 font-semibold text-gray-900'
                        : 'hover:bg-gray-50/80 text-gray-700'
                    }`}
                  >
                    <span className="truncate pr-2">{party.name}</span>
                    <span
                      className={`font-mono font-bold flex-shrink-0 ${
                        balance > 0 ? 'text-emerald-600' : 'text-gray-500'
                      }`}
                    >
                      {balance > 0 ? balance.toFixed(2) : '0.00'}
                    </span>
                  </div>
                )
              })}

              {filteredParties.length === 0 && (
                <div className="p-6 text-center text-xs text-gray-400">
                  No parties found matching "{partySearch}"
                </div>
              )}
            </div>

            {/* Bottom Contact Import Banner matching Screenshot 3 */}
            <div className="p-2.5 border-t border-gray-200 bg-white flex-shrink-0">
              <div
                onClick={() => {
                  setEditingParty(null)
                  setIsAddPartyOpen(true)
                }}
                className="p-2.5 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="text-[11px] leading-tight">
                    <span>Easily convert your </span>
                    <span className="font-bold">Phone contacts</span>
                    <span> into parties</span>
                  </div>
                </div>
                <span className="text-emerald-600 font-bold text-sm">›</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: SELECTED PARTY LEDGER & TRANSACTIONS ──── */}
          <div className="flex-1 bg-white flex flex-col overflow-hidden">
            
            {/* Top Party Profile Card matching Screenshot 3 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between flex-shrink-0 bg-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900 tracking-tight">{selectedParty.name}</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingParty(selectedParty)
                      setIsAddPartyOpen(true)
                    }}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    title="Edit Party Details"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                <div className="text-xs text-gray-500">
                  <span className="block text-[11px] text-gray-400">Phone Number</span>
                  <span className="font-medium text-gray-800">{selectedParty.phone || '—'}</span>
                </div>
              </div>

              {/* Right Action Icons: SMS (amber), WhatsApp (green), Clock (amber) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toast.info(`SMS service ready for ${selectedParty.name}`)}
                  className="h-7.5 w-7.5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  title="Send SMS"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={sendWhatsApp}
                  className="h-7.5 w-7.5 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  title="Send WhatsApp Message"
                >
                  <Phone className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={sendReminder}
                  className="h-7.5 w-7.5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  title="Payment Reminder"
                >
                  <Clock className="h-4 w-4" />
                </button>

                <RowActionsMenu
                  buttonClassName="h-7.5 w-7.5 rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  items={[
                    {
                      label: 'Edit Party Details',
                      icon: Edit2,
                      onClick: () => {
                        setEditingParty(selectedParty)
                        setIsAddPartyOpen(true)
                      },
                    },
                    {
                      label: 'View Statement / Ledger',
                      icon: Eye,
                      onClick: () => {
                        toast.success(`Opening complete statement for ${selectedParty.name}`)
                        window.print()
                      },
                    },
                    {
                      label: 'Share Statement on WhatsApp',
                      icon: Share2,
                      onClick: sendWhatsApp,
                      divider: true,
                    },
                    {
                      label: 'Create Sale Invoice (F2)',
                      icon: FileText,
                      onClick: () => router.push(`/sales/invoices/new?partyName=${encodeURIComponent(selectedParty.name)}`),
                    },
                    {
                      label: 'Create Purchase Bill (F3)',
                      icon: ShoppingCart,
                      onClick: () => router.push(`/purchases/bills/new?partyName=${encodeURIComponent(selectedParty.name)}`),
                    },
                    {
                      label: 'Record Payment-In',
                      icon: DollarSign,
                      onClick: () => {
                        setActiveModalTx({
                          id: `tx-new-${Date.now()}`,
                          type: 'Payment-In',
                          number: 'NEW',
                          date: new Date().toLocaleDateString('en-GB'),
                          total: calculatePartyBalance(selectedParty),
                          balance: calculatePartyBalance(selectedParty),
                          status: 'active',
                        })
                        setActionModalType('receive_payment')
                      },
                    },
                    {
                      label: 'Record Payment-Out',
                      icon: DollarSign,
                      onClick: () => {
                        setActiveModalTx({
                          id: `tx-out-${Date.now()}`,
                          type: 'Payment-Out',
                          number: 'NEW',
                          date: new Date().toLocaleDateString('en-GB'),
                          total: calculatePartyBalance(selectedParty),
                          balance: calculatePartyBalance(selectedParty),
                          status: 'active',
                        })
                        setActionModalType('payment_out')
                      },
                      divider: true,
                    },
                    {
                      label: 'Delete Party',
                      icon: Trash2,
                      isDestructive: true,
                      onClick: () => {
                        if (confirm(`Are you sure you want to delete party "${selectedParty.name}"?`)) {
                          setParties((prev) => prev.filter((p) => p.id !== selectedParty.id))
                          if (parties.length > 1) {
                            setSelectedPartyId(parties.find((p) => p.id !== selectedParty.id)?.id || '')
                          }
                          toast.success(`Party "${selectedParty.name}" deleted`)
                        }
                      },
                    },
                  ]}
                />
              </div>
            </div>

            {/* Transactions Header Bar matching Screenshot 3 */}
            <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Transactions</h3>
              
              <div className="flex items-center gap-3 text-gray-500">
                <button
                  type="button"
                  onClick={() => {
                    const q = prompt('Search in transactions:')
                    if (q !== null) setTxSearch(q)
                  }}
                  className="p-1 hover:text-gray-800 transition-colors cursor-pointer"
                  title="Search Transactions"
                >
                  <Search className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1 hover:text-gray-800 transition-colors cursor-pointer"
                  title="Print Ledger"
                >
                  <Printer className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => toast.success('Exporting transactions to Excel (.xlsx)...')}
                  className="h-5 w-5 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-[9px] font-bold shadow-2xs cursor-pointer transition-colors"
                  title="Export to Excel"
                >
                  xls
                </button>
              </div>
            </div>

            {/* Transactions Table matching Screenshot 3 */}
            <div className="flex-1 overflow-y-auto relative">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-white border-b border-gray-200 text-[11px] font-semibold text-gray-500 sticky top-0 z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-6 font-semibold">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-gray-800">
                        <span>Type</span>
                        <Filter className="h-2.5 w-2.5 text-gray-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-4 font-semibold">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-gray-800">
                        <span>Number</span>
                        <Filter className="h-2.5 w-2.5 text-gray-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-4 font-semibold">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-gray-800">
                        <span>Date</span>
                        <Filter className="h-2.5 w-2.5 text-gray-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      <span>Total</span>
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-800">
                        <span>Balance</span>
                        <Filter className="h-2.5 w-2.5 text-gray-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-4 w-10 text-center"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((tx) => {
                    const isSelected = tx.id === selectedTxId
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTxId(tx.id)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected ? 'bg-[#eaf4fd]' : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <td className="py-3 px-6 text-gray-800 font-medium">{tx.type}</td>
                        <td className="py-3 px-4 font-mono text-gray-700">{tx.number}</td>
                        <td className="py-3 px-4 text-gray-600">{tx.date}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                          ₹ {tx.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-800">
                          ₹ {tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        
                        {/* Three Dots Action Button */}
                        <td className="py-3 px-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (menuOpenTx?.id === tx.id) {
                                setMenuOpenTx(null)
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setSelectedTxId(tx.id)
                                setMenuOpenTx(tx)
                                setMenuPos({
                                  top: rect.bottom + window.scrollY,
                                  right: window.innerWidth - rect.right,
                                })
                              }
                            }}
                            className="p-1 hover:bg-gray-200/80 rounded-md text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                            title="Transaction Options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                        No transactions recorded for {selectedParty.name} yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ── THREE DOTS CONTEXT MENU (All 11 options from Screenshot 3) ── */}
      {menuOpenTx && (
        <PartyTransactionMenu
          isOpen={Boolean(menuOpenTx)}
          onClose={() => setMenuOpenTx(null)}
          transaction={menuOpenTx}
          onAction={handleTransactionAction}
          triggerPosition={menuPos}
        />
      )}

      {/* ── ADD / EDIT PARTY MODAL (Exact match for Screenshot 2) ───── */}
      <AddPartyModal
        isOpen={isAddPartyOpen}
        onClose={() => {
          setIsAddPartyOpen(false)
          setEditingParty(null)
        }}
        onSave={handleSaveParty}
        initialData={editingParty}
      />

      {/* ── TRANSACTION ACTION MODALS (Preview, PDF, Challan, Payment) ─ */}
      <TransactionActionModals
        type={actionModalType}
        transaction={activeModalTx}
        partyName={selectedParty.name}
        onClose={() => {
          setActionModalType(null)
          setActiveModalTx(null)
        }}
        onSave={handleUpdateTransaction}
        onPaymentReceived={handleReceivePaymentDone}
      />

    </div>
  )
}
