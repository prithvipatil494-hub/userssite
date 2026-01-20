"use client"

import { useState } from "react"

export function ProfileCard() {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          JD
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-semibold text-foreground">John Doe</p>
          <p className="text-xs text-muted-foreground">Passenger</p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg p-2 z-50">
          <button className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm text-foreground transition-colors">
            👤 My Profile
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm text-foreground transition-colors">
            🎫 My Tickets
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm text-foreground transition-colors">
            ⭐ Favorites
          </button>
          <hr className="my-2 border-border" />
          <button className="w-full text-left px-3 py-2 rounded hover:bg-destructive/10 text-sm text-destructive transition-colors">
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  )
}
