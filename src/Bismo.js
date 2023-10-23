/*

		____  _					
	   / __ )(_)________ ___  ____ 
	  / __  / / ___/ __ `__ \/ __ \
	 / /_/ / (__  ) / / / / / /_/ /
	/_____/_/____/_/ /_/ /_/\____/  Discord Bot Platform

	v3

*/


const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

/** @return {string[]} */
const getDirs = p => fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isDirectory())
const getFiles = p => fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isFile())

const DataDirectory = global.DataDirectory;
const GuildDataDirectory = global.GuildDataDirectory;
const LogsDirectory = global.LogsDirectory;
const PluginsDirectory = global.PluginsDirectory;


const Discord = require('discord.js');


const lm = require("./LogMan.js");
const LogMan = lm.LogMan;
const Logger = lm.Logger;
const util = require('node:util');
const Version = require("./Version.js");

// Configuration
const ConfigurationManager = require("./ConfigurationManager.js");
const BismoConfig = require("./BismoConfig.js");
const GuildConfig = require('./GuildConfig.js');


// Discord interactions (slash commands)
const InteractionManager = require("./InteractionManager.js");

// Messages
const ArgumentParser = require('./ArgumentParser.js');

// Discord voice channel helpers
const vm = require("./VoiceManager.js");
const VoiceManager = vm.VoiceManager;
const BismoVoiceChannel = vm.BismoVoiceChannel;
const BismoAudioPlayer = vm.BismoAudioPlayer;

const Permissions = require("./Permissions.js");


class EmitterLogger extends require('events') {
	#name;
	constructor(name) { super(); this.#name = name; }
	emit(type, ...args) {
		try {
			global.appLog.debug("Event Bismo.events." + this.#name + "@" + type + " fired | " + util.inspect(arguments, {depth: 1}), false);
			super.emit(type, ...args);
		} catch (err) {
			global.appLog.error(`Failed to emit ${this.#name}, error:`);
			global.appLog.error(err);
		}
	}
}

class Bismo {
	/** @type {Logger} */
	#log;
	get Log() {
		return this.#log;
	}

	/**
	 * @type {Discord.Client}
	 * The Discord bot client.
	 */
	#client;
	get Client() {
		return this.#client;
	}

	/**
	 * @type {Map<string, Plugin>}
	 * 
	 */
	#plugins = new Map();
	
	/**
	 * @type {Map<string, Command>}
	 * Command mappings
	 */
	#commands = new Map();
	get Commands() {
		return this.#commands;
	}

	/**
	 * @type {string}
	 *  we have to wait until after the bot logins to register slash commands!
	 */
	#awaitingRegister = []; // This array will contain the commands that need to be registered



	/**
	 * @type {Version}
	 * Bismo bot version
	 */
	get Version() {
		return global.Version;
	}

	/**
	 * Whether the bot is running on top of Windows.
	 */
	get IsWin() {
		return process.platform === "win32";
	}
	/**
	 * @type {boolean}
	 * Whether the bot is running in developer mode or not.
	 */
	get Debug() {
		return process.env.debug === true;
	}

	/** @type {LogMan} */
	get LogMan() {
		return global.LogMan;
	}

	/**
	 * @type {string[]}
	 * An array of user's and the text channel we're waiting for replies for.
	 * This is to prevent default command processing for a user in a given text channel.
	 * The values here are the user's id and the text channel id concatenated and sha1'd. 
	 */
	WaitingForReply = [];

	/**
	 * @type {ConfigurationManager}
	 * Bot configuration manager.
	 */
	ConfigurationManager;
	
	Events = {
		/**
		 * Discord events, such as guild joins or messages/commands.
		 */
		discord: new EmitterLogger("discord"),

		/**
		 * Bot events, such as shutting down.
		 */
		bot: new EmitterLogger("bot")
	};

	/**
	 * Whether Bismo is currently shutting down or not.
	 * @type {boolean}
	 */
	ShuttingDown = false;



	/**
	 * @type {BismoConfig}
	 * Bot configuration
	 */
	Config;


	/**
	 * @type {InteractionManager}
	 * Bismo InteractionManager.
	 */
	InteractionManager;
	/**
	 * @type {VoiceManager}
	 * Bismo VoiceManager.
	 */
	VoiceManager;


	// Permissions
	Permissions = new Permissions(); // yep



	/**
	 * @param {Discord.Client} client - The Discord client.
	 * @param {string} encryptionKey - Configuration files encryption key.
	 */
	constructor(client, configurationManager) {
		this.#log = global.LogMan.getLogger("Bismo");
		this.#log.info("Bonjour!");

		this.ConfigurationManager = configurationManager;
		this.Config = this.ConfigurationManager.LoadConfig("Bismo.json", BismoConfig, true);

		this.#client = client;
		this.InteractionManager = new InteractionManager(this.#client, this.Config.discordToken);
		this.VoiceManager = new VoiceManager(this.#client, this);

		/**
		 * @event Bismo.events.bot#shutdown
		 * @type {object}
		 * @property {number} shutdownTimeout - Amount of time to wait before shutting down completely.
		 */
		this.Events.bot.on('shutdown', (shutdownTimeout) => {
			if (this.ShuttingDown)
				return;

			this.#log.info("Shutdown signal received, shutting down in " + (shutdownTimeout/1000) + " seconds.");
			this.ShuttingDown = true;

			setTimeout(()=>{
				this.Config.SaveSync();
				this.#log.info("Goodbye world!");
				process.exit(0);
			}, shutdownTimeout);
		});
	}

	// Guild

	/**
	 * Gets the configuration for a guild. This includes the user's permissions.
	 * @param {string} guildId - The guild to look up.
	 * @return {GuildConfig}
	 */
	GetGuildConfig(guildId) {
		if (guildId instanceof GuildConfig) // ??
			return guildId;

		/** @type {GuildConfig} */
		let guildConfig = this.ConfigurationManager.LoadConfig(guildId, GuildConfig);
		guildConfig.id = guildId;

		new Promise(async (resolve,reject) => {
			let guildData = await guildConfig.GetDiscordObject();
			guildConfig.name = guildData.name;
			guildConfig.owner = guildData.ownerId;
			if (guildConfig.IsAlive && guildConfig != undefined) // stuff can change
				guildConfig.SaveSync();

			resolve();
		}).catch((err) => {
			this.Log.warn("Unable to update the guild config data for " + guildId);
			this.log.debug(err);
		});

		return guildConfig;
	}

	/**
	 * Loads the guild configuration files into memory.
	 * @returns {void} If resolved, all guilds are loaded.
	 */
	LoadGuilds() {
		try {
			let me = this;
			function completed() {
				// completed
				if (me.Debug) {
					me.#client.user.setActivity("V" + me.Version.toString() + " - " + me.Config.discordActivity);
				} else {
					me.#client.user.setActivity(me.Config.discordActivity);
				}
				me.#log.info("Loaded.");
				me.Events.discord.emit("ready", me.#client);
			}

			let count = 0;
			let guildFiles = getFiles(GuildDataDirectory);
			this.#log.info(`Loading ${guildFiles.length} guilds`);

			if (guildFiles.length == 0)
				completed();

			guildFiles.forEach((guildId) => {
				/** @type {GuildConfig} */
				let guild = this.ConfigurationManager.LoadConfig(guildId, GuildConfig);
				this.#log.silly(`Loading ${guildId}`);
				guild.GetDiscordObject().then(guildObject => {
					count++;

					// Setup the guild
					let BismoPacket = {
						guildId: guild.id, 					// The guild ID
						DiscordGuildObject: guildObject, 	// Discord guild object
						BismoGuildObject: guild, 			// The guild account
					};

					/**
					 * Guild Discovered event
					 * 
					 * @event Bismo.Bot#guildDiscovered
					 * @type {object}
					 * @property {string} guildId - ID of the guild discovered
					 * @property {Discord.Guild} guild - Discord guild object of discovered guild
					 * @property {GuildAccount} bismoGuildObject - Bismo GuildAccount object of discovered guild
					 */
					this.Events.discord.emit('guildDiscovered', BismoPacket);

					if (count >= guildFiles.length) {
						completed();
					}
				});
			});
		} catch (err) {
			this.#log.error("Failed to load guilds!");
			this.#log.error(err);
		}
	}


	/**
	 * GetUserReplyOptions for GetUserReply function
	 * @typedef {object} BismoGetUserReplyOptions
	 * @property {string} cancelCommand What a user must type in order to dismiss and cleanup the listener.
	 * @property {any} filter The filter passed to the Discord.MessageCollector, default to m=>m.author.id === id (only accept messages with the user's ID)
	 * @property {any} options Further options passed to the Discord.MessageCollector
	 */

	 /**
	  * GetUserReplyResponse for GetUserReply function
	  * @typedef {object} BismoGetUserReplyResponse
	  * @property {string} message - Unaltered text provided by the user.
	  * @property {string} authorId - The id of the user that sent the message, (you should already know this).
	  * @property {Discord.Message} discordMessage - Discord message item
	  * @property {string[]} args - The user's message split by white space and without the first word.
	  * @property {ArgumentParser} arguments - The argument parser helper class.
	  */

	/**
	 * Gets a user's next message from a channel given the `channelId`.
	 * 
	 * When called, the user's next message will be resolved and processed without any alterations.
	 * Sorta, the data you get back will include the original message `message`, the message split up by white space `args`, the argument parsers `arguments`.
	 * The bot's prefix is not required, this will grab the user's next message.
	 * 
	 * @param {string} userId Discord user ID of the person you're waiting for a reply from
	 * @param {string} channelId Discord channel ID you're waiting for a reply in
	 * @param {BismoGetUserReplyOptions} options Additional options passed to the Discord.MessageCollector
	 * 
	 * @return {Promise<Discord.Message>} Promise object that represents the user's reply.
	 */
	GetUserReply(userId, channelId, options) {
		if (options == undefined)
			options = {};

		if (options.cancelCommand == undefined || options.cancelCommand == "")
			options.cancelCommand == "!~cancel"

		let me = this;
		if (!Array.isArray(this.WaitingForReply))
			this.WaitingForReply = [];
		return new Promise((resolve, reject) => {
			let wFRID = crypto.createHash('sha1').update(userId + channelId).digest('base64');
			me.WaitingForReply.push(wFRID); // So we can ignore the reply in the main bot message handler

			if (options.filter ==  undefined)
				options.filter =  m => m.author.id === userId; // Sets our filter to only accept messages from the user with $ID

			let collector = new Discord.MessageCollector(channelId, options.filter, options.options);
			collector.on('collect', msg => { 
				collector.stop(); // Stop collection

				let i = me.WaitingForReply.indexOf(wFRID);
				if (i>-1)
					me.WaitingForReply.splice(i,1); // Remove user from WaitingForReply list

				if (msg.content === options.cancelCommand) {
					msg.channel.send({content: "Canceled."})
					collector.stop("Canceled by user");
					reject();

				} else {
					msg.args = msg.content.trim().split(/ +/g); // I lied we at least split things up into an array
					collector.stop("Response collected.");
					resolve(msg); // Resolve
				}
			});
		});
	}



	/**
	 * @typedef {function} GetUserReplyFunction
	 * @param {string} prompt The prompt to give users (We append the message `Type <options.cancelCommand> to cancel.`)
	 * @param {BismoGetUserReplyOptions} options Additional options passed to the Discord.MessageCollector
	 * @return {Promise<BismoGetUserReplyResponse>} Promise object that represents the user's reply.
	 */

	/**
	 * @typedef {function} Reply
	 * @param {string} msg Message to send
	 * @return {string} Message id
	 */

	/**
	 * @typedef {function} Done
	 * @return {void}
	 */

	/**
	 * @typedef {object} BismoCommandExecuteData
	 * 
	 * @property {Reply} Reply - Method used to send a reply back to the user (chat commands: sends a message in the same channel, slash commands: sends a follow up message to the user).
	 * @property {Done} End - Method used to signify Bismo has stopped thinking / processing this command. All this essentially does is remove "is typing".
	 * @property {GetUserReplyFunction} GetReply - This is a wrapper for the Bismo.getUserReply() function. Allows you to collect a single response from the author in chat.
	 * 
	 * @property {string} authorId - User id.
	 * @property {string} guildId - Discord guild id.
	 * @property {boolean} inGuild - Command executed inside a guild?
	 * @property {GuildConfig} guildConfig - Bismo guild configuration (special container for the guild, holds guild specific data).
	 * 
	 * @property {string} alias - Which command was executed.
	 * @property {string[]} args - The parameters for the command (We automatically phrase this for you, in both chat and slash commands).
	 * @property {ArgumentParser} parser - The more advance argument parser.
	 * 
	 * @property {Discord.User} author - User object that executed the command.
	 * @property {Discord.Guild} guild - Discord guild object.
	 * @property {Discord.TextChannel} channel - Channel object the message was sent over.
	 * @property {string} channelId - Channel id the command was executed in.
	 * @property {Discord.Message} [message] - Message object (chat command).
	 * @property {Discord.Interaction} [interaction] - Interaction object (slash command / message interaction).
	 * @property {boolean} isInteraction - Whether or not this was an interaction (slash command / message interaction).
	 * 
	 * @property {object} additionalData - Additional data that can be used by other command interpreters (such as Steam) to insert unique data (such as Steam chat ids)
	 */

	/**
	 * @typedef {function} CommandHandler
	 * @param {BismoCommandExecuteData} executeData - Command execution data.
	 * @return {void}
	 */

	/**
	 * @typedef {BismoCommandOptions} Command
	 * @property {CommandHandler} handler - Command command
	 */

	/**
	 * @typedef {object} BismoCommandOptions
	 * 
	 * @property {string} friendlyName Friendly name of the command (defaults to provided alias)
	 * @property {string} description A description of the command (defaults to "No description provided")
	 * @property {string} [helpMessage] Message display in the bot's help command (/bismohelp) (defaults to description)
	 * 
	 * @property {boolean} [slashCommand = false] Registers the command as a slash command on Discord. (default: false)
	 * @property {boolean} [chatCommand = true] Command is executed via chat (with the appropriate listener cue (!) prefixing the command) (default: true)
	 *
	 * @property {JSON[]} [slashCommandOptions = []] Slash commands allow you to specify 'options' (parameters). Use this to provide that information. You'll need to do everything manually.
	 * @property {string} [ephemeral = true] Slash commands only. If true only the author can see replies. (default: true)
	 * 
	 * @property {boolean} [usersOnly = true] Command only allow to be called by users (and not bots) (default: true)
	 * @property {boolean} [directChannels = false] Runs in direct message channels (not a guild) (default: false)
	 * @property {boolean} [guildChannels = true] Runs in a guild channel (default: true)
	 * 
	 * @property {string[]} [whitelistGuilds = undefined] Only these guilds can run this command (array)
	 * @property {string[]} [blacklistGuilds = undefined] These guild CAN NOT run this command (array)
	 * @property {string} [hidden = false] - Command not listed (default: false)
	 * 
	 * @property {boolean} [requireParams = true] Parameters are required to run this command. If true and no parameters are provided we display the helpMessage (default: true). Note this has no effect on slash commands.
	 */

	// Registers a command

	/**
	 * Register a command
	 * A command is either text based or a slash command. Text based commands are activated using a prefix or the bot's mention.
	 * Upon a successful command execution, we pass a Bismo.CommandExecuteData object as the first argument to the handler function.
	 * 
	 * @param {string} alias Command name, what users my type to execute your command
	 * @param {function} handler The function called whenever the command gets executed
	 * @param {BismoCommandOptions} options Command options
	 * 
	 * 
	 */
	RegisterCommand(alias, handler, options) {
		if (options == undefined)
			options = {};


		if (this.#commands.has(alias)) {
			this.#log(`[91mFailed to register command "${alias}"! It was already registered.[0m`);
			return false;
		}

		options.friendlyName = options.friendlyName || alias;
		options.description = options.description || "No description provided.";
		options.helpMessage = options.helpMessage || options.description;
		if (typeof options.slashCommand !== "boolean")
			options.slashCommand = false;

		if (typeof options.chatCommand !== "boolean")
			options.chatCommand = true;

		if (typeof options.usersOnly !== "boolean")
			options.usersOnly = false;

		if (typeof options.directChannels !== "boolean")
			options.directChannels = false;

		if (typeof options.guildChannels !== "boolean")
			options.guildChannels = true;

		if (typeof options.hidden !== "boolean")
			options.hidden = false;

		if (typeof options.requireParams !== "boolean")
			options.requireParams = true;

		if (typeof options.ephemeral !== "boolean")
			options.ephemeral = false;

		if (!Array.isArray(options.slashCommandOptions))
			options.slashCommandOptions = [];

		// todo: validate options
		

		alias = alias.match(/^[\w-]{1,32}/g); // https://discord.com/developers/docs/interactions/slash-commands#registering-a-command
		if (alias.length < 0)
			throw new Error("Alias does not match allowed naming scheme.");
		alias = alias[0].toLowerCase();

		// Register the command
		let type = [];
		if (options.chatCommand)
			type.push("chat");
		if (options.slashCommand)
			type.push("slash");


		this.#commands.set(alias, {
			handler: handler,
			friendlyName: options.friendlyName,
			description: options.description,
			helpMessage: options.helpMessage,
			slashCommand: options.slashCommand,
			slashCommandOptions: options.slashCommandOptions,
			chatCommand: options.chatCommand,
			usersOnly: options.usersOnly,
			directChannels: options.directChannels,
			guildChannels: options.guildChannels,
			whitelistGuilds: options.whitelistGuilds,
			blacklistGuilds: options.blacklistGuilds,
			hidden: options.hidden,
			requireParams: options.requireParams,
			ephemeral: options.ephemeral,
		});

		// Add the slash command (if requested)
		if (options.slashCommand) {
			let body = {
				name: alias,
				description: options.description,
				type: "CHAT_INPUT",
				options: options.slashCommandOptions,
			}

			if (this.#client.user != undefined) {
				if (options.whitelistGuilds) {
					this.InteractionManager.RegisterGuildCommand(body, options.whitelistGuilds, true, true)
				} else {
					this.InteractionManager.RegisterGlobalCommand(body, null, true)
				}
			} else {
				this.#awaitingRegister.push(alias);
			}
		}

		this.#log(`[32mNew command (${type}) registered: "${alias}"[0m`);
	}


	// Plugins

	/**
	 * @typedef {function} PluginSetupObjectReadJson
	 * @param {string} name - Name of the json config. This is placed inside the data directory in a special folder for this plugin.
	 */
	/**
	 * @typedef {function} PluginSetupObjectWriteJson
	 * @param {string} data - Data to write to the file.
	 * @param {string} name - Name of the json config. This is placed inside the data directory in a special folder for this plugin.
	 */
	/**
	 * The object provided to all plugins, containing helpful APIs for that plugin (such as reading configuration data).
	 * @typedef {object} PluginSetupObject
	 * @property {Bismo} Bismo - Bismo instance
	 * @property {PluginSetupObjectReadJson} ReadJson
	 * @property {PluginSetupObjectWriteJson} WriteJson
	 * @property {Logger} Log
	 */

	/**
	 * @typedef {object} PluginManifest
	 * @property {string} name - Friendly name of the plugin.
	 * @property {string} packageName - More unique package name, something like `com.bismo.bcommands`.
	 * @property {string} uuid - Unique plugin UUID. Generated by the plugin author.
	 * @property {string} version - Version string for the plugin
	 * @property {string} author - Name of the creator.
	 * @property {string} date - Date of plugin creation
	 */

	/**
	 * @typedef {object} Plugin
	 * @property {function} main - Main entry point for the plugin. Here the plugin will setup itself, register commands, etc. We'll pass PluginSetupObject
	 * @property {PluginManifest} manifest - Plugin data.
	 * @property {object} api - Core plugin api, can be a class, object with functions and properties (..a class), or a single function. 
	 */

	/**
	 * Gets a plugin's API.
	 * 
	 * @param {string} name - Package name of the plugin
	 * @return {Plugin} Requested plugin.
	 */
	GetPlugin(name) {
		if (this.#plugins.has(name))
			return this.#plugins.get(name).api;

		this.#plugins.forEach((plugin, key) => {
			if (plugin.manifest !== undefined
				&& (plugin.manifest.packageName === name || plugin.manifest.name === name)
			) {
				return plugin.api;
			}
		});
	}

	/**
	 * Returns a plugin's API function.
	 * 
	 * @param {string} name - Name of the plugin.
	 * @param {string} method - Name of the method.
	 * @param {boolean} [mustBePackage = false] Whether or not the name is the package name.
	 * @return {function} Requested plugin method.
	 */
	GetPluginFunction(name, method) {
		let plugin = this.GetPlugin(name);
		if (plugin != undefined)
			return plugin[method];
	}

	/**
	 * Loads the plugins.
	 */
	LoadPlugins() {
		let me = this;
		let numberOfPlugins = 0;
		let pluginNumber = 0;

		async function loadPlugin(pluginDirectory) {
			let pluginScriptFile = path.join(pluginDirectory, "plugin.js")
			if (!fs.existsSync(pluginScriptFile)) {
				me.#log.info(`Skipping non-plugin folder ${pluginDirectory}`);
				pluginNumber++;
				return;
			}
			if (fs.existsSync(path.join(pluginDirectory, "disable"))) {
				me.#log.info(`Skipping disabled plugin ${pluginDirectory}`)
				pluginNumber++;
				return;
			}

			// load the plugin's code
			/** @type {Plugin} */
			let plugin = require(pluginScriptFile);
			if (plugin.manifest === undefined || typeof plugin.manifest.packageName !== "string") {
				me.#log.warn(`Missing plugin manifest, skipping ${pluginDirectory}`);
				pluginNumber++;
				return;
			}
			if (typeof plugin.main !== "function") {
				me.#log.warn(`Plugin has no main entry point defined, skipping ${pluginDirectory}`);
				pluginNumber++;
				return;	
			}


			if (plugin.manifest.version == undefined)
				plugin.manifest.version = "0.0.0";

			me.#log.info(`Loading plugin ${plugin.manifest.name} (@"${pluginScriptFile}" by ${plugin.manifest.author})`);
			me.#plugins.set(plugin.manifest.packageName, plugin);

			/** @type {PluginSetupObject} */
			let pluginSetupObject = {
				Bismo: me
			};

			let pluginConfigDir = path.join(DataDirectory, "Plugins", plugin.manifest.packageName);
			pluginSetupObject.ReadJson = function(name) {
				name = name || "config.json"
				if (!(name.endsWith(".json")))
					name = name + ".json";

				let filePath = path.join(pluginConfigDir, name);
				if (!fs.existsSync(pluginConfigDir))
					fs.mkdirSync(pluginConfigDir);
				if (!fs.existsSync(filePath))
					fs.closeSync(fs.openSync(filePath, 'w'));

				return me.ConfigurationManager.ReadFileContentsSync(filePath);
			}
			pluginSetupObject.WriteJson = function(data, name) {
				if (!fs.existsSync(pluginConfigDir))
					fs.mkdirSync(pluginConfigDir);

				name = name || "config.json"
				if (!(name.endsWith(".json")))
					name = name + ".json";

				return me.ConfigurationManager.WriteFileContentsSync(data, path.join(pluginConfigDir, name));
			}
			pluginSetupObject.Log = me.LogMan.getLogger(plugin.manifest.name);

			(async function() {
				plugin.main(pluginSetupObject);
			})().then(() => {
					pluginNumber++;
					me.#log.debug(`Loaded plugin ${plugin.manifest.name}.`);
					if (pluginNumber >= numberOfPlugins) {
						// completed
						me.Log.info("All plugins loaded.");
						me.Events.bot.emit('pluginsLoaded');
					}
				})
				.catch(err => {
					me.#log.error(`Plugin ${plugin.manifest.name} has encountered an error.`);
					me.#log.error(err.stack);
				});
		}


		return new Promise(async (resolve, reject) => {
			let pluginDirectories = getDirs(PluginsDirectory);
			numberOfPlugins = pluginDirectories.length;
			pluginDirectories.forEach((folderName) => {
				try {
					loadPlugin(path.join(PluginsDirectory, folderName));
				} catch (err) {
					me.#log.error(`Failed to load the plugin ${folderName}!\nError:`);
					me.#log.error(err);
				}
			});
		});
	}
}



// attempt to get a static Bismo instance
/** @type {Bismo} */
let runtimeInstance = global.Bismo || new Bismo(global.Client, global.ConfigurationManager);
global.Bismo = runtimeInstance;

module.exports = runtimeInstance;