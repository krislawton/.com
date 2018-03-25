// SQL connection
const seecret = require("./seecret.js")
const sql = require('mssql/msnodesqlv8')
const dbconfig = {
	user: seecret.dbUser,
	password: seecret.dbPassword,
	server: seecret.dbServer,
	database: 'Website',
	options: {
		charset: 'Latin1_General_CI_AS'
	},
	requestTimeout: 30000
}
const pool = new sql.ConnectionPool(dbconfig, err => {
	if (err) {
		console.log("Database error: " + err["name"])
		console.log(err)
	} else {
		console.log("Achievements db connection test successful")
	}
})

// Get achievements from db
var achs = {}
pool.request()
	.query("select * from Achievements", (err, result) => {
		if (!err) {
			for (i in result.recordset) {
				var r = result.recordset[i]
				achs[r.AchievementId] = {
					url: r.URLName,
					name: r.AchievementName,
					level: r.LevelId,
					info: r.Information,
					info2: r.Information2
				}
			}
		}
	})

// Key is the process the user just performed, value is an array of achievements to check
var checklookup = {
	serverPageLoadAudit: [1000, 1020, 1021, 1022, 1023, 1030, 1031, 1032],
	chatSend: [2000, 2001, 2002, 2003, 2010, 2011, 2012, 2060, 2061, 2062, 2070, 2080, 2180, 2190, 2191],
	chatStarMessage: [2170, 2171, 2172]
}

// Achievement checker: Checks if achievements need updating
var acheck = {
	//1000	welcome
	1000: (input, callback) => {
		var achid = 1000

		// check if they have it
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query("select 1 from AccountAchievements where AccountPermaId = @AccountPermaId and AchievementId = " + achid + " and AwardedDate is not null", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					checkAndInsert(result)
				}
			})

		function checkAndInsert(result1) {
			if (result1.recordset.length === 0) {
				pool.request()
					.input("AccountPermaId", sql.VarChar, input.permaid)
					.query("insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate) values (@AccountPermaId, " + achid + ", getdate())", (err, result) => {
						callback(err, result, achid)
					})
			} else {
				callback(null, null, achid)
			}
		}
	},
	//1010	autobio - 1
	//1011	autobio - 2
	//1020	lurker - 1
	1020: (input, callback) => {
		var achid = 1020
		var max = 25
		var rn = (new Date).toISOString()

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastVisit: null }
			extraj.lastVisit = rn
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, 1020, @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			var rj = JSON.parse(r.ExtraJSON)
			// Only if the day is different
			if (rn.slice(0, 10) !== (rj.lastVisit).slice(0, 10)) {
				rj.lastVisit = rn
				rj.progressCurrent++
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result, achid)
					})
			} else {
				callback(null, null, achid)
			}
		}
	},
	//1021	lurker - 2
	1021: (input, callback) => {
		var achid = 1021
		var max = 60
		var rn = (new Date).toISOString()

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastVisit: null }
			extraj.lastVisit = rn
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, " + achid + ", @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			var rj = JSON.parse(r.ExtraJSON)
			// Only if the day is different
			if (rn.slice(0, 10) !== (rj.lastVisit).slice(0, 10)) {
				rj.lastVisit = rn
				rj.progressCurrent++
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result, achid)
					})
			} else {
				callback(null, null, achid)
			}
		}
	},
	//1022	lurker - 3
	1022: (input, callback) => {
		var achid = 1022
		var max = 120
		var rn = (new Date).toISOString()

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastVisit: null }
			extraj.lastVisit = rn
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, " + achid + ", @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			var rj = JSON.parse(r.ExtraJSON)
			// Only if the day is different
			if (rn.slice(0, 10) !== (rj.lastVisit).slice(0, 10)) {
				rj.lastVisit = rn
				rj.progressCurrent++
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result, achid)
					})
			} else {
				callback(null, null, achid)
			}
		}
	},
	//1023	lurker - 4
	1023: (input, callback) => {
		var achid = 1023
		var max = 365
		var rn = (new Date).toISOString()

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastVisit: null }
			extraj.lastVisit = rn
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, 1023, @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			var rj = JSON.parse(r.ExtraJSON)
			// Only if the day is different
			if (rn.slice(0, 10) !== (rj.lastVisit).slice(0, 10)) {
				rj.lastVisit = rn
				rj.progressCurrent++
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result, achid)
					})
			} else {
				callback(null, null, achid)
			}
		}
	},
	//1030	addict - 1
	1030: (input, callback) => {
		var achid = 1030
		var max = 10
		var rn = new Date

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastVisit: null }
			extraj.lastVisit = rn.toISOString()
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, " + achid + ", @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			// Get difference between last visit and current visit
			var rj = JSON.parse(r.ExtraJSON)
			var lastvisit = new Date(rj.lastVisit)
			var current = new Date(rn)
			lastvisit.setHours(0, 0, 0, 0)
			current.setHours(0, 0, 0, 0)
			var diff = Math.floor(Math.abs(current - lastvisit) / 864e5)

			if (diff === 1) {
				rj.lastVisit = rn
				rj.progressCurrent++
				var progress = rj.progressCurrent
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (progress >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result, achid)
					})
			} else if (diff === 0) {
				callback(null, null, achid)
			} else { // if diff > 1
				pool.request()
					.input("AccAchieveId", sql.VarChar, r.AccAchieveId)
					.query("delete top (1) from AccountAchievements where AccAchieveId = @AccAchieveId", (err, result) => {
						callback(err, result, achid)
					})
			}
		}
	},
	//1031	addict - 2
	1031: (input, callback) => {
		var achid = 1031
		var max = 30
		var rn = new Date

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastVisit: null }
			extraj.lastVisit = rn.toISOString()
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, " + achid + ", @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			// Get difference between last visit and current visit
			var rj = JSON.parse(r.ExtraJSON)
			var lastvisit = new Date(rj.lastVisit)
			var current = new Date(rn)
			lastvisit.setHours(0, 0, 0, 0)
			current.setHours(0, 0, 0, 0)
			var diff = Math.floor(Math.abs(current - lastvisit) / 864e5)

			if (diff === 1) {
				rj.lastVisit = rn
				rj.progressCurrent++
				var progress = rj.progressCurrent
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (progress >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result, achid)
					})
			} else if (diff === 0) {
				callback(null, null, achid)
			} else { // if diff > 1
				pool.request()
					.input("AccAchieveId", sql.VarChar, r.AccAchieveId)
					.query("delete top (1) from AccountAchievements where AccAchieveId = @AccAchieveId", (err, result) => {
						callback(err, result, achid)
					})
			}
		}
	},
	//1032	addict - 3
	1032: (input, callback) => {
		var achid = 1032
		var max = 100
		var rn = new Date

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastVisit: null }
			extraj.lastVisit = rn.toISOString()
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, " + achid + ", @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			// Get difference between last visit and current visit
			var rj = JSON.parse(r.ExtraJSON)
			var lastvisit = new Date(rj.lastVisit)
			var current = new Date(rn)
			lastvisit.setHours(0, 0, 0, 0)
			current.setHours(0, 0, 0, 0)
			var diff = Math.floor(Math.abs(current - lastvisit) / 864e5)

			if (diff === 1) {
				rj.lastVisit = rn
				rj.progressCurrent++
				var progress = rj.progressCurrent
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (progress >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result, achid)
					})
			} else if (diff === 0) {
				callback(null, null, achid)
			} else { // if diff > 1
				pool.request()
					.input("AccAchieveId", sql.VarChar, r.AccAchieveId)
					.query("delete top (1) from AccountAchievements where AccAchieveId = @AccAchieveId", (err, result) => {
						callback(err, result, achid)
					})
			}
		}
	},
	//1040	stop - changing - 1
	//1041	stop - changing - 2
	//1042	stop - changing - 3
	//2000	chatter - 1
	2000: (input, callback) => {
		var achid = 2000
		var max = 100
		var rn = (new Date).toISOString()

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastMessage: null }
			extraj.lastMessage = rn
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, " + achid + ", @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			var rj = JSON.parse(r.ExtraJSON)
			// Only if the 10 minute window is different
			if (rn.slice(0, 16) !== (rj.lastMessage).slice(0, 16)) {
				rj.lastMessage = rn
				rj.progressCurrent++
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result, achid)
					})
			} else {
				callback(null, null, achid)
			}
		}
	},
	//2001	chatter - 2
	2001: (input, callback) => {
		var achid = 2001
		var max = 500
		var rn = (new Date).toISOString()

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastMessage: null }
			extraj.lastMessage = rn
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, " + achid + ", @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			var rj = JSON.parse(r.ExtraJSON)
			// Only if the 10 minute window is different
			if (rn.slice(0, 16) !== (rj.lastMessage).slice(0, 16)) {
				rj.lastMessage = rn
				rj.progressCurrent++
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result, achid)
					})
			} else {
				callback(null, null, achid)
			}
		}
	},
	//2002	chatter - 3
	2002: (input, callback) => {
		var achid = 2002
		var max = 2000
		var rn = (new Date).toISOString()

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastMessage: null }
			extraj.lastMessage = rn
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, " + achid  + ", @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			var rj = JSON.parse(r.ExtraJSON)
			// Only if the 10 minute window is different
			if (rn.slice(0, 16) !== (rj.lastMessage).slice(0, 16)) {
				rj.lastMessage = rn
				rj.progressCurrent++
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result,achid)
					})
			} else {
				callback(null, null, achid)
			}
		}
	},
	//2003	chatter - 4
	2003: (input, callback) => {
		var max = 3000
		var achid = 2003
		var rn = (new Date).toISOString()

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON, "
		query += "(select count(distinct datediff(minute, 0, SentDate) / 10) from ChatMessages "
		query += "where SenderAccountId = @AccountPermaId and dateadd(month, -3, getdate()) < SentDate) as AmountSent "
		query += "from AccountAchievements "
		query += "where AchievementId = " + achid + " and AwardedDate is null and "
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerProgress(result)
				}
			})

		function considerProgress(prevresult) {
			if (prevresult.recordset.length === 0) {
				// No existing progress, so create one
				createNew()
			} else {
				// Is existing progress, so update it
				updateExisting(prevresult.recordset[0])
			}
		}
		function createNew() {
			// Get JSON object for extra
			var extraj = { progressMax: max, progressCurrent: 0, lastMessage: null }
			extraj.lastMessage = rn
			extraj.progressCurrent = 1
			var extraj = JSON.stringify(extraj)
			// Update DB
			var query = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			query += " values (@AccountPermaId, " + achid + ", @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("ExtraJSON", sql.VarChar, extraj)
				.query(query, (err, result) => {
					callback(err, result, achid)
				})
		}
		function updateExisting(r) {
			var rj = JSON.parse(r.ExtraJSON)
			// Only if the 10 minute window is different
			if (rn.slice(0, 16) !== (rj.lastMessage).slice(0, 16)) {
				rj.lastMessage = rn
				rj.progressCurrent = r.AmountSent
				rj = JSON.stringify(rj)
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				pool.request()
					.input("ExtraJSON", sql.VarChar, rj)
					.input("AccAchieveId", sql.Int, r.AccAchieveId)
					.query(query, (err, result) => {
						callback(err, result, achid)
					})
			} else {
				callback(null, null, achid)
			}
		}
	},
	//2010	attention - 1
	//2011	attention - 2
	//2012	attention - 3
	//2020	creator - 1
	//2021	creator - 2
	//2022	creator - 3
	//2030	consumer - 1
	//2031	consumer - 2
	//2032	consumer - 3
	//2040	populist - 1
	//2041	populist - 2
	//2050	emancipated - 1
	//2051	emancipated - 2
	//2060	inspirer - 1
	//2061	inspirer - 2
	//2062	inspirer - 3
	//2070	all - day - all - night
	//2080	chevblocked
	//2090	janitor - 1
	//2091	janitor - 2
	//2100	overtalker - 1
	//2101	overtalker - 2
	//2102	overtalker - 3
	//2110	vandalist
	//2120	naughty - 1
	//2121	naughty - 2
	//2122	naughty - 3
	//2130	cheer
	//2140	old - cheer - 1
	//2141	old - cheer - 2
	//2150	vox - populi
	//2160	curator - 1
	//2161	curator - 2
	//2162	curator - 3
	//2170	rising - star
	2170: (input, callback) => {
		var achid = 2170

		var queryget = "select top(1) MessageId "
		queryget += "from ChatStars "
		queryget += "where AccountPermaId = @AccountPermaId "
		queryget += "order by StarDate"
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(queryget, (err, result) => {
				if (err || result.recordset.length === 0) {
					callback(err, null, achid)
				} else {
					insert(result.recordset[0].MessageId)
				}
			})

		function insert(messageId) {
			var ej = { messageId: messageId }
			ej = JSON.stringify(ej)
			var queryins = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate, ExtraJSON) "
			queryins += "select @AccountPermaId, @AchievementId, getdate(), @ExtraJSON "
			queryins += "from Achievements "
			queryins += "where AchievementId = @AchievementId and "
			queryins += "(select count(1) from AccountAchievements where AccountPermaId = @AccountPermaId and AwardedDate is not null and AchievementId = @AchievementId) = 0"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(queryins, (err, result) => {
					callback(err, result, achid)
				})
		}
	},
	//2171	secret - admirer
	tobe2171: (input, callback) => {
		/*		
		declare @AccountPermaId int = 1

		select
			a.AccountPermaId
			, count(iif(Included = 1, 1, null)) as Amount
		from (
			select
				s.AccountPermaId
				, iif(s.StarDate < dateadd(hour, 1, lag(s.StarDate, 1, 0) over (partition by s.AccountPermaId order by s.StarDate)), 0, 1) as Included
			from (
				select
					*, row_number() over (partition by AccountPermaId, MessageId order by StarDate desc) as rn
				from ChatStars
			) s
				inner join ChatMessages m
				on s.MessageId = m.MessageId
			where
				s.rn = 1
				and m.SenderAccountId = @AccountPermaId
				and s.AccountPermaId != @AccountPermaId
		) a
		group by a.AccountPermaId
	
		*/
	},
	//2172	secret - following
	2172: (input, callback) => {
		var achid = 2172
		var targetPermaId = null
		var max = 50
		var amountStarred = 0

		// BIG QUERY! Based on message ID, gets
		// the sender of that message and gets the
		// total number of stars that all of that
		// user's messages have received
		var query = ""
		query += " select a.SenderAccountId, count(iif(Included = 1, 1, null)) as Amount from ("
		query += "    select"
		query += "        s.AccountPermaId, m.SenderAccountId,"
		query += "        iif(s.StarDate < dateadd(hour, 1, lag(s.StarDate, 1, 0) over (partition by s.AccountPermaId order by s.StarDate)), 0, 1) as Included"
		query += "    from ChatMessages m"
		query += "        inner join ChatMessages acc"
		query += "        on m.SenderAccountId = acc.SenderAccountId"
		query += "        left join("
		query += "            select *, row_number() over (partition by AccountPermaId, MessageId order by StarDate desc) as rn"
		query += "            from ChatStars"
		query += "        ) s"
		query += "        on acc.MessageId = s.MessageId"
		query += "    where s.rn = 1 and m.MessageId = @MessageId and s.AccountPermaId != m.SenderAccountId"
		query += " ) a"
		query += " group by a.SenderAccountId"
		pool.request()
			.input("MessageId", sql.Int, input.params.messageid)
			.query(query, (err, result) => {
				if (err) {
					callback(err, result, achid)
				} else {
					processSelect(result.recordset[0])
				}
			})

		function processSelect(result) {
			targetPermaId = result.SenderAccountId
			amountStarred = result.Amount
			if (amountStarred  >= max) {
				getAchsCount()
			} else {
				callback(null, null, achid)
			}
		}

		function getAchsCount() {
			var queryachs = "select count(1) as Amount from AccountAchievements where "
			queryachs += "AccountPermaId = @AccountPermaId"
			queryachs += " and AchievementId = @AchievementId"
			queryachs += " and AwardedDate is not null"
			pool.request()
				.input("AccountPermaId", sql.Int, targetPermaId)
				.input("AchievementId", sql.Int, achid)
				.query(queryachs, (err, result) => {
					if (err) {
						callback(err, result, achid)
					} else {
						considerInsert(result.recordset[0].Amount)
					}
				})
		}

		function considerInsert(awardedAlready) {
			if (Math.floor(amountStarred / max) > awardedAlready) {
				var queryins = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate)"
				queryins += "select @AccountPermaId, @AchievementId, getdate()"
				pool.request()
					.input("AccountPermaId", sql.Int, targetPermaId)
					.input("AchievementId", sql.Int, achid)
					.query(queryins, (err, result) => {
						callback(err, result, achid)
					})
			} else {
				callback(null, null, achid)
			}
		}

	},
	//2180	early - squad
	//2190	welcome - back
	//2191	from - the - dead
	//2200	desecrator
	//3000	mvp - weekly
	//3001	mvp - monthly
	//3002	mvp - yearly
}

// Function for running on other pages. Input should be the operation the user just performed
module.exports = {
	updateAchievements: (input) => {
		//console.log("updateAchievements with input")
		//console.log(input)
		if (typeof input.userData.permaid !== "undefined" && typeof checklookup[input.justdone] !== "undefined") {
			var todo = checklookup[input.justdone].slice()
			var forcheck = {
				permaid: input.userData.permaid,
				params: (typeof input.params === "object" ? input.params : null)
			}
			//console.log("satisfies conditions for checks: permaid is " + forcheck.permaid + ", todo is")
			//console.log(todo)
			// First go through and remove actions that don't exist yet (reverse order because arrays)
			for (var ti = todo.length - 1; ti >= 0; ti--) {
				if (typeof acheck[todo[ti]] !== "function") {
					//console.log("removing " + todo[ti])
					achievementCheckDone(todo[ti])
				}
			}
			// Then do the remaining ones that are doable
			//console.log("removals complete, left with")
			//console.log(todo)
			for (ti in todo) {
				var achid = todo[ti]
				console.log("doing " + achid)
				acheck[achid](forcheck, (err, result, doneAchievementId) => {
					if (err) {
						console.log(err)
					}
					achievementCheckDone(doneAchievementId)
				})
			}

			function achievementCheckDone(achievementId) {
				//console.log("------------------")
				//console.log("s1: looking for " + achievementId)
				var toRemove = todo.indexOf(achievementId)
				//console.log("s2: indexOf is " + toRemove)
				//console.log("s3: todo before is")
				//console.log(todo)
				if (toRemove !== -1) {
					todo.splice(toRemove, 1)
				}
				//console.log("s4: todo after is")
				//console.log(todo)
				//console.log("------------------")
			}

		}
	}
}