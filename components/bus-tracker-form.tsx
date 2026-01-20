"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface TrackerFormProps {
  onTrack: (busId: string) => void
  isLoading?: boolean
}

export function BusTrackerForm({ onTrack, isLoading = false }: TrackerFormProps) {
  const [busId, setBusId] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (busId.trim()) {
      onTrack(busId)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Enter Bus ID (e.g., BT-001)"
        value={busId}
        onChange={(e) => setBusId(e.target.value)}
        className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <Button type="submit" disabled={isLoading || !busId.trim()} className="bg-primary hover:bg-primary/90">
        {isLoading ? "Tracking..." : "Active Tracking"}
      </Button>
    </form>
  )
}
