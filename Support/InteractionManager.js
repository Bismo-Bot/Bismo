/*
	Application command: These are the slash commands
	Button Interaction: Button clicks
	Select menu Interaction: Selection menu select

	User (command) Interaction: Not implemented
	Message (command) Interaction: Not implemented
*/

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { default: Command } = require("./Command");


/**
 * Bismo Interaction Manager
 * 
 * Easy utility to manage the bot's interactions
 * 
 * This class is simply a helper for Bismo to register interactions onto Discord, update registered interactions, remove stale interactions, etc.
 * 
 * @class
 */
class InteractionManager {

	Rest;
	Client;

	/**
	 * The application commands cache
	 * 
	 * Using `RefreshApplicationCommands` you can grab the current application commands from Discord
	 * 
	 * Or, you can set the commands here and call 
	 * 
	 */
	applicationCommands = {
		/**
		 * @type {import('discord.js').ApplicationCommand[]}
		 * Array of commandData
		 */
		Global: [], // Array of commandData

		/**
		 * @type {string[]}
		 * Array of command names
		 */
		GlobalCommands: [],

		Guilds: {}, // Key pair of array of commandData (['guildID']: [ApplicationCommand, ApplicationCommand, ...])
		GuildCommands: {} // Key pair of array of command names (['guildID']: ['command1', 'command2', ...])
	}

	/**
	 * The application commands this interaction manager has registered.
	 * 
	 * Allows for the purging of commands not deployed by us
	 * 
	 */
	registeredCommands = { // List of command names we've registered
		Global: [],
		Guilds: {},
	}

	/**
	 * Determines if we're allowed to use the Rest API
	 * 
	 * Default is true, we want to wait until the client is ready.
	 * @type {boolean}
	 */
	locked;

	/**
	 * 
	 * @param {import('discord.js').Client} client Discord bot's client
	 * @param {string} clientToken Discord bot token
	 */
	constructor(client, clientToken) {
		this.Client = client;
		this.Rest = new REST({ version: '9' }).setToken(clientToken);
	};

	Unlock() {
		this.locked = false;
	};

	Lock() {
		this.locked = true;
	};

	/**
	 * Updates the current list of applicationCommands from Discord
	 * 
	 */
	async UpdateCache() {
		if (this.locked)
			return;
		this.applicationCommands.Global = await this.Rest.get(Routes.applicationCommands(this.Client.user.id));

		for (var i = 0; i < this.applicationCommands.Global.length; i++) {
			this.applicationCommands.GlobalCommands.push(this.applicationCommands.Global[i].name.toLowerCase());
		}

		let guilds = [...this.Client.guilds.cache.values()];
		for (var i = 0; i<guilds.length; i++) {
			let commands = await this.Rest.get(Routes.applicationGuildCommands(this.Client.user.id, guilds[i].id));
			this.applicationCommands.Guilds[guilds[i].id] = commands;
			this.applicationCommands.GuildCommands[guilds[i].id] = [];
			for (var a = 0; a < commands.length; a++) {
				this.applicationCommands.GuildCommands[guilds[i].id].push(commands[a].name.toLowerCase());
			}
		}
	}



	/**
	 * Checks if a command is registered globally
	 * @param {string} name
	 * @param {boolean} [updateCache = false] Whether `applicationCommands` is updated before checking
	 */
	IsGlobalCommand(name, updateCache) {
		if (typeof name !== "string")
			throw new TypeError("name expected string got " + (typeof name).toString());
		if (updateCache == true)
			this.UpdateCache();

		return (this.applicationCommands.GlobalCommands.indexOf(name.toLowerCase()) !== -1)
	}
	/**
	 * Check if an array of commands are registered globally
	 * @param {string[]} names String array of the commands we're checking
	 * @param {boolean} [updateCahce = false] Whether `applicationCommands` is updated before checking
	 * @returns {object} Key: command name, value: isGlobal?
	 */
	IsGlobalCommands(names, updateCache) {
		if (Array.isArray(names)) {
			if (!names.every(i => (typeof i === "string")))
				throw new TypeError("name expected string[] got ?[]");
			
			if (typeof names === "string") {
				let response = {}
				response[names.toLowerCase()] = this.IsGlobalCommand(names.toLowerCase());
				return response;
			}
			else
				throw new TypeError("names expected array got " + (typeof names).toString());
		}

		if (updateCache == true)
			this.UpdateCache();

		let response = {};
		for (var i = 0; i<names.length; i++) {
			response[names[i].toLowerCase()] = this.IsGlobalCommand(names[i].toLowerCase())
		}

		return response;
	}



