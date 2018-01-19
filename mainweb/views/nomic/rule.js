$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Get the rule ID
	var ruleId = $('meta#ruleId').attr('data-ruleid')

	// Emit a request for the rule history
	socket.emit('data request', { request: "nomicRuleHistory", params: { ruleId: ruleId } })

	socket.on('data response', (response) => {
		//
	})

})