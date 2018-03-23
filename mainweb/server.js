/* ===================================== */
/* LOADING MODULES AND SETTING UP SERVER */
/* ===================================== */
const express = require("express")
const app = express()
const port = 1337
const server = app.listen(port, (err) => {
	if (err) {
		return console.log("Sum ting wong", err)
	}
	console.log(`Server is listening on port ${port}`)
})

const path = require("path")

const sql = require("mssql/msnodesqlv8")
const model = require("./model.js")

const session = require("express-session")
const storesessions = require("connect-mssql")(session)
const iosession = require("express-socket.io-session")

// Data store (accesses database)
const datastore = require("./datastore.js")
// Resource manager (controls access)
const resmgr = require("./resourceManager.js")
// Secret variables the public shouldn't see
const seecret = require("./seecret.js")

/* ================== */
/* SETTING UP MODULES */
/* ================== */
// Use pug (/jade)
app.set('view engine', 'pug')
app.locals.basedir = __dirname + '/'

// Socket IO
io = require('socket.io').listen(server)

// DB Configuration and connection string
const dbconfig = {
	user: seecret.dbUser,
	password: seecret.dbPassword,
	server: seecret.dbServer,
    database: 'Website',
    options: {
        charset: 'Latin1_General_CI_AS'
	},
	requestTimeout: 30000
}
const dbconstr = "Driver=msnodesqlv8;Server=(local);Database=Website;Trusted_Connection=yes;TrustServerCertificate=yes;Encrypt=yes;"
// Create connection pool
const pool = new sql.ConnectionPool(dbconfig, err => {
    if (err) {
        console.log("Database error: " + err["name"])
        console.log(err)
    } else {
		console.log("db connection test successful")
    }
})

// Sessions random generator
var sesGenConf = {
	letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'a', 'j', 'k', 'l', 'm', 'n', 'e', 'p', 'q', 'r', 'a', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
	numbers: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
	separators: [':', '.', '-', '_', '/', '#'],
	maxLength:  16
}
function generateSessionId () {
	var id = ''
	var selectedSeparator = sesGenConf.separators[Math.round(Math.random() * sesGenConf.separators.length - 0.5)]
	var lastSeparator = -1

	for (var i = 1; i <= sesGenConf.maxLength; i++) {
		var sel = ''
		if (i > 1 && i < 16 && i - lastSeparator > 2 && Math.random() < 0.4) {
			sel = selectedSeparator
			lastSeparator = i
		} else if (Math.random() < 0.5) {
			var r = Math.round(Math.random() * sesGenConf.letters.length - 0.5)
			sel = sesGenConf.letters[r]
		} else {
			var r = Math.round(Math.random() * sesGenConf.numbers.length - 0.5)
			sel = sesGenConf.numbers[r]
		}
		id += sel
	}

	return id
}
// Session store config
var storeconfig = {
	server: dbconfig.server,
	user: dbconfig.user,
    password: dbconfig.password,
    database: dbconfig.database,
}
var storeoptions = {
	table: "NodeSessions",
	ttl: 24 * 60 * 60 * 1000,
}

// Set up sessions
var defaultSession = { userData: { loggedIn: false, sites: [0], usmid: resmgr.usmid } }
var sessionMiddleware = session({
	store: new storesessions(storeconfig, storeoptions),
	maxAge: 30 * 24 * 60 * 60 * 1000, // 24 * 60 * 60 * 1000 = 1 day
	genid: (req) => { return generateSessionId() },
	name: "kiwi",
	secret: seecret.sessionSecret,
	resave: true,
	saveUninitialized: true,
	cookie: defaultSession
})
// Tell server to use sessions
app.use(sessionMiddleware)
// Tell socket to use sessions
io.use(iosession(sessionMiddleware, {
	autoSave: true
}))
io.of('/chat').use(iosession(sessionMiddleware, {
	autoSave: true
}))

