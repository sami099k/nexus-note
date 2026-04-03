const mongoose = require('mongoose')

const connectDb = async () => {
	const mongoUri = process.env.MONGO_URI

	if (!mongoUri) {
		throw new Error('MONGO_URI is not configured in environment variables')
	}

	const forceIpv4 = String(process.env.MONGO_FORCE_IPV4 || 'true').toLowerCase() === 'true'

	await mongoose.connect(mongoUri, {
		serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 12000),
		socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
		family: forceIpv4 ? 4 : undefined,
		maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10)
	})

	const activeDb = mongoose.connection.name
	const activeHost = mongoose.connection.host
	const usingAtlas = /mongodb\+srv:\/\/.+mongodb\.net/i.test(mongoUri)

	console.log(`MongoDB connected: ${activeDb} @ ${activeHost}${usingAtlas ? ' (Atlas)' : ''}`)

	if (!usingAtlas) {
		console.warn('Warning: MONGO_URI is not an Atlas connection string.')
	}

	mongoose.connection.on('error', (err) => {
		const msg = String(err?.message || '')
		if (/SSL routines|tlsv1 alert|MongoServerSelectionError|Could not connect to any servers/i.test(msg)) {
			console.error('MongoDB runtime connection error: Atlas TLS/network issue (check IP whitelist, firewall, VPN/proxy, or TLS inspection).')
			return
		}

		console.error('MongoDB runtime connection error:', msg || err)
	})
}

module.exports = connectDb


