function dataField(input) {
	this.show = (typeof input === "object" && typeof input.show === "boolean" ? input.show : false)
	this.title = (typeof input === "object" && typeof input.title === "string" ? input.title : null)
	this.format = (typeof input === "object" && typeof input.format === "string" ? input.format : null)
	this.loadAnyway = (typeof input === "object" && typeof input.loadAnyway === "boolean" ? input.loadAnyway : false)
}

module.exports = {
	mcmLeaderboard: function() {
		this.PlayerId = new dataField({ loadAnyway: true })
		this.Leaderboard = new dataField({ show: true })
		this.Name = new dataField({ show: true })
		this.MMR = new dataField({ show: true })
		this.Played = new dataField()
		this.Won = new dataField()
		this.Lost = new dataField()
		this.WinPercent = new dataField()
		this.GoalsScored = new dataField()
		this.GoalsConceeded = new dataField()
		this.GoalDifference = new dataField()
		this.CreatedDate = new dataField()
		this.FirstMatch = new dataField()
		this.LastMatch = new dataField()
	},
	mcmPlayerMatches: function () {
		this.PlayerId = new dataField()
		this.MatchDate = new dataField({ show: true, format: "datetime short" })
		this.Team1 = new dataField()
		this.Goals1 = new dataField({ show: true })
		this.Goals2 = new dataField({ show: true })
		this.Team2 = new dataField({ show: true, title: "Opponent" })
		this.Result = new dataField({ show: true })
		this.NewMMR = new dataField({ show: true, title: "MMR" })
		this.MMRDifferential = new dataField({ show: true, title: "Diff" })
		this.MMRChange = new dataField({ show: true, title: "Change" })
	},
}