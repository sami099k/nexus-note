const express = require('express')
const router = express.Router()
const projectController = require('../controllers/projectController')
const authMiddleware = require('../middleware/auth')
const { requireAdmin } = require('../middleware/authorize')

// Public or User routes (subject projects might be visible to all, but submission needs auth)
router.get('/subject/:subjectId', authMiddleware, projectController.getProjectsBySubject)

// Authenticated user routes
router.use(authMiddleware)
router.post('/create', projectController.createProject)
router.get('/user', projectController.getUserProjects)
router.delete('/:id', projectController.deleteProject)

// Admin only routes
router.patch('/status/:id', requireAdmin, projectController.updateProjectStatus)
router.patch('/feature/:id', requireAdmin, projectController.toggleFeaturedProject)

module.exports = router