	// === Guild Commands ===


	/**
	 * Checks if a command is registered in a guild
	 * @param {string} name
	 * @param {string} [guildId] Which guild to check in
	 * @param {boolean} [updateCache = false] Whether `applicationCommands` is updated before checking
	 * @returns {boolean|string[]} If guild specified, returns boolean. If not returns an array of guildIds that have that command (or true if global)
	 */
	IsGuildCommand(name, guildId, updateCache) {
		if (typeof name !== "string")
			throw new TypeError("name expected string got " + (typeof name).toString());

		if (updateCache == true)
			this.UpdateCache();

		name = name.toLowerCase();
		let isArray = Array.isArray(guildId)
		if (guildId == undefined || isArray) {
			let guilds = [];
			let keys = Object.keys(this.applicationCommands.GuildCommands);

			for (var i = 0; i<keys.length; i++) {
				// For each guild with commands.
				let commands = this.applicationCommands.GuildCommands[keys[i]];
				if (commands.indexOf(name) !== -1)
					guilds.push(keys[i]); // This guild has that command
			}
			if (isArray)
				guilds = guilds.filter(i => guildId.includes(i));
			return [...guilds];
		} else {
			if (this.applicationCommands.GuildCommands[guildId] == undefined)
				return false;
			return (this.applicationCommands.GuildCommands[guildId].indexOf(name) !== -1);
		}
	}

	
	/**
	 * Check if an array of commands are registered in a guild
	 * @param {string[]} names String array of the commands we're checking
	 * @param {string} [guildId] Which guild to check in
	 * @param {boolean} [updateCahce = false] Whether `applicationCommands` is updated before checking
	 * @returns {object} Key: command name, value: isGuild?
	 */
	IsGuildCommands(names, guildId, updateCache) {
		if (Array.isArray(names)) {
			if (!name.every(i => (typeof i === "string")))
				throw new TypeError("name expected string[] got ?[]");

			if (typeof names === "string") {
				let response = {}
				response[names.toLowerCase()] = this.IsGuildCommand(names.toLowerCase(), guildId);
				return response;
			}
			else
				throw new TypeError("names expected array got " + (typeof names).toString());
		}

		if (updateCache == true)
			this.UpdateCache();

		let response = {};
		for (var i = 0; i<names.length; i++) {
			response[names[i].toLowerCase()] = this.IsGuildCommands(names[i].toLowerCase(), guildId)
		}

		return response;
	}




	/**
	 * Removes one or more slash command(s) globally
	 * @param {string|string[]} name
	 */
	async UnregisterGlobalCommand(name) {
		if (typeof name !== "string" && !Array.isArray(name))
			throw new TypeError("name expected string or string[] got " + (typeof name).toString());


		if (this.locked)
			throw new Error("InteractionManager.UnableToRegister: unable to unregister command, InteractionManager is currently locked.");

		if (Array.isArray(name)) {
			if (!name.every(i => (typeof i === "string")))
				throw new TypeError("name expected string[] got ?[]");

			let responses = {};
			for (var i = 0; i<name.length; i++) {
				if (!Array.isArray(name[i]))
					responses[name[i].toLowerCase()] = this.UnregisterGlobalCommand(name[i].toLowerCase());
			}

			return responses;
		}

		name = name.toLowerCase();
		if (this.IsGlobalCommand(name)) {
			for (var i = 0; this.applicationCommands.Global.length; i++) {
				if (this.applicationCommands.Global[i].name == name) {
					if (await this.Rest.delete(Routes.applicationCommand(this.Client.user.id, this.applicationCommands.Global[i].id)) == 204) {
						this.applicationCommands.Global = this.applicationCommands.Global.filter(i => i.name !== name)
						this.applicationCommands.GlobalCommands = this.applicationCommands.GlobalCommands.filter(i => i !== name)
						this.registeredCommands.Global = this.registeredCommands.Global.filter(i => i !== name)
						return true;
					}
				}
			}
		}
	}


