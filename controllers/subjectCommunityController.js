const mongoose = require('mongoose')
const asyncHandler = require('../util/asyncHandler')
const Subject = require('../models/Subject')
const SubjectMembership = require('../models/SubjectMembership')
const DiscussionThread = require('../models/DiscussionThread')
const DiscussionReply = require('../models/DiscussionReply')
const FamousQuestion = require('../models/FamousQuestion')
const Roadmap = require('../models/Roadmap')
const Resource = require('../models/Resource')
const { ROLES, RESOURCE_STATUS, RESOURCE_TYPES } = require('../util/constants')

const parseTags = (tags) => {
  if (!tags) {
    return []
  }

  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean)
  }

  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

const assertValidSubject = async (subjectId) => {
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return null
  }

  return Subject.findById(subjectId)
}

const isPrivilegedForSubject = (user, subjectId) => {
  if (!user) {
    return false
  }

  if (user.role === ROLES.OWNER) {
    return true
  }

  if (user.role === ROLES.SUBJECT_ADMIN) {
    return user.assignedSubjectIds.includes(String(subjectId))
  }

  return false
}

const isMemberOfSubject = async (userId, subjectId) => {
  const membership = await SubjectMembership.findOne({
    userId,
    subjectId,
    status: 'ACTIVE'
  })

  return Boolean(membership)
}

const canAccessSubjectRoom = async (user, subjectId) => {
  if (isPrivilegedForSubject(user, subjectId)) {
    return true
  }

  return isMemberOfSubject(user.id, subjectId)
}

const ensureRoomAccess = async (req, res, subjectId) => {
  const allowed = await canAccessSubjectRoom(req.user, subjectId)
  if (!allowed) {
    res.status(403).json({
      message: 'Join this subject to access its discussion room and social sections'
    })
    return false
  }

  return true
}

const joinSubject = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params
  const subject = await assertValidSubject(subjectId)

  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' })
  }

  const membership = await SubjectMembership.findOneAndUpdate(
    {
      subjectId,
      userId: req.user.id
    },
    {
      status: 'ACTIVE',
      joinedAt: new Date()
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  )

  return res.status(201).json({ message: 'Joined subject room', membership })
})

const leaveSubject = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params

  const membership = await SubjectMembership.findOneAndUpdate(
    {
      subjectId,
      userId: req.user.id,
      status: 'ACTIVE'
    },
    {
      status: 'REMOVED'
    },
    { new: true }
  )

  if (!membership) {
    return res.status(404).json({ message: 'Active membership not found' })
  }

  return res.json({ message: 'Left subject room' })
})

const listMyMemberships = asyncHandler(async (req, res) => {
  const memberships = await SubjectMembership.find({
    userId: req.user.id,
    status: 'ACTIVE'
  }).select('subjectId')

  return res.json({
    subjectIds: memberships.map((membership) => String(membership.subjectId))
  })
})

const getMyMembership = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params
  const membership = await SubjectMembership.findOne({
    subjectId,
    userId: req.user.id,
    status: 'ACTIVE'
  })

  return res.json({
    isMember: Boolean(membership),
    membership
  })
})

const listSubjectMembers = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params

  if (!(await ensureRoomAccess(req, res, subjectId))) {
    return undefined
  }

  const memberships = await SubjectMembership.find({
    subjectId,
    status: 'ACTIVE'
  })
    .populate('userId', 'fullName role')
    .sort({ joinedAt: -1 })

  return res.json(
    memberships.map((item) => ({
      membershipId: item._id,
      joinedAt: item.joinedAt,
      user: item.userId
    }))
  )
})

const createDiscussionThread = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params
  const { title, body = '', tags = [], isTrending = false } = req.body

  const subject = await assertValidSubject(subjectId)
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' })
  }

  if (!(await ensureRoomAccess(req, res, subjectId))) {
    return undefined
  }

  if (!title) {
    return res.status(400).json({ message: 'title is required' })
  }

  const thread = await DiscussionThread.create({
    subjectId,
    createdBy: req.user.id,
    title,
    body,
    tags: parseTags(tags),
    isTrending: Boolean(isTrending) && isPrivilegedForSubject(req.user, subjectId)
  })

  return res.status(201).json(thread)
})

