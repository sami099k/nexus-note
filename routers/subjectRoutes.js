const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const subjectController = require('../controllers/subjectController')
const subjectCommunityController = require('../controllers/subjectCommunityController')
const { ROLES } = require('../util/constants')

const router = Router()

router.use(authMiddleware)

router.get('/', subjectController.listSubjects)

router.get('/my-memberships', subjectCommunityController.listMyMemberships)

router.get('/:id/hub', subjectCommunityController.getSubjectHub)
router.post('/:id/join', subjectCommunityController.joinSubject)
router.delete('/:id/join', subjectCommunityController.leaveSubject)
router.get('/:id/membership', subjectCommunityController.getMyMembership)
router.get('/:id/members', subjectCommunityController.listSubjectMembers)

router.get('/:id/discussions', subjectCommunityController.listDiscussionThreads)
router.post('/:id/discussions', subjectCommunityController.createDiscussionThread)
router.get('/:id/discussions/:threadId', subjectCommunityController.getDiscussionThread)
router.post('/:id/discussions/:threadId/replies', subjectCommunityController.addDiscussionReply)

router.get('/:id/notes', subjectCommunityController.listSubjectNotes)

router.get('/:id/famous-questions', subjectCommunityController.listFamousQuestions)
router.post('/:id/famous-questions', subjectCommunityController.createFamousQuestion)
router.patch('/:id/famous-questions/:questionId/verify', subjectCommunityController.verifyFamousQuestion)

router.get('/:id/roadmaps', subjectCommunityController.listRoadmaps)
router.post('/:id/roadmaps', subjectCommunityController.createRoadmap)

router.get('/:id', subjectController.getSubjectById)

router.post('/', authorize(ROLES.OWNER), subjectController.createSubject)
router.patch('/:id', authorize(ROLES.OWNER), subjectController.updateSubject)
router.delete('/:id', authorize(ROLES.OWNER), subjectController.deleteSubject)

module.exports = router
