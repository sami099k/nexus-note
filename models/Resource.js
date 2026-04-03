const mongoose = require('mongoose')
const { RESOURCE_STATUS, RESOURCE_TYPES } = require('../util/constants')

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    resourceType: {
      type: String,
      enum: Object.values(RESOURCE_TYPES),
      required: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },
    module: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    topic: {
      type: String,
      default: '',
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    file: {
      storageProvider: {
        type: String,
        default: 'MONGODB_GRIDFS'
      },
      bucket: {
        type: String,
        default: ''
      },
      gridFsFileId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      objectKey: {
        type: String,
        default: ''
      },
      originalFileName: {
        type: String,
        required: true
      },
      mimeType: {
        type: String,
        required: true
      },
      sizeBytes: {
        type: Number,
        required: true,
        max: 50 * 1024 * 1024
      }
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(RESOURCE_STATUS),
      default: RESOURCE_STATUS.PENDING,
      index: true
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    moderation: {
      moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      moderatedAt: Date,
      reason: {
        type: String,
        default: ''
      }
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
)

resourceSchema.index({ title: 'text', description: 'text', topic: 'text', tags: 'text' })
resourceSchema.index({ subjectId: 1, module: 1, status: 1, createdAt: -1 })

module.exports = mongoose.model('Resource', resourceSchema)
