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
				rulesHtml += '<div class="buttoncontainer"><button class="inline history">History</button></div>'
				rulesHtml += '</h3>'
				rulesHtml += rows[r].RuleBody
				rulesHtml += '</div>'
			}
			$('#rulesContainer').html(rulesHtml)
		}
	})

	// On admin edit press
	$(document).on('click', 'button.adminedit', (e) => {
		console.log(e)
	})

})