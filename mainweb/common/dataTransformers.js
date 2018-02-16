// Data transformer: Returns a transformed output based on input+method
var dataTransformer = (method, input) => {
	var output = input

	if (method === "datetime short") {
		var dateinfo = new Date(input)
		var year = zeroPad(dateinfo.getFullYear()).toString().slice()
		var month = zeroPad(dateinfo.getMonth() + 1) // 0-11 so + 1
		var day = zeroPad(dateinfo.getDate())
		var hour = zeroPad(dateinfo.getHours())
		var minute = zeroPad(dateinfo.getMinutes())
		output = day + '/' + month + '/' + year + '&nbsp;' + hour + ':' + minute
	} else if (method === "datetime long") {
		var dateinfo = new Date(input)
		var year = zeroPad(dateinfo.getFullYear()).toString().slice()
		var month = dateinfo.getMonth() + 1 // 0-11 so + 1
		if (month === 1) { month = "January" } else if (month === 2) { month = "Febuary" } else if (month === 3) { month = "March" } else if (month === 4) { month = "April" } else if (month === 5) { month = "May" } else if (month === 6) { month = "June" } else if (month === 7) { month = "July" } else if (month === 8) { month = "August" } else if (month === 9) { month = "September" } else if (month === 10) { month = "October" } else if (month === 11) { month = "November" } else if (month === 12) { month = "December" }
		var day = dateinfo.getDate()
		if (day === 1) { day += "st" } else if (day === 2) { day += "nd" } else if (day === 3) { day += "rd" } else { day += "th" }
		var dow = dateinfo.getDay()
		if (dow === 0) { dow = "Sunday" } else if (dow === 1) { dow = "Monday" } else if (dow === 2) { dow = "Tuesday" } else if (dow === 3) { dow = "Wednesday" } else if (dow === 4) { dow = "Thursday" } else if (dow === 5) { dow = "Friday" } else if (dow === 6) { dow = "Saturday" }
		var hour = zeroPad(dateinfo.getHours())
		var minute = zeroPad(dateinfo.getMinutes())

		output = dow + " the " + day + " of " + month + ", " + year + " at " + hour + ":" + minute
	} else if (method === "date long") {
		var dateinfo = new Date(input)
		var year = zeroPad(dateinfo.getFullYear()).toString().slice()
		var month = dateinfo.getMonth() + 1 // 0-11 so + 1
		if (month === 1) { month = "January" } else if (month === 2) { month = "Febuary" } else if (month === 3) { month = "March" } else if (month === 4) { month = "April" } else if (month === 5) { month = "May" } else if (month === 6) { month = "June" } else if (month === 7) { month = "July" } else if (month === 8) { month = "August" } else if (month === 9) { month = "September" } else if (month === 10) { month = "October" } else if (month === 11) { month = "November" } else if (month === 12) { month = "December" }
		var day = dateinfo.getDate()
		if (day === 1) { day += "st" } else if (day === 2) { day += "nd" } else if (day === 3) { day += "rd" } else { day += "th" }
		var dow = dateinfo.getDay()
		if (dow === 0) { dow = "Sunday" } else if (dow === 1) { dow = "Monday" } else if (dow === 2) { dow = "Tuesday" } else if (dow === 3) { dow = "Wednesday" } else if (dow === 4) { dow = "Thursday" } else if (dow === 5) { dow = "Friday" } else if (dow === 6) { dow = "Saturday" }

		output = dow + " the " + day + " of " + month + ", " + year
	} else if (method === "time seconds") {
		var dateinfo = new Date(input)
		output = zeroPad(dateinfo.getHours())
		output += ':' + zeroPad(dateinfo.getMinutes())
		output += ':' + zeroPad(dateinfo.getSeconds())
	}

	return output
}

// Format helper: Zero pad number
function zeroPad(input) {
	if (input < 10) {
		input = "0" + input
	}
	return input
}