$(document).ready(() => {

	// Get username
	const username = $('#username').attr('data-username')

	// Connect to socket
	const socket = io()

	// Get achievements
	socket.emit('data request', { request: "rootUserLoadAchievements", params: { username: username } })

	socket.on('data response', (response) => {
		console.log(response)
		if (response.input.request === "rootUserLoadAchievements") {
			// Done achievements 
			var done = response.recordsets[0]
			$('#ach-gotten').html("")
			for (i in done) {
				var r = done[i]
				var html = '<div class="ach-container">'
				html += '<div class="ach-badge lvl' + r.LevelId + '" title="' + r.Information + '">' + r.AchievementName + '</div>'
				if (r.Amount > 1) {
					html += '<span style="ach-amount">× ' + r.Amount + '</span>'
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
				$('#ach-working').append(html)
			}
		}
	})

})