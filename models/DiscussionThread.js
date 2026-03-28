const mongoose = require('mongoose')

const discussionThreadSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    body: {
      type: String,
      default: ''
    },
    tags: {
      type: [String],
      default: []
    },
    isTrending: {
      type: Boolean,
      default: false
    },
    viewCount: {
      type: Number,
      default: 0
    },
    replyCount: {
      type: Number,
      default: 0
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

discussionThreadSchema.index({ subjectId: 1, isTrending: -1, lastActivityAt: -1 })
discussionThreadSchema.index({ title: 'text', body: 'text', tags: 'text' })

module.exports = mongoose.model('DiscussionThread', discussionThreadSchema)
