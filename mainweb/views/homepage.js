$(document).ready(() => {
	const socket = io()

	// On login stuff
	$(document).on('click', 'button.login', (e) => {
		var un = $('#username').val()
		var pw = $('#password').val()
		var er = []

		if (un === "") {
			er.push("Please enter a username.")
		}
		if (pw === "") {
			er.push("Please enter a password.")
		}

		if (er.length === 0) {
			socket.emit('login attempt', { username: un, password: pw })
			console.log("Sent")
		} else {
			printErrors(er)
			console.log("Error")
		}
	})

	socket.on('login response', (response) => {
		if (response.err) {
			printErrors(response.err)
		} else {
			printErrors(response.result)
		}
	})

	// Sign up
	$(document).on('click', '.aint', (e) => {
		printErrors("There's no sign up feature yet")
	})

	// Erorr handling
	function printErrors(errors) {
		$('.error').slideUp(() => {
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

			$('.error').html(erHtml).slideDown()
		})
	}
	$(document).on('click', '.login .error', (e) => {
		$('.login .error').slideUp()
	})
})