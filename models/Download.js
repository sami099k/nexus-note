const mongoose = require('mongoose')

const downloadSchema = new mongoose.Schema(
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
    downloadedAt: {
      type: Date,
      default: Date.now
    },
    ipHash: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: false
  }
)

module.exports = mongoose.model('Download', downloadSchema)