	/**
	 * Unregister one or more command(s) in either a guild or multiple guilds
	 * @param {string|string[]} name
	 * @param {string|string[]|undefined} [guildId] Which guild(s) to check in. If undefined, checks all guilds
	 * @returns {boolean|object} Returns true if removed from one guild or returns key-value pair of the guilds this command was removed from.
	 */
	async UnregisterGuildCommand(name, guildId) {
		if (typeof name !== "string" && !Array.isArray(name))
			throw new TypeError("name expected string or string[] got " + (typeof name).toString());


		if (this.locked)
			throw new Error("InteractionManager.UnableToRegister: unable to unregister command, InteractionManager is currently locked.");

		if (Array.isArray(name)) {
			if (!name.every(i => (typeof i === "string")))
				throw new TypeError("name expected string[] got ?[]");

			let response = {};
			for (var i = 0; i<name.length; i++) {
				if (!Array.isArray(name[i]))
					response[name[i]] = await this.UnregisterGuildCommand(name[i], guildId);
			}
			return response;
		}

		let del = async (name, guildId) => {
			name = name.toLowerCase();
			for (var i = 0; i<this.applicationCommands.Guilds[guildId].length; i++) {
				if (this.applicationCommands.Guilds[guildId][i].name == name) {
					if (await this.Rest.delete(Routes.applicationGuildCommand(this.Client.user.id, guildId, this.applicationCommands.Guilds[guildId][i].id))) {
						this.applicationCommands.Guilds[guildId] = this.applicationCommands.Guilds[guildId].filter(i => i.name !== name);
						this.applicationCommands.GuildCommands[guildId] = this.applicationCommands.GuildCommands[guildId].filter(i => i !== name);
						this.registeredCommands.Guilds[guildId] = this.registeredCommands.Guilds[guildId].filter(i => i !== name);
						return true;
					}
				}
			}
		}

		let guilds = await this.IsGuildCommand(name, guildId);
		if (typeof guilds === "boolean")
			return await del(name, guildId);

		let response = {};
		for (var i = 0; i<guilds.length; i++) {
			if (typeof guilds[i] === "string")
				response[guilds[i]] = await del(name, guilds[i]);
		}
		return response;
	}


	// === Higher level commands ===




	/**
	 * Registers an application (slash) command globally (all guilds)
	 * @param {import('discord.js').ApplicationCommand|import('discord.js').ApplicationCommand[]} commandData The application command you're registering
	 * @param {boolean} [onlyGlobal = true] If true, removes the command from individual guilds so the command is registered only globally
	 * @param {boolean} [force = false] Force register the command. Skips checking if the command is already registered, just goes for it
	 * @returns {boolean} Successfully registered
	 */
	async RegisterGlobalCommand(commandData, onlyGlobal, force) {
		if (this.locked)
			throw new Error("InteractionManager.UnableToRegister: unable to register command, InteractionManager is currently locked.");


		if (Array.isArray(commandData)) {
			let responses = {};
			for (var i = 0; i<commandData.length; i++) {
				if (!Array.isArray(commandData[i]))
					responses[commandData[i].name] = this.RegisterGlobalCommand(commandData[i], onlyGlobal, force);
			}
			return responses;
		}


		if (typeof commandData !== "object")
			throw new TypeError("commandData expected ApplicationCommand got " + (typeof names).toString());
		else {
			if (commandData.name == undefined)
				throw new Error("Missing name from commandData");
			else
				commandData.name = commandData.name.toLowerCase();

			if (commandData.description == undefined)
				throw new Error("Missing description from commandData");
			if (typeof commandData.options !== "object" && commandData.options != undefined)
				throw new TypeError("commandData.options expected object or undefined got " + (typeof commandData.options).toString());
			if (commandData.type == undefined)
				commandData.type = "CHAT_INPUT";
		}

		let registered = () => {
			if (onlyGlobal)
				this.UnregisterGuildCommand(commandData.name);

			this.applicationCommands.Global.push(commandData);
			this.applicationCommands.GlobalCommands.push(commandData.name);
			this.registeredCommands.Global.push(commandData.name);
			return true;
		}

		let body = {
			name: commandData.name,
			description: (commandData.type == "CHAT_INPUT" || commandData.type == 1)? commandData.description : undefined,
			options: commandData.options,
			default_permissions: commandData.defaultPermission,
			type: (typeof commandData.type == "number")? commandData.type : (commandData.type == "CHAT_INPUT") ? 1 : (commandData.type == "USER") ? 2 : 3,
		}
		
		if (await this.IsGlobalCommand(commandData.name) && !force) {
			this.registeredCommands.Global.push(commandData.name);
			return true;
		}

		let response = await this.Rest.post(Routes.applicationCommands(this.Client.user.id),
			{
				body: body
			});
		if (response != undefined) {
			if (response.name == commandData.name && response.application_id == this.Client.user.id) {
				commandData.id = response.id;
				commandData.version = response.version;
				commandData.defaultPermission = response.default_permissions;
				registered();
				return true
			}
		}
		return false;
	}

