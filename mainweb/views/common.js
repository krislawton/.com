$(document).ready(() => {

	var globalSocket = io()

	// Top dialogue toggler
	$(document).on("click", '#topBanner .right > button', (e) => {
		var button = $(e.target).closest('button')[0]
		var fromLeft = $(button).offset().left
		fromLeft -= 340

		var selector = ''
		if (button.classList.contains("user")) {
			selector = 'profile'
		} else if (button.classList.contains("achievements")) {
			selector = 'achievements'
		} else if (button.classList.contains("about")) {
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
				$('#topBanner .right > .about').addClass('attention')
				$('#topBanner .right > .about .badge').html(unreadCount)
			}
		}
	})
	// Handle pressing changelog ok button
	$(document).on("click", '.change .mark-as-read', (e) => {
		var changeId = $(e.target).parents('.change').attr('data-changeid')
		globalSocket.emit('db procedure request', { procedure: "rootUserChangelogAcknowledge", params: { changeId: changeId } })
	})
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
				$('#topBanner .right > .about').removeClass("attention")
			}
		}
	})

	// Load achievements
	globalSocket.emit('recent achievements request')
	globalSocket.on('recent achievements response', (response) => {
		console.log(response)
		if (!response.err) {
			$('.achievements-dialogue .recent-achievements').html("")
			
			var achs = response.result.recordset
			var newCount = 0
			for (i in achs) {
				newCount += (!achs[i].Seen? 1 : 0)

				var ach = document.createElement("div")
				ach.className = "ach-line"
				ach.className += (!achs[i].Seen ? " unseen" : "")
				ach.dataset.dbid = achs[i].AccAchieveId

				var left = document.createElement("div")
				left.className = "left"

				var chead = document.createElement("h4")
				var badge = document.createElement("a")
				badge.href = "/achievement/" + achs[i].URLName
				badge.innerHTML = achs[i].AchievementName
				badge.className = "ach-badge"
				badge.className += " lvl" + achs[i].LevelId
				chead.appendChild(badge)

				var cdesc = document.createElement("div")
				cdesc.className = "description"
				cdesc.innerHTML = achs[i].Information

				var when = document.createElement("div")
				when.className = "when"
				when.innerHTML = "Awarded " + dataTransformer("datetime long", achs[i].AwardedDate)

				var markAsSeen = document.createElement("button")
				markAsSeen.className = "mark-as-seen"
				markAsSeen.innerHTML = "ok"

				left.appendChild(chead)
				left.appendChild(cdesc)
				left.appendChild(when)
				ach.appendChild(left)
				ach.appendChild(markAsSeen)

				$('.achievements-dialogue > .inner > .recent-achievements').append(ach)
			}

			// Update badge
			if (newCount > 0) {
				$('#topBanner .right > .achievements').addClass('attention')
				$('#topBanner .right > .achievements .badge').html(newCount)
			}
		}
	})
	// Handle pressing achievement ok button
	$(document).on("click", '.achievement .mark-as-seen', (e) => {
		var accAchieveId = $(e.target).parents('.achievement').attr('data-dbid')
		globalSocket.emit('db procedure request', { procedure: "rootUserAchievementAcknowledge", params: { accAchieveId: accAchieveId } })
	})
	globalSocket.on('db procedure response', (response) => {
		if (!response.err && response.input.procedure === "rootUserAchievementAcknowledge") {
			var accAchieveId = response.input.params.accAchieveId
			$('.achievement[data-dbid="' + accAchieveId + '"]').removeClass('unseen')
			var sel = '#topBanner .right > .achievements .badge'
			var newUnseenCount = $(sel).html()
			newUnseenCount--
			$(sel).html(newUnseenCount)
			if (newUnseenCount === 0) {
				$('#topBanner .right > .achievements').removeClass("attention")
			}
		}
	})

})

// Global: Name colorer
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