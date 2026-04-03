const jwt = require('jsonwebtoken')
const User = require('../models/User')

const authMiddleware = async (req, res, next) => {
  try {
    let token = ''
    const authHeader = req.headers.authorization || ''

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '').trim()
    } else if (req.query.token) {
      token = req.query.token
    }

    if (!token) {
      return res.status(401).json({ message: 'Missing or invalid authorization' })
    }

    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      return res.status(500).json({ message: 'JWT secret is not configured' })
    }

    const payload = jwt.verify(token, jwtSecret)
    const user = await User.findById(payload.userId).select('-passwordHash')

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' })
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      assignedSubjectIds: user.assignedSubjectIds.map((id) => id.toString())
    }

    return next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = authMiddleware
