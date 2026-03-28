const mongoose = require('mongoose')
const asyncHandler = require('../util/asyncHandler')
const User = require('../models/User')
const { ROLES } = require('../util/constants')

const listUsers = asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 20 } = req.query
  const filters = {}

  if (role) {
    filters.role = role
  }

  const pageNum = Math.max(Number(page), 1)
  const limitNum = Math.min(Math.max(Number(limit), 1), 100)
  const skip = (pageNum - 1) * limitNum

  const [users, total] = await Promise.all([
    User.find(filters).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    User.countDocuments(filters)
  ])

  return res.json({
    data: users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total
    }
  })
})

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash')
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json(user)
})

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body

  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ message: 'Invalid role value' })
  }

  const user = await User.findById(req.params.id)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  user.role = role
  if (role !== ROLES.SUBJECT_ADMIN) {
    user.assignedSubjectIds = []
  }

  await user.save()

  return res.json({
    message: 'User role updated',
    user: {
      id: user._id,
      role: user.role,
      assignedSubjectIds: user.assignedSubjectIds
    }
  })
})

const updateSubjectAssignments = asyncHandler(async (req, res) => {
  const { assignedSubjectIds } = req.body

  if (!Array.isArray(assignedSubjectIds)) {
    return res.status(400).json({ message: 'assignedSubjectIds must be an array' })
  }

  const invalidId = assignedSubjectIds.find((id) => !mongoose.Types.ObjectId.isValid(id))
  if (invalidId) {
    return res.status(400).json({ message: `Invalid subject id: ${invalidId}` })
  }

  const user = await User.findById(req.params.id)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (user.role !== ROLES.SUBJECT_ADMIN) {
    return res.status(400).json({ message: 'Only SUBJECT_ADMIN can have subject assignments' })
  }

  user.assignedSubjectIds = assignedSubjectIds
  await user.save()

  return res.json({
    message: 'Subject assignments updated',
    user: {
      id: user._id,
      role: user.role,
      assignedSubjectIds: user.assignedSubjectIds
    }
  })
})

const activateUser = asyncHandler(async (req, res) => {
  const { isActive } = req.body

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive must be boolean' })
  }

  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select('-passwordHash')

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json({ message: 'User status updated', user })
})

module.exports = {
  listUsers,
  getUserById,
  updateUserRole,
  updateSubjectAssignments,
  activateUser
}