	/**
	 * Registers an application (slash) command for a particular guild
	 * @param {import('discord.js').ApplicationCommand|import('discord.js').ApplicationCommand[]} commandData The application command(s) you're registering
	 * @param {string|string[]} guildIds The guild(s) we're adding this command to. Must be a, or contain, valid guildId(s).
	 * @param {boolean} [onlyThisGuild = false] If true, removes the command from the global commands and any other guilds
	 * @param {boolean} [force = false] Force register the command. Skips checking if the command is already registered, just goes for it
	 */
	async RegisterGuildCommand(commandData, guildId, onlyThisGuild, force) {
		if (typeof commandData !== "object" && !Array.isArray(commandData))
			throw new TypeError("commandData expected discordjs.ApplicationCommand or discordjs.ApplicationCommand[] got " + (typeof commandData).toString());

		if (typeof guildId !== "string" && !Array.isArray(guildId))
					throw new TypeError("guildId expected string or string[] got " + (typeof guildId).toString());

		if (this.locked)
			throw new Error("InteractionManager.UnableToRegister: unable to register command, InteractionManager is currently locked.");
	
		if (Array.isArray(commandData) || Array.isArray(guildId)) {
			if (Array.isArray(commandData))
				if (!commandData.every(i => (typeof i === "object")))
					throw new TypeError("commandData expected discordjs.ApplicationCommand[] got ?[]");
		
			if (Array.isArray(guildId))
				if (!guildId.every(i => (typeof i === "string")))
					throw new TypeError("guildId expected string[] got ?[]");

			let RegisterCommandInGuild  = async (cmdData, gID, f) => {
				if (typeof gID !== "string")
					throw new TypeError("guildId expected string got " + (typeof gID).toString());

				if (typeof cmdData !== "object")
					throw new TypeError("cmdData expected ApplicationCommand got " + (typeof names).toString());
				else {
					if (commandData.name == undefined)
						throw new Error("Missing name from commandData");
					else
						commandData.name = commandData.name.toLowerCase();
					if (cmdData.description == undefined)
						throw new Error("Missing description from cmdData");
					if (typeof cmdData.options !== "object" && cmdData.options != undefined)
						throw new TypeError("cmdData.options expected object or undefined got " + (typeof cmdData.options).toString());
					if (cmdData.type == undefined)
						cmdData.type = "CHAT_INPUT";
				}

				let registered = () => {

					if (this.applicationCommands.Guilds[gID] == undefined)
						this.applicationCommands.Guilds[gID] = [];
					this.applicationCommands.Guilds[gID].push(cmdData);

					if (this.applicationCommands.GuildCommands[gID] == undefined)
						this.applicationCommands.GuildCommands[gID] = [];
					this.applicationCommands.GuildCommands[gID].push(cmdData.name);

					if (this.registeredCommands.Guilds[gID] == undefined)
						this.registeredCommands.Guilds[gID] = [];
					this.registeredCommands.Guilds[gID].push(cmdData.name);
					return true;
				}

				let body = {
					name: cmdData.name,
					description: (cmdData.type == "CHAT_INPUT" || cmdData.type == 1)? cmdData.description : undefined,
					options: cmdData.options,
					default_permissions: cmdData.defaultPermission,
					type: (typeof cmdData.type == "number")? cmdData.type : (cmdData.type == "CHAT_INPUT") ? 1 : (cmdData.type == "USER") ? 2 : 3,
				}
				

				if ((await this.IsGuildCommand(cmdData.name, gID) || await this.IsGlobalCommand(cmdData.name)) && !f) {
					if (this.registeredCommands.Guilds[gID] == undefined)
						this.registeredCommands.Guilds[gID] = [];
					this.registeredCommands.Guilds[gID].push(cmdData.name);

					return true;
				}

				let response = await this.Rest.post(Routes.applicationGuildCommands(this.Client.user.id, gID),
					{
						body: body
					});
				if (response != undefined) {
					if (response.name == cmdData.name && response.application_id == this.Client.user.id) {
						cmdData.id = response.id
						cmdData.version = response.version;
						cmdData.gID = response.guild_id;
						cmdData.defaultPermission = response.default_permissions;
						registered();
						return true
					}
				}
				return false;
			}

			let RegisterCommandsInSingleGuild = (guildId) => {
				// Register multiple commands in this guild
				if (Array.isArray(commandData)) {
					let responses = {}
					for (var i = 0; i<commandData.length; i++) {
						if (!Array.isArray(commandData[i]))
							responses[commandData[i].name] = RegisterCommandInGuild(commandData[i], guildId, force);
					}
					return responses;
				} else {
					// Single command
					return RegisterCommandInGuild(commandData, guildId, force);
				}
			}

			let EnforceOTGPolicy = (commandData) => {
				let guilds = this.IsGuildCommand(commandData.name);
				// Look, I hate it too
				if (Array.isArray(guildId)) {
					for (var i = 0; i<guilds.length; i++) {
						if (guildId.some(a => (a == guilds[i])))
							this.UnregisterGuildCommand(commandData.name, guilds[i]);
					}
				} else {
					let guilds = this.IsGuildCommand(commandData.name);
					for (var i = 0; i<guilds.length; i++) {
						if (guilds[i] != guildId)
							this.UnregisterGuildCommand(commandData.name, guilds[i]);
					}

					this.UnregisterGuildCommand(commandData.name);
				}
			}

			let EnforeOnlyTheseGuilds = () => {
				// Remove commands from other guilds.
				if (onlyThisGuild) {
					if (Array.isArray(commandData)) {
						for (var a = 0; a<commandData.length; a++) {
							EnforceOTGPolicy(commandData[a]);
						}
					} else {
						EnforceOTGPolicy(commandData);
					}
				}
			}

			if (Array.isArray(guildId)) {
				// For each guild ..
				let responses = {};
				let bAtleastOne = false;
				for (var i = 0; i<guildId.length; i++) {
					if (!Array.isArray(guildId[i])) {
						if (RegisterCommandsInSingleGuild(guildId[i])) {
							bAtleastOne = true;
							responses[guildId[i]] = true;
						} else {
							responses[guildId[i]] = false;
						}
					}
				}
				if (bAtleastOne)
					EnforeOnlyTheseGuilds()
				return responses;

			} else {				
				if (RegisterCommandsInSingleGuild(guildId)) {
					EnforeOnlyTheseGuilds();
					return true;
				}
				return false;
			}
		}
	}


