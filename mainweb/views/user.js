$(document).ready(() => {

	// Helper for coloring user
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

	// Get username
	const permaid = $('#ids').attr('data-permaid')
	var username = $('#ids').attr('data-username')

	// Get who we're viewing the page as
	const myid = $('#ids').attr('data-mypermaid')

	// Connect to socket
	const socket = io()

	// Get general info
	socket.emit('data request', { request: "rootUserLoadInfo", params: { permaid: permaid } })
	socket.on('data response', (response) => {
		console.log(response)
		if (!response.err && response.input.request === "rootUserLoadInfo") {
			// General info
			var general = response.recordsets[0][0]

			if (myid === permaid) {
				var aboutMeText = general.AboutMe || '<span style="font-style: italic">You have no "about me". Click to rectify.</span>'
				$('button.about-me').html(aboutMeText).show()
				$('.about-me textarea').html(general.AboutMe)
			} else {
				var aboutMeText = general.AboutMe || '<span style="font-style: italic">This user has no "about me". Mysterious.</span>'
				$('p.about-me').html(aboutMeText).show()
			}

			var username = general.CustomId + "#" + general.AccountPermaId
			$('span.here.username').html(username)

			var currentColor = randomColor(general.CustomId, general.ColorChoiceId)
			var displayName = general.DisplayName
			$('span.here.display-name').html(displayName).css('color', currentColor)

			var signedUp = dataTransformer("date long", general.CreatedDate)
			$('span.here.create-date').html(signedUp)

			var activeLength = general.TotalActiveLength + " separate days"
			$('span.here.active-length').html(activeLength)

			var lastActive = general.LastActiveDaysAgo + " days ago"
			$('span.here.last-activity-ago').html(lastActive)

			var pageLoads = general.PageLoads + " page loads"
			var pageLoadsActual = "Actually " + general.PageLoadsActual + ", since only one page view per 10 minute block is counted."
			$('span.here.page-loads').html(pageLoads).attr("title", pageLoadsActual)

			var messagesSent = "sent " + general.Messages + " messages"
			$('span.here.messages-sent').html(messagesSent)

			var color1 = randomColor(general.CustomId, 1)
			$('span.here.color1').html("This").css("color", color1)
			var color2 = randomColor(general.CustomId, 2)
			$('span.here.color2').html("this").css("color", color2)
			var color3 = randomColor(general.CustomId, 3)
			$('span.here.color3').html("this").css("color", color3)

			// Graph
			var dbHourly = response.recordsets[1]
			var hourly = {}
			var dl1 = '<div class="graph-bars">'
			var dl2 = '<div class="graph-labels">'
			// Sort out recordset so it's in hour order
			for (i in dbHourly) {
				var hr = new Date(dbHourly[i].HourOfDay).getHours()
				hourly[hr] = dbHourly[i].ActivityPercent
			}
			// Get max
			var hourlyMax = 0
			for (i in hourly) {
				hourlyMax = (hourly[i] > hourlyMax ? hourly[i] : hourlyMax)
			}
			// Draw graph
			for (i in hourly) {
				var hrString = (12 + i - 1) % 12 + 1
				hrString += "<br/>" + (i < 12 ? "AM" : "PM")
				dl2 += '<div class="graph-label">' + hrString + '</div>'
				var pc = hourly[i] / hourlyMax * 100 + "%"
				dl1 += '<div class="graph-bar-container">'
				dl1 += '<div class="graph-bar" style="height: ' + pc + '"></div>'
				dl1 += '</div>'
			}
			// Gridlines
			var gridmax = 5
			for (var i = 0; i < gridmax; i++) {
				var pc = i / gridmax * 100
				dl1 += '<div class="graph-gridline" style="top: ' + pc + '%"></div>'
			}
			dl1 += '</div>'
			dl2 += '</div>'
			$('#hourly-activity').html(dl1 + dl2)
		}
	})

	// Get achievements
	socket.emit('data request', { request: "rootUserLoadAchievements", params: { permaid: permaid } })
	socket.on('data response', (response) => {
		if (response.input.request === "rootUserLoadAchievements") {
			// Done achievements 
			var done = response.recordsets[0]
			$('#ach-gotten').html("")
			for (i in done) {
				var r = done[i]
				var html = '<div class="ach-container">'
				html += '<a href="/achievement/' + r.URLName + '" class="ach-badge lvl' + r.LevelId + '" title="' + r.Information + '">' + r.AchievementName + '</a>'
				if (r.Amount > 1) {
					html += '<span class="ach-amount">× ' + r.Amount + '</span>'
				}
				html += '</div>'
				$('#ach-gotten').append(html)
			}

			// In-progress
			var working = response.recordsets[1]
			$('#ach-working').html("")
			for (i in working) {
				var r = working[i]
				var percent = r.ExtraJSON.progressCurrent / r.ExtraJSON.progressMax * 100
				var html = '<div class="ach-badge lvl' + r.LevelId + ' working" title="' + r.Information + '">'
				html += '<div class="ach-inner">' + r.AchievementName + ': ' + r.ExtraJSON.progressCurrent + '/' + r.ExtraJSON.progressMax + '</div>'
				html += '<div class="ach-progress" style="width: ' + percent + '%"></div>'
				html += '</div>'
				
				if (r.MinimumPercentage === null || r.ExtraJSON.progressCurrent / r.ExtraJSON.progressMax > r.MinimumPercentage) {
					$('#ach-working').append(html)
				}
			}
		}
	})

	// For updating about me
	$('form.about-me').submit((e) => {
		e.preventDefault()
	})
	$('button.about-me').on("click", (e) => {
		$('button.about-me').hide()
		$('form.about-me').show()
	})
	$('form.about-me button.cancel').on("click", (e) => {
		$('form.about-me').hide()
		$('button.about-me').show()
	})
	$('form.about-me button.submit').on("click", (e) => {
		$('form.about-me > *').prop("disabled", true)
		$('form.about-me button.submit').text("Submitting...")
		var newAboutMe = $('form.about-me textarea').val()
		socket.emit('db procedure request', { procedure: "rootUserChangeAboutme", params: { aboutMe: newAboutMe  } })
	})
	socket.on('db procedure response', (response) => {
		console.log(response)
		if (response.input.procedure === "rootUserChangeAboutme") {
			$('form.about-me > *').prop("disabled", false)
			if (response.err) {
				$('form.about-me button.submit').text("Error, try again")
			} else {
				$('form.about-me').hide()
				var newAboutMe = response.response.recordset[0].AboutMe
				console.log("Setting to " + newAboutMe)
				$('form.about-me button.submit').text("Submit")
				$('button.about-me, form.about-me textarea').show().html(newAboutMe).val(newAboutMe)
			}
		}
	})

})