const listDiscussionThreads = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params
  const { q, page = 1, limit = 20 } = req.query

  const subject = await assertValidSubject(subjectId)
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' })
  }

  if (!(await ensureRoomAccess(req, res, subjectId))) {
    return undefined
  }

  const filters = { subjectId }
  if (q) {
    filters.$text = { $search: q }
  }

  const pageNum = Math.max(Number(page), 1)
  const limitNum = Math.min(Math.max(Number(limit), 1), 100)
  const skip = (pageNum - 1) * limitNum

  const [threads, total] = await Promise.all([
    DiscussionThread.find(filters)
      .populate('createdBy', 'fullName role')
      .sort({ isTrending: -1, lastActivityAt: -1 })
      .skip(skip)
      .limit(limitNum),
    DiscussionThread.countDocuments(filters)
  ])

  return res.json({
    data: threads,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total
    }
  })
})

const getDiscussionThread = asyncHandler(async (req, res) => {
  const { id: subjectId, threadId } = req.params

  const thread = await DiscussionThread.findOne({ _id: threadId, subjectId }).populate('createdBy', 'fullName role')
  if (!thread) {
    return res.status(404).json({ message: 'Discussion thread not found' })
  }

  if (!(await ensureRoomAccess(req, res, subjectId))) {
    return undefined
  }

  thread.viewCount += 1
  await thread.save()

  const replies = await DiscussionReply.find({ threadId: thread._id })
    .populate('createdBy', 'fullName role')
    .sort({ createdAt: 1 })

  return res.json({ thread, replies })
})

const addDiscussionReply = asyncHandler(async (req, res) => {
  const { id: subjectId, threadId } = req.params
  const { body } = req.body

  if (!body) {
    return res.status(400).json({ message: 'body is required' })
  }

  const thread = await DiscussionThread.findOne({ _id: threadId, subjectId })
  if (!thread) {
    return res.status(404).json({ message: 'Discussion thread not found' })
  }

  if (!(await ensureRoomAccess(req, res, subjectId))) {
    return undefined
  }

  const reply = await DiscussionReply.create({
    threadId,
    subjectId,
    createdBy: req.user.id,
    body
  })

  thread.replyCount += 1
  thread.lastActivityAt = new Date()
  await thread.save()

  return res.status(201).json(reply)
})

const listSubjectNotes = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params

  if (!(await ensureRoomAccess(req, res, subjectId))) {
    return undefined
  }

  const notes = await Resource.find({
    subjectId,
    status: RESOURCE_STATUS.APPROVED,
    resourceType: RESOURCE_TYPES.NOTES
  })
    .populate('uploadedBy', 'fullName')
    .sort({ downloadCount: -1, createdAt: -1 })

  return res.json(notes)
})

const createFamousQuestion = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params
  const { question, answer = '', tags = [], difficulty = 'MEDIUM' } = req.body

  if (!(await ensureRoomAccess(req, res, subjectId))) {
    return undefined
  }

  if (!question) {
    return res.status(400).json({ message: 'question is required' })
  }

  const item = await FamousQuestion.create({
    subjectId,
    question,
    answer,
    tags: parseTags(tags),
    difficulty,
    createdBy: req.user.id,
    isVerified: isPrivilegedForSubject(req.user, subjectId),
    verifiedBy: isPrivilegedForSubject(req.user, subjectId) ? req.user.id : undefined,
    verifiedAt: isPrivilegedForSubject(req.user, subjectId) ? new Date() : undefined
  })

  return res.status(201).json(item)
})

