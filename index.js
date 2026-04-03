require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const connectDb = require('./config/dbConnect')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve frontend static files (HTML pages, auth.js, etc.)
app.use(express.static(path.join(__dirname, 'frontend')))

// Root → serve the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'))
})

// Routers
try {
  const apiRouter = require('./routers')
  app.use('/api', apiRouter)
} catch (err) {
  console.error('API Router Error:', err)
  // If routers not yet implemented, provide a default health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })
}

app.use((err, req, res, next) => {
  const errorMessage = String(err?.message || '')

  if (/SSL routines|tlsv1 alert|MongoServerSelectionError|Could not connect to any servers/i.test(errorMessage)) {
    console.error('Database connectivity error:', errorMessage)
  } else {
    console.error(err)
  }

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum allowed size is 50MB.' })
  }

  const isDbConnectivityError =
    err?.name === 'MongooseServerSelectionError' ||
    /Could not connect to any servers in your MongoDB Atlas cluster/i.test(errorMessage)

  const isTlsError =
    /SSL routines|tlsv1 alert|SSL alert number|ssl3_read_bytes/i.test(errorMessage)

  if (isDbConnectivityError || isTlsError) {
    return res.status(503).json({
      message: 'Database connection issue. Please verify Atlas network access/whitelist and try again.'
    })
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

    try {
      const { seedDefaults } = require('./util/seed')
      await seedDefaults()
    } catch (seedErr) {
      console.warn('Seed step skipped:', seedErr?.message || seedErr)
    }

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  }
}

startServer()
