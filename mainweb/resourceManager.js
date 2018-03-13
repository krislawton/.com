function findOne (haystack, arr) {
	return arr.some(function (v) {
		return haystack.indexOf(v) >= 0
	})
}

function cr(input) {
	this.send = input.send
	this.type = (typeof input.type === "string" ? input.type : "file")
	this.loggedInOnly = (typeof input.loggedInOnly === "boolean" ? input.loggedInOnly : false)
	this.siteId = (typeof input.siteId === "object" ? input.siteId : [0])
	this.parameterized = (typeof input.parameterized === "boolean" ? input.parameterized : false)
	this.directory = (typeof input.directory === "string" ? input.directory : '')
}

var	resources = {
	// Common
	"/c/dataTransformers.js": new cr({
		send: "/common/dataTransformers.js"
	}),
	"/c/FiraCode-Regular.ttf": new cr({
		send: "/common/FiraCode-Regular.ttf"
	}),
	"/c/FiraSans-Regular.ttf": new cr({
		send: "/common/FiraSans-Regular.ttf"
	}),
	"/c/jquery-3.2.1.min.js": new cr({
		send: "/common/jquery-3.2.1.min.js"
	}),
	"/c/socket.io.js": new cr({
		send: "/common/socket.io.js"
	}),
	// Root
	"/": new cr({
		type: "render",
		send: "homepage",
		loggedInOnly: true
	}),
	"/u/common.css": new cr({
		send: "/views/common.css"
	}),
	"/u/homepage.js": new cr({
		send: "/views/homepage.js",
		loggedInOnly: true
	}),
	"/login": new cr({
		type: "render",
		send: "login.js"
	}),
	"/u/login.css": new cr({
		send: "/views/login.css"
	}),
	"/u/login.js": new cr({
		send: "/views/login.js"
	}),
	// Nomic
	"/u/nomic/common.css": new cr({
		send: "/views/nomic/common.css",
		loggedInOnly: true,
		siteId: [3]
	}),
	"/nomic/rules": new cr({
		type: "render",
		send: "rules",
		loggedInOnly: true,
		siteId: [3],
		directory: '/nomic'
	}),
	"/u/nomic/rules.js": new cr({
		send: "/views/nomic/rules.js",
		loggedInOnly: true,
		siteId: [3]
	}),
	"/u/nomic/rules.css": new cr({
		send: "/views/nomic/rules.css",
		loggedInOnly: true,
		siteId: [3]
	}),
	"/nomic/chat": new cr({
		type: "render",
		send: "chat",
		loggedInOnly: true,
		siteId: [3],
		directory: '/nomic'
	}),
	"/u/nomic/chat.js": new cr({
		send: "/views/nomic/chat.js",
		loggedInOnly: true,
		siteId: [3]
	}),
	"/u/nomic/chat.css": new cr({
		send: "/views/nomic/chat.css",
		loggedInOnly: true,
		siteId: [3]
	}),
	"/nomic/proposal": new cr({
		type: "render",
		send: "proposal",
		loggedInOnly: true,
		siteId: [3],
		directory: "/nomic",
		parameterized: true
	}),
	"/u/nomic/proposal.js": new cr({
		send: "/views/nomic/proposal.js",
		loggedInOnly: true,
		siteId: [3]
	}),
	"/u/nomic/proposal.css": new cr({
		send: "/views/nomic/proposal.css",
		loggedInOnly: true,
		siteId: [3]
	}),
}

module.exports = {
	// Function to check if user can access
	canAccess: (resource, userData, callback) => {
		var lookFor = resource

		// Check if resource is URL parameterized
		var lio = resource.lastIndexOf('/'),
			param
		if (lio !== -1) {
			var tc = resource.substring(0, lio)
			if (typeof resources[tc] !== "undefined" && resources[tc].parameterized) {
				lookFor = tc
				param = resource.substring(lio + 1)
			}
		}

		// Check resource exists
		if (typeof resources[lookFor] === "undefined") {
			callback("Resource not found")
			return
		}

		// Check resource is authorized
		var thisResource = resources[lookFor]
		if (userData.loggedIn === false && thisResource.loggedInOnly) {
			callback("Unauthorized")
			return
		} else if (!findOne(userData.sites, thisResource.siteId)) {
			callback("Unauthorized")
			return
		} else {
			if (typeof param === "string") {
				thisResource.urlParameter = param
			}
			callback(null, thisResource)
			return
		}
	}
}