// Helpers, jeepers
const helpers = require('./helpers.js')

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
const pool = new sql.ConnectionPool(dbconfig, err => {
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
		rootAchievementsLoadAll: (params, callback) => {
			pool.request()
				.execute("dbo.spAchievementsGetAll", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		rootAchievementLoadSingle: (params, callback) => {
			pool.request()
				.input("AchievementUrl", sql.VarChar, params.achievementUrl)
				.execute("spAchievementGetSingle", (err, result) => {
					callback(err, result)
				})
		},
		rootUserLoadAchievements: (params, callback) => {
			pool.request()
				.input("AccountPermaId", sql.VarChar, params.permaid)
				.execute("dbo.spAccountAchievementsGet", (err, result) => {
					if (!err) {
						// For in-progress, filter JSON data so that it's only progress
						for (i in result.recordsets[1]) {
							var r = result.recordsets[1][i]
							var extraj = JSON.parse(r.ExtraJSON)
							var newj = { progressMax: extraj.progressMax, progressCurrent: extraj.progressCurrent }
							result.recordsets[1][i].ExtraJSON = newj
						}
					}
					callback(err, result)
				})
		},
		rootUserLoadAchievementsRecent: (params, callback) => {
			permaid = typeof params.session.userData !== "undefined" && typeof params.session.userData.permaid !== "undefined" ? params.session.userData.permaid : null
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.execute("dbo.spAccountAchievementsRecent", (err, result) => {
					callback(err, result)
				})
		},
		rootUserLoadChangelog: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.execute("spChangelogGetForAccount", (err, result) => {
					callback(err, result)
				})
		},
		rootUserLoadInfo: (params, callback) => {
			pool.request()
				.input("AccountPermaId", sql.Int, params.permaid)
				.execute("spAccountGetInfo", (err, result) => {
					callback(err, result)
				})
		},
		rootUserSettings: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.execute("spAccountSettingsGet", (err, result) => {
					callback(err, result)
				})
		},
		rootUserSessions: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.execute("spAccountSessionsGet", (err, result) => {
					callback(err, result)
				})
		},
		rootUsersAll: (params, callback) => {
			pool.request()
				.execute("spAccountsGetAll", (err, result) => {
					callback(err, result)
				})
		},
		chatMessagesLoad: (params, callback) => {
			var dbEarlier = params.earlier ? "earlier" : "later"
			var dbWhen = params.when === "now" ? null : params.when
			pool.request()
				.input("EarlierOrLater", sql.VarChar, dbEarlier)
				.input("Room", sql.VarChar, params.room)
				.input("When", sql.DateTime, dbWhen)
				.execute("dbo.spChatLoad", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		chatMessageAuditLoad: (params, callback) => {
			pool.request()
				.input("MessageId", sql.Int, params.messageId)
				.query("select * from ChatMessageAudit where MessageId = @MessageId order by AuditDate", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		chatAccountsLoad: (params, callback) => {
			pool.request()
				.query("select AccountPermaId, CustomId, DisplayName, ColorChoiceId from Accounts", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		chatHotMessagesLoad: (params, callback) => {
			var asOf = params.asOf === "now" ? null : params.asOf
			var asOfNow = params.asOf === "now" ? 1 : 0
			pool.request()
				.input("AsOf", sql.DateTime, asOf)
				.input("AsOfNow", sql.Int, asOfNow)
				.input("Room", sql.VarChar, params.room)
				.execute("dbo.spChatHotMessagesGet", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		chatRoomsLoad: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.VarChar, permaid)
				.execute("dbo.spChatRoomsLoad", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		chatStarsLoad: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.execute("dbo.spChatStarsGet", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		chatKrisbotResponsesGet: (params, callback) => {
			pool.request()
				.execute("dbo.spChatKrisbotResponsesGet", (err, result) => {
					callback(err, { recordset: result })
				})
		},
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
		mcmPlayerInfoForSim: (params, callback) => {
			dbmcm.request()
				.input("PlayerId", sql.Int, params.playerId)
				.input("PlayerName", sql.VarChar, params.playerName)
				.execute("PlayerInfoForSim", (err, result) => {
					callback(err, { recordset: result })
				})
		},
		mcmForMatchmaking: (params, callback) => {
			dbmcm.request()
				.query("select * from Players; select * from GameServers", (err, result) => {
					callback(err, { recordset: result })
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
		helpPageGet: (params, callback) => {
			pool.request()
				.input("URLName", sql.VarChar, params.helpUrl)
				.execute("spHelpGetPage", (err, result) => {
					callback(err, { recordset: result })
				})
		},
	},
	procedure: {
		serverPageLoadAudit: (params, callback) => {
			pool.request()
				.input("AccountPermaId", sql.Int, params.permaid)
				.input("IPAddress", sql.VarChar, params.ip)
				.input("PageRequested", sql.VarChar, params.page)
				.input("SessionId", sql.VarChar, params.sid)
				.execute("dbo.spPageLoadInsert")
				// don't care whether it succeeds or not
		},
		rootUserAchievementAcknowledge: (params, callback) => {
			pool.request()
				.input("AccAchieveId", sql.Int, params.accAchieveId)
				.execute("spAccountAchievementMarkSeen", (err, result) => {
					callback(err, result)
				})
		},
		rootUserDestroySession: (params, callback) => {
			pool.request()
				.input("SessionId", sql.VarChar, params.sid)
				.execute("spAccountSessionDestroy", (err, result) => {
					callback(err, result)
				})
		},
		rootUserChangeDisplayName: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("SettingType", sql.VarChar, "displayName")
				.input("ChangeTo", sql.VarChar, params.displayName)
				.execute("spAccountUpdateSettings", (err, result) => {
					callback(err, result)
				})
		},
		rootUserChangeUserId: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("SettingType", sql.VarChar, "userId")
				.input("ChangeTo", sql.VarChar, params.userId)
				.execute("spAccountUpdateSettings", (err, result) => {
					callback(err, result)
				})
		},
		rootUserChangePassword: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			var obf = helpers.obfuscateV1(permaid, params.password)
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("SettingType", sql.VarChar, "password")
				.input("ChangeTo", sql.NVarChar, obf)
				.execute("spAccountUpdateSettings", (err, result) => {
					callback(err, result)
				})
		},
		rootUserChangeColor: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("SettingType", sql.VarChar, "color")
				.input("ChangeTo", sql.VarChar, params.color)
				.execute("spAccountUpdateSettings", (err, result) => {
					callback(err, result)
				})
		},
		rootUserChangelogAcknowledge: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("ChangeId", sql.Int, params.changeId)
				.execute("spChangelogMarkSeen", (err, result) => {
					callback(err, result)
				})
		},
		rootUserChangeAboutme: (params, callback) => {
			var sanitized = helpers.sanitizeSensitiveHtml(params.aboutMe)
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("NewAboutMe", sql.VarChar, sanitized)
				.execute("spAccountUpdateAboutme", (err, result) => {
					callback(err, result)
				})
		},
		chatSend: (params, callback) => {
			var contentHtml = (typeof params.contentHtml === "string" ? params.contentHtml : content)
			pool.request()
				.input("Room", sql.VarChar, params.room)
				.input("Sender", sql.VarChar, params.from)
				.input("Message", sql.VarChar, params.content)
				.input("ContentHTML", sql.VarChar, contentHtml)
				.input("MessageType", sql.VarChar, "Message")
				.input("ExtraJSON", sql.VarChar, null)
				.execute("dbo.spChatSend", (err, result) => {
					callback(err, result)
				})
		},
		chatStarMessage: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("MessageId", sql.Int, params.messageid)
				.execute("spChatStarMessage", (err, result) => {
					callback(err, result)
				})
		},
		chatReact: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			if (typeof params.messageId !== "number" || typeof params.reaction !== "string") {
				callback("Invalid parameters", null)
				return
			}

			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("MessageId", sql.Int, params.messageid)
				.input("Reaction", sql.VarChar, params.reaction)
				.execute("spChatReact", (err, result) => {
					callback(err, result)
				})
		},
		chatKrisbotResponseCrud: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("ResponseId", sql.Int, params.responseId)
				.input("LookFor", sql.VarChar, params.lookFor)
				.input("RespondWith", sql.VarChar, params.respondWith)
				.input("AccountPermaId", sql.Int, permaid)
				.input("Deleted", sql.Int, params.deleted)
				.execute("spChatKrisbotResponseCrud", (err, result) => {
					callback(err, result)
				})
		},
		chatRoomChangeDescription: (params, callback) => {
			var sanitized = helpers.sanitizeSensitiveHtml(params.description)
			pool.request()
				.input("Room", sql.VarChar, params.room)
				.input("NewDescription", sql.VarChar, sanitized)
				.execute("spChatRoomChangeDescription", (err, result) => {
					callback(err, result)
				})
		},
		chatRoomJoin: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("Room", sql.VarChar, params.room)
				.execute("spChatRoomJoin", (err, result) => {
					callback(err, result)
				})
		},
		chatRoomLeave: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("Room", sql.VarChar, params.room)
				.execute("spChatRoomLeave", (err, result) => {
					callback(err, result)
				})
		},
		chatRoomArchive: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("Room", sql.VarChar, params.room)
				.execute("spChatRoomArchive", (err, result) => {
					callback(err, result)
				})
		},
		chatRoomUnarchive: (params, callback) => {
			permaid = typeof params.session.userData.permaid === "undefined" ? null : params.session.userData.permaid
			pool.request()
				.input("AccountPermaId", sql.Int, permaid)
				.input("Room", sql.VarChar, params.room)
				.execute("spChatRoomUnarchive", (err, result) => {
					callback(err, result)
				})
		},
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