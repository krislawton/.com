$(document).ready(() => {
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
			$(e.target).slideUp()
			socket.emit('db procedure request', { procedure: "rootUserChangeDisplayName", params: { displayName: displayName } })
		}

		if (e.target.name === "userId") {
			var userId = $(e.target).find('#userId').val()
			$(e.target).slideUp()
			socket.emit('db procedure request', { procedure: "rootUserChangeUserId", params: { userId: userId } })
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

})