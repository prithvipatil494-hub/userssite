"use client"

import { useState } from "react"

export function SidebarNav() {
  const [isOpen, setIsOpen] = useState(true)

  const menuItems = [
    { icon: "🗺️", label: "Dashboard", active: true },
    { icon: "🚌", label: "My Buses", active: false },
    { icon: "📊", label: "Analytics", active: false },
    { icon: "⚙️", label: "Settings", active: false },
  ]

  return (
    <div
      className={`${isOpen ? "w-64" : "w-20"} bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col overflow-hidden`}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border bg-sidebar">
        <div className={`flex items-center gap-3 ${!isOpen && "justify-center w-full"}`}>
          <div className="w-8 h-8 bg-sidebar-accent rounded-lg flex items-center justify-center text-sidebar-foreground font-bold text-sm">
            B
          </div>
          {isOpen && <span className="font-bold text-sidebar-foreground whitespace-nowrap">BusTrack</span>}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sidebar-foreground ${
              item.active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {isOpen && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Toggle Button */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          {isOpen ? "←" : "→"}
        </button>
      </div>
    </div>
  )
}
