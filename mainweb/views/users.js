$(document).ready(() => {
	// Connect to socket
	const socket = io()

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
				displayName.innerHTML = users[r].DisplayName

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