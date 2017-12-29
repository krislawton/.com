// DB Configuration and connection string
const sql = require('mssql/msnodesqlv8')
const dbconfig = {
    user: 'sa',
    password: 'StopChanging9000',
    server: '.',
    database: 'Website',
    options: {
        charset: 'Latin1_General_CI_AS'
	},
	requestTimeout: 30000
}
const dbconstr = "Driver=msnodesqlv8;Server=(local);Database=Website;Trusted_Connection=yes;TrustServerCertificate=yes;Encrypt=yes;"
const dbconstrmcm = "Driver=msnodesqlv8;Server=(local);Database=MCM;Trusted_Connection=yes;TrustServerCertificate=yes;Encrypt=yes;"
// Create connection pool
const pool = new sql.ConnectionPool(dbconstr, err => {
    if (err) {
        console.log("Database error: " + err["name"])
        console.log(err)
    } else {
		console.log("Data store db connection test successful")
    }
})
const dbmcm = new sql.ConnectionPool(dbconstrmcm, err => {
	if (err) {
		console.log("Database error: " + err["name"])
		console.log(err)
	} else {
		console.log("Data store MCM db connection test successful")
	}
})

// Data model
const model = require('./model.js')

// Database results helper: Returns errors 

// Grid helper: Process results in to a return
function helperGrid(iModel, iErr, iResult) {
	var err = iErr
	var modelPassback = {}
	var resultProper = []
	var resultPassback = []
	if (typeof iErr === "undefined" || iErr === null) {
		if (typeof iResult === "undefined") {
			err = "No results object was given."
		} else {
			if (typeof iResult.recordset === "object") {
				resultProper = iResult.recordset
			} else if (typeof iResult[0] === "object") {
				resultProper = iResult
			} else {
				err = "No results could be determined"
			}

			if (resultProper.length === 0) {
				err = "Results came back empty"
			} else {
				// RESULTS OKAY, put in to model
				// Put only relevant model fields in to a passback model
				for (c in iModel) {
					if (iModel[c].show || iModel[c].loadAnyway) {
						var building = {
							hidden: iModel[c].loadAnyway,
							format: iModel[c].format
						}
						modelPassback[c] = building
					}
				}

				// Iterate through rows of resultset
				for (r in resultProper) {
					// Building block for this row
					var building = {}
					for (c in iModel) {
						if (iModel[c].show || iModel[c].loadAnyway) {
							building[c] = resultProper[r][c]
						}
					}
					resultPassback.push(building)
				}
			}
		}
	}

	if (err !== null) {
		resultPassback = null
	}
	var fret = { recordset: resultPassback, err: err, model: modelPassback }

	return fret
}

// Now the actual data store
module.exports = {
	grids: {
		mcmLeaderboard: (params, callback) => {
			dbmcm.request()
				.query("select * from vwPlayerSummary", (err, result) => {
					var helped = helperGrid(new model.mcmLeaderboard(), err, result)
					callback(helped.err, { model: helped.model, recordset: helped.recordset })
				})
		},
		mcmPlayerMatches: (params, callback) => {
			dbmcm.request()
				.input("PlayerId", sql.VarChar, params.PlayerId)
				.execute("PlayerMatches", (err, result) => {
					var helped = helperGrid(new model.mcmPlayerMatches(), err, result)
					callback(helped.err, { model: helped.model, recordset: helped.recordset })
				})
		}
	}
}