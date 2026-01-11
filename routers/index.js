const { Router } = require('express')

const router = Router()

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

module.exports = router
