$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Emit a request for the leaderboard
	socket.emit('grid request', { load: "mcmLeaderboard" })

	// Grid helper: Build table of maximum #{limit} rows
	function rebuildGrid(limit, response) {
		var toAppend = ""

		for (var r = 0; r < response.recordset.length && (r < limit || limit === 0 ); r++)  {
			toAppend += buildRow(response.recordset[r], response.model)
		}

		if (limit < response.recordset.length && limit !== 0) {
			var amountLeft = response.recordset.length - limit
			toAppend += '<tr class="loadMoreRows"><td colspan="100">Load more rows ('+amountLeft+' rows hidden)</td></tr>'
		}

		$('#leaderboardGrid tr:not(.nondata)').remove()
		$('#leaderboardGrid tbody').append(toAppend)
	}

	// Grid helper: Build row
	function buildRow(inputRow, model) {
		var building = ''

		building += '<tr'
		// First, hidden fields
		for (c in model) {
			if (model[c].hidden) {
				building += ' data-' + c.toLowerCase() + '="' + inputRow[c] + '"'
			}
		}
		building += '>'
		// Now, cells
		for (c in model) {
			if (!model[c].hidden) {
				var field
				if (c === "Name") {
					field = '<a href="/mcm/player/'+inputRow.PlayerId+'">' + inputRow[c] + '</a>'
				} else {
					field = inputRow[c]
				}
				building += '<td>' + field + '</td>'
			}
		}
		building += '</tr>'

		return building
	}

	$(document).on('click', '.loadMoreRows', (ev) => {
		console.log(ev)
		rebuildGrid(0, gridResponse)
	})

	var gridResponse = {}
	socket.on('grid response', (response) => {
		if (response.err) {
			$('#error').html(response.err)
		} else {
			// Store latest response in a global variable (probably silly but idc)
			gridResponse = response
			// Rebuild grid with first 100 records
			rebuildGrid(100, gridResponse) 
		}
	})
})