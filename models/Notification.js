const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      default: 'ADMIN'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      required: true,
      enum: ['resource_upload', 'thread_created', 'submission_approved', 'submission_rejected']
    },
    message: {
      type: String,
      required: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource'
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Notification', notificationSchema)
