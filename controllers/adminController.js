const asyncHandler = require('../util/asyncHandler')
const User = require('../models/User')
const Subject = require('../models/Subject')
const Resource = require('../models/Resource')
const DiscussionThread = require('../models/DiscussionThread')
const DiscussionReply = require('../models/DiscussionReply')
const FamousQuestion = require('../models/FamousQuestion')
const Notification = require('../models/Notification')
const { getGridFsBucket } = require('../util/gridfs')
const mongoose = require('mongoose')

const getAdminStats = asyncHandler(async (req, res) => {
  const [userCount, subjectCount, resourceCount, unreadNotifications] = await Promise.all([
    User.countDocuments(),
    Subject.countDocuments(),
    Resource.countDocuments(),
    Notification.countDocuments({ isRead: false })
  ])

  res.json({
    userCount,
    subjectCount,
    resourceCount,
    unreadNotifications
  })
})

const getAllResources = asyncHandler(async (req, res) => {
  const resources = await Resource.find()
    .populate('uploadedBy', 'fullName email')
    .populate('subjectId', 'name')
    .sort({ createdAt: -1 })

  res.json(resources)
})

const deleteResource = asyncHandler(async (req, res) => {
  const { id } = req.params

  const resource = await Resource.findById(id)
  if (!resource) {
    return res.status(404).json({ message: 'Resource not found' })
  }

  // Delete from GridFS if fileId exists
  if (resource.fileId) {
    try {
      const bucket = getGridFsBucket()
      await bucket.delete(new mongoose.Types.ObjectId(resource.fileId))
    } catch (err) {
      console.error('GridFS delete error:', err.message)
    }
  }

  await Resource.findByIdAndDelete(id)
  
  // Mark related notifications as read
  await Notification.updateMany({ resourceId: id }, { isRead: true })

  res.json({ message: 'Resource deleted successfully' })
})

const getAllThreads = asyncHandler(async (req, res) => {
  const threads = await DiscussionThread.find()
    .populate('createdBy', 'fullName')
    .populate('subjectId', 'name')
    .sort({ createdAt: -1 })

  res.json(threads)
})

const deleteThread = asyncHandler(async (req, res) => {
  const { id } = req.params

  const thread = await DiscussionThread.findById(id)
  if (!thread) {
    return res.status(404).json({ message: 'Thread not found' })
  }

  // Delete all replies first
  await DiscussionReply.deleteMany({ threadId: id })
  await DiscussionThread.findByIdAndDelete(id)

  res.json({ message: 'Thread and replies deleted' })
})

const getAllFamousQuestions = asyncHandler(async (req, res) => {
  const questions = await FamousQuestion.find()
    .populate('createdBy', 'fullName')
    .populate('subjectId', 'name')
    .sort({ createdAt: -1 })

  res.json(questions)
})

const deleteFamousQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params
  await FamousQuestion.findByIdAndDelete(id)
  res.json({ message: 'Famous question deleted' })
})

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ isRead: false })
    .populate('triggeredBy', 'fullName')
    .populate('subjectId', 'name')
    .sort({ createdAt: -1 })

  res.json(notifications)
})

const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params
  await Notification.findByIdAndUpdate(id, { isRead: true })
  res.json({ message: 'Notification marked as read' })
})

const adminUploadResource = asyncHandler(async (req, res) => {
  // Logic from resourceController.js simplified for admin
  // This expects the file to be handled by multer already
  const { title, description, resourceType, subjectId, module, topic, tags } = req.body

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' })
  }

  const resource = await Resource.create({
    title,
    description,
    resourceType,
    subjectId,
    module,
    topic,
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    fileId: req.file.id,
    fileName: req.file.filename,
    fileSize: req.file.size,
    contentType: req.file.contentType,
    uploadedBy: req.user.id,
    status: 'APPROVED' // Admin uploads are auto-approved
  })

  res.status(201).json(resource)
})

const adminCreateThread = asyncHandler(async (req, res) => {
  const { subjectId, title, body, tags } = req.body

  const thread = await DiscussionThread.create({
    subjectId,
    title,
    body,
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    createdBy: req.user.id
  })

  res.status(201).json(thread)
})

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 })
  res.json(users)
})

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (id === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete yourself' })
  }
  await User.findByIdAndDelete(id)
  res.json({ message: 'User deleted successfully' })
})

const getAllSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 })
  res.json(subjects)
})

const deleteSubject = asyncHandler(async (req, res) => {
  const { id } = req.params
  await Subject.findByIdAndDelete(id)
  // Optionally clean up related data
  res.json({ message: 'Subject deleted successfully' })
})

const adminCreateSubject = asyncHandler(async (req, res) => {
  const { name, code, description } = req.body
  if (!name || !code) {
    return res.status(400).json({ message: 'Name and Code are required' })
  }
  const subject = await Subject.create({
    name,
    code,
    description,
    createdBy: req.user.id,
    isActive: true
  })
  res.status(201).json(subject)
})

const getAllProjects = asyncHandler(async (req, res) => {
  const projects = await require('../models/Project').find()
    .populate('subjectId', 'name')
    .populate('createdBy', 'fullName')
    .sort({ createdAt: -1 })
  res.json(projects)
})

module.exports = {
  getAdminStats,
  getAllResources,
  deleteResource,
  getAllThreads,
  deleteThread,
  getAllFamousQuestions,
  deleteFamousQuestion,
  getNotifications,
  markNotificationRead,
  adminUploadResource,
  adminCreateThread,
  getAllUsers,
  deleteUser,
  getAllSubjects,
  deleteSubject,
  adminCreateSubject,
  getAllProjects
}
