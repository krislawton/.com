$(document).ready(() => {

	// Connect to socket
	const socket = io()

	// Global: Store contents of responses
	var gResponses = {}

	// Load current responses
	socket.emit('data request', { request: "chatKrisbotResponsesGet" })
	socket.on('data response', (response) => {
		console.log(response)
		if (response.input.request === "chatKrisbotResponsesGet" && !response.err) {
			// Hide loading
			$('.loading').hide()
			// Mark old responses to-be-removed
			$('#responses form.response').addClass('to-be-removed')
			// Remember scroll position
			var rememberScroll = document.body.scrollTop

			// Build and render new responses
			gResponses = {}
			var db = response.recordset.recordset
			for (i in db) {
				gResponses[db[i].ResponseId] = {
					lookFor: db[i].LookFor,
					respondWith: db[i].RespondWith
				}

				var form = document.createElement("form")
				form.className = "response"
				form.dataset.responseid = db[i].ResponseId
				form.dataset.localid = "exists"

				var left = document.createElement("div")
				left.className = "left"
				var lhead = document.createElement("h2")
				lhead.innerText = "When someone says"
				var lte = document.createElement("textarea")
				lte.className = "someone-says"
				lte.textContent = db[i].LookFor

				left.appendChild(lhead)
				left.appendChild(lte)
				form.appendChild(left)

				var right = document.createElement("div")
				right.className = "right"
				var rhead = document.createElement("h2")
				rhead.innerText = "Krisbot responds"
				var rte = document.createElement("textarea")
				rte.className = "krisbot-responds"
				rte.textContent = db[i].RespondWith

				right.appendChild(rhead)
				right.appendChild(rte)
				form.appendChild(right)

				var buttons = document.createElement("div")
				buttons.className = "buttons hidden"
				var bCancel = document.createElement("button")
				bCancel.className = "button raised cancel"
				bCancel.innerText = "Cancel"
				var bSubmit = document.createElement("button")
				bSubmit.className = "button raised colored submit"
				bSubmit.innerText = "Submit"
				var bDelete = document.createElement("button")
				bDelete.className = "button raised negative delete"
				bDelete.innerText = "Delete"
				buttons.appendChild(bDelete)
				buttons.appendChild(bCancel)
				buttons.appendChild(bSubmit)
				form.appendChild(buttons)

				var info = document.createElement("div")
				info.className = "info"

				form.appendChild(info)

				$('#responses').append(form)
			}
			// Set textarea heights
			var els = $("form.response textarea").toArray()
			for (i in els) {
				$(els[i]).css('height', 'auto')
				var sh = $(els[i])[0].scrollHeight
				sh = sh > 1500 ? 1500 : sh
				$(els[i]).height(sh)
			}

			// Remove old responses
			$('#responses form.response.to-be-removed').remove()
			// Scroll to old position
			document.body.scrollTop = rememberScroll
		}
	})

	// Disable form submit - we use async
	$(document).on("submit", 'form.response', (e) => {
		e.preventDefault()
	})

	// When user types in form, check whether buttons can become active
	$(document).on("input propertychange", 'form.response[data-localid="exists"] textarea', (e) => {
		var responseId = $(e.target).parents('form.response').attr('data-responseid')
		var textLookFor = $('form.response[data-responseid="' + responseId + '"] textarea.someone-says').val()
		var textRespondWith = $('form.response[data-responseid="' + responseId + '"] textarea.krisbot-responds').val()

		var gob = gResponses[responseId]

		if (gob.lookFor !== textLookFor || gob.respondWith !== textRespondWith) {
			$('form.response[data-responseid="' + responseId + '"] .buttons').removeClass('hidden')
		} else {
			$('form.response[data-responseid="' + responseId + '"] .buttons').addClass('hidden')
		}

	})

	// Response cancel
	$(document).on("click", 'form.response button.cancel', (e) => {
		var responseId = $(e.target).parents('form.response').attr('data-responseid')
		if (responseId === "new") {
			$(e.target).parents('form.response').remove()
		} else {
			var gob = gResponses[responseId]
			$('form.response[data-responseid="' + responseId + '"] textarea.someone-says').val(gob.lookFor)
			$('form.response[data-responseid="' + responseId + '"] textarea.krisbot-responds').val(gob.respondWith)

			$('form.response[data-responseid="' + responseId + '"] .buttons').addClass('hidden')
		}
	})
	// Response submit
	$(document).on("click", 'form.response button.submit', (e) => {
		var responseId = $(e.target).parents('form.response').attr('data-responseid')
		var localId = $(e.target).parents('form.response').attr('data-localid')

		// Interface
		$('form.response[data-responseid="' + responseId + '"] *').prop("disabled", true)
		$('form.response[data-responseid="' + responseId + '"] button.submit').html("Submitting...")

		// Gather info for sending update
		var textLookFor = $('form.response[data-responseid="' + responseId + '"] textarea.someone-says').val()
		var textRespondWith = $('form.response[data-responseid="' + responseId + '"] textarea.krisbot-responds').val()

		// Sent update to server
		var params = {
			responseId: responseId === "new" ? null : responseId,
			lookFor: textLookFor,
			respondWith: textRespondWith,
			deleted: 0,
			localId: localId
		}
		socket.emit('db procedure request', { procedure: "chatKrisbotResponseCrud", params: params })
	})
	// Submit has completed
	socket.on('db procedure response', (response) => {
		console.log(response)
		if (response.input.procedure === "chatKrisbotResponseCrud" && response.params.deleted === 0) {
			var responseId = response.params.responseId
			var sel = $('form.response[data-responseid="' + responseId + '"]')
			// Undisable form elements
			$(sel).find('*').prop("disabled", false)

			if (response.err) {
				// Try again
				$(sel).find('button.submit').html("Error, try again")
			} else {
				// Update global obj and hide buttons
				gResponses[responseId] = {
					lookFor: response.params.lookFor,
					respondWith: response.params.respondWith
				}
				$(sel).find('.buttons').hide()
				$(sel).find('button.delete').html("Delete")
				$(sel).find('button.submit').html("Submit")
				socket.emit('data request', { request: "chatKrisbotResponsesGet" })
			}
		}
	})
	// Response delete
	$(document).on("click", 'form.response button.delete', (e) => {
		var responseId = $(e.target).parents('form.response').attr('data-responseid')

		// Interface
		$('form.response[data-responseid="' + responseId + '"] *').prop("disabled", true)
		$('form.response[data-responseid="' + responseId + '"] button.delete').html("Deleting...")

		// Gather info for sending update
		var textLookFor = $('form.response[data-responseid="' + responseId + '"] textarea.someone-says').val()
		var textRespondWith = $('form.response[data-responseid="' + responseId + '"] textarea.krisbot-responds').val()

		// Sent update to server
		var params = {
			responseId: responseId,
			lookFor: textLookFor,
			respondWith: textRespondWith,
			deleted: 1,
		}
		socket.emit('db procedure request', { procedure: "chatKrisbotResponseCrud", params: params })
	})
	// Delete has completed
	socket.on('db procedure response', (response) => {
		if (response.input.procedure === "chatKrisbotResponseCrud" && response.params.deleted === 1) {
			var responseId = response.params.responseId
			var sel = $('form.response[data-responseid="' + responseId + '"]')
			// Undisable form elements
			$(sel).find('*').prop("disabled", false)

			if (response.err) {
				// Try again
				$(sel).find('button.delete').html("Error, try again")
			} else {
				// Update global obj and hide buttons
				delete gResponses[responseId]
				$(sel).remove()
			}
		}
	})

	// New response button
	var newId = 1
	$('#new').on("click", (e) => {
		var form = document.createElement("form")
		form.className = "response"
		form.dataset.responseid = "new"
		form.dataset.localid = newId
		newId++

		var left = document.createElement("div")
		left.className = "left"
		var lhead = document.createElement("h2")
		lhead.innerText = "When someone says"
		var lte = document.createElement("textarea")
		lte.className = "someone-says"

		left.appendChild(lhead)
		left.appendChild(lte)
		form.appendChild(left)

		var right = document.createElement("div")
		right.className = "right"
		var rhead = document.createElement("h2")
		rhead.innerText = "Krisbot responds"
		var rte = document.createElement("textarea")
		rte.className = "krisbot-responds"

		right.appendChild(rhead)
		right.appendChild(rte)
		form.appendChild(right)

		var buttons = document.createElement("div")
		buttons.className = "buttons"
		var bCancel = document.createElement("button")
		bCancel.className = "button raised cancel"
		bCancel.innerText = "Cancel"
		var bSubmit = document.createElement("button")
		bSubmit.className = "button raised colored submit"
		bSubmit.innerText = "Submit"
		var bDelete = document.createElement("button")
		bDelete.className = "button raised negative delete"
		bDelete.innerText = "Delete"
		buttons.appendChild(bDelete)
		buttons.appendChild(bCancel)
		buttons.appendChild(bSubmit)
		form.appendChild(buttons)

		$('#responses').append(form)
	})

})