$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Load players for select dropdown
	socket.emit('data request', { request: "nomicPlayers" })

	socket.on('data response', (response) => {
		console.log(response)
		// On receive player list
		if (response.input.request === "nomicPlayers") {
			var players = response.recordset.recordset,
				toAppend = ''
			$('select option').remove()
			for (var p in players) {
				toAppend += '<option value="' + players[p].PlayerId + '">' + players[p].Name + '</option>'
			}
			$('select#as').append(toAppend)
		}
	})

	// Each time a new rule change is created it is given this number which is incremented.
	var newId = 1

	// New rule change
	$(document).on('click', '#newRuleChange', (e) => {
		var toAppend = '<div class="ruleChange" data-amendmentid="new" data-newid="'+newId+'">'
		toAppend += '<p>Rule change type <select name="changeType">'
		toAppend += '<option value="null">Please select</option>'
		toAppend += '<option value="new">New rule</option>'
		toAppend += '<option value="amend">Amend rule</option>'
		toAppend += '<option value="remove">Repeal rule</option>'
		toAppend += '</select></p>'
		toAppend += '<div class="rcBody">'
		toAppend += '<select name="rcRule"></select>'
		toAppend += '<div class="rcOldText"></textarea>'
		toAppend += '<textarea class="rcText"></textarea>'
		toAppend += '</div>'
		toAppend += '<button class="raised deleteRuleChange">Delete rule change</button>'
		toAppend += '</div>'

		$('#ruleChangeContainer').append(toAppend)

		newId++
	})

	// Delete rule change
	$(document).on('click', '.deleteRuleChange', (e) => {
		$(e.currentTarget).parents('.ruleChange').remove()
	})

	// If rule change is changed to new rule
	$(document).on('change', '[name="changeType"]', (e) => {
		var elementRc = $(e.currentTarget).parents('.ruleChange')
		var type = $(e.currentTarget).val()

		if (type === "new") {
			$(elementRc).find('[name="rcRule"]').removeClass('shown')
			$(elementRc).find('.rcTextOld').removeClass('shown')
			$(elementRc).find('.rcText').addClass('shown')
		} else if (type === "amend") {
			$(elementRc).find('[name="rcRule"]').addClass('shown')
			$(elementRc).find('.rcTextOld').addClass('shown')
			$(elementRc).find('.rcText').addClass('shown')
		} else if (type === "remove") {
			$(elementRc).find('[name="rcRule"]').addClass('shown')
			$(elementRc).find('.rcTextOld').addClass('shown')
			$(elementRc).find('.rcText').removeClass('shown')
		} else {
			$(elementRc).find('[name="rcRule"]').removeClass('shown')
			$(elementRc).find('.rcTextOld').removeClass('shown')
			$(elementRc).find('.rcText').removeClass('shown')
		}
	})

})