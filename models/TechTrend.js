const mongoose = require('mongoose')

const techTrendSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    summary: {
      type: String,
      default: ''
    },
    url: {
      type: String,
      default: ''
    },
    domainTags: {
      type: [String],
      default: []
    },
    source: {
      type: String,
      enum: ['INTERNAL', 'EXTERNAL'],
      default: 'EXTERNAL'
    },
    publishedAt: {
      type: Date,
      default: Date.now
    },
    imageUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
)

techTrendSchema.index({ title: 'text', summary: 'text', domainTags: 'text' })

module.exports = mongoose.model('TechTrend', techTrendSchema)
