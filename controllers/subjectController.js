const asyncHandler = require('../util/asyncHandler')
const Subject = require('../models/Subject')

const createSubject = asyncHandler(async (req, res) => {
  const { name, code, description = '' } = req.body

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
    createdBy: req.user.id
  })

  return res.status(201).json(subject)
})

const listSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({ isActive: true }).sort({ name: 1 })
  return res.json(subjects)
})

const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' })
  }

  return res.json(subject)
})

const updateSubject = asyncHandler(async (req, res) => {
  const allowedUpdates = ['name', 'code', 'description', 'isActive']
  const updates = {}

  allowedUpdates.forEach((key) => {
    if (Object.hasOwn(req.body, key)) {
      updates[key] = req.body[key]
    }
  })

  if (Object.hasOwn(updates, 'code')) {
    updates.code = String(updates.code).toUpperCase()
  }

  const subject = await Subject.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })

  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' })
  }

  return res.json(subject)
})

const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findByIdAndDelete(req.params.id)
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' })
  }

  return res.json({ message: 'Subject deleted' })
})

module.exports = {
  createSubject,
  listSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject
}