/* ======= */
/* ROUTING */
/* ======= */
// Routing
app.use((request, response, next) => {
    next()
})
// Routing error
app.use((err, request, response, next) => {
    console.log(err)
    response.status(500).send('Something wrong')
})
// Check login
app.use((request, response, next) => {
	//var reg = RegExp(/\/(c\/|u\/|login)/)
	//if (
	//	!reg.test(request.url) &&
	//	(typeof request.session.userData === "undefined" || request.session.userData.loggedIn === "false")
	//) {
	//	response.redirect('/login')
	//} else {
	//	next()
	//}
	next()
})

// Page getters
app.get('/*', (request, response) => {

	var passUserData = (typeof request.session.userData === "undefined" ? defaultSession.userData : request.session.userData)
	resmgr.canAccess(request.path, passUserData, (err, result) => {

		if ((request.headers.accept || "").match(/text\/html/)) {
			var params = { permaid: passUserData.permaid || null, page: request.path, ip: request.connection.remoteAddress }
			datastore.procedure.serverPageLoadAudit(params)
		}

		if (!err) {
			app.set('views', path.join(__dirname, '/views', result.directory));
			if (result.type === "render") {
				response.render(result.send, {
					urlParameter: (typeof result.urlParameter !== "undefined" ? result.urlParameter : null),
					forView: (typeof result.passToView !== "undefined" ? result.passToView : null)
				})
			} else if (result.type === "file") {
				response.sendFile(result.send, { root: __dirname })
			} else {
				response.render('error', { root: __dirname + '/views' })
			}
		} else {
			if (request.url === "/") {
				response.render('login', { root: __dirname + '/views' })
			} else if (err === "Unauthorized") {
				response.render('403', { root: __dirname + '/views' })
			} else if (err === "Resource not found") {
				response.render('404', { root: __dirname + '/views' })
			} else {
				response.render('error', { root: __dirname + '/views' })
			}
		}

	})
})

