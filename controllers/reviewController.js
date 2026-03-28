const asyncHandler = require('../util/asyncHandler')
const Review = require('../models/Review')
const Resource = require('../models/Resource')
const Download = require('../models/Download')
const { ROLES, RESOURCE_STATUS } = require('../util/constants')

const recalculateRating = async (resourceId) => {
  const stats = await Review.aggregate([
    { $match: { resourceId } },
    {
      $group: {
        _id: '$resourceId',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ])

  const averageRating = stats[0] ? Number(stats[0].avgRating.toFixed(2)) : 0
  const ratingCount = stats[0] ? stats[0].count : 0

  await Resource.findByIdAndUpdate(resourceId, {
    averageRating,
    ratingCount
  })
}

const createOrUpdateReview = asyncHandler(async (req, res) => {
  const { rating, reviewText = '' } = req.body
  const { id: resourceId } = req.params

  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ message: 'rating must be between 1 and 5' })
  }

  const resource = await Resource.findById(resourceId)
  if (!resource || resource.status === RESOURCE_STATUS.DELETED) {
    return res.status(404).json({ message: 'Resource not found' })
  }

  if (resource.status !== RESOURCE_STATUS.APPROVED && req.user.role === ROLES.USER) {
    return res.status(403).json({ message: 'Cannot review non-approved resources' })
  }

  const hasDownloaded = await Download.exists({ resourceId, userId: req.user.id })
  if (!hasDownloaded && req.user.role !== ROLES.OWNER) {
    return res.status(403).json({ message: 'You can only review resources you downloaded' })
  }

  const review = await Review.findOneAndUpdate(
    { resourceId, userId: req.user.id },
    { rating: Number(rating), reviewText },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )

  await recalculateRating(resource._id)

  return res.status(201).json(review)
})

const updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params
  const { rating, reviewText } = req.body

  const review = await Review.findById(reviewId)
  if (!review) {
    return res.status(404).json({ message: 'Review not found' })
  }

  const isOwner = req.user.role === ROLES.OWNER
  const isReviewOwner = review.userId.toString() === req.user.id

  if (!isOwner && !isReviewOwner) {
    return res.status(403).json({ message: 'You cannot edit this review' })
  }

  if (rating !== undefined) {
    if (Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: 'rating must be between 1 and 5' })
    }
    review.rating = Number(rating)
  }

  if (reviewText !== undefined) {
    review.reviewText = reviewText
  }

  await review.save()
  await recalculateRating(review.resourceId)

  return res.json(review)
})

const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params
  const review = await Review.findById(reviewId)

  if (!review) {
    return res.status(404).json({ message: 'Review not found' })
  }

  const isOwner = req.user.role === ROLES.OWNER
  const isReviewOwner = review.userId.toString() === req.user.id

  if (!isOwner && !isReviewOwner) {
    return res.status(403).json({ message: 'You cannot delete this review' })
  }

  const resourceId = review.resourceId
  await review.deleteOne()
  await recalculateRating(resourceId)

  return res.json({ message: 'Review deleted' })
})

const listReviews = asyncHandler(async (req, res) => {
  const { id: resourceId } = req.params

  const reviews = await Review.find({ resourceId })
    .populate('userId', 'fullName role')
    .sort({ createdAt: -1 })

  return res.json(reviews)
})

module.exports = {
  createOrUpdateReview,
  updateReview,
  deleteReview,
  listReviews
}
