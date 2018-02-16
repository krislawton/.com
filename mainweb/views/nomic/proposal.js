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
	var proposalResponse = null
	socket.on('data response', (response) => {
		console.log(response)
		// On receive player list
		if (response.input.request === "nomicPlayers") {
			receivedPlayers = true
			var players = response.recordset.recordset,
				toAppend = ''
			$('select option:not([value="null"]').remove()
			for (var p in players) {
				toAppend += '<option value="' + players[p].PlayerId + '">' + players[p].Name + '</option>'
			}
			$('select#as').append(toAppend)
			checkProposalReady()
		}
		// On rules list receive
		if (response.input.request === "nomicRules") {
			receivedRules = true
			globalRules = response.recordset.recordset
			checkProposalReady()
		}
		// On proposal data received
		if (response.input.request === "nomicProposal") {
			receivedProposal = true
			proposalResponse = response
			checkProposalReady()
		}
	})

	// Helper: Check if proposal contents are ready to be displayed
	var receivedPlayers = false,
		receivedRules = false,
		receivedProposal = false
	function checkProposalReady() {
		if (receivedPlayers && receivedRules && receivedProposal) {
			proposalReceived(proposalResponse)
		}
	}
	// Helper: On proposal contents received
	function proposalReceived(response) {
		var prop = response.recordset.recordsets[0][0]
		$('#as').val(prop.PlayerId)
		$('[name="proposalName"]').val(prop.ProposalName)
		var amends = response.recordset.recordsets[1]
		for (var a in amends) {
			newRuleChange(amends[a])
		}
	}

	// Each time a new rule change is created it is given this number which is incremented.
	var newId = 1

	// Helper: New rule change
	function newRuleChange(dbRecord) {
		
		var amendmentId = (typeof dbRecord !== "object" ? "new" : dbRecord.AmendmentId)

		var toAppend = ''
		toAppend += '<div class="ruleChange" '
		if (typeof dbRecord !== "object") {
			toAppend += 'data-amendmentid="new" data-newid="' + newId
			newId++
		} else {
			toAppend += 'data-amendmentid="' + dbRecord.AmendmentId + '" data-newid="null'
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
		toAppend += '<div class="rcTextContainer"><table class="rcText"><tbody><tr>'
		toAppend += '<td class="rcTextOld">'
		toAppend += (typeof dbRecord === "object" ? dbRecord.OldText : '')
		toAppend += '</td>'
		toAppend += '<td class="rcTextNew"><textarea></textarea></td>'
		toAppend += '</tr></tbody></table></div>'
		toAppend += '<button class="raised deleteRuleChange">Delete rule change</button>'
		toAppend += '</div>'

		$('#ruleChangeContainer').append(toAppend)

		if (typeof dbRecord === "object") {
			var selector = '.ruleChange[data-amendmentid="' + dbRecord.AmendmentId + '"] '
			$(selector + '[name="changeType"]').val(dbRecord.AmendType).trigger("change")
			$(selector + '[name="rcRule"]').val((dbRecord.RuleId === null ? 'null' : ruleIndexFromId(dbRecord.RuleId))).trigger("change")
			$(selector + '.rcTextNew textarea').val((dbRecord.NewText !== null ? dbRecord.NewText : ''))
		}
	}

	// Handle new rule change button press
	$(document).on('click', '#newRuleChange', (e) => {
		newRuleChange()
	})

	// Delete rule change
	var deletedAmendments = []
	$(document).on('click', '.deleteRuleChange', (e) => {
		var parent = $(e.currentTarget).parents('.ruleChange')
		var amendId = $(parent).attr('data-amendmentid')
		if (amendId !== "new") {
			deletedAmendments.push(amendId)
		}
		$(parent).remove()
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

			// Amendment ID
			toIns.amendmentId = $(htmlRules[i]).attr('data-amendmentid')

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

		if (proposalId === "new") {
			socket.emit('db procedure request', { procedure: "nomicProposalNew", params: { propName: propName, proposer: proposer, ruleChanges: ruleChanges } })
		} else {
			socket.emit('db procedure request', { procedure: "nomicProposalUpdate", params: { 
				proposalId: proposalId,
				propName: propName,
				proposer: proposer,
				ruleChanges: ruleChanges,
				deletes: deletedAmendments
			}
			})
		}
		//var constr = { proposalId: proposalId, propName: propName, proposer: proposer, ruleChanges: ruleChanges }
		//console.log(constr)

		// Disable form elements
		$('#ruleChangeContainer, #newRuleChange, #submit').prop('disabled', true)
	})

	// On save receipt
	socket.on('db procedure response', (response) => {
		window.location.href = "/nomic/rules"
	})

	// Helper: Get global rules index from rule ID
	function ruleIndexFromId(ruleId) {
		var index = null

		for (i in globalRules) {
			if (globalRules[i].RuleId === ruleId) {
				index = i
			}
		}

		return index
	}

})