const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const userController = require('../controllers/userController')
const { ROLES } = require('../util/constants')

const router = Router()

router.use(authMiddleware)
router.use(authorize(ROLES.OWNER))

router.get('/', userController.listUsers)
router.get('/:id', userController.getUserById)
router.patch('/:id/role', userController.updateUserRole)
router.patch('/:id/subject-assignments', userController.updateSubjectAssignments)
router.patch('/:id/activate', userController.activateUser)

module.exports = router
