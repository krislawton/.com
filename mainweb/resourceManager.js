// Load view
const model = require("./model.js")

// Helper: If one item from first input array matches any item from second input array
function findOne(haystack, arr) {
	return arr.some(function (v) {
		return haystack.indexOf(v) >= 0
	})
}

// Helper: Resource class (Create Resource)
function cr(input) {
	this.send = input.send
	this.type = (typeof input.type === "string" ? input.type : "file")
	this.loggedInOnly = (typeof input.loggedInOnly === "boolean" ? input.loggedInOnly : false)
	this.siteId = (typeof input.siteId === "object" ? input.siteId : [0])
	this.parameterized = (typeof input.parameterized === "boolean" ? input.parameterized : false)
	this.directory = (typeof input.directory === "string" ? input.directory : '')
	this.passToView = (typeof input.passToView === "object" ? input.passToView : null)
}

var resources = {
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
	"/c/IconAchievement.png": new cr({
		send: "/common/IconAchievement.png"
	}),
	"/c/IconAchievementL1.png": new cr({
		send: "/common/IconAchievementL1.png"
	}),
	"/c/IconAchievementL2.png": new cr({
		send: "/common/IconAchievementL2.png"
	}),
	"/c/IconAchievementL3.png": new cr({
		send: "/common/IconAchievementL3.png"
	}),
	"/c/IconAchievementL4.png": new cr({
		send: "/common/IconAchievementL4.png"
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
		send: "login"
	}),
	"/u/login.css": new cr({
		send: "/views/login.css"
	}),
	"/u/login.js": new cr({
		send: "/views/login.js"
	}),
	"/chat": new cr({
		type: "render",
		send: "chat",
		loggedInOnly: true
	}),
	"/u/chat.css": new cr({
		send: "/views/chat.css",
		loggedInOnly: true
	}),
	"/u/chat.js": new cr({
		send: "/views/chat.js",
		loggedInOnly: true
	}),
	"/achievements": new cr({
		type: "render",
		send: "achievements",
		loggedInOnly: true
	}),
	"/u/achievements.css": new cr({
		send: "/views/achievements.css",
		loggedInOnly: true
	}),
	"/u/achievements.js": new cr({
		send: "/views/achievements.js",
		loggedInOnly: true
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
	// MCM
	"/u/mcm/common.css": new cr({
		send: "/views/mcm/common.css",
		loggedInOnly: true,
		siteId: [2]
	}),
	"/mcm/leaderboard": new cr({
		type: "render",
		send: "leaderboard",
		loggedInOnly: true,
		siteId: [2],
		directory: "/mcm",
		passToView: { model: new model.mcmLeaderboard() }
	}),
	"/u/mcm/leaderboard.js": new cr({
		send: "/views/mcm/leaderboard.js",
		loggedInOnly: true,
		siteId: [2]
	}),
	"/mcm/player": new cr({
		type: "render",
		send: "player",
		loggedInOnly: true,
		siteId: [2],
		directory: "/mcm",
		parameterized: true,
		passToView: { model: new model.mcmPlayerMatches() }
	}),
	"/u/mcm/player.js": new cr({
		send: "/views/mcm/player.js",
		loggedInOnly: true,
		siteId: [2]
	}),
	"/u/mcm/player.css": new cr({
		send: "/views/mcm/player.css",
		loggedInOnly: true,
		siteId: [2]
	}),
	"/mcm/match": new cr({
		type: "render",
		send: "match",
		loggedInOnly: true,
		siteId: [2],
		directory: "/mcm",
		parameterized: true
	}),
	"/u/mcm/match.js": new cr({
		send: "/views/mcm/match.js",
		loggedInOnly: true,
		siteId: [2]
	}),
	"/u/mcm/match.css": new cr({
		send: "/views/mcm/match.css",
		loggedInOnly: true,
		siteId: [2]
	}),
	"/mcm/summary": new cr({
		type: "render",
		send: "summary",
		loggedInOnly: true,
		siteId: [2],
		directory: "/mcm",
		parameterized: true
	}),
	"/u/mcm/summary.js": new cr({
		send: "/views/mcm/summary.js",
		loggedInOnly: true,
		siteId: [2]
	}),
	"/u/mcm/summary.css": new cr({
		send: "/views/mcm/summary.css",
		loggedInOnly: true,
		siteId: [2]
	})
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