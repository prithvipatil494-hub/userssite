"use client"

import { useState } from "react"

export function MyBusesView() {
  const [myBuses] = useState([
    {
      id: "BT-001",
      name: "Express 1",
      route: "Downtown → Airport",
      boardingTime: "07:30",
      arrivalTime: "08:05",
      status: "Boarding",
      passengers: 45,
      capacity: 60,
      nextStop: "Central Station",
      eta: "5 mins",
      bookingRef: "REF-2024-001",
    },
    {
      id: "BT-003",
      name: "Local 3",
      route: "North Gate → South Gate",
      boardingTime: "08:15",
      arrivalTime: "09:00",
      status: "Upcoming",
      passengers: 38,
      capacity: 60,
      nextStop: "Main Street",
      eta: "-",
      bookingRef: "REF-2024-003",
    },
    {
      id: "BT-005",
      name: "Local 5",
      route: "East Side → City Center",
      boardingTime: "09:20",
      arrivalTime: "10:05",
      status: "Completed",
      passengers: 0,
      capacity: 60,
      nextStop: "-",
      eta: "-",
      bookingRef: "REF-2024-005",
    },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Boarding":
        return "bg-green-100 text-green-800"
      case "Upcoming":
        return "bg-blue-100 text-blue-800"
      case "Completed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">My Buses</h2>
        <p className="text-muted-foreground">View all your booked bus tickets and upcoming journeys</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {myBuses.map((bus) => (
          <div key={bus.id} className="border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">{bus.name}</h3>
                <p className="text-sm text-muted-foreground">{bus.route}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(bus.status)}`}>
                {bus.status}
              </span>
            </div>

            {/* Route and Times */}
            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Boarding</p>
                  <p className="text-lg font-bold text-foreground">{bus.boardingTime}</p>
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-1 bg-primary/30 rounded-full relative">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full"></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Arrival</p>
                  <p className="text-lg font-bold text-foreground">{bus.arrivalTime}</p>
                </div>
              </div>
            </div>

            {/* Bus Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Bus ID</p>
                <p className="text-sm font-semibold text-primary">{bus.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Booking Ref</p>
                <p className="text-sm font-semibold text-foreground">{bus.bookingRef}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next Stop</p>
                <p className="text-sm font-semibold text-foreground">{bus.nextStop}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ETA</p>
                <p className="text-sm font-semibold text-primary">{bus.eta}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Occupancy</p>
                <p className="text-sm font-semibold text-foreground">
                  {bus.passengers}/{bus.capacity}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-2">
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${(bus.passengers / bus.capacity) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-semibold text-sm">
                View Details
              </button>
              <button className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors font-semibold text-sm">
                Cancel Ticket
              </button>
            </div>
          </div>
        ))}
      </div>

      {myBuses.length === 0 && (
        <div className="text-center py-12 border border-border rounded-lg bg-card">
          <p className="text-muted-foreground text-lg">No booked buses yet</p>
          <p className="text-sm text-muted-foreground mt-2">Book a bus ticket to see it here</p>
        </div>
      )}
    </div>
  )
}
