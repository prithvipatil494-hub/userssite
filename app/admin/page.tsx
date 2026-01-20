"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface Bus {
  _id: string
  busId: string
  busName: string
  route: string
  isActive: boolean
  passengers: number
  capacity: number
  nextStop: string
  eta: string
}

export default function AdminPage() {
  const [buses, setBuses] = useState<Bus[]>([])
  const [trackingId, setTrackingId] = useState("")
  const [busName, setBusName] = useState("")
  const [route, setRoute] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

  useEffect(() => {
    fetchBuses()
  }, [])

  const fetchBuses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/buses`)
      const data = await response.json()
      setBuses(data)
    } catch (error) {
      console.error("Error fetching buses:", error)
    }
  }

  const registerBus = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/buses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busId: trackingId,
          busName,
          route,
          passengers: 0,
          capacity: 60,
          nextStop: "Starting Point",
          eta: "N/A",
        }),
      })

      if (response.ok) {
        setMessage(`Bus ${trackingId} registered successfully!`)
        setTrackingId("")
        setBusName("")
        setRoute("")
        fetchBuses()
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage("Error registering bus")
      }
    } catch (error) {
      setMessage("Error: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const toggleTracking = async (busId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/buses/${busId}/toggle`, {
        method: "PUT",
      })

      if (response.ok) {
        fetchBuses()
      }
    } catch (error) {
      console.error("Error toggling tracking:", error)
    }
  }

  const deleteBus = async (busId: string) => {
    if (confirm(`Delete bus ${busId}?`)) {
      try {
        const response = await fetch(`${API_URL}/api/buses/${busId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          fetchBuses()
          setMessage(`Bus ${busId} deleted!`)
          setTimeout(() => setMessage(""), 3000)
        }
      } catch (error) {
        console.error("Error deleting bus:", error)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-foreground mb-8">Bus Administration Panel</h1>

        {/* Register New Bus */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Register New Bus</h2>
          <form onSubmit={registerBus} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Bus ID (e.g., BT-001)"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
                required
              />
              <input
                type="text"
                placeholder="Bus Name (e.g., Express 1)"
                value={busName}
                onChange={(e) => setBusName(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
                required
              />
              <input
                type="text"
                placeholder="Route (e.g., Downtown → Airport)"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
              {loading ? "Registering..." : "Register Bus"}
            </Button>
          </form>
          {message && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded-lg">{message}</div>
          )}
        </div>

        {/* Active Buses List */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Registered Buses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Bus ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Route</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buses.map((bus) => (
                  <tr key={bus._id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-semibold text-foreground">{bus.busId}</td>
                    <td className="px-4 py-3 text-foreground">{bus.busName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{bus.route}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          bus.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {bus.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => toggleTracking(bus.busId)}
                          size="sm"
                          variant={bus.isActive ? "destructive" : "default"}
                        >
                          {bus.isActive ? "Stop" : "Start"} Tracking
                        </Button>
                        <Button onClick={() => deleteBus(bus.busId)} size="sm" variant="outline">
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
