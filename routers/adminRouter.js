const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const authMiddleware = require('../middleware/auth')
const { requireAdmin } = require('../middleware/authorize')
const { uploadSingleResource } = require('../middleware/upload')

// Apply requireAdmin to all routes in this router
router.use(authMiddleware)
router.use(requireAdmin)

router.get('/stats', adminController.getAdminStats)

router.get('/resources', adminController.getAllResources)
router.delete('/resources/:id', adminController.deleteResource)
router.post('/resources/upload', uploadSingleResource, adminController.adminUploadResource)

router.get('/projects', adminController.getAllProjects)

router.get('/threads', adminController.getAllThreads)
router.delete('/threads/:id', adminController.deleteThread)
router.post('/threads', adminController.adminCreateThread)

router.get('/famous-questions', adminController.getAllFamousQuestions)
router.delete('/famous-questions/:id', adminController.deleteFamousQuestion)

router.get('/notifications', adminController.getNotifications)
router.patch('/notifications/:id/read', adminController.markNotificationRead)

router.get('/users', adminController.getAllUsers)
router.delete('/users/:id', adminController.deleteUser)

router.get('/subjects', adminController.getAllSubjects)
router.post('/subjects', adminController.adminCreateSubject)
router.delete('/subjects/:id', adminController.deleteSubject)

module.exports = router
