const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const authController = require('../controllers/authController')

const router = Router()

router.post('/bootstrap-owner', authController.bootstrapOwner)
router.post('/register', authController.register)
router.post('/login', authController.login)
router.patch('/me', authMiddleware, authController.updateMe)
router.post('/refresh', authMiddleware, authController.refresh)
router.get('/me', authMiddleware, authController.me)

module.exports = router
