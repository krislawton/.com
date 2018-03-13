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
var defaultSession = { userData: { loggedIn: false, sites: [0] } }
var sessionMiddleware = session({
	store: new storesessions(storeconfig, storeoptions),
	maxAge: 60 * 60 * 1000,
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
		console.log('Accessing "' + request.url + '", ' + "err: " + err + ", result: " + result)

		if (!err) {
			app.set('views', path.join(__dirname, '/views', result.directory));
			if (result.type === "render") {
				response.render(result.send, {
					urlParameter: (typeof result.urlParameter !== "undefined" ? result.urlParameter : null)
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
//	response.render('homepage', { root: __dirname + '/views' })
//}).get('/u/:file', (request, response) => {
//	var file = request.params.file
//	response.sendFile(file, { root: __dirname + '/views' })
//}).get('/mcm/:sub/:par*?', (request, response) => {
//	var passedModel = null
//	var passedData = null
//	var toRender = null
//	var redirect = false
//	var redirTo = null
//	if (request.params.sub === "leaderboard") {
//		toRender = "mcm/leaderboard"
//		passedModel = new model.mcmLeaderboard()
//	} else if (request.params.sub === "player" && typeof request.params.par !== "undefined") {
//		toRender = "mcm/player"
//		passedModel = new model.mcmPlayerMatches()
//		passedData = request.params.par
//	} else if (request.params.sub === "match" && typeof request.params.par !== "undefined") {
//		toRender = "mcm/match"
//		passedData = request.params.par
//	} else if (request.params.sub === "summary") {
//		toRender = "mcm/summary"
//	} else {
//		redirect = true
//		redirTo = "/"
//	}

//	if (redirect) {
//		response.redirect(redirTo)
//	} else {
//		response.render(toRender, { model: passedModel, params: passedData })
//	}
//}).get('/u/mcm/:file', (request, response) => {
//	var file = request.params.file
//	response.sendFile(file, { root: __dirname + '/views/mcm' })
//}).get('/nomic/:sub/:par*?', (request, response) => {
//	var passedData = null
//	var toRender = null
//	var redirect = false
//	var redirTo = null
//	if (request.params.sub === "rules") {
//		toRender = "nomic/rules"
//	} else if (request.params.sub === "rule" && typeof request.params.par !== "undefined") {
//		toRender = "nomic/rule"
//		passedData = request.params.par
//	} else if (request.params.sub === "chat") {
//		toRender = "nomic/chat"
//	} else if (
//		request.params.sub === "proposal"
//		&& typeof request.params.par !== "undefined"
//		&& (
//			!isNaN(request.params.par) || request.params.par === "new"
//		)
//	) {
//		toRender = "nomic/proposal"
//		passedData = request.params.par
//	} else {
//		redirect = true
//		redirTo = "/"
//	}

//	if (redirect) {
//		response.redirect(redirTo)
//	} else {
//		response.render(toRender, { params: passedData })
//	}
//}).get('/u/nomic/:file', (request, response) => {
//	var file = request.params.file
//	response.sendFile(file, { root: __dirname + '/views/nomic' })
//}).get('/:sub', (request, response) => {
//	var toRender = request.params.sub
//	response.render(toRender, { root: __dirname + '/views' })
//}).get('/((socket\.io|c))/:file', (request, response) => {
//	var file = request.params.file
//	response.sendFile(file, { root: __dirname + '/common' })
})

//}).get(["/403", "/404", "/501"], (request, response) => {
//	var pg = request.path.slice(1) // remove slash from URL to get page name
//	response.render(pg, { root: __dirname + '/views' })
//}).get('/v/login', (request, response) => {
//	if (typeof request.session.userData !== "undefined" && request.session.userData.loggedIn) {
//		response.redirect('/')
//	} else {
//		response.render("login", { root: __dirname + '/views' })
//	}
//}).get('/v/:sub/:id?', (request, response) => {
//	console.log(request.session)
//	var sub = request.params.sub
//	var id = request.params.id
//	var passedModel
//	var redirect = false, redirTo
//	var ud = request.session.userData

//	if (redirect) {
//		response.redirect('/' + redirTo)
//	} else {
//		response.render(sub, { model: passedModel, id: id })
//	}
//}).get('/vu/:file', (request, response) => {
//	var file = request.params.file
//	response.sendFile(file, { root: __dirname + '/views/' })
//}).get('/s/:file', (request, response) => {
//	var file = request.params.file
//	response.sendFile(file, { root: __dirname + '/static/' })
//}).get('/u/:file', (request, response) => {
//	var file = request.params.file
//	response.sendFile(file, { root: __dirname + '/utils/' })
//}).get('/socket.io/:file', (request, response) => {
//	var file = request.params.file
//	if (file == null || file == "") {
//		file = "socket.io.js"
//	}
//	response.sendFile(file, { root: __dirname + '/utils/' })
//})

/* ============================== */
/* SOCKETS ARE VERY IMPORTANT OK? */
/* ============================== */
io.on('connection', function (socket) {

	// With the right manipulation, any socket request can be sent to the 
	// server. Therefore, put the request in a try block to prevent the 
	// server from crashing if it encounters such a manipulation.

	/* =========== */
	/* OI OI LOGIN */
	/* =========== */
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
					.query("select AccountPermaId, Pw from Accounts where CustomId = @CustomId", (err, result) => {
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
						permaid: userInfo.AccountPermaId,
						sites: null
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

	/* ========================================== */
	/* DATA-RELATED STUFF (TILL NEAR END OF FILE) */
	/* ========================================== */

	socket.on('grid request', (input) => {
		try {
			var params = (typeof input.params === "object" ? input.params : null)
			datastore.grids[input.load](params, (err, response) => {
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
			var params = (typeof input.params === "object" ? input.params : null)
			datastore.data[input.request](params, (err, response) => {
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
			var params = (typeof input.params === "object" ? input.params : null)
			datastore.procedure[input.procedure](params, (err, response) => {
				console.log("Data store access completed")
				var ret = {
					input: input,
					err: err,
					response: response,
					params: params
				}
				console.log(err)
				socket.emit('db procedure response', ret)
			})
		}
		catch (e) {
			var ret = {
				input: input,
				err: e,
				response: null,
				params: params
			}
			console.log(e)
			socket.emit('db procedure response', ret)
		}
	})
})

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