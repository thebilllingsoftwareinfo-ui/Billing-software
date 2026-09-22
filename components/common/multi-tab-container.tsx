'use client'

import { useState, ReactNode } from 'react'
import { Plus, X } from 'lucide-react'

interface Tab {
  id: string
  title: string
}

interface MultiTabContainerProps {
  baseTitle: string // e.g. "Sale" or "Purchase"
  renderContent: (tabId: string) => ReactNode
}

export function MultiTabContainer({ baseTitle, renderContent }: MultiTabContainerProps) {
  const [tabs, setTabs] = useState<Tab[]>([{ id: '1', title: `${baseTitle} #1` }])
  const [activeTabId, setActiveTabId] = useState('1')
  const [nextId, setNextId] = useState(2)

  const handleAddTab = () => {
    const newId = nextId.toString()
    setTabs([...tabs, { id: newId, title: `${baseTitle} #${newId}` }])
    setActiveTabId(newId)
    setNextId(nextId + 1)
  }

  const handleCloseTab = (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (tabs.length === 1) return // Keep at least one tab

    const newTabs = tabs.filter(t => t.id !== idToClose)
    setTabs(newTabs)
    if (activeTabId === idToClose) {
      setActiveTabId(newTabs[newTabs.length - 1].id)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-gray-200 bg-gray-100 px-2 pt-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                group flex items-center justify-between gap-2 px-3 py-1.5 min-w-[120px] max-w-[200px] cursor-pointer rounded-t-lg text-sm font-medium transition-colors border-t border-x
                ${activeTabId === tab.id 
                  ? 'bg-white text-gray-900 border-gray-200 border-b-white shadow-sm' 
                  : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-200 hover:text-gray-700 border-b-gray-200'}
              `}
              style={{ marginBottom: activeTabId === tab.id ? '-1px' : '0' }}
            >
              <span className="truncate flex-1 text-xs">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className={`
                    p-0.5 rounded-md hover:bg-gray-300 transition-colors
                    ${activeTabId === tab.id ? 'opacity-100 text-gray-500' : 'opacity-0 group-hover:opacity-100 text-gray-400'}
                  `}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddTab}
            className="p-1 ml-1 rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center h-5 w-5"
            title={`Add new ${baseTitle.toLowerCase()}`}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {/* Content wrapper */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className={`w-full h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}
          >
            {renderContent(tab.id)}
          </div>
        ))}
      </div>
    </div>
  )
}
