function findOne (haystack, arr) {
	return arr.some(function (v) {
		return haystack.indexOf(v) >= 0
	})
}

var	resources = {
	// Common
	"/c/dataTransformers.js": {
		type: "file",
		send: "/common/dataTransformers.js",
		loggedInOnly: false,
		siteId: [0]
	},
	"/c/FiraCode-Regular.ttf": {
		type: "file",
		send: "/common/FiraCode-Regular.ttf",
		loggedInOnly: false,
		sideId: [0]
	},
	"/c/FiraSans-Regular.ttf": {
		type: "file",
		send: "/common/FiraSans-Regular.ttf",
		loggedInOnly: false,
		siteId: [0]
	},
	"/c/jquery-3.2.1.min.js": {
		type: "file",
		send: "/common/jquery-3.2.1.min.js",
		loggedInOnly: false,
		siteId: [0]
	},
	"/c/socket.io.js": {
		type: "file",
		send: "/common/socket.io.js",
		loggedInOnly: false,
		siteId: [0]
	},
	// Root
	"/": {
		type: "render",
		send: "homepage",
		loggedInOnly: true,
		siteId: [0]
	},
	"/u/common.css": {
		type: "file",
		send: "/views/common.css",
		loggedInOnly: false,
		siteId: [0]
	},
	"/u/homepage.js": {
		type: "file",
		send: "/views/homepage.js",
		loggedInOnly: true,
		siteId: [0]
	},
	"/login": {
		type: "render",
		send: "login.js",
		loggedInOnly: false,
		siteId: [0]
	},
	"/u/login.css": {
		type: "file",
		send: "/views/login.css",
		loggedInOnly: false,
		siteId: [0]
	},
	"/u/login.js": {
		type: "file",
		send: "/views/login.js",
		loggedInOnly: false,
		siteId: [0]
	}
}

module.exports = {
	// Function to check if user can access
	canAccess: (resource, userData, callback) => {
		if (typeof resources[resource] === "undefined") {
			callback("Resource not found")
			return
		}

		var thisResource = resources[resource]
		if (userData.loggedIn === false && thisResource.loggedInOnly) {
			callback("Unauthorized")
			return
		} else if (!findOne(userData.sites, thisResource.siteId)) {
			callback("Unauthorized")
			return
		} else {
			callback(null, thisResource)
			return
		}
	}
}