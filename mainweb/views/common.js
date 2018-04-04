$(document).ready(() => {

	var globalSocket = io()

	// Top dialogue toggler
	$(document).on("click", '#topBanner .right > button', (e) => {
		var button = $(e.target).closest('button')[0]
		var fromLeft = $(button).offset().left
		fromLeft -= 340

		var selector = ''
		if (button.className === "user") {
			selector = 'profile'
		} else if (button.className === "achievements") {
			selector = 'achievements'
		} else if (button.className === "about") {
			selector = 'about'
		}

		$('#topDialogues .' + selector + '-dialogue').css('left', fromLeft + 'px').slideToggle(150, "easeOutCirc")
	})

	// Load changelog
	globalSocket.emit('data request', { request: "rootUserLoadChangelog" })
	globalSocket.on('data response', (response) => {
		console.log(response)
		if (!response.err && response.input.request === "rootUserLoadChangelog") {
			var changes = response.recordset
			var unreadCount = 0
			for (i in changes) {
				unreadCount += (changes[i].NotifyUser ? 1 : 0)

				var chel = document.createElement("div")
				chel.className = "change"
				chel.className += (!changes[i].Released ? " unreleased" : "")
				chel.className += (changes[i].NotifyUser ? " attention" : "")
				chel.dataset.changeid = changes[i].ChangeId

				var left = document.createElement("div")
				left.className = "left"

				var chead = document.createElement("h4")
				chead.innerHTML = changes[i].ChangeTitle

				var cdesc = document.createElement("div")
				cdesc.className = "description"
				cdesc.innerHTML = (!changes[i].Released ? "(In development)" : "")
				cdesc.innerHTML += changes[i].ChangeDescription

				var when = document.createElement("div")
				when.className = "when"
				when.innerHTML = dataTransformer("date long", changes[i].ReleasedDate)

				var markAsRead = document.createElement("button")
				markAsRead.className = "mark-as-read"
				markAsRead.innerHTML = "ok"

				left.appendChild(chead)
				left.appendChild(cdesc)
				left.appendChild(when)
				chel.appendChild(left)
				chel.appendChild(markAsRead)

				$('.about-dialogue > .inner > .changelog').append(chel)
			}

			// Update badge
			if (unreadCount > 0) {
				$('#topBanner .right > .about .badge').addClass('show').html(unreadCount)
			}
		}
	})
	// Handle pressing changelog ok button
	$(document).on("click", '.change .mark-as-read', (e) => {
		var changeId = $(e.target).parents('.change').attr('data-changeid')
		globalSocket.emit('db procedure request', { procedure: "rootUserChangelogAcknowledge", params: { changeId: changeId } })
	})
	// Handle changelog ok success
	globalSocket.on('db procedure response', (response) => {
		console.log(response)
		if (!response.err && response.input.procedure === "rootUserChangelogAcknowledge") {
			var changeId = response.input.params.changeId
			$('.change[data-changeid="' + changeId + '"]').removeClass('attention')
			var sel = '#topBanner .right > .about .badge'
			var newUnreadCount = $(sel).html()
			newUnreadCount--
			$(sel).html(newUnreadCount)
			if (newUnreadCount === 0) {
				$(sel).removeClass("show")
			}
		}
	})

})