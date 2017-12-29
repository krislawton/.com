$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Get the player ID
	var playerId = $('meta#playerId').attr('data-playerid')

	// Emit a request for the match history
	socket.emit('data request', { request: "mcmPlayerInfo", params: { PlayerId: playerId } })
	socket.emit('grid request', { load: "mcmPlayerMatches", params: { PlayerId: playerId } })
	socket.emit('data request', { request: "mcmPlayerInventory", params: { PlayerId: playerId } })

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
				field = dataTransformer(model[c].format, field)
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
	socket.on('data response', (response) => {
		console.log(response)

		// Received response for player info
		if (response.input.request === "mcmPlayerInfo") {
			var pinfo = response.recordset.recordset[0]
			// Name at top
			$('h1').html(pinfo.Name)

			// Stat boxes
			$('#leaderboard .description').html(pinfo.Leaderboard)
			$('#mmr .description').html(pinfo.MMR)
			$('#played .description').html(pinfo.Played)
			$('#won .description').html(pinfo.Won)
			$('#lost .description').html(pinfo.Lost)
			$('#winpercent .description').html(pinfo.WinPercent)
			$('#scored .description').html(pinfo.GoalsScored)
			$('#conceeded .description').html(pinfo.GoalsConceeded)
			$('#diff .description').html(pinfo.GoalDifference)
			var createdDate = dataTransformer('datetime short', pinfo.CreatedDate)
			$('#created .description').html(createdDate)
			var firstMatch = dataTransformer('datetime short', pinfo.FirstMatch)
			$('#first .description').html(firstMatch)
			var lastMatch = dataTransformer('datetime short', pinfo.LastMatch)
			$('#last .description').html(lastMatch)
		}
		// Received response for inventory
		if (response.input.request === "mcmPlayerInventory") {
			var inventory = response.recordset.recordset
			$('#invItemContainer').html('')

			var toAppend = ''
			for (i in inventory) {
				var rarity = inventory[i].Rarity
				var color = (inventory[i].Color === null ? '' : inventory[i].Color)
				toAppend += '<div class="itemBox rarity-' + rarity.toLowerCase() + '">'
				toAppend += '<div class="rarity">' + rarity + '</div>'
				toAppend += '<div class="main">'
				if (color !== "") {
					toAppend += '<div class="colorBorder ' + color.toLowerCase().replace(' ', '') + '"></div>'
				}
				toAppend += '<div class="name">' + inventory[i].Item + '</div>'
				toAppend += '</div></div>'
			}
			$('#invItemContainer').append(toAppend)
		}
	})
})