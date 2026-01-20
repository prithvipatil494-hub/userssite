"use client"

import React, { useState, useEffect, useRef } from "react"
import { Mail, Phone, MessageSquare, Trash2, Send, MapPin, Navigation, StopCircle, Copy, Check, Users, Share2, AlertCircle } from "lucide-react"
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import io from 'socket.io-client'

// IMPORTANT: Replace with your Mapbox token
mapboxgl.accessToken = "pk.eyJ1IjoicHJpdGh2aXdpdGgiLCJhIjoiY21qeDF6bGN3MGxvNzNmcjJxOThpcmQzayJ9.MLtVoDzJ_4yizAxgibwI-w"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

interface Feedback {
  id: string
  name: string
  email: string
  subject: string
  message: string
  timestamp: string
}

interface LocationData {
  lat: number
  lng: number
  speed?: number
  accuracy?: number
  timestamp?: Date
}

export default function SettingsView() {
  const [feedbackTab, setFeedbackTab] = useState("send")
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" })
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([
    {
      id: "1",
      name: "John Smith",
      email: "john@example.com",
      subject: "Bus service improvement",
      message: "The bus service is great but timing needs improvement during peak hours.",
      timestamp: "2024-01-10 14:30",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      subject: "App feature request",
      message: "Can you add a notification system for bus delays?",
      timestamp: "2024-01-09 10:15",
    },
  ])

  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null)
  
  // Live tracking state
  const [trackId, setTrackId] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [watchId, setWatchId] = useState<number | null>(null)
  const [socket, setSocket] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tracker' | 'viewer'>('tracker')
  const [viewTrackId, setViewTrackId] = useState<string>('')
  const [isViewing, setIsViewing] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [isGenerating, setIsGenerating] = useState(false)
  
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const pathLine = useRef<any>(null)

  // Initialize map
  useEffect(() => {
    if (feedbackTab === "live-map" && mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [73.8567, 18.5204], // Default to Nashik coordinates
        zoom: 12
      })

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }), 'top-right')

      // Wait for map to load before adding sources
      map.current.on('load', () => {
        if (map.current) {
          // Add source for path line
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: []
              }
            }
          })

          // Add layer for path line
          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.6
            }
          })
        }
      })
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [feedbackTab])

  // Initialize Socket.IO connection
  useEffect(() => {
    console.log('🔌 Connecting to backend:', BACKEND_URL)
    
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to server')
      setConnectionStatus('connected')
      setError(null)
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server')
      setConnectionStatus('disconnected')
    })

    newSocket.on('reconnect', () => {
      console.log('🔄 Reconnected to server')
      setConnectionStatus('connected')
      // Resubscribe to tracks if needed
      if (isTracking && trackId) {
        newSocket.emit('track:subscribe', trackId)
      }
      if (isViewing && viewTrackId) {
        newSocket.emit('track:subscribe', viewTrackId)
      }
    })

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err)
      setConnectionStatus('disconnected')
      setError('Failed to connect to server. Please check if the backend is running.')
    })

    newSocket.on('location:updated', (data) => {
      console.log('📍 Location updated:', data)
      const relevantTrackId = viewMode === 'tracker' ? trackId : viewTrackId
      
      if (data.trackId === relevantTrackId) {
        updateMapLocation(data.lat, data.lng)
        setCurrentLocation({
          lat: data.lat,
          lng: data.lng,
          speed: data.speed,
          accuracy: data.accuracy,
          timestamp: new Date(data.timestamp)
        })
        if (data.subscriberCount !== undefined) {
          setSubscriberCount(data.subscriberCount)
        }
      }
    })

    newSocket.on('track:subscribed', (data) => {
      console.log('✅ Subscribed to track:', data)
      if (data.currentLocation) {
        updateMapLocation(data.currentLocation.lat, data.currentLocation.lng)
        setCurrentLocation({
          lat: data.currentLocation.lat,
          lng: data.currentLocation.lng,
          speed: data.currentLocation.speed,
          accuracy: data.currentLocation.accuracy,
          timestamp: new Date(data.currentLocation.timestamp)
        })
      }
      if (data.subscriberCount !== undefined) {
        setSubscriberCount(data.subscriberCount)
      }
    })

    newSocket.on('track:unsubscribed', (data) => {
      console.log('✅ Unsubscribed from track:', data)
      if (data.subscriberCount !== undefined) {
        setSubscriberCount(data.subscriberCount)
      }
    })

    newSocket.on('track:status', (data) => {
      console.log('📊 Track status:', data)
      if (!data.isActive) {
        setError('Location sharing has been stopped by the user')
      }
    })

    newSocket.on('track:error', (data) => {
      console.error('Track error:', data)
      setError(data.error || 'An error occurred with the track')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Generate Track ID
  const generateTrackId = async () => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/track/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate Track ID')
      }
      
      const data = await response.json()
      setTrackId(data.trackId)
      console.log('✅ Track ID generated:', data.trackId)
      return data.trackId
    } catch (err) {
      console.error('Error generating track ID:', err)
      setError('Failed to generate Track ID. Please check if the backend server is running.')
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  // Update map marker location
  const updateMapLocation = (lat: number, lng: number) => {
    if (!map.current) return

    if (marker.current) {
      marker.current.setLngLat([lng, lat])
    } else {
      const el = document.createElement('div')
      el.className = 'custom-marker'
      el.style.width = '30px'
      el.style.height = '30px'
      el.style.borderRadius = '50%'
      el.style.backgroundColor = '#3b82f6'
      el.style.border = '3px solid white'
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
      
      marker.current = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current)
    }

    map.current.flyTo({
      center: [lng, lat],
      zoom: 15,
      essential: true
    })
  }

  // Send location update
  const sendLocationUpdate = async (lat: number, lng: number, speed?: number, accuracy?: number) => {
    if (!trackId || !socket) {
      console.warn('Cannot send location: trackId or socket missing')
      return
    }

    const locationData = {
      trackId,
      lat,
      lng,
      speed: speed || 0,
      accuracy: accuracy || 0
    }

    // Send via Socket.IO (primary method)
    socket.emit('location:update', locationData)

    // Also send via REST API as backup
    try {
      await fetch(`${BACKEND_URL}/api/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      })
    } catch (err) {
      console.error('Error sending location update via REST:', err)
    }

    setCurrentLocation({ lat, lng, speed, accuracy, timestamp: new Date() })
    updateMapLocation(lat, lng)
  }

  // Start tracking
  const startTracking = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    let currentTrackId = trackId
    if (!currentTrackId) {
      currentTrackId = await generateTrackId()
      if (!currentTrackId) return
    }

    // Subscribe to own track for getting viewer count
    if (socket) {
      socket.emit('track:subscribe', currentTrackId)
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, accuracy } = position.coords
        sendLocationUpdate(
          latitude,
          longitude,
          speed || undefined,
          accuracy
        )
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError(`Location error: ${err.message}`)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    )

    setWatchId(id)
    setIsTracking(true)
    setError(null)
  }

  // Stop tracking
  const stopTracking = async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }

    if (trackId && socket) {
      socket.emit('track:unsubscribe', trackId)
      
      // Deactivate on server
      try {
        await fetch(`${BACKEND_URL}/api/location/deactivate/${trackId}`, {
          method: 'POST'
        })
      } catch (err) {
        console.error('Error deactivating location:', err)
      }
    }

    setIsTracking(false)
    setSubscriberCount(0)
  }

  // Start viewing another user's location
  const startViewing = async () => {
    if (!viewTrackId.trim()) {
      setError('Please enter a valid Track ID')
      return
    }

    if (!socket) {
      setError('Not connected to server')
      return
    }

    // Subscribe to the track
    socket.emit('track:subscribe', viewTrackId.trim())
    
    setIsViewing(true)
    setError(null)
    
    // Fetch initial location
    try {
      const response = await fetch(`${BACKEND_URL}/api/location/${viewTrackId.trim()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.lat && data.lng) {
          updateMapLocation(data.lat, data.lng)
          setCurrentLocation({
            lat: data.lat,
            lng: data.lng,
            speed: data.speed,
            accuracy: data.accuracy,
            timestamp: new Date(data.timestamp)
          })
        }
      } else {
        setError('Track ID not found or inactive')
      }
    } catch (err) {
      console.error('Error fetching location:', err)
      setError('Failed to fetch location')
    }
  }

  // Stop viewing
  const stopViewing = () => {
    if (socket && viewTrackId) {
      socket.emit('track:unsubscribe', viewTrackId)
    }
    setIsViewing(false)
    setCurrentLocation(null)
    setSubscriberCount(0)
    if (marker.current) {
      marker.current.remove()
      marker.current = null
    }
  }

  // Copy track ID to clipboard
  const copyTrackId = async () => {
    if (!trackId) return
    try {
      await navigator.clipboard.writeText(trackId)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = trackId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  // Share via Web Share API
  const shareTrackId = async () => {
    if (!trackId) return
    
    const shareData = {
      title: 'Live Location Sharing',
      text: `Track my live location using this ID: ${trackId}`,
      url: window.location.href + `?track=${trackId}`
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        // Fallback to copy
        await copyTrackId()
      }
    } catch (err) {
      console.error('Error sharing:', err)
    }
  }

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.email && formData.subject && formData.message) {
      const newFeedback: Feedback = {
        id: Date.now().toString(),
        ...formData,
        timestamp: new Date().toLocaleString(),
      }
      setFeedbacks([newFeedback, ...feedbacks])
      setFormData({ name: "", email: "", subject: "", message: "" })
      alert("Feedback submitted successfully!")
    }
  }

  const deleteFeedback = (id: string) => {
    setFeedbacks(feedbacks.filter((f) => f.id !== id))
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Settings Tabs */}
      <div className="border-b border-border bg-card">
        <div className="flex gap-6 px-6 overflow-x-auto">
          <button
            onClick={() => setFeedbackTab("send")}
            className={`py-4 px-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              feedbackTab === "send"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Send Feedback
          </button>
          <button
            onClick={() => setFeedbackTab("received")}
            className={`py-4 px-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              feedbackTab === "received"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Received Feedback
          </button>
          <button
            onClick={() => setFeedbackTab("contacts")}
            className={`py-4 px-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              feedbackTab === "contacts"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Official Contacts
          </button>
          <button
            onClick={() => setFeedbackTab("live-map")}
            className={`py-4 px-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              feedbackTab === "live-map"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Live Tracking
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Send Feedback Tab */}
        {feedbackTab === "send" && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Send Us Your Feedback</h2>
              <p className="text-muted-foreground">
                Help us improve the bus tracking service with your valuable feedback
              </p>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4 bg-card border border-border rounded-lg p-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Your Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="What is your feedback about?"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Your Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Please share your thoughts, suggestions, or report any issues..."
                  rows={6}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Feedback
              </button>
            </form>
          </div>
        )}

        {/* Received Feedback Tab */}
        {feedbackTab === "received" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Feedback Received</h2>
              <p className="text-muted-foreground">All feedback submissions from users</p>
            </div>

            <div className="space-y-4">
              {feedbacks.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-lg">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No feedback received yet</p>
                </div>
              ) : (
                feedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{feedback.name}</h3>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                            {feedback.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {feedback.email}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteFeedback(feedback.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm font-semibold text-primary mb-2">{feedback.subject}</p>

                    <button
                      onClick={() => setExpandedFeedback(expandedFeedback === feedback.id ? null : feedback.id)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                      {expandedFeedback === feedback.id ? "Show less" : "Show more"}
                    </button>

                    {expandedFeedback === feedback.id && (
                      <div className="mt-3 p-3 bg-muted rounded-lg border border-border/50">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{feedback.message}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Official Contacts Tab */}
        {feedbackTab === "contacts" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Official Contacts</h2>
              <p className="text-muted-foreground">Get in touch with government officials and transit authorities</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Local Politicians */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Local Politicians
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-foreground">Mayor John Anderson</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4" />
                      mayor@city.gov
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      (555) 123-4567
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-foreground">Councilor Maria Garcia</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4" />
                      mgarcia@city.gov
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      (555) 234-5678
                    </p>
                  </div>
                </div>
              </div>

              {/* Municipal Officials */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Municipal Authorities
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-foreground">Transit Commissioner</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4" />
                      transit@municipality.gov
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      (555) 456-7890
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-foreground">Public Transport Director</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4" />
                      director@publictransit.gov
                    </p>
                  </div>
                </div>
              </div>

              {/* Bus Depots */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Bus Depots
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-foreground">Central Depot</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4" />
                      central@busdepot.com
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      (555) 789-0123
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-foreground">North Depot</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4" />
                      north@busdepot.com
                    </p>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Support & Information
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-foreground">Customer Support Hotline</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4" />
                      (555) 111-2222
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">24/7 Available</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-semibold text-foreground">Lost & Found</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4" />
                      (555) 333-4444
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Tracking Tab */}
        {feedbackTab === "live-map" && (
          <div className="h-full">
            {/* Connection Status */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Live Location Tracking</h2>
                <p className="text-muted-foreground">Share your location or view someone else's real-time location</p>
              </div>
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600 font-semibold">Connected</span>
                  </>
                )}
                {connectionStatus === 'connecting' && (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-yellow-600 font-semibold">Connecting...</span>
                  </>
                )}
                {connectionStatus === 'disconnected' && (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-red-600 font-semibold">Disconnected</span>
                  </>
                )}
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setViewMode('tracker')
                  if (isViewing) stopViewing()
                }}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                  viewMode === 'tracker'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Navigation className="w-4 h-4 inline mr-2" />
                Share My Location
              </button>
              <button
                onClick={() => {
                  setViewMode('viewer')
                  if (isTracking) stopTracking()
                }}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                  viewMode === 'viewer'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                View Someone's Location
              </button>
            </div>

            {/* Control Panel */}
            <div className="bg-card border border-border rounded-lg p-4 mb-4 shadow-sm">
              {viewMode === 'tracker' ? (
                <>
                  <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {!trackId && (
                        <button
                          onClick={generateTrackId}
                          disabled={isGenerating}
                          className="px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGenerating ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4" />
                              Generate Track ID
                            </>
                          )}
                        </button>
                      )}
                      
                      {trackId && (
                        <button
                          onClick={isTracking ? stopTracking : startTracking}
                          className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                            isTracking
                              ? "bg-red-500 hover:bg-red-600 text-white"
                              : "bg-green-500 hover:bg-green-600 text-white"
                          }`}
                        >
                          {isTracking ? (
                            <>
                              <StopCircle className="w-4 h-4" />
                              Stop Sharing
                            </>
                          ) : (
                            <>
                              <Navigation className="w-4 h-4" />
                              Start Sharing
                            </>
                          )}
                        </button>
                      )}
                      
                      {isTracking && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                          <span className="text-sm font-semibold">Sharing Live</span>
                        </div>
                      )}
                    </div>

                    {trackId && (
                      <div className="flex items-center gap-2">
                        {subscriberCount > 0 && (
                          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-semibold">{subscriberCount} viewing</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {trackId && (
                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-xs text-blue-600 font-semibold mb-1">Your Track ID</p>
                            <p className="font-mono font-bold text-lg text-blue-900 break-all">{trackId}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={copyTrackId}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                            >
                              {copiedId ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </>
                              )}
                            </button>
                            {navigator.share && (
                              <button
                                onClick={shareTrackId}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                              >
                                <Share2 className="w-4 h-4" />
                                Share
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-amber-800 font-semibold mb-1">How to Share Your Location</p>
                            <p className="text-sm text-amber-700">
                              Copy this Track ID and share it with anyone you want to track your location. 
                              They can enter it in the "View Someone's Location" tab to see your real-time position.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Enter Track ID
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={viewTrackId}
                          onChange={(e) => setViewTrackId(e.target.value.toUpperCase())}
                          placeholder="TRK-XXXXXXXXX"
                          className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                          disabled={isViewing}
                        />
                        <button
                          onClick={isViewing ? stopViewing : startViewing}
                          disabled={!viewTrackId.trim() && !isViewing}
                          className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isViewing
                              ? "bg-red-500 hover:bg-red-600 text-white"
                              : "bg-primary hover:opacity-90 text-primary-foreground"
                          }`}
                        >
                          {isViewing ? (
                            <>
                              <StopCircle className="w-4 h-4" />
                              Stop
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4" />
                              View
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isViewing && (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold">Viewing Live Location: {viewTrackId}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {currentLocation && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold mb-1">Latitude</p>
                    <p className="font-bold text-blue-900 text-sm">{currentLocation.lat.toFixed(6)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-lg border border-indigo-200">
                    <p className="text-xs text-indigo-600 font-semibold mb-1">Longitude</p>
                    <p className="font-bold text-indigo-900 text-sm">{currentLocation.lng.toFixed(6)}</p>
                  </div>
                  {currentLocation.speed !== undefined && (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 font-semibold mb-1">Speed</p>
                      <p className="font-bold text-green-900 text-sm">
                        {currentLocation.speed ? `${(currentLocation.speed * 3.6).toFixed(1)} km/h` : '0 km/h'}
                      </p>
                    </div>
                  )}
                  {currentLocation.accuracy !== undefined && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
                      <p className="text-xs text-purple-600 font-semibold mb-1">Accuracy</p>
                      <p className="font-bold text-purple-900 text-sm">{currentLocation.accuracy.toFixed(0)}m</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Map Container */}
            <div className="bg-card border-2 border-border rounded-lg overflow-hidden shadow-lg" style={{ height: 'calc(100vh - 500px)', minHeight: '400px' }}>
              <div ref={mapContainer} className="w-full h-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}