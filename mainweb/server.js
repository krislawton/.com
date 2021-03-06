/* ===================================== */
/* LOADING MODULES AND SETTING UP SERVER */
/* ===================================== */
const devOrLive = require("./devorlive.js")
const isDev = devOrLive.dev
const port = devOrLive.usePort

// Enter express
const express = require("express")
const app = express()

// Run server
var serverOptions = {},
	server
if (isDev) {
	// If we're dev, just normal HTTP
	server = app.listen(port, (err) => {
		if (err) {
			return console.log("Sum ting wong", err)
		}
		console.log(`Server is listening on port ${port}`)
	})
} else {
	// If we're live, server is HTTPS and requires ceritifcates
	const https = require("https")
	const fs = require("fs")
	const key = fs.readFileSync('/srv/certs/privkey.pem')
	const cert = fs.readFileSync('/srv/certs/cert.pem')
	const ca = fs.readFileSync('/srv/certs/chain.pem')
	serverOptions = {
		key: key,
		cert: cert,
		ca: ca
	}
	server = https.createServer(serverOptions, app).listen(port, (err) => {
		if (err) {
			return console.log("Sum ting wong", err);
		}
		console.log(`Server is listening on port ${port}`);
	})
}

// Other modules
const path = require("path")

const sql = require("mssql")
const model = require("./model.js")

const session = require("express-session")
const storesessions = require("connect-mssql")(session)
const iosession = require("express-socket.io-session")

const schedule = require('node-schedule')

// Data store (accesses database)
const datastore = require("./datastore.js")
// Resource manager (controls access)
const resmgr = require("./resourceManager.js")
// Secret variables the public shouldn't see
const seecret = require("./seecret.js")
// Achievements
const achiev = require("./achievements.js")
function distributeAchievementUpdate(accountPermaId, called) {
	var socc = io.sockets.sockets
	for (i in socc) {
		var ud = socc[i].handshake.session.userData || { permaid: -99 }
		if (!called.err && socc[i].nsp.name === "/" && accountPermaId === ud.permaid) {
			io.to(i).emit('recent achievements response', called)
		}
	}
}
// Global helpers
const helpers = require('./helpers.js')

/* ================== */
/* SETTING UP MODULES */
/* ================== */
// Use pug (/jade)
app.set('view engine', 'pug')
app.locals.basedir = __dirname + '/'

// Socket IO
io = require('socket.io').listen(server, {
	pingTimeout: 7000,
	pingInterval: 3000
})

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
	ttl: 864e5, // 864e5 = 1 day
}