const listFamousQuestions = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params

  if (!(await ensureRoomAccess(req, res, subjectId))) {
    return undefined
  }

  const questions = await FamousQuestion.find({ subjectId })
    .populate('createdBy', 'fullName role')
    .sort({ isVerified: -1, createdAt: -1 })

  return res.json(questions)
})

const verifyFamousQuestion = asyncHandler(async (req, res) => {
  const { id: subjectId, questionId } = req.params

  if (!isPrivilegedForSubject(req.user, subjectId)) {
    return res.status(403).json({ message: 'Only subject moderator or owner can verify questions' })
  }

  const item = await FamousQuestion.findOneAndUpdate(
    {
      _id: questionId,
      subjectId
    },
    {
      isVerified: true,
      verifiedBy: req.user.id,
      verifiedAt: new Date()
    },
    { new: true }
  )

  if (!item) {
    return res.status(404).json({ message: 'Question not found' })
  }

  return res.json(item)
})

const createRoadmap = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params
  const { title, description = '', steps = [] } = req.body

  if (!isPrivilegedForSubject(req.user, subjectId)) {
    return res.status(403).json({ message: 'Only subject moderator or owner can create roadmaps' })
  }

  if (!title) {
    return res.status(400).json({ message: 'title is required' })
  }

  const normalizedSteps = Array.isArray(steps)
    ? steps
        .filter((step) => step && step.title)
        .map((step, index) => ({
          title: step.title,
          description: step.description || '',
          order: Number.isInteger(step.order) ? step.order : index + 1,
          resourceLinks: Array.isArray(step.resourceLinks) ? step.resourceLinks : []
        }))
    : []

  const roadmap = await Roadmap.create({
    subjectId,
    title,
    description,
    steps: normalizedSteps,
    createdBy: req.user.id,
    isPublished: true
  })

  return res.status(201).json(roadmap)
})

const listRoadmaps = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params

  const roadmaps = await Roadmap.find({ subjectId, isPublished: true })
    .populate('createdBy', 'fullName role')
    .sort({ createdAt: -1 })

  return res.json(roadmaps)
})

const getSubjectHub = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params

  const subject = await assertValidSubject(subjectId)
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' })
  }

  const [
    activeMembers,
    notesCount,
    approvedResources,
    threadsCount,
    famousQuestionCount,
    roadmapCount,
    trendingThreads,
    topNotes
  ] = await Promise.all([
    SubjectMembership.countDocuments({ subjectId, status: 'ACTIVE' }),
    Resource.countDocuments({ subjectId, status: RESOURCE_STATUS.APPROVED, resourceType: RESOURCE_TYPES.NOTES }),
    Resource.countDocuments({ subjectId, status: RESOURCE_STATUS.APPROVED }),
    DiscussionThread.countDocuments({ subjectId }),
    FamousQuestion.countDocuments({ subjectId, isVerified: true }),
    Roadmap.countDocuments({ subjectId, isPublished: true }),
    DiscussionThread.find({ subjectId }).sort({ isTrending: -1, replyCount: -1, lastActivityAt: -1 }).limit(5),
    Resource.find({ subjectId, status: RESOURCE_STATUS.APPROVED, resourceType: RESOURCE_TYPES.NOTES })
      .sort({ downloadCount: -1, averageRating: -1 })
      .limit(5)
      .select('title module topic tags downloadCount averageRating')
  ])

  return res.json({
    subject,
    metrics: {
      activeMembers,
      approvedResources,
      notesCount,
      threadsCount,
      famousQuestionCount,
      roadmapCount
    },
    highlights: {
      trendingThreads,
      topNotes
    }
  })
})

module.exports = {
  joinSubject,
  leaveSubject,
  listMyMemberships,
  getMyMembership,
  listSubjectMembers,
  createDiscussionThread,
  listDiscussionThreads,
  getDiscussionThread,
  addDiscussionReply,
  listSubjectNotes,
  createFamousQuestion,
  listFamousQuestions,
  verifyFamousQuestion,
  createRoadmap,
  listRoadmaps,
  getSubjectHub
}