	/**
	 * Deletes any commands from guilds or the global command registry if we did not register them ourselves in this instance of InteractionManager.
	 * 
	 * Essentially, if the command was not register via a method call, we remove it.
	 * 
	 * @param [boolean=true] inGlobal Remove stale global commands
	 * @param [boolean=true] inGuilds Remove stale commands in guilds
	 */
	async RemoveStaleCommands(inGlobal, inGuilds) {
		// registering a command puts the command in registeredCommands (Our side)
		// current registered commands are in applicationCommands (Discord side)

		/*
			Should be simple:
				for each applicationCommands.GlobalCommands, if the command is NOT inside registeredCommands.Global then call UnregisterGlobalCommand(name)

		*/
		if (this.locked)
			throw new Error("InteractionManager.UnableToRegister: unable to modify registered commands, InteractionManager is currently locked.");

		if (inGlobal == undefined)
			inGlobal = true;
		if (inGuilds == undefined)
			inGuilds = true;

		if (inGlobal) {
			for (var i = 0; i<this.applicationCommands.GlobalCommands.length; i++) {
				if (this.registeredCommands.Global.indexOf(this.applicationCommands.GlobalCommands[i]) == -1) {
					// We didn't register that
					await this.UnregisterGlobalCommand(this.applicationCommands.GlobalCommands[i]);
				}
			}
		}

		if (inGuilds) {
			let guilds = Object.keys(this.applicationCommands.GuildCommands)
			for (var i = 0; i<guilds.length; i++) {
				let guildCommands = this.applicationCommands.GuildCommands[guilds[i]];
				for (var ii = 0; ii < guildCommands.length; ii++) {
					if (this.registeredCommands.Guilds[guilds[i]] != undefined) {
						if (this.registeredCommands.Guilds[guilds[i]].indexOf(guildCommands[ii]) == -1) {//look man I hate it too
							// || check the index of the current command (inside the applicationCommands for that guild) within the known registered ones for that guild
							// wew, okay not our command
							await this.UnregisterGuildCommand(guildCommands[ii], guilds[i]);
						}
                    }
				}
			}
		}

	}

}

module.exports = InteractionManager;
