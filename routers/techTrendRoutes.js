const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const techTrendController = require('../controllers/techTrendController')
const { ROLES } = require('../util/constants')

const router = Router()

router.use(authMiddleware)

router.get('/', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), techTrendController.listTechTrends)
router.post('/', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), techTrendController.createTechTrend)
router.post('/ingest', authorize(ROLES.OWNER), techTrendController.ingestTechTrends)
router.delete('/:id', authorize(ROLES.OWNER), techTrendController.deleteTechTrend)

module.exports = router
