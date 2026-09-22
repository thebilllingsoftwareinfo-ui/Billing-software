'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'

export interface RowActionItem {
  label: string
  icon?: React.ElementType
  onClick: () => void
  isDestructive?: boolean
  divider?: boolean
}

interface RowActionsMenuProps {
  items: RowActionItem[]
  align?: 'left' | 'right'
  buttonClassName?: string
}

export function RowActionsMenu({ items, align = 'right', buttonClassName }: RowActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right?: number; left?: number } | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const showAbove = spaceBelow < 260

      if (align === 'right') {
        setMenuPosition({
          top: showAbove ? rect.top + window.scrollY - 8 : rect.bottom + window.scrollY + 4,
          right: window.innerWidth - rect.right,
        })
      } else {
        setMenuPosition({
          top: showAbove ? rect.top + window.scrollY - 8 : rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        })
      }
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={toggleMenu}
        className={
          buttonClassName ||
          'h-7.5 w-7.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:border-gray-300'
        }
        title="More Actions"
        aria-label="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className={`fixed z-50 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 select-none text-left`}
          style={{
            top: menuPosition?.top,
            ...(menuPosition?.right !== undefined ? { right: menuPosition.right } : {}),
            ...(menuPosition?.left !== undefined ? { left: menuPosition.left } : {}),
          }}
        >
          {items.map((item, index) => {
            const Icon = item.icon
            return (
              <React.Fragment key={item.label + index}>
                {item.divider && <div className="border-t border-gray-100 my-1" />}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                    item.onClick()
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    item.isDestructive
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span>{item.label}</span>
                  {Icon && (
                    <Icon
                      className={`h-3.5 w-3.5 ${
                        item.isDestructive ? 'text-red-500' : 'text-gray-400'
                      }`}
                    />
                  )}
                </button>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
