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

// Database results helper: Returns errors and formats results object
function helperResult(iErr, iResult, iModel) {

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
				if (typeof iModel !== "undefined") {
					var helpedGrid = helperGrid(resultProper, iModel)
					resultPassback = helpedGrid.result
					modelPassback = helpedGrid.model
				} else {
					resultPassback = iResult
				}				
			}
		}
	}

	if (err !== null) {
		resultPassback = null
	}

	var fret = { recordset: resultPassback, err: err }
	if (typeof iModel !== "undefined") {
		fret.model = modelPassback
	}
	return fret
}

// Grid helper: Filter data based on model.js
function helperGrid(iResult, iModel) {
	var modelPassback = {}
	var resultPassback = []
	
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
	for (r in iResult) {
		// Building block for this row
		var building = {}
		for (c in iModel) {
			if (iModel[c].show || iModel[c].loadAnyway) {
				building[c] = iResult[r][c]
			}
		}
		resultPassback.push(building)
	}

	var fret = { result: resultPassback, model: modelPassback }
	return fret
}

// Now the actual data store
module.exports = {
	grids: {
		mcmLeaderboard: (params, callback) => {
			dbmcm.request()
				.query("select * from vwPlayerSummary", (err, result) => {
					var helped = helperResult(err, result, new model.mcmLeaderboard())
					callback(helped.err, { model: helped.model, recordset: helped.recordset })
				})
		},
		mcmPlayerMatches: (params, callback) => {
			dbmcm.request()
				.input("PlayerId", sql.VarChar, params.PlayerId)
				.execute("PlayerMatches", (err, result) => {
					var helped = helperResult(err, result, new model.mcmPlayerMatches())
					callback(helped.err, { model: helped.model, recordset: helped.recordset })
				})
		}
	},
	data: {
		mcmPlayerInventory: (params, callback) => {
			dbmcm.request()
				.input("PlayerId", sql.VarChar, params.PlayerId)
				.execute("PlayerInventory", (err, result) => {
					var helped = helperResult(err, result)
					callback(helped.err, { recordset: helped.recordset })
				})
		},
		mcmPlayerInfo: (params, callback) => {
			dbmcm.request()
				.input("PlayerId", sql.VarChar, params.PlayerId)
				.query("select * from vwPlayerSummary where PlayerId = @PlayerId", (err, result) => {
					var helped = helperResult(err, result)
					callback(helped.err, { recordset: helped.recordset })
				})
		},
		mcmMatchInfo: (params, callback) => {
			dbmcm.request()
				.input("MatchId", sql.VarChar, params.MatchId)
				.execute("MatchInfo", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		mcmSummary: (params, callback) => {
			dbmcm.request()
				.execute("SummaryReport", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		nomicRules: (params, callback) => {
			pool.request()
				.execute("nomic.spRulesGet", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		nomicChatLoad: (params, callback) => {
			pool.request()
				.input("From", sql.VarChar, params.from)
				.execute("nomic.spChatLoad", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		nomicPlayers: (params, callback) => {
			pool.request()
				.query("select * from nomic.Players order by Name", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		nomicProposal: (params, callback) => {
			pool.request()
				.input("ProposalId", sql.Int, params.proposalId)
				.execute("nomic.spProposalGet", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		nomicProposalsOpen: (params, callback) => {
			pool.request()
				.execute("nomic.spProposalsGetOpen", (err, result) => {
					callback(err, { recordset: result })
				})
		},
	},
	procedure: {
		nomicRulesAdminEdit: (params, callback) => {
			pool.request()
				.input("RuleId", sql.Int, params.ruleId)
				.input("NewName", sql.VarChar, params.newName)
				.input("NewContent", sql.VarChar, params.newContent)
				.execute("nomic.spRulesAdminEdit", (err, result) => {
					callback(err, result)
				})
		},
		nomicChatSend: (params, callback) => {
			pool.request()
				.input("Sender", sql.VarChar, params.from)
				.input("Message", sql.VarChar, params.contents)
				.input("MessageType", sql.VarChar, "Message")
				.input("ExtraJSON", sql.VarChar, null)
				.execute("nomic.spChatSend", (err, result) => {
					callback(err, result)
				})
		},
		nomicProposalNew: (params, callback) => {
			var returnResults = []
			var errs = []
			var callbackDone = false

			// Proposal header
			pool.request()
				.input("PlayerId", sql.VarChar, params.proposer)
				.input("Name", sql.VarChar, params.propName)
				.execute("nomic.spProposalInsertHead", (err, result) => {
					if (!err) {
						returnResults.push(result)
						step2(result)
					} else {
						callback(err, null)
					}
				})

			function step2(headResult) {
				var headId = headResult.recordset[0].ProposalId
				var openInserts = 0

				for (i in params.ruleChanges) {
					openInserts++
					console.log("Inserting")
					pool.request()
						.input("ProposalId", sql.Int, headId)
						.input("RuleId", sql.Int, params.ruleChanges[i].ruleId)
						.input("AmendType", sql.VarChar, params.ruleChanges[i].changeType)
						.input("NewText", params.ruleChanges[i].content)
						.execute("nomic.spProposalInsertAmendment", (err, result) => {
							openInserts--
							if (err) {
								errs.push(err)
							} 
							returnResults.push(result)
							canCallback(openInserts)
						})
				}
			}

			function canCallback(openInserts) {
				if (openInserts === 0 && !callbackDone) {
					callback(errs, returnResults)
					callbackDone = true
				}
			}

		},
		nomicProposalUpdate: (params, callback) => {
			var returnResults = []
			var errs = []
			var callbackDone = false

			// Proposal header
			pool.request()
				.input("ProposalId", sql.Int, params.proposalId)
				.input("PlayerId", sql.VarChar, params.proposer)
				.input("Name", sql.VarChar, params.propName)
				.execute("nomic.spProposalUpdateHead", (err, result) => {
					if (!err) {
						returnResults.push(result)
					} else {
						callback(err, null)
					}
				})

			// Each amendment
			var openAmendments = 0
			for (i in params.ruleChanges) {
				openAmendments++

				if (params.ruleChanges[i].amendmentId === "new") {
					pool.request()
						.input("ProposalId", sql.Int, params.proposalId)
						.input("RuleId", sql.Int, params.ruleChanges[i].ruleId)
						.input("AmendType", sql.VarChar, params.ruleChanges[i].changeType)
						.input("NewText", params.ruleChanges[i].content)
						.execute("nomic.spProposalInsertAmendment", (err, result) => {
							openAmendments--
							if (err) {
								errs.push(err)
							}
							returnResults.push(result)
							canCallback(openAmendments)
						})
				} else {
					pool.request()
						.input("AmendmentId", sql.Int, params.ruleChanges[i].amendmentId)
						.input("RuleId", sql.Int, params.ruleChanges[i].ruleId)
						.input("AmendType", sql.VarChar, params.ruleChanges[i].changeType)
						.input("NewText", params.ruleChanges[i].content)
						.execute("nomic.spProposalUpdateAmendment", (err, result) => {
							openAmendments--
							if (err) {
								errs.push(err)
							}
							returnResults.push(result)
							canCallback(openAmendments)
						})
				}
			}

			// Each deletion
			for (i in params.deletes) {
				openAmendments++
				pool.request()
					.input("AmendmentId", sql.Int, params.deletes[i])
					.execute("nomic.spProposalRemoveAmendment", (err, result) => {
						openAmendments--
						if (err) {
							errs.push(err)
						}
						returnResults.push(result)
						canCallback(openAmendments)
					})
			}

			function canCallback(openAmendments) {
				if (openAmendments === 0 && !callbackDone) {
					callback(errs, returnResults)
					callbackDone = true
				}
			}
		}
	}
}