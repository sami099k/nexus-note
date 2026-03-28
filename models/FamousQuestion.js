const mongoose = require('mongoose')

const famousQuestionSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      default: ''
    },
    tags: {
      type: [String],
      default: []
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date
  },
  {
    timestamps: true
  }
)

famousQuestionSchema.index({ subjectId: 1, isVerified: -1, createdAt: -1 })
famousQuestionSchema.index({ question: 'text', answer: 'text', tags: 'text' })

module.exports = mongoose.model('FamousQuestion', famousQuestionSchema)
