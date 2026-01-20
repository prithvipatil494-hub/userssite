"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

interface Node {
  id: string
  name: string
  lat: number
  lng: number
  passengers: number
  color: string
}

interface Marker {
  id: string
  lat: number
  lng: number
}

export function AnalyticsView() {
  const [nodes] = useState<Node[]>([
    { id: "N1", name: "Downtown Hub", lat: 40.7128, lng: -74.006, passengers: 156, color: "bg-red-500" },
    { id: "N2", name: "Central Station", lat: 40.7138, lng: -73.996, passengers: 242, color: "bg-orange-500" },
    { id: "N3", name: "Airport Terminal", lat: 40.7158, lng: -74.016, passengers: 389, color: "bg-yellow-500" },
    { id: "N4", name: "Harbor Gateway", lat: 40.7078, lng: -74.006, passengers: 178, color: "bg-green-500" },
    { id: "N5", name: "North Station", lat: 40.7228, lng: -73.986, passengers: 267, color: "bg-blue-500" },
    { id: "N6", name: "South Platform", lat: 40.7028, lng: -73.996, passengers: 134, color: "bg-purple-500" },
  ])

  const [markers, setMarkers] = useState<Marker[]>([])
  const [isPlacingMarker, setIsPlacingMarker] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const nodeMarkersRef = useRef<mapboxgl.Marker[]>([])
  const customMarkersRef = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error("[v0] Mapbox token not found. Please add NEXT_PUBLIC_MAPBOX_TOKEN to .env")
      return
    }

    mapboxgl.accessToken = token

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
      })
    }

    if (!mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-74.006, 40.7128],
      zoom: 13,
    })

    return () => {
      if (map.current) map.current.remove()
    }
  }, [])

  useEffect(() => {
    if (!map.current) return

    nodeMarkersRef.current.forEach((marker) => marker.remove())
    nodeMarkersRef.current = []

    nodes.forEach((node) => {
      const el = document.createElement("div")
      el.className = "relative"
      el.innerHTML = `
        <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform" style="background-color: var(--node-color)">
          ${node.passengers}
        </div>
        <div class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-1 rounded text-xs font-semibold whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          ${node.name}
        </div>
      `

      const colorMap: { [key: string]: string } = {
        "bg-red-500": "#ef4444",
        "bg-orange-500": "#f97316",
        "bg-yellow-500": "#eab308",
        "bg-green-500": "#22c55e",
        "bg-blue-500": "#3b82f6",
        "bg-purple-500": "#a855f7",
      }

      el.style.setProperty("--node-color", colorMap[node.color] || "#3b82f6")

      const marker = new mapboxgl.Marker(el).setLngLat([node.lng, node.lat]).addTo(map.current!)
      nodeMarkersRef.current.push(marker)
    })
  }, [nodes])

  useEffect(() => {
    if (!map.current || !userLocation) return

    if (userMarkerRef.current) userMarkerRef.current.remove()

    const el = document.createElement("div")
    el.className = "w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg"

    userMarkerRef.current = new mapboxgl.Marker(el).setLngLat([userLocation.lng, userLocation.lat]).addTo(map.current)
  }, [userLocation])

  useEffect(() => {
    if (!map.current) return

    customMarkersRef.current.forEach((marker) => marker.remove())
    customMarkersRef.current = []

    markers.forEach((marker) => {
      const el = document.createElement("div")
      el.className =
        "w-8 h-12 bg-primary text-white rounded-full flex items-center justify-center relative shadow-lg cursor-pointer"
      el.innerHTML = `
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd" />
        </svg>
      `

      const mapMarker = new mapboxgl.Marker(el).setLngLat([marker.lng, marker.lat]).addTo(map.current!)
      customMarkersRef.current.push(mapMarker)
    })
  }, [markers])

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingMarker || !map.current) return

    const canvas = map.current.getCanvas()
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const lngLat = map.current.unproject([x, y])
    setMarkers([...markers, { id: `M${Date.now()}`, lat: lngLat.lat, lng: lngLat.lng }])
    setIsPlacingMarker(false)
  }

  const removeMarker = (id: string) => {
    setMarkers(markers.filter((m) => m.id !== id))
  }

  const getTotalPassengers = () => nodes.reduce((sum, node) => sum + node.passengers, 0)
  const getHighestTrafficNode = () => nodes.reduce((max, node) => (node.passengers > max.passengers ? node : max))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Analytics Dashboard</h2>
        <p className="text-muted-foreground">View bus nodes, your live location, and set custom tracking routes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground mb-1">Total Nodes</p>
          <p className="text-2xl font-bold text-foreground">{nodes.length}</p>
          <p className="text-xs text-muted-foreground mt-2">Active transit hubs</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground mb-1">Total Passengers</p>
          <p className="text-2xl font-bold text-primary">{getTotalPassengers()}</p>
          <p className="text-xs text-muted-foreground mt-2">Across all nodes</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground mb-1">Highest Traffic</p>
          <p className="text-2xl font-bold text-accent">{getHighestTrafficNode().name}</p>
          <p className="text-xs text-muted-foreground mt-2">{getHighestTrafficNode().passengers} passengers</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapbox Map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <div ref={mapContainer} className="w-full h-96" onClick={handleMapClick} />

            {/* Placement Mode Indicator */}
            {isPlacingMarker && (
              <div className="absolute inset-0 bg-primary/5 flex items-center justify-center pointer-events-none">
                <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold">
                  Click on map to place marker
                </div>
              </div>
            )}

            {/* Map Controls */}
            <div className="bg-card border-t border-border p-4 flex gap-2">
              <button
                onClick={() => setIsPlacingMarker(!isPlacingMarker)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  isPlacingMarker ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {isPlacingMarker ? "📍 Placing Marker..." : "📍 Place Marker"}
              </button>
              <button
                onClick={() => setMarkers([])}
                className="px-4 py-2 rounded-lg font-semibold bg-muted text-foreground hover:bg-muted/80 transition-all"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Nodes List and Markers Panel */}
        <div className="space-y-4">
          {/* Nodes List */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <h3 className="font-bold text-foreground mb-3">Transit Nodes</h3>
            <div className="space-y-3 max-h-48 overflow-auto">
              {nodes.map((node) => (
                <div key={node.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                  <div className={`w-4 h-4 rounded-full ${node.color}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{node.name}</p>
                    <p className="text-xs text-muted-foreground">{node.passengers} passengers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Markers List */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <h3 className="font-bold text-foreground mb-3">Custom Markers ({markers.length})</h3>
            <div className="space-y-2 max-h-32 overflow-auto">
              {markers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No markers placed yet</p>
              ) : (
                markers.map((marker, idx) => (
                  <div
                    key={marker.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm text-foreground">Marker {idx + 1}</p>
                    <button
                      onClick={() => removeMarker(marker.id)}
                      className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
