﻿$(document).ready(() => {
	// Connect to socket
	const socket = io()

	// Color from id and mode
	function randomColor(inputId, mode) {
		var characters = inputId.split('')
		var unicodeCombined = 0
		for (var i in characters) {
			var char = characters[i]
			unicodeCombined += Math.pow(char.charCodeAt(0), 1.3 - (i * 0.01))
		}
		unicodeCombined += Math.pow(characters.length, 1.2)

		var expHue = 1,
			expLig = 1,
			expSat = 1
		if (mode == 1) {
			expHue = 0.755
			expLig = 0.432
			expSat = 1.203
		} else if (mode == 2) {
			expHue = 0.943
			expLig = 1.047
			expSat = 0.943
		} else if (mode == 3) {
			expHue = 1.369
			expLig = 0.999
			expSat = 0.696
		}

		var randHue = Math.pow(unicodeCombined, expHue) // default 0.755
		randHue = Math.round((randHue % 1) * 10000) % 360
		var randLig = Math.pow(unicodeCombined, expLig) // default 0.432
		randLig = Math.round((randLig % 1) * 10000)
		var randSat = Math.pow(unicodeCombined, expSat) // default 1.203
		randSat = Math.round((randSat % 0.1) * 10 * 60)
		randSat += 40

		// Compress to result in less greens to get more reds-yellows
		//if (randHue <= 140) {
		//	randHue = randHue * (100 / 140)
		//} else if (randHue > 140 && randHue <= 180) {
		//	randHue = 180 - (180 - randHue) * 2
		//}

		if (randHue >= 40 && randHue <= 200) {
			// Between yellow and sky blue, lightness is 35-60
			randLig = 35 + (randLig % 25)
		} else {
			// Else, 30-80.
			randLig = 30 + (randLig % 50)
		}

		var colorString = "hsl(" + randHue + ", " + randSat + "%, " + randLig + "%)"

		return colorString
	}
	
	// Request user settings information
	socket.emit('data request', { request: "rootUserSettings" })
	// On repsonse
	socket.on('data response', (response) => {
		console.log(response)
		if (!response.err && response.input.request === "rootUserSettings") {
			// Undisable
			$('input:disabled').prop("disabled", false)

			// Perma ID
			$('.yourPermaId').html(response.recordset[0].AccountPermaId)

			// Display name
			$('#displayName').val(response.recordset[0].DisplayName)

			// User ID
			$('#userId').val(response.recordset[0].CustomId)

			// Color choice
			$('[name="color"][value="' + response.recordset[0].ColorChoiceId + '"]').prop("checked", true)

			// Color the boxes
			for (var i = 1; i <= 3; i++) {
				var colorString = randomColor(response.recordset[0].CustomId, i)
				$('.color' + i).parent().find('.radio-checked').css('background', colorString)
			}
		}
	})

	// Handle changes being saved
	$('form.setting').submit((e) => {
		e.preventDefault()

		if (e.target.name === "displayName") {
			var displayName = $(e.target).find('#displayName').val()
			displayName = displayName.replace('<script', '&lt;script')
			$(e.target).slideUp()
			socket.emit('db procedure request', { procedure: "rootUserChangeDisplayName", params: { displayName: displayName } })
		}

		if (e.target.name === "userId") {
			var userId = $(e.target).find('#userId').val()

			if (userId.match(/^[a-z0-9-_]{1,127}$/g) === null) {
				var ertext = "Your user ID can only contian the following: lowercase alphabet characters, numbers, hyphens, and underscores. Want less limitations? Talk to Kris."
				if (userId.length > 127) {
					ertext = "Your user ID must be shorter than that."
				}
				printErrors('userId', ertext)
			} else {
				$(e.target).slideUp()
				socket.emit('db procedure request', { procedure: "rootUserChangeUserId", params: { userId: userId } })
			}

		}

		if (e.target.name === "password") {
			var password = $(e.target).find('#password').val()
			$(e.target).slideUp()
			socket.emit('db procedure request', { procedure: "rootUserChangePassword", params: { password: password } })
		}

		if (e.target.name === "color") {
			var color = $(e.target).find('[name="color"]:checked').val()
			$(e.target).slideUp()
			socket.emit('db procedure request', { procedure: "rootUserChangeColor", params: { color: color } })
		}


	})
	// Handle repsonses
	socket.on('db procedure response', (response) => {
		console.log(response)
		if (!response.err) {
			if (response.input.procedure === "rootUserChangeDisplayName") {
				$('form.setting[name="displayName"]').slideDown()
			}
			if (response.input.procedure === "rootUserChangeUserId") {
				$('form.setting[name="userId"]').slideDown()
			}
			if (response.input.procedure === "rootUserChangePassword") {
				$('form.setting[name="password"]').slideDown()
			}
			if (response.input.procedure === "rootUserChangeColor") {
				$('form.setting[name="color"]').slideDown()
			}
		}
	})

	// Listen for session manager request
	$(document).on("click", '#load-sessions', () => {
		$('#load-sessions').prop("disabled", true)
		socket.emit('data request', { request: "rootUserSessions" })
	})
	// Listen for response and generate grid
	socket.on('data response', (response) => {
		if (response.input.request === "rootUserSessions") {
			if (response.err) {
				$('#load-sessions').html("Failed. Try again?")
				return
			} 
			$('#load-sessions').slideUp(150, "easeOutCirc")
			for (i in response.recordset) {
				var r = response.recordset[i]

				var row = document.createElement("div")
				row.className = "row"
				row.dataset.sessionid = r.sid

				var sid = document.createElement("div")
				sid.className = "sid"
				var sidL = document.createElement("span")
				sidL.className = "label"
				sidL.innerHTML = "Session ID: "
				sid.appendChild(sidL)
				sid.innerHTML += r.sid

				var used = document.createElement("div")
				used.className = "used"
				var usedL = document.createElement("span")
				usedL.className = "label"
				usedL.innerHTML = "Used: "
				used.appendChild(usedL)
				if (r.FirstRequest && r.LastRequest) {

					var firstAgo = dataTransformer("ago", r.FirstRequest)
					var firstStamp = dataTransformer("datetime long", r.FirstRequest)
					var firstEl = document.createElement("span")
					firstEl.innerHTML = firstAgo
					firstEl.title = firstStamp
					used.appendChild(firstEl)
					used.innerHTML += " to "
					var lastAgo = dataTransformer("ago", r.LastRequest)
					var lastStamp = dataTransformer("datetime long", r.LastRequest)
					var lastEl = document.createElement("span")
					lastEl.innerHTML = lastAgo
					lastEl.title = lastStamp
					used.appendChild(lastEl)
				} else {
					used.innerHTML += "Unknown"
				}

				var pls = document.createElement("div")
				pls.className = "pl"
				var plL = document.createElement("span")
				plL.className = "label"
				plL.innerHTML = "Page loads: "
				pls.appendChild(plL)
				pls.innerHTML += r.PageLoads ? r.PageLoads : ""

				var ips = document.createElement("div")
				ips.className = "ip"
				var ipsL = document.createElement("span")
				ipsL.className = "label"
				ipsL.innerHTML = "IP addresses: "
				ips.appendChild(ipsL)
				ips.innerHTML += r.DifferentIPs ? r.DifferentIPs : ""

				var actions = document.createElement("div")
				actions.className = "actions"
				var destroy = document.createElement("button")
				destroy.className = "button raised colored destroy"
				destroy.innerHTML = "Destroy"
				actions.appendChild(destroy)

				row.appendChild(sid)
				row.appendChild(used)
				row.appendChild(pls)
				row.appendChild(ips)
				row.appendChild(actions)

				$('#session-manager').append(row)
			}
			$('#session-manager, .load-with-sm').slideDown(500, "easeOutCirc")
		}
	})

	// Listen for session destroy
	$(document).on("click", '#session-manager button.destroy', (e) => {
		var sid = $(e.target).parents('.row').attr('data-sessionid')
		socket.emit('db procedure request', { procedure: "rootUserDestroySession", params: { sid: sid } })
		$(e.target).prop('disabled', true)
	})
	// Listen for destroy response
	socket.on('db procedure response', (response) => {
		if (response.input.procedure === "rootUserDestroySession") {
			if (!response.err) {
				$('#session-manager .row[data-sessionid="' + response.params.sid + '"]').slideUp(150, "easeOutCirc", () => {
					$('#session-manager .row[data-sessionid="' + response.params.sid + '"]').remove()
				})
			} else {
				$('#session-manager .row[data-sessionid="' + response.params.sid + '"] button.destroy').prop("disabled", false).html("Try again?")
			}
		}
	})

	// Error handling
	function printErrors(section, errors) {

		$('[name="' + section + '"] .error').slideUp(() => {
			var erHtml = ''

			if (typeof errors === "object" && errors.length === 1) {
				errors = errors[0]
			}

			if (typeof errors === "object") {
				erHtml = 'Errors:<ul>'
				for (e in errors) {
					erHtml += '<li>' + errors[e] + '</li>'
				}
				erHtml += '</ul>'
			} else if (typeof errors === "string") {
				erHtml = 'Error: ' + errors
			} else {
				erHtml = 'Error: Page cannot determine type of error. Was it passed in correctly?'
			}

			$('[name="' + section + '"] .error').html(erHtml).slideDown()
		})
	}
	$(document).on("click", '.error', (e) => {
		$(e.target).slideUp()
	})

})