/* ============================== */
/* SOCKETS ARE VERY IMPORTANT OK? */
/* ============================== */
io.on('connection', function (socket) {

	// With the right manipulation, any socket request can be sent to the 
	// server. Therefore, put the request in a try block to prevent the 
	// server from crashing if it encounters such a manipulation.

	/* ==================== */
	/* OI OI LOGIN / SIGNUP */
	/* ==================== */
	socket.on('login attempt', (input) => {
		try {
			var ret = {
				input: input,
				err: null,
				result: null
			}
			function begin() {
				dbUsername()
			}
			begin()

			function dbUsername() {
				pool.request()
					.input("CustomId", sql.VarChar, input.username)
					.query("select AccountPermaId, DisplayName, Pw from Accounts where CustomId = @CustomId", (err, result) => {
						if (!err) {
							var usernames = result.recordset
							checkUsernames(usernames)
						} else {
							ret.err = err
							sendResponse()
						}
					})
			}

			function checkUsernames(usernames) {
				if (usernames.length !== 1) {
					ret.err = "No users with that user name."
					sendResponse()
				} else {
					var userInfo = usernames[0]
					checkPassword(userInfo)
				}
			}

			function checkPassword(userInfo) {
				if (input.password === userInfo.Pw) {
					ret.result = "Login successful but we haven't implemented it yet."
					socket.handshake.session.userData = {
						loggedIn: true,
						username: input.username,
						displayas: userInfo.DisplayName,
						permaid: userInfo.AccountPermaId,
						sites: null,
						usmid: resmgr.usmid
					}
					socket.handshake.session.save()
					getSites()
				} else {
					ret.err = "Username found but password did not match."
					sendResponse()
				}
			}

			function getSites() {
				pool.request()
					.input("AccountPermaId", sql.VarChar, socket.handshake.session.userData.permaid)
					.query("select SiteAreaId from AccountToArea where AccountPermaId = @AccountPermaId and HasAccess = 1", (err, result) => {
						if (!err) {
							var sites = [0]
							for (var r = 0; r < result.recordset.length; r++) {
								sites.push(result.recordset[r].SiteAreaId)
							}
							socket.handshake.session.userData.sites = sites
							socket.handshake.session.save()
						} else {
							ret.err = "Error getting site access information."
						}
						sendResponse()
					})
			}

			function sendResponse() {
				socket.emit('login response', ret)
			}
		} catch (e) {
			var ret = {
				input: input,
				err: e,
				result: null
			}
			socket.emit('login response', ret)
		}
	})
	socket.on('signup attempt', (input) => {
		try {
			var ret = {
				input: input,
				err: null,
				result: null
			}
			function begin() {
				checkToken()
			}
			begin()

			// Globals
			var biggest
			var ids = []
			var newid = null

			function checkToken() {
				if (seecret.validTokens.indexOf(input.token) !== -1) {
					getPermaids()
				} else {
					throw "Invalid token"
				}
			}

			function getPermaids() {
				pool.request()
					.execute("spAccountAllPermaIds", (err, result) => {
						if (err) {
							throw "Could not get all account permanent IDs"
						} else {
							biggest = result.recordsets[0][0].Biggest
							for (var i in result.recordsets[1]) {
								ids.push(result.recordsets[1][i].AccountPermaId)
							}
							generateNewUserId()
						}
					})
			}

			function generateNewUserId() {
				var firstEmpty = biggest + 1
				if (ids.length > 1) {
					for (var i = 1; i < ids.length; i++) {
						if (ids[i] - ids[i - 1] > 1) {
							firstEmpty = ids[i - 1] + 1
							i = ids.length
						}
					}
				}
				var power = Math.log10(firstEmpty)
				var maxnew = Math.pow(10, Math.ceil(power) + 1)

				console.log("First empty: " + firstEmpty + ", power: " + power + ", maxnew: " + maxnew)

				var lim = 2000
				while (lim > 0 && (newid === null || ids.indexOf(newid) >= 0)) {
					newid = Math.floor(firstEmpty + Math.random() * (maxnew - firstEmpty))
					console.log("Is " + newid + " new?")
					lim--
				}

				if (lim === 0) {
					throw "Could not generate new permanent ID"
				} else {
					insertDb()
				}
			}

			function insertDb() {
				pool.request()
					.input("AccountPermaId", sql.VarChar, newid)
					.input("CustomId", sql.VarChar, input.username)
					.input("Pw", sql.VarChar, input.password)
					.execute("spAccountCreate", (err, result) => {
						if (err) {
							throw err
						} else {
							result = "Success"
							socket.emit('signup response', ret)
						}
					})
			}

		}
		catch (e) {
			var ret = {
				input: input,
				err: e,
				result: null
			}
			console.log(e)
			socket.emit('signup response', ret)
		}
	})

	/* ========================================== */
	/* DATA-RELATED STUFF (TILL NEAR END OF FILE) */
	/* ========================================== */

	socket.on('grid request', (input) => {
		try {
			var params = (typeof input.params === "object" ? input.params : {})
			params.session = socket.handshake.session
			datastore.grids[input.load](params, (err, response) => {
				delete params.session
				var ret = {
					input: input,
					err: err,
					recordset: response.recordset,
					model: response.model,
					params: params
				}
				socket.emit('grid response', ret)
			})
		}
		catch (e) {
			delete params.session
			var ret = {
				input: input,
				err: e,
				recordset: null,
				params: params
			}
			socket.emit('grid response', ret)
		}
	})
	socket.on('data request', (input) => {
		try {
			var params = (typeof input.params === "object" ? input.params : {})
			params.session = socket.handshake.session
			datastore.data[input.request](params, (err, response) => {
				delete params.session
				var ret = {
					input: input,
					err: err,
					recordset: response.recordset,
					params: params
				}
				socket.emit('data response', ret)
			})
		}
		catch (e) {
			delete params.session
			console.log(e)
			var ret = {
				input: input,
				err: e,
				recordset: null,
				params: params
			}
			socket.emit('data response', ret)
		}
	})
	socket.on('db procedure request', (input) => {
		try {
			var params = (typeof input.params === "object" ? input.params : {})
			params.session = socket.handshake.session
			datastore.procedure[input.procedure](params, (err, response) => {
				delete params.session
				var ret = {
					input: input,
					err: err,
					response: response,
					params: params
				}
				socket.emit('db procedure response', ret)
			})
		}
		catch (e) {
			delete params.session
			var ret = {
				input: input,
				err: e,
				response: null,
				params: params
			}
			socket.emit('db procedure response', ret)
		}
	})
})

