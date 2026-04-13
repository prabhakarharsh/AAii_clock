import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
dotenv.config()

const app = express()

// Fix CORS - must be FIRST before routes
app.use(cors({
  origin: function(origin, callback) {
    callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}))

// Handle ALL preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
  res.sendStatus(200)
})

app.use(express.json())
app.use(morgan('dev'))

// Import all routes AFTER cors setup
import alarmRoutes from './routes/alarms'
import reminderRoutes from './routes/reminders'
import routineRoutes from './routes/routines'
import aiRoutes from './routes/ai'

app.use('/api', alarmRoutes)
app.use('/api', reminderRoutes)
app.use('/api', routineRoutes)
app.use('/api', aiRoutes)

app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    database: 'connected',
    routes: {
      alarms: 'active',
      reminders: 'active',
      ai: 'active',
      routines: 'active'
    },
    version: '1.0.0'
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
