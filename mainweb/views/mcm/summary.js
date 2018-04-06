$(document).ready(function () {
	// Connect to socket
	const socket = io()

	// Emit a request for the summary data
	socket.emit('data request', { request: "mcmSummary" })

	// When response is gotten
	socket.on('data response', (response) => {
		console.log(response)
		if (response.input.request === "mcmSummary") {
			var r1 = response.recordset.recordsets[0][0]
			var r2 = response.recordset.recordsets[1][0]

			$('#players .description').html(r2.PlayersAll)
			$('#active .description').html(r2.PlayersActive)
			var lastMatch = dataTransformer("datetime short", r1.LastMatch)
			$('#lastMatch .description').html(lastMatch)
			$('#hmrcBalance .description').html(r1.HMRCBalance)
			$('#hmrcRecent .description').html(r1.RecentBalance)
			$('#minMMR .description').html(r2.MinMMR)
			$('#lower10 .description').html(r2.Lower10)
			$('#upper90 .description').html(r2.Upper90)
			$('#maxMMR .description').html(r2.MaxMMR)
		}
	})

	// Default date picker: 1 week ago
	function popDatePicker() {
		var weekAgo = new Date()
		weekAgo.setDate(weekAgo.getDate() - 7)
		$('.dpYear').val(weekAgo.getFullYear())
		var month = zeroPad(weekAgo.getMonth() + 1)
		$('.dpMonth').val(month)
		var day = zeroPad(weekAgo.getDate())
		$('.dpDay').val(day)
		var hour = zeroPad(weekAgo.getHours())
		$('.dpHour').val(hour)
		var minute = zeroPad(weekAgo.getMinutes())
		$('.dpMinute').val(minute)
	}
	popDatePicker()

	$('.datePicker').on("keypress", (e) => {
		e.preventDefault()
		var entered = e.originalEvent.key
		var eClass = document.activeElement.classList
		if ($.isNumeric(entered)) {
			var position = document.activeElement.selectionStart
			var value = document.activeElement.value
			var maxChar = (eClass.contains("dpYear") ? 4 : 2)

			// If the cursor is at the end of the field,
			if (position >= maxChar) {
				// remove the first character and add the new character
				value = value.slice(1, position) + entered
			} else {
				// Otherwise, replace the cursor character with the character entered
				value = value.slice(0, position) + entered + value.slice(position + 1)
			}

			// Set value to above
			document.activeElement.value = value
			// Change cursor position to next character
			document.activeElement.setSelectionRange(position + 1, position + 1)

			//// If we just changed the last character, move to the next element
			//if (position + 1 === maxChar) {

			//}
		}
		var classToFocus
		console.log(entered)
	})

	$('.datePicker').on("keydown", (e) => {
		var entered = e.originalEvent.key
		var eClass = document.activeElement.classList

		var position = document.activeElement.selectionStart
		var isOneChar = (document.activeElement.selectionEnd === position ? true : false)
		var maxChar = (eClass.contains("dpYear") ? 4 : 2)

		if (position === maxChar && isOneChar && entered === "ArrowRight" && !eClass.contains("dpMinute")) {
			if (eClass.contains("dpYear")) {
				classToFocus = "dpMonth"
			} else if (eClass.contains("dpMonth")) {
				classToFocus = "dpDay"
			} else if (eClass.contains("dpDay")) {
				classToFocus = "dpHour"
			} else if (eClass.contains("dpHour")) {
				classToFocus = "dpMinute"
			}

			if (classToFocus) {
				var eToFocus = $(document.activeElement).parent().find('.' + classToFocus)
				$(eToFocus).focus()
				$(eToFocus).get(0).setSelectionRange(0, 0)
			}
		}
		if (position === 0 && isOneChar && entered === "ArrowLeft" && !eClass.contains("dpYear")) {
			if (eClass.contains("dpMonth")) {
				classToFocus = "dpYear"
			} else if (eClass.contains("dpDay")) {
				classToFocus = "dpMonth"
			} else if (eClass.contains("dpHour")) {
				classToFocus = "dpDay"
			} else if (eClass.contains("dpMinute")) {
				classToFocus = "dpHour"
			}

			if (classToFocus) {
				var eToFocus = $(document.activeElement).parent().find('.' + classToFocus)
				$(eToFocus).focus()
				$(eToFocus).get(0).setSelectionRange(0, 0)
			}
		}
	})

})