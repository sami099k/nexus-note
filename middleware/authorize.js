const { ROLES } = require('../util/constants')

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' })
  }

  return next()
}

const canModerateSubject = (user, subjectId) => {
  if (!user) {
    return false
  }

  if (user.role === ROLES.OWNER) {
    return true
  }

  if (user.role !== ROLES.SUBJECT_ADMIN) {
    return false
  }

  return user.assignedSubjectIds.includes(String(subjectId))
}

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.OWNER) {
    return res.status(403).json({ message: 'Forbidden: admin access required' })
  }

  return next()
}

module.exports = {
  authorize,
  requireAdmin,
  canModerateSubject
}
