$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Emit a request for the achievements
	socket.emit('data request', { request: "rootAchievementsLoadAll" })

	socket.on('data response', (response) => {
		console.log(response)
		if (response.input.request === "rootAchievementsLoadAll") {
			var achs = response.recordset.recordset,
				prevRecord = null
			for (i in achs) {
				var toAppend = ""
				if (prevRecord !== null) {
					if (prevRecord.DomainId === achs[i].DomainId && prevRecord.GroupId !== achs[i].GroupId) {
						toAppend += '<div class="ach-divider"></div>'
					}
				}

				toAppend += '<div class="ach-line">'
				toAppend += '<div class="ach-badgecontainer">'
				toAppend += '<div class="ach-badge lvl' + achs[i].LevelId + '">'
				toAppend += achs[i].AchievementName
				toAppend += '</div>'
				toAppend += '</div>'
				toAppend += '<div class="ach-info">' + achs[i].Information + '</div>'
				toAppend += '<div class="ach-counts" title="To ' + achs[i].People + ' people">'
				toAppend += '<span class="ach-countnumber">' + achs[i].Awarded + '</span>'
				toAppend += ' awarded</div>'
				toAppend += '</div>'

				prevRecord = achs[i]

				$('.ach-here#domain' + achs[i].DomainId).append(toAppend)
			}


		}
	})

})