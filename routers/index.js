const { Router } = require('express')

const router = Router()

const authRoutes = require('./authRoutes')
const userRoutes = require('./userRoutes')
const subjectRoutes = require('./subjectRoutes')
const resourceRoutes = require('./resourceRoutes')
const techTrendRoutes = require('./techTrendRoutes')

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/subjects', subjectRoutes)
router.use('/resources', resourceRoutes)
router.use('/tech-trends', techTrendRoutes)

module.exports = router
