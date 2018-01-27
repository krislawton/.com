﻿$(document).ready(function () {
	// Connect to socket
	const socket = io()
	const socketNomic = io('/nomic')

	// Emit a request for the initial chat history
	socket.emit('data request', { request: "nomicChatLoad", params: { from: null } })
	// And players please
	socket.emit('data request', { request: "nomicPlayers" })
	
	socket.on('data response', (response) => {
		console.log(response)
		// On receive initial chat
		if (response.input.request === "nomicChatLoad") {
			var msgs = response.recordset.recordset
			for (var i in msgs) {
				addMessage(msgs[i], true)
				window.scrollTo(0, document.body.scrollHeight)
			}
		}
		// On receive player list
		if (response.input.request === "nomicPlayers") {
			var players = response.recordset.recordset,
				toAppend = ''
			$('select option').remove()
			for (var p in players) {
				toAppend += '<option value="' + players[p].PlayerId + '">' + players[p].Name + '</option>'
			}
			$('select').append(toAppend)
		}
	})

	// Helper for adding message to board
	function addMessage(dbRecord, toTop) {
		var nameColor = (dbRecord.PlayerId !== null ? randomColor(dbRecord.PlayerId) : "hsl(0,0%,0%)")
		var toAdd = '<tr class="achat" data-messageid="' + dbRecord.MessageId + '" data-timestamp="' + dbRecord.SentDate + '">'

		var dateString = dataTransformer("time seconds", dbRecord.SentDate)
		var dateTitle = dataTransformer("datetime long", dbRecord.SentDate)

		toAdd += '<td class="timestamp" title="' + dateTitle + '">' + dateString + '</div>'
		toAdd += '<td class="else">'
		toAdd += '<div class="from" style="color: '+nameColor+'">' + dbRecord.PlayerName + '</div>'
		toAdd += '<div class="contents"></div>'
		toAdd += '</td></tr>'
		if (toTop) {
			// Compare dates
			var compStampFull = $('#chatContainer .achat:first-of-type').attr('data-timestamp')
			var compStamp = (typeof compStampFull !== "undefined" ? compStampFull : dbRecord.SentDate).slice(0, 10)
			var curStamp = (dbRecord.SentDate).slice(0, 10)
			console.log("Compare stamps " + compStamp + " and " + curStamp)
			if (compStamp !== curStamp) {
				var ds = dateSeparator(compStampFull)
				toAdd += ds
			}

			// Actually add
			$('#chatContainer').prepend(toAdd)
		} else {
			// Compare dates
			var prevStampFull = $('#chatContainer .achat:last-of-type').attr('data-timestamp')
			var prevStamp = (typeof prevStampFull !== "undefined" ? prevStampFull : dbRecord.SentDate).slice(0, 10)
			var curStamp = (dbRecord.SentDate).slice(0, 10)
			console.log("COmpare " + prevStamp + " and " + currStamp)
			if (prevStamp !== curStamp) {
				var ds = dateSeparator(dbRecord.SentDate)
				toAdd = ds + toAdd
			}

			// Actually append
			$('#chatContainer').append(toAdd)
		}
		$('[data-messageid="' + dbRecord.MessageId + '"] .contents').text(dbRecord.Contents)
	}
	// Helper for date separators in chat
	function dateSeparator(dateIn) {
		var dateOut = new Date(dateIn)
		dateOut = dataTransformer("date long", dateOut)
		var ret = '<tr class="dateSeparator" data-timestamp="' + dateIn + '"><td colspan="2">' + dateOut + '</td></tr>'
		return ret
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
			var from = $('select').val()
			sendMessage(from, contents)
			$('textarea').val('')
			e.preventDefault()
		}
	})

	// Name color randomiser
	function randomColor(inputId) {
		var characters = inputId.split('')
		var unicodeCombined = 0
		for (var i in characters) {
			var char = characters[i]
			unicodeCombined += char.charCodeAt(0)
		}
		
		var randHue = Math.pow(unicodeCombined, 0.755) // default 0.755
		randHue = Math.round((randHue % 1) * 10000) % 360
		var randLig = Math.pow(unicodeCombined, 0.432) // default 0.432
		randLig = Math.round((randLig % 1) * 10000)

		if (randHue >= 40 && randHue <= 200) {
			// Between yellow and sky blue, lightness is 35-65
			randLig = 35 + (randLig % 30)
		} else {
			// Else, 30-80.
			randLig = 30 + (randLig % 50)
		}

		var colorString = "hsl(" + randHue + ", 90%, " + randLig + "%)"

		return colorString
	}
})