// Chat
var ioChat = io.of('/chat')
ioChat.on('connection', (socket) => {
	socket.on('chat send', (input) => {
		try {
			var input = (typeof input === "object" ? input : null)
			input.from = socket.handshake.session.userData.permaid
			datastore.procedure.chatSend(input, (err, response) => {
				var ret = {
					input: input,
					err: err,
					fromDb: response
				}
				ioChat.emit('chat sent', ret)
			})
		}
		catch (e) {
			var ret = {
				input: input,
				err: e,
				fromDb: null
			}
			ioChat.emit('chat sent', ret)
		}
	})
	socket.on('room add', (input) => {
		try {
			console.log("trying")
			userData = (typeof socket.handshake.session.userData.permaid === "undefined" ? null : socket.handshake.session.userData)
			var ret = { success: false, err: null }
			pool.request()
				.input("RoomName", sql.VarChar, input.roomName)
				.input("CreatedBy", sql.Int, userData.permaid)
				.execute("dbo.spChatRoomsAdd", (err, result) => {
					console.log(result)
					ret.success = (!err && result.rowsAffected[0] === 1 ? true : false)
					if (ret.success) {
						console.log("room insert success")
						stage2()
					} else {
						console.log("room insert error")
						ret.err = err
						socket.emit('room added', ret)
					}
				})

			// Send message to chat of room creation
			function stage2() {
				console.log("stage 2")
				var extra = '{ "accountPermaId": "' + userData.permaid + '", '
				extra += '"customId": "' + userData.username + '", '
				extra += '"displayName": "' + userData.displayas + '", '
				extra += '"room": "' + input.roomName + '" }'
				var smp = { room: "tournytime", content: "{player} created room: {room}", extra: extra }
				console.log(smp)
				chatAddSystemMessage(smp, (err, result) => {
					console.log("message add callback done")
					if (!err) {
						console.log("success, emitting system message")
						ret.success = true
						var retchat = {
							input: input,
							err: err,
							fromDb: result
						}
						ioChat.emit('chat sent', retchat)
					}
					console.log("emitting room add success")
					ioChat.emit('room added', ret)
				})
			}
		}
		catch (e) {
			var ret = { success: false, err: e }
			ioChat.emit('chat sent', ret)
		}
	})
})
// Chat helper for adding system messages
function chatAddSystemMessage(params, callback) {
	console.log("add system message doing")
	pool.request()
		.input("Room", sql.VarChar, params.room)
		.input("Sender", sql.Int, null)
		.input("Message", sql.VarChar, params.content)
		.input("MessageType", sql.VarChar, "Action")
		.input("ExtraJSON", sql.VarChar, params.extra)
		.execute("spChatSend", (err, result) => {
			console.log("add system message done")
			callback(err, result)
		})
}

// Nomic chat
var ioNomicChat = io.of('/nomic')
ioNomicChat.on('connection', (socket) => {
	socket.on('chat send', (input) => {
		try {
			var input = (typeof input === "object" ? input : null)
			datastore.procedure.nomicChatSend(input, (err, response) => {
				var ret = {
					input: input,
					err: err,
					fromDb: response
				}
				ioNomicChat.emit('chat sent', ret)
			})
		}
		catch (e) {
			var ret = {
				input: input,
				err: e,
				fromDb: null
			}
			ioNomicChat.emit('chat sent', ret)
		}
	})
})