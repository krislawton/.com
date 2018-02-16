/* ===================================== */
/* LOADING MODULES AND SETTING UP SERVER */
/* ===================================== */
const express = require('express')
const app = express()
const port = 1337
const server = app.listen(port, (err) => {
	if (err) {
		return console.log('Sum ting wong', err)
	}
	console.log(`Server is listening on port ${port}`)
})

const path = require('path')

const sql = require('mssql/msnodesqlv8')
const model = require('./model.js')

const session = require("express-session")
const storesessions = require("connect-mssql")(session)
const iosession = require("express-socket.io-session")

const datastore = require('./datastore.js')

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
    user: 'sa',
    password: 'StopChanging9000',
    server: '.',
    database: 'Website',
    options: {
        charset: 'Latin1_General_CI_AS'
	},
	requestTimeout: 30000
}
const dbconstr = "Driver=msnodesqlv8;Server=(local);Database=Website;Trusted_Connection=yes;TrustServerCertificate=yes;Encrypt=yes;"
// Create connection pool
const pool = new sql.ConnectionPool(dbconstr, err => {
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
//var sessionMiddleware = session({
//	store: new storesessions(storeconfig, storeoptions),
//	maxAge: 60 * 60 * 1000,
//	genid: (req) => { return generateSessionId() },
//	name: "nkei",
//	secret: 'you big query',
//	resave: true,
//	saveUninitialized: true,
//	cookie: { userData: {} }
//})
//// Tell server to use sessions
//app.use(sessionMiddleware)
//// Tell socket to use sessions
//io.use(iosession(sessionMiddleware, {
//	autoSave: true
//}))

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
app.use((request, response, next) => {
	next()
})

// Page getters
app.get('/', (request, response) => {
	response.render('homepage', { root: __dirname + '/views' })
}).get('/mcm/:sub/:par*?', (request, response) => {
	var passedModel = null
	var passedData = null
	var toRender = null
	var redirect = false
	var redirTo = null
	if (request.params.sub === "leaderboard") {
		toRender = "mcm/leaderboard"
		passedModel = new model.mcmLeaderboard()
	} else if (request.params.sub === "player" && typeof request.params.par !== "undefined") {
		toRender = "mcm/player"
		passedModel = new model.mcmPlayerMatches()
		passedData = request.params.par
	} else if (request.params.sub === "match" && typeof request.params.par !== "undefined") {
		toRender = "mcm/match"
		passedData = request.params.par
	} else if (request.params.sub === "summary") {
		toRender = "mcm/summary"
	} else {
		redirect = true
		redirTo = "/"
	}

	if (redirect) {
		response.redirect(redirTo)
	} else {
		response.render(toRender, { model: passedModel, params: passedData })
	}
}).get('/u/mcm/:file', (request, response) => {
	var file = request.params.file
	response.sendFile(file, { root: __dirname + '/views/mcm' })
}).get('/nomic/:sub/:par*?', (request, response) => {
	var passedData = null
	var toRender = null
	var redirect = false
	var redirTo = null
	if (request.params.sub === "rules") {
		toRender = "nomic/rules"
	} else if (request.params.sub === "rule" && typeof request.params.par !== "undefined") {
		toRender = "nomic/rule"
		passedData = request.params.par
	} else if (request.params.sub === "chat") {
		toRender = "nomic/chat"
	} else if (
		request.params.sub === "proposal"
		&& typeof request.params.par !== "undefined"
		&& (
			!isNaN(request.params.par) || request.params.par === "new"
		)
	) {
		toRender = "nomic/proposal"
		passedData = request.params.par
	} else {
		redirect = true
		redirTo = "/"
	}

	if (redirect) {
		response.redirect(redirTo)
	} else {
		response.render(toRender, { params: passedData })
	}
}).get('/u/nomic/:file', (request, response) => {
	var file = request.params.file
	response.sendFile(file, { root: __dirname + '/views/nomic' })
}).get('/:sub', (request, response) => {
	response.render('homepage', { root: __dirname + '/views' })
}).get('/((socket\.io|c))/:file', (request, response) => {
	var file = request.params.file
	response.sendFile(file, { root: __dirname + '/common' })
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

///* ===================================== */
///* DATA-RELATED STUFF (till end of file) */
///* ===================================== */
// Socket stuff
io.on('connection', function (socket) {
	socket.on('grid request', (input) => {
		// With the right manipulation, any data request can be sent to the 
		// server. Therefore, put the request in a try block to prevent the 
		// server from crashing if it encounters such a manipulation.
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