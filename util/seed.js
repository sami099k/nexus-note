const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Subject = require('../models/Subject')

const DEFAULT_SEED_USER_EMAIL = 'seed@nexusnotes.local'

const ensureSeedUser = async () => {
  const email = String(process.env.SEED_USER_EMAIL || DEFAULT_SEED_USER_EMAIL).trim().toLowerCase()

  const existing = await User.findOne({ email })
  if (existing) {
    return existing
  }

  const password = String(process.env.SEED_USER_PASSWORD || 'seed-only-not-for-login')
  const passwordHash = await bcrypt.hash(password, 10)

  return User.create({
    fullName: 'NexusNotes Seed User',
    email,
    passwordHash,
    role: 'USER',
    isActive: false
  })
}

const seedDefaultSubjects = async () => {
  const createdBy = await ensureSeedUser()

  const defaults = [
    {
      name: 'Data Structures & Algorithms',
      code: 'DSA',
      description: 'A community to learn, practice, and discuss DSA topics.'
    },
    {
      name: 'Artificial Intelligence',
      code: 'AI',
      description: 'A community focused on AI concepts, tools, and real-world applications.'
    }
  ]

  for (const item of defaults) {
    const code = String(item.code).trim().toUpperCase()
    const exists = await Subject.findOne({ $or: [{ code }, { name: item.name }] })
    if (exists) {
      continue
    }

    await Subject.create({
      name: item.name,
      code,
      description: item.description,
      isActive: true,
      createdBy: createdBy._id
    })
  }
}

const seedDefaults = async () => {
  await seedDefaultSubjects()
}

module.exports = {
  seedDefaults
}
