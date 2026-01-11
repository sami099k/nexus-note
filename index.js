require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

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

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
