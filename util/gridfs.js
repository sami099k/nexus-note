const mongoose = require('mongoose')

const getGridFsBucket = () => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB is not connected')
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'resourceFiles'
  })
}

module.exports = {
  getGridFsBucket
}
