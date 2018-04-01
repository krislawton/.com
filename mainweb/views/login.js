$(document).ready(() => {
	const socket = io()

	var logOrSign = "log"

	// On login stuff
	$(document).on("click", 'button.login', (e) => {
		var un = $('#username').val()
		var pw = $('#password').val()
		var tk = $('#token').val()
		var er = []

		if (un === "") {
			er.push("Please enter a username.")
		}
		if (pw === "") {
			er.push("Please enter a password.")
		}
		if (logOrSign === "sign" && tk === "") {
			er.push("Please enter a token.")
		}

		if (er.length === 0) {
			if (logOrSign === "log") {
				socket.emit('login attempt', { username: un, password: pw })
			} else {
				socket.emit('signup attempt', { token: tk, username: un, password: pw })
			}
		} else {
			printErrors(er)
		}
	})

	socket.on("login response", (response) => {
		if (response.err) {
			printErrors(response.err)
		} else {
			window.location.href = '/'
		}
	})
	socket.on("signup response", (response) => {
		if (response.err) {
			printErrors(response.err)
		} else {
			printErrors("Account created. Please log in. Yes I know this is not an error, fuck you.")
		}
	})

	// Sign up
	$(document).on("click", '.aint', (e) => {
		// Set global
		logOrSign = "sign"
		// Toggle the toggler
		$('.aint').hide()
		$('.have').show()
		// Show token field
		$('#token').show()
		$('.only-signup').show()
		// Change text of login button
		$('.button.login').html("Sign up")
	})
	// Log in
	$(document).on("click", '.have', (e) => {
		// Set global
		logOrSign = "log"
		// Toggle the toggler
		$('.aint').show()
		$('.have').hide()
		// Show token field
		$('#token').hide()
		$('.only-signup').hide()
		// Change text of login button
		$('.button.login').html("Log in")
	})

	// Trigger click "login" on pressing return
	$('div.login').on("keypress", (e) => {
		if (e.keyCode === 13) {
			$('div.login button.login').trigger('click')
		}
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
	$(document).on("click", 'div.login .error', (e) => {
		$('div.login .error').slideUp()
	})
})