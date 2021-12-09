/**
 * Advance Argument Parser for Discord messages
 * @class
 */
class ArgumentParser {
	/**
	 * The processed arguments dictionary
	 * @property {object} arguments
	 */
	arguments = {};

	/**
	 * ArgumentParser version
	 * @property {Version} version
	 */
	version = {
		major: 1,
		minior: 0
	};

	/**
	 * ArgumentParser (ArgParse)
	 * 
	 * Pass message arguments (an array of strings, if you split the message arguments on spaces these string represent words)
	 * 
	 * This takes message arguments and puts them into an dictionary, argument name as the key and its value as ... its value
	 *
	 * AAP recognizes strings and can even convert to JSON
	 * 
	 * `-` indicates a new argument pair, the next string will become its value (unless the next string is another new argument, in which case this argument just becomes true)\
	 * a `"` at the beginning of a new value indicates a string, so until we reach a `"` at the end of a word everything is treated as one big string\
	 * a `".json` at the end of a string indicates that the string we just processed is actual a JSON string, and we will try to parse this string as JSON (if it fails, we move on)
	 *
	 * @constructor
	 * @param {string[]} args The message arguments
	 */
	constructor(args) {
		let inString = false;
		let inArgument = false;
		let convertToJSON = false;
		let currentArg = "";
		for (var i = 0; i<args.length; i++) {
			if (inString) {
				if (args[i].endsWith(`"`)) {
					inString = false;
					inArgument = false;
					args[i] = args[i].replace(/\"$/,''); // Drop the last "
				}
				else if (args[i].endsWith(`".json`)) {
					inString = false;
					inArgument = false;
					convertToJSON = true;
					args[i] = args[i].replace(/(\".json)$/,''); // Drop the last "
				}
				this.arguments[currentArg] += " " + args[i];

				if (convertToJSON) {
					convertToJSON = false;
					try {
						this.arguments[currentArg] = JSON.parse(this.arguments[currentArg]);
					} catch {
						dlog("Error phrasing some argument JSON. (who's doing this?)");
					}
				}
			} else {
				if (args[i].startsWith(`"`))
					inString = true;

				if (inArgument) {
					if (args[i].startsWith("-")) {
						inArgument = false;
						if (this.arguments[currentArg] == undefined)
							this.arguments[currentArg] = true;
					} else {
						let value = args[i].replace(/^\"/,''); // Drop leading "
						// Try basic type conversion (if int, convert. if boolean, convert)
						if (!inString) {
							inArgument = false;
							if (value.toLowerCase().startsWith("false")) {
								value = false;
							} else if (value.toLowerCase().startsWith("false")) {
								value = true;
							} else if (!isNaN(value)) {
								// A number
								value = parseInt(value);
							}
						}

						this.arguments[currentArg] = value;
						continue;
					}
				}

				currentArg = args[i].replace(/^[\-]+/, ''); // Replaces all leading hyphens
				inArgument = true;

				continue;
			}
		}
	}

	/**
	 * Returns the value of an argument
	 * @param {string} argumentName
	 * @returns {(string|boolean|number|JSON)} The argument's value
	 */
	GetArgument(argumentName) {
		return this.arguments[argumentName];
	}

	/**
	 * Returns whether or not an argument was presented in the command
	 * @param {string} argumentName
	 * @returns {boolean}
	 */
	IsPresent(argumentName) {
		return (this.argumentName[argumentName] != undefined);
	}
}

module.exports = ArgumentParser;