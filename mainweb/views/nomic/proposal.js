$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Proposal ID
	var proposalId = $('meta#proposalId').attr('data-proposalid')

	// Load players for select dropdown
	socket.emit('data request', { request: "nomicPlayers" })
	socket.emit('data request', { request: "nomicRules" })
	if (proposalId !== "new") {
		socket.emit('data request', { request: "nomicProposal", params: { proposalId: proposalId } })
	}

	// Rules stored globally
	var globalRules = []

	// Socket receivers
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
		// On rules list receive
		if (response.input.request === "nomicRules") {
			globalRules = response.recordset.recordset
		}
		// On proposal data received
		if (response.input.request === "nomicProposal") {

		}
	})

	// Each time a new rule change is created it is given this number which is incremented.
	var newId = 1

	// Helper: New rule change
	function newRuleChange(dbRecord) {
		var amendmentId = (typeof dbRecord !== "object" ? "new" : dbRecord.AmendmentId)

		var toAppend = ''
		toAppend += '<div class="ruleChange" data-amendmentid="new" data-newid="'
		if (typeof dbRecord !== "object") {
			toAppend += newId
			newId++
		} else {
			toAppend += 'null'
		}
		toAppend += '">'
		toAppend += '<p>Rule change type <select name="changeType">'
		toAppend += '<option value="null">Please select</option>'
		toAppend += '<option value="new">New rule</option>'
		toAppend += '<option value="amend">Amend rule</option>'
		toAppend += '<option value="remove">Repeal rule</option>'
		toAppend += '</select></p>'
		toAppend += '<div class="rcBody">'
		toAppend += '<select name="rcRule">'
		toAppend += '<option value="null">Select rule</option>'

		for (var r in globalRules) {
			toAppend += '<option value="' + r + '">'
			toAppend += globalRules[r].RuleNumber
			toAppend += '</option>'
		}

		toAppend += '</select>'
		toAppend += '<table class="rcText"><tbody><tr>'
		toAppend += '<td class="rcTextOld"></td>'
		toAppend += '<td class="rcTextNew"><textarea></textarea></td>'
		toAppend += '</tr></tbody></table>'
		toAppend += '<button class="raised deleteRuleChange">Delete rule change</button>'
		toAppend += '</div>'

		$('#ruleChangeContainer').append(toAppend)

		newId++
	}

	// Handle new rule change button press
	$(document).on('click', '#newRuleChange', (e) => {
		newRuleChange()
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
			$(elementRc).find('.rcTextNew').addClass('shown')
		} else if (type === "amend") {
			$(elementRc).find('[name="rcRule"]').addClass('shown')
			$(elementRc).find('.rcTextOld').addClass('shown')
			$(elementRc).find('.rcTextNew').addClass('shown')
		} else if (type === "remove") {
			$(elementRc).find('[name="rcRule"]').addClass('shown')
			$(elementRc).find('.rcTextOld').addClass('shown')
			$(elementRc).find('.rcTextNew').removeClass('shown')
		} else {
			$(elementRc).find('[name="rcRule"]').removeClass('shown')
			$(elementRc).find('.rcTextOld').removeClass('shown')
			$(elementRc).find('.rcTextNew').removeClass('shown')
		}
	})

	// If rule change's rule is changed, populate old thing
	$(document).on('change', '[name="rcRule"]', (e) => {
		var elementVal = $(e.currentTarget).val()
		var ruleText = (elementVal !== "null" ? globalRules[elementVal].RuleBody : '')
		$(e.currentTarget).parents('.ruleChange').find('.rcTextOld').text(ruleText)
		$(e.currentTarget).parents('.ruleChange').find('.rcTextNew textarea').val(ruleText)
	})

	// On rule save
	$(document).on('click', '#submit', (e) => {
		var proposer = $('#as').val()
		var propName = $('[name="proposalName"]').val()
		var ruleChanges = []
		var htmlRules = $('.ruleChange')

		var error = null

		for (var i = 0; i < htmlRules.length; i++) {
			var toIns = {}

			// Changetype
			toIns.changeType = $(htmlRules[i]).find('[name="changeType"]').val()
			if (toIns.changeType !== "new") {
				var ruleIndex = $(htmlRules[i]).find('[name="rcRule"]').val()
				toIns.ruleId = globalRules[ruleIndex].RuleId
			}
			else {
				toIns.ruleId = null
			}
			// Content
			toIns.content = (toIns.changeType !== "remove" ? $(htmlRules[i]).find('.rcTextNew textarea').val() : null)

			ruleChanges.push(toIns)
		}

		if (error !== null) {
			$('#submitError').html('ERROR with something').addClass('shown')
		} else {
			$('#submitError').html('').removeClass('shown')
		}

		socket.emit('db procedure request', { procedure: "nomicProposalNew", params: { propName: propName, proposer: proposer, ruleChanges: ruleChanges } })

		// Disable form elements
		$('#ruleChangeContainer, #newRuleChange, #submit').prop('disabled', true)
	})

	// On save receipt
	socket.on('db procedure response', (response) => {
		window.location.href = "/nomic/rules"
	})

})