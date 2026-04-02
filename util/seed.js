const crypto = require('crypto')
const stream = require('stream')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Subject = require('../models/Subject')
const TechTrend = require('../models/TechTrend')
const DiscussionThread = require('../models/DiscussionThread')
const DiscussionReply = require('../models/DiscussionReply')
const FamousQuestion = require('../models/FamousQuestion')
const Roadmap = require('../models/Roadmap')
const Resource = require('../models/Resource')
const { getGridFsBucket } = require('./gridfs')
const { RESOURCE_STATUS, RESOURCE_TYPES } = require('./constants')

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

const ensureSubjects = async (createdBy) => {
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
    },
    {
      name: 'Web Development',
      code: 'WEB',
      description: 'A community for frontend/backend web dev discussions and notes.'
    },
    {
      name: 'Database Systems',
      code: 'DBMS',
      description: 'Queries, indexing, transactions, and database engineering.'
    },
    {
      name: 'Operating Systems',
      code: 'OS',
      description: 'Processes, memory, file systems, concurrency, and OS internals.'
    },
    {
      name: 'Computer Networks',
      code: 'CN',
      description: 'Networking foundations: TCP/IP, HTTP, DNS, routing, and troubleshooting.'
    }
  ]

  const ensured = []
  for (const item of defaults) {
    const code = String(item.code).trim().toUpperCase()
    let subject = await Subject.findOne({ $or: [{ code }, { name: item.name }] })
    if (!subject) {
      subject = await Subject.create({
        name: item.name,
        code,
        description: item.description,
        isActive: true,
        createdBy: createdBy._id
      })
    }
    ensured.push(subject)
  }

  return ensured
}

const seedTechTrends = async () => {
  const count = await TechTrend.countDocuments()
  if (count > 0) {
    return
  }

  const now = Date.now()
  await TechTrend.insertMany([
    {
      title: 'AI agents: practical patterns for real apps',
      summary: 'Where agents help (workflow automation, search+tools) and where they don’t (deterministic business logic).',
      url: 'https://example.com/ai-agents-patterns',
      domainTags: ['AI', 'Productivity'],
      source: 'EXTERNAL',
      publishedAt: new Date(now - 1000 * 60 * 60 * 24 * 2)
    },
    {
      title: 'MongoDB indexing checklist for API performance',
      summary: 'Use compound indexes, validate query plans, and avoid unbounded regex queries.',
      url: 'https://example.com/mongodb-indexing',
      domainTags: ['DB', 'MongoDB'],
      source: 'EXTERNAL',
      publishedAt: new Date(now - 1000 * 60 * 60 * 12)
    },
    {
      title: 'React UI: accessibility-first component habits',
      summary: 'Focus states, keyboard navigation, aria labels, and reducing motion for usability.',
      url: 'https://example.com/react-a11y',
      domainTags: ['Web', 'React'],
      source: 'EXTERNAL',
      publishedAt: new Date(now - 1000 * 60 * 60 * 30)
    },
    {
      title: 'System design: caching strategies that actually ship',
      summary: 'Cache keys, invalidation, and when to use TTL vs event-driven expiry.',
      url: 'https://example.com/system-design-caching',
      domainTags: ['System Design', 'Cloud'],
      source: 'EXTERNAL',
      publishedAt: new Date(now - 1000 * 60 * 60 * 40)
    },
    {
      title: 'HTTP fundamentals: what every backend should know',
      summary: 'Retries, idempotency, status codes, and safe request/response logging.',
      url: 'https://example.com/http-fundamentals',
      domainTags: ['Web', 'Backend'],
      source: 'EXTERNAL',
      publishedAt: new Date(now - 1000 * 60 * 60 * 60)
    },
    {
      title: 'Internal: weekly engineering learning digest',
      summary: 'Short notes on what the team learned building NexusNotes this week.',
      url: '',
      domainTags: ['INTERNAL', 'Learning'],
      source: 'INTERNAL',
      publishedAt: new Date(now - 1000 * 60 * 60 * 6)
    }
  ])
}

const uploadTextToGridFs = async ({ uploadedById, originalFileName, mimeType, content }) => {
  const bucket = getGridFsBucket()
  const safeName = String(originalFileName || 'note.txt')
  const objectKey = `seed/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeName.replace(/\s+/g, '-')}`
  const buffer = Buffer.from(String(content || ''), 'utf8')

  const uploadStream = bucket.openUploadStream(objectKey, {
    contentType: mimeType,
    metadata: {
      originalFileName: safeName,
      uploadedBy: String(uploadedById)
    }
  })

  const inputStream = new stream.PassThrough()
  inputStream.end(buffer)

  const gridFsFileId = await new Promise((resolve, reject) => {
    inputStream
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id))
  })

  return {
    objectKey,
    gridFsFileId,
    sizeBytes: buffer.length,
    mimeType,
    originalFileName: safeName
  }
}

