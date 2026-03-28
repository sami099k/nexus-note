require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDb = require('./config/dbConnect')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'API server is running' })
})

// Routers
try {
  const apiRouter = require('./routers')
  app.use('/api', apiRouter)
} catch (err) {
  // If routers not yet implemented, provide a default health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })
}

app.use((err, req, res, next) => {
  console.error(err)

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum allowed size is 50MB.' })
  }

  const statusCode = err.statusCode || 500
  return res.status(statusCode).json({
    message: err.message || 'Internal server error'
  })
})

const PORT = process.env.PORT || 5000

const startServer = async () => {
  try {
    await connectDb()
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  }
}

startServer()
