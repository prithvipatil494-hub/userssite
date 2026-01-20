"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import  MapComponent  from "@/components/map-component"
import { ProfileCard } from "@/components/profile-card"
import SafetyDashboard  from "@/components/safety-dashboard"
import { MyBusesView } from "@/components/my-buses-view"
import { AnalyticsView } from "@/components/analytics-view"
import SettingsView from "@/components/settings-view"
export default function Home() {
  const [activeTab, setActiveTab] = useState("map")
  const [searchTrackingId, setSearchTrackingId] = useState("")

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                B
              </div>
              BusTrack
            </h1>
            <p className="text-sm text-muted-foreground">Live Transit Management System</p>
          </div>
          <ProfileCard />
        </div>
      </header>

      {/* Tabs Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <div className="border-b border-border bg-card px-6">
            <TabsList className="bg-transparent border-b border-border/50 rounded-none w-full justify-start gap-8 overflow-x-auto">
              <TabsTrigger
                value="map"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3"
              >
                🗺️ Live Map
              </TabsTrigger>
              <TabsTrigger
                value="myBuses"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3"
              >
                🎫 My Buses
              </TabsTrigger>
              <TabsTrigger
                value="buses"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3"
              >
                🚌 All Buses
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3"
              >
                📊 Analytics
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3"
              >
                📅 Schedule
              </TabsTrigger>
              <TabsTrigger
                value="safety"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3"
              >
                🛡️ Safety
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3"
              >
                ⚙️ Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="map" className="flex-1 p-0 m-0">
            <MapComponent searchTrackingId={searchTrackingId} />
          </TabsContent>

          <TabsContent value="myBuses" className="flex-1 p-6 overflow-auto">
            <MyBusesView />
          </TabsContent>

          <TabsContent value="buses" className="flex-1 p-6 overflow-auto">
            <AllBusesView searchTrackingId={searchTrackingId} onSearch={setSearchTrackingId} />
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 p-6 overflow-auto">
            <AnalyticsView />
          </TabsContent>

          <TabsContent value="schedule" className="flex-1 p-6 overflow-auto">
            <ScheduleView />
          </TabsContent>

          <TabsContent value="safety" className="flex-1 p-0 m-0">
            <SafetyDashboard />
          </TabsContent>

          <TabsContent value="settings" className="flex-1 p-0 m-0">
            <SettingsView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// All Buses View Component
function AllBusesView({ searchTrackingId, onSearch }: { searchTrackingId: string; onSearch: (id: string) => void }) {
  const buses = [
    {
      id: "BT-001",
      name: "Express 1",
      route: "Downtown → Airport",
      status: "Active",
      passengers: 45,
      capacity: 60,
      nextStop: "Central Station",
      eta: "5 mins",
    },
    {
      id: "BT-002",
      name: "Express 2",
      route: "West End → Harbor",
      status: "Active",
      passengers: 52,
      capacity: 60,
      nextStop: "Park Avenue",
      eta: "8 mins",
    },
    {
      id: "BT-003",
      name: "Local 3",
      route: "North Gate → South Gate",
      status: "Active",
      passengers: 38,
      capacity: 60,
      nextStop: "Main Street",
      eta: "3 mins",
    },
    {
      id: "BT-004",
      name: "Express 4",
      route: "Downtown → Airport",
      status: "Inactive",
      passengers: 0,
      capacity: 60,
      nextStop: "-",
      eta: "-",
    },
    {
      id: "BT-005",
      name: "Local 5",
      route: "East Side → City Center",
      status: "Active",
      passengers: 41,
      capacity: 60,
      nextStop: "Commerce St",
      eta: "12 mins",
    },
  ]

  const filtered = searchTrackingId
    ? buses.filter((b) => b.id.toLowerCase().includes(searchTrackingId.toLowerCase()))
    : buses

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by Tracking ID (e.g., BT-001)"
          value={searchTrackingId}
          onChange={(e) => onSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((bus) => (
          <div key={bus.id} className="border border-border rounded-lg p-4 bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-foreground">{bus.name}</h3>
                <p className="text-sm text-muted-foreground">{bus.id}</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  bus.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}
              >
                {bus.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{bus.route}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passengers:</span>
                <span className="font-semibold">
                  {bus.passengers}/{bus.capacity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Stop:</span>
                <span className="font-semibold">{bus.nextStop}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ETA:</span>
                <span className="font-semibold text-primary">{bus.eta}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No buses found with ID: {searchTrackingId}</p>
        </div>
      )}
    </div>
  )
}

// Schedule View Component
function ScheduleView() {
  const schedules = [
    {
      route: "Downtown → Airport",
      departureTime: "06:00",
      arrivalTime: "06:35",
      frequency: "Every 15 mins",
      busId: "BT-001",
    },
    {
      route: "Downtown → Airport",
      departureTime: "06:15",
      arrivalTime: "06:50",
      frequency: "Every 15 mins",
      busId: "BT-002",
    },
    {
      route: "West End → Harbor",
      departureTime: "06:30",
      arrivalTime: "07:15",
      frequency: "Every 20 mins",
      busId: "BT-003",
    },
    {
      route: "North Gate → South Gate",
      departureTime: "06:00",
      arrivalTime: "06:45",
      frequency: "Every 10 mins",
      busId: "BT-004",
    },
    {
      route: "East Side → City Center",
      departureTime: "06:20",
      arrivalTime: "07:05",
      frequency: "Every 18 mins",
      busId: "BT-005",
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Bus Schedules</h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-6 py-3 text-left font-semibold text-foreground">Route</th>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Departure</th>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Arrival</th>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Frequency</th>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Bus ID</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule, idx) => (
              <tr key={idx} className="border-b border-border hover:bg-muted/50">
                <td className="px-6 py-3 text-foreground">{schedule.route}</td>
                <td className="px-6 py-3 text-foreground font-semibold">{schedule.departureTime}</td>
                <td className="px-6 py-3 text-foreground font-semibold">{schedule.arrivalTime}</td>
                <td className="px-6 py-3 text-muted-foreground">{schedule.frequency}</td>
                <td className="px-6 py-3">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">
                    {schedule.busId}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
