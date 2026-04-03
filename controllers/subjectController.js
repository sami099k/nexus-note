const asyncHandler = require('../util/asyncHandler')
const Subject = require('../models/Subject')
const SubjectMembership = require('../models/SubjectMembership')
const { ROLES } = require('../util/constants')

const normalizeVisibility = (value) => {
  const v = String(value || '').trim().toUpperCase()
  if (!v) return 'PUBLIC'
  if (v === 'PUBLIC' || v === 'PRIVATE') return v
  return 'PUBLIC'
}

const isCreator = (user, subject) => String(subject.createdBy) === String(user.id)

const isSubjectAdminFor = (user, subjectId) =>
  user &&
  user.role === ROLES.SUBJECT_ADMIN &&
  Array.isArray(user.assignedSubjectIds) &&
  user.assignedSubjectIds.map(String).includes(String(subjectId))

const canManageSubject = (user, subject) => {
  if (!user || !subject) return false
  if (user.role === ROLES.OWNER) return true
  if (isCreator(user, subject)) return true
  if (isSubjectAdminFor(user, subject._id)) return true
  return false
}

const canViewPrivateSubject = async (user, subject) => {
  if (!subject || subject.visibility !== 'PRIVATE') return true
  if (!user) return false
  if (canManageSubject(user, subject)) return true

  const membership = await SubjectMembership.exists({
    userId: user.id,
    subjectId: subject._id,
    status: 'ACTIVE'
  })

  return Boolean(membership)
}

const createSubject = asyncHandler(async (req, res) => {
  const { name, code, description = '', visibility } = req.body

  if (!name || !code) {
    return res.status(400).json({ message: 'name and code are required' })
  }

  const existing = await Subject.findOne({ $or: [{ name }, { code: String(code).toUpperCase() }] })
  if (existing) {
    return res.status(409).json({ message: 'Subject name or code already exists' })
  }

  const subject = await Subject.create({
    name,
    code,
    description,
    visibility: normalizeVisibility(visibility),
    createdBy: req.user.id
  })

  return res.status(201).json(subject)
})

const listSubjects = asyncHandler(async (req, res) => {
  const membershipDocs = await SubjectMembership.find({
    userId: req.user.id,
    status: 'ACTIVE'
  }).select('subjectId')

  const membershipSubjectIds = membershipDocs.map((item) => item.subjectId)
  const assignedSubjectIds = Array.isArray(req.user.assignedSubjectIds)
    ? req.user.assignedSubjectIds.map((id) => id)
    : []

  const subjects = await Subject.find({
    isActive: true,
    $or: [
      { visibility: 'PUBLIC' },
      { createdBy: req.user.id },
      { _id: { $in: membershipSubjectIds } },
      { _id: { $in: assignedSubjectIds } }
    ]
  }).sort({ name: 1 })

  return res.json(subjects)
})

const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' })
  }

  const allowed = await canViewPrivateSubject(req.user, subject)
  if (!allowed) {
    return res.status(403).json({ message: 'You do not have access to this subject' })
  }

  return res.json(subject)
})

const updateSubject = asyncHandler(async (req, res) => {
  const allowedUpdates = ['name', 'code', 'description', 'isActive', 'visibility']
  const updates = {}

  allowedUpdates.forEach((key) => {
    if (Object.hasOwn(req.body, key)) {
      updates[key] = req.body[key]
    }
  })

  if (Object.hasOwn(updates, 'code')) {
    updates.code = String(updates.code).toUpperCase()
  }

  if (Object.hasOwn(updates, 'visibility')) {
    updates.visibility = normalizeVisibility(updates.visibility)
  }

  const subject = await Subject.findById(req.params.id)

  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' })
  }

  if (!canManageSubject(req.user, subject)) {
    return res.status(403).json({ message: 'Not allowed to manage this subject' })
  }

  if (Object.hasOwn(updates, 'name') || Object.hasOwn(updates, 'code')) {
    const conflict = await Subject.findOne({
      _id: { $ne: subject._id },
      $or: [
        Object.hasOwn(updates, 'name') ? { name: updates.name } : null,
        Object.hasOwn(updates, 'code') ? { code: updates.code } : null
      ].filter(Boolean)
    })

    if (conflict) {
      return res.status(409).json({ message: 'Subject name or code already exists' })
    }
  }

  Object.assign(subject, updates)
  await subject.save()

  return res.json(subject)
})

const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' })
  }

  if (!canManageSubject(req.user, subject)) {
    return res.status(403).json({ message: 'Not allowed to delete this subject' })
  }

  await subject.deleteOne()

  return res.json({ message: 'Subject deleted' })
})

module.exports = {
  createSubject,
  listSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject
}
