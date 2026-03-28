const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const asyncHandler = require('../util/asyncHandler')
const User = require('../models/User')
const { ROLES } = require('../util/constants')

const createToken = (user) => {
  const secret = process.env.JWT_SECRET
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'

  return jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    secret,
    { expiresIn }
  )
}

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'fullName, email and password are required' })
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' })
  }

  const existingUser = await User.findOne({ email: String(email).toLowerCase() })
  if (existingUser) {
    return res.status(409).json({ message: 'Email already in use' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({
    fullName,
    email,
    passwordHash,
    role: ROLES.USER
  })

  const token = createToken(user)

  return res.status(201).json({
    message: 'Registration successful',
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
  })
})

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' })
  }

  const user = await User.findOne({ email: String(email).toLowerCase() })
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash)
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const token = createToken(user)

  return res.json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedSubjectIds: user.assignedSubjectIds
    }
  })
})

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash')
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.json(user)
})

const refresh = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'User not found or inactive' })
  }

  const token = createToken(user)

  return res.json({ token })
})

const bootstrapOwner = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'fullName, email and password are required' })
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' })
  }

  const ownerExists = await User.exists({ role: ROLES.OWNER })
  if (ownerExists) {
    return res.status(409).json({ message: 'Owner already exists. Use owner management endpoints.' })
  }

  const existingUser = await User.findOne({ email: String(email).toLowerCase() })
  if (existingUser) {
    return res.status(409).json({ message: 'Email already in use' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const owner = await User.create({
    fullName,
    email,
    passwordHash,
    role: ROLES.OWNER
  })

  const token = createToken(owner)

  return res.status(201).json({
    message: 'Owner account created',
    token,
    user: {
      id: owner._id,
      fullName: owner.fullName,
      email: owner.email,
      role: owner.role
    }
  })
})

module.exports = {
  register,
  login,
  me,
  refresh,
  bootstrapOwner
}
