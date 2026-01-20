"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { Search, MapPin, Activity, Users, Navigation, Trash2, Wifi, WifiOff, AlertCircle, Power } from "lucide-react"
import io from "socket.io-client"

interface TrackedLocation {
  trackId: string
  lat: number
  lng: number
  speed?: number
  accuracy?: number
  heading?: number
  timestamp?: string
  isActive?: boolean
  isRecent?: boolean
}

interface TrackedUser {
  trackId: string
  color: string
  displayName: string
  location?: TrackedLocation
  lastUpdated?: Date
  isActive: boolean
}

const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#A8E6CF",
  "#FF8B94",
  "#C7CEEA",
  "#95E1D3",
  "#F38181",
  "#AA96DA",
  "#FCBAD3"
]

const MAPBOX_TOKEN = "pk.eyJ1IjoicHJpdGh2aXdpdGgiLCJhIjoiY21qeDF6bGN3MGxvNzNmcjJxOThpcmQzayJ9.MLtVoDzJ_4yizAxgibwI-w"
const SERVER_URL = "http://localhost:5000"
const SESSION_ID = "default-session"

export default function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [trackedUsers, setTrackedUsers] = useState<TrackedUser[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("connecting")
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const socketRef = useRef<any>(null)
  const pathLinesRef = useRef<Map<string, string>>(new Map())
  const [showInstructions, setShowInstructions] = useState(true)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setDebugInfo(prev => [...prev.slice(-19), logMessage])
  }, [])

  // Save tracked users to server
  const saveSessionToServer = useCallback(async (users: TrackedUser[]) => {
    try {
      const trackedUsersData = users.map(u => ({
        trackId: u.trackId,
        color: u.color,
        displayName: u.displayName,
        addedAt: new Date()
      }))

      const response = await fetch(`${SERVER_URL}/api/session/${SESSION_ID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          trackedUsers: trackedUsersData
        })
      })

      if (!response.ok) {
        throw new Error("Failed to save session")
      }

      addDebugLog(`💾 Session saved: ${users.length} users`)
    } catch (error: any) {
      addDebugLog(`Error saving session: ${error.message}`)
    }
  }, [addDebugLog])

  // Create or update marker on map
  const updateMarker = useCallback((trackId: string, lat: number, lng: number, color: string, heading?: number) => {
    if (!map.current) return

    let marker = markersRef.current.get(trackId)

    if (!marker) {
      const el = document.createElement("div")
      el.style.width = "30px"
      el.style.height = "30px"
      el.style.backgroundColor = color
      el.style.borderRadius = "50%"
      el.style.border = "3px solid white"
      el.style.cursor = "pointer"
      el.style.boxShadow = `0 0 15px ${color}80, 0 0 30px ${color}40`
      el.style.transition = "all 0.3s ease"

      marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current)

      markersRef.current.set(trackId, marker)
      addDebugLog(`✓ Created marker for ${trackId}`)
    } else {
      marker.setLngLat([lng, lat])
    }

    // Add popup with info
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
      `<div style="padding: 8px; font-family: system-ui;">
        <strong style="color: ${color};">${trackId.substring(0, 12)}</strong><br/>
        <small>Lat: ${lat.toFixed(6)}<br/>Lng: ${lng.toFixed(6)}</small>
      </div>`
    )
    marker.setPopup(popup)
  }, [addDebugLog])

  // Draw path on map
  const drawPathOnMap = useCallback((trackId: string, points: any[], color: string) => {
    if (!map.current || points.length === 0) return

    const coordinates = points.map(p => [p.lng, p.lat])

    const sourceId = `path-${trackId}`
    const layerId = `path-layer-${trackId}`
    const glowLayerId = `path-glow-${trackId}`

    if (map.current.getLayer(glowLayerId)) map.current.removeLayer(glowLayerId)
    if (map.current.getLayer(layerId)) map.current.removeLayer(layerId)
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId)

    map.current.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates
        }
      }
    })

    map.current.addLayer({
      id: glowLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": color,
        "line-width": 8,
        "line-opacity": 0.3,
        "line-blur": 2
      }
    })

    map.current.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": color,
        "line-width": 4,
        "line-opacity": 0.9
      }
    })

    pathLinesRef.current.set(trackId, layerId)
    addDebugLog(`📍 Drew path for ${trackId}: ${points.length} points`)
  }, [addDebugLog])

  // Fetch path history for a specific track
  const fetchPathHistory = useCallback(async (trackId: string, color: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/path/${trackId}?hours=24`)

      if (!response.ok) {
        throw new Error("Failed to fetch path history")
      }

      const data = await response.json()
      const { points } = data

      if (points && points.length > 0) {
        drawPathOnMap(trackId, points, color)
      }
    } catch (error: any) {
      addDebugLog(`Error fetching path: ${error.message}`)
    }
  }, [drawPathOnMap, addDebugLog])

  // Load tracked users from server
  const loadSessionFromServer = useCallback(async () => {
    try {
      addDebugLog("📥 Loading saved session...")
      const response = await fetch(`${SERVER_URL}/api/session/${SESSION_ID}`)

      if (!response.ok) {
        throw new Error("Failed to load session")
      }

      const data = await response.json()
      const { session } = data

      if (session.trackedUsers && session.trackedUsers.length > 0) {
        addDebugLog(`Found ${session.trackedUsers.length} saved trackers`)
        
        const usersWithLocations = await Promise.all(
          session.trackedUsers.map(async (savedUser: any) => {
            try {
              const locationResponse = await fetch(`${SERVER_URL}/api/location/${savedUser.trackId}`)
              
              if (locationResponse.ok) {
                const location = await locationResponse.json()
                
                return {
                  trackId: savedUser.trackId,
                  color: savedUser.color,
                  displayName: savedUser.displayName,
                  location: {
                    trackId: location.trackId,
                    lat: location.lat,
                    lng: location.lng,
                    speed: location.speed,
                    accuracy: location.accuracy,
                    heading: location.heading,
                    timestamp: location.timestamp,
                    isActive: location.isActive,
                    isRecent: location.isRecent
                  },
                  isActive: location.isActive,
                  lastUpdated: new Date()
                }
              } else {
                return {
                  trackId: savedUser.trackId,
                  color: savedUser.color,
                  displayName: savedUser.displayName,
                  isActive: false
                }
              }
            } catch (error) {
              addDebugLog(`Error loading location for ${savedUser.trackId}`)
              return {
                trackId: savedUser.trackId,
                color: savedUser.color,
                displayName: savedUser.displayName,
                isActive: false
              }
            }
          })
        )

        setTrackedUsers(usersWithLocations)
        setShowInstructions(false)

        // Create markers and load paths
        usersWithLocations.forEach(user => {
          if (user.location) {
            updateMarker(user.trackId, user.location.lat, user.location.lng, user.color, user.location.heading)
            fetchPathHistory(user.trackId, user.color)
          }
        })

        addDebugLog(`✅ Session restored: ${usersWithLocations.length} trackers`)
      } else {
        addDebugLog("No saved trackers found")
      }
      
      setSessionLoaded(true)
    } catch (error: any) {
      addDebugLog(`Error loading session: ${error.message}`)
      setSessionLoaded(true)
    }
  }, [addDebugLog, updateMarker, fetchPathHistory])

  // Turn off tracker
  const turnOffTracker = async (trackId: string) => {
    try {
      addDebugLog(`Turning off tracker: ${trackId}`)

      const response = await fetch(`${SERVER_URL}/api/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          trackId,
          lat: 0,
          lng: 0,
          isActive: false,
          speed: 0,
          accuracy: 0,
          heading: null,
          timestamp: new Date()
        })
      })

      if (!response.ok) {
        throw new Error("Failed to turn off tracker")
      }

      setTrackedUsers(prev => prev.map(u => 
        u.trackId === trackId 
          ? { ...u, isActive: false, location: u.location ? { ...u.location, isActive: false } : undefined }
          : u
      ))

      addDebugLog(`Tracker ${trackId} turned off successfully`)
    } catch (error: any) {
      addDebugLog(`Error turning off tracker: ${error.message}`)
      setErrorMessage(`Failed to turn off tracker: ${error.message}`)
    }
  }

  // Add tracking ID
  const handleAddTrackingId = async () => {
    const trackId = searchInput.trim()

    if (!trackId) {
      setErrorMessage("Please enter a Track ID")
      return
    }

    if (trackedUsers.some(u => u.trackId === trackId)) {
      setErrorMessage("This Track ID is already being tracked")
      return
    }

    setIsSearching(true)
    setErrorMessage("")

    try {
      addDebugLog(`Adding tracker: ${trackId}`)

      const response = await fetch(`${SERVER_URL}/api/location/${trackId}`)

      if (!response.ok) {
        throw new Error("Track ID not found or inactive")
      }

      const location = await response.json()

      const newUser: TrackedUser = {
        trackId,
        color: USER_COLORS[trackedUsers.length % USER_COLORS.length],
        displayName: trackId.substring(0, 12),
        location: {
          trackId: location.trackId,
          lat: location.lat,
          lng: location.lng,
          speed: location.speed,
          accuracy: location.accuracy,
          heading: location.heading,
          timestamp: location.timestamp,
          isActive: location.isActive,
          isRecent: location.isRecent
        },
        isActive: location.isActive,
        lastUpdated: new Date()
      }

      const updatedUsers = [...trackedUsers, newUser]
      setTrackedUsers(updatedUsers)
      setShowInstructions(false)
      setSearchInput("")

      // Create marker
      updateMarker(trackId, location.lat, location.lng, newUser.color, location.heading)

      // Subscribe to socket updates
      if (socketRef.current) {
        socketRef.current.emit("track:subscribe", trackId)
      }

      // Fetch and draw path
      fetchPathHistory(trackId, newUser.color)

      // Save to server
      await saveSessionToServer(updatedUsers)

      // Center map on new user
      if (map.current) {
        map.current.flyTo({
          center: [location.lng, location.lat],
          zoom: 15,
          duration: 1500
        })
      }

      addDebugLog(`Successfully added tracker: ${trackId}`)
    } catch (error: any) {
      setErrorMessage(error.message)
      addDebugLog(`Error adding tracker: ${error.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  // Remove user
  const removeUser = async (trackId: string) => {
    addDebugLog(`Removing: ${trackId}`)

    if (socketRef.current) {
      socketRef.current.emit("track:unsubscribe", trackId)
    }

    // Remove path layers
    const layerId = pathLinesRef.current.get(trackId)
    if (layerId && map.current) {
      const glowLayerId = layerId.replace("path-layer-", "path-glow-")
      if (map.current.getLayer(glowLayerId)) map.current.removeLayer(glowLayerId)
      if (map.current.getLayer(layerId)) map.current.removeLayer(layerId)

      const sourceId = layerId.replace("path-layer-", "path-")
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId)
    }
    pathLinesRef.current.delete(trackId)

    // Remove marker
    const marker = markersRef.current.get(trackId)
    if (marker) {
      marker.remove()
      markersRef.current.delete(trackId)
    }

    const updatedUsers = trackedUsers.filter(u => u.trackId !== trackId)
    setTrackedUsers(updatedUsers)

    await saveSessionToServer(updatedUsers)

    if (selectedUser === trackId) {
      setSelectedUser(null)
    }

    if (updatedUsers.length === 0) {
      setShowInstructions(true)
    }
  }

  // Center on all users
  const centerOnAllUsers = () => {
    if (trackedUsers.length === 0 || !map.current) return

    const activeUsers = trackedUsers.filter(u => u.location)
    if (activeUsers.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()
    activeUsers.forEach(user => {
      if (user.location) {
        bounds.extend([user.location.lng, user.location.lat])
      }
    })

    map.current.fitBounds(bounds, { padding: 100, duration: 1500, maxZoom: 15 })
    addDebugLog("Centered on all users")
  }

  // Get time ago
  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Unknown"

    const date = new Date(timestamp)
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  // Initialize map
  useEffect(() => {
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes("YOUR_TOKEN")) {
      setErrorMessage("Please add your Mapbox token")
      addDebugLog("ERROR: Mapbox token not configured")
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    if (!mapContainer.current || map.current) return

    addDebugLog("Initializing Mapbox map...")

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [73.8567, 18.5204],
      zoom: 12,
      pitch: 0
    })

    map.current.on("load", () => {
      addDebugLog("✅ Map loaded successfully")
      setIsMapLoaded(true)
    })

    map.current.on("error", (e) => {
      addDebugLog(`Map error: ${e.error.message}`)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [addDebugLog])

  // Load session when map is ready
  useEffect(() => {
    if (isMapLoaded && !sessionLoaded) {
      loadSessionFromServer()
    }
  }, [isMapLoaded, sessionLoaded, loadSessionFromServer])

  // Socket.IO connection
  useEffect(() => {
    if (!isMapLoaded || !sessionLoaded) return

    addDebugLog("🔌 Connecting to Socket.IO server...")

    socketRef.current = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    })

    socketRef.current.on("connect", () => {
      setConnectionStatus("connected")
      addDebugLog("✅ Connected to server via Socket.IO")

      // Resubscribe to all tracked users
      trackedUsers.forEach(user => {
        socketRef.current.emit("track:subscribe", user.trackId)
        addDebugLog(`📡 Subscribed to ${user.trackId}`)
      })
    })

    socketRef.current.on("disconnect", () => {
      setConnectionStatus("disconnected")
      addDebugLog("❌ Disconnected from server")
    })

    socketRef.current.on("connect_error", (error: any) => {
      setConnectionStatus("disconnected")
      addDebugLog(`Connection error: ${error.message}`)
    })

    socketRef.current.on("location:updated", (data: TrackedLocation) => {
      addDebugLog(`📍 Location update: ${data.trackId} (${data.lat.toFixed(4)}, ${data.lng.toFixed(4)})`)

      setTrackedUsers(prev => {
        const userIndex = prev.findIndex(u => u.trackId === data.trackId)
        if (userIndex === -1) return prev

        const updatedUsers = [...prev]
        updatedUsers[userIndex] = {
          ...updatedUsers[userIndex],
          location: data,
          lastUpdated: new Date(),
          isActive: data.isActive ?? updatedUsers[userIndex].isActive
        }

        // Update marker
        const user = updatedUsers[userIndex]
        updateMarker(data.trackId, data.lat, data.lng, user.color, data.heading)

        return updatedUsers
      })
    })

    return () => {
      if (socketRef.current) {
        addDebugLog("Disconnecting socket...")
        socketRef.current.disconnect()
      }
    }
  }, [isMapLoaded, sessionLoaded, addDebugLog, updateMarker])

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", display: "flex", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div 
        ref={mapContainer} 
        style={{
          flex: 1,
          position: "relative",
          zIndex: 1
        }} 
      />

      <div style={{
        width: "360px",
        backgroundColor: "#ffffff",
        color: "#333",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid #e0e0e0",
        boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
        zIndex: 20,
        position: "relative"
      }}>
        <div style={{
          padding: "20px",
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#f8f9fa"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "16px"
          }}>
            <Users size={22} style={{ color: "#2196F3" }} />
            <h1 style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "#1a1a1a"
            }}>Live Tracking</h1>
            
            <div style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "16px",
              fontSize: "11px",
              fontWeight: 600,
              backgroundColor: connectionStatus === "connected" ? "#e8f5e9" : "#ffebee",
              color: connectionStatus === "connected" ? "#2e7d32" : "#c62828"
            }}>
              {connectionStatus === "connected" ? (
                <><Wifi size={14} /> Online</>
              ) : (
                <><WifiOff size={14} /> Offline</>
              )}
            </div>
          </div>

          <div style={{
            display: "flex",
            gap: "8px"
          }}>
            <input
              type="text"
              placeholder="Enter Track ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTrackingId()}
              disabled={isSearching}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                backgroundColor: "#fff",
                color: "#333",
                fontSize: "13px",
                outline: "none",
                opacity: isSearching ? 0.6 : 1,
                transition: "border-color 0.2s"
              }}
            />
            <button
              onClick={handleAddTrackingId}
              disabled={isSearching || !searchInput.trim()}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#2196F3",
                color: "#fff",
                fontWeight: 600,
                cursor: isSearching || !searchInput.trim() ? "not-allowed" : "pointer",
                opacity: isSearching || !searchInput.trim() ? 0.5 : 1,
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s"
              }}
            >
              <Search size={16} />
              Add
            </button>
          </div>
        </div>

        {errorMessage && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: "#ffebee",
            borderBottom: "1px solid #ffcdd2",
            color: "#c62828",
            fontSize: "13px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px"
          }}>
            <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
          {trackedUsers.length === 0 && showInstructions && (
            <div style={{
              padding: "32px 24px",
              backgroundColor: "#e3f2fd",
              borderRadius: "12px",
              textAlign: "center",
              color: "#1565c0",
              fontSize: "13px",
              lineHeight: "1.6",
              marginTop: "24px"
            }}>
              <MapPin size={32} style={{ margin: "0 auto 12px" }} />
              <p style={{ margin: 0, marginBottom: "8px", fontWeight: 700, fontSize: "15px" }}>No Active Trackers</p>
              <p style={{ margin: 0, fontSize: "12px", opacity: 0.9 }}>Enter a Track ID above to start monitoring locations in real-time</p>
            </div>
          )}

          {trackedUsers.map((user) => {
            const isSelected = selectedUser === user.trackId
            const isRecent = user.location?.isRecent
            
            return (
              <div
                key={user.trackId}
                onClick={() => {
                  setSelectedUser(user.trackId)
                  if (map.current && user.location) {
                    map.current.flyTo({
                      center: [user.location.lng, user.location.lat],
                      zoom: 16,
                      pitch: 50,
                      bearing: user.location.heading || 0,
                      duration: 2000
                    })
                  }
                }}
                style={{
                  padding: "14px",
                  backgroundColor: isSelected ? "#e3f2fd" : "#ffffff",
                  border: isSelected ? "2px solid #2196F3" : "1px solid #e0e0e0",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  position: "relative",
                  opacity: user.isActive ? 1 : 0.65,
                  boxShadow: isSelected ? "0 4px 12px rgba(33, 150, 243, 0.2)" : "0 2px 4px rgba(0,0,0,0.05)"
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px"
                }}>
                  <div style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    backgroundColor: user.color,
                    marginTop: "4px",
                    flexShrink: 0,
                    opacity: isRecent ? 1 : 0.4,
                    boxShadow: isRecent ? `0 0 12px ${user.color}, 0 0 24px ${user.color}60` : "none",
                    transition: "all 0.3s ease",
                    animation: isRecent ? "pulse 2s infinite" : "none"
                  }} />
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: "14px",
                      marginBottom: "4px",
                      color: "#1a1a1a"
                    }}>
                      {user.displayName}
                    </div>
                    <div style={{
                      fontSize: "11px",
                      color: "#999",
                      marginBottom: "8px",
                      fontFamily: "monospace"
                    }}>
                      {user.trackId.substring(0, 16)}...
                    </div>
                    
                    {user.location && (
                      <div style={{
                        fontSize: "11px",
                        color: "#666",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "6px",
                        lineHeight: "1.5"
                      }}>
                        <div>📍 {user.location.lat.toFixed(5)}</div>
                        <div>⏱️ {getTimeAgo(user.location.timestamp)}</div>
                        <div>🚀 {((user.location.speed || 0) * 3.6).toFixed(1)} km/h</div>
                        <div style={{ 
                          color: user.isActive ? "#2e7d32" : "#c62828",
                          fontWeight: 600
                        }}>
                          {user.isActive ? "✓ Active" : "✗ Offline"}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    flexShrink: 0
                  }}>
                    {user.isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          turnOffTracker(user.trackId)
                        }}
                        style={{
                          padding: "8px",
                          backgroundColor: "#fff3e0",
                          border: "1px solid #ffb74d",
                          borderRadius: "6px",
                          color: "#f57c00",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title="Turn off tracker"
                      >
                        <Power size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeUser(user.trackId)
                      }}
                      style={{
                        padding: "8px",
                        backgroundColor: "#ffebee",
                        border: "1px solid #ef5350",
                        borderRadius: "6px",
                        color: "#c62828",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title="Remove from tracking"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {trackedUsers.length > 0 && (
          <div style={{
            padding: "16px",
            borderTop: "1px solid #e0e0e0",
            display: "flex",
            gap: "10px",
            backgroundColor: "#f8f9fa"
          }}>
            <button
              onClick={centerOnAllUsers}
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#2196F3",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
            >
              <Navigation size={16} /> Center All
            </button>
            <button
              onClick={() => setShowDebug(!showDebug)}
              style={{
                padding: "12px 16px",
                backgroundColor: showDebug ? "#4ECDC4" : "#e0e0e0",
                color: showDebug ? "#fff" : "#666",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Activity size={16} />
            </button>
          </div>
        )}

        {showDebug && (
          <div style={{
            maxHeight: "180px",
            overflowY: "auto",
            padding: "12px 16px",
            backgroundColor: "#1a1f35",
            borderTop: "1px solid #2a3150",
            fontSize: "10px",
            fontFamily: "monospace",
            color: "#a0aec0",
            lineHeight: "1.5"
          }}>
            {debugInfo.length === 0 ? (
              <div style={{ color: "#718096", fontStyle: "italic" }}>Waiting for events...</div>
            ) : (
              debugInfo.map((log, i) => (
                <div key={i} style={{ 
                  marginBottom: "4px",
                  padding: "2px 0",
                  borderBottom: i < debugInfo.length - 1 ? "1px solid #2a3150" : "none"
                }}>
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { 
              opacity: 1;
              transform: scale(1);
            }
            50% { 
              opacity: 0.7;
              transform: scale(1.1);
            }
          }
          
          div[style*="overflow"]::-webkit-scrollbar {
            width: 8px;
          }
          div[style*="overflow"]::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          div[style*="overflow"]::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          div[style*="overflow"]::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
          
          button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          }
          
          button:active {
            transform: translateY(0);
          }
        `}
      </style>
    </div>
  )
}