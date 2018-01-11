$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Get the player ID
	var matchId = $('meta#matchId').attr('data-matchid')

	// Emit a request for the match info
	socket.emit('data request', { request: "mcmMatchInfo", params: { MatchId: matchId } })

	socket.on('data response', (response) => {
		console.log(response)
		if (response.input.request === "mcmMatchInfo") {
			if (response.err !== null) {
				$('#error').html(response.err)
			} else {
				// Info var
				var info = response.recordset.recordsets[0][0]

				// Date
				var date = dataTransformer('datetime long', info.MatchDate)
				$('#matchDate').html(date)

				// Type
				$('#matchType').html(info.Type)

				// Length
				var minutes = Math.floor(info.Length / 60)
				var seconds = Math.ceil(info.Length % 60)
				var length = "FULL-TIME: " + minutes + " minutes, " + seconds + " seconds"
				$('#matchLength').html(length)

				// Score line
				var scoreline = info.Team1Score + '–' + info.Team2Score
				$('#scoreline').html(scoreline)

				// Sides
				if (info.Player1Id !== null && info.Player2Id !== null) {
					var p1 = '<a href="/mcm/player/' + info.Player1Id + '">' + info.Player1Name + '</a>'
					$('#side1head').html(p1)
					var p2 = '<a href="/mcm/player/' + info.Player2Id + '">' + info.Player2Name + '</a>'
					$('#side2head').html(p2)
				}

				// Clear notes and add list
				$('#notes').html('<ul></ul>')

				// MMR changes
				var mmrChanges = response.recordset.recordsets[1]
				for (i in mmrChanges) {
					var changeType, changeClass
					if (mmrChanges[i].MMRAfter > mmrChanges[i].MMRBefore) {
						changeType = "gained"
						changeClass = "gain"
					} else if (mmrChanges[i].MMRAfter < mmrChanges[i].MMRBefore) {
						changeType = "lost"
						changeClass = "loss"
					} else {
						changeType = "no change"
						changeClass = "neutral"
					}
					var diff = mmrChanges[i].MMRAfter - mmrChanges[i].MMRBefore
					var string = '<li><span class="change ' + changeClass + '">' + changeType + '</span> ' + diff + ' MMR to '
					string += '<a href= "/mcm/player/' + mmrChanges[i].PlayerId + '" > ' + mmrChanges[i].Name + '</a>'
					string += ' (from ' + mmrChanges[i].MMRBefore + ' to ' + mmrChanges[i].MMRAfter + ')'
					$('#notes ul').append(string)
				}

				// Item unlocks
				var iu = response.recordset.recordsets[2]
				for (i in iu) {
					var aoran = ((iu[i].Item).substring(0, 1).match(/[aeiuo]/) ? 'an' : 'a')
					var painted = (iu[i].ColorId !== null ? ', painted ' + iu[i].Color : '')
					var string = '<li><a href="/mcm/player/' + iu[i].PlayerId + '">' + iu[i].Player + '</a>'
					string += ' unlocked ' + aoran + ' ' + iu[i].Item
					string += ' (' + iu[i].Rarity + painted + ')</li>'
					$('#notes ul').append(string)
				}
			}
		}
	})

})