const asyncHandler = require('../util/asyncHandler')
const Resource = require('../models/Resource')
const Project = require('../models/Project')
const Notification = require('../models/Notification')
const { RESOURCE_STATUS } = require('../util/constants')

const getPendingSubmissions = asyncHandler(async (req, res) => {
  const [resources, projects] = await Promise.all([
    Resource.find({ status: RESOURCE_STATUS.PENDING })
      .populate('subjectId', 'name')
      .populate('uploadedBy', 'fullName email')
      .sort({ createdAt: -1 }),
    Project.find({ status: 'pending' })
      .populate('subjectId', 'name')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
  ])

  res.json({
    resources,
    projects
  })
})

const approveSubmission = asyncHandler(async (req, res) => {
  const { id, type } = req.params // type: 'resource' or 'project'

  let item
  let userId
  let title

  if (type === 'resource') {
    item = await Resource.findByIdAndUpdate(id, { status: RESOURCE_STATUS.APPROVED }, { new: true })
    userId = item?.uploadedBy
    title = item?.title
  } else if (type === 'project') {
    item = await Project.findByIdAndUpdate(id, { status: 'approved' }, { new: true })
    userId = item?.createdBy
    title = item?.title
  }

  if (!item) {
    return res.status(404).json({ message: 'Item not found' })
  }

  // Notify user
  await Notification.create({
    recipientRole: 'USER',
    userId,
    type: 'submission_approved',
    message: `Your submission "${title}" has been approved.`,
    subjectId: item.subjectId,
    triggeredBy: req.user.id
  })

  res.json({ message: 'Submission approved', item })
})

const rejectSubmission = asyncHandler(async (req, res) => {
  const { id, type } = req.params
  const { reason } = req.body

  let item
  let userId
  let title

  if (type === 'resource') {
    item = await Resource.findByIdAndUpdate(id, { 
      status: RESOURCE_STATUS.REJECTED,
      rejectionReason: reason 
    }, { new: true })
    userId = item?.uploadedBy
    title = item?.title
  } else if (type === 'project') {
    item = await Project.findByIdAndUpdate(id, { 
      status: 'rejected',
      rejectionReason: reason 
    }, { new: true })
    userId = item?.createdBy
    title = item?.title
  }

  if (!item) {
    return res.status(404).json({ message: 'Item not found' })
  }

  await Notification.create({
    recipientRole: 'USER',
    userId,
    type: 'submission_rejected',
    message: `Your submission "${title}" was rejected: ${reason}`,
    subjectId: item.subjectId,
    triggeredBy: req.user.id
  })

  res.json({ message: 'Submission rejected', item })
})

const previewSubmission = asyncHandler(async (req, res) => {
  const { id, type } = req.params
  let item
  if (type === 'resource') {
    item = await Resource.findById(id).populate('subjectId uploadedBy')
  } else {
    item = await Project.findById(id).populate('subjectId createdBy')
  }
  
  if (!item) return res.status(404).json({ message: 'Not found' })
  res.json(item)
})

module.exports = {
  getPendingSubmissions,
  approveSubmission,
  rejectSubmission,
  previewSubmission
}
