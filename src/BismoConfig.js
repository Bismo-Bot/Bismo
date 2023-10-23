/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/

const ConfigItem = require('./ConfigItem.js');
const Version = require('./Version.js');


/**
 * Config item
 */
class BismoConfig extends ConfigItem {
	/**
	 * @type {string}
	 * Discord bot token.
	 */
	discordToken = "";

	/**
	 * @type {string}
	 * The activity to display the bot is doing on Discord.
	 * (If in developer/debug mode, this is at the end of the current version string, like: DevBuild 0.0.0-debug+MyBuildTag)
	 */
	discordActivity = "";

	/**
	 * Encryption settings
	 * @typedef {object} EncryptionDescriptor
	 * @property {boolean} enabled - Whether or not encryption is enabled (and we'll encrypt files on save)
	 * @property {boolean} active - Unused reserved property.
	 * @property {number} newKeyLength - Length newly generated encryption keys should be (keys we create)
	 */

	/**
	 * Encryption settings
	 * @type {EncryptionDescriptor}
	 */
	encryption = {
		enabled: false,
		active: false,
		newKeyLength: 64,
	}


	/**
	 * @param {ConnectionManager} configManager ConfigurationManager instance
	 * @param {string} fileName The path to the config file
	 * @return {BismoConfig}
	 */
	constructor(configManager, fileName) {
		super(configManager, fileName);
		this.LoadSync();
	}

	/**
	 * @inheritdoc
	 */
	ToJSON() {
		let JSONObject = super.ToJSON();
		JSONObject["version"] = this.version.toString();
		JSONObject["encryption"] = this.encryption;

		JSONObject["discordToken"] = this.discordToken;
		JSONObject["discordActivity"] = this.discordActivity;

		return JSONObject;
	}

	/**
	 * @inheritdoc
	 */
	FromJSON(JSONObject) {
		if (typeof JSONObject !== "string" && typeof JSONObject !== "object")
			throw new TypeError("JSONObject expected string or object got " + (typeof JSONObject).toString());
		
		if (typeof JSONObject === "string")
			JSONObject = JSON.parse(JSONObject);

		if (JSONObject["version"] !== undefined)
			this.version = new Version(JSONObject["version"]);

		if (JSONObject["encryption"] !== undefined)
			this.encryption = JSONObject["encryption"];

		if (typeof JSONObject["discordToken"] === "string")
			this.discordToken = JSONObject["discordToken"];
		if (typeof JSONObject["discordActivity"] === "string")
			this.discordActivity = JSONObject["discordActivity"];
	}
}

module.exports = BismoConfig;