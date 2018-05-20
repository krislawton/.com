$(document).ready(() => {
	
	// Connect to socket
	const socket = io()

	// Globals
	var gPlayers = {}

	// Randomize players click
	$('#random-players').on("click", (e) => {
		var rPlayers = [ 
			"1337PArTygAmE", "XxpresidentdropshotwizardxX", "smoothskinfps", "*_scrutinisation_*",
			"innandosbr", "Pwnd Farming", "Lul", "Seld",
			"Nothuiril", "Deathling", "Magdaer", "XxXSensorimuscular_91XxX",
			".:-BardAl-:.", "Fotle", "Ginni", "DoubleStargal"
		]
		for (var i = 1; i <= 6; i++) {
			var rand = Math.floor(Math.random() * rPlayers.length)
			var p = rPlayers[rand]
			$('#name' + i).val(p)
			rPlayers.splice(rand, 1)
		}
	})

	// Get players on click
	$('#get-players').on("click", (e) => {
		playersToGet = 6
		playerGetError = ""
		gPlayers = {}
		for (var i = 1; i <= 6; i++) {
			var pid = $('#name' + i)
			var pname = $('#name' + i).val()
			socket.emit('data request', { request: "mcmPlayerInfoForSim", params: { playerName: pname, playerId: null, team: i <= 3 ? 1 : 2 } })
		}
	})

	// Wait for all player info responses
	var playersToGet
	var playerGetError = ""
	socket.on('data response', (response) => {
		if (response.input.request === "mcmPlayerInfoForSim") {

			playersToGet--

			if (response.err) {
				playerGetError = response.err
			} else {
				var r = response.recordset.recordset[0]
				gPlayers[r.PlayerId] = {
					team: response.params.team,
					skill: r.NaturalSkill,
					experience: r.dExperience
				}
			}

			if (playersToGet <= 0) {
				allPlayersGotten()
			}
		}
	})

	var defaultWeights = {
		exceptional	: { weight:  3, strengthMin:  0.25, strengthMax: 1.00 },
		good		: { weight: 15, strengthMin:  0.10, strengthMax: 0.25 },
		normal		: { weight: 40, strengthMin:  0.00, strengthMax: 0.10 },
		poor		: { weight:  7, strengthMin: -0.10, strengthMax: 0.00 },
		bad			: { weight:  1, strengthMin: -0.20, strengthMax:-0.10 },
		whiff		: { weight:  2, strengthMin: -1.00, strengthMax:-0.20 }
	}

	function allPlayersGotten() {
		if (playerGetError) {
			$('#error').html(playerGetError)
		} else {
			$('#error').html("")
		}

		// Calculate player ball hit weights
		for (i in gPlayers) {
			gPlayers[i].weights = {}
			// Compare to all players
			for (i2 in gPlayers) {
				// ... except one's self
				if (i !== i2) {

					// Abbreviate
					var dw = defaultWeights

					var me = gPlayers[i]
					var opp = gPlayers[i2]

					var exceptional = dw.exceptional.weight
					exceptional += me.skill > 0.5 ? (me.skill - 0.5) * 2 * 7 : 0
					exceptional += me.experience - opp.experience > 0 ? (me.experience - opp.experience) * 0.2 : 0
					exceptional += me.experience - opp.experience > 50 ? (me.experience - opp.experience - 50) * 0.275 : 0
					exceptional += me.experience - opp.experience > 250 ? (me.experience - opp.experience - 250) * 0.3 : 0

					var good = dw.good.weight
					good += me.skill > 0.5 ? (me.skill - 0.5) * 2 * 20 : 0
					good += me.experience - opp.experience > 0 ? (me.experience - opp.experience) * 0.6 : 0
					good += me.experience - opp.experience > 50 ? (me.experience - opp.experience - 50) * 0.450 : 0
					good += me.experience - opp.experience > 250 ? (me.experience - opp.experience - 250) * 0.4 : 0

					var normal = dw.normal.weight
					normal += me.skill > 0.5 ? (me.skill - 0.5) * 2 * 20 : 0
					normal += me.experience - opp.experience > 0 ? (me.experience - opp.experience) * 0.6 : 0

					var poor = dw.poor.weight
					poor += me.skill <= 0.5 ? (me.skill * -2 + 1) * 10 : 0
					var bad = dw.bad.weight
					bad += me.skill <= 0.5 ? (me.skill * -2 + 1) * 5 : 0
					var whiff = dw.whiff.weight
					whiff += me.skill <= 0.5 ? (me.skill * -2 + 1) * 2.5 : 0

					gPlayers[i].weights[i2] = {
						exceptional: Math.round(exceptional),
						good: Math.round(good),
						normal: Math.round(normal),
						poor: Math.round(poor),
						bad: Math.round(bad),
						whiff: Math.round(whiff)
					}

				}
			}
		}
		simulate()

	}

	function randomPlayer() {
		var p = []
		for (i in gPlayers) {
			p.push(i)
		}
		var pindex = Math.floor(Math.random() * p.length)
		return p[pindex]
	}

	// Random hit type for default weightings
	function hitTypeDefault() {
		var total = 0
		for (i in defaultWeights) {
			total += defaultWeights[i].weight
		}
		var randomWeight = Math.random() * total
		var selected = null
		var checkLower = 0
		for (i in defaultWeights) {
			var checkHigher = checkLower + defaultWeights[i].weight
			if (randomWeight > checkLower && randomWeight <= checkHigher) {
				selected = i
			}
			checkLower = checkHigher
		}
		return selected
	}
	// Random hit type for p1 after p2 hit the ball
	function hitTypeComparison(p1, p2) {
		var total = 0
		var weights = gPlayers[p1].weights[p2]
		for (i in weights) {
			total += weights[i]
		}
		var randomWeight = Math.random() * total
		var selected = null
		var checkLower = 0
		for (i in weights) {
			var checkHigher = checkLower + weights[i]
			if (randomWeight > checkLower && randomWeight <= checkHigher) {
				selected = i
			}
			checkLower = checkHigher
		}
		return selected
	}
	// Get random hit strength from type
	function randomStrength(hitType) {
		var min = defaultWeights[hitType].strengthMin
		var max = defaultWeights[hitType].strengthMax
		var result = min + Math.random() * (max - min)
		return result
	}

	function simulate() {

		// Global modifier, so that games vary a little
		var pace = 0.5 + Math.random()
		var power = 0.5 + Math.random()

		// Time tracking
		var timeLimit = 300
		var timeNow = 0
		var tied = true
		var isKickoff = true

		// Ball!
		var ballLocation = 0
		// Who hit it last?
		var prevHit = null
		var prevHitDifferent = null

		// Object of touches
		var touches = []
		// Object of goals
		var goals = { team1: 0, team2: 0 }

		// The actual sim
		while (timeNow < timeLimit || tied) {

			// Get random player
			var whomst = randomPlayer()
			// Initalize other variables
			var hitType = null
			var strength = 0

			// Get non-self prev hitter
			prevHitDifferent = prevHit !== null && prevHit !== whomst ? prevHit : prevHitDifferent

			// If it's a kickoff or there is no previous hitter, get strength of hit from default weights
			if (isKickoff || prevHitDifferent === null) {
				hitType = hitTypeDefault()
			} else {
				// Otherwise, get weight based on who hit it last
				hitType = hitTypeComparison(whomst, prevHitDifferent)
			}
			isKickoff = false
			strength = randomStrength(hitType) * power

			// Alter ball location based on hit
			var direction = gPlayers[whomst].team === 1 ? 1 : -1
			ballLocation = ballLocation + strength * direction

			// Create touch entry and push
			var touch = {
				time: timeNow,
				playerId: whomst,
				hitType: hitType,
				strength: strength,
				ballNow: ballLocation
			}
			touches.push(touch)

			// Prev hitters, keeps track of whomst hit it last
			prevHit = whomst

			// Consider whether it's a goal
			if (ballLocation < -1 || ballLocation > 1) {

				if (ballLocation < -1) {
					goals.team2++
				} else {
					goals.team1++
				}

				ballLocation = 0

				timeNow += 2 + Math.random() * 0.3
				isKickoff = true
				prevHit = null
				prevHitDifferent = null

				tied = goals.team1 === goals.team2

			} else {
				// Add 2-7 seconds to time for next ball touch.
				timeNow += (2 + Math.random() * 5) + pace
			}
		}

		//console.log(touches)
		console.log(goals)

	}

})