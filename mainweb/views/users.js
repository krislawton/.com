$(document).ready(() => {
	// Connect to socket
	const socket = io()

	// Color from id and mode
	function randomColor(inputId, mode) {
		var characters = inputId.split('')
		var unicodeCombined = 0
		for (var i in characters) {
			var char = characters[i]
			unicodeCombined += Math.pow(char.charCodeAt(0), 1.3 - (i * 0.01))
		}
		unicodeCombined += Math.pow(characters.length, 1.2)

		var expHue = 1,
			expLig = 1,
			expSat = 1
		if (mode == 1) {
			expHue = 0.755
			expLig = 0.432
			expSat = 1.203
		} else if (mode == 2) {
			expHue = 0.943
			expLig = 1.047
			expSat = 0.943
		} else if (mode == 3) {
			expHue = 1.369
			expLig = 0.999
			expSat = 0.696
		}

		var randHue = Math.pow(unicodeCombined, expHue) // default 0.755
		randHue = Math.round((randHue % 1) * 10000) % 360
		var randLig = Math.pow(unicodeCombined, expLig) // default 0.432
		randLig = Math.round((randLig % 1) * 10000)
		var randSat = Math.pow(unicodeCombined, expSat) // default 1.203
		randSat = Math.round((randSat % 0.1) * 10 * 60)
		randSat += 40

		// Compress to result in less greens to get more reds-yellows
		//if (randHue <= 140) {
		//	randHue = randHue * (100 / 140)
		//} else if (randHue > 140 && randHue <= 180) {
		//	randHue = 180 - (180 - randHue) * 2
		//}

		if (randHue >= 40 && randHue <= 200) {
			// Between yellow and sky blue, lightness is 35-60
			randLig = 35 + (randLig % 25)
		} else {
			// Else, 30-80.
			randLig = 30 + (randLig % 50)
		}

		var colorString = "hsl(" + randHue + ", " + randSat + "%, " + randLig + "%)"

		return colorString
	}

	// Get users 
	socket.emit('data request', { request: "rootUsersAll" })
	// On get
	socket.on('data response', (response) => {
		console.log(response)
		if (!response.err && response.input.request === "rootUsersAll") {
			var users = response.recordset
			for (r in users) {
				var profileHref = "/user/" + users[r].AccountPermaId + "-" + users[r].CustomId
				
				var row = document.createElement("div")
				row.className = "player"

				var linkToProfile = document.createElement("a")
				linkToProfile.href = profileHref
				linkToProfile.className = "profile-link"
				linkToProfile.title = "Go to profile"

				var displayName = document.createElement("div")
				displayName.className = "display-name"
				console.log(users[r])
				displayName.style.color = randomColor(users[r].CustomId, users[r].ColorChoiceId)
				displayName.textContent = users[r].DisplayName

				var idExtra = document.createElement("div")
				idExtra.className = "extra-ids"
				idExtra.textContent = "(" + users[r].CustomId + "#" + users[r].AccountPermaId + ")"

				linkToProfile.appendChild(displayName)
				linkToProfile.appendChild(idExtra)

				var lastActivity = document.createElement("div")
				lastActivity.className = "last-activity"
				lastActivity.textContent = "Last active " + dataTransformer("datetime long", users[r].LastPageView)

				var pageLoads = document.createElement("div")
				pageLoads.className = "page-loads"
				pageLoads.textContent = users[r].PageLoads + " page loads"
				pageLoads.title = "Only one page load per 10 minute block counts"

				var achs = document.createElement("div")
				achs.className = "achievements"

				var a4 = document.createElement("div")
				a4.className = "achievement level4"
				var a4i = document.createElement("div")
				a4i.className = "icon"
				var a4t = document.createElement("span")
				a4t.textContent = users[r].Platinum
				a4.appendChild(a4i)
				a4.appendChild(a4t)

				var a3 = document.createElement("div")
				a3.className = "achievement level3"
				var a3i = document.createElement("div")
				a3i.className = "icon"
				var a3t = document.createElement("span")
				a3t.textContent = users[r].Gold
				a3.appendChild(a3i)
				a3.appendChild(a3t)

				var a2 = document.createElement("div")
				a2.className = "achievement level2"
				var a2i = document.createElement("div")
				a2i.className = "icon"
				var a2t = document.createElement("span")
				a2t.textContent = users[r].Silver
				a2.appendChild(a2i)
				a2.appendChild(a2t)

				var a1 = document.createElement("div")
				a1.className = "achievement level1"
				var a1i = document.createElement("div")
				a1i.className = "icon"
				var a1t = document.createElement("span")
				a1t.textContent = users[r].Bronze
				a1.appendChild(a1i)
				a1.appendChild(a1t)

				achs.appendChild(a4)
				achs.appendChild(a3)
				achs.appendChild(a2)
				achs.appendChild(a1)

				row.appendChild(linkToProfile)
				row.appendChild(lastActivity)
				row.appendChild(pageLoads)
				row.appendChild(achs)

				$('#all-users').append(row)
			}
		}
	})

})