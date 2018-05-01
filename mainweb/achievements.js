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
	chatStarMessage: [2170, 2171, 2172],
	reactSend: [2020, 2021, 2022, 2030, 2031, 2032, 2120, 2121, 2122, 2150],
	rootUserChangeUserId: [1040, 1041, 1042],
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
					.query("insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate) values (@AccountPermaId, " + achid + ", getutcdate())", (err, result) => {
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
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				rj = JSON.stringify(rj)
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
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				rj = JSON.stringify(rj)
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
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				rj = JSON.stringify(rj)
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
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				rj = JSON.stringify(rj)
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
				query += (progress >= max ? ", AwardedDate = getutcdate()" : "")
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
				query += (progress >= max ? ", AwardedDate = getutcdate()" : "")
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
				query += (progress >= max ? ", AwardedDate = getutcdate()" : "")
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
	1040: (input, callback) => {
		var achid = 1040
		var max = 3

		var gq = "select * from AccountAchievements"
		gq += " where AccountPermaId = @AccountPermaId"
		gq += "		and AchievementId = @AchievementId"
		gq += "		and getutcdate() between json_value(ExtraJSON, '$.periodStart') and json_value(ExtraJSON, '$.periodEnd')"
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.input("AchievementId", sql.Int, achid)
			.query(gq, (err, result) => {
				if (err) {
					callback(err, result, achid)
				} else {
					processResult(result.recordset)
				}
			})

		function processResult(rs) {
			if (rs.length === 0) {
				createNew()
			} else {
				var found = false
				for (i in rs) {
					if (rs[i].AwardedDate === null && !found) {
						found = true
						updateExisting(rs[i])
					}
				}
				if (!found) {
					callback(null, null, achid)
				}
			}
		}

		function createNew() {
			var cr = `declare @ExtraJSON nvarchar(max) = concat(
				'{"progressCurrent": 1, "progressMax": ', @Max, ','
				, ' "periodStart": "', convert(varchar(24), dateadd(month, datediff(month, 0, getutcdate()), 0), 127), '.000Z",'
				, ' "periodEnd": "', convert(varchar(24), dateadd(month, 1 + datediff(month, 0, getutcdate()), 0), 127), '.000Z"}'
			);`
			cr += " insert into AccountAchievements(AccountPermaId, AchievementId, ExtraJSON)"
			cr += " values (@AccountPermaId, @AchievementId, @ExtraJSON)"

			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("AchievementId", sql.Int, achid)
				.input("Max", sql.Int, max)
				.query(cr, (err, result) => {
					callback(err, result, achid)
				})
		}

		function updateExisting(record) {
			var ej = JSON.parse(record.ExtraJSON)
			ej.progressCurrent++

			var uq = "update aa set"
			uq += " ExtraJSON = @ExtraJSON"
			uq += ej.progressCurrent >= ej.progressMax ? ", AwardedDate = getutcdate()" : ""
			uq += " from AccountAchievements aa"
			uq += " where AccAchieveId = @AccAchieveId"

			ej = JSON.stringify(ej)

			pool.request()
				.input("AccAchieveId", sql.Int, record.AccAchieveId)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(uq, (err, result) => {
					callback(err, result, achid)
				})
		}

	},
	//1041	stop - changing - 2
	1041: (input, callback) => {
		var achid = 1041
		var max = 5

		var gq = "select * from AccountAchievements"
		gq += " where AccountPermaId = @AccountPermaId"
		gq += "		and AchievementId = @AchievementId"
		gq += "		and getutcdate() between json_value(ExtraJSON, '$.periodStart') and json_value(ExtraJSON, '$.periodEnd')"
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.input("AchievementId", sql.Int, achid)
			.query(gq, (err, result) => {
				if (err) {
					callback(err, result, achid)
				} else {
					processResult(result.recordset)
				}
			})

		function processResult(rs) {
			if (rs.length === 0) {
				createNew()
			} else {
				var found = false
				for (i in rs) {
					if (rs[i].AwardedDate === null && !found) {
						found = true
						updateExisting(rs[i])
					}
				}
				if (!found) {
					callback(null, null, achid)
				}
			}
		}

		function createNew() {
			var cr = `declare @ExtraJSON nvarchar(max) = concat(
				'{"progressCurrent": 1, "progressMax": ', @Max, ','
				, ' "periodStart": "', convert(varchar(24), dateadd(month, datediff(month, 0, getutcdate()), 0), 127), '.000Z",'
				, ' "periodEnd": "', convert(varchar(24), dateadd(month, 1 + datediff(month, 0, getutcdate()), 0), 127), '.000Z"}'
			);`
			cr += " insert into AccountAchievements(AccountPermaId, AchievementId, ExtraJSON)"
			cr += " values (@AccountPermaId, @AchievementId, @ExtraJSON)"

			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("AchievementId", sql.Int, achid)
				.input("Max", sql.Int, max)
				.query(cr, (err, result) => {
					callback(err, result, achid)
				})
		}

		function updateExisting(record) {
			var ej = JSON.parse(record.ExtraJSON)
			ej.progressCurrent++

			var uq = "update aa set"
			uq += " ExtraJSON = @ExtraJSON"
			uq += ej.progressCurrent >= ej.progressMax ? ", AwardedDate = getutcdate()" : ""
			uq += " from AccountAchievements aa"
			uq += " where AccAchieveId = @AccAchieveId"

			ej = JSON.stringify(ej)

			pool.request()
				.input("AccAchieveId", sql.Int, record.AccAchieveId)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(uq, (err, result) => {
					callback(err, result, achid)
				})
		}

	},
	//1042	stop - changing - 3
	1042: (input, callback) => {
		var achid = 1042
		var max = 10

		var gq = "select * from AccountAchievements"
		gq += " where AccountPermaId = @AccountPermaId"
		gq += "		and AchievementId = @AchievementId"
		gq += "		and getutcdate() between json_value(ExtraJSON, '$.periodStart') and json_value(ExtraJSON, '$.periodEnd')"
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.input("AchievementId", sql.Int, achid)
			.query(gq, (err, result) => {
				if (err) {
					callback(err, result, achid)
				} else {
					processResult(result.recordset)
				}
			})

		function processResult(rs) {
			if (rs.length === 0) {
				createNew()
			} else {
				var found = false
				for (i in rs) {
					if (rs[i].AwardedDate === null && !found) {
						found = true
						updateExisting(rs[i])
					}
				}
				if (!found) {
					callback(null, null, achid)
				}
			}
		}

		function createNew() {
			var cr = `declare @ExtraJSON nvarchar(max) = concat(
				'{"progressCurrent": 1, "progressMax": ', @Max, ','
				, ' "periodStart": "', convert(varchar(24), dateadd(month, datediff(month, 0, getutcdate()), 0), 127), '.000Z",'
				, ' "periodEnd": "', convert(varchar(24), dateadd(month, 1 + datediff(month, 0, getutcdate()), 0), 127), '.000Z"}'
			);`
			cr += " insert into AccountAchievements(AccountPermaId, AchievementId, ExtraJSON)"
			cr += " values (@AccountPermaId, @AchievementId, @ExtraJSON)"

			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("AchievementId", sql.Int, achid)
				.input("Max", sql.Int, max)
				.query(cr, (err, result) => {
					callback(err, result, achid)
				})
		}

		function updateExisting(record) {
			var ej = JSON.parse(record.ExtraJSON)
			ej.progressCurrent++

			var uq = "update aa set"
			uq += " ExtraJSON = @ExtraJSON"
			uq += ej.progressCurrent >= ej.progressMax ? ", AwardedDate = getutcdate()" : ""
			uq += " from AccountAchievements aa"
			uq += " where AccAchieveId = @AccAchieveId"

			ej = JSON.stringify(ej)

			pool.request()
				.input("AccAchieveId", sql.Int, record.AccAchieveId)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(uq, (err, result) => {
					callback(err, result, achid)
				})
		}

	},
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
			extraj = JSON.stringify(extraj)
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
			if (rn.slice(0, 15) !== (rj.lastMessage).slice(0, 15)) {
				rj.lastMessage = rn
				rj.progressCurrent++
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				rj = JSON.stringify(rj)
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
			extraj = JSON.stringify(extraj)
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
			if (rn.slice(0, 15) !== (rj.lastMessage).slice(0, 15)) {
				rj.lastMessage = rn
				rj.progressCurrent++
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				rj = JSON.stringify(rj)
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
			extraj = JSON.stringify(extraj)
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
			if (rn.slice(0, 15) !== (rj.lastMessage).slice(0, 15)) {
				rj.lastMessage = rn
				rj.progressCurrent++
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				rj = JSON.stringify(rj)
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
		query += "where SenderAccountId = @AccountPermaId and dateadd(month, -3, getutcdate()) < SentDate) as AmountSent "
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
			extraj = JSON.stringify(extraj)
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
			if (rn.slice(0, 15) !== (rj.lastMessage).slice(0, 15)) {
				rj.lastMessage = rn
				rj.progressCurrent = r.AmountSent
				var query = "update aa"
				query += " set ExtraJSON = @ExtraJSON"
				query += (rj.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
				query += " from AccountAchievements aa"
				query += " where AccAchieveId = @AccAchieveId"
				rj = JSON.stringify(rj)
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
	2020: (input, callback) => {
		var achid = 2020
		var max = 2

		var messageId = input.params.messageId
		var targetPermaId = null
		var reactValue = 0
		var achs = []
		var wipIndex = null

		// Get reaction count of this message
		var rquery = "select sum(ReactValue) as ReactValue, max(SenderAccountId) as AccountPermaId"
		rquery += " from ("
		rquery += "		select m.SenderAccountId,"
		rquery += "			case Reaction when 'positive' then 2 when 'negative' then 0 else 1 end as ReactValue"
		rquery += "		from ChatReactions r"
		rquery += " 		inner join ChatMessages m"
		rquery += "			on r.MessageId = m.MessageId"
		rquery += "		where r.MessageId = @MessageId and r.UnreactionDate is null"
		rquery += "			and r.AccountPermaId != m.SenderAccountId"
		rquery += " ) a"
		pool.request()
			.input("MessageId", sql.Int, messageId)
			.query(rquery, (err, result) => {
				if (err) {
					callback(err, result, achid)
					return
				}

				targetPermaId = result.recordset[0].AccountPermaId
				reactValue = result.recordset[0].ReactValue

				if (reactValue >= 5) {
					getAllAchievements()
				} else {
					callback(null, null, achid)
				}
			})

		// Get all achievements to find ones related to that message
		function getAllAchievements() {
			var allquery = "select AccAchieveId, ExtraJSON, iif(AwardedDate is null, 0, 1) as Awarded"
			allquery += " from AccountAchievements"
			allquery += " where AccountPermaId = @AccountPermaId and AchievementId = @AchievementId"
			pool.request()
				.input("AchievementId", sql.Int, achid)
				.input("AccountPermaId", sql.Int, targetPermaId)
				.query(allquery, (err, result) => {
					if (err) {
						callback(err, result, achid)
						return
					}
					achs = result.recordset
					lookForMessage()
				})
		}

		// Find out whether message already has an achievement
		function lookForMessage() {
			var found = false
			for (i in achs) {
				var ej = JSON.parse(achs[i].ExtraJSON)
				var mids = ej.messageIds
				for (mi in mids) {
					found = (mids[mi] === messageId ? true : found)
				}
			}
			if (!found) {
				messageIsWorthy()
			} else {
				callback(null, null, achid)
			}
		}

		// It doesn't have an achievement but is worthy of one - update or insert?
		function messageIsWorthy() {
			// Look for an in-progress achievement
			for (i in achs) {
				wipIndex = (achs[i].Awarded === 0 ? i : wipIndex)
			}
			if (wipIndex === null) {
				insertNew()
			} else {
				updateWithMessage()
			}
		}

		// perform the insert of a blank in-progress achievement
		function insertNew() {
			var ej = {
				progressCurrent: 1,
				progressMax: max,
				messageIds: [ messageId ]
			}
			ej = JSON.stringify(ej)
			var insq = " insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			insq += " select @AccountPermaId, @AchievementId, @ExtraJSON"
			pool.request()
				.input("AccountPermaId", sql.Int, targetPermaId)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(insq, (err, result) => {
					callback(err, result, achid)
				})
		}

		// Update the necessary achievement with new stats
		function updateWithMessage() {
			var ej = JSON.parse(achs[wipIndex].ExtraJSON)
			ej.messageIds.push(messageId)
			ej.progressCurrent++
			var acid = achs[wipIndex].AccAchieveId

			var uq = "update AccountAchievements set ExtraJSON = @ExtraJSON"
			uq += (ej.progressCurrent >= ej.progressMax ? ", AwardedDate = getutcdate()" : "")
			uq += " from AccountAchievements"
			uq += " where AccAchieveId = @AccAchieveId"

			ej = JSON.stringify(ej)

			pool.request()
				.input("AccAchieveId", sql.Int, acid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(uq, (err, result) => {
					callback(err, result, achid)
				})
		}
	},
	//2021	creator - 2
	2021: (input, callback) => {
		var achid = 2021
		var max = 5

		var messageId = input.params.messageId
		var targetPermaId = null
		var reactValue = 0
		var achs = []
		var wipIndex = null

		// Get reaction count of this message
		var rquery = "select sum(ReactValue) as ReactValue, max(SenderAccountId) as AccountPermaId"
		rquery += " from ("
		rquery += "		select m.SenderAccountId,"
		rquery += "			case Reaction when 'positive' then 2 when 'negative' then 0 else 1 end as ReactValue"
		rquery += "		from ChatReactions r"
		rquery += " 		inner join ChatMessages m"
		rquery += "			on r.MessageId = m.MessageId"
		rquery += "		where r.MessageId = @MessageId and r.UnreactionDate is null"
		rquery += "			and r.AccountPermaId != m.SenderAccountId"
		rquery += " ) a"
		pool.request()
			.input("MessageId", sql.Int, messageId)
			.query(rquery, (err, result) => {
				if (err) {
					callback(err, result, achid)
					return
				}

				targetPermaId = result.recordset[0].AccountPermaId
				reactValue = result.recordset[0].ReactValue

				if (reactValue >= 5) {
					getAllAchievements()
				} else {
					callback(null, null, achid)
				}
			})

		// Get all achievements to find ones related to that message
		function getAllAchievements() {
			var allquery = "select AccAchieveId, ExtraJSON, iif(AwardedDate is null, 0, 1) as Awarded"
			allquery += " from AccountAchievements"
			allquery += " where AccountPermaId = @AccountPermaId and AchievementId = @AchievementId"
			pool.request()
				.input("AchievementId", sql.Int, achid)
				.input("AccountPermaId", sql.Int, targetPermaId)
				.query(allquery, (err, result) => {
					if (err) {
						callback(err, result, achid)
						return
					}
					achs = result.recordset
					lookForMessage()
				})
		}

		// Find out whether message already has an achievement
		function lookForMessage() {
			var found = false
			for (i in achs) {
				var ej = JSON.parse(achs[i].ExtraJSON)
				var mids = ej.messageIds
				for (mi in mids) {
					found = (mids[mi] === messageId ? true : found)
				}
			}
			if (!found) {
				messageIsWorthy()
			} else {
				callback(null, null, achid)
			}
		}

		// It doesn't have an achievement but is worthy of one - update or insert?
		function messageIsWorthy() {
			// Look for an in-progress achievement
			for (i in achs) {
				wipIndex = (achs[i].Awarded === 0 ? i : wipIndex)
			}
			if (wipIndex === null) {
				insertNew()
			} else {
				updateWithMessage()
			}
		}

		// perform the insert of a blank in-progress achievement
		function insertNew() {
			var ej = {
				progressCurrent: 1,
				progressMax: max,
				messageIds: [messageId]
			}
			ej = JSON.stringify(ej)
			var insq = " insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			insq += " select @AccountPermaId, @AchievementId, @ExtraJSON"
			pool.request()
				.input("AccountPermaId", sql.Int, targetPermaId)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(insq, (err, result) => {
					callback(err, result, achid)
				})
		}

		// Update the necessary achievement with new stats
		function updateWithMessage() {
			var ej = JSON.parse(achs[wipIndex].ExtraJSON)
			ej.messageIds.push(messageId)
			ej.progressCurrent++
			var acid = achs[wipIndex].AccAchieveId

			var uq = "update AccountAchievements set ExtraJSON = @ExtraJSON"
			uq += (ej.progressCurrent >= ej.progressMax ? ", AwardedDate = getutcdate()" : "")
			uq += " from AccountAchievements"
			uq += " where AccAchieveId = @AccAchieveId"

			ej = JSON.stringify(ej)

			pool.request()
				.input("AccAchieveId", sql.Int, acid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(uq, (err, result) => {
					callback(err, result, achid)
				})
		}
	},
	//2022	creator - 3
	2022: (input, callback) => {
		var achid = 2022
		var max = 10

		var messageId = input.params.messageId
		var targetPermaId = null
		var reactValue = 0
		var achs = []
		var wipIndex = null

		// Get reaction count of this message
		var rquery = "select sum(ReactValue) as ReactValue, max(SenderAccountId) as AccountPermaId"
		rquery += " from ("
		rquery += "		select m.SenderAccountId,"
		rquery += "			case Reaction when 'positive' then 2 when 'negative' then 0 else 1 end as ReactValue"
		rquery += "		from ChatReactions r"
		rquery += " 		inner join ChatMessages m"
		rquery += "			on r.MessageId = m.MessageId"
		rquery += "		where r.MessageId = @MessageId and r.UnreactionDate is null"
		rquery += "			and r.AccountPermaId != m.SenderAccountId"
		rquery += " ) a"
		pool.request()
			.input("MessageId", sql.Int, messageId)
			.query(rquery, (err, result) => {
				if (err) {
					callback(err, result, achid)
					return
				}

				targetPermaId = result.recordset[0].AccountPermaId
				reactValue = result.recordset[0].ReactValue

				if (reactValue >= 5) {
					getAllAchievements()
				} else {
					callback(null, null, achid)
				}
			})

		// Get all achievements to find ones related to that message
		function getAllAchievements() {
			var allquery = "select AccAchieveId, ExtraJSON, iif(AwardedDate is null, 0, 1) as Awarded"
			allquery += " from AccountAchievements"
			allquery += " where AccountPermaId = @AccountPermaId and AchievementId = @AchievementId"
			pool.request()
				.input("AchievementId", sql.Int, achid)
				.input("AccountPermaId", sql.Int, targetPermaId)
				.query(allquery, (err, result) => {
					if (err) {
						callback(err, result, achid)
						return
					}
					achs = result.recordset
					lookForMessage()
				})
		}

		// Find out whether message already has an achievement
		function lookForMessage() {
			var found = false
			for (i in achs) {
				var ej = JSON.parse(achs[i].ExtraJSON)
				var mids = ej.messageIds
				for (mi in mids) {
					found = (mids[mi] === messageId ? true : found)
				}
			}
			if (!found) {
				messageIsWorthy()
			} else {
				callback(null, null, achid)
			}
		}

		// It doesn't have an achievement but is worthy of one - update or insert?
		function messageIsWorthy() {
			// Look for an in-progress achievement
			for (i in achs) {
				wipIndex = (achs[i].Awarded === 0 ? i : wipIndex)
			}
			if (wipIndex === null) {
				insertNew()
			} else {
				updateWithMessage()
			}
		}

		// perform the insert of a blank in-progress achievement
		function insertNew() {
			var ej = {
				progressCurrent: 1,
				progressMax: max,
				messageIds: [messageId]
			}
			ej = JSON.stringify(ej)
			var insq = " insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			insq += " select @AccountPermaId, @AchievementId, @ExtraJSON"
			pool.request()
				.input("AccountPermaId", sql.Int, targetPermaId)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(insq, (err, result) => {
					callback(err, result, achid)
				})
		}

		// Update the necessary achievement with new stats
		function updateWithMessage() {
			var ej = JSON.parse(achs[wipIndex].ExtraJSON)
			ej.messageIds.push(messageId)
			ej.progressCurrent++
			var acid = achs[wipIndex].AccAchieveId

			var uq = "update AccountAchievements set ExtraJSON = @ExtraJSON"
			uq += (ej.progressCurrent >= ej.progressMax ? ", AwardedDate = getutcdate()" : "")
			uq += " from AccountAchievements"
			uq += " where AccAchieveId = @AccAchieveId"

			ej = JSON.stringify(ej)

			pool.request()
				.input("AccAchieveId", sql.Int, acid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(uq, (err, result) => {
					callback(err, result, achid)
				})
		}
	},
	//2030	consumer - 1
	2030: (input, callback) => {
		var achid = 2030
		var max = 20

		// Check there isn't already one awarded (only awarded once)
		var queryaw = "select count(1) as Amount from AccountAchievements"
		queryaw += " where AchievementId = @AchievementId"
		queryaw += " and AccountPermaId = @AccountPermaId and AwardedDate is not null"
		pool.request()
			.input("AchievementId", sql.Int, achid)
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(queryaw, (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else if (result.recordset[0].Amount > 0) {
					callback(null, null, achid)
				} else {
					getProgress()
				}
			})
				
		var rn = (new Date).toISOString()
		var dbAch = null

		// Get the achievement if they have one in progress
		function getProgress() {
			var query = "select AccAchieveId, ExtraJSON "
			query += "from AccountAchievements "
			query += "where AchievementId = @AchievementId and AwardedDate is null and "
			pool.request()
				.input("AchievementId", sql.Int, achid)
				.input("AccountPermaId", sql.Int, input.permaid)
				.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
					if (err) {
						callback(err, null, achid)
					} else {
						considerCreating(result)
					}
				})
		}

		// If one is not in progress, create it
		function considerCreating(result) {
			if (result.recordset.length === 0) {
				var ej = {
					progressCurrent: 0,
					progressMax: max,
					reactionsFrom: (new Date()).toISOString()
				}
				ej = JSON.stringify(ej)
				var cquery = "declare @Inserted table (AccAchieveId int, ExtraJSON nvarchar(max));"
				cquery += " insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
				cquery += " output Inserted.AccAchieveId, Inserted.ExtraJSON into @Inserted"
				cquery += " values (@AccountPermaId, @AchievementId, @ExtraJSON);"
				cquery += " select AccAchieveId, ExtraJSON from @Inserted"
				pool.request()
					.input("AccountPermaId", sql.Int, input.permaid)
					.input("AchievementId", sql.Int, achid)
					.input("ExtraJSON", sql.VarChar, ej)
					.query(cquery, (err, result2) => {
						if (err) {
							callback(err, null, achid)
							return
						}
						if (result2.recordset.length === 0) {
							callback("Achievement not found but could not insert", result2, achid)
						} else {
							dbAch = result2.recordset[0]
							getNewCount()
						}
					})
			} else {
				dbAch = result.recordset[0]
				getNewCount()
			}
		}

		// Get the new count to assign to the progress of the achievement
		function getNewCount() {
			var ej = JSON.parse(dbAch.ExtraJSON)
			var from = new Date(ej.reactionsFrom)
			var ncquery = "select count(distinct r.MessageId) as Amount from ChatReactions r"
			ncquery += " inner join ChatMessages m"
			ncquery += " on r.MessageId = m.MessageId"
			ncquery += " where r.AccountPermaId = @AccountPermaId"
			ncquery += " and m.SenderAccountId != @AccountPermaId"
			ncquery += " and r.UnreactionDate is null"
			ncquery += " and r.ReactionDate >= @FromDate"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("FromDate", sql.DateTime, from)
				.query(ncquery, (err, result) => {
					if (err) {
						callback(err, null, achid)
					} else {
						updateAchievement(result)
					}
				})
		}

		// Update the achievement, awarding it if necessary
		function updateAchievement(result) {
			var ej = JSON.parse(dbAch.ExtraJSON)
			ej.progressCurrent = result.recordset[0].Amount
			var uquery = "update AccountAchievements"
			uquery += " set ExtraJSON = @ExtraJSON"
			uquery += (ej.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
			uquery += " from AccountAchievements"
			uquery += " where AccAchieveId = @AccAchieveId"

			ej = JSON.stringify(ej)

			pool.request()
				.input("AccAchieveId", sql.Int, dbAch.AccAchieveId)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(uquery, (err, result) => {
					callback(err, result, achid)
				})
		}
	},
	//2031	consumer - 2
	2031: (input, callback) => {
		var achid = 2031
		var max = 100
		
		var rn = (new Date).toISOString()
		var dbAch = null

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = @AchievementId and AwardedDate is null and "
		pool.request()
			.input("AchievementId", sql.Int, achid)
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerCreating(result)
				}
			})

		// If one is not in progress, create it
		function considerCreating(result) {
			if (result.recordset.length === 0) {
				var ej = {
					progressCurrent: 0,
					progressMax: max,
					reactionsFrom: (new Date()).toISOString()
				}
				ej = JSON.stringify(ej)
				var cquery = "declare @Inserted table (AccAchieveId int, ExtraJSON nvarchar(max));"
				cquery += " insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
				cquery += " output Inserted.AccAchieveId, Inserted.ExtraJSON into @Inserted"
				cquery += " values (@AccountPermaId, @AchievementId, @ExtraJSON);"
				cquery += " select AccAchieveId, ExtraJSON from @Inserted"
				pool.request()
					.input("AccountPermaId", sql.Int, input.permaid)
					.input("AchievementId", sql.Int, achid)
					.input("ExtraJSON", sql.VarChar, ej)
					.query(cquery, (err, result2) => {
						if (err) {
							callback(err, null, achid)
							return
						}
						if (result2.recordset.length === 0) {
							callback("Achievement not found but could not insert", result2, achid)
						} else {
							dbAch = result2.recordset[0]
							getNewCount()
						}
					})
			} else {
				dbAch = result.recordset[0]
				getNewCount()
			}
		}

		// Get the new count to assign to the progress of the achievement
		function getNewCount() {
			var ej = JSON.parse(dbAch.ExtraJSON)
			var from = new Date(ej.reactionsFrom)
			var ncquery = "select count(distinct r.MessageId) as Amount from ChatReactions r"
			ncquery += " inner join ChatMessages m"
			ncquery += " on r.MessageId = m.MessageId"
			ncquery += " where r.AccountPermaId = @AccountPermaId"
			ncquery += " and m.SenderAccountId != @AccountPermaId"
			ncquery += " and r.UnreactionDate is null"
			ncquery += " and r.ReactionDate >= @FromDate"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("FromDate", sql.DateTime, from)
				.query(ncquery, (err, result) => {
					if (err) {
						callback(err, null, achid)
					} else {
						updateAchievement(result)
					}
				})
		}

		// Update the achievement, awarding it if necessary
		function updateAchievement(result) {
			var ej = JSON.parse(dbAch.ExtraJSON)
			ej.progressCurrent = result.recordset[0].Amount
			var uquery = "update AccountAchievements"
			uquery += " set ExtraJSON = @ExtraJSON"
			uquery += (ej.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
			uquery += " from AccountAchievements"
			uquery += " where AccAchieveId = @AccAchieveId"

			ej = JSON.stringify(ej)

			pool.request()
				.input("AccAchieveId", sql.Int, dbAch.AccAchieveId)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(uquery, (err, result) => {
					callback(err, result, achid)
				})
		}
	},
	//2032	consumer - 3
	2032: (input, callback) => {
		var achid = 2032
		var max = 250

		var rn = (new Date).toISOString()
		var dbAch = null

		// Get the achievement if they have one in progress
		var query = "select AccAchieveId, ExtraJSON "
		query += "from AccountAchievements "
		query += "where AchievementId = @AchievementId and AwardedDate is null and "
		pool.request()
			.input("AchievementId", sql.Int, achid)
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(query + "AccountPermaId = @AccountPermaId", (err, result) => {
				if (err) {
					callback(err, null, achid)
				} else {
					considerCreating(result)
				}
			})

		// If one is not in progress, create it
		function considerCreating(result) {
			if (result.recordset.length === 0) {
				var ej = {
					progressCurrent: 0,
					progressMax: max,
					reactionsFrom: (new Date()).toISOString()
				}
				ej = JSON.stringify(ej)
				var cquery = "declare @Inserted table (AccAchieveId int, ExtraJSON nvarchar(max));"
				cquery += " insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
				cquery += " output Inserted.AccAchieveId, Inserted.ExtraJSON into @Inserted"
				cquery += " values (@AccountPermaId, @AchievementId, @ExtraJSON);"
				cquery += " select AccAchieveId, ExtraJSON from @Inserted"
				pool.request()
					.input("AccountPermaId", sql.Int, input.permaid)
					.input("AchievementId", sql.Int, achid)
					.input("ExtraJSON", sql.VarChar, ej)
					.query(cquery, (err, result2) => {
						if (err) {
							callback(err, null, achid)
							return
						}
						if (result2.recordset.length === 0) {
							callback("Achievement not found but could not insert", result2, achid)
						} else {
							dbAch = result2.recordset[0]
							getNewCount()
						}
					})
			} else {
				dbAch = result.recordset[0]
				getNewCount()
			}
		}

		// Get the new count to assign to the progress of the achievement
		function getNewCount() {
			var ej = JSON.parse(dbAch.ExtraJSON)
			var from = new Date(ej.reactionsFrom)
			var ncquery = "select count(distinct datediff(minute, 0, r.ReactionDate) / 10) as Amount from ChatReactions r"
			ncquery += " inner join ChatMessages m"
			ncquery += " on r.MessageId = m.MessageId"
			ncquery += " where r.AccountPermaId = @AccountPermaId"
			ncquery += " and m.SenderAccountId != @AccountPermaId"
			ncquery += " and r.UnreactionDate is null"
			ncquery += " and r.ReactionDate >= @FromDate"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("FromDate", sql.DateTime, from)
				.query(ncquery, (err, result) => {
					if (err) {
						callback(err, null, achid)
					} else {
						updateAchievement(result)
					}
				})
		}

		// Update the achievement, awarding it if necessary
		function updateAchievement(result) {
			var ej = JSON.parse(dbAch.ExtraJSON)
			ej.progressCurrent = result.recordset[0].Amount
			var uquery = "update AccountAchievements"
			uquery += " set ExtraJSON = @ExtraJSON"
			uquery += (ej.progressCurrent >= max ? ", AwardedDate = getutcdate()" : "")
			uquery += " from AccountAchievements"
			uquery += " where AccAchieveId = @AccAchieveId"

			ej = JSON.stringify(ej)

			pool.request()
				.input("AccAchieveId", sql.Int, dbAch.AccAchieveId)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(uquery, (err, result) => {
					callback(err, result, achid)
				})
		}
	},
	//2040	populist - 1
	//2041	populist - 2
	//2050	emancipated - 1
	//2051	emancipated - 2
	//2060	inspirer - 1
	//2061	inspirer - 2
	//2062	inspirer - 3
	//2070	all - day - all - night
	2070: (input, callback) => {
		var achid = 2070
		var res

		var querymsgs = "select dateadd(hour, (datediff(hour, 0, m.SentDate) / 4) * 4, 0) as BlockStart, count(1) as [Messages]"
		querymsgs += " from ChatMessages m"
		querymsgs += " where m.SenderAccountId = @AccountPermaId"
		querymsgs += "     and datediff(hour, 0, m.SentDate) / 4 > datediff(hour, 0, getutcdate()) / 4 - 6"
		querymsgs += " group by dateadd(hour, (datediff(hour, 0, m.SentDate) / 4) * 4, 0)"
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(querymsgs, (err, result) => {
				if (err) {
					callback(err, result, achid)
				} else {
					res = result.recordset
					considerEligibility()
				}
			})

		function considerEligibility() {
			var msgs = 0
			var blocks = 0
			for (i in res) {
				msgs += res[i].Messages
				blocks++
			}
			if (msgs >= 20 && blocks === 6) {
				checkAlreadyGranted()
			} else {
				callback(null, null, achid)
			}
		}

		function checkAlreadyGranted() {
			// here we will check whether they were already granted
			// the award in the relevant 6 - hour blocks
			var querycheck = "select top (1) datediff(hour, 0, AwardedDate) / 4 + 6 as LastAwardedEndBlock, datediff(hour, 0, getutcdate()) / 4 as CurrentBlock"
			querycheck += " from AccountAchievements"
			querycheck += " where AchievementId = @AchievementId and AccountPermaId = @AccountPermaId"
			querycheck += " and AwardedDate is not null"
			querycheck += " order by AwardedDate desc"
			pool.request()
				.input("AchievementId", sql.Int, achid)
				.input("AccountPermaId", sql.Int, input.permaid)
				.query(querycheck, (err, result) => {
					if (err) {
						callback(null, null, achid)
						return
					}
					if (result.recordset.length === 0) {
						grant()
					} else if (result.recordset[0].CurrentBlock > result.recordset[0].LastAwardedEndBlock) {
						grant()
					} else {
						callback(null, null, achid)
					}
				})
		}

		function grant() {
			var bsdate = new Date(res[0].BlockStart)
			var bs = new Date(bsdate)
			var be = new Date(Math.abs(bsdate) + 864e5)

			var ej = {
				blockStart: bs.toISOString(),
				blockEnd: be.toISOString()
			}
			ej = JSON.stringify(ej)

			var querygr = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate, ExtraJSON)"
			querygr += " values (@AccountPermaId, @AchievementId, getutcdate(), @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(querygr, (err, result) => {
						callback(err, result, achid)
				})
		}
	},
	//2080	chevblocked
	//2090	janitor - 1
	//2091	janitor - 2
	//2100	overtalker - 1
	//2101	overtalker - 2
	//2102	overtalker - 3
	//2110	vandalist
	//2120	naughty - 1
	2120: (input, callback) => {
		var achid = 2120
		var max = 2

		var messageId = input.params.messageId
		var targetPermaId = null

		// Load sender of message and count reactions to message
		var qsr = "select m.SenderAccountId, r.Amount"
		qsr += " from ChatMessages m"
		qsr += "	cross join ("
		qsr += "		select count(1) as Amount"
		qsr += "		from ChatReactions ri"
		qsr += " 			inner join ChatMessages mi on mi.MessageId = @MessageId"
		qsr += "		where ri.MessageId = @MessageId and Reaction = 'negative'"
		qsr += "			and UnreactionDate is null and ri.AccountPermaId != mi.SenderAccountId"
		qsr += "	) r"
		qsr += " where m.MessageId = @MessageId"
		pool.request()
			.input("MessageId", sql.Int, messageId)
			.query(qsr, (err, result) => {
				if (err) {
					callback(err, result, achid)
					return
				}
				processResult(result)
			})

		// Set target ID and check whether the message has received sufficient negative reaction
		function processResult(result) {
			targetPermaId = result.recordset[0].SenderAccountId
			if (result.recordset[0].Amount >= max) {
				loadAll()
			} else {
				callback(null, null, achid)
			}
		}

		// Load all achievements to see if the message already has an achievement
		function loadAll() {
			var qlaa = "select ExtraJSON from AccountAchievements"
			qlaa += " where AccountPermaId = @AccountPermaId"
			qlaa += " and AchievementId = @AchievementId and AwardedDate is not null"
			pool.request()
				.input("AccountPermaId", sql.Int, targetPermaId)
				.input("AchievementId", sql.Int, achid)
				.query(qlaa, (err, result) => {
					if (err) {
						callback(err, result, achid)
						return
					}
					checkAll(result)
				})
		}

		// Actually search through to see if the message already has an ach
		function checkAll(result) {
			var found = false
			for (i in result.recordset) {
				var ej = result.recordset[i].ExtraJSON
				ej = JSON.parse(ej)
				found = (ej.messageId === messageId ? true : found)
			}
			if (!found) {
				createAchievement()
			} else {
				callback(null, null, achid)
			}
		}

		function createAchievement() {
			var ej = { messageId: messageId }
			ej = JSON.stringify(ej)
			var qca = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate, ExtraJSON)"
			qca += " values (@AccountPermaId, @AchievementId, getutcdate(), @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, targetPermaId)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(qca, (err, result) => {
					var meme = "hello"
					callback(err, result, achid)
				})
		}
	},
	//2121	naughty - 2
	2121: (input, callback) => {
		var achid = 2121
		var max = 4

		var messageId = input.params.messageId
		var targetPermaId = null

		// Load sender of message and count reactions to message
		var qsr = "select m.SenderAccountId, r.Amount"
		qsr += " from ChatMessages m"
		qsr += "	cross join ("
		qsr += "		select count(1) as Amount"
		qsr += "		from ChatReactions ri"
		qsr += " 			inner join ChatMessages mi on mi.MessageId = @MessageId"
		qsr += "		where ri.MessageId = @MessageId and Reaction = 'negative'"
		qsr += "			and UnreactionDate is null and ri.AccountPermaId != mi.SenderAccountId"
		qsr += "	) r"
		qsr += " where m.MessageId = @MessageId"
		pool.request()
			.input("MessageId", sql.Int, messageId)
			.query(qsr, (err, result) => {
				if (err) {
					callback(err, result, achid)
					return
				}
				processResult(result)
			})

		// Set target ID and check whether the message has received sufficient negative reaction
		function processResult(result) {
			targetPermaId = result.recordset[0].SenderAccountId
			if (result.recordset[0].Amount >= max) {
				loadAll()
			} else {
				callback(null, null, achid)
			}
		}

		// Load all achievements to see if the message already has an achievement
		function loadAll() {
			var qlaa = "select ExtraJSON from AccountAchievements"
			qlaa += " where AccountPermaId = @AccountPermaId"
			qlaa += " and AchievementId = @AchievementId and AwardedDate is not null"
			pool.request()
				.input("AccountPermaId", sql.Int, targetPermaId)
				.input("AchievementId", sql.Int, achid)
				.query(qlaa, (err, result) => {
					if (err) {
						callback(err, result, achid)
						return
					}
					checkAll(result)
				})
		}

		// Actually search through to see if the message already has an ach
		function checkAll(result) {
			var found = false
			for (i in result.recordset) {
				var ej = result.recordset[i].ExtraJSON
				ej = JSON.parse(ej)
				found = (ej.messageId === messageId ? true : found)
			}
			if (!found) {
				createAchievement()
			} else {
				callback(null, null, achid)
			}
		}

		function createAchievement() {
			var ej = { messageId: messageId }
			ej = JSON.stringify(ej)
			var qca = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate, ExtraJSON)"
			qca += " values (@AccountPermaId, @AchievementId, getutcdate(), @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, targetPermaId)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(qca, (err, result) => {
					var meme = "hello"
					callback(err, result, achid)
				})
		}
	},
	//2122	naughty - 3
	2122: (input, callback) => {
		var achid = 2122
		var max = 6

		var messageId = input.params.messageId
		var targetPermaId = null

		// Load sender of message and count reactions to message
		var qsr = "select m.SenderAccountId, r.Amount"
		qsr += " from ChatMessages m"
		qsr += "	cross join ("
		qsr += "		select count(1) as Amount"
		qsr += "		from ChatReactions ri"
		qsr += " 			inner join ChatMessages mi on mi.MessageId = @MessageId"
		qsr += "		where ri.MessageId = @MessageId and Reaction = 'negative'"
		qsr += "			and UnreactionDate is null and ri.AccountPermaId != mi.SenderAccountId"
		qsr += "	) r"
		qsr += " where m.MessageId = @MessageId"
		pool.request()
			.input("MessageId", sql.Int, messageId)
			.query(qsr, (err, result) => {
				if (err) {
					callback(err, result, achid)
					return
				}
				processResult(result)
			})

		// Set target ID and check whether the message has received sufficient negative reaction
		function processResult(result) {
			targetPermaId = result.recordset[0].SenderAccountId
			if (result.recordset[0].Amount >= max) {
				loadAll()
			} else {
				callback(null, null, achid)
			}
		}

		// Load all achievements to see if the message already has an achievement
		function loadAll() {
			var qlaa = "select ExtraJSON from AccountAchievements"
			qlaa += " where AccountPermaId = @AccountPermaId"
			qlaa += " and AchievementId = @AchievementId and AwardedDate is not null"
			pool.request()
				.input("AccountPermaId", sql.Int, targetPermaId)
				.input("AchievementId", sql.Int, achid)
				.query(qlaa, (err, result) => {
					if (err) {
						callback(err, result, achid)
						return
					}
					checkAll(result)
				})
		}

		// Actually search through to see if the message already has an ach
		function checkAll(result) {
			var found = false
			for (i in result.recordset) {
				var ej = result.recordset[i].ExtraJSON
				ej = JSON.parse(ej)
				found = (ej.messageId === messageId ? true : found)
			}
			if (!found) {
				createAchievement()
			} else {
				callback(null, null, achid)
			}
		}

		function createAchievement() {
			var ej = { messageId: messageId }
			ej = JSON.stringify(ej)
			var qca = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate, ExtraJSON)"
			qca += " values (@AccountPermaId, @AchievementId, getutcdate(), @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, targetPermaId)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(qca, (err, result) => {
					var meme = "hello"
					callback(err, result, achid)
				})
		}
	},
	//2130	cheer
	//2140	old - cheer - 1
	//2141	old - cheer - 2
	//2150	vox - populi
	2150: (input, callback) => {
		var achid = 2150
		var max = 15

		var tquery = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate)"
		tquery += " select @AccountPermaId, @AchievementId, getutcdate()"
		tquery += " from ("
		tquery += "		select count(1) as Amount from ChatReactions"
		tquery += "		where AccountPermaId = @AccountPermaId and UnreactionDate is null"
		tquery += "			and datediff(day, 0, ReactionDate) = datediff(day, 0, getutcdate())"
		tquery += " ) r "
		tquery += "		left join AccountAchievements a"
		tquery += "		on a.AccountPermaId = @AccountPermaId and a.AchievementId = @AchievementId"
		tquery += "			and a.AwardedDate is not null"
		tquery += "			and datediff(week, 0, getutcdate()) = datediff(week, 0, a.AwardedDate)"
		tquery += " where r.Amount >= @Max and a.AccAchieveId is null"
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.input("AchievementId", sql.Int, achid)
			.input("Max", sql.Int, max)
			.query(tquery, (err, result) => {
				callback(err, result, achid)
			})

	},
	//2151	voce - magna
	2151: (input, callback) => {
		var achid = 2151
		var max = 200

		var tquery = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate)"
		tquery += " select @AccountPermaId, @AchievementId, getutcdate()"
		tquery += " from ("
		tquery += "		select count(1) as Amount from ChatReactions"
		tquery += "		where AccountPermaId = @AccountPermaId and UnreactionDate is null"
		tquery += "			and datediff(month, 0, ReactionDate) = datediff(month, 0, getutcdate())"
		tquery += " ) r "
		tquery += "		left join AccountAchievements a"
		tquery += "		on a.AccountPermaId = @AccountPermaId and a.AchievementId = @AchievementId"
		tquery += "			and a.AwardedDate is not null"
		tquery += "			and datediff(month, 0, getutcdate()) = datediff(month, 0, a.AwardedDate)"
		tquery += " where r.Amount >= @Max and a.AccAchieveId is null"
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.input("AchievementId", sql.Int, achid)
			.input("Max", sql.Int, max)
			.query(tquery, (err, result) => {
				callback(err, result, achid)
			})

	},
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
			queryins += "select @AccountPermaId, @AchievementId, getutcdate(), @ExtraJSON "
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
			if (typeof result !== "undefined") {
				targetPermaId = result.SenderAccountId
				amountStarred = result.Amount
				if (amountStarred >= max) {
					getAchsCount()
				} else {
					callback(null, null, achid)
				}
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
				queryins += "select @AccountPermaId, @AchievementId, getutcdate()"
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
	2180: (input, callback) => {
		var achid = 2180
		var max = 5

		var n = new Date()
		var nh = n.getUTCHours()

		if (nh >= 10 && nh < 15 && input.params.content.match(/(ear|squ)/gi) !== null) {
			// Delete any old ones
			var dq = "delete from AccountAchievements"
			dq += " where AccountPermaId = @AccountPermaId"
			dq += " and AchievementId = @AchievementId"
			dq += " and cast(json_value(ExtraJSON, '$.lastRepresent') as date) < dateadd(day, -2, getutcdate())"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("AchievementId", sql.Int, achid)
				.query(dq, (err, result) => {
					lookForRecent()
				})
		}

		// Look for any from today or yesterday
		function lookForRecent() {
			var updq = "select AccAchieveId, ExtraJSON, AwardedDate from AccountAchievements"
			updq += " where AccountPermaId = @AccountPermaId"
			updq += " and AchievementId = @AchievementId"
			updq += " and cast(json_value(ExtraJSON, '$.lastRepresent') as date) > dateadd(day, -2, getutcdate())"
			updq += " order by iif(AwardedDate is null, 0, 1)"

			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("AchievementId", sql.Int, achid)
				.query(updq, (err, result) => {
					processRecent(result.recordset)
				})
		}

		function processRecent(rs) {
			if (rs.length === 0) {
				// If none exist, add a new one
				createNew()
			} else {
				var lr = JSON.parse(rs[0].ExtraJSON).lastRepresent.slice(0, 10)
				var nowString = (n.toISOString()).slice(0, 10)
				if (lr != nowString) {
					if (rs[0].AwardedDate === null) {
						updateExisting(rs[0])
					} else {
						// the one we see was from yesterday - a new one is required
						createNew()
					}
				} else {
					callback(null, null, achid)
				}
			}
		}

		function createNew() {
			var ej = {
				progressCurrent: 1,
				progressMax: max,
				lastRepresent: n.toISOString()
			}
			ej = JSON.stringify(ej)
			var cnq = "insert into AccountAchievements (AccountPermaId, AchievementId, ExtraJSON)"
			cnq += " values (@AccountPermaId, @AchievementId, @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(cnq, (err, result) => {
					callback(err, result, achid)
				})
		}

		function updateExisting(row) {
			var ej = JSON.parse(row.ExtraJSON)
			ej.progressCurrent++
			ej.lastRepresent = n.toISOString()

			var updq = "update aa set"
			updq += ej.progressCurrent >= max ? " AwardedDate = getutcdate()," : ""
			updq += " ExtraJSON = @ExtraJSON"
			updq += " from AccountAchievements aa"
			updq += " where AccAchieveId = @AccAchieveId"

			ej = JSON.stringify(ej)

			pool.request()
				.input("AccAchieveId", sql.Int, row.AccAchieveId)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(updq, (err, result) => {
					callback(err, result, achid)
				})
		}

	},
	//2190	welcome - back
	2190: (input, callback) => {
		var achid = 2190

		var querylm = "select MessageId as messageid, SentDate as lm from"
		querylm += " (select MessageId, SentDate, row_number() over(order by SentDate desc) as rn from ChatMessages where SenderAccountId = @AccountPermaId) a"
		querylm += " where a.rn = 2"
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(querylm, (err, result) => {
				if (err || result.recordset.length === 0) {
					callback(err, result, achid)
				} else {
					processLastMessage(result.recordset[0])
				}
			})

		function processLastMessage(r) {
			if (typeof r === "undefined") {
				callback(null, null, achid)
				return
			}
			if (r.lm === null) {
				callback(null, null, achid)
				return
			}
			var lmDate = new Date(r.lm)
			var currentDate = new Date()
			var diffDays = Math.abs(currentDate - lmDate) / 864e5

			if (diffDays >= 5 && diffDays < 30) {
				awardAchievement(r, diffDays)
			} else {
				callback(null, null, achid)
			}
		}

		function awardAchievement(r, diffDays) {
			var ej = {
				messageId: r.messageid,
				diffDays: diffDays
			}
			ej = JSON.stringify(ej)
			var queryins = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate, ExtraJSON)"
			queryins += " values (@AccountPermaId, @AchievementId, getutcdate(), @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(queryins, (err, result) => {
					callback(err, result, achid)
				})
		}
	},
	//2191	from - the - dead
	2191: (input, callback) => {
		var achid = 2191

		var querylm = "select MessageId as messageid, SentDate as lm from"
		querylm += " (select MessageId, SentDate, row_number() over(order by SentDate desc) as rn from ChatMessages where SenderAccountId = @AccountPermaId) a"
		querylm += " where a.rn = 2"
		pool.request()
			.input("AccountPermaId", sql.Int, input.permaid)
			.query(querylm, (err, result) => {
				if (err || result.recordset.length === 0) {
					callback(err, result, achid)
				} else {
					processLastMessage(result.recordset[0])
				}
			})

		function processLastMessage(r) {
			if (typeof r === "undefined") {
				callback(null, null, achid)
				return
			}
			if (r.lm === null) {
				callback(null, null, achid)
				return
			}
			var lmDate = new Date(r.lm)
			var currentDate = new Date()
			var diffDays = Math.abs(currentDate - lmDate) / 864e5

			if (diffDays >= 30) {
				awardAchievement(r, diffDays)
			} else {
				callback(null, null, achid)
			}
		}

		function awardAchievement(r, diffDays) {
			var ej = {
				messageId: r.messageid,
				diffDays: diffDays
			}
			ej = JSON.stringify(ej)
			var queryins = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate, ExtraJSON)"
			queryins += " values (@AccountPermaId, @AchievementId, getutcdate(), @ExtraJSON)"
			pool.request()
				.input("AccountPermaId", sql.Int, input.permaid)
				.input("AchievementId", sql.Int, achid)
				.input("ExtraJSON", sql.VarChar, ej)
				.query(queryins, (err, result) => {
					callback(err, result, achid)
				})
		}
	},
	//2999	desecrator
	//3000	mvp - weekly
	//3001	mvp - monthly
	//3002	mvp - yearly
}

// MVP achievements insert helper
function insertMvpAchievement(accountPermaId, type) {
	var q = "insert into AccountAchievements (AccountPermaId, AchievementId, AwardedDate)"
	q += "values (@AccountPermaId, @AchievementId, getutcdate())"

	var types = {
		weekly: 3000,
		monthly: 3001,
		yearly: 3002
	}

	pool.request()
		.input("AccountPermaId", sql.Int, accountPermaId)
		.input("AchievementId", sql.Int, types[type])
		.query(q)
}

// Function for running on other pages. Input should be the operation the user just performed
module.exports = {
	updateAchievements: (input, callback) => {
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
				//console.log("doing " + achid)
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
				if (todo.length === 0) {
					checkForNewAchs()
				}
				//console.log("s4: todo after is")
				//console.log(todo)
				//console.log("------------------")
			}

			function checkForNewAchs() {
				pool.request()
					.input("AccountPermaId", sql.Int, forcheck.permaid)
					.execute("spAccountAchievementsRecent", (err, result) => {
						callback(err, result)
					})
			}

		} else {
			callback("did not pass requirements for achievement check", null)
		}
	},
	// weekly
	mvpWeekly: (callback) => {
		pool.request()
			.execute("spAchievementsAwardMVPWeekly", (err, result) => {
				if (!err) {
					processResult(result)
				} else {
					callback(err, null)
				}
			})

		function processResult(result) {
			var all = result.recordset

			var msgContent = "~ It's time for the weekly MVP awards! ~\n"

			if (all.length === 0) {
				msgContent += "\nUnfortunately, there were no achievements awarded this week. What hell?"
			} else if (all.length !== 0 && all[0].Points <= 0) {
				msgContent += "\nUnfortunately, no one acheived more than 0 MVP points this week."
			} else {
				for (i in all) {
					msgContent += "\n" + all[i].Ranking + ". {accountPermaId" + all[i].AccountPermaId + "} with "
					msgContent += all[i].Points + " points."
					if (all[i].Ranking === 1) {
						msgContent += all[i].Ranking === 1 ? " Winner winner." : ""
						insertMvpAchievement(all[i].AccountPermaId, "weekly")
					}					
				}
			}

			callback(null, msgContent)
		}
	},
	// monthly
	mvpMonthly: (callback) => {
		pool.request()
			.execute("spAchievementsAwardMVPMonthly", (err, result) => {
				if (!err) {
					processResult(result)
				} else {
					callback(err, null)
				}
			})

		function processResult(result) {
			var all = result.recordset

			var msgContent = "~ It's time for the monthly MVP awards! ~\n"

			if (all.length === 0) {
				msgContent += "\nUnfortunately, there were no achievements awarded this month. What hell?"
			} else if (all.length !== 0 && all[0].Points <= 0) {
				msgContent += "\nUnfortunately, no one acheived more than 0 MVP points this month."
			} else {
				for (i in all) {
					msgContent += "\n" + all[i].Ranking + ". {accountPermaId" + all[i].AccountPermaId + "} with "
					msgContent += all[i].Points + " points."
					if (all[i].Ranking === 1) {
						msgContent += all[i].Ranking === 1 ? " Winner winner." : ""
						insertMvpAchievement(all[i].AccountPermaId, "monthly")
					}
				}
			}

			callback(null, msgContent)
		}
	},
	// yearly
	mvpYearly: (callback) => {
		pool.request()
			.execute("spAchievementsAwardMVPYearly", (err, result) => {
				if (!err) {
					processResult(result)
				} else {
					callback(err, null)
				}
			})

		function processResult(result) {
			var all = result.recordset

			var msgContent = "~ It's time for the annual MVP awards! ~\n"

			if (all.length === 0) {
				msgContent += "\nUnfortunately, there were no achievements awarded this year. What hell?"
			} else if (all.length !== 0 && all[0].Points <= 0) {
				msgContent += "\nUnfortunately, no one acheived more than 0 MVP points this year."
			} else {
				for (i in all) {
					msgContent += "\n" + all[i].Ranking + ". {accountPermaId" + all[i].AccountPermaId + "} with "
					msgContent += all[i].Points + " points."
					if (all[i].Ranking === 1) {
						msgContent += all[i].Ranking === 1 ? " Winner winner." : ""
						insertMvpAchievement(all[i].AccountPermaId, "yearly")
					}
				}
			}

			callback(null, msgContent)
		}
	},

}