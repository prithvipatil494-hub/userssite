import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err))

// Bus Schema
const busSchema = new mongoose.Schema({
  busId: {
    type: String,
    unique: true,
    required: true,
  },
  busName: String,
  route: String,
  isActive: {
    type: Boolean,
    default: false,
  },
  currentLocation: {
    latitude: {
      type: Number,
      default: 40.7128,
    },
    longitude: {
      type: Number,
      default: -74.006,
    },
  },
  passengers: {
    type: Number,
    default: 0,
  },
  capacity: {
    type: Number,
    default: 60,
  },
  nextStop: String,
  eta: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const Bus = mongoose.model("Bus", busSchema)

// API Routes

// Get all buses
app.get("/api/buses", async (req, res) => {
  try {
    const buses = await Bus.find()
    res.json(buses)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get active buses only
app.get("/api/buses/active", async (req, res) => {
  try {
    const buses = await Bus.find({ isActive: true })
    res.json(buses)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single bus by ID
app.get("/api/buses/:busId", async (req, res) => {
  try {
    const bus = await Bus.findOne({ busId: req.params.busId })
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" })
    }
    res.json(bus)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Register/Create a new bus
app.post("/api/buses", async (req, res) => {
  try {
    const { busId, busName, route, passengers, capacity, nextStop, eta } = req.body

    const newBus = new Bus({
      busId,
      busName,
      route,
      passengers,
      capacity,
      nextStop,
      eta,
      isActive: false,
    })

    await newBus.save()
    res.status(201).json(newBus)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Activate/Deactivate bus tracking
app.put("/api/buses/:busId/toggle", async (req, res) => {
  try {
    const bus = await Bus.findOne({ busId: req.params.busId })
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" })
    }

    bus.isActive = !bus.isActive
    await bus.save()
    res.json(bus)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update bus location
app.put("/api/buses/:busId/location", async (req, res) => {
  try {
    const { latitude, longitude } = req.body
    const bus = await Bus.findOneAndUpdate(
      { busId: req.params.busId },
      { currentLocation: { latitude, longitude } },
      { new: true },
    )

    if (!bus) {
      return res.status(404).json({ error: "Bus not found" })
    }

    res.json(bus)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update bus details
app.put("/api/buses/:busId", async (req, res) => {
  try {
    const { passengers, nextStop, eta } = req.body
    const bus = await Bus.findOneAndUpdate({ busId: req.params.busId }, { passengers, nextStop, eta }, { new: true })

    if (!bus) {
      return res.status(404).json({ error: "Bus not found" })
    }

    res.json(bus)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete a bus
app.delete("/api/buses/:busId", async (req, res) => {
  try {
    const bus = await Bus.findOneAndDelete({ busId: req.params.busId })
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" })
    }
    res.json({ message: "Bus deleted successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