// Set up sessions
var defaultSession = {
	userData: {
		loggedIn: false,
		sites: [0],
		usmev: resmgr.usmev,
	}
}
var store = new storesessions(storeconfig, storeoptions)
var sessionMiddleware = session({
	store: store,
	genid: (req) => { return generateSessionId() },
	name: "kiwi",
	secret: seecret.sessionSecret,
	resave: true,
	saveUninitialized: true,
	rolling: true,
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
// Spare
app.use((request, response, next) => {
	next()
})

// Page getters
app.get('/*', (request, response) => {

	// Update cookie to 666 days in future if logged in
	var ud = request.session.userData
	var c = request.session.cookie
	if (typeof ud !== "undefined" && ud.loggedIn && c.maxAge === null) {
		request.session.cookie.maxAge = 666 * 864e5
	}

	// Page load
	var passUserData = (typeof request.session.userData === "undefined" ? defaultSession.userData : request.session.userData)
	resmgr.canAccess(request.path, passUserData, (err, result) => {

		if ((request.headers.accept || "").match(/text\/html/)) {
			var params = {
				permaid: passUserData.permaid || null,
				page: request.path,
				ip: request.connection.remoteAddress,
				sid: request.session.id
			}
			datastore.procedure.serverPageLoadAudit(params)
			achiev.updateAchievements({ justdone: "serverPageLoadAudit", userData: passUserData }, (uaerr, uaresult) => {
				if (typeof params.permaid !== "undefined") {
					distributeAchievementUpdate(params.permaid, { err: uaerr, result: uaresult })
				}
			})
		}

		if (!err) {
			app.set('views', path.join(__dirname, '/views', result.directory));
			if (result.type === "render") {
				response.render(result.send, {
					urlParameter: (typeof result.urlParameter !== "undefined" ? result.urlParameter : null),
					forView: (typeof result.passToView !== "undefined" ? result.passToView : null),
					userData: passUserData
				})
			} else if (result.type === "file") {
				response.sendFile(result.send, { root: __dirname })
			} else {
				response.render('error', { root: __dirname + '/views', userData: passUserData })
			}
		} else {
			if (request.url === "/") {
				response.render('login', { root: __dirname + '/views', userData: passUserData })
			} else if (err === "Unauthorized") {
				response.render('403', { root: __dirname + '/views', userData: passUserData })
			} else if (err === "Resource not found") {
				response.render('404', { root: __dirname + '/views', userData: passUserData })
			} else {
				response.render('error', { root: __dirname + '/views', userData: passUserData })
			}
		}

	})
})

/* ============================== */
/* SOCKETS ARE VERY IMPORTANT OK? */
/* ============================== */
io.on('connection', function (socket) {

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
					.query("select AccountPermaId, DisplayName, PwObfuscated from Accounts where CustomId = @CustomId", (err, result) => {
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
				var unobf = helpers.unobfuscateV1(userInfo.AccountPermaId, userInfo.PwObfuscated)
				if (input.password === unobf) {
					ret.result = "Login successful but we haven't implemented it yet."
					socket.handshake.session.maxAge = 666 * 864e5
					socket.handshake.session.userData = {
						loggedIn: true,
						username: input.username,
						displayas: userInfo.DisplayName,
						permaid: userInfo.AccountPermaId,
						sites: null,
						usmev: resmgr.usmev
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
				var obf = helpers.obfuscateV1(newid, input.password)
				pool.request()
					.input("AccountPermaId", sql.VarChar, newid)
					.input("CustomId", sql.VarChar, input.username)
					.input("Pw", sql.VarChar, input.password)
					.input("PwObfuscated", sql.NVarChar, obf)
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

	/* ================== */
	/* DATA-RELATED STUFF */
	/* ================== */

	socket.on('recent achievements request', () => {
		params = { session: socket.handshake.session }
		datastore.data["rootUserLoadAchievementsRecent"](params, (err, response) => {
			var ret = {
				err: err,
				result: response
			}
			socket.emit('recent achievements response', ret)
		})
	})

	// With the right manipulation, any socket request can be sent to the 
	// server. Therefore, put the request in a try block to prevent the 
	// server from crashing if it encounters such a manipulation.

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
				if (!err && typeof response.recordsets !== "undefined" && response.recordsets.length > 1) {
					ret.recordsets = response.recordsets
				}
				socket.emit('data response', ret)
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
			socket.emit('data response', ret)
		}
	})
	socket.on('db procedure request', (input) => {
		try {
			var params = (typeof input.params === "object" ? input.params : {})
			params.session = socket.handshake.session
			datastore.procedure[input.procedure](params, (err, response) => {
				if (!err) {
					var pass = { justdone: input.procedure, userData: params.session.userData, params: input.params }
					achiev.updateAchievements(pass, (uaerr, uaresult) => {
						if (typeof pass.userData.permaid !== "undefined") {
							distributeAchievementUpdate(pass.userData.permaid, { err: uaerr, result: uaresult })
						}
					})
				}
				delete params.session
				var ret = {
					input: input,
					err: err,
					response: response,
					params: params
				}
				socket.emit('db procedure response', ret)

				// Extra
				var extrasFor = [ 'rootUserChangeDisplayName', 'rootUserChangeUserId' ]
				if (!err && extrasFor.includes(input.procedure)) {
					// Change display name
					if (input.procedure === "rootUserChangeDisplayName") {
						var permaid = socket.handshake.session.userData.permaid
						// Tell chat
						chatChecksum = generateSessionId()
						var em = { permaid: permaid, changedTo: input.params.displayName, checksum: chatChecksum }
						ioChat.emit('display name changed', em)
						// Update all user's sessions
						var sq_q = "select * from NodeSessions"
						pool.request()
							.query(sq_q, (err2, result2) => {
								for (i in result2.recordset) {
									var r = result2.recordset[i]
									var s = JSON.parse(r.session)
									if (typeof s.userData === "object" && s.userData.permaid === permaid) {
										s.userData.displayas = input.params.displayName
									}
									store.set(r.sid, s)
								}
							})
					}
					// Change user ID
					if (input.procedure === "rootUserChangeUserId") {
						var sq_q = "select * from NodeSessions"
						pool.request()
							.query(sq_q, (err, result) => {
								for (i in result.recordset) {
									var r = result.recordset[i]
									var s = JSON.parse(r.session)
									var permaid = socket.handshake.session.userData.permaid
									if (typeof s.userData === "object" && s.userData.permaid === permaid) {
										s.userData.username = input.params.userId
									}
									store.set(r.sid, s)
								}
							})
					}
				}
				// End extra
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
var accountsInChat = {}
var chatChecksum = generateSessionId()
ioChat.on('connection', (socket) => {
	var permaid = socket.handshake.session.userData.permaid

	// Track new connections
	if (typeof accountsInChat[permaid] === "undefined") {
		accountsInChat[permaid] = {
			connectionCount: 1,
			forActivityIndicator: {
				lastActive: new Date(),
				status: "active"
			}
		}
	} else {
		accountsInChat[permaid].connectionCount++
	}
	// Add enter message after 5 minutes of lurking, if no message already sent
	var ej = {
		accountPermaId: permaid,
		customId: socket.handshake.session.userData.username,
		displayName: socket.handshake.session.userData.displayas
	}

	socket.on('chat send', (input) => {
		try {
			chatAddNormalMessage(input, socket, null)
		}
		catch (e) {
			console.log(e)
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
			userData = (typeof socket.handshake.session.userData.permaid === "undefined" ? null : socket.handshake.session.userData)
			var ret = { success: false, err: null }
			pool.request()
				.input("RoomName", sql.VarChar, input.roomName)
				.input("CreatedBy", sql.Int, userData.permaid)
				.execute("dbo.spChatRoomsAdd", (err, result) => {
					console.log(result)
					ret.success = (!err && result.rowsAffected[0] === 1 ? true : false)
					if (ret.success) {
						stage2()
					} else {
						ret.err = err
						socket.emit('room added', ret)
					}
				})

			// Send message to chat of room creation
			function stage2() {
				var extra = '{ "accountPermaId": "' + userData.permaid + '", '
				extra += '"customId": "' + userData.username + '", '
				extra += '"displayName": "' + userData.displayas + '", '
				extra += '"room": "' + input.roomName + '" }'
				var smp = { room: "tournytime", content: "{player} created room: {room}", extra: extra }
				chatAddSystemMessage(smp, (err, result) => {
					if (!err) {
						ret.success = true
						chatChecksum = generateSessionId()
						var retchat = {
							input: input,
							err: err,
							fromDb: result,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', retchat)
					}
					ioChat.emit('room added', ret)
				})
			}
		}
		catch (e) {
			var ret = { success: false, err: e }
			ioChat.emit('chat sent', ret)
		}
	})
	socket.on('room description change', (input) => {
		var chParams = { room: input.room, description: input.description }
		datastore.procedure.chatRoomChangeDescription(chParams, (changeErr, changeResult) => {
			socket.emit('room description change response', { err: changeErr, result: changeResult })
			bcToServer(changeErr, changeResult)
		})

		function bcToServer(changeErr, changeResult) {
			if (!changeErr) {
				// Broadcast update to server
				var bcChange = {
					room: input.room,
					description: changeResult.recordset[0].Description
				}
				ioChat.emit('room description changed', bcChange)

				// Broadcast message to room
				userData = (typeof socket.handshake.session.userData.permaid === "undefined" ? null : socket.handshake.session.userData)
				var extra = {
					accountPermaId: userData.permaid,
					customId: userData.username,
					displayName: userData.displayas,
					newDescription: changeResult.recordset[0].Description
				}
				extra = JSON.stringify(extra)
				var msgContent = '~ {player} changed room description ~\nNew description: <span style="font-weight: normal">{newDescription}</span>'
				var smp = { room: input.room, content: msgContent, extra: extra }
				chatAddSystemMessage(smp, (msgErr, msgResult) => {
					if (!msgErr) {
						chatChecksum = generateSessionId()
						var retchat = {
							input: input,
							err: msgErr,
							fromDb: msgResult,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', retchat)
					}
				})
			}
		}

	})
	socket.on('react send', (input) => {
		try {
			var ret = { success: false, result: null, err: null, input: input }
			
			if (typeof (input.messageId * 1) !== "number" || typeof input.reaction !== "string") {
				ret.err = "Invalid parameters"
				socket.emit('react sent', ret)
			} else {
				pool.request()
					.input("AccountPermaId", sql.Int, socket.handshake.session.userData.permaid)
					.input("MessageId", sql.Int, input.messageId)
					.input("Reaction", sql.VarChar, input.reaction)
					.execute("spChatReact", (err, result) => {
						ret.success = true
						ret.err = err
						ret.result = result
						if (err) {
							socket.emit('react sent', ret)
						} else {
							chatChecksum = generateSessionId()
							ret.checksum = chatChecksum
							ioChat.emit('react sent', ret)
							var pass = { justdone: "reactSend", userData: socket.handshake.session.userData, params: { messageId: input.messageId } }
							achiev.updateAchievements(pass, (uaerr, uaresult) => {
								if (typeof pass.userData.permaid !== "undefined") {
									distributeAchievementUpdate(pass.userData.permaid, { err: uaerr, result: uaresult })
								}
							})
						}
					})
			}
		}
		catch (e) {
			var ret = { success: false, err: e }
			socket.emit('react sent', ret)
		}
	})
	socket.on('message edit', (input) => {
		try {
			var ret = { success: false, result: null, err: null, input: input }

			if (typeof (input.messageId * 1) !== "number" || typeof input.content !== "string" || typeof input.contentHtml !== "string") {
				ret.err = "Invalid parameters"
				socket.emit('message edited', ret)
			} else {
				pool.request()
					.input("AccountPermaId", sql.Int, permaid)
					.input("MessageId", sql.Int, input.messageId)
					.input("Content", sql.VarChar, input.content)
					.input("ContentHTML", sql.VarChar, input.contentHtml)
					.execute("spChatEdit", (err, result) => {
						ret.success = true
						ret.err = err
						ret.result = result
						if (err) {
							socket.emit('message edited', ret)
						} else {
							chatChecksum = generateSessionId()
							ret.checksum = chatChecksum
							ioChat.emit('message edited', ret)
							//var pass = { justdone: "messageEdit", userData: socket.handshake.session.userData, params: { messageId: input.messageId } }
							//achiev.updateAchievements(pass, (uaerr, uaresult) => {
							//	if (typeof pass.userData.permaid !== "undefined") {
							//		distributeAchievementUpdate(pass.userData.permaid, { err: uaerr, result: uaresult })
							//	}
							//})
						}
					})
			}
		}
		catch (e) {
			var ret = { success: false, err: e }
			socket.emit('message edited', ret)
		}

	})
	socket.on('activity send', (input) => {
		var lastCur = accountsInChat[permaid].forActivityIndicator.lastActive
		var lastIn = new Date(input.lastActive)
		accountsInChat[permaid].forActivityIndicator.lastActive = lastIn.getTime() > lastCur.getTime() ? lastIn : lastCur
	})
	socket.on('activity all request', () => {
		var accs = []
		for (i in accountsInChat) {
			accs[i] = accountsInChat[i].forActivityIndicator.status
		}
		socket.emit('activity all repsonse', accs)
	})
	socket.on('room join', (input) => {
		var params = input
		params.session = socket.handshake.session
		datastore.procedure.chatRoomJoin(params, (err, result) => {
			socket.emit('room joined', { room: input.room, success: err ? false : true })
			if (!err) {
				var userData = socket.handshake.session.userData
				var ej = {
					accountPermaId: userData.permaid,
					customId: userData.username,
					displayName: userData.displayas
				}
				var smp = {
					room: input.room,
					content: "~ {player} has joined this room ~",
					extra: JSON.stringify(ej)
				}
				chatAddSystemMessage(smp, (msgErr, msgResult) => {
					if (!msgErr) {
						chatChecksum = generateSessionId()
						var retchat = {
							input: input,
							err: msgErr,
							fromDb: msgResult,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', retchat)
					}
				})
			}
		})
	})
	socket.on('room leave', (input) => {
		var params = input
		params.session = socket.handshake.session
		datastore.procedure.chatRoomLeave(params, (err, result) => {
			socket.emit('room left', { room: input.room, success: err ? false : true })
			if (!err) {
				var userData = socket.handshake.session.userData
				var ej = {
					accountPermaId: userData.permaid,
					customId: userData.username,
					displayName: userData.displayas
				}
				var smp = {
					room: input.room,
					content: "~ {player} has left this room ~",
					extra: JSON.stringify(ej)
				}
				chatAddSystemMessage(smp, (msgErr, msgResult) => {
					if (!msgErr) {
						chatChecksum = generateSessionId()
						var retchat = {
							input: input,
							err: msgErr,
							fromDb: msgResult,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', retchat)
					}
				})
			}
		})
	})
	socket.on('room archive', (input) => {
		var params = input
		params.session = socket.handshake.session
		datastore.procedure.chatRoomArchive(params, (err, result) => {
			socket.emit('room archived', { room: input.room, success: err ? false : true })
			ioChat.emit('room archived global', { room: input.room, success: err ? false : true })
			if (!err) {
				var userData = socket.handshake.session.userData
				var ej = {
					accountPermaId: userData.permaid,
					customId: userData.username,
					displayName: userData.displayas,
					room: input.room
				}
				// Local room message
				var localSmp = {
					room: input.room,
					content: "~ {player} archived this room ~",
					extra: JSON.stringify(ej)
				}
				chatAddSystemMessage(localSmp, (localErr, localResult) => {
					if (!localErr) {
						chatChecksum = generateSessionId()
						var retchat = {
							input: input,
							err: localErr,
							fromDb: localResult,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', retchat)
					}
				})
				// Tournytime message
				var ttSmp = {
					room: 'tournytime',
					content: "~ {player} archived {room} ~",
					extra: JSON.stringify(ej)
				}
				chatAddSystemMessage(ttSmp, (ttErr, ttResult) => {
					if (!ttErr) {
						chatChecksum = generateSessionId()
						var retchat = {
							input: input,
							err: ttErr,
							fromDb: ttResult,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', retchat)
					}
				})
			}
		})
	})
	socket.on('room unarchive', (input) => {
		var params = input
		params.session = socket.handshake.session
		datastore.procedure.chatRoomUnarchive(params, (err, result) => {
			socket.emit('room unarchived', { room: input.room, success: err ? false : true })
			ioChat.emit('room unarchived global', { room: input.room, success: err ? false : true })
			if (!err) {
				var userData = socket.handshake.session.userData
				var ej = {
					accountPermaId: userData.permaid,
					customId: userData.username,
					displayName: userData.displayas,
					room: input.room
				}
				// Local room message
				var localSmp = {
					room: input.room,
					content: "~ {player} unarchived this room ~",
					extra: JSON.stringify(ej)
				}
				chatAddSystemMessage(localSmp, (localErr, localResult) => {
					if (!localErr) {
						chatChecksum = generateSessionId()
						var retchat = {
							input: input,
							err: localErr,
							fromDb: localResult,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', retchat)
					}
				})
				// Tournytime message
				var ttSmp = {
					room: 'tournytime',
					content: "~ {player} unarchived {room} ~",
					extra: JSON.stringify(ej)
				}
				chatAddSystemMessage(ttSmp, (ttErr, ttResult) => {
					if (!ttErr) {
						chatChecksum = generateSessionId()
						var retchat = {
							input: input,
							err: ttErr,
							fromDb: ttResult,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', retchat)
					}
				})
			}
		})
	})
	socket.on('disconnect', () => {
		if (accountsInChat[permaid] !== "undefined") {
			accountsInChat[permaid].connectionCount--
			var ej = {
				accountPermaId: permaid,
				customId: socket.handshake.session.userData.username,
				displayName: socket.handshake.session.userData.displayas
			}
			// System message broadcast
			setTimeout(considerAddingLeaveMessage, 20000, ej)
		}
	})

	socket.on('sync check', (inputChecksum) => {
		var chatIsSynced = true
		if (inputChecksum !== chatChecksum) {
			chatIsSynced = false
		}
		socket.emit('sync result', chatIsSynced)
	})
})
// Chat helper for sending normal messages
function chatAddNormalMessage(input, socket, overrideFrom) {
	var input = (typeof input === "object" ? input : null)
	input.from = socket ? socket.handshake.session.userData.permaid : null
	input.from = overrideFrom || input.from
	datastore.procedure.chatSend(input, (err, response) => {
		chatChecksum = generateSessionId()
		var ret = {
			input: input,
			err: err,
			fromDb: response,
			checksum: chatChecksum
		}
		ioChat.emit('chat sent', ret)
		// Do achievement-related stuff
		if (socket) {
			achiev.updateAchievements({ justdone: "chatSend", userData: socket.handshake.session.userData, params: input }, (uaerr, uaresult) => {
				if (typeof socket.handshake.session.userData.permaid !== "undefined") {
					distributeAchievementUpdate(socket.handshake.session.userData.permaid, { err: uaerr, result: uaresult })
				}
			})
		}
		// Check krisbot responses
		if (input.from !== 69) {
			checkKrisbot(input.content, input.room)
		}
	})
}
// Chat helper for adding system messages
function chatAddSystemMessage(params, callback) {
	console.log("add system message doing")
	pool.request()
		.input("Room", sql.VarChar, params.room)
		.input("Sender", sql.Int, null)
		.input("Message", sql.VarChar, params.content)
		.input("ContentHTML", sql.VarChar, params.content)
		.input("MessageType", sql.VarChar, "Action")
		.input("ExtraJSON", sql.VarChar, params.extra)
		.execute("spChatSend", (err, result) => {
			console.log("add system message done")
			callback(err, result)
		})
}
// Chat helper for tracking activity and sending out updates
var chatActivityChecker = setInterval(() => {
	var n = new Date()
	var changes = {}
	var changeCount = 0

	for (i in accountsInChat) {
		var acc = accountsInChat[i]
		var activeDate = new Date(acc.forActivityIndicator.lastActive)
		var oldStatus = acc.forActivityIndicator.status
		var newStatus
		if (Math.abs(n.getTime() - activeDate.getTime()) > 20000) {
			if (acc.connectionCount === 0) {
				newStatus = "offline"
			} else {
				newStatus = "inactive"
			}
		} else {
			newStatus = "online"
		}
		accountsInChat[i].forActivityIndicator.status = newStatus
		if (oldStatus !== newStatus) {
			changeCount++
			changes[i] = newStatus
		}
	}

	if (changeCount > 0) {
		console.log(changes)
		ioChat.emit('activity update', changes)
	}
}, 4253)
// Chat helper for krisbot responses
function checkKrisbot(msgContent, room) {
	// First, get krisbot responses
	getResponses()
	function getResponses() {
		datastore.data["chatKrisbotResponsesGet"]({}, (err, response) => {
			if (err) {
				console.log("Error getting krisbot responses")
			} else {
				parseResponses(response.recordset.recordset)
			}
		})
	}

	function parseResponses(dbResponses) {
		// Since multiple inputs can be provided, 
		// split them
		var lookFors = []
		for (i in dbResponses) {
			var splitted = (dbResponses[i].LookFor).split("\n")
			for (i2 in splitted) {
				var p = {
					lookFor: splitted[i2],
					responses: dbResponses[i].RespondWith
				}
				lookFors.push(p)
			}
		}

		// For each possible lookfor, perform a search
		for (i in lookFors) {
			var reg = new RegExp(lookFors[i].lookFor, 'i')
			var matches = msgContent.match(reg)
			if (matches) {
				// Gather the different responses and pick one
				var splitted = (lookFors[i].responses).split("\n")
				var picked = splitted[Math.floor(Math.random() * splitted.length)]
				console.log("Respond with " + picked)

				var msgToAdd = {
					content: picked,
					contentHtml: picked,
					uid: Math.random(),
					room: room
				}
				setTimeout(am, 10 + Math.pow(Math.random(), 2.2) * 2000, msgToAdd)
				function am(input) {
					chatAddNormalMessage(input, null, 69)
				}
			}
		}
	}

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

/* =================== */
/* MVP award scheduler */
/* =================== */
if (!devOrLive.dev) {
	var mvpweekly = schedule.scheduleJob('5 1 * * 1', () => {
		achiev.mvpWeekly((err, result) => {
			if (!err) {
				var p = {
					room: "tournytime",
					content: result,
					extra: null
				}
				chatAddSystemMessage(p, (err2, result2) => {
					if (!err2) {
						chatChecksum = generateSessionId()
						var ret = {
							err: err2,
							fromDb: result2,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', ret)
					}
				})
			} else {
				console.log("Error with MVP:")
				console.log(err)
			}
		})
	})
	var mvpmonthly = schedule.scheduleJob('5 1 1 * *', () => {
		achiev.mvpMonthly((err, result) => {
			if (!err) {
				var p = {
					room: "tournytime",
					content: result,
					extra: null
				}
				chatAddSystemMessage(p, (err2, result2) => {
					if (!err2) {
						chatChecksum = generateSessionId()
						var ret = {
							err: err2,
							fromDb: result2,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', ret)
					}
				})
			} else {
				console.log("Error with MVP:")
				console.log(err)
			}
		})
	})
	var mvpyearly = schedule.scheduleJob('5 1 1 1 *', () => {
		achiev.mvpYearly((err, result) => {
			if (!err) {
				var p = {
					room: "tournytime",
					content: result,
					extra: null
				}
				chatAddSystemMessage(p, (err2, result2) => {
					if (!err2) {
						chatChecksum = generateSessionId()
						var ret = {
							err: err2,
							fromDb: result2,
							checksum: chatChecksum
						}
						ioChat.emit('chat sent', ret)
					}
				})
			} else {
				console.log("Error with MVP:")
				console.log(err)
			}
		})
	})
}