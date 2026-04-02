const asyncHandler = require('../util/asyncHandler')
const TechTrend = require('../models/TechTrend')
const { ROLES } = require('../util/constants')

const listTechTrends = asyncHandler(async (req, res) => {
  const { q, domainTag, source, page = 1, limit = 20 } = req.query
  const filters = {}

  if (q) {
    filters.$text = { $search: q }
  }

  if (domainTag) {
    filters.domainTags = domainTag
  }

  if (source) {
    filters.source = source
  }

  const pageNum = Math.max(Number(page), 1)
  const limitNum = Math.min(Math.max(Number(limit), 1), 100)
  const skip = (pageNum - 1) * limitNum

  const [items, total] = await Promise.all([
    TechTrend.find(filters)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('postedBy', 'fullName avatarUrl'),
    TechTrend.countDocuments(filters)
  ])

  return res.json({
    data: items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total
    }
  })
})

const createTechTrend = asyncHandler(async (req, res) => {
  const { title, summary = '', url = '', domainTags = [], source = 'INTERNAL', publishedAt, imageUrl = '' } = req.body

  if (!title) {
    return res.status(400).json({ message: 'title is required' })
  }

  const requestedSource = String(source || 'INTERNAL').toUpperCase()
  const isOwner = req.user && req.user.role === ROLES.OWNER
  const normalizedSource = isOwner && requestedSource === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL'

  const item = await TechTrend.create({
    title,
    summary,
    url,
    domainTags,
    source: normalizedSource,
    publishedAt: publishedAt || new Date(),
    imageUrl,
    postedBy: normalizedSource === 'INTERNAL' ? req.user.id : null
  })

  return res.status(201).json(item)
})

const deleteTechTrend = asyncHandler(async (req, res) => {
  const item = await TechTrend.findByIdAndDelete(req.params.id)

  if (!item) {
    return res.status(404).json({ message: 'Tech trend not found' })
  }

  return res.json({ message: 'Tech trend deleted' })
})

const ingestTechTrends = asyncHandler(async (req, res) => {
  const { items = [] } = req.body

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Provide a non-empty items array to ingest' })
  }

  const normalizedItems = items
    .filter((item) => item && item.title)
    .map((item) => ({
      title: item.title,
      summary: item.summary || '',
      url: item.url || '',
      imageUrl: item.imageUrl || '',
      domainTags: Array.isArray(item.domainTags) ? item.domainTags : [],
      source: 'EXTERNAL',
      publishedAt: item.publishedAt || new Date(),
      postedBy: null
    }))

  const created = await TechTrend.insertMany(normalizedItems)

  return res.status(201).json({ message: 'Tech trends ingested', count: created.length })
})

module.exports = {
  listTechTrends,
  createTechTrend,
  deleteTechTrend,
  ingestTechTrends
}
