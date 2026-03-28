const multer = require('multer')

const MAX_FILE_SIZE = 50 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  }
})

const uploadSingleResource = upload.single('file')

module.exports = {
  uploadSingleResource,
  MAX_FILE_SIZE
}