const seedSubjectRoomData = async ({ subject, author }) => {
  const subjectId = subject._id
  const authorId = author._id

  const existingThreads = await DiscussionThread.countDocuments({ subjectId })
  if (existingThreads === 0) {
    const seedsByCode = {
      DSA: [
        {
          title: 'How do you approach Dynamic Programming?',
          body: 'Share a repeatable approach: state definition, transitions, base cases, and optimizing space/time.'
        },
        {
          title: 'Big-O cheat sheet (common patterns)',
          body: 'Two pointers, sliding window, BFS/DFS, heaps, prefix sums — what are your go-to heuristics?'
        }
      ],
      AI: [
        {
          title: 'Machine Learning roadmap for beginners',
          body: 'If you had 30 days, what would you learn first? Math, Python, ML basics, and small projects.'
        },
        {
          title: 'Prompt engineering tips that actually help',
          body: 'Share prompt structures you use: constraints, examples, step-by-step, and evaluation.'
        }
      ],
      WEB: [
        {
          title: 'Clean authentication patterns in Express',
          body: 'JWT refresh strategy, middleware structure, and protecting routes without repeating code.'
        },
        {
          title: 'Frontend UX: consistent logout and navigation',
          body: 'How do you keep UI consistent across pages without copy/paste bugs?'
        }
      ],
      DBMS: [
        {
          title: 'Indexing basics: when does an index hurt?',
          body: 'Write-heavy workloads, low selectivity, and large compound indexes — tradeoffs discussion.'
        },
        {
          title: 'Transactions and isolation levels explained simply',
          body: 'Explain dirty reads, non-repeatable reads, and phantom reads with examples.'
        }
      ],
      OS: [
        {
          title: 'Threads vs processes: practical differences',
          body: 'Share examples where threads are ideal and where they become a headache.'
        },
        {
          title: 'Memory management: paging and segmentation',
          body: 'How to explain paging in one diagram?'
        }
      ],
      CN: [
        {
          title: 'HTTP vs HTTPS: what changes on the wire?',
          body: 'TLS handshake basics, certificates, and why HSTS matters.'
        },
        {
          title: 'DNS troubleshooting playbook',
          body: 'Steps you follow when a domain is not resolving or resolves intermittently.'
        }
      ]
    }

    const threadsToCreate = seedsByCode[subject.code] || seedsByCode.DSA
    const createdThreads = await DiscussionThread.insertMany(
      threadsToCreate.map((item) => ({
        subjectId,
        createdBy: authorId,
        title: item.title,
        body: item.body,
        tags: [subject.code],
        isTrending: true
      }))
    )

    const firstThread = createdThreads[0]
    if (firstThread) {
      const replies = await DiscussionReply.insertMany([
        {
          threadId: firstThread._id,
          subjectId,
          createdBy: authorId,
          body: 'Great question. A good start is: define state clearly, write a recurrence, then only optimize after it works.'
        },
        {
          threadId: firstThread._id,
          subjectId,
          createdBy: authorId,
          body: 'If you get stuck, try small inputs and write the table by hand. Patterns show up quickly.'
        }
      ])

      if (replies.length > 0) {
        firstThread.replyCount = replies.length
        firstThread.lastActivityAt = new Date()
        await firstThread.save()
      }
    }
  }

  const existingQuestions = await FamousQuestion.countDocuments({ subjectId })
  if (existingQuestions === 0) {
    await FamousQuestion.insertMany([
      {
        subjectId,
        question: `Explain the core idea of ${subject.code} in your own words.`,
        answer: 'Structure your answer: definition, a real example, tradeoffs, and common pitfalls.',
        tags: ['interview', subject.code],
        difficulty: 'EASY',
        createdBy: authorId,
        isVerified: true,
        verifiedBy: authorId,
        verifiedAt: new Date()
      },
      {
        subjectId,
        question: 'What is time complexity vs space complexity? Give examples.',
        answer: 'Time complexity describes how runtime grows with input size; space complexity describes memory growth. Example: merge sort is O(n log n) time and O(n) extra space.',
        tags: ['complexity', 'basics'],
        difficulty: 'MEDIUM',
        createdBy: authorId,
        isVerified: true,
        verifiedBy: authorId,
        verifiedAt: new Date()
      },
      {
        subjectId,
        question: 'Describe a bug you debugged recently and how you found the root cause.',
        answer: 'Emphasize: reproduction, narrowing scope, inspecting logs/inputs, writing a fix, and validating with a regression test.',
        tags: ['behavioral', 'debugging'],
        difficulty: 'MEDIUM',
        createdBy: authorId,
        isVerified: true,
        verifiedBy: authorId,
        verifiedAt: new Date()
      }
    ])
  }

  const existingRoadmaps = await Roadmap.countDocuments({ subjectId, isPublished: true })
  if (existingRoadmaps === 0) {
    await Roadmap.create({
      subjectId,
      title: `${subject.code} - 2 Week Starter Roadmap`,
      description: 'A simple step-by-step plan you can follow and customize.',
      steps: [
        {
          title: 'Week 1: Fundamentals',
          description: 'Cover the basics and solve small exercises daily.',
          order: 1,
          resourceLinks: ['https://example.com/fundamentals']
        },
        {
          title: 'Week 2: Practice + Review',
          description: 'Do timed practice, review mistakes, and write short notes.',
          order: 2,
          resourceLinks: ['https://example.com/practice']
        },
        {
          title: 'Bonus: Project / Portfolio',
          description: 'Build a mini project or a write-up demonstrating what you learned.',
          order: 3,
          resourceLinks: ['https://example.com/project']
        }
      ],
      createdBy: authorId,
      isPublished: true
    })
  }

  const existingNotes = await Resource.countDocuments({
    subjectId,
    status: RESOURCE_STATUS.APPROVED,
    resourceType: RESOURCE_TYPES.NOTES
  })

  if (existingNotes === 0) {
    const note1 = await uploadTextToGridFs({
      uploadedById: authorId,
      originalFileName: `${subject.code}-quick-notes.md`,
      mimeType: 'text/markdown',
      content: `# ${subject.name} – Quick Notes\n\n- Key concepts\n- Common patterns\n- Pitfalls to avoid\n\n## Practice\n- Solve 3 problems\n- Write a summary\n`
    })

    const note2 = await uploadTextToGridFs({
      uploadedById: authorId,
      originalFileName: `${subject.code}-interview-cheatsheet.txt`,
      mimeType: 'text/plain',
      content: `${subject.name} interview cheat sheet\n\n1) Define the problem\n2) Discuss tradeoffs\n3) Propose approach\n4) Analyze complexity\n`
    })

    await Resource.insertMany([
      {
        title: `${subject.code} Quick Notes`,
        description: 'A short, high-signal summary for revision.',
        resourceType: RESOURCE_TYPES.NOTES,
        subjectId,
        module: 'Fundamentals',
        topic: 'Overview',
        tags: [subject.code, 'revision'],
        file: {
          storageProvider: 'MONGODB_GRIDFS',
          bucket: 'resourceFiles',
          gridFsFileId: note1.gridFsFileId,
          objectKey: note1.objectKey,
          originalFileName: note1.originalFileName,
          mimeType: note1.mimeType,
          sizeBytes: note1.sizeBytes
        },
        uploadedBy: authorId,
        status: RESOURCE_STATUS.APPROVED
      },
      {
        title: `${subject.code} Interview Cheat Sheet`,
        description: 'A short checklist you can use during prep.',
        resourceType: RESOURCE_TYPES.NOTES,
        subjectId,
        module: 'Interview Prep',
        topic: 'Checklist',
        tags: [subject.code, 'interview'],
        file: {
          storageProvider: 'MONGODB_GRIDFS',
          bucket: 'resourceFiles',
          gridFsFileId: note2.gridFsFileId,
          objectKey: note2.objectKey,
          originalFileName: note2.originalFileName,
          mimeType: note2.mimeType,
          sizeBytes: note2.sizeBytes
        },
        uploadedBy: authorId,
        status: RESOURCE_STATUS.APPROVED
      }
    ])
  }
}

const seedDefaults = async () => {
  const seedUser = await ensureSeedUser()
  const subjects = await ensureSubjects(seedUser)

  await seedTechTrends()

  for (const subject of subjects) {
    // Seed subject room data (threads, replies, notes, interview questions, roadmaps).
    // Done one subject at a time to keep seeding deterministic.
    // eslint-disable-next-line no-await-in-loop
    await seedSubjectRoomData({ subject, author: seedUser })
  }
}

module.exports = {
  seedDefaults
}
