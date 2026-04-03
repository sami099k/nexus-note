const express = require('express')
const router = express.Router()
const adminReviewController = require('../controllers/adminReviewController')
const authMiddleware = require('../middleware/auth')
const { requireAdmin } = require('../middleware/authorize')

router.use(authMiddleware)
router.use(requireAdmin)

router.get('/pending', adminReviewController.getPendingSubmissions)
router.get('/preview/:type/:id', adminReviewController.previewSubmission)
router.patch('/approve/:type/:id', adminReviewController.approveSubmission)
router.patch('/reject/:type/:id', adminReviewController.rejectSubmission)

module.exports = router
