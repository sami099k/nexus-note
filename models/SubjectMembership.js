const mongoose = require('mongoose')

const subjectMembershipSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REMOVED'],
      default: 'ACTIVE'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

subjectMembershipSchema.index({ subjectId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model('SubjectMembership', subjectMembershipSchema)
