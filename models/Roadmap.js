const mongoose = require('mongoose')

const roadmapStepSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      required: true
    },
    resourceLinks: {
      type: [String],
      default: []
    }
  },
  { _id: false }
)

const roadmapSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    steps: {
      type: [roadmapStepSchema],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isPublished: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

roadmapSchema.index({ subjectId: 1, isPublished: -1, createdAt: -1 })

module.exports = mongoose.model('Roadmap', roadmapSchema)
