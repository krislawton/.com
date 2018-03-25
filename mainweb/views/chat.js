$(document).ready(function () {
	// Connect to socket
	const socket = io()
	const socketChat = io('/chat')

	// Emit a request for the initial chat history
	function initializeChat() {
		if (initialSocketsWIP === 0) {
			socket.emit('data request', { request: "chatMessagesLoad", params: { from: null } })
		}
	}
	// And players please
	socket.emit('data request', { request: "chatAccountsLoad" })
	// And rooms please
	function refreshRooms() {
		socket.emit('data request', { request: "chatRoomsLoad" })
	}
	refreshRooms() // onload

	// Globals
	var viewingRoom = 'tournytime',
		log = {},
		chatInitialized = false,
		initialSocketsWIP = 2,
		users = {},
		stars = {}

	// Socket responses
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
			// Load stars after chat
			loadStars()
		}
		// On receive player list
		if (response.input.request === "chatAccountsLoad") {
			if (!response.err) {
				// Flush and reload users
				users = {}
				for (i in response.recordset.recordset) {
					var r = response.recordset.recordset[i]
					users[r.AccountPermaId] = {
						displayName: r.DisplayName,
						username: r.CustomId
					}
				}
				for (i in users) {
					var link = "/user/" + i + "-" + users[i].username
					var html = '<div class="user-row">'
					html += nameTag(i).outerHTML
					html += '</div>'
					$('#users').append(html)
				}
				// If this is page load, see if chat can be initialized
				if (!chatInitialized) {
					initialSocketsWIP--
					initializeChat()
				}
			}
		}
		// On receive rooms list
		if (response.input.request === "chatRoomsLoad") {
			if (!response.err) {
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
					initialSocketsWIP--
					initializeChat()
				}
			}
		}
		// On stars received
		if (!response.err && response.input.request === "chatStarsLoad") {
			refreshStars(response.recordset.recordset)
		}
	})

	// Load starred messages
	function loadStars() {
		socket.emit('data request', { request: "chatStarsLoad" })
	}
	// Helper for loaded stars
	function refreshStars(dbStars) {
		var amountOfStars = 0

		// Load in to global
		stars = {}
		for (i in dbStars) {
			var r = dbStars[i]
			stars[r.MessageId] = {
				dateStarred: r.StarDate,
				room: r.RoomName,
				messageDate: r.SentDate,
				permaid: r.SenderAccountId,
				content: r.Content
			}
		}

		// Render in chat
		$('.achat.starred').removeClass("starred")
		for (i in stars) {
			amountOfStars++
			$('.achat[data-messageid="' + i + '"]').addClass("starred")
		}

		// Render in info
		$('.star-snippet').remove()
		if (amountOfStars > 0) {
			$('#nostars').hide()
			for (i in stars) {
				var element = document.createElement("div")
				element.className = "star-snippet"

				element.appendChild(nameTag(stars[i].permaid))

				var content = document.createElement("div")
				content.className = "content"
				content.innerHTML = stars[i].content
				element.appendChild(content)

				var posted = document.createElement("div")
				posted.className = "posted"
				posted.innerHTML = "Posted in #" + stars[i].room + " x ago"
				element.appendChild(posted)

				var whenstar = document.createElement("div")
				whenstar.className = "date-starred"
				whenstar.innerHTML = "Starred x ago"
				element.appendChild(whenstar)

				$('#starred').append(element)
			}
		} else {
			$('#nostars').show()
		}	
	}

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

		var contents = escapeHtml((dbRecord.Content !== null ? dbRecord.Content : ""))
		if (dbRecord.MessageType === "Action" && dbRecord.ExtraJSON !== null) {
			var ej = JSON.parse(dbRecord.ExtraJSON)
			contents = contents.replace('{player}', nameTag(ej.accountPermaId).outerHTML)
			contents = contents.replace('{room}', '<span style="font-weight: normal">#' + ej.room + '</span>')
		}

		var starred = (typeof stars[dbRecord.MessageId] === "object" ? " starred" : "")

		var toAdd = '<tr class="achat ' + classType + starred + '" data-messageid="' + dbRecord.MessageId + '" data-timestamp="' + dbRecord.SentDate + '">'
		toAdd += '<td class="timestamp" title="' + dateTitle + '">' + dateString + '</div>'
		toAdd += '<td class="else">'
		if (dbRecord.SenderAccountId !== null) {
			var nt = nameTag(dbRecord.SenderAccountId)
			nt.className += " from"
			toAdd += nt.outerHTML
		}
		if (dbRecord.MessageType === "Action") {
			toAdd += '<div class="systemmessage">Action taken</div>'
		}
		toAdd += '<div class="content">'
		toAdd += contents
		toAdd += '</div>'
		toAdd += '<button class="options">o</button>'
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
			if (hourDiff >= 0.25) {
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
		var hourDiff = Math.abs(cLT - cET) / 36e5
		if (hourDiff >= 0.25) {
			var ts = diffSeparator(hourDiff)
			if (hasDateHeader) {
				$('#chatContainer .dateHeader').eq(-1).before(ts)
			} else {
				$('#chatContainer .achat').eq(-1).before(ts)
			}
		}
	}

	// Helper for date separators in chat
	function dateHeader(dateIn) {
		var dateOut = new Date(dateIn)
		dateOut = dataTransformer("date long", dateOut)
		var ret = '<tr class="dateHeader" data-timestamp="' + dateIn + '"><td colspan="2">~ ' + dateOut + ' ~</td></tr>'
		return ret
	}
	function diffSeparator(diffIn) {
		var days = Math.floor(diffIn / 24)
		var hours = Math.floor(diffIn % 24)
		var quarterHorus = Math.round(diffIn * 4) % 4 * 15

		var padding = 10 + Math.pow(days * 24 * 4 + hours * 4 + quarterHorus / 15 - 1, 0.4) * 10
		padding = 'style="padding-top: ' + padding + 'px; padding-bottom: ' + padding + 'px"'

		var diffString = ""
		diffString += days + " day" + (days === 1 ? "" : "s") + " "
		diffString += hours + " hour" + (hours === 1 ? "" : "s") + " "
		diffString += quarterHorus + " minutes later..."
		diffString = diffString.replace(/ 0 (hours|minutes)/m, "")
		diffString = diffString.replace(/^0 days /m, "")

		var ret = '<tr class="diffSeparator"><td colspan="2"><div ' + padding + '>' + diffString + '</div></td></tr>'
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

	// Helper for name tags
	function nameTag(permaid) {
		var nametag = document.createElement("div")
		nametag.className = "nametag"
		nametag.style.color = randomColor(users[permaid].username)

		var anchor = document.createElement("a")
		anchor.href = "/user/" + permaid + "-" + users[permaid].username
		anchor.target = "_blank"
		anchor.innerHTML = users[permaid].displayName
		
		nametag.appendChild(anchor)

		return nametag

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
			socketChat.emit('room add', { roomName: room })
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
	socketChat.on('room added', (response) => {
		if (response.success) {
			closeAddRoomForm()
			refreshRooms()
		}
	})
	// Helper: Close "add room" form
	function closeAddRoomForm() {
		$('#center .addRoomForm').remove()
		$('#center > *').removeAttr('style')
	}

	// Handle chat option button click
	$(document).on("click", ".achat button.options", (e) => {
		var parent = $(e.target).parent()[0]
		var messageId = $(parent).parents('.achat').attr('data-messageid')
		// Base element
		var optionsEl = document.createElement("div")
		optionsEl.className = "options"
		// Star
		var star = document.createElement("button")
		star.className = "option star"
		var starred = (typeof stars[messageId] === "object" ? "Unstar" : "Star")
		star.innerHTML = starred + " this message"
		optionsEl.appendChild(star)
		// Close
		var close = document.createElement("button")
		close.className = "option close"
		close.innerHTML = "Close"
		optionsEl.appendChild(close)
		// Put elemetn and animate
		parent.appendChild(optionsEl)
		var created = $(parent).find('div.options')
		var height = $(created).height()
		$(created).css("margin-top", "-" + (height * 2) + "px").animate({ "margin-top": -height, opacity: "+=1" }, 150, "easeOutCirc")
		// Disable button
		e.target.disabled = true
	})
	// Handle closing menu
	$(document).on("click", ".achat div.options .close", (e) => {
		var options = $(e.target).parent()
		var height = $(options).height()
		$(options).animate({ "margin-top": height * -2, opacity: 0 }, 150, "easeOutCirc", () => {
			$(options).remove()
		})
		$(e.target).parents('.achat').find('button.options').prop("disabled", false)
	})
	// Also close menu if anywhere else on the screen is clicked
	$(document).on("click", "body", (e) => {
		var clickedOptions = $(e.target).parents('div.options')
		var clickedToggler = $(e.target).is('button.options')
		if (clickedOptions.length === 0 && !clickedToggler) {
			$('button.options:disabled').parent().find('div.options .close').trigger("click")
		}
	})
	// Handle starring message
	$(document).on("click", "button.option.star", (e) => {
		var messageId = $(e.target).parents('.achat').attr("data-messageid")
		socket.emit("db procedure request", { procedure: "chatStarMessage", params: { messageid: messageId } })
		e.target.innerHTML = "Starring..."
	})
	// Handle starring message conf
	socket.on("db procedure response", (response) => {
		console.log(response)
		if (!response.err && response.input.procedure === "chatStarMessage") {
			var messageId = response.input.params.messageid
			$('[data-messageid="' + messageId + '"] div.options .close').trigger("click")
			loadStars()
		}
	})

})