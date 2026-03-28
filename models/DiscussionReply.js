const mongoose = require('mongoose')

const discussionReplySchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscussionThread',
      required: true,
      index: true
    },
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
    body: {
      type: String,
      required: true
    },
    upvotes: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
)

discussionReplySchema.index({ threadId: 1, createdAt: 1 })

module.exports = mongoose.model('DiscussionReply', discussionReplySchema)
