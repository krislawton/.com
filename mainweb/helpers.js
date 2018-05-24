// Module for parsing DOM
const jsdom = require("jsdom")
const { JSDOM } = jsdom;

// Exportations
module.exports = {
	// Sanitizes HTML strings of things like scripts and iframes
	sanitizeSensitiveHtml: (toSanitize) => {
		var tags = ["script", "iframe"]

		for (i in tags) {
			var maxIterations = 2000
			while (maxIterations > 0 && tagLocations(tags[i], toSanitize)) {
				var tagLocs = tagLocations(tags[i], toSanitize)
				// Remove substring of tag from string using array
				var splicing = toSanitize.split("")
				splicing.splice(tagLocs.startOffset, tagLocs.endOffset - tagLocs.startOffset)
				toSanitize = splicing.join("")

				maxIterations--
			}
		}

		function tagLocations(tag, domString) {
			var domObj = new JSDOM(domString, { includeNodeLocations: true })
			var document = domObj.window.document
			if (document.querySelector(tag)) {
				return domObj.nodeLocation(document.querySelector(tag))
			} else {
				return null
			}
		}

		var out = toSanitize
		return out
	},
	// Custom chat markup
	/**
	 * Returns an obfuscated string based on seed and input. Reversible using unobfuscate.
	 * @param {int} seed The seed linked to the obfuscation. This is needed to reverse the obfuscation
	 * @param {string} input The text to be obfuscated
	 */
	obfuscateV1: (seed, input) => {
		var seedsalt = ''
		var out = ''
		seed += 30

		// Generate seed salt
		var seedPow = [0.61, 0.55, 0.39, 0.21, 0.95, 0.86, 0.45, 0.46, 0.56, 0.63, 0.77]
		for (var i = 1; i <= 11; i++) {
			var transforming = Math.pow(seed, seedPow[i - 1])
			transforming = transforming % 1
			transforming = transforming * 1000000
			transforming = Math.round(transforming)
			transforming = "" + transforming
			transforming = ('000000' + transforming).substring(transforming.length)
			seedsalt += "" + transforming
		}

		// From seed, get an array of values to add
		var adders = []
		var adderMod = 3 + parseInt(seedsalt.substring(0, 2)) % 17
		for (var i = 0; i < adderMod; i++) {
			// Values slightly overlap (e.g. 123, 345, 567)
			var start = 2 + i * 2
			var adder = parseInt(seedsalt.substring(start, start + 3))
			adders.push(adder)
		}

		// Take each char, obfuscate by adding unicode value from adders
		var splitted = input.split("")
		var obfuscated = ''
		for (i in splitted) {
			var unicodeBefore = (splitted[i]).charCodeAt(0)
			var unicodeBlock = Math.floor(unicodeBefore / 1000) * 1000
			var toAdd = adders[i % adders.length]
			var unicodeAfter = unicodeBlock + (unicodeBefore + toAdd) % 1000
			obfuscated += String.fromCharCode(unicodeAfter)
		}

		return obfuscated
	},
	/**
	 * Returns unobfuscated string based on seed and a previously-obfuscated input.
	 * @param {int} seed The seed linked to the obfuscation. This needs to be the same as when the text was obfuscated.
	 * @param {string} input The text to be unobfuscated
	 */
	unobfuscateV1: (seed, input) => {
		var seedsalt = ''
		var out = ''
		seed += 30

		// Generate seed salt
		var seedPow = [0.61, 0.55, 0.39, 0.21, 0.95, 0.86, 0.45, 0.46, 0.56, 0.63, 0.77]
		for (var i = 1; i <= 11; i++) {
			var transforming = Math.pow(seed, seedPow[i - 1])
			transforming = transforming % 1
			transforming = transforming * 1000000
			transforming = Math.round(transforming)
			transforming = "" + transforming
			transforming = ('000000' + transforming).substring(transforming.length)
			seedsalt += "" + transforming
		}

		// From seed, get an array of values to add
		var adders = []
		var adderMod = 3 + parseInt(seedsalt.substring(0, 2)) % 17
		for (var i = 0; i < adderMod; i++) {
			// Values slightly overlap (e.g. 123, 345, 567)
			var start = 2 + i * 2
			var adder = parseInt(seedsalt.substring(start, start + 3))
			adders.push(adder)
		}

		// Take each char, unobfuscate by removing unicode value from adders
		var splitted = input.split("")
		var unobfuscated = ''
		for (i in splitted) {
			var unicodeBefore = (splitted[i]).charCodeAt(0)
			var unicodeBlock = Math.floor(unicodeBefore / 1000) * 1000
			var toAdd = adders[i % adders.length]
			var unicodeAfter = unicodeBlock + (unicodeBefore + 1000 - toAdd) % 1000
			unobfuscated += String.fromCharCode(unicodeAfter)
		}

		return unobfuscated
	},
}