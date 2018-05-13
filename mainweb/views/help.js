$(document).ready(() => {

	var helpUrl = $('#ids').attr('data-helpurl')

	var socket = io()

	// Get help content
	socket.emit('data request', { request: "helpPageGet", params: { helpUrl: helpUrl } })
	socket.on('data response', (response) => {
		console.log(response)
		if (response.input.request === "helpPageGet") {
			if (response.recordset.recordset.length === 0) {
				$('h1').html("Help not found")
				$('#content-container').html('<p>Oops, no article with that name was found. <a href="/help/home">Go back to help home?</a></p>')
			} else {
				var r = response.recordset.recordset[0]

				$('h1').html(r.Title)
				$('#content-container').html(r.Content)

				if (r.ParentURL !== null) {
					$('a.back').html('< ' + r.ParentTitle).attr('href', r.ParentURL).show()
				}

				var children = response.recordset.recordsets[1]
				if (children.length > 0) {
					var h = '<h2>Sub pages</h2>'

					if (children.length === 1) {
						h += '<p>Just <a href="' + children[0].URLName + '">' + children[0].Title + '</a><p>'
					} else {
						h += '<ul>'
						for (i in children) {
							h += '<li><a href="' + children[i].URLName + '">' + children[i].Title + '</a></li>'
						}
						h += '</ul>'
					}
					$('#kids-container').html(h)
				}
			}
		}
	})

})