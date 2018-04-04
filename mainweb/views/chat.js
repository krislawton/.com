﻿$(document).ready(function () {
	// Connect to socket
	const socket = io()
	const socketChat = io('/chat')

	// On socket noconnect
	var storedText = ""
	socketChat.on('connect_error', (e) => {
		storedText = $('#sendContainer textarea').val()
		$('#sendContainer textarea').addClass("error").prop("disabled", true).val("Connection error. The server is probably down.")
	})
	socketChat.on('connect', () => {
		$('#sendContainer textarea').removeClass("error").prop("disabled", false).val("" + storedText)
	})

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
		stars = {},
		reactions = {},
		viewingAsPermaid = $('#accountPermaId').attr('data-permaid'),
		chunkSize = 1000

	// Socket responses
	socket.on('data response', (response) => {
		console.log(response)
		// On receive initial chat
		if (response.input.request === "chatMessagesLoad") {
			// Reactions
			var dbReactions = response.recordset.recordsets[1]
			for (var i in dbReactions) {
				addReactionToMemory(dbReactions[i])
			}
			// Messages
			var msgs = response.recordset.recordset
			for (var i in msgs) {
				//addMessage(msgs[i], true)
				addChatToMemory(msgs[i], "top")
			}
			$('.room[data-roomid="' + viewingRoom +'"]').trigger("click")
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
						username: r.CustomId,
						colorId: r.ColorChoiceId
					}
				}
				refreshUsers()
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
				content: r.Content,
				contentHtml: r.ContentHTML
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

				if (stars[i].permaid !== null) {
					element.appendChild(nameTag(stars[i].permaid))
				}

				var content = document.createElement("div")
				content.className = "content"
				content.innerHTML = stars[i].content
				element.appendChild(content)

				var posted = document.createElement("div")
				posted.className = "posted"
				posted.innerHTML = "Posted in #" + stars[i].room
				element.appendChild(posted)

				var whenstar = document.createElement("div")
				whenstar.className = "date-starred"
				var whenstardate = dataTransformer("datetime short", stars[i].dateStarred)
				whenstar.innerHTML = "Starred on " + whenstardate
				element.appendChild(whenstar)

				$('#starred').append(element)
			}
		} else {
			$('#nostars').show()
		}	
	}

	// Helper for re-rendering users
	function refreshUsers() {
		$('#users').html("")
		for (i in users) {
			var link = "/user/" + i + "-" + users[i].username
			var html = '<div class="user-row">'
			html += nameTag(i).outerHTML
			html += '</div>'
			$('#users').append(html)
		}
	}

	// Helper for putting DB-received messages in to memory
	function addChatToMemory(dbRecord, bottomOrTop) {
		var room = dbRecord.Room,
			justAdded = null

		// Add reactions array to message
		dbRecord.reactions = []

		if (typeof log[room] === "undefined") {
			console.error('Attempted to add chat to memory but log object did not have that room')
			return
		} else if (bottomOrTop === "top") {
			justAdded = log[room].unshift(dbRecord)
		} else {
			justAdded = log[room].push(dbRecord)
		}

		//if (room === viewingRoom) {
		//	addChatToView(dbRecord, bottomOrTop)
		//}
	}
	// Helper for adding messages to screen
	function addChatToView(dbRecord, bottomOrTop) {

		var classType = (dbRecord.MessageType).toLowerCase().replace(' ', '')
		var dateString = dataTransformer("time seconds", dbRecord.SentDate)
		var dateTitle = dataTransformer("datetime long", dbRecord.SentDate)

		var contents = dbRecord.ContentHTML
		if (dbRecord.MessageType === "Action" && dbRecord.ExtraJSON !== null) {
			var ej = JSON.parse(dbRecord.ExtraJSON)
			contents = contents.replace('{player}', nameTag(ej.accountPermaId).outerHTML)
			contents = contents.replace('{room}', '<span style="font-weight: normal">#' + ej.room + '</span>')
		}

		var starred = (typeof stars[dbRecord.MessageId] === "object" ? " starred" : "")

		// Begin element
		var toAdd = '<tr '
		toAdd += 'class="achat ' + classType + starred + '" '
		toAdd += 'data-messageid="' + dbRecord.MessageId + '" '
		toAdd += 'data-timestamp="' + dbRecord.SentDate + '" '
		toAdd += 'data-room="' + dbRecord.Room + '"> '
		toAdd += '<td class="timestamp" title="' + dateTitle + '">' + dateString + '</div>'
		toAdd += '<td class="else">'
		if (dbRecord.SenderAccountId !== null) {
			var nt = nameTag(dbRecord.SenderAccountId, dbRecord.SenderDisplayName)
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
		// Reactions
		var messageId = dbRecord.MessageId
		var reactionHtml = messageReactionHtml(messageId)
		toAdd += reactionHtml
		// End element
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
		var cEarlier = new Date($('#chatContainer .achat').eq(0).attr('data-timestamp'))
		var cLater = new Date($('#chatContainer .achat').eq(1).attr('data-timestamp'))
		// Always add date separator to top
		var ds = dateHeader(cEarlier)
		$('#chatContainer .achat').eq(0).before(ds)
		// Remove any that are not just-added
		$('#chatContainer .dateHeader[data-timestamp^="' + cEarlier.toDateString() + '"]').not(':eq(0)').remove()

		// Diff separators
		var cET = new Date(cEarlier),
			cLT = new Date(cLater)
		if (typeof cLater !== "undefined") {
			var hourDiff = Math.abs(cLT - cET) / 36e5
			if (hourDiff >= 4.5 / 60) {
				var ts = diffSeparator(hourDiff)
				$('#chatContainer .achat').eq(0).after(ts)
			}
		}
	}
	// Helper for adding dividers (bottom)
	function addChatDividersBottom() {
		// Date headers
		var cEarlier = new Date($('#chatContainer .achat').eq(-2).attr('data-timestamp'))
		var cEstring = cEarlier.getFullYear() + "" + cEarlier.getMonth + "" + cEarlier.getDate
		var cLater = new Date($('#chatContainer .achat').eq(-1).attr('data-timestamp'))
		var cLstring = cLater.getFullYear() + "" + cLater.getMonth + "" + cLater.getDate
		var hasDateHeader = false

		if (cEarlier === null || cEstring !== cLstring) {
			var ds = dateHeader(cLater)
			$('#chatContainer .achat').eq(-1).before(ds)
			hasDateHeader = true
		}

		// Diff separators
		var cET = new Date(cEarlier),
			cLT = new Date(cLater)
		var hourDiff = Math.abs(cLT - cET) / 36e5
		if (hourDiff >= 4.5 / 60) {
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
		var ret = '<tr class="dateHeader" data-timestamp="' + dateIn.toDateString() + '"><td colspan="2">~ ' + dateOut + ' ~</td></tr>'
		return ret
	}
	function diffSeparator(diffIn) {
		var padding = 10 + Math.pow(diffIn * 3.5 - 1, 0.45) * 10
		padding = 'style="padding-top: ' + padding + 'px; padding-bottom: ' + padding + 'px"'

		// Minutes: From 5 min to 60 min
		// 5 minutes: From 60 min to 2hr
		// Quarter-hours: From 1 hr to 8 hrs
		// Hours: 8 hours and up
		var diffString = ""
		if (diffIn < 1 - (1 / 120)) {
			var minutes = Math.round(diffIn * 60)
			diffString += minutes + " minutes"
		} else if (diffIn < 2) {
			var hours = Math.floor(diffIn + (2.5 / 60))
			var minutes = Math.round(diffIn % 1 * 12) * 5 % 60
			diffString += hours + " hour"
			diffString += (hours > 1 ? "s" : "")
			diffString += (minutes > 0 ? " " + minutes + " minutes" : "")
		} else if (diffIn < 8) {
			var hoursDecimal = Math.round(diffIn * 4) / 4
			var hours = Math.floor(hoursDecimal)
			var minutes = hoursDecimal % 1 * 60
			diffString += hours + " hour" + (hours !== 1 ? "s" : "")
			diffString += (minutes !== 0 ? " " + minutes + " minutes" : "")
		} else {
			var days = Math.floor((diffIn + (0.5 / 24)) / 24)
			var hours = Math.round(diffIn) % 24
			diffString += (days > 0 ? days + " day" : "")
			diffString += (days > 1 ? "s" : "")
			diffString += (days > 0 && hours > 0 ? " " : "")
			diffString += (hours > 0 ? hours + " hour" : "")
			diffString += (hours > 1 ? "s" : "")
		}
		diffString += " later..."

		var ret = '<tr class="diffSeparator"><td colspan="2"><div ' + padding + '>' + diffString + '</div></td></tr>'
		return ret
	}

	// On message received
	socketChat.on('chat sent', (response) => {
		console.log(response)
		if (!response.err) {
			var r = response.fromDb.recordset[0]
			addChatToMemory(r, "bottom")

			// Play sound
			var msgsound = new Audio('/c/SoundTOS.ogg')
			msgsound.play()

			// Send notification
			if (viewingAsPermaid != r.SenderAccountId) {
				if (Notification.permission === "granted") {
					var nopt = {
						body: r.DisplayName + ": " + r.Content,
						icon: "/c/Logo.png",
					}
					var n = new Notification('krislawton.com #' + r.Room, nopt)
					setTimeout(n.close.bind(n), 4000);
				} else if (Notification.permission !== 'denied') {
					Notification.requestPermission(function (permission) {
						if (permission === "granted") {
							var notification = new Notification("Notifications enabled, are you seeing this?!");
						}
					});
				}
			}
		}
	})

	// Send message helper
	function sendMessage(content) {
		var uid = Math.random()
		socketChat.emit('chat send', { content: content, contentHtml: markdownContent(content), uid: uid, room: viewingRoom })
		//console.log(content)
		//console.log(markdownContent(content))
	}
	// Message format markdown
	function markdownContent(inputContent) {
		var inArr = inputContent.split("")
		var outputContent = ""

		// _ is italics
		// ** is bold
		// ` is code
		// > is greentext

		var layers = []
		var possiblyInUrl = false

		for (var c = 0; c < inputContent.length; c++) {

			// Primitively keeps track of whether we're currently in a URL so that italics rule does not apply
			var last4 = ""
			if (c >= 3) {
				last4 = inArr[c - 3] + inArr[c - 2] + inArr[c - 1] + inArr[c]
				if (last4 =='http') {
					possiblyInUrl = true
				}
				if (possiblyInUrl && !(inArr[c]).match(/[-a-z0-9@:;%_\+.~#?&//=]/gi)) {
					possiblyInUrl = false
					console.log("Exited URL at index " + c)
				}
			}

			//console.log("testing index " + c + ": " + inArr[c] + " (UTF-16 code " + inArr[c].charCodeAt(0) + "). Last 4 " + last4 + ", in url " + possiblyInUrl)

			// Escape HTML
			inArr[c] = inArr[c].replace(/</g, '&lt;')
			inArr[c] = inArr[c].replace(/>/g, '&gt;')

			// Split on newlines
			if (inArr[c].charCodeAt(0) === 10) {
				// Do greentexts first
				for (var li = 0; li < layers.length; li++) {
					if (layers[li].type === "greentext") {
						inArr[c - 1] += '</span>'
					}
				}
				// Clear all other layers
				layers.splice(0)
			}
			
			// Italics: _
			if (inArr[c] === "_" && !possiblyInUrl) {
				var italicsIndex = null
				for (var li = 0; li < layers.length; li++) {
					if (layers[li].type === "italics") {
						italicsIndex = li
						li = layers.length
					}
				}

				if (italicsIndex !== null) {
					if (c === inputContent.length - 1) {
						layers[italicsIndex].end = c
					} else if (inArr[c + 1].match(/[^A-Za-z0-9-'_]/g)) {
						layers[italicsIndex].end = c
					}
				} else if (c === 0) {
					layers.push({ type: "italics", start: c, end: null })
				} else if (inArr[c - 1].match(/[^A-Za-z0-9-'_]/g)) {
					layers.push({ type: "italics", start: c, end: null })
				}
			}

			// Bold: **
			if (inArr[c] === "*" && c > 0 && inArr[c - 1] === "*") {
				var boldIndex = null
				for (var li = 0; li < layers.length; li++) {
					if (layers[li].type === "bold") {
						boldIndex = li
						li = layers.length
					}					
				}

				if (boldIndex !== null) {
					if (c === inputContent.length - 1) {
						layers[boldIndex].end = c
					} else if (inArr[c + 1].match(/[^A-Za-z0-9-'\*]/g)) {
						layers[boldIndex].end = c
					}
				} else if (c === 1) {
					layers.push({ type: "bold", start: c, end: null })
				} else if (inArr[c - 2].match(/[^A-Za-z0-9-'\*]/g)) {
					layers.push({ type: "bold", start: c, end: null })
				}
			}

			// Code: `
			if (inArr[c] === "`") {
				var codeIndex = null
				for (var li = 0; li < layers.length; li++) {
					if (layers[li].type === "code") {
						codeIndex = li
						li = layers.length
					}
				}

				if (codeIndex !== null) {
					if (c === inputContent.length - 1) {
						layers[codeIndex].end = c
					} else if (inArr[c + 1].match(/[^A-Za-z0-9-'`]/g)) {
						layers[codeIndex].end = c
					}
				} else if (c === 0) {
					layers.push({ type: "code", start: c, end: null })
				} else if (inArr[c - 1].match(/[^A-Za-z0-9-'`]/g)) {
					layers.push({ type: "code", start: c, end: null })
				}
			}

			// Triggered: !
			if (inArr[c] === "!") {
				var italicsIndex = null
				for (var li = 0; li < layers.length; li++) {
					if (layers[li].type === "triggered") {
						italicsIndex = li
						li = layers.length
					}
				}

				if (italicsIndex !== null) {
					if (c === inputContent.length - 1) {
						layers[italicsIndex].end = c
					} else if (inArr[c + 1].match(/[^A-Za-z0-9-'!]/g)) {
						layers[italicsIndex].end = c
					}
				} else if (c === 0) {
					layers.push({ type: "triggered", start: c, end: null })
				} else if (inArr[c - 1].match(/[^A-Za-z0-9-'!]/g)) {
					layers.push({ type: "triggered", start: c, end: null })
				}
			}

			// Greentext
			if (inArr[c] === "&gt;") {
				if (c === 0) {
					layers.push({ type: "greentext", start: c, end: null })
					inArr[c] = '<span class="greentext">&gt;'
				} else if (inArr[c - 1].charCodeAt(0) === 10) {
					layers.push({ type: "greentext", start: c, end: null })
					inArr[c] = '<span class="greentext">&gt;'
				}
			}

			// Perform replacement as required by layers
			for (var li = 0; li < layers.length; li++) {
				if (layers[li].type === "greentext") {
					if (c === inputContent.length - 1) {
						inArr[c] += "</span>"
					}
				} else if (layers[li].end !== null) {
					inArr[layers[li].start] = '<span class="' + layers[li].type + '">'
					inArr[layers[li].end] = '</span>'

					if (layers[li].type === "bold") {
						inArr[layers[li].start - 1] = ""
						inArr[layers[li].end - 1] = ""
					}

					layers.splice(li)
				}
			}
		}

		for (i in inArr) {
			outputContent += inArr[i]
		}

		// Get URLs
		var rr = /(https?:\/\/([-a-z0-9@:;%_\+.~#?&//=]*)|([a-z0-9-]+\.)+([a-z]+)(\/[-a-z0-9@:;%_\+.~#?&//=]+)*)/gi
		outputContent = outputContent.replace(rr, '<a target="_blank" href="$&">$&</a>')
		outputContent = outputContent.replace(/(href=")(?!http)/gi, '$1http://')

		return outputContent
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
		var room = $(e.target).attr('data-roomid')
		viewingRoom = room
		// Clear chat
		$('#chatContainer').html("")
		// Loop through chat of room and add
		var chatToAdd = log[room]
		for (var c = chatToAdd.length - 1; c >= 0 && c >= chatToAdd.length - chunkSize; c--) {
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
	function nameTag(permaid, displayName) {
		var nametag = document.createElement("div")
		nametag.className = "nametag"
		nametag.style.color = randomColor(users[permaid].username, users[permaid].colorId)

		var anchor = document.createElement("a")
		anchor.href = "/user/" + permaid + "-" + users[permaid].username
		anchor.target = "_blank"
		anchor.innerHTML = (typeof displayName === "string" ? displayName : users[permaid].displayName)
		
		nametag.appendChild(anchor)

		return nametag

	}
	// Name color randomiser
	function randomColor(inputId, mode) {
		var characters = inputId.split('')
		var unicodeCombined = 0
		for (var i in characters) {
			var char = characters[i]
			unicodeCombined += Math.pow(char.charCodeAt(0), 1.3 - (i * 0.01))
		}
		unicodeCombined += Math.pow(characters.length, 1.2)

		var expHue = 1,
			expLig = 1,
			expSat = 1
		if (mode == 1) {
			expHue = 0.755
			expLig = 0.432
			expSat = 1.203
		} else if (mode == 2) {
			expHue = 0.943
			expLig = 1.047
			expSat = 0.943
		} else if (mode == 3) {
			expHue = 1.369
			expLig = 0.999
			expSat = 0.696
		}

		var randHue = Math.pow(unicodeCombined, expHue) // default 0.755
		randHue = Math.round((randHue % 1) * 10000) % 360
		var randLig = Math.pow(unicodeCombined, expLig) // default 0.432
		randLig = Math.round((randLig % 1) * 10000)
		var randSat = Math.pow(unicodeCombined, expSat) // default 1.203
		randSat = Math.round((randSat % 0.1) * 10 * 60)
		randSat += 40

		// Compress to result in less greens to get more reds-yellows
		//if (randHue <= 140) {
		//	randHue = randHue * (100 / 140)
		//} else if (randHue > 140 && randHue <= 180) {
		//	randHue = 180 - (180 - randHue) * 2
		//}

		if (randHue >= 40 && randHue <= 200) {
			// Between yellow and sky blue, lightness is 35-60
			randLig = 35 + (randLig % 25)
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
		// Reacts
		var reapos = document.createElement("button")
		reapos.className = "option react positive"
		reapos.innerHTML = "React positively"
		optionsEl.appendChild(reapos)
		var reaneg = document.createElement("button")
		reaneg.className = "option react negative"
		reaneg.innerHTML = "React negatively"
		optionsEl.appendChild(reaneg)
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
		// Disable other
		$(e.target).parents('.achat').find('button.option:not(.close, .star)').remove()
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

	// Handle reacting positively
	$(document).on("click", '.reactions button.reaction[data-reaction="positive"]', (e) => {
		var messageId = $(e.target).parents('.achat').attr('data-messageid')
		reactPositively(messageId)
	})
	$(document).on("click", "button.option.react.positive", (e) => {
		var messageId = $(e.target).parents('.achat').attr("data-messageid")
		e.target.innerHTML = "Reacting..."
		// Disable other
		$(e.target).parents('.achat').find('button.option:not(.close, .react.positive)').remove()
		reactPositively(messageId)
	})
	function reactPositively(messageId) {
		socketChat.emit("react send", { messageId: messageId, reaction: "positive" })
	}
	// Handle reacting negatively
	$(document).on("click", '.reactions button.reaction[data-reaction="negative"]', (e) => {
		var messageId = $(e.target).parents('.achat').attr('data-messageid')
		reactNegatively(messageId)
	})
	$(document).on("click", "button.option.react.negative", (e) => {
		var messageId = $(e.target).parents('.achat').attr("data-messageid")
		e.target.innerHTML = "Reacting..."
		// Disable other
		$(e.target).parents('.achat').find('button.option:not(.close, .react.negative)').remove()
		reactNegatively(messageId)
	})
	function reactNegatively(messageId) {
		socketChat.emit("react send", { messageId: messageId, reaction: "negative" })
	}
	// Handle starring message conf
	socketChat.on("react sent", (response) => {
		console.log(response)

		// Calculate whether the user is scrolled to the bottom and store for later
		var userScrolled = $('#tableContainer').scrollTop() + $('#tableContainer').height()
		var userIsScrolledDown = userScrolled === $('#tableContainer')[0].scrollHeight ? true : false

		var messageId = response.input.messageId
		$('[data-messageid="' + messageId + '"] div.options .close').trigger("click")

		// Flush existing reactions from message memory and refresh
		reactions[messageId] = []
		for (i in response.result.recordset) {
			addReactionToMemory(response.result.recordset[i])
		}

		var newReactionHtml = messageReactionHtml(messageId)
		$('[data-messageid="' + messageId + '"] .reactions').remove()
		$('[data-messageid="' + messageId + '"] .else').append(newReactionHtml)

		// If the user was scrolled down all the way before 
		// the reaction HTML was inserted, rescroll to bottom
		if (userIsScrolledDown) {
			$('#tableContainer').scrollTop($('#tableContainer')[0].scrollHeight)
		}
	})

	// Helper for adding reaction in to memory
	function addReactionToMemory(dbRecord) {
		var messageId = dbRecord.MessageId
		// If the reactions object doens't have a member for this messageId, create one
		if (typeof reactions[messageId] !== "object") {
			reactions[messageId] = []
		}
		// Add this reaction to it
		reactions[messageId].push(dbRecord)
	}
	// Helper for returning HTML of message reactions
	function messageReactionHtml(messageId) {
		var html = ""
		
		if (typeof reactions[messageId] === "object") {
			html += '<div class="reactions">'
			// First build an object which groups reactions so they
			// can be processed per reaction given
			var mr = {}
			for (i in reactions[messageId]) {
				var reactiontype = reactions[messageId][i].Reaction
				var userPermaId = reactions[messageId][i].AccountPermaId
				if (typeof mr[reactiontype] !== "object") {
					mr[reactiontype] = { count: 0, who: "", me: false }
				}
				mr[reactiontype].count++
				mr[reactiontype].who += ", " + users[userPermaId].displayName
				mr[reactiontype].me = (userPermaId == viewingAsPermaid ? true : mr[reactiontype].me)
			}
			// Then process from that object
			for (i in mr) {
				var whoString = (mr[i].who).replace(/^, /, "")
				var reactionString = i
				reactionString = reactionString.replace('positive', '👍')
				reactionString = reactionString.replace('negative', '👎')
				html += '<button class="reaction ' + (mr[i].me ? 'reacted-by-me' : '') + '" data-reaction="' + i + '" data-who="' + whoString + '" title="' + whoString + '">'
				html += '<span class="reactionname">' + reactionString + '</span>'
				html += '<span class="reactioncount"> ' + mr[i].count + '</span>'
				html += '</button>'
			}
			html += '</div>'
		}

		return html
	}

	// Handle name being changed
	socketChat.on('display name changed', (response) => {
		if (typeof users[response.permaid] === "object") {
			users[response.permaid].displayName = response.changedTo
			refreshUsers()
		}
	})

})