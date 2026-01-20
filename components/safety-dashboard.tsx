"use client"

import React, { useState, useEffect } from "react"
import { 
  AlertTriangle, 
  Phone, 
  UserPlus, 
  Trash2, 
  Save, 
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Navigation,
  Shield,
  Bell,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Share2,
  Copy,
  Info
} from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

interface EmergencyContact {
  name: string
  phone: string
  relationship: string
  isPrimary: boolean
}

interface Alert {
  _id: string
  trackId: string
  location: {
    lat: number
    lng: number
  }
  message: string
  alertType: string
  status: string
  contactsNotified: Array<{
    name: string
    phone: string
    deliveryStatus: string
    sentAt: string
  }>
  createdAt: string
}

interface Stats {
  totalAlerts: number
  activeAlerts: number
  resolvedAlerts: number
  emergencyContacts: number
}

export default function SafetyDashboard() {
  // Generate a unique userId and persist it in localStorage
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('safety_user_id')
      if (!id) {
        id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('safety_user_id', id)
      }
      return id
    }
    return `user_${Math.random().toString(36).substr(2, 9)}`
  })

  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [newContact, setNewContact] = useState<EmergencyContact>({
    name: "",
    phone: "",
    relationship: "",
    isPrimary: false
  })
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isSendingSOS, setIsSendingSOS] = useState(false)
  const [sosMessage, setSosMessage] = useState("")
  const [alertType, setAlertType] = useState("sos")
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<Stats>({
    totalAlerts: 0,
    activeAlerts: 0,
    resolvedAlerts: 0,
    emergencyContacts: 0
  })
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [lastTrackId, setLastTrackId] = useState<string | null>(null)
  const [copiedTrackId, setCopiedTrackId] = useState(false)

  // Load data on mount
  useEffect(() => {
    checkBackendHealth()
    loadContacts()
    loadAlerts()
    loadStats()
    getCurrentLocation()
  }, [])

  // Check backend health
  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`)
      const data = await response.json()
      if (data.status === 'OK') {
        setBackendStatus('connected')
      } else {
        setBackendStatus('disconnected')
      }
    } catch (err) {
      console.error('Backend health check failed:', err)
      setBackendStatus('disconnected')
    }
  }

  const loadContacts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/emergency/contacts/${userId}`)
      const data = await response.json()
      if (data.success) {
        setContacts(data.contacts || [])
      }
    } catch (err) {
      console.error('Error loading contacts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAlerts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/emergency/alerts/${userId}?limit=10`)
      const data = await response.json()
      if (data.success) {
        setAlerts(data.alerts || [])
      }
    } catch (err) {
      console.error('Error loading alerts:', err)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/emergency/stats/${userId}`)
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const getCurrentLocation = () => {
    setIsGettingLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setIsGettingLocation(false)
          setError(null)
        },
        (err) => {
          console.error('Geolocation error:', err)
          setError('Failed to get location. Please enable location services.')
          setIsGettingLocation(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      setError('Geolocation is not supported by your browser')
      setIsGettingLocation(false)
    }
  }

  const addContact = () => {
    if (!newContact.name || !newContact.phone) {
      setError('Please enter both name and phone number')
      return
    }

    // Validate phone number
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
    if (!phoneRegex.test(newContact.phone)) {
      setError('Please enter a valid phone number (e.g., +919876543210)')
      return
    }

    setContacts([...contacts, newContact])
    setNewContact({ name: "", phone: "", relationship: "", isPrimary: false })
    setError(null)
    setSuccess('Contact added! Remember to save changes.')
    setTimeout(() => setSuccess(null), 3000)
  }

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
    setSuccess('Contact removed! Remember to save changes.')
    setTimeout(() => setSuccess(null), 3000)
  }

  const saveContacts = async () => {
    if (contacts.length === 0) {
      setError('Please add at least one emergency contact')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`${BACKEND_URL}/api/emergency/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, contacts })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Emergency contacts saved successfully!')
        loadStats()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to save contacts')
      }
    } catch (err) {
      console.error('Error saving contacts:', err)
      setError('Failed to save contacts. Please check if the backend server is running.')
    } finally {
      setIsSaving(false)
    }
  }

  const triggerSOS = async () => {
    if (contacts.length === 0) {
      setError('Please add and save emergency contacts before triggering SOS')
      return
    }

    if (!currentLocation) {
      setError('Getting your location... Please wait and try again.')
      getCurrentLocation()
      return
    }

    setIsSendingSOS(true)
    setError(null)

    try {
      const response = await fetch(`${BACKEND_URL}/api/emergency/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          location: currentLocation,
          message: sosMessage || 'Emergency SOS Alert - I need help!',
          alertType,
          userName: 'User' // You can add a name field if needed
        })
      })

      const data = await response.json()

      if (data.success) {
        const twilioStatus = data.twilioConfigured 
          ? `SMS sent to ${data.stats.sent} contact(s)!` 
          : `Alert created! (SMS simulated - Twilio not configured)`
        
        setSuccess(`🚨 ${twilioStatus} Track ID: ${data.trackId}`)
        setLastTrackId(data.trackId)
        setSosMessage("")
        loadAlerts()
        loadStats()
        
        // Auto-hide after 10 seconds
        setTimeout(() => setSuccess(null), 10000)
      } else {
        setError(data.error || 'Failed to send emergency alert')
      }
    } catch (err) {
      console.error('Error triggering SOS:', err)
      setError('Failed to send emergency alert. Please check if the backend server is running.')
    } finally {
      setIsSendingSOS(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/emergency/resolve/${alertId}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Alert marked as resolved')
        loadAlerts()
        loadStats()
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      console.error('Error resolving alert:', err)
      setError('Failed to resolve alert')
    }
  }

  const copyTrackId = async (trackId: string) => {
    try {
      await navigator.clipboard.writeText(trackId)
      setCopiedTrackId(true)
      setTimeout(() => setCopiedTrackId(false), 2000)
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = trackId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedTrackId(true)
      setTimeout(() => setCopiedTrackId(false), 2000)
    }
  }

  const shareTrackId = async (trackId: string) => {
    const shareData = {
      title: 'Emergency Alert - Live Location',
      text: `Track my emergency location using this ID: ${trackId}`,
      url: window.location.href
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await copyTrackId(trackId)
      }
    } catch (err) {
      console.error('Error sharing:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading Safety Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600 rounded-lg shadow-lg">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Safety Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600">Emergency SOS & Protection System</p>
              </div>
            </div>
            
            {/* Backend Status */}
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
              <div className={`w-2 h-2 rounded-full ${
                backendStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                backendStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`}></div>
              <span className="text-sm font-semibold text-gray-700">
                {backendStatus === 'connected' ? 'Connected' : 
                 backendStatus === 'checking' ? 'Connecting...' : 
                 'Disconnected'}
              </span>
              <button 
                onClick={checkBackendHealth}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="mb-4 sm:mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base text-green-800 break-words">{success}</p>
              {lastTrackId && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => copyTrackId(lastTrackId)}
                    className="text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {copiedTrackId ? <><CheckCircle className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Track ID</>}
                  </button>
                  {navigator.share && (
                    <button
                      onClick={() => shareTrackId(lastTrackId)}
                      className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3" /> Share
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 sm:mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm sm:text-base text-red-800 break-words">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 font-semibold">Total Alerts</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.totalAlerts}</p>
              </div>
              <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 font-semibold">Active</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.activeAlerts}</p>
              </div>
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 font-semibold">Resolved</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.resolvedAlerts}</p>
              </div>
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 font-semibold">Contacts</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.emergencyContacts}</p>
              </div>
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 opacity-20" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Emergency SOS Panel */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-2 border-red-200">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Emergency SOS</h2>
            </div>

            {/* Current Location Status */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Current Location
                </span>
                <button
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                >
                  <Navigation className={`w-3 h-3 sm:w-4 sm:h-4 ${isGettingLocation ? 'animate-spin' : ''}`} />
                  {isGettingLocation ? 'Getting...' : 'Refresh'}
                </button>
              </div>
              {currentLocation ? (
                <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                  <p className="font-mono">📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</p>
                  <a
                    href={`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View on Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-gray-500">Location not available</p>
              )}
            </div>

            {/* Alert Type */}
            <div className="mb-3 sm:mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Alert Type
              </label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="sos">🚨 SOS - General Emergency</option>
                <option value="accident">🚗 Accident</option>
                <option value="medical">🏥 Medical Emergency</option>
                <option value="threat">⚠️ Security Threat</option>
                <option value="other">📌 Other</option>
              </select>
            </div>

            {/* Custom Message */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Custom Message (Optional)
              </label>
              <textarea
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
                placeholder="Add details about the emergency..."
                rows={3}
                maxLength={200}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm sm:text-base"
              />
              <p className="text-xs text-gray-500 mt-1">{sosMessage.length}/200 characters</p>
            </div>

            {/* SOS Button */}
            <button
              onClick={triggerSOS}
              disabled={isSendingSOS || contacts.length === 0 || !currentLocation}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSendingSOS ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending Alert...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                  TRIGGER EMERGENCY SOS
                </>
              )}
            </button>

            {contacts.length === 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs sm:text-sm text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Please add and save emergency contacts before triggering SOS
                </p>
              </div>
            )}

            {!currentLocation && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Location is required for emergency alerts. Click "Refresh" above.
                </p>
              </div>
            )}
          </div>

          {/* Emergency Contacts Panel */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Emergency Contacts</h2>
            </div>

            {/* Add New Contact */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Add New Contact
              </h3>
              <div className="space-y-2 sm:space-y-3">
                <input
                  type="text"
                  placeholder="Name *"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
                <input
                  type="tel"
                  placeholder="Phone (e.g., +919876543210) *"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
                <input
                  type="text"
                  placeholder="Relationship (e.g., Family, Friend)"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
                <button
                  onClick={addContact}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Contact
                </button>
              </div>
            </div>

            {/* Contacts List */}
            <div className="mb-4">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-3">
                Saved Contacts ({contacts.length})
              </h3>
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Phone className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base">No emergency contacts added yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto pr-2">
                  {contacts.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{contact.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 truncate">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          {contact.phone}
                        </p>
                        {contact.relationship && (
                          <p className="text-xs text-gray-500 truncate">{contact.relationship}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeContact(index)}
                        className="ml-2 text-red-600 hover:text-red-700 p-2 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={saveContacts}
              disabled={isSaving || contacts.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Emergency Contacts
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="mt-4 sm:mt-6 bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Alerts</h2>
            </div>
            <button
              onClick={loadAlerts}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm sm:text-base">No alerts triggered yet</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Your emergency alerts will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    alert.status === 'active'
                      ? 'bg-red-50 border-red-300 shadow-md'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-bold text-sm sm:text-base text-gray-900">{alert.alertType.toUpperCase()}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          alert.status === 'active'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-green-200 text-green-800'
                        }`}>
                          {alert.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2 break-words">{alert.message}</p>

                      {alert.location && (
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <a
                            href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                            View Location
                          </a>
                          {alert.trackId && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">|</span>
                              <span className="font-mono text-xs">ID: {alert.trackId}</span>
                              <button
                                onClick={() => copyTrackId(alert.trackId)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Notifications Sent ({alert.contactsNotified.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {alert.contactsNotified.map((contact, idx) => (
                            <span
                              key={idx}
                              className={`text-xs px-2 py-1 rounded-full ${
                                contact.deliveryStatus === 'sent'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {contact.name}: {contact.deliveryStatus}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {alert.status === 'active' && (
                      <button
                        onClick={() => resolveAlert(alert._id)}
                        className="w-full sm:w-auto text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold whitespace-nowrap"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 sm:mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠️ Important Safety Information</p>
              <p>This system assists in emergencies but should not replace professional emergency services. In case of immediate danger, always call your local emergency number (911, 112, 100, etc.) first.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}