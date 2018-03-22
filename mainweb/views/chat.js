$(document).ready(function () {
	// Connect to socket
	const socket = io()
	const socketChat = io('/chat')

	// Emit a request for the initial chat history
	function initializeChat() {
		socket.emit('data request', { request: "chatMessagesLoad", params: { from: null } })
	}
	// And players please
	socket.emit('data request', { request: "chatAccountsLoad" })
	// And rooms please
	function refreshRooms() {
		socket.emit('data request', { request: "chatRoomsLoad" })
	}
	refreshRooms() // onload

	// Global chat and current room
	var viewingRoom = 'tournytime',
		log = {},
		chatInitialized = false

	socket.on('data response', (response) => {
		console.log(response)
		// On receive initial chat
		if (response.input.request === "chatMessagesLoad") {
			var msgs = response.recordset.recordset
			for (var i in msgs) {
				//addMessage(msgs[i], true)
				addChatToMemory(msgs[i], "top")
			}
			$('#tableContainer').scrollTop($('#tableContainer')[0].scrollHeight)
		}
		// On receive player list
		if (response.input.request === "chatAccountsLoad") {
		}
		// On receive rooms list
		if (response.input.request === "chatRoomsLoad") {
			var rooms = response.recordset.recordset
			var toAppend = ""
			for (r in rooms) {
				// Button in #chats
				toAppend += '<button class="room" data-roomid="' + rooms[r].RoomPermanentId + '">#' + rooms[r].RoomName + '</button>'
				// Add to log object if it's not there
				if (typeof log[rooms[r].RoomPermanentId] === "undefined") {
					log[rooms[r].RoomPermanentId] = []
				}
			}
			$('#chats .rooms').html(toAppend)
			$('#chats .addRoom').remove()
			$('#chats').append('<button class="addRoom">(+) Add room</button>')
			refreshRoomHighlight()

			// Refresh chat on first load
			if (!chatInitialized) {
				initializeChat()
			}
		}
	})

	// Helper for putting DB-received messages in to memory
	function addChatToMemory(dbRecord, bottomOrTop) {
		var room = dbRecord.Room,
			justAdded = null

		if (typeof log[room] === "undefined") {
			console.error('Attempted to add chat to memory but log object did not have that room')
			return
		} else if (bottomOrTop === "top") {
			justAdded = log[room].unshift(dbRecord)
		} else {
			justAdded = log[room].push(dbRecord)
		}

		if (room === viewingRoom) {
			addChatToView(dbRecord, bottomOrTop)
		}
	}
	// Helper for adding messages to screen
	function addChatToView(dbRecord, bottomOrTop) {

		var classType = (dbRecord.MessageType).toLowerCase().replace(' ', '')
		var dateString = dataTransformer("time seconds", dbRecord.SentDate)
		var dateTitle = dataTransformer("datetime long", dbRecord.SentDate)

		var toAdd = '<tr class="achat ' + classType + '" data-messageid="' + dbRecord.MessageId + '" data-timestamp="' + dbRecord.SentDate + '">'
		toAdd += '<td class="timestamp" title="' + dateTitle + '">' + dateString + '</div>'
		toAdd += '<td class="else">'
		if (dbRecord.SenderAccountId !== null) {
			toAdd += '<div class="from">' + dbRecord.DisplayName + '</div>'
		}
		toAdd += '<div class="content">'
		toAdd += escapeHtml((dbRecord.Content !== null ? dbRecord.Content : ""))
		toAdd += '</div>'
		toAdd += '</td></tr>'

		if (bottomOrTop === "top") {
			$('#chatContainer').prepend(toAdd)
			addChatDividersTop()
		} else {
			$('#chatContainer').append(toAdd)
			addChatDividersBottom()
			// Scroll to bottom, where a new message has been added
			$('#tableContainer').scrollTop($('#tableContainer')[0].scrollHeight)
		}
	}
	// Helper for adding dividers (top)
	function addChatDividersTop() {
		// Date headers
		var cEarlier = $('#chatContainer .achat').eq(0).attr('data-timestamp')
		var cLater = $('#chatContainer .achat').eq(1).attr('data-timestamp')
		// Always add date separator to top
		var ds = dateHeader(cEarlier)
		$('#chatContainer .achat').eq(0).before(ds)
		// Remove any that are not just-added
		$('#chatContainer .dateHeader[data-timestamp^="' + cEarlier.slice(0, 10) + '"]').not(':eq(0)').remove()

		// Diff separators
		var cET = new Date(cEarlier),
			cLT = new Date(cLater)
		if (typeof cLater !== "undefined") {
			var hourDiff = Math.abs(cLT - cET) / 36e5
			if (hourDiff >= 0.15) {
				var ts = diffSeparator(hourDiff)
				$('#chatContainer .achat').eq(0).after(ts)
			}
		}
	}
	// Helper for adding dividers (bottom)
	function addChatDividersBottom() {
		// Date headers
		var cEarlier = $('#chatContainer .achat').eq(-2).attr('data-timestamp') || null
		var cLater = $('#chatContainer .achat').eq(-1).attr('data-timestamp')
		var hasDateHeader = false

		if (cEarlier === null || cEarlier.slice(0, 10) !== cLater.slice(0, 10)) {
			var ds = dateHeader(cLater)
			$('#chatContainer .achat').eq(-1).before(ds)
			hasDateHeader = true
		}

		// Diff separators
		var cET = new Date(cEarlier),
			cLT = new Date(cLater)
		if (!hasDateHeader) {
			var hourDiff = Math.abs(cLT - cET) / 36e5
			if (hourDiff >= 0.15) {
				var ts = diffSeparator(hourDiff)
				$('#chatContainer .achat').eq(-1).before(ts)
			}
		}
	}
	//// Helper for adding message to board
	//function addMessage(dbRecord, toTop) {
	//	//var nameColor = (dbRecord.PlayerId !== null ? randomColor(dbRecord.PlayerId) : "hsl(0,0%,0%)")
	//	var classType = (dbRecord.MessageType).toLowerCase().replace(' ', '')
	//	var toAdd = '<tr class="achat ' + classType + '" data-messageid="' + dbRecord.MessageId + '" data-timestamp="' + dbRecord.SentDate + '">'

	//	var dateString = dataTransformer("time seconds", dbRecord.SentDate)
	//	var dateTitle = dataTransformer("datetime long", dbRecord.SentDate)

	//	toAdd += '<td class="timestamp" title="' + dateTitle + '">' + dateString + '</div>'
	//	toAdd += '<td class="else">'
	//	if (dbRecord.PlayerId !== null) {
	//		toAdd += '<div class="from">' + dbRecord.DisplayName + '</div>'
	//	}
	//	if (dbRecord.MessageType === "Action") {
	//		toAdd += '<div class="systemmessage">Action taken</div>'
	//	}
	//	toAdd += '<div class="content"></div>'
	//	toAdd += '</td></tr>'
	//	if (toTop) {
	//		// Compare dates
	//		var compStampFull = $('#chatContainer .achat:first-of-type').attr('data-timestamp')
	//		var compStamp = (typeof compStampFull !== "undefined" ? compStampFull : dbRecord.SentDate).slice(0, 10)
	//		var curStamp = (dbRecord.SentDate).slice(0, 10)
	//		if (compStamp !== curStamp) {
	//			var ds = dateSeparator(compStampFull)
	//			toAdd += ds
	//		}
	//		// Actually add
	//		$('#chatContainer').prepend(toAdd)
	//	} else {
	//		// Compare dates
	//		var prevStampFull = $('#chatContainer .achat:last-of-type').attr('data-timestamp')
	//		var prevStamp = (typeof prevStampFull !== "undefined" ? prevStampFull : dbRecord.SentDate).slice(0, 10)
	//		var curStamp = (dbRecord.SentDate).slice(0, 10)
	//		if (prevStamp !== curStamp) {
	//			var ds = dateSeparator(dbRecord.SentDate)
	//			toAdd = ds + toAdd
	//		}

	//		// Actually append
	//		$('#chatContainer').append(toAdd)
	//		// Scroll to bottom, where a new message has been added
	//		$('#tableContainer').scrollTop($('#tableContainer')[0].scrollHeight)
	//	}
		
	//	var content = escapeHtml((dbRecord.Content !== null ? dbRecord.Content : ""))
	//	if (dbRecord.MessageType === "Action" && dbRecord.ExtraJSON !== null) {
	//		var ej = JSON.parse(dbRecord.ExtraJSON)
	//		content = content.replace('{Player}', '<span>' + ej.PlayerName + '</span>')
	//	}
	//	$('[data-messageid="' + dbRecord.MessageId + '"] .content').html(content)
	//}

	// Helper for date separators in chat
	function dateHeader(dateIn) {
		var dateOut = new Date(dateIn)
		dateOut = dataTransformer("date long", dateOut)
		var ret = '<tr class="dateHeader" data-timestamp="' + dateIn + '"><td colspan="2">' + dateOut + '</td></tr>'
		return ret
	}
	function diffSeparator(diffIn) {
		var days = Math.floor(diffIn / 24)
		var hours = Math.floor(diffIn % 24)
		var quarterHorus = Math.round(diffIn * 4) % 4 *  15
		var diffString = ""
		diffString += days + " day" + (days === 1 ? "" : "s") + " "
		diffString += hours + " hour" + (hours === 1 ? "" : "s") + " "
		diffString += quarterHorus + " minutes later..."
		diffString = diffString.replace(/ 0 (hours|minutes)/m, "")
		diffString = diffString.replace(/^0 days /m, "")
		var ret = '<tr class="diffSeparator"><td colspan="2"><div>' + diffString + '</div></td></tr>'
		return ret
	}

	// On message received
	socketChat.on('chat sent', (response) => {
		console.log(response)
		if (!response.err) {
			var r = response.fromDb.recordset[0]
			addChatToMemory(r, "bottom")
		}
	})

	// Send message helper
	function sendMessage(content) {
		console.log("message sending")
		var uid = Math.random()
		socketChat.emit('chat send', { content: content, uid: uid, room: viewingRoom })
	}

	// Send message on return press
	$(document).on('keypress', 'textarea', (e) => {
		if (e.keyCode === 13 && !e.shiftKey) {
			var content = $('textarea').val()
			sendMessage(content)
			$('textarea').val('')
			e.preventDefault()
		}
	})

	// On room change
	$(document).on("click", "button.room", (e) => {
		// Get room just clicked
		var room = $(this.activeElement).attr('data-roomid')
		viewingRoom = room
		// Clear chat
		$('#chatContainer').html("")
		// Loop through chat of room and add
		var chatToAdd = log[room]
		for (var c = chatToAdd.length - 1; c >= 0; c--) {
			addChatToView(chatToAdd[c], "top")
		}
		$('#tableContainer').scrollTop($('#tableContainer')[0].scrollHeight)
		refreshRoomHighlight()
	})
	// Highlight chosen room
	function refreshRoomHighlight() {
		$('button.room').removeClass('active')
		$('button.room[data-roomid="' + viewingRoom + '"]').addClass('active')
	}

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
		var randSat = Math.pow(unicodeCombined, 1.203) // default 1.203
		randSat = Math.round((randSat % 0.1) * 10 * 60)
		randSat += 40

		if (randHue >= 40 && randHue <= 200) {
			// Between yellow and sky blue, lightness is 35-65
			randLig = 35 + (randLig % 30)
		} else {
			// Else, 30-80.
			randLig = 30 + (randLig % 50)
		}

		var colorString = "hsl(" + randHue + ", " + randSat + "%, " + randLig + "%)"

		return colorString
	}

	// Helper: HTML escaper
	function escapeHtml(input) {
		input = input.replace(/&/g, '&amp;');
		input = input.replace(/</g, '&lt;');
		input = input.replace(/>/g, '&gt;');
		return input;
	}

	// Listen for sidebar/info opens
	$(document).on("click", '#chatToolbar .left', () => {
		$('body').toggleClass('chats-open').toggleClass('chats-closed')
		reconsiderSend()
	})
	$(document).on("click", '#chatToolbar .right', () => {
		$('body').toggleClass('info-open').toggleClass('info-closed')
		reconsiderSend()
	})

	// Change size of sendContainer when sidebars are open/closed
	function reconsiderSend() {
		var width = window.innerWidth
		var left = 0

		if ($('body').hasClass('chats-open')) {
			width -= 200
			left = 200
		}
		if ($('body').hasClass('info-open')) {
			width -= 350
		}

		$('#sendContainer').css('width', width + 'px').css('left', left + 'px')
	}
	reconsiderSend()

	// Adding a new room
	$(document).on("click", 'button.addRoom', () => {
		$('#center .addRoomForm').remove()

		var html = '<div class="addRoomForm">'
		html += '<div><input type="text" name="roomName" placeholder="Room name"/></div>'
		html += '<div><button class="button raised colored addRoomSubmit">Add room</button></div>'
		html += '<div><button class="button raised addRoomCancel">Cancel</button></div>'
		html += '<div><div class="error" style="display: none"></div></div>'
		html += '</form>'

		$('#center > *').hide()
		$('#center').append(html)
	})
	// Handle submit
	$(document).on("click", '.addRoomSubmit', () => {
		var room = $('[name="roomName"]').val()
		if (!room.match(/^#[a-zA-Z1-9-]+$/)) {
			$('.error').slideUp(() => {
				var erHtml = 'Error: Room name must begin with a # and must only contain alphanumeric character or hyphens.'
				$('.error').html(erHtml).slideDown()
			})
		} else {
			room = room.slice(1)
			console.log(room)
			socket.emit('db procedure request', { procedure: "chatRoomAdd", params: { roomName: room } })
		}
	})
	// Handle cancel
	$(document).on("click", '.addRoomCancel', () => {
		closeAddRoomForm()
		reconsiderSend()
	})
	// Always prepend hashtag to room title
	$(document).on("keypress", '[name="roomName"]', () => {
		var content = $('[name="roomName"]').val()
		if (content.charAt(0) !== "#") {
			content = $('[name="roomName"]').val("#" + content)
		}
	})
	// Handle error
	$(document).on("click", '.addRoomForm .error', (e) => {
		$('.addRoomForm .error').slideUp()
	})
	// Handle respones
	socket.on('db procedure response', (response) => {
		if (response.input.procedure === "chatRoomAdd") {
			closeAddRoomForm()
			refreshRooms()
		}
	})
	// Helper: Close "add room" form
	function closeAddRoomForm() {
		$('#center .addRoomForm').remove()
		$('#center > *').removeAttr('style')
	}
})