$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Emit a request for the match history
	socket.emit('data request', { request: "nomicRules" })

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
				rulesHtml += '<div class="buttoncontainer"><button class="inline adminedit">Admin&nbsp;edit</button></div>'
				rulesHtml += '<div class="buttoncontainer"><a class="button inline history" href="/nomic/rule/'+ rows[r].RuleId +'">History</a></div>'
				rulesHtml += '</h3>'
				rulesHtml += '<div class="ruleBody">' + rows[r].RuleBody + '</div>'
				rulesHtml += '</div>'
			}
			$('#rulesContainer').html(rulesHtml)
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
		toAppend +='<textarea>' + globalRules[ruleIndex].RuleBody + '</textarea>'
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
		var newContent = $(e.currentTarget).parents('.ruleEdit').children('textarea').val()
		var ruleId = globalRules[ruleIndex].RuleId

		socket.emit('db procedure request', { procedure: "nomicRulesAdminEdit", params: { ruleId: ruleId, newContent: newContent, ruleIndex: ruleIndex } })

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