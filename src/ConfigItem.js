/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/

// const ConfigurationManager = require('./ConfigurationManager.js');
const { Logger } = require('./LogMan');
const Version = require('./Version');

/**
 * Config item
 */
class ConfigItem {
	/**
	 * Config file version
	 * @type {Version}
	 */
	version = new Version(1,1,0);



	/** @type {ConfigurationManager} */
	#configManager;

	/** @type {Logger} */
	log;

	/**
	 * Name of the config file
	 * @type {string}
	 */
	#fileName = "";

	/**
	 * Indicates that the file is still open
	 * @type {boolean}
	 */
	#isAlive = true;
	
	/**
	 * Indicates that the config is still open
	 * @return {boolean}
	 */
	get IsAlive() {
		return this.#isAlive;
	}

	


	/**
	 * @param {ConfigurationManager} configManager ConfigurationManager instance
	 * @param {string} fileName The path to the config file
	 * @return {ConfigItem}
	 */
	constructor(configManager, fileName) {
		if (typeof fileName !== "string")
			throw new TypeError("fileName expected string got " + (typeof fileName).toString());

		if (!fileName.endsWith(".json"))
			fileName += ".json"

		this.#fileName = fileName;
		this.#configManager = configManager;

		this.log = global.LogMan.getLogger("Config-" + fileName);

		// load
		this.LoadSync();
	}

	/**
	 * @param {boolean} save Save the file on close .. no reason to call this really.
	 * @return {void}
	 */
	Close(save) {
		if (!this.#isAlive)
			return;

		this.log.debug("closing configuration file.");

		if (save === true)
			this.Save();

		this.#isAlive = false;
		
		this.#configManager.RemoveConfigItemFromCache(this)
	}

	/**
	 * Reads the config file from disk and sets the contents
	 * @return {void}
	 */
	Load() {
		this.Read().then((data) => {
			this.FromJSON(data);
		});
	}
	/**
	 * Reads the config file from disk (synchronously) and sets the contents
	 * @return {void}
	 */
	async LoadSync() {
		let data = this.ReadSync()
		this.FromJSON(data);
	}
	
	/**
	 * Read the configuration from disk
	 * @return {Promise<string>} Load successful
	 */
	Read() {
		return new Promise((resolve, reject) => {
			this.#configManager.ReadFileContents(this.#fileName).then((data) => {
				resolve(data);
			}).catch(err => {
				this.log.error("Error loading, message: " + err.message, false);
				this.log.error("Stack: " + err.stack, false);
				reject(err);
			});
		});
	}
	/**
	 * Read the configuration from disk (synchronously)
	 * @return {string} Config file data
	 */
	ReadSync() {
		return this.#configManager.ReadFileContentsSync(this.#fileName);
	}
	
	/**
	 * Save the configuration
	 * @return {Promise<boolean>}
	 */
	Save() {
		if (this.#isAlive) {
			this.log.debug("Saving");
			return this.#configManager.WriteFileContents(this.ToString(), this.#fileName);
		}
		else {
			this.log.warn("Failed to save, config file closed and not active.", false);
			//throw new Error("Config file closed, not active.");
		}
	}
	
	/**
	 * Save the configuration
	 * @return {boolean}
	 */
	SaveSync() {
		if (this.#isAlive) {
			this.log.silly("Saving");
			return this.#configManager.WriteFileContentsSync(this.ToString(), this.#fileName);
		}
		else {
			this.log.warn("Failed to save, config file closed and not active.", false);
			//throw new Error("Config file closed, not active.");
		}
	}
	

	/**
	 * Returns the configItem's file path
	 * @return {string}
	 */
	GetFileName() {
		return this.#fileName;
	}
	/**
	 * Sets the configItem's file path (does not rename it!)
	 * Use rename(fileName) to rename the file
	 * @param {string} fileName
	 */
	SetFileName(fileName) {
		if (typeof fileName !== "string")
			throw new TypeError("fileName expected string got " + (typeof fileName).toString());
		this.#fileName = fileName;
	}


	/**
	 * Return JSON stringifying version of this config item
	 * @return {string}
	 */
	ToString() {
		let str = JSON.stringify(this.ToJSON());
		return (str !== undefined && str !== "")? str : "{}";
	}

	/**
	 * Get a sterilized version of this config item
	 * @return {object}
	 */
	ToJSON() {
		return {
			version: this.version
		};
	}

	/**
	 * Set config properties using provided json
	 * @param {(string|object)} JSONObject JSON interpretation of the configuration 
	 * @return {void}
	 */
	FromJSON(JSONObject) {
		if (typeof JSONObject !== "string" && typeof JSONObject !== "object")
			throw new TypeError("JSONObject expected string or object got " + (typeof JSONObject).toString());
		
		if (typeof JSONObject === "string")
			JSONObject = JSON.parse(JSONObject);

		this.log.silly("fromJSON(): " + JSONObject);

		if (JSONObject["version"] !== undefined)
			this.version = JSONObject["version"];
	}

	/**
	 * Deletes the config file from the system.
	 */
	Delete() {
		this.#configManager.Delete(this)
	}

	/**
	 * Renames the config file
	 * @param {string} fileName - New file name
	 */
	Rename(fileName) {
		this.#configManager.Rename(this, fileName, false);
	}
}

module.exports = ConfigItem;