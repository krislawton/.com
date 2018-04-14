$(document).ready(function () {
	// Connect to socket
	const socket = io()
	const achievementUrl = $('#ids').attr('data-achievementurl')

	// Load achievement data
	socket.emit('data request', { request: "rootAchievementLoadSingle", params: { achievementUrl: achievementUrl } })
	socket.on('data response', (response) => {
		console.log(response)
		if (!response.err && response.input.request === "rootAchievementLoadSingle") {
			var general = response.recordset[0]
			var dbUsers = response.recordsets[1]
			var achievements = response.recordsets[2]

			var users = {}
			for (i in dbUsers) {
				var r = dbUsers[i]
				users[r.AccountPermaId] = {
					amount: r.Amount,
					userId: r.CustomId,
					displayName: r.DisplayName,
					color: randomColor(r.CustomId, r.ColorChoiceId),
				}
			}

			// General info
			var header = document.createElement("div")
			header.className = "ach-badge lvl" + general.LevelId
			header.innerHTML = general.AchievementName
			$('main h1').html(header)

			var lvls = {
				1: "level 1 (bronze)",
				2: "level 2 (silver)",
				3: "level 3 (gold)",
				4: "level 4 (platinum)",
				"-1": "naughty level 1 (grey)",
				"-2": "naughty level 2 (black)",
				"-3": "naughty level 3 (red)"
			}
			var plead = '<span style="font-weight: bold">' + general.AchievementName + '</span> is a ' + lvls[general.LevelId] + ' acheivement. '
			plead += 'So far, ' + achievements.length + ' have been awarded to ' + dbUsers.length + ' different users. '
			plead += 'Here is its description/requirement:'
			$('p.lead').html(plead)
			var pdesc = general.Information + ((general.Information).match(/.+\.$/g) === null ? "." : "") + " " + general.Information2
			$('p.info').html(pdesc)

			// Grouped by user (most-awarded at top)
			if (achievements.length >= 1 /* 10 */) {
				var headerGroupedUser = document.createElement("h2")
				headerGroupedUser.innerHTML = "By user"
				$('main').append(headerGroupedUser)

				var lastRankValue = -1
				for (i in dbUsers) {
					var userline = document.createElement("div")
					userline.className = "user-line"

					var elRank = document.createElement("div")
					elRank.className = "rank"
					elRank.innerHTML = "Rank " + (dbUsers[i].Amount == lastRankValue ? "=" : "#" + (i * 1 + 1))
					lastRankValue = dbUsers[i].Amount

					var nametag = document.createElement("a")
					nametag.href = "/user/" + dbUsers[i].AccountPermaId + "-" + dbUsers[i].CustomId
					nametag.className = "nametag"
					nametag.style.color = randomColor(dbUsers[i].CustomId, dbUsers[i].ColorChoiceId)
					nametag.innerHTML = dbUsers[i].DisplayName

					var elAmount = document.createElement("div")
					elAmount.className = "amount"
					elAmount.innerHTML = "Achieved " + dbUsers[i].Amount + " times"

					userline.appendChild(elRank)
					userline.appendChild(nametag)
					userline.appendChild(elAmount)
					$('main').append(userline)
				}

				var headerIndividuals = document.createElement("h2")
				headerIndividuals.innerHTML = "Individual awards"
				$('main').append(headerIndividuals)
			}

			// Individual acheivemetns given

			for (i in achievements) {
				var achline = document.createElement("div")
				achline.className = "ach-line"

				var u = users[achievements[i].AccountPermaId]

				var nametag = document.createElement("a")
				nametag.href = "/user/" + achievements[i].AccountPermaId + "-" + u.userId
				nametag.className = "nametag"
				nametag.style.color = u.color
				nametag.innerHTML = u.displayName

				var when = document.createElement("div")
				when.className = "when"
				when.innerHTML = "Acheived " + dataTransformer("ago", achievements[i].AwardedDate) + " ago"
				when.title = dataTransformer("datetime long", achievements[i].AwardedDate)

				achline.appendChild(nametag)
				achline.appendChild(when)

				$('main').append(achline)
			}

		}

	})
})