const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const { uploadSingleResource } = require('../middleware/upload')
const resourceController = require('../controllers/resourceController')
const reviewController = require('../controllers/reviewController')
const { ROLES } = require('../util/constants')

const router = Router()

router.use(authMiddleware)

router.post('/upload-url', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), resourceController.createUploadUrl)
router.post('/upload', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), uploadSingleResource, resourceController.createResource)
router.post('/', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), resourceController.createResource)
router.get('/', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), resourceController.getResources)
router.get('/moderation/pending', authorize(ROLES.SUBJECT_ADMIN, ROLES.OWNER), resourceController.listPendingResources)
router.get('/:id', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), resourceController.getResourceById)
router.get('/:id/download', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.ADMIN, ROLES.OWNER), resourceController.downloadResource)

router.patch('/:id/approve', authorize(ROLES.SUBJECT_ADMIN, ROLES.OWNER), resourceController.approveResource)
router.patch('/:id/reject', authorize(ROLES.SUBJECT_ADMIN, ROLES.OWNER), resourceController.rejectResource)
router.patch('/:id/flag', authorize(ROLES.SUBJECT_ADMIN, ROLES.OWNER), resourceController.flagResource)
router.delete('/:id', authorize(ROLES.SUBJECT_ADMIN, ROLES.OWNER), resourceController.deleteResource)

router.post('/:id/reviews', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), reviewController.createOrUpdateReview)
router.get('/:id/reviews', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), reviewController.listReviews)
router.patch('/:id/reviews/:reviewId', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), reviewController.updateReview)
router.delete('/:id/reviews/:reviewId', authorize(ROLES.USER, ROLES.SUBJECT_ADMIN, ROLES.OWNER), reviewController.deleteReview)

module.exports = router
