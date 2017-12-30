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
				var info = response.recordset.recordset[0]

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

				// Side 1
				if (info.Player1Id !== null && info.Player2Id !== null) {
					var p1 = '<a href="/mcm/player/' + info.Player1Id + '">' + info.Player1Name + '</a>'
					$('#side1head').html(p1)
					var p2 = '<a href="/mcm/player/' + info.Player2Id + '">' + info.Player2Name + '</a>'
					$('#side2head').html(p2)
				}
			}
		}
	})

})