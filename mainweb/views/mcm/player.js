$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Get the player ID
	var playerId = $('meta#playerId').attr('data-playerid')

	// Emit a request for the match history
	socket.emit('grid request', { load: "mcmPlayerMatches", params: { PlayerId: playerId } })
	socket.emit('single request', { request: "playerInfo", params: { PlayerId: playerId } })

	// Format helper: Zero pad number
	function zeroPad(input) {
		if (input < 10) {
			input = "0" + input
		}
		return input
	}

	// Grid helper: Build table of maximum #{limit} rows
	function rebuildGrid(limit, response) {
		var toAppend = ""

		for (var r = 0; r < response.recordset.length && (r < limit || limit === 0); r++) {
			toAppend += buildRow(response.recordset[r], response.model)
		}

		if (limit < response.recordset.length && limit !== 0) {
			var amountLeft = response.recordset.length - limit
			toAppend += '<tr class="loadMoreRows"><td colspan="100">Load more rows (' + amountLeft + ' rows hidden)</td></tr>'
		}

		$('#matches .grid tr:not(.nondata)').remove()
		$('#matches .grid tbody').append(toAppend)
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
				var field = inputRow[c]
				if (model[c].format === "datetime short") {
					var dateinfo = new Date(field)
					var year = zeroPad(dateinfo.getFullYear()).toString().slice()
					var month = zeroPad(dateinfo.getMonth() + 1) //0-11
					var day = zeroPad(dateinfo.getDate())
					var hour = zeroPad(dateinfo.getHours())
					var minute = zeroPad(dateinfo.getMinutes())

					field = day + '/' + month + '/' + year + ' ' + hour + ':' + minute
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
			//console.log(response)
			rebuildGrid(10, gridResponse)
		}
	})
})