$(document).ready(function () {
	// Connect to socket
	const socket = io()
	const socketNomic = io('/nomic')

	// Emit a request for the initial chat history
	socket.emit('data request', { request: "nomicChatLoad", params: { from: null } })

	// On receive initial chat
	socket.on('data response', (response) => {
		console.log(response)
		if (response.input.request === "nomicChatLoad") {
			var msgs = response.recordset.recordset
			for (var i in msgs) {
				addMessage(msgs[i], true)
				window.scrollTo(0, document.body.scrollHeight)
			}
		}
	})

	// Helper for adding message to board
	function addMessage(dbRecord, toTop) {
		var toAdd = '<tr class="achat" data-messageid="' + dbRecord.MessageId + '">'
		toAdd += '<td class="timestamp">' + dbRecord.SentDate + '</div>'
		toAdd += '<td class="else">'
		toAdd += '<div class="player">' + dbRecord.PlayerName + '</div>'
		toAdd += '<div class="contents">' + dbRecord.Contents + '</div>'
		toAdd += '</td></tr>'
		if (toTop) {
			$('#chatContainer').prepend(toAdd)
		} else {
			$('#chatContainer').append(toAdd)
		}
	}

	// On message received
	socketNomic.on('chat sent', (response) => {
		console.log(response)
		if (!response.err) {
			var r = response.fromDb.recordset[0]
			addMessage(r)
			var bod = document.getElementsByTagName('body')
			window.scrollTo(0, document.body.scrollHeight)
		}
	})

	// Send message helper
	function sendMessage(fromwhom, contents) {
		console.log("message sending")
		var uid = Math.random()
		socketNomic.emit('chat send', { from: fromwhom, contents: contents, uid: uid })
	}

	// Send message on return press
	$(document).on('keypress', 'textarea', (e) => {
		if (e.keyCode === 13 && !e.shiftKey) {
			var contents = $('textarea').val()
			sendMessage(null, contents)
			$('textarea').val('')
			e.preventDefault()
		}
	})
})