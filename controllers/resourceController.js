const crypto = require('crypto')
const mongoose = require('mongoose')
const stream = require('stream')
const asyncHandler = require('../util/asyncHandler')
const Resource = require('../models/Resource')
const Subject = require('../models/Subject')
const Download = require('../models/Download')
const { getGridFsBucket } = require('../util/gridfs')
const { canModerateSubject } = require('../middleware/authorize')
const { ROLES, RESOURCE_STATUS, RESOURCE_TYPES } = require('../util/constants')

const MAX_FILE_SIZE = 50 * 1024 * 1024

const parseTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean)
  }

  if (!tags) {
    return []
  }

  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

const createUploadUrl = asyncHandler(async (req, res) => {
  return res.status(410).json({
    message: 'Upload URL flow is disabled in MongoDB-only mode. Use POST /api/resources/upload (multipart/form-data).'
  })
})

const createResource = asyncHandler(async (req, res) => {
  const { title, description = '', resourceType, subjectId, module, topic = '' } = req.body
  const tags = parseTags(req.body.tags)

  if (!title || !resourceType || !subjectId || !module) {
    return res.status(400).json({ message: 'title, resourceType, subjectId and module are required' })
  }

  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return res.status(400).json({ message: 'Invalid subjectId' })
  }

  if (!Object.values(RESOURCE_TYPES).includes(resourceType)) {
    return res.status(400).json({ message: 'Invalid resourceType' })
  }

  const subjectExists = await Subject.exists({ _id: subjectId, isActive: true })
  if (!subjectExists) {
    return res.status(404).json({ message: 'Subject not found or inactive' })
  }

  if (!req.file) {
    return res.status(400).json({ message: 'A file is required in multipart field "file"' })
  }

  if (req.file.size <= 0 || req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ message: 'File size must be between 1 byte and 50MB' })
  }

  const bucket = getGridFsBucket()
  const objectKey = `resources/${req.user.id}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${req.file.originalname}`

  const uploadStream = bucket.openUploadStream(objectKey, {
    contentType: req.file.mimetype,
    metadata: {
      originalFileName: req.file.originalname,
      uploadedBy: req.user.id
    }
  })

  const inputStream = new stream.PassThrough()
  inputStream.end(req.file.buffer)

  const gridFsFileId = await new Promise((resolve, reject) => {
    inputStream
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id))
  })

  const resource = await Resource.create({
    title,
    description,
    resourceType,
    subjectId,
    module,
    topic,
    tags,
    file: {
      storageProvider: 'MONGODB_GRIDFS',
      bucket: 'resourceFiles',
      gridFsFileId,
      objectKey,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size
    },
    uploadedBy: req.user.id,
    status: RESOURCE_STATUS.PENDING
  })

  return res.status(201).json(resource)
})

const getResources = asyncHandler(async (req, res) => {
  const {
    q,
    subjectId,
    module,
    resourceType,
    tags,
    status,
    page = 1,
    limit = 20,
    sortBy = 'newest'
  } = req.query

  const filters = {}

  if (req.user.role === ROLES.USER) {
    filters.status = RESOURCE_STATUS.APPROVED
  } else if (status && Object.values(RESOURCE_STATUS).includes(status)) {
    filters.status = status
  } else {
    filters.status = { $ne: RESOURCE_STATUS.DELETED }
  }

  if (q) {
    filters.$text = { $search: q }
  }

  if (subjectId) {
    filters.subjectId = subjectId
  }

  if (module) {
    filters.module = module
  }

  if (resourceType) {
    filters.resourceType = resourceType
  }

  if (tags) {
    const parsedTags = parseTags(tags)

    if (parsedTags.length > 0) {
      filters.tags = { $in: parsedTags }
    }
  }

  const sortMap = {
    newest: { createdAt: -1 },
    downloads: { downloadCount: -1 },
    rating: { averageRating: -1 }
  }

  const pageNum = Math.max(Number(page), 1)
  const limitNum = Math.min(Math.max(Number(limit), 1), 100)
  const skip = (pageNum - 1) * limitNum

  const [resources, total] = await Promise.all([
    Resource.find(filters)
      .populate('subjectId', 'name code')
      .populate('uploadedBy', 'fullName role')
      .sort(sortMap[sortBy] || sortMap.newest)
      .skip(skip)
      .limit(limitNum),
    Resource.countDocuments(filters)
  ])

  return res.json({
    data: resources,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total
    }
  })
})

const getResourceById = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id)
    .populate('subjectId', 'name code')
    .populate('uploadedBy', 'fullName role')

  if (!resource || resource.status === RESOURCE_STATUS.DELETED) {
    return res.status(404).json({ message: 'Resource not found' })
  }

  if (req.user.role === ROLES.USER && resource.status !== RESOURCE_STATUS.APPROVED) {
    return res.status(403).json({ message: 'Resource is not available for users' })
  }

  return res.json(resource)
})

const downloadResource = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id)

  if (!resource || resource.status === RESOURCE_STATUS.DELETED) {
    return res.status(404).json({ message: 'Resource not found' })
  }

  if (req.user.role === ROLES.USER && resource.status !== RESOURCE_STATUS.APPROVED) {
    return res.status(403).json({ message: 'Resource is not downloadable for users' })
  }

  resource.downloadCount += 1
  await resource.save()

  const ipRaw = req.ip || req.headers['x-forwarded-for'] || ''
  const ipHash = ipRaw ? crypto.createHash('sha256').update(String(ipRaw)).digest('hex') : ''

  await Download.create({
    resourceId: resource._id,
    userId: req.user.id,
    downloadedAt: new Date(),
    ipHash
  })

  if (!resource.file || !resource.file.gridFsFileId) {
    return res.status(404).json({ message: 'Resource file is missing' })
  }

  const bucket = getGridFsBucket()
  const downloadStream = bucket.openDownloadStream(resource.file.gridFsFileId)

  res.setHeader('Content-Type', resource.file.mimeType || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${resource.file.originalFileName}"`)
  res.setHeader('X-Download-Count', resource.downloadCount)

  downloadStream.on('error', () => {
    if (!res.headersSent) {
      res.status(404).json({ message: 'File not found in storage' })
    }
  })

  return downloadStream.pipe(res)
})

const moderateResource = async (req, res, status) => {
  const { reason = '' } = req.body
  const resource = await Resource.findById(req.params.id)

  if (!resource || resource.status === RESOURCE_STATUS.DELETED) {
    return res.status(404).json({ message: 'Resource not found' })
  }

  if (!canModerateSubject(req.user, resource.subjectId.toString())) {
    return res.status(403).json({ message: 'You cannot moderate this subject' })
  }

  resource.status = status
  resource.moderation = {
    moderatedBy: req.user.id,
    moderatedAt: new Date(),
    reason
  }

  await resource.save()

  return res.json({ message: `Resource ${status.toLowerCase()}`, resource })
}

const approveResource = asyncHandler(async (req, res) => {
  return moderateResource(req, res, RESOURCE_STATUS.APPROVED)
})

const rejectResource = asyncHandler(async (req, res) => {
  return moderateResource(req, res, RESOURCE_STATUS.REJECTED)
})

const flagResource = asyncHandler(async (req, res) => {
  return moderateResource(req, res, RESOURCE_STATUS.FLAGGED)
})

const deleteResource = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id)

  if (!resource || resource.status === RESOURCE_STATUS.DELETED) {
    return res.status(404).json({ message: 'Resource not found' })
  }

  if (!canModerateSubject(req.user, resource.subjectId.toString())) {
    return res.status(403).json({ message: 'You cannot moderate this subject' })
  }

  if (resource.file?.gridFsFileId) {
    const bucket = getGridFsBucket()
    try {
      await bucket.delete(resource.file.gridFsFileId)
    } catch (err) {
      // Ignore missing-file cleanup errors to keep moderation action idempotent.
    }
  }

  resource.status = RESOURCE_STATUS.DELETED
  resource.moderation = {
    moderatedBy: req.user.id,
    moderatedAt: new Date(),
    reason: req.body.reason || ''
  }

  await resource.save()

  return res.json({ message: 'Resource deleted', resource })
})

const listPendingResources = asyncHandler(async (req, res) => {
  const filters = {
    status: RESOURCE_STATUS.PENDING
  }

  if (req.user.role === ROLES.SUBJECT_ADMIN) {
    filters.subjectId = { $in: req.user.assignedSubjectIds }
  }

  const resources = await Resource.find(filters)
    .populate('subjectId', 'name code')
    .populate('uploadedBy', 'fullName email')
    .sort({ createdAt: -1 })

  return res.json(resources)
})

module.exports = {
  createUploadUrl,
  createResource,
  getResources,
  getResourceById,
  downloadResource,
  approveResource,
  rejectResource,
  flagResource,
  deleteResource,
  listPendingResources
}
