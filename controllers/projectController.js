const asyncHandler = require('../util/asyncHandler')
const Project = require('../models/Project')
const { ROLES } = require('../util/constants')

// Create project entry
const createProject = asyncHandler(async (req, res) => {
  const { title, projectLink, description, subjectId } = req.body

  if (!title || !projectLink || !subjectId) {
    return res.status(400).json({ message: 'Title, project link and subjectId are required' })
  }

  try {
    const project = await Project.create({
      title,
      projectLink,
      description,
      subjectId,
      createdBy: req.user.id
    })
    res.status(201).json({
      message: 'Your submission has been sent for admin approval',
      project
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You have already submitted this project title and link' })
    }
    throw err
  }
})

// Get projects for a subject
const getProjectsBySubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.params
  const isAdmin = req.user && (req.user.role === ROLES.ADMIN || req.user.role === ROLES.OWNER)

  const filter = { subjectId }
  if (!isAdmin) {
    filter.status = 'approved'
  }

  const projects = await Project.find(filter)
    .populate('createdBy', 'fullName')
    .sort({ isFeatured: -1, createdAt: -1 })

  res.json(projects)
})

// Get projects for a user
const getUserProjects = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const projects = await Project.find({ createdBy: userId })
    .populate('subjectId', 'name')
    .sort({ createdAt: -1 })

  res.json(projects)
})

// Update project status (Admin only)
const updateProjectStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }

  const project = await Project.findByIdAndUpdate(id, { status }, { new: true })
  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }

  res.json(project)
})

// Delete project
const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params
  const project = await Project.findById(id)

  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }

  const isAdmin = req.user.role === ROLES.ADMIN || req.user.role === ROLES.OWNER
  const isOwner = project.createdBy.toString() === req.user.id

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'Not authorized to delete this project' })
  }

  await Project.findByIdAndDelete(id)
  res.json({ message: 'Project deleted successfully' })
})

// Toggle featured status (Admin only)
const toggleFeaturedProject = asyncHandler(async (req, res) => {
  const { id } = req.params
  const project = await Project.findById(id)

  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }

  project.isFeatured = !project.isFeatured
  await project.save()

  res.json(project)
})

module.exports = {
  createProject,
  getProjectsBySubject,
  getUserProjects,
  updateProjectStatus,
  deleteProject,
  toggleFeaturedProject
}
