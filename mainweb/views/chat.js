$(document).ready(function () {
	// Connect to socket
	const socket = io()
	const socketChat = io('/chat')

	// On socket noconnect
	var checksum = null
	var hasBeenDisconnected = false
	socketChat.on('connect_error', (e) => {
		statusMessageConnectionError(true)
		hasBeenDisconnected = true
	})
	socketChat.on('connect', () => {
		if (hasBeenDisconnected) {
			console.log("checking sync")
			socketChat.emit('sync check', checksum)
		} else {
			// Only do when not checking desync
			statusMessageConnectionError(false)
		}
	})
	socketChat.on('sync result', (response) => {
		statusMessageConnectionError(false)
		if (!response) {
			statusMessageDesycn(true)
		} else {
			statusMessageDesycn(false)
		}
	})

	// Get players
	socket.emit('data request', { request: "chatAccountsLoad" })
	// And rooms please
	function refreshRooms() {
		socket.emit('data request', { request: "chatRoomsLoad" })
	}
	refreshRooms() // onload
	// And load main chat when everything is done
	function checkIfDone() {
		if (!chatInitialized && initialSocketsWIP <= 0) {
			initializeChat()
		}
	}
	function initializeChat() {
		$('button[data-roomid="' + viewingRoom + '"]').trigger('click')
	}

	// Globals
	var viewingRoom = 'tournytime',
		chatInitialized = false,
		initialSocketsWIP = 2,
		users = {},
		rooms = {},
		stars = {},
		viewingAsPermaId = $('#accountPermaId').attr('data-permaid'),
		contentLog = {},
		canSeeCurrent = true,
		statusMessages = {
			priority1: [],
			priority2: [],
			priority3: []
		}

	// Socket responses
	socket.on('data response', (response) => {
		console.log(response)
		// On receive chat
		if (response.input.request === "chatMessagesLoad") {
			var p = response.input.params
			if (!response.err && p.room === viewingRoom) {
				// Get first message for scroll
				var hasMessages = $('#logContainer > .achat').length != 0,
					heightAbove = 0,
					oldTopMessage
				if (hasMessages) {
					oldTopMessage = $('#logContainer > .achat').eq(0)
					heightAbove = $(oldTopMessage).offset().top
				}
				// NOTE: Results are left joined to reactions
				var jrc = response.recordset.recordset
				if (p.earlier) {
					jrc.reverse()
				}
				var rea = {}
				for (i in jrc) {
					// Only render chats once (since having more than
					// one reaction means the results obj has more 
					// than one row)
					if (jrc[i].ReactionOrder == 1) {
						addChatToView(jrc[i], p.earlier ? "top" : "bottom")
					}
					// now handle reaction
					if (jrc[i].ReactorPermaId !== null) {
						// test if object exists and create if not
						if (typeof rea[jrc[i].MessageId] !== "object") {
							rea[jrc[i].MessageId] = []
						}
						// create obj
						var ro = {
							permaId: jrc[i].ReactorPermaId,
							reaction: jrc[i].Reaction
						}
						rea[jrc[i].MessageId].push(ro)
					}
				}
				// Recurse through the reactions we've just been processing and render all
				for (i in rea) {
					addReactionsToView(i, rea[i])
				}
				// Scrolling
				if (p.when === "now") {
					// Scroll to bottom if first load
					$('#logViewPort').scrollTop($('#logViewPort')[0].scrollHeight)
				} else if (p.earlier && hasMessages) {
					// Maintain scroll if adding to top
					var oldTopScroll = $(oldTopMessage).offset().top
					$('#logViewPort').scrollTop(oldTopScroll - heightAbove)
				}
				// For navigating to previous chat, need to double check if last message loaded is latest
				if (rooms[viewingRoom].lastMessageId == $('#logContainer .achat').eq(-1).attr('data-messageid')) {
					canSeeCurrent = true
					$('#logContainer .showLater').hide()
				} else {
					canSeeCurrent = false
					$('#logContainer .showLater').show().appendTo('#logContainer')
				}
			}
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
					checkIfDone()
				}
			}
		}
		// On receive rooms list
		if (response.input.request === "chatRoomsLoad") {
			if (!response.err) {
				var dbRooms = response.recordset.recordsets[0]
				var dbGraph = response.recordset.recordsets[1]

				var delay = 0
				for (r in dbRooms) {
					var roomId = dbRooms[r].RoomPermanentId
					// Global rooms obj
					rooms[roomId] = {
						name: dbRooms[r].RoomName,
						archived: dbRooms[r].Archived,
						partOf: dbRooms[r].IsPartOf,
						createdBy: dbRooms[r].CreatedBy,
						createdDate: dbRooms[r].CreatedDate,
						description: dbRooms[r].Description,
						lastMessageId: dbRooms[r].LastMessageId,
						lastTimestamp: dbRooms[r].LastSentDate,
					}
					// Graph info
					var graphInfo = []
					for (gi in dbGraph) {
						if (dbGraph[gi].Room === roomId) {
							var graphRow = {
								hourBlock: dbGraph[gi].HourBlock,
								count: dbGraph[gi].MessageCount
							}
							graphInfo.push(graphRow)
						}
					}
					rooms[roomId].graphInfo = graphInfo
					// Button in #chats
					var chatButton = document.createElement("button")
					chatButton.className = "room"
					chatButton.className += dbRooms[r].Archived || !dbRooms[r].IsPartOf ? " temporary" : ""
					chatButton.dataset.roomid = roomId
					chatButton.innerText = "#" + dbRooms[r].RoomName
					chatButton.style.display = "none"
					$('#chats .rooms').append(chatButton)

					if (!dbRooms[r].Archived && dbRooms[r].IsPartOf) {
						setTimeout(animateRoom, delay, roomId)
						delay += 30
					}
				}
				refreshRoomHighlight()

				// Refresh chat on first load
				if (!chatInitialized) {
					initialSocketsWIP--
					checkIfDone()
				}
			}
		}
		// On stars received
		if (!response.err && response.input.request === "chatStarsLoad") {
			refreshStars(response.recordset.recordset)
		}
		// On hot messages
		if (!response.err && response.input.request === "chatHotMessagesLoad") {
			renderHot(response.recordset.recordset)
		}
	})

	// Helper for re-rendering users
	function refreshUsers() {
		$('#users').html("")
		for (i in users) {
			var link = "/user/" + i + "-" + users[i].username
			var html = '<div class="user-row" data-permaid="' + i + '">'
			html += '<div class="activity offline"></div>'
			html += nameTag(i).outerHTML
			html += '</div>'
			$('#users').append(html)
		}
		// Get user status too
		socketChat.emit('activity all request')
	}

	// Handle navigating to chat by date
	function navigateToChatDate(inputTimestamp) {
		// Clear chat
		$('#logContainer > *').not('button').remove()
		// Request chat
		socket.emit('data request', { request: "chatMessagesLoad", params: { earlier: false, room: viewingRoom, when: inputTimestamp } })
	}

	// Helper for re-rendering hot
	function renderHot(dbHot) {
		$('#hot > *').remove()
		for (i in dbHot) {
			if (i <= 6) {
				dbHot[i].rank = i * 1 + 1
				var ho = hotMsg(dbHot[i])
				$('#hot').append(ho)
			}
		}

	}
	// Helper for a hot message HTML object
	function hotMsg(passed) {
		var element = document.createElement("div")
		element.className = "snippet"
		element.dataset.messageid = passed.MessageId

		var hotness = document.createElement("div")
		hotness.className = "hotness"
		hotness.innerHTML = "#" + (passed.rank) + " with " + Math.round(passed.FullVal) + " arbitrary heat"
		element.appendChild(hotness)

		var msgcont = document.createElement("div")
		msgcont.className = "msg-container"

		if (passed.SenderAccountId !== null) {
			var whomst = document.createElement("span")
			whomst.className = "whomst"
			whomst.appendChild(nameTag(passed.SenderAccountId))
			msgcont.appendChild(whomst)
		}

		var content = document.createElement("div")
		content.className = "content chatformat"
		var ft = {
			contents: passed.ContentHTML,
			ej: passed.ExtraJSON,
			type: passed.MessageType
		}
		content.innerHTML = messageTransposeExtra(ft)
		msgcont.appendChild(content)

		element.appendChild(msgcont)

		var posted = document.createElement("button")
		posted.className = "posted"
		posted.innerHTML = "Posted "
		var postedago = document.createElement("span")
		postedago.title = dataTransformer("datetime long", passed.SentDate)
		postedago.innerHTML = dataTransformer("ago", passed.SentDate) + " ago"
		posted.appendChild(postedago)
		element.appendChild(posted)

		return element
	}
	// Reload heat every 5 minutes
	var hotIntervalObj = null
	function hotInterval() {
		if (hotIntervalObj) {
			clearInterval(hotIntervalObj)
		}
		hotIntervalObj = setInterval(() => {
			socket.emit('data request', { request: "chatHotMessagesLoad", params: { asOf: "now", room: viewingRoom } })
		}, 3e5)
	}
	$(document).on("click", 'button.explanation', () => {
		socket.emit('data request', { request: "chatHotMessagesLoad", params: { asOf: "now", room: viewingRoom } })
	})

	// Load starred messages
	function loadStars() {
		socket.emit('data request', { request: "chatStarsLoad" })
	}
	loadStars()
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
		$('#starred .snippet').remove()
		if (amountOfStars > 0) {
			$('#nostars').addClass("hidden")
			for (i in stars) {
				var element = document.createElement("div")
				element.className = "snippet"
				element.dataset.messageid = i
				element.dataset.timestamp = stars[i].messageDate

				var unstar = document.createElement("button")
				unstar.className = "unstar button"
				unstar.innerHTML = "Unstar"
				element.appendChild(unstar)

				if (stars[i].permaid !== null) {
					element.appendChild(nameTag(stars[i].permaid))
				}

				var content = document.createElement("div")
				content.className = "content chatformat"
				content.innerHTML = stars[i].contentHtml
				element.appendChild(content)

				var posted = document.createElement("button")
				posted.className = "posted"
				posted.innerHTML = "Posted "
				var postedago = document.createElement("span")
				postedago.title = dataTransformer("datetime long", stars[i].messageDate)
				postedago.innerHTML = dataTransformer("ago", stars[i].messageDate) + " ago"
				posted.appendChild(postedago)
				posted.innerHTML += " in #" + stars[i].room
				element.appendChild(posted)

				var whenstar = document.createElement("div")
				whenstar.className = "date-starred"
				whenstar.innerHTML = "Starred "
				var whenstardate = document.createElement("span")
				whenstardate.title = dataTransformer("datetime short", stars[i].dateStarred)
				whenstardate.innerHTML = dataTransformer("ago", stars[i].dateStarred) + " ago"
				whenstar.appendChild(whenstardate)
				element.appendChild(whenstar)

				$('#starred').prepend(element)
			}
		} else {
			$('#nostars').show()
		}
	}
	// Handle unstar message
	$(document).on("click", '#starred button.unstar', (e) => {
		var messageId = $(e.target).parents('#starred .snippet').attr('data-messageid')
		socket.emit('db procedure request', { procedure: "chatStarMessage", params: { messageid: messageId } })
		// On response is already handled by refreshing list
	})
	// Handle navigate to starred message
	$(document).on("click", '#starred button.posted', (e) => {
		var timestamp = $(e.target).parents('#starred .snippet').attr('data-timestamp')
		navigateToChatDate(timestamp)
	})

	// Helper for adding messages to screen
	function addChatToView(dbRecord, bottomOrTop) {
		// Check chat is not already rendered
		if ($('.achat[data-messageid="' + dbRecord.MessageId + '"]').length > 0) {
			return
		}

		contentLog[dbRecord.MessageId] = dbRecord.Content

		var classType = (dbRecord.MessageType).toLowerCase().replace(' ', '')
		var dateString = dataTransformer("time seconds", dbRecord.SentDate)
		var dateTitle = dataTransformer("datetime long", dbRecord.SentDate)

		var transObj = {
			contents: dbRecord.ContentHTML,
			ej: dbRecord.ExtraJSON,
			type: dbRecord.MessageType
		}
		var contents = messageTransposeExtra(transObj)

		var starred = (typeof stars[dbRecord.MessageId] === "object" ? " starred" : "")
		var edited = (typeof dbRecord.Edited !== "undefined" && dbRecord.Edited ? " edited" : "")

		// Begin element
		var toAdd = '<div '
		toAdd += 'class="achat ' + classType + starred + edited + '" '
		toAdd += 'data-messageid="' + dbRecord.MessageId + '" '
		toAdd += 'data-timestamp="' + dbRecord.SentDate + '" '
		toAdd += 'data-room="' + dbRecord.Room + '" '
		toAdd += 'data-sender="' + dbRecord.SenderAccountId + '"> '
		toAdd += '<div class="timestamp" title="' + dateTitle + '">' + dateString + '</div>'
		toAdd += '<div class="else">'
		if (dbRecord.SenderAccountId !== null) {
			var nt = nameTag(dbRecord.SenderAccountId, dbRecord.SenderDisplayName)
			nt.className += " from"
			toAdd += nt.outerHTML
		}
		if (dbRecord.MessageType === "Action") {
			toAdd += '<div class="systemmessage">System message</div>'
		}
		toAdd += '<div class="content chatformat">'
		toAdd += contents
		toAdd += '</div>'
		toAdd += '<span class="edited"> (edited)</span>'
		toAdd += '<button class="options">o</button>'
		// End element
		toAdd += '</div></div>'

		// Add chat and dividers/diffs
		if (bottomOrTop === "top") {
			// Add new message and dividers
			$('#logContainer button.showEarlier').after(toAdd)
			addChatDividersTop()
		} else {
			$('#logContainer').append(toAdd)
			// Animate if new
			if (dbRecord.MessageId === rooms[viewingRoom].lastMessageId) {
				var tar = $('.achat[data-messageid="' + dbRecord.MessageId + '"]')[0]
				var chatHeight = $(tar).height()
				var logHeight = $('#logViewPort')[0].scrollHeight + chatHeight
				$(tar).css('height', '0px').animate({ height: "+=" + chatHeight }, 200, "easeOutCirc", () => {
					$(tar).attr('style', '')
				})
				$('#logViewPort').animate({ scrollTop: logHeight }, 200)
			}
			// Dividers
			addChatDividersBottom()
		}

		// Consdier whether there are too many chats rendered, and chop accordingly
		var maxChatsToRender = 100
		if (bottomOrTop === "top") {
			if ($('.achat').length > maxChatsToRender) {
				// Get last chat that will be rendered
				var removeBelow = $('.achat')[maxChatsToRender]
				// If we're removing the latest chat, add button to load later chat
				if ($(removeBelow).nextAll().length > 0) {
					canSeeCurrent = false
					$('#logContainer .showLater').show()
				}
				// Remove all below
				$(removeBelow).nextAll(':not(button.showLater)').remove()
			}
		} else {
			if ($('.achat').length > maxChatsToRender) {
				// Get last chat that will be rendered
				var removeBelow = $('.achat').eq($('.achat').length - maxChatsToRender)
				// Remove all above
				$(removeBelow).prevAll().not('button.showEarlier').not($('.diffHeader').eq(-1)).remove()
				// (Re)move "show later" button
				if (dbRecord.MessageId === rooms[viewingRoom].lastMessageId) {
					$('button.showLater').hide()
				} else {
					$('button.showLater').show().appendTo('#logContainer')
				}
			}
		}
	}
	// Helper for adding dividers (top)
	function addChatDividersTop() {
		// Date headers
		var cEarlier = new Date($('#logContainer .achat').eq(0).attr('data-timestamp'))
		var cLater = new Date($('#logContainer .achat').eq(1).attr('data-timestamp'))
		// Always add date separator to top
		var ds = dateHeader(cEarlier)
		$('#logContainer .achat').eq(0).before(ds)
		// Remove any that are not just-added
		$('#logContainer .dateHeader[data-timestamp^="' + cEarlier.toDateString() + '"]').not(':eq(0)').remove()

		// Diff separators
		var cET = new Date(cEarlier),
			cLT = new Date(cLater)
		if (typeof cLater !== "undefined") {
			var hourDiff = Math.abs(cLT - cET) / 36e5
			if (hourDiff >= 4.5 / 60) {
				var ts = diffSeparator(hourDiff)
				$('#logContainer .achat').eq(0).after(ts)
			}
		}
	}
	// Helper for adding dividers (bottom)
	function addChatDividersBottom() {
		// Date headers
		var cEarlier = new Date($('#logContainer .achat').eq(-2).attr('data-timestamp'))
		var cEstring = cEarlier.getFullYear() + "" + cEarlier.getMonth() + "" + cEarlier.getDate()
		var cLater = new Date($('#logContainer .achat').eq(-1).attr('data-timestamp'))
		var cLstring = cLater.getFullYear() + "" + cLater.getMonth() + "" + cLater.getDate()
		var hasDateHeader = false

		if (cEarlier === null || cEstring !== cLstring) {
			var ds = dateHeader(cLater)
			$('#logContainer .achat').eq(-1).before(ds)
			hasDateHeader = true
		}

		// Diff separators
		var cET = new Date(cEarlier),
			cLT = new Date(cLater)
		var hourDiff = Math.abs(cLT - cET) / 36e5
		if (hourDiff >= 4.5 / 60) {
			var ts = diffSeparator(hourDiff)
			if (hasDateHeader) {
				$('#logContainer .dateHeader').eq(-1).before(ts)
			} else {
				$('#logContainer .achat').eq(-1).before(ts)
			}
		}
	}

	// Helper for date separators in chat
	function dateHeader(dateIn) {
		var dateOut = new Date(dateIn)
		dateOut = dataTransformer("date long", dateOut)
		var ret = '<div class="dateHeader" data-timestamp="' + dateIn.toDateString() + '">~ ' + dateOut + ' ~</tr>'
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

		var ret = '<div class="diffSeparator"><div ' + padding + '>' + diffString + '</div></div>'
		return ret
	}

	// On "show earlier" changed
	$('button.showEarlier').on("click", () => {
		var stamp = $('.achat').eq(0).attr('data-timestamp')
		socket.emit('data request', { request: "chatMessagesLoad", params: { earlier: true, room: viewingRoom, when: stamp } })
	})
	$(document).on("click", 'button.showLater', () => {
		var stamp = $('.achat').eq(-1).attr('data-timestamp')
		socket.emit('data request', { request: "chatMessagesLoad", params: { earlier: false, room: viewingRoom, when: stamp } })
	})

	// On message received
	var heldInQueue = []
	socketChat.on('chat sent', (response) => {
		console.log(response)
		checksum = response.checksum
		if (initialSocketsWIP > 0) {
			heldInQueue.push(response)
		} else {
			chatReceived(response)
		}
	})
	function chatReceived(response) {
		if (!response.err) {
			var r = response.fromDb.recordset[0]

			// Check if last message on screen is current
			if (rooms[viewingRoom].lastMessageId == $('#logContainer .achat').eq(-1).attr('data-messageid')) {
				canSeeCurrent = true
				$('#logContainer .showLater').hide()
			} else {
				canSeeCurrent = false
				$('#logContainer .showLater').show().appendTo('#logContainer')
			}

			// Update rooms object to store latest message
			if (rooms[r.Room].lastTimestamp < r.SentDate) {
				rooms[r.Room].lastMessageId = r.MessageId
				rooms[r.Room].lastTimestamp = r.SentDate
			}

			if (canSeeCurrent) {
				// Add to view
				if (r.Room === viewingRoom) {
					addChatToView(r, "bottom")
				}

				// Scroll to new message if already at bottom
				var userScroll = $('#logViewPort').scrollTop() + $('#logViewPort').height()
				var maxScroll = $('#logViewPort')[0].scrollHeight
				if (userScroll === maxScroll) {
					$('#logViewPort').scrollTop($('#logViewPort')[0].scrollHeight)
				}
			}

			// Only if they're part of the room...
			if (rooms[r.Room].partOf) {

				// Play sound
				var msgsound
				if (r.MessageType === "Action") {
					if ((r.Content).match(/is now looking at chat/gi) !== null) {
						msgsound = new Audio('/c/SoundCiv4War.mp3')
					} else if ((r.Content).match(/left. Huh./gi) !== null) {
						msgsound = new Audio('/c/SoundCiv4LossMiddle.mp3')
					} else {
						msgsound = new Audio('/c/SoundCiv4Border.mp3')
					}
				} else {
					msgsound = new Audio("/c/SoundCiv4StarterSfx.mp3")
				}
				msgsound.play()

				// Send notification
				if (viewingAsPermaId != r.SenderAccountId) {
					if (Notification.permission === "granted") {
						var nopt = {
							body: r.SenderDisplayName + ": " + r.Content,
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
				} //End notification
			} // End if part of room
		} // End if not error
	}

	// Send message helper
	function sendMessage(content) {
		if (content.match(/^[0-9]+px$/gi) !== null) {
			$('#logContainer').css('margin-bottom', content)
		} else {
			if (content.match(/^\^+$/gi) !== null) {
				var amount = content.length
				var reactMessageId = $('#logContainer .achat').eq(-amount).attr('data-messageid')
				reactPositively(reactMessageId)
			}

			var uid = Math.random()
			socketChat.emit('chat send', { content: content, contentHtml: markdownContent(content), uid: uid, room: viewingRoom })
		}
	}
	// Message format markdown
	function markdownContent(inputContent) {
		var inArr = inputContent.split("")
		var outputContent = ""

		// _ is italics
		// ** is bold
		// ` is code
		// > is greentext
		// < is redtext
		// # is header

		var layers = []
		var possiblyInUrl = false

		for (var c = 0; c < inputContent.length; c++) {

			// Primitively keeps track of whether we're currently in a URL so that italics rule does not apply
			var last4 = ""
			if (c >= 3) {
				last4 = inArr[c - 3] + inArr[c - 2] + inArr[c - 1] + inArr[c]
				if (last4 == 'http') {
					possiblyInUrl = true
				}
				if (possiblyInUrl && !(inArr[c]).match(/[-a-z0-9@:;%_\+.~#?&//=]/gi)) {
					possiblyInUrl = false
					console.log("Exited URL at index " + c)
				}
			}

			//console.log("testing index " + c + ": " + inArr[c] + " (UTF-16 code " + inArr[c].charCodeAt(0) + "). Last 4 " + last4 + ", in url " + possiblyInUrl)

			// Escape HTML
			inArr[c] = inArr[c].replace(/&/g, '&amp;')
			inArr[c] = inArr[c].replace(/</g, '&lt;')
			inArr[c] = inArr[c].replace(/>/g, '&gt;')

			// Split on newlines
			if (inArr[c].charCodeAt(0) === 10) {
				// Do greentexts/headers first
				for (var li = 0; li < layers.length; li++) {
					if (layers[li].type === "greentext" || layers[li].type === "redtext" || layers[li].type === "header") {
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

			// Redtext
			if (inArr[c] === "&lt;") {
				if (c === 0) {
					layers.push({ type: "redtext", start: c, end: null })
					inArr[c] = '<span class="redtext">&lt;'
				} else if (inArr[c - 1].charCodeAt(0) === 10) {
					layers.push({ type: "redtext", start: c, end: null })
					inArr[c] = '<span class="redtext">&lt;'
				}
			}

			// Headers
			if (inArr[c] === "#") {
				if (c === 0) {
					layers.push({ type: "header", start: c, end: null })
					inArr[c] = '<span class="header at-start">'
				} else if (inArr[c - 1].charCodeAt(0) === 10) {
					layers.push({ type: "header", start: c, end: null })
					inArr[c] = '<span class="header">'
				}
			}

			// Perform replacement as required by layers
			for (var li = 0; li < layers.length; li++) {
				if (layers[li].type === "greentext" || layers[li].type === "redtext" || layers[li].type === "header") {
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

		// Reddit links
		outputContent = outputContent.replace(/(^|\s)(\/r\/[a-z0-9_]+)($|\s)/gi, '$1<a href="https://reddit.com$2">$2</a>$3')
		// 4chan links
		outputContent = outputContent.replace(/(^|\s)(\/[a-z0-9]{1,4}\/)($|\s)/gi, '$1<a href="http://4chan.org$2">$2</a>$3')

		return outputContent
	}

	// Send message on return press
	$(document).on('keypress', '#sendContainer textarea', (e) => {
		if (e.keyCode === 13 && !e.shiftKey) {
			var content = $('#sendContainer textarea').val()
			sendMessage(content)
			$('textarea').val('')
			e.preventDefault()
		}
	})

	// On room change
	$(document).on("click", "#chats button", (e) => {
		// Get room just clicked
		var room = $(e.target).attr('data-roomid')
		if (room) {
			// REGULAR CHATOROOM
			viewingRoom = room

			// Clear chat
			contentLog = {}
			$('#logContainer > .achat, #logContainer > .diffSeparator, #logContainer > .dateHeader').remove()
			// Clear forms and show log port
			$('.addRoomForm, #center .all-rooms').remove()
			$('#logViewPort, #sendContainer').show()
			// Loop through chat of room and add
			socket.emit('data request', { request: "chatMessagesLoad", params: { earlier: true, room: viewingRoom, when: "now" } })

			// Clear hot
			$('#hot > *').remove()
			// Get new hot
			socket.emit('data request', { request: "chatHotMessagesLoad", params: { asOf: "now", room: viewingRoom } })
			hotInterval()

			// Render room card
			$('.card.room h2').text('#' + rooms[room].name)
			var desc = rooms[room].description || '<span style="font-style: italic">No description</span>'
			$('#room .description').html(desc)
			// Consider presence of archive and leave buttons
			considerRoomOptions()

			// Refresh room highlight
			refreshRoomHighlight()

			// Remove temporary, non-current rooms
			$('#chats .rooms button.room.temporary').not('[data-roomid="' + viewingRoom + '"]').hide()

			// Consider status message for room
			statusMessageRoom(viewingRoom)
		} else {
			// ALL ROOMS / ADD ROOM

			if (e.target.dataset.function === "add") {
				renderAddRoom()
			} else if (e.target.dataset.function === "all") {
				renderAllRooms()
			}

			// Refresh highlight
			refreshRoomHighlight(e.target.dataset.function)
		}
	})
	// Highlight chosen room
	function refreshRoomHighlight(room) {
		var selector
		if (room) {
			var selectors = {
				all: 'button.chatRooms',
				add: 'button.addRoom'
			}
			selector = selectors[room] || ""
		} else {
			selector = 'button.room[data-roomid="' + viewingRoom + '"]'
		}
		$('#chats button').removeClass('active')
		$('#chats ' + selector).addClass('active')
	}
	// Helper for animating room list
	function animateRoom(roomId) {
		$('#chats button.room[data-roomid="' + roomId + '"]').slideDown(150, "easeOutCirc")
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

	// Helper for doing chat content JSON replacement
	function messageTransposeExtra(input) {
		var out = input.contents
		if (input.type === "Action" && input.ej !== null) {
			var ej = JSON.parse(input.ej)
			out = out.replace('{player}', nameTag(ej.accountPermaId).outerHTML)
			out = out.replace('{room}', '<span style="font-weight: normal">#' + ej.room + '</span>')
			out = out.replace('{newDescription}', ej.newDescription)
		}
		if (input.type === "Action") {
			for (i2 in users) {
				out = out.replace('{accountPermaId' + i2 + '}', nameTag(i2).outerHTML)
			}
		}
		return out
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
	// Listen for info collapses
	$(document).on("click", '#info .card button.collapser', (e) => {
		console.log(e)
		var isCollapsed = $(e.target).parents('.card').hasClass('collapsed')

		if (isCollapsed) {
			$(e.target).parents('.card').children().not('button.collapser').slideDown(150, "easeOutCirc")
			$(e.target).parents('.card').removeClass("collapsed")
		} else {
			$(e.target).parents('.card').children().not('button.collapser').slideUp(150, "easeOutCirc")
			$(e.target).parents('.card').addClass("collapsed")
		}
	})
	// Listen for hovering over room to color leave button
	$('.card.room').hover(() => {
		$('#leave-room, #archive-room').addClass('negative').removeClass('smol')
	}, () => {
		$('#leave-room, #archive-room').removeClass('negative').addClass('smol')
	})
	// Listen for date searching
	$(document).on("click", '#chatSearch button.search', (e) => {
		var searchDate = $(e.target).parent('#chatSearch').find('input[type="date"]').val()

		if (searchDate.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) !== null) {
			var tzo = new Date().getTimezoneOffset()
			var dSearch = new Date(searchDate)
			var dAbs = Math.abs(dSearch) + tzo * 6e4
			var inputTimestamp = new Date(dAbs).toISOString()
			navigateToChatDate(inputTimestamp)
		}
	})

	// Listen for window size changes
	$(window).on('resize', (e) => {
		reconsiderSend()
	})

	// Change size of sendContainer when sidebars are open/closed
	function reconsiderSend() {
		var width = window.innerWidth - 20
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

	// Timer stuff for determining whether you're active
	var activeTimer = null
	var lastActive = new Date()
	// Helper for instantiating interval that comms to server
	function instantiateTimer() {
		if (activeTimer === null) {
			//console.log("New timer")
			emitActivity()
			activeTimer = setInterval(() => {
				emitActivity()
			}, 10000)
		}
	}
	// Helper for emitting last activity to server
	function emitActivity() {
		//console.log("Sending")
		socketChat.emit('activity send', { lastActive: lastActive })
	}
	// On tab active, instantiate timer and we're active
	$(window).focus(() => {
		lastActive = new Date()
		instantiateTimer()
		//console.log("Activity, " + activeTimer)
	})
	// On tab inactive, turn off timer
	$(window).blur(() => {
		clearInterval(activeTimer)
		activeTimer = null
		//console.log("Cleared")
	})
	// On any activity, update last active ready for next broadcast
	$(document).on("click keydown mousemove", () => {
		//console.log("Activity, " + activeTimer)
		instantiateTimer()
		lastActive = new Date()
	})
	// When we receive an update on someone's activity on the server
	socketChat.on('activity update', (changes) => {
		for (i in changes) {
			var classToAdd = changes[i]
			$('#users .user-row[data-permaid="' + i + '"] .activity').removeClass('online inactive offline').addClass(classToAdd)
		}
	})
	socketChat.on('activity all repsonse', (activity) => {
		console.log("Received all activity")
		for (i in activity) {
			var classToAdd = activity[i]
			$('#users .user-row[data-permaid="' + i + '"] .activity').removeClass('online inactive offline').addClass(classToAdd)
		}
	})

	// Adding a new room
	function renderAddRoom() {
		$('#center .addRoomForm').remove()

		var html = '<div class="addRoomForm">'
		html += '<div><input type="text" name="roomName" placeholder="Room name"/></div>'
		html += '<div><button class="button raised colored addRoomSubmit">Add room</button></div>'
		html += '<div><div class="error" style="display: none"></div></div>'
		html += '</form>'

		$('#center > *').hide()
		$('#center').append(html)
	}
	// Handle submit
	$(document).on("click", '.addRoomSubmit', () => {
		var room = $('[name="roomName"]').val()
		if (!room.match(/^#[a-zA-Z1-9-]+$/)) {
			$('.addRoomForm .error').slideUp(() => {
				var erHtml = 'Error: Room name must begin with a # and must only contain alphanumeric character or hyphens.'
				$('.addRoomForm .error').html(erHtml).slideDown()
			})
		} else {
			room = room.slice(1)
			socketChat.emit('room add', { roomName: room })
		}
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
		checksum = response.checksum
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

	// Showing the "all rooms" screen
	function renderAllRooms() {
		var container = document.createElement("div")
		container.className = "all-rooms"

		var heading = document.createElement("h2")
		heading.innerText = "All chat rooms"
		container.appendChild(heading)

		// From hourly messages, build day graph
		var dayGraphData = {}
		for (r in rooms) {
			dayGraphData[r] = {}
			for (gi in rooms[r].graphInfo) {
				var gir = rooms[r].graphInfo[gi]
				var dateObj = new Date(gir.hourBlock)
				var dateString = dateObj.getFullYear()
				dateString += "-" + zeroPad(dateObj.getMonth())
				dateString += "-" + zeroPad(dateObj.getDate())

				if (typeof dayGraphData[r][dateString] !== "undefined") {
					dayGraphData[r][dateString] += gir.count
				} else {
					dayGraphData[r][dateString] = gir.count
				}
			}
		}
		// Calculate most messages sent in a room in a day
		var maxestMessages = 0
		for (r in dayGraphData) {
			for (i in dayGraphData[r]) {
				maxestMessages = dayGraphData[r][i] > maxestMessages ? dayGraphData[r][i] : maxestMessages
			}
		}

		// Rooms you are part of
		var roomsActive = document.createElement("div")
		roomsActive.className = "rooms-container"
		roomsActive.dataset.type = "active"
		for (r in rooms) {
			if (!rooms[r].archived && rooms[r].partOf) {
				var roomBox = buildRoomBox(r)
				roomsActive.appendChild(roomBox)				
			}
		}
		container.appendChild(roomsActive)

		// Rooms you are NOT part of
		var roomsAvailableHeading = document.createElement("h3")
		roomsAvailableHeading.innerText = "Available to join"
		container.appendChild(roomsAvailableHeading)
		var roomsAvailable = document.createElement("div")
		roomsAvailable.className = "rooms-container"
		roomsAvailable.dataset.type = "available"
		for (r in rooms) {
			if (!rooms[r].archived && !rooms[r].partOf) {
				var roomBox = buildRoomBox(r)
				roomsAvailable.appendChild(roomBox)
			}
		}
		container.appendChild(roomsAvailable)

		// Rooms archived
		var roomsArchivedHeading = document.createElement("h3")
		roomsArchivedHeading.innerText = "Archived rooms"
		container.appendChild(roomsArchivedHeading)
		var roomsArchived = document.createElement("div")
		roomsArchived.className = "rooms-container"
		roomsArchived.dataset.type = "archived"
		for (r in rooms) {
			if (rooms[r].archived) {
				var roomBox = buildRoomBox(r)
				roomsArchived.appendChild(roomBox)
			}
		}
		container.appendChild(roomsArchived)

		// Render
		$('#center .all-rooms').remove()
		$('#center > *').hide()
		$('#center').append(container)

		// Helper for room graph activity
		function buildRoomBox(r) {
			var roomBox = document.createElement("div")
			roomBox.className = "room-box"

			var title = document.createElement("button")
			title.innerText = '#' + rooms[r].name
			title.dataset.roomid = r
			roomBox.appendChild(title)
			var description = document.createElement("div")
			description.className = "description"
			description.innerText = rooms[r].description
			roomBox.appendChild(description)

			var gc = document.createElement("div")
			gc.className = "graph-container"
			gc.title = "Activity over the past 14 days"

			for (i in dayGraphData[r]) {
				var barContainer = document.createElement("div")
				barContainer.className = "bar-container"
				var bar = document.createElement("div")
				bar.className = "bar"
				var dateString = dataTransformer("date long", i)
				bar.title = dateString += ": " + dayGraphData[r][i] + " messages"
				var percentage = Math.pow(dayGraphData[r][i] / maxestMessages, 0.5) * 100
				bar.style.height = percentage + "%"
				barContainer.appendChild(bar)
				gc.appendChild(barContainer)
			}

			roomBox.appendChild(gc)

			return roomBox
		}
	}
	// Handling room navigations on "all rooms"
	$(document).on("click", '.all-rooms .room-box button', (e) => {
		var roomId = $(e.target).attr('data-roomid')

		console.log($('#chats .rooms [data-roomid="' + roomId + '"]'))
		
		$('#chats .rooms [data-roomid="' + roomId + '"]').show().trigger("click")
	})

	// Handle user display name being changed
	socketChat.on('display name changed', (response) => {
		checksum = response.checksum
		if (typeof users[response.permaid] === "object") {
			users[response.permaid].displayName = response.changedTo
			refreshUsers()
		}
	})

	// Room description edit: Activate form
	$('#room button.description').on("click", (e) => {
		$('#room button.description').hide()
		$('#room .description-edit').show()
		$('#room .description-edit textarea').html(rooms[viewingRoom].description || "").focus()
	})
	// Room description edit: Reactivate form on cancel
	$('#room .description-edit button.cancel').on("click", (e) => {
		$('#room button.description').show()
		$('#room .description-edit').hide()
	})
	// Room description edit: Submit changes on submit
	$('#room .description-edit button.submit').on("click", (e) => {
		var desc = $('#room .description-edit textarea').val()
		socketChat.emit('room description change', { room: viewingRoom, description: desc })
		$('#room .description-edit > *').prop("disabled", true)
		$('#room .description-edit button.submit').html("Submitting...")
	})
	// Room description edit: When user's update succeeds
	socketChat.on("room description change response", (response) => {
		$('#room .description-edit > *').prop("disabled", false)
		$('#room button.description').show()
		$('#room .description-edit').hide()
	})
	// Room description edit: When a room's description is changed (by anyone)
	socketChat.on("room description changed", (change) => {
		rooms[change.room].description = change.description
		if (viewingRoom === change.room) {
			$('#room button.description').html(change.description)
		}
	})

	// Modal opening and closing
	function renderModal(content) {
		$('#centerModal').show().css("opacity", "0").animate({ opacity: "1" }, 250, "easeOutCirc")
		$('#centerModal .modal-container').append(content)
	}
	$('#centerModal button.close-modal').click(() => {
		$('#centerModal').animate({ opacity: "0" }, 150, "easeOutCirc", () => {
			$('#centerModal').hide()
			$('#centerModal *:not(.persistent)').remove()
		})
	})

	// Status messages for send container
	// Helper for showing displaying interface message on send container
	function considerSendContainer() {
		if (typeof statusMessages.priority1[0] !== "undefined") {
			// Priority 1: Errors
			$('#sendContainer textarea').hide().prop("disabled", true)
			$('#sendContainer .clickable-message').hide()
			$('#sendContainer .error-custom').show().html(statusMessages.priority1[0].msg)
		} else if (typeof statusMessages.priority2[0] !== "undefined") {
			// Priority 2: Desyncs
			var p2 = statusMessages.priority2[0]
			$('#sendContainer textarea').hide().prop("disabled", true)
			$('#sendContainer .clickable-message').show().html(p2.msg).attr('data-key', p2.key)
			$('#sendContainer .error-custom').hide()
		} else if (typeof statusMessages.priority3[0] !== "undefined") {
			// Priority 3: You cannot chat
			var p3 = statusMessages.priority3[0]
			$('#sendContainer textarea').hide().prop("disabled", true)
			$('#sendContainer .clickable-message').show().html(p3.msg).attr('data-key', p3.key)
			$('#sendContainer .error-custom').hide()
		} else {
			// You can chat
			$('#sendContainer textarea').show().prop("disabled", false)
			$('#sendContainer .clickable-message').hide()
			$('#sendContainer .error-custom').hide()
		}
	}
	// Helper for general message objects
	function statusMessageObject(type, msg, key) {
		var r = { type: type, msg: msg }
		if (type === "message") {
			r.key = key
		}
		return r
	}
	// There's a connection error
	function statusMessageConnectionError(isError) {
		if (isError) {
			statusMessages.priority1 = [ statusMessageObject("error", "Connection error. The server is probably down") ]
		} else {
			statusMessages.priority1 = []
		}
		considerSendContainer()
	}
	// There's a desync
	function statusMessageDesycn(isDesync) {
		if (isDesync) {
			statusMessages.priority2 = [ statusMessageObject("message", "Chat has become desynced. Click to refresh", "desync") ]
		} else {
			statusMessages.priority2 = []
		}
		considerSendContainer()
	}
	// Helper for clicking a desync message
	$(document).on("click", '#sendContainer .clickable-message[data-key="desync"]', (e) => {
		$('button.room[data-roomid="' + viewingRoom + '"]').trigger("click")
		statusMessageDesycn(false)
	})
	// You're not part of the room for some reason
	function statusMessageRoom(room) {
		var ro = rooms[room]
		statusMessages.priority3 = []
		if (ro.archived) {
			statusMessages.priority3 = [statusMessageObject("message", "This room is archived. Click to unarchive.", "archive")]
		} else if (!ro.partOf) {
			statusMessages.priority3 = [statusMessageObject("message", "You are not part of this chat room. Click to join.", "available")]
		}
		considerSendContainer()
	}
	// Joining the room
	$(document).on("click", '#sendContainer .clickable-message[data-key="available"]', (e) => {
		socketChat.emit('room join', { room: viewingRoom })
	})
	socketChat.on('room joined', (response) => {
		console.log(response)
		
		if (response.success) {
			$('#chats .rooms button[data-roomid="' + response.room + '"]').removeClass("temporary").show()
			rooms[response.room].partOf = true
			statusMessageRoom(viewingRoom)
			considerRoomOptions()
		}
	})
	// Leaving the room
	$(document).on("click", '#leave-room', (e) => {
		socketChat.emit('room leave', { room: viewingRoom })
	})
	socketChat.on('room left', (response) => {
		console.log(response)

		if (response.success) {
			$('#chats .rooms button[data-roomid="' + response.room + '"]').addClass("temporary")
			if (viewingRoom !== response.room) {
				$('#chats .rooms button[data-roomid="' + response.room + '"]').hide()
			}
			rooms[response.room].partOf = false
			statusMessageRoom(viewingRoom)
			considerRoomOptions()
		}
	})
	// Helper for considering the presence of the leave room button
	function considerRoomOptions() {
		if (rooms[viewingRoom].partOf && viewingRoom !== "tournytime") {
			$('#leave-room').show()
		} else {
			$('#leave-room').hide()
		}
		$('#archive-room').prop("disabled", false).html("Archive room")
		if (!rooms[viewingRoom].archived && viewingRoom !== "tournytime") {
			$('#archive-room').show()
		} else {
			$('#archive-room').hide()
		}
	}
	// Archiving a room
	$(document).on("click", '#archive-room', (e) => {
		$('#archive-room').prop("disabled", true)
		socketChat.emit('room archive', { room: viewingRoom })
	})
	socketChat.on('room archived', (response) => {
		console.log(response)
		$('#archive-room').prop("disabled", false)
		if (response.success) {
			$('#archive-room').html("Archive room")
		} else {
			$('#archive-room').html("Error archiving")
		}
	})
	socketChat.on('room archived global', (response) => {
		console.log(response)
		if (response.success) {
			rooms[response.room].archived = true
			$('#chats .rooms button[data-roomid="' + response.room + '"]').addClass("temporary")
			if (response.room === viewingRoom) {
				statusMessageRoom(viewingRoom)
				considerRoomOptions()
			} else {
				$('#chats .rooms button[data-roomid="' + response.room + '"]').hide()
			}
		}
	})
	// Unarchiving a room
	$(document).on("click", '#sendContainer .clickable-message[data-key="archive"]', (e) => {
		socketChat.emit('room unarchive', { room: viewingRoom })
	})
	socketChat.on('room unarchived', (response) => {
		console.log(response)
	})
	socketChat.on('room unarchived global', (response) => {
		console.log(response)
		if (response.success) {
			console.log("Unarchive success, are " + response.room + " and " + viewingRoom + " the same?")
			rooms[response.room].archived = false
			$('#chats .rooms button[data-roomid="' + response.room + '"]').removeClass("temporary").show()
			if (response.room === viewingRoom) {
				statusMessageRoom(viewingRoom)
				considerRoomOptions()
			}
		}
	})

	/***********************/
	/*** Message options ***/
	/***********************/

	// Handle chat option button click
	$(document).on("click", ".achat button.options", (e) => {
		var parent = $(e.target).parent()[0]
		var messageId = $(parent).parents('.achat').attr('data-messageid')
		// Base element
		var optionsEl = document.createElement("div")
		optionsEl.className = "options"
		// Edit
		if ($('.achat[data-messageid="' + messageId + '"]').attr('data-sender') === viewingAsPermaId) {
			var edit = document.createElement("button")
			edit.className = "option edit"
			edit.innerHTML = "Edit message"
			optionsEl.appendChild(edit)
		}
		// History
		var history = document.createElement("button")
		history.className = "option history"
		history.innerHTML = "View history"
		optionsEl.appendChild(history)
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
		checksum = response.checksum

		// Calculate whether the user is scrolled to the bottom and store for later
		var userScrolled = $('#logViewPort').scrollTop() + $('#logViewPort').height()
		var userIsScrolledDown = userScrolled === $('#logViewPort')[0].scrollHeight ? true : false

		var messageId = response.input.messageId
		$('[data-messageid="' + messageId + '"] div.options .close').trigger("click")

		// Flush existing reactions from message memory and rebuild
		var reas = []
		for (i in response.result.recordset) {
			var r = response.result.recordset[i]
			var bo = {
				permaId: r.AccountPermaId,
				reaction: r.Reaction
			}
			reas.push(bo)
		}
		$('[data-messageid="' + messageId + '"] .reactions').remove()
		addReactionsToView(messageId, reas)

		// If the user was scrolled down all the way before 
		// the reaction HTML was inserted, rescroll to bottom
		if (userIsScrolledDown) {
			$('#logViewPort').scrollTop($('#logViewPort')[0].scrollHeight)
		}
	})
	// Helper for rendering reactions
	function addReactionsToView(messageId, reactions) {
		var html = ""

		if (reactions.length > 0) {
			html += '<div class="reactions">'
			// First build an object which groups reactions so they
			// can be processed per reaction given
			var mr = {}
			for (i in reactions) {
				var reactiontype = reactions[i].reaction
				var userPermaId = reactions[i].permaId
				if (typeof mr[reactiontype] !== "object") {
					mr[reactiontype] = { count: 0, who: "", me: false }
				}
				mr[reactiontype].count++
				mr[reactiontype].who += ", " + users[userPermaId].displayName
				mr[reactiontype].me = (userPermaId == viewingAsPermaId ? true : mr[reactiontype].me)
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

		$('.achat[data-messageid="' + messageId + '"] .else').append(html)
	}

	// Handle vieiwng audit history
	$(document).on("click", 'button.option.history', (e) => {
		var messageId = $(e.target).parents('.achat').attr('data-messageid')
		openAudit(messageId)
	})
	function openAudit(messageId) {
		// Emit request for history
		socket.emit('data request', { request: "chatMessageAuditLoad", params: { messageId: messageId } })
		// Close options
		$('.achat[data-messageid="' + messageId + '"]').parent().find('button.option.close').trigger("click")
		// Open modal
		var forModal = '<h2>Message history</h2>'
		forModal += '<p class="loading">Loading your bespoke message history...</p>'
		forModal += '<p><label><input type="checkbox" name="hide-reactions"/> Hide reaction</label></p>'
		forModal += '<div class="timeline-container">'
		forModal += '<div class="timeline-line"></div>'
		forModal += '<div class="timeline-parts"></div>'
		forModal += '</div>'
		renderModal(forModal)
	}
	// Handle receiving audit history
	socket.on('data response', (response) => {
		if (!response.err && response.input.request === "chatMessageAuditLoad") {
			$('#centerModal p.loading').slideUp(150, 'easeOutCirc')

			var hist = response.recordset.recordset
			for (i in hist) {
				// Container
				var pcont = document.createElement("div")
				pcont.className = "part-container"
				pcont.dataset.type = (hist[i].Header).replace(/\s/g, "").toLowerCase()

				// Connector
				var pcnct = document.createElement("div")
				pcnct.className = "part-connector"
				var pbubble = document.createElement("div")
				pbubble.className = "bubble"
				pcnct.appendChild(pbubble)

				// Part proper
				var part = document.createElement("div")
				part.className = "part"

				var h = document.createElement("h3")
				h.innerHTML = hist[i].Header

				var ago = document.createElement("p")
				ago.className = "ago"
				ago.innerHTML = dataTransformer("ago", hist[i].AuditDate) + " ago"
				ago.title = dataTransformer("datetime long", hist[i].AuditDate)

				var ej = JSON.parse(hist[i].ExtraJSON)
				var dstring = hist[i].Details
				var nth
				if (ej.accountPermaId === null) {
					nth = '<span style="font-weight: bold">System</span>'
				} else {
					var user = ej.accountPermaId
					var userEntry = typeof user !== "undefined" ? users[user] : {}
					var nt = nameTag(user, userEntry.displayName)
					nth = nt.outerHTML
				}
				dstring = dstring.replace(/{player}/g, nth)
				dstring = dstring.replace(/{room}/g, '#' + ej.room)
				dstring = dstring.replace(/{reaction}/g, ej.reaction)
				dstring = dstring.replace(/{content}/g, '<div class="chatformat">' + ej.contentHtml + '</div>')

				var d = document.createElement("p")
				d.innerHTML = dstring

				// Build relationship and render on form
				part.appendChild(h)
				part.appendChild(ago)
				part.appendChild(d)

				pcont.appendChild(pcnct)
				pcont.appendChild(part)
				$('#centerModal .timeline-parts').append(pcont)
			}
			if (hist.length === 0) {
				$('#centerModal .modal-container').append('<p>We have no history for this message. It might be that message history was not implemented when actions were performed against this message.</p>')
			}
		}
	})
	// Handle hiding reactions from timeline
	$(document).on("change", '#centerModal [name="hide-reactions"]', (e) => {
		if (e.target.checked) {
			$('#centerModal [data-type^="reaction"]').slideUp(500, 'easeOutCirc')
		} else {
			$('#centerModal [data-type^="reaction"]').slideDown(150, 'easeOutCirc')
		}
	})

	// Handle edit message press
	$(document).on("click", 'button.option.edit', (e) => {
		// Calculate whether the user is scrolled to the bottom and store for later
		var userScrolled = $('#logViewPort').scrollTop() + $('#logViewPort').height()
		var userIsScrolledDown = userScrolled === $('#logViewPort')[0].scrollHeight ? true : false

		// Open form
		var messageId = $(e.target).parents('.achat').attr('data-messageid')

		$(e.target).parents('.achat').addClass('editing')

		var elEditArea = document.createElement("div")
		elEditArea.className = "edit"

		var elNew = document.createElement("textarea")
		elNew.value = contentLog[messageId]
		elEditArea.appendChild(elNew)

		var elButtons = document.createElement("div")
		elButtons.className = "buttons"

		var elCancel = document.createElement("button")
		elCancel.className = "button raised cancel"
		elCancel.textContent = "Cancel"
		elButtons.appendChild(elCancel)
		var elSubmit = document.createElement("button")
		elSubmit.className = "button raised colored submit"
		elSubmit.textContent = "Edit"
		elButtons.appendChild(elSubmit)

		elEditArea.appendChild(elButtons)

		$(e.target).parents('.achat').children('.else').children('.content').after(elEditArea)

		// Close menu
		$('[data-messageid="' + messageId + '"] div.options .close').trigger("click")

		// If the user was scrolled down all the way before 
		// the edit HTML was inserted, rescroll to bottom
		if (userIsScrolledDown) {
			$('#logViewPort').scrollTop($('#logViewPort')[0].scrollHeight)
		}
	})
	// Handle edit message cancel
	$(document).on("click", '.achat .edit button.cancel', (e) => {
		var messageId = $(e.target).parents('.achat').attr('data-messageid')
		closeEdit(messageId)
	})
	// Handle edit message submit
	$(document).on("click", '.achat .edit button.submit', (e) => {
		var content = $(e.target).parents('.achat .edit').find('textarea').val()
		var contentHtml = markdownContent(content)
		var messageId = $(e.target).parents('.achat').attr('data-messageid')
		socketChat.emit('message edit', { messageId: messageId, content: content, contentHtml: contentHtml })
	})
	// Handle edit message submit conf
	socketChat.on('message edited', (response) => {
		console.log(response)
		if (!response.err) {
			var messageId = response.input.messageId
			closeEdit(messageId)
			contentLog[messageId] = response.result.recordset[0].Content
			$('.achat[data-messageid="' + messageId + '"]').addClass('edited').find('.content').html(response.result.recordset[0].ContentHTML)
		}
	})
	// Helper for closing edit form
	function closeEdit(messageId) {
		$('.achat[data-messageid="' + messageId + '"]').removeClass('editing')
		$('.achat[data-messageid="' + messageId + '"]').find('div.edit').remove()
	}

})