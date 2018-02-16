$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Emit a request for the rules and open proposals
	socket.emit('data request', { request: "nomicRules" })
	socket.emit('data request', { request: "nomicProposalsOpen" })

	// Double zero pad
	function zeroPad100(input) {
		if (input < 10) {
			input = "00" + input
		} else if (input < 100) {
			input = "0" + input
		}
		return input
	}

	var globalRules = []

	// On data response
	socket.on('data response', (response) => {
		console.log(response)
		// Rules
		if (response.input.request === "nomicRules") {
			var rulesHtml = ''
			var rows = response.recordset.recordset
			globalRules = rows
			for (var r in rows) {
				rulesHtml += '<div class="rule" data-ruleindex="' + r + '">'
				rulesHtml += '<h3> Rule ' + zeroPad100(rows[r].RuleNumber)
				rulesHtml += (rows[r].RuleName !== "" ? " – " + rows[r].RuleName : '')
				rulesHtml += '<div class="buttoncontainer"><button class="inline adminedit">Admin&nbsp;edit</button></div>'
				rulesHtml += '<div class="buttoncontainer"><a class="button inline history" href="/nomic/rule/'+ rows[r].RuleId +'">History</a></div>'
				rulesHtml += '</h3>'
				rulesHtml += '<div class="ruleBody">' + rows[r].RuleBody + '</div>'
				rulesHtml += '</div>'
			}
			$('#rulesContainer').html(rulesHtml)
		}
		// Open proposals
		if (response.input.request === "nomicProposalsOpen") {
			// Insert proposals, amendments come later as they are separate SQL
			var proposalsHtml = ''
			var props = response.recordset.recordsets[0]
			for (var p in props) {
				proposalsHtml += '<div class="proposal" data-proposalid="' + props[p].ProposalId + '">'
				proposalsHtml += '<div class="proposer"><div class="label">Proposer</div><div class="description">' + props[p].Proposer + '</div></div>'
				proposalsHtml += '<div class="name"><div class="label">Name</div><div class="description">' + props[p].Name + '</div></div>'
				proposalsHtml += '<div class="status"><div class="label">Status</div><div class="description">' + props[p].StatusText + '</div></div>'
				proposalsHtml += '<div class="amendments"><div class="label">Amendments</div><ul class="description"></ul></div>'
				proposalsHtml += '<a class="button inline" href="/nomic/proposal/' + props[p].ProposalId +'">Details and voting</a>'
				proposalsHtml += '</div>'
			}
			$('#proposalsContainer').html(proposalsHtml)

			// Amendments
			var amends = response.recordset.recordsets[1]
			console.log(amends)
			for (var a in amends) {
				// Compose amendment html
				var description = (amends[a].AmendType).charAt(0).toUpperCase()
				description += amends[a].AmendType.slice(1)
				description += ' rule'
				description += (amends[a].RuleNumber !== null ? ' ' + zeroPad100(amends[a].RuleNumber) : '')
				var amendHtml = '<li class="' + amends[a].AmendType + '">' + description + '</li>'

				// Insert into HTML
				$('.proposal[data-proposalid="' + amends[a].ProposalId + '"] .amendments .description').append(amendHtml)
			}
		}
	})

	// On admin edit press
	$(document).on('click', "button.adminedit", (e) => {
		var elRule = $(e.currentTarget).parents(".rule")
		var ruleIndex = $(elRule).attr("data-ruleindex")
		console.log(elRule)
		console.log(ruleIndex)
		console.log(e)

		// Add text area and submit button
		var toAppend = '<div class="ruleEdit">'
		toAppend += '<input value="' + globalRules[ruleIndex].RuleName + '"/>'
		toAppend += '<textarea>' + globalRules[ruleIndex].RuleBody + '</textarea>'
		toAppend += '<div>'
		toAppend += '<button class="raised cancel">Cancel</button>'
		toAppend += '<button class="raised colored submit">Submit</button>'
		toAppend += '</div></div>'

		$(elRule).append(toAppend)
	})
	// On cancel admin edit
	$(document).on('click', '.ruleEdit button.cancel', (e) => {
		$(e.currentTarget).parents('.ruleEdit').remove()
	})
	// On submit admin edit
	$(document).on('click', '.ruleEdit button.submit', (e) => {
		var ruleIndex = $(e.currentTarget).parents('.rule').attr('data-ruleindex')
		var newName = $(e.currentTarget).parents('.ruleEdit').children('input').val()
		var newContent = $(e.currentTarget).parents('.ruleEdit').children('textarea').val()
		var ruleId = globalRules[ruleIndex].RuleId

		socket.emit('db procedure request', { procedure: "nomicRulesAdminEdit", params: { ruleId: ruleId, newContent: newContent, ruleIndex: ruleIndex, newName: newName } })

		$(e.currentTarget).parents('.ruleEdit').find('textarea, button').prop("disabled", true)
	})
	// On receive confirmation of admin edit
	socket.on('db procedure response', (response) => {
		console.log(response)
		if (response.input.procedure === "nomicRulesAdminEdit") {
			var ruleIndex = response.input.params.ruleIndex
			var ruleSelector = '.rule[data-ruleindex="' + ruleIndex +'"]'
			$(ruleSelector + ' .ruleEdit').remove()
			$(ruleSelector + ' .ruleBody').html(response.input.params.newContent)
			globalRules[ruleIndex].RuleBody = response.input.params.newContent
		}
	})
})