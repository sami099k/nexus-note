const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    reviewText: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
)

reviewSchema.index({ resourceId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model('Review', reviewSchema)
