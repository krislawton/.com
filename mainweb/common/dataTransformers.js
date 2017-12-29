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