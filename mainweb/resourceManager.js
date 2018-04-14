// Load view
const model = require("./model.js")

// Helper: If one item from first input array matches any item from second input array
function findOne(haystack, arr) {
	if (haystack === null) {
		haystack = [0]
	} 
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
	"/c/jquery.easing.1.3.js": new cr({
		send: "/common/jquery.easing.1.3.js"
	}),
	"/c/jquery-3.2.1.min.js": new cr({
		send: "/common/jquery-3.2.1.min.js"
	}),
	"/c/socket.io.js": new cr({
		send: "/common/socket.io.js"
	}),
	"/c/socket.io.js.map": new cr({
		send: "/common/socket.io.js.map"
	}),
	"/c/IconAbout.png": new cr({
		send: "/common/IconAbout.png"
	}),
	"/c/IconAchievement.png": new cr({
		send: "/common/IconAchievement.png"
	}),
	"/c/IconProfile.png": new cr({
		send: "/common/IconProfile.png"
	}),
	"/c/Logo.png": new cr({
		send: "/common/Logo.png"
	}),
	"/c/LogoWhite.png": new cr({
		send: "/common/LogoWhite.png"
	}),
	"/c/SoundCiv4Border.mp3": new cr({
		send: "/common/SoundCiv4Border.mp3"
	}),
	"/c/SoundCiv4Chat.mp3": new cr({
		send: "/common/SoundCiv4Chat.mp3"
	}),
	"/c/SoundCiv4LossMiddle.mp3": new cr({
		send: "/common/SoundCiv4LossMiddle.mp3"
	}),
	"/c/SoundCiv4War.mp3": new cr({
		send: "/common/SoundCiv4War.mp3"
	}),
	"/c/SoundMGS.mp3": new cr({
		send: "/common/SoundMGS.mp3"
	}),
	"/c/SoundPop.mp3": new cr({
		send: "/common/SoundPop.mp3"
	}),
	"/c/SoundTOS.ogg": new cr({
		send: "/common/SoundTOS.ogg"
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
	"/u/common.js": new cr({
		send: "/views/common.js"
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
	"/achievement": new cr({
		type: "render",
		send: "achievement",
		loggedInOnly: true,
		parameterized: true
	}),
	"/u/achievement.css": new cr({
		send: "/views/achievement.css",
		loggedInOnly: true
	}),
	"/u/achievement.js": new cr({
		send: "/views/achievement.js",
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
	"/settings": new cr({
		type: "render",
		send: "settings",
		loggedInOnly: true,
		siteId: [0]
	}),
	"/u/settings.css": new cr({
		send: "/views/settings.css",
		loggedInOnly: true
	}),
	"/u/settings.js": new cr({
		send: "/views/settings.js",
		loggedInOnly: true
	}),
	"/user": new cr({
		type: "render",
		send: "user",
		loggedInOnly: true,
		siteId: [0],
		parameterized: true
	}),
	"/u/user.css": new cr({
		send: "/views/user.css",
		loggedInOnly: true
	}),
	"/users": new cr({
		type: "render",
		send: "users",
		loggedInOnly: true,
		siteId: [0]
	}),
	"/u/users.css": new cr({
		send: "/views/users.css",
		loggedInOnly: true
	}),
	"/u/users.js": new cr({
		send: "/views/users.js",
		loggedInOnly: true
	}),
	"/u/user.js": new cr({
		send: "/views/user.js",
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

var usmev = 1 // user session metadata version
module.exports = {
	// Expose user session metadata ID
	usmev: usmev,
	// Function to check if user can access
	canAccess: (resource, userData, callback) => {
		var lookFor = resource
		var lusmev = (typeof userData.usmev !== "undefined" ? userData.usmev : 0)

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
		if ((lusmev !== usmev || userData.loggedIn === false) && thisResource.loggedInOnly) {
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