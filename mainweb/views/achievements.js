$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Emit a request for the achievements
	socket.emit('data request', { request: "rootAchievementsLoadAll" })

	var extrainfo = []

	socket.on('data response', (response) => {
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
				var needsExtra = (achs[i].Information2 !== null ? true : false),
					extraId = extrainfo.indexOf(achs[i].Information2)

				if (extraId === -1) {
					console.log("Pushing, this is the state before (pushing " + achs[i].Information2 + ")")
					console.log(extrainfo)
					extraId = extrainfo.push(achs[i].Information2)
					extraId--
				}

				toAppend += '<div class="ach-line">'
				toAppend += '<div class="ach-badgecontainer">'
				toAppend += '<div class="ach-badge lvl' + achs[i].LevelId + '">'
				toAppend += achs[i].AchievementName
				toAppend += '</div>'
				toAppend += '</div>'
				toAppend += '<div class="ach-info">' + achs[i].Information
				toAppend += (needsExtra ? '<sup class="dagger' + extraId + '">†' + extraId + '</sup>': "")
				toAppend += '</div>'
				toAppend += '<div class="ach-counts" title="To ' + achs[i].People + ' people">'
				toAppend += '<span class="ach-countnumber">' + achs[i].Awarded + '</span>'
				toAppend += ' awarded</div>'
				toAppend += '</div>'

				prevRecord = achs[i]

				$('.ach-here#domain' + achs[i].DomainId).append(toAppend)
			}
			// For each dagger, insert its description after the last one
			console.log(extrainfo)
			for (i in extrainfo) {
				var id = +i + 1,
					html = '<div class="ach-extrainfo">†' + id + ': ' + extrainfo[id] + '</div>'
				// For some reason a null gets pushed in this array, idk why and idc
					
				$('.dagger' + id).eq(-1).parents('.ach-line').after(html)
			}


		}
	})

})