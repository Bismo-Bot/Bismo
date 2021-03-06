/*

		____  _					
	   / __ )(_)________ ___  ____ 
	  / __  / / ___/ __ `__ \/ __ \
	 / /_/ / (__  ) / / / / / /_/ /
	/_____/_/____/_/ /_/ /_/\____/  Discord Bot Platform

	v3


*/


// Use this to get all Guild IDs: var guilds = Client.guilds.cache.map(guild => guild.id);

const Version = require('./Support/version');

const debug = true;

const useDPAPI = false; // Toggles use of Window's Data Protection API. DPAPI is used to protect configuration files, account data and more.
var isWin = process.platform === "win32";

if (true)
	var endTerminalCode = "\x1b[0m";
else 
	var endTerminalCode = "\x1b[0m\x1b[47m\x1b[30m"; // Default colors, \x1b[47m\x1b[30m: Black text, white background


Error.stackTraceLimit = 3;


// This is the public API given to the plug-ins
const Bismo = {}

process.Bismo = Bismo;

Bismo.Version = new Version(0,3,1,(debug)?"debug":"release","CmdInterface");;

Bismo.isWindows = isWin;
Bismo.debugMode = debug;

const lBismo = {
	Config: {}, // This is things like creditials
	GuildAccounts: [],
	WaitForReply: [],
} // This is our private API given to no-one.

const ogLog = console.log;
/***
 * Logs to the console
 * @param {string} Message to log
 */
Bismo.log = function(msg) {
	ogLog(msg + endTerminalCode);
}

console.log = Bismo.log;

console.error = function(msg) {
	Bismo.log(endTerminalCode + "\x1b[31m" + msg);
}

/**
 * Debug logging
 */
function dlog(msg) {
	if (debug)
		Bismo.log("[Debug] " + msg);
}


ogLog(" " + endTerminalCode);
ogLog();
if (!debug) {
	process.stdout.write('\033c'); // Clear the terminal
	console.clear();
};

// For debugging
const util = require('util');
utilLog = function(obj, depth) {
	console.log(util.inspect(obj, {depth: (depth!=undefined)? depth : 2}));
}


// Begin

Bismo.log("--== BISMO BOT ==--");
if (!debug)
	Bismo.log("{ \x1b[1m\x1b[47m\x1b[34mProduction" + endTerminalCode + ", version: " + Bismo.Version.toString(true) + " }"); // Production mode
else
	Bismo.log("{ \x1b[1m\x1b[41m\x1b[33m**DEV MODE**" + endTerminalCode + ", version: " + Bismo.Version.toString(true) + " }"); // Developer (debug) mode

Bismo.log("] Running on \x1b[1m\x1b[34m" + process.platform);
if (isWin) {
	if (useDPAPI)
		Bismo.log("] DPAPI \x1b[1m\x1b[32mACTIVE" + endTerminalCode + ", file security enabled"); // DPAPI active
	else
		Bismo.log("] DPAPI \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled."); // DPAPI not-active (disabled)
} else
	Bismo.log("] DPAPI \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled."); // DPAPI not-active (unsupported platform)

// /^v/^\v/^\v/^\v/^\v^\
console.log("\n");



// This is our "error" handler :))))))))
process.on('unhandledRejection', (error) => {
  console.error('=== UNHANDLED REJECTION ===');
  dlog(error.stack);
});



// Event declares
const EventEmitter = require('events');
Bismo.Events = {}
Bismo.Events.discord = new EventEmitter();  // Discord events
Bismo.Events.bot = new EventEmitter();	  // Bot (system) events



// Outside 'APIs' (methods in other files, makes this one less crowded)
const SF = require('./Support/SupportFunctions.js');

const fs = require('fs');
const crypto = require('crypto');
var dpapi;
dpapi = o_o => { return o_o; };
if (isWin)
	dpapi = require('win-dpapi'); // Used on Windows platforms to encrypt and decrypt the config, guild and account data files.
/*
	We don't want our discord bot's API key just sitting around, that's stupid. Now, we *could* encrypt this key using a password, but that just moves the problem to encrypting this password.
	What if we just ask the bot operator to enter this password each startup? We could do this, but we run into two problems:
		1) We have to ask *every time we start*. So this restricts the bot from being headless, which is a major bonus. No one wants to be typing a password in every time this bot restarts.
			Because of this, operators would find a way to automatically type this password in, which voids the whole point of encryption as the password is now store somewhere.

		2) We now have to store this password in memory. I don't know about you, but I have no idea how to store secure data in memory using Node.JS. It might not even be possible.
			Our solution to this? Let Windows handle it. Sure there may be bugs in the way Windows stores this data, but I'm sure we can assume it'll be a hell of a lot better than
				var superSecretData = "password123".

	I'm aware there's ways around these DPAPI protections. An attacker can just decrypt the data on the machine themselves using any arbitrary code. However, if you have arbitrary code running on your machine, you've got bigger problems bud.

	Nothing is ever fully secured (or at least not with current technology), but this will just make it a pain-in-the-ass to decrypt.
*/

const entropy = null; // The entropy used with DPAPI, I'd recommend putting something here. must be null or an ArrayBuffer
const DPAPIKeyScope = "CurrentUser"; // 

/**
 * Writes an {object} to file by first converting it to JSON. If DPAPI enabled, we save using DPAPI encryption
 * @param {string} path The path the JSON file will be saved to
 * @param {object} contents The contents to convert to JSON and save 
 * @return {Promise} writeFile promise
 */
function writeJSONFile(path, contents) {
	if (contents == undefined || path == undefined)
		return;

	return new Promise((resolve) => {
		contents = JSON.stringify(contents);
		
		if (isWin && useDPAPI) {
			let encryped = dpapi.protectData(Buffer.from(contents, 'utf-8'), entropy, DPAPIKeyScope).toString();
			encryped = "DPAPI" + encryped;
			fs.writeFile(path, contents, 'utf8', (data) => {
				resolve(data);
			});
		} else {

			fs.writeFile(path, contents, 'utf8', (data) => {
				resolve(data);
			});
		}
	});
	
}
/**
 * Synchronous wrapper for writeJSONFile
 * @param {string} path The path the JSON file will be saved to
 * @param {object} contents The contents to convert to JSON and save 
 */
function writeJSONFileSync(path, contents) {
	if (!isWin || !useDPAPI) {
		fs.writeFileSync(path, JSON.stringify(contents), 'utf8');
	} else {
		contents = JSON.stringify(contents);
		var encrypted = dpapi.protectData(Buffer.from(contents, 'utf-8'), entropy, "CurrentUser").toString();
		encrypted = "DPAPI" + encrypted;
		fs.writeFileSync(path, encrypted, 'utf8');
	}
}
/**
 * Reads a JSON from file and then parses it. If DPAPI enabled, we read using DPAPI decryption (and encrypt the file if it has not already been encrypted)
 * @param {string} path The path to the JSON file that will be read
 * @return {JSON} JSON object of config data
 */
function readJSONFile(path) {
	function onRead(err, data, resolve, reject) {
		try {
			if (err)
				reject(err);
			if (!isWin || !useDPAPI) {
				data = JSON.parse(data);
				resolve(data); // quick and dirty

			} else {
				// Is DPAPI protected?
				if (data.substr(0, 5) == "DPAPI") {
					// Yes
					data = data.substr(5);
					Bismo.log(data);
					resolve(JSON.parse(dpapi.unprotectData(Buffer.from(data, 'utf-8'), entropy, DPAPIKeyScope))); // Note: you can also use the LocalMachine key rather than CurrentUser
					// The null refers to the option entropy that we're ignoring
				} else {
					// No
					data = JSON.parse(data);
					if (useDPAPI) {
						// Write the file, but encrypt it.
						writeJSONFile(path, data);
					}
					resolve(data);
				}
			}
		} catch (e) {
			console.error(e);

			console.log("There was an error reading the config file: " + path);

			process.exit(1);
		}
	}


	return new Promise((resolve, reject) => {
		fs.readFile(path, (err, data) => {
			onRead(err, data, resolve, reject)
		});
	});
}
/**
 * Synchronous wrapper for readJSONFile
 * @param {string} path The path to the JSON file that will be read
 * @return {JSON} JSON object of config data
 */
function readJSONFileSync(path) {
	try {
		if (!isWin || !useDPAPI)
			return JSON.parse(fs.readFileSync(path).toString()); // quick and dirty
		else {
			// Is DPAPI protected?
			var contents = fs.readFileSync(path).toString();
			if (contents.substr(0,5) == "DPAPI") {
				// Yes
				contents = contents.substr(5);
				Bismo.log(contents);
				return JSON.parse(dpapi.unprotectData(Buffer.from(contents, 'utf-8'), entropy, DPAPIKeyScope)); // Note: you can also use the LocalMachine key rather than CurrentUser
				// The null refers to the option entropy that we're ignoring
			} else {
				// No
				contents = JSON.parse(contents);
				if (useDPAPI) {
					// Write the file, but encrypt it.
					writeJSONFileSync(path, contents);
				}
				return contents;
			}
		}
	} catch (e) {
		console.error(e);
		console.log("There was an error reading the config file: " + path);
		process.exit(1);
	}
}







// Discord.JS
const Discord = require('discord.js');
const Client = new Discord.Client({
	intents: [ 	
				Discord.Intents.FLAGS.GUILDS,
				Discord.Intents.FLAGS.GUILD_MEMBERS,
				//Discord.Intents.FLAGS.BANS,
				//Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
				//Discord.Intents.FLAGS.INTEGRATIONS,
				//Discord.Intents.FLAGS.GUILD_WEBHOOKS,
				//Discord.Intents.FLAGS.GUILD_INVITES,
				//Discord.Intents.FLAGS.GUILD_VOICE_STATES,
				//Discord.Intents.FLAGS.GUILD_PRESENCES,
				Discord.Intents.FLAGS.GUILD_MESSAGES,
				Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
				//Discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
				Discord.Intents.FLAGS.DIRECT_MESSAGES,
				Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
				//Discord.Intents.FLAGS.DIRECT_MESSAGE_TYPING
			]

	// intents: [ Discord.Intents.ALL ] // Removed in discord.js v13 because you shouldn't do that
});
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");



const GuildAccount = require('./Support/GuildAccount');
const ArgumentParser = require('./Support/ArgumentParser');
const InteractionManager = require('./Support/InteractionManager');
// Setup

// Load and decrypt the config file (if on Windows)
lBismo.Config = readJSONFileSync('./Data/Config.json');



// var GAccounts = []; // These are our configurations regarding guilds
// var Accounts = []; // " regarding users

var Commands = new Map();



/*  Bismo API  */

//### Begin Bismo public API

Bismo.InteractionManager = new InteractionManager(Client, lBismo.Config.Discord.token);

// Deprecated.
// Use this to wait for additional input from a user. When called, the user ($ID)'s next message will be sent straight to the callback function. We do not process the next message from user $ID (as a command or anything else)
// To cancel input collection, the user just has to reply with the "cancel command".
// Note, this command DOES NOT require the user to type the bot's prefix, (! or its mention) for us to process it. The user just types the cancel command in itsentirety.
Bismo.WaitForUserMessage = function(id, channel, cancelCommand, callback, filter, options) { // userId, reply channel, cancel command (to stop listening), callback function (when reply got), filter, options
	var wFRID = crypto.createHash('sha1').update(id + channel).digest('base64');
	lBismo.WaitForReply.push(wFRID); // So we can ignore the reply in the main bot message handler

	if (filter ==  undefined)
		filter =  m => m.author.id === id; // Sets our filter to only accept messages from the user with $ID

	if (cancelCommand == undefined || cancelCommand == "")
		cancelCommand == "!~cancel"

	var collector = new Discord.MessageCollector(channel, filter, options);
	collector.on('collect', msg => { 
		collector.stop(); // Stop collection

		var i = lBismo.WaitForReply.indexOf(wFRID);
		if (i>-1) {
			lBismo.WaitForReply.splice(i,1); // Remove user from WaitForReply list
		}
		if (msg.content === cancelCommand) {
			channel.send({content: "Canceled."})
			return;
		} else {
			msg.args = msg.content.trim().split(/ +/g); // split using spaces.
			callback(msg); // Call the ... callback ...
		}
	});
}

/**
 * GetUserReplyOptions for GetUserReply function
 * @typedef {object} BismoGetUserReplyOptions
 * @property {string} cancelCommand What a user must type in order to dismiss and cleanup the listener.
 * @property {any} filter The filter passed to the Discord.MessageCollector, default to m=>m.author.id === id (only accept messages with the user's ID)
 * @property {any} options Further options passed to the Discord.MessageCollector
 */

/**
 * Grab a user's input (process in-line a user reply). Next message from a user in channelId is ignored except by your callback.\
 * The returned promise will either resolve with the user's unmodified message or reject if they canceled (using the cancel command, !~cancel).\
 * Use this to wait for additional input from a user. When called, the user's next message will be resolved and processed by the calling code without any altering.\
 * *We do split the user's message by white space into an array called 'args'\
 * To prevent command processing from this user we calculate the SHA1 of the user's ID and channel's ID concatenated together and then add that to the WaitForReply array.\
 * When a normal message comes in, we always calculate this same SHA1 and check to see if anything lives in WaitForReply, if something does we do not process the command.\
 * Since we do not process the message in any way, the bot's prefix is NOT required. The entirety of the message will be processed by your callback function.
 * 
 * @param {string} userId Discord user ID of the person you're waiting for a reply from
 * @param {string} channelId Discord channel ID you're waiting for a reply in
 * @param {BismoGetUserReplyOptions} options Additional options passed to the Discord.MessageCollector
 * 
 * @return {Promise<Discord.Message, Error>} Promise object that represents the user's reply.
 */
Bismo.GetUserReply = function(userId, channelId, options) {
	if (options == undefined)
		options = {};

	if (options.cancelCommand == undefined || options.cancelCommand == "")
		options.cancelCommand == "!~cancel"


	return new Promise((resolve, reject) => {
		let wFRID = crypto.createHash('sha1').update(userId + channel).digest('base64');
		lBismo.WaitForReply.push(wFRID); // So we can ignore the reply in the main bot message handler

		if (options.filter ==  undefined)
			options.filter =  m => m.author.id === userId; // Sets our filter to only accept messages from the user with $ID

		let collector = new Discord.MessageCollector(channelId, options.filter, options.options);
		collector.on('collect', msg => { 
			collector.stop(); // Stop collection

			let i = lBismo.WaitForReply.indexOf(wFRID);
			if (i>-1)
				lBismo.WaitForReply.splice(i,1); // Remove user from WaitForReply list
			
			if (msg.content === cancelCommand) {
				channel.send({content: "Canceled."})
				reject();

			} else {
				msg.args = msg.content.trim().split(/ +/g); // I lied we at least split things up into an array
				resolve(msg); // Resolve
			}
		});
	});
}

/**
 * Synchronous wrapper for Bismo.GetUserReply(userId, channelId, options)
 * @param {string} userId Discord user ID of the person you're waiting for a reply from
 * @param {string} channelId Discord channel ID you're waiting for a reply in
 * @param {Bismo.GetUserReplyOptions} options Additional options passed to the Discord.MessageCollector
 * @return {Discord.Message} message The message object the user sent
 */
Bismo.GetUserReplySync = async function(userId, channelId, options) {
	return await Bismo.GetUserReply(userId, channelId, options);
}



/**
 * Saves the current guild configurations to the Guilds JSON file.
 * Clear runtime settings, convert to JSON, save file.
 */
Bismo.SaveGuilds = function() {
	// Clear runtime settings, convert to JSON, save file
	var CleanGuilds = [];
	for (var i = 0; i<lBismo.GuildAccounts.length; i++) {
		CleanGuilds[i] = lBismo.GuildAccounts[i].GetSterile();
	}

	writeJSONFileSync('./Data/Guilds.json', CleanGuilds);
	dlog("Guild data saved.");
}

// ================================

/**
 * Returns a Discord Guild object for the guild with the id ID.
 * @param {string} ID ID of the guild to get
 * @return {?Discord.Guild} guild - Guild object
 */
Bismo.GetDiscordGuildObject = function(ID) {
	return lBismo.guildObjects[ID];
}


/**
 * Creates a new Guild account
 * @param {string} ID The guild ID you're adding
 * @param {Bismo.GuildAccountConstructorData} data The data passed to the GuildAccount constructor (the guild's data)
 * @return {?GuildAccount} Either returns the guild account or undefined if no such guild with that ID exists.
 */
Bismo.AddGuild = function(ID, data) {
	// Check if this guild account exists
	for(var i = 0; i<lBismo.GuildAccounts.length; i++)
		if (lBismo.GuildAccounts[i] != null)
			if (lBismo.GuildAccounts[i].id == ID)
				return lBismo.GuildAccounts[i];

	if (data==null)
		data = {}

	data.id = ID;
	data.name = Bismo.GetDiscordGuildObject(ID).name;

	// Bismo.log(data);
	if (data.name == undefined) // this guild doesn't actually exist.
		return undefined;	   

	let gData = new GuildAccount(data, Bismo);

	lBismo.GuildAccounts.push(gData);
	Bismo.SaveGuilds();
	return gData;
}

/**
 * Gets the Bismo Guild object (account)
 * @memberof Bismo
 * @prama {string} ID Guild ID to grab
 * @return {?GuildAccount} GuildAccount object
 */
Bismo.GetBismoGuildObject = function(ID) {
	for (var i = 0; i<lBismo.GuildAccounts.length; i++)
		if (lBismo.GuildAccounts[i] != null)
			if (lBismo.GuildAccounts[i].id == ID)
				return lBismo.GuildAccounts[i];
}

/**
 * Removes a guild with ID from our guild account database (destroy the GuildAccount)
 * @prama {string} ID Guild ID to remove
 */
Bismo.RemoveGuild = function(ID) {
	for (var i = 0; i<lBismo.GuildAccounts.length; i++)
		if (lBismo.GuildAccounts[i] != null)
			if (lBismo.GuildAccounts[i].id == ID) {
				delete lBismo.GuildAccounts[i];
				lBismo.GuildAccounts.splice(i,1);
			}

	Bismo.SaveGuilds();
}

/**
 * Get all guild member objects
 * @prama {string} guildId Guild to get members from
 * @return {Discord.GuildMemberManager} All guild members
 */
Bismo.GetGuildUsers = async function(guildId) {
	return await Bismo.GetDiscordGuildObject(guildId).members.fetch();
}
/**
 * Get an array of user IDs within a guild
 * @param {string} guildId Guild to get user information from
 * @return {string[]} Array of user IDs inside a guild
 */
Bismo.GetGuildUserIDs = function(guildId) {
	var users = Bismo.GetGuildUsers(guildId);

	var cleanUsers = []
	for (var i = 0; i<users.length; i++)
		if (users[i]!=null)
			if (users[i].id != undefined)
				cleanUsers.push(users[i].id);

	return cleanUsers;
}



/**
 * Check to see if a userId is apart of a guild
 * @param {string} ID UserID to check
 * @param {string} guildId In this guild
 * @return {boolean} Discord user is apart of a guild
 */
Bismo.IsDiscordGuildMember = function(ID, guildId) {
	var members = Bismo.GetGuildUserIDs(guildId);
	for (var i = 0; i<members.length; i++) {
		if (members[i] == ID)
			return true;
	}

	return false;
}

/**
 * Get all channels in a particular guild
 * @param {string} ID Guild to check
 * @param {string} [type] Only return these types of channels
 * @return {Discord.Channel[]|Discord.VoiceChannel[]|Discord.TextChannel[]|Discord.StoreChannel[]|Discord.NewsChannel[]|array} Channels 
 */
Bismo.GetGuildChannels = function(ID, type) {

	var channels = [...Bismo.GetDiscordGuildObject(ID).channels.cache.values()];
	var neededChannels = [];

	for (var i = 0; i<channels.length; i++)
	{
		if (!type)
			neededChannels.push(channels[i]);
		else
			if (channels[i].type == type)
				neededChannels.push(channels[i]);
	}
	return neededChannels;
}

// Return the voice channel ID that user $userId is in on the guild $guildId
/**
 * Get the current voice channel a user is in within a guild
 * @param {string} guildId The guild to check
 * @param {string} userId The user to check
 * @return {Discord.VoiceChannel|undefined} - Voice channel that user is in
 */
Bismo.GetCurrentVoiceChannel = function(guildId, userId) {
	voiceChannels = Bismo.GetGuildChannels(guildId, "voice");

	for (var i = 0; i<voiceChannels.length; i++)
	{   
		var members = [...voiceChannels[i].members.values()];
		for (var m = 0; m<members.length; m++)
			if (members[m].id == userId)
				return voiceChannels[i].id;
	}

	return undefined;
}

// Return the channel object for $channelId in guild $ID
/**
 * Get the channel object of a channel in a guild
 * @param {string} ID Channel is in this guild
 * @param {string} channelId The channel ID to get
 * @return {(Discord.TextChannel|Discord.VoiceChannel|Discord.NewsChannel|Discord.StoreChannel)} Channel object
 */
Bismo.GetGuildChannelObject = function(ID,channelId) {
	var g = Bismo.GetDiscordGuildObject(ID);
	if(g.channels != undefined) {
		// utilLog(g.channels)
		var channels = [...g.channels.cache.values()]
		// var channel = g.channels.get(channelId);
		// return channel;

		for(var o = 0; o<channels.length; o++) {
			if (channels[o]!=null) {
				if (channels[o].id == channelId) {
					return channels[o];
				}
			}
		}
	}

	return undefined;
}

/**
 * @typedef {BismoGetReply} BismoCommandExecuteDataGetReply
 * 
 * @param {string} prompt The prompt to give users (We append the message `Type <options.cancelCommand> to cancel.`)
 * @param {BismoGetUserReplyOptions} options Options passed to the GetUserReply() function
 */
/**
 * @typedef {function} Reply
 * @param {string} msg Message to send
 * 
 */

/**
 * @typedef {object} BismoCommandExecuteData
 * 
 * @property {Reply} Reply Method used to send a reply back to the user (chat commands: sends a message in the same channel, slash commands: sends a follow up message to the user)
 * @property {BismoCommandExecuteDataGetReply} GetReply This is a wrapper for the Bismo.getUserReply() function. Allows you to collect a single response from the author in chat
 * @property {string} alias Which command was executed
 * @property {string[]} args The parameters for the command (We automatically phrase this for you, in both chat and slash commands)
 * @property {ArgumentParser} parser The more advance argument parser
 * @property {Discord.TextChannel} channel Channel object the message was sent over
 * @property {Discord.User} author User object that executed the command
 * @property {string} authorID User ID
 * @property {Discord.Guild} guild Discord guild object
 * @property {string} guildId Discord guild ID
 * @property {boolean} inGuild Command executed inside a guild?
 * @property {GuildAccount} guildAccount Bismo guild account (special container for the guild, holds guild specific data)
 * @property {boolean} isInteraction Whether or not this was an interaction (slash command / message interaction)
 * @property {Discord.Message} [message] Message object (chat command)
 * @property {Discord.Interaction} [interaction] Interaction object (slash command / message interaction)
 * 
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
 * 
 * 
 */

// Registers a command
// we have to wait until after the bot logins to register slash commands!
awaitingRegister = []; // This array will contain the commands that need to be registered
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
Bismo.RegisterCommand = function(alias, handler, options) {
	// https://discord.com/developers/docs/interactions/slash-commands

	if (options == undefined)
		options = {};


	if (Commands.get(alias) == undefined) {
		options.friendlyName = options.friendlyName || alias;
		options.description = options.description || "No description provided.";
		options.helpMessage = options.helpMessage || options.description;
		if (options.slashCommand == undefined)
			options.slashCommand = false;
		if (options.chatCommand == undefined)
			options.chatCommand = true;
		if (options.usersOnly == undefined)
			options.usersOnly = false;
		if (options.directChannels == undefined)
			options.directChannels = false;
		if (options.guildChannels == undefined)
			options.guildChannels = true;
		if (options.hidden == undefined)
			options.hidden = false;
		if (options.requireParams == undefined)
			options.requireParams = true;
		if (options.ephemeral == undefined)
			options.ephemeral = false;

		if (options.slashCommandOptions == undefined)
			slashCommandOptions = [];

		// todo: validate options
		

		alias = alias.match(/^[\w-]{1,32}/g); // https://discord.com/developers/docs/interactions/slash-commands#registering-a-command
		if (alias.length < 0)
			throw new Error("Alias does not match allowed naming scheme.");
		alias = alias[0].toLowerCase();

		// Register the command
		var type = "";
		if (options.chatCommand) {
			if (type == "")
				type = "chat";
			else
				type += "/chat";

			type[type.length] = "chat";
		}
		if (options.slashCommand) {
			if (type == "")
				type = "slash";
			else
				type += "/slash";
		}

		Commands.set(alias, {
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

			if (Client.user != undefined) {
				if (options.whitelistGuilds) {
					Bismo.InteractionManager.RegisterGuildCommand(body, options.whitelistGuilds, true, true)
				} else {
					Bismo.InteractionManager.RegisterGlobalCommand(body, null, true)
				}
			} else {
				awaitingRegister[awaitingRegister.length] = alias;
			}
		}

		Bismo.log(`[32mNew command (${type}) registered: "${alias}"[0m`);

	} else {
		Bismo.log(`[91mFailed to register command "${alias}"! It was already registered.[0m`);
		return false;
	}
}



/**
 * Gets a plugin's API
 * 
 * @param {string} name Name of the plugin (either friendly name or package name)
 * @param {boolean} [mustBePackage = false] Whether or not the name is the package name.
 * @return {function} Requested plugin API
 */
Bismo.GetPlugin = function(name, mustBePackage) {
	function getFromPackageName(name) {
		for (const [key] of Object.keys(Plugins)) {
			if (Plugins[key].manifest.packageName == name) {
				return Plugins[key].api;
			}
		}

		return undefined;
	}

	if (mustBePackage) {
		return getFromPackageName(name);
	
	} else if (Plugins[name] != undefined) {
		return Plugins[name].api;
	
	} else {
		return getFromPackageName(name);
	
	}   
}

/**
 * Returns a plugin's method
 * 
 * @param {string} name Name of the plugin
 * @param {string} method Name of the method
 * @param {boolean} [mustBePackage = false] Whether or not the name is the package name.
 * @return {function} Requested plugin method
 */
Bismo.GetPluginMethod = function(name, method, mustBePackage) {
	let plugin = Bismo.GetPlugin(name, mustBePackage);

	if (plugin != undefined) {
		return plugin[method];
	}
}


/**
 * Get the Discord client instance Bismo uses
 * @return {Discord.Client}
 */
Bismo.GetDiscordClient = function() {
	return Client;
}



/*
	
	Permissions

	Bismo Permission API calls are just proxy calls for the GuildAccount's permission functions
*/

Bismo.Permissions = {} // Container for permission API calls

/**
 * Takes string/GuildAccount and returns just GuildAccount
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string|GuildAccount} obj
 * @returns {GuildAccount}
 */
function GetGuildObj(obj) {
	if (typeof obj === "string")
		return Bismo.GetBismoGuildObject(obj);
	else
		return obj;
}

/**
 * Check if a user has a particular Bismo permission in a guild
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId The user we're checking against
 * @param {string|GuildAccount} guild The guild we're checking against. (Can either be a string (guildId) or the GuildAccount)
 * @param {string} permission The permission we're checking for
 * @return {?boolean} Permission's value
 */
Bismo.Permissions.UserHasPermission = function(guild, userId, permission) {
	let guildAccount = GetGuildObj(guild);
	return guildAccount?.UserHasPermission(userId, permission);
}

/**
 * Set a permission for a user in a guild
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId User ID we're adding the permission to
 * @param {string|GuildAccount} guild The guild this applies to. (Can either be a string (guildId) or the GuildAccount)
 * @param {string} permission The permission we're adding (Similar to Minecraft's permission system, wildcard/sub permissions allowed)
 * @param {boolean} permissionValue What the permission will be set to
 */
Bismo.Permissions.SetUserPermission = function(guild, userId, permission, permissionValue) {
	let guildAccount = GetGuildObj(guild);
	guildAccount?.SetUserPermission(userId, permission, permissionValue);
}

/**
 * Checks if the user exists in the permissions storage for the guild
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId
 * @return {boolean}
 */
Bismo.Permissions.UserExists = function(guildId, userId) {
	let guildAccount = GetGuildObj(guildId);
	return guildAccount?.UserExists(userId);
}

/***
 * Adds a role to a user
 * 
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId User we're modifying
 * @param {string} role The role we're adding to the user
 */
Bismo.Permissions.AddUserRole = function(guildId, userId, role) {
	let guildAccount = GetGuildObj(guildId);
	guildAccount?.AddUserRole(userId, role);
}

/***
 * Adds a role to a user
 * Ignores if the user doesn't exist

 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId User we're modifying
 * @param {string} role The role we're removing from the user
 */
Bismo.Permissions.RemoveUserRole = function(guildId, userId, role) {
	let guildAccount = GetGuildObj(guildId);
	guildAccount?.RemoveUserRole(userId, role);
}

/***
 * Adds a role to a user
 * Ignores if the user doesn't exist

 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId User we're modifying
 * @param {string} role The role we're adding to the user
 */
Bismo.Permissions.SetUserRoles = function(guildId, userId, roles) {
	let guildAccount = GetGuildObj(guildId);
	guildAccount?.SetUserRoles(userId, roles);
}

/***
 * Clear a user's roles (resets them)
 * Ignores if the user doesn't exist

 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId User we're modifying
 */
Bismo.Permissions.ClearUserRoles = function(guildId, userId) {
	let guildAccount = GetGuildObj(guildId);
	guildAccount?.ClearUserRoles(userId);
}

/***
 * Resets a user's permissions (just the permissions)
 * Ignores if the user doesn't exist

 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId User we're resetting
 */
Bismo.Permissions.ClearUserPermissions = function(guildId, userId) {
	let guildAccount = GetGuildObj(guildId);
	guildAccount?.ClearUserPermissions(userId);
}

/**
 * Removes a user from the list of users in permission storage
 * This clears their roles and permissions and removes any reference to them
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId
 */
Bismo.DeleteUserPermissions = function(guildId, userId) {
	let guildAccount = GetGuildObj(guildId);
	guildAccount?.DeleteUserPermissions(userId);
}

/**
 * Checks if a role is defined in the guild
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} role
 * @returns {boolean}
 */
Bismo.Permissions.RoleExists = function(guildId, role) {
	let guildAccount = GetGuildObj(guildId);
	guildAccount?.RoleExists(role);
}

/**
 * Sets a permission in a guild role
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} role Role name
 * @param {string} permission
 * @param {boolean} value
 */
Bismo.Permissions.SetRolePermission = function(guildId, role, permission, value) {
	let guildAccount = GetGuildObj(guildId);
	guildAccount?.SetRolePermission(role, permission, value);
}

/**
 * Removes a permission from a guild role
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} role
 * @param {string} permission The permission we're removing
 * @param {boolean} includingChildren Whether or not we also remove all children of `permission` (rather than that explicit permission)
 * @returns {boolean} Removed permissions (false just means they were never set)
 */
Bismo.Permissions.RemoveRolePermission = function(guildId, role, permission, includingChildren) {
	let guildAccount = GetGuildObj(guildId);
	return guildAccount?.RemoveRolePermission(role, permission, includingChildren);
}

/**
 * Rename a guild permission role
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} currentName Role's current name
 * @param {string} newName Role's new name
 */
Bismo.Permissions.RenameRole = function(guildId, currentName, newName) {
	let guildAccount = GetGuildObj(guildId);
	guildAccount?.RenameRole(currentName, newName);
}

/**
 * Delete a role from the guild
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} role
 */
Bismo.Permissions.DeleteRole = function(guildId, role) {
	let guildAccount = GetGuildObj(guildId);
	guildAccount?.DeleteRole(role);
}

// Raw permissions
// I do not know why this is included, especially since all you have to do is grab the GuildAccount, but here it

/**
 * Get raw user permissions
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId
 * @return {object} permissions dictionary (`{ "bismo.sample.permission": false }`)
 */
Bismo.Permissions.GetRawUserPermissions = function(guildId, userId) {
	if (typeof userId !== "string")
		throw new TypeError("userId expected string got " + (typeof userId).toString());
	let guildAccount = GetGuildObject(guildId);
	if (guildAccount?.permissions?.users == undefined)
		return undefined;
	return guildAccount.permissions.users[userId]?.permissions;
}
/**
 * Get raw user roles
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {string} userId
 * @return {object} permissions dictionary (["RoleName","AnotherOne"])
 */
Bismo.Permissions.GetRawUserRoles= function(guildId, userId) {
	if (typeof userId !== "string")
		throw new TypeError("userId expected string got " + (typeof userId).toString());
	let guildAccount = GetGuildObject(guildId);
	if (guildAccount?.permissions?.users == undefined)
		return undefined;
	return guildAccount.permissions.users[userId]?.roles;
}
/**
 * Get raw role
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @param {sting} role
 * @return {object} permissions dictionary (`{ name: RoleName, permissions: {} }`)
 */
Bismo.Permissions.GetRawRole = function(guildId, role) {
	if (typeof role !== "string")
		throw new TypeError("role expected string got " + (typeof role).toString());
	let guildAccount = GetGuildObject(guildId);
	if (guildAccount?.permissions?.roles == undefined)
		return undefined;
	return guildAccount.permissions.roles[role];
}
/**
 * Get raw permissions
 * @param {string|GuildAccount} guildId Either the GuildAccount or string represent thing guild's Id. Permissions are unique for each guild.
 * @return {object} permissions dictionary (`{ roles: {}, users: {} }`)
 */
Bismo.Permissions.GetRaw = function(guildId) {
	let guildAccount = GetGuildObject(guildId);
	return guildAccount?.permissions;
}



// Plug-ins
var Plugins = {};
const { readdirSync, statSync } = require('fs')
const { join } = require('path');
const { platform, type } = require('os');
// const { default: Command } = require('./Support/Command.js');
const getDirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
var dirs = getDirs('./Plugins');
Bismo.log(`[B] Found ${dirs.length} potential plugins..`);
for (var i = 0; i<dirs.length; i++) {
	(function() {
		const fName = dirs[i]; // Folder name
		try {
			if (fs.existsSync(`./Plugins/${fName}/plugin.js`)) { // Plugin file exists?
				if (fs.existsSync(`./Plugins/${fName}/disable`)) {
					Bismo.log(`[B] Skipping disabled plugin ${fName}`);
					return;
				}

				let plugin = require(`./Plugins/${fName}/plugin.js`); // Load the code
					
				let name  = fName;
				if (plugin.manifest == null || plugin.manifest?.packageName == undefined) {
					Bismo.log(`[B] [31mMissing plugin manifest, skipping ${fName}`);
					return;
				}
				// else if (!SF.isNullOrEmpty(plugin.manifest.name))
				// 	name = plugin.manifest.name;

				if (plugin.manifest.version == null)
					plugin.manifest.version = "0.0.0";
				// if (plugin.manifest.targetVersion != lBismo.apiVersion && plugin.manifest.targetAPIVersion != undefined)
				// 	Bismo.log(`[B] [31mLoading (outdated) plugin (${i + 1}/${dirs.length}) ${name}`); // Hey, we're loading! But very outdated!
				// else
					Bismo.log(`[B] Loading plugin (${i + 1}/${dirs.length}) ${name}`); // Hey, we're loading!
	
				Plugins[name] = plugin;

				const requests = {
					Bismo: {...Bismo}
				};

				if (plugin.requests != undefined)
					for (var a = 0; a < plugin.requests.length; a++) {
						var component = plugin.requests[a];
						switch (component) {
							default:
								break;
						}
					}

				/**
				 * Get a plugin API
				 * @param {string} name - Either the plugin's name or the plugin's package name
				 * @param {boolean} [mustBePackage = false] - The name provided represents a plugin's package name
				 * @return {object} Plugin's API
				 */
				requests.Bismo.GetPlugin = function(name, mustBePackage) {
					function getFromPackageName(name) {
						for (const [key, value] of Object.entries(Plugins)) {
							if (Plugins[key].manifest.packageName == name) {
								return Plugins[key].api;
							}
						}

						Bismo.log(`[31m[B - ${fName} ] Error, failed to load plugin API for ${name} (that plugin does not exist.[0m`);
						return undefined;
					}

					if (mustBePackage) {
						return getFromPackageName(name);
					
					} else if (Plugins[name] != undefined) {
						return Plugins[name].api;
					
					} else {
						return getFromPackageName(name);
					
					}   
				}

				/**
				 * Get your plugin's configuration data. Use's the bot's DPAPI settings
				 * @param {string} [name="config"] - Config file name
				 * @param {function} [callback] - Function called once data is read (if undefined function becomes synchronous)
				 * @return {JSON|Promise} Returns configuration data if callback is undefined, or calls your callback if it is defined
				 */
				requests.Bismo.ReadConfig = function(name, callback) { // You can provide a special configuration name here.
					try {
						if (name==undefined)
							name = "config";

						if (typeof callback === "function")
							readJSONFile(`./Plugins/${fName}/${name}.json`).then(callback);
						else
							return readJSONFileSync(`./Plugins/${fName}/${name}.json`);
					} catch (err) {
						// error
						console.error(`[B - ${fName} ] Error loading configuration file "config.json".`);
					}
				}
				/**
				 * Write your plugin's configuration data. Use's the bot's DPAPI settings
				 * @param {any} data - Configuration data to write
				 * @param {function} [callback] - Function called once data is saved.
				 * @param {string} [name = "config"] - Config file name
				 */
				requests.Bismo.WriteConfig = function(data, name, callback) { // Same above with the name
					try {
						if (name==undefined)
							name = "config";

						if (typeof callback === "function")
							writeJSONFile(`./Plugins/${fName}/${name}.json`, data).then(callback);
						else
							return writeJSONFileSync(`./Plugins/${fName}/${name}.json`, data);
					} catch (err) {
						// error
						console.log(err)
						console.error(`[B - ${fName} ] Error saving configuration file "config.json".`);
					}
				}

				/***
				 * Logs to the console under your plugin's name
				 */
				requests.Bismo.log = function(msg) {
					Bismo.log("\x1b[36m[ " + fName + " ] " + msg + "\x1b[0m");
				}
				/**
				 * Output an error to the console under your plugin's name
				 */
				requests.Bismo.error = function(msg) {
					Bismo.log("\x1b[35m[ " + fName + " ] " + msg + "\x1b[0m");
				}
				/**
				 * Outputs debugging information to the console under your plugin's name (if debug)
				 */
				requests.Bismo.debug = function(msg) {
					dlog("\x1b[36m[ " + fName + " ] " + msg + "\x1b[0m");
				}

				if (typeof plugin.main === "function")
					(async function() { // ewwww NASTY
						plugin.main(requests); // "This should be done asynchronously :shrug:"
					})().catch(err => {
						console.error(`[31m[B **] The plugin ${fName} has encountered an error while loading and has halted.[0m`);
						dlog("Stack trace: " + err.stack);

					});
				else
					Bismo.log(`[31m[B] Error, the plugin ${fName} is missing the main function![0m`);

			} else {
				Bismo.log(`[B] Skipping non-plugin folder ${fName}`);
			}
		} catch (error) {
			console.error(error);
			Bismo.log(`[31m[B **] Warning! Failed to load plugin ${fName}!\nError: ${error}[0m`);
		}
	}());
}








// Event registers
/*
*
*   Each event is emitted with a /Bismo/ "packet" which is a special version of the API that only allows access to that guild
*
*/
var loaded = false; // Set to true if we can load guild data (and setup the bot) correctly


Bismo.log("[B] Plugins loaded.");

Bismo.Events.bot.emit('pluginsLoaded');


// channelCreate = new EventEmitter();
// channelDelete = new EventEmitter();
// channelUpdate = new EventEmitter();
// 
// guildUpdate = new EventEmitter();
// guildUnavailable = new EventEmitter();
// guildBanRemove = new EventEmitter();
// guildBanAdd = new EventEmitter();
// guildDelete = new EventEmitter();
// guildCreate = new EventEmitter();
// guildMemberRemove = new EventEmitter();
// guildMemberAdd = new EventEmitter();
// guildMembersChunk = new EventEmitter();
// guildMemberSpeaking = new EventEmitter();
// guildMemberUpdate = new EventEmitter();
// 
// userUpdate = new EventEmitter();
// 
// roleCreate = new EventEmitter();
// roleDelete = new EventEmitter();
// roleUpdate = new EventEmitter();
// 
// message = new EventEmitter();
// messageUpdate = new EventEmitter();
// messageDelete = new EventEmitter();
// messageReactionAdd = new EventEmitter();
// messageReactionRemove = new EventEmitter();
// messageReactionRemoveAll = new EventEmitter();
// 
// inviteDelete = new EventEmitter();
// inviteCreate = new EventEmitter();
// invalidated = new EventEmitter();
// 
// voiceStateUpdate = new EventEmitter();
// 
// ready = new EventEmitter(); // After all guilds/plugins are loaded
// setup = new EventEmitter(); // While a guild is loading


// Discord registers -> Bismo registers

Client.on('channelCreate', (channel) => {});
Client.on('channelDelete', (channel) => {});
Client.on('channelUpdate', (oldChannel, newChannel) => {});

Client.on('guildUpdate', (oldGuild, newGuild) => {
	// guild = DSF.GetBismoGuildObject(newGuild.id);
	// guild.name = newGuild.name; // only thing I got so far.
}); // Guild data changed, reflect that in our data
Client.on('guildUnavailable', (guild) => {}); // server down

Client.on('guildBanRemove', (guild, member) => {}) // Someone got unbanned
Client.on('guildBanAdd', (guild) => {}); // Someone got banned

Client.on('guildDelete', (guild) => {
	Bismo.log("[D] Removed from " + guild.name + "!");
});
Client.on('guildCreate', (guild) => {
	Bismo.log("[D] I've been added to " + guild.name + "!");
	// guild.owner.send("Hello! Thank you for adding me. To get started, mention me in any text channel in your guild.");
}); // added to guild

Client.on('guildMemberRemove', (member) => {}); // goodbye
Client.on('guildMemberAdd', (member) => {}); // Someone new
Client.on('guildMembersChunk', (members, guild, chunk) => {}); // https://discord.js.org/#/docs/main/stable/class/Client?scrollTo=e-guildMembersChunk
Client.on('guildMemberSpeaking', (member, speaking) => {});
Client.on('guildMemberUpdate', (oldMemeber, newMemeber) => { // Role changes, nicknames, etc

}); // User information changed in relation to the guild (this is emitted at the same time as userUpdate...)
Client.on('userUpdate', (oldUser, newUser) => {

}); // User information changed


Client.on('roleCreate', (role) => {});
Client.on('roleDelete', (role) => {});
Client.on('roleUpdate', (role) => {});

// message moved to bottom

Client.on('messageUpdate', (oldMessage, newMessage) => {});
Client.on('messageDelete', (message) => {});
Client.on('messageReactionAdd', (messageReaction, message) => {});
Client.on('messageReactionRemove', (messageReaction, message) => {});
Client.on('messageReactionRemoveAll', (message) => {});

Client.on('inviteDelete', (invite) => { // Temporary invites/members? Once a temp member's invite is deleted, kick them?

});
Client.on('inviteCreate', (invite) => {

});


// Emitted when the client's session becomes invalidated. You are expected to handle closing the process gracefully and preventing a boot loop if you are listening to this event.
Client.on("invalidated", O_0 => { console.error("[B] Invalidated. do something bro") });


Client.on('voiceStateUpdate', (oldMember, newMember) => { // Call 'observers'
	var newUserChannel = newMember.voiceChannel;
	var oldUserChannel = oldMember.voiceChannel;

	if(oldUserChannel === undefined && newUserChannel !== undefined) {
		// User Joins a voice channel
		Bismo.Events.discord.emit('voiceChannelJoin', newUserChannel, { oldMember: oldMember, newMember: newMember }); // Call observer

	} else if(newUserChannel === undefined){
		// User leaves a voice channel
		Bismo.Events.discord.emit('voiceChannelLeave', oldUserChannel, { oldMember: oldMember, newMember: newMember }); // Call observer)
	}
})



/*  MESSAGES / COMMANDS  */
Client.on("messageCreate", message => {
	try {
		// The most import part, commands.
		if(message.type === "PINS_ADD" && message.author.bot) message.delete(); // Remove pin notifications from the bot.

		if (message.author.bot || message.author.system) return; // Do not process bot responses.
		// we should not sha1 this, seems slow as hell
		if (lBismo.WaitForReply.indexOf(crypto.createHash('sha1').update(message.author.id + message.channel.id).digest('base64'))>-1) return; // Do not process reply responses. (this is already processed.)


		// // Emotes
		// if (message.content.startsWith("<:") && message.content.endsWith(">")) {
		//  if (message.content.startsWith("<:dawson:")) {
		//	  message.delete().then(o_o=>{ message.channel.send("", {files: ["https://s.cnewb.co/dawson.png"]}) });
		//  }

		//  return;
		// }





		// Grab required data
		var guildId = message.author.id;
		if (message.guild!=undefined)
			guildId = message.guild.id;

		var myMention = "<@!" + Client.user.id + ">";
		var guildData = Bismo.GetBismoGuildObject(guildId);


		// Only listen to the guild's prefix or my mention
		var prefix = "";
		var inGuild;
		if (guildData!=undefined) {
			inGuild = true;
			if (message.content.startsWith(guildData.prefix)) {
				prefix = guildData.prefix;
			}
		} else {
			inGuild = false;
			if (message.content.startsWith("!")) {
				prefix = "!";
			}
		}

		if (message.content.startsWith(myMention)) {
			prefix = myMention + " ";
		}
		
		if (prefix == "") {
			return;
		}


		dlog("Command: " + message.content);

		// Slice message
		let args = message.content.slice(prefix.length).trim().split(/ +/g); //Chop off the prefix, trim, split using spaces.
		let command = args.shift().toLowerCase();


		// Generate command packet
		/** @type {BismoCommandExecuteData} */
		var commandData = {
			alias: command,
			args: args,
			parser: new ArgumentParser(args),
			channel: message.channel,
			author: message.author,
			authorID: message.author.id,
			guildId: guildId,
			guild: Bismo.GetDiscordGuildObject(guildId),
			inGuild: (message.guild != undefined)? true : false,
			guildAccount: Bismo.GetBismoGuildObject(guildId),
			isInteraction: false,
		}

		message.firstReply = true;

		commandData.Reply = function(msg) {
			if (message.firstReply) {
				message.firstReply = false;
			}
			message.channel.send({ content: msg, reply: { messageReference: message.id } });
		}
		commandData.reply = commandData.Reply;

		commandData.message = message;

		commandData.GetReply = function(prompt, options) {
			if (options == undefined)
				options = {};

			if (options.cancelCommand == undefined || options.cancelCommand == "")
				options.cancelCommand == "!~cancel"

			commandData.Reply(prompt + "\nTo cancel, type `" + options.cancelCommand + "`");

			return Bismo.GetUserReply(message.author.id, message.channel.id, options);
		}

		// Okay, we have everything.
		// Emit an event.
		Bismo.Events.discord.emit('messageCreate', commandData); // ideally this would be able to be captured so listening code could halt execution and/or we wait for the listeners.

		// Cycle through our command handlers
		let cmd = Commands.get(command);
		if (cmd != undefined) {
			// This is our handler.
			if (!cmd.chatCommand)
				return; // Not a chat command (slash command?)

			// Run basic checks
			if (inGuild) {
				if (cmd.usersOnly) {
					return; // Command not allowed here.
				}
				if (cmd.whitelistGuilds != undefined) {
					var whitelisted = false;
					for (var i = 0; i<cmd.whitelistGuilds.length; i++) {
						if (cmd.whitelistGuilds[i] == guildId) {
							whitelisted = true;
							break; // return != break
						}
					}
					if (!whitelisted) {
						return; // Not allowed
					}

				}
				if (cmd.blacklistGuilds != undefined) {
					var blacklisted = false;
					for (var i = 0; i<cmd.blacklistGuilds.length; i++) {
						if (cmd.blacklistGuilds[i] == guildId) {
							blacklisted = true;
							break;
						}
					}
					if (blacklisted) {
						return; // Not allowed.
					}
				}
			} else if (cmd.guildRequired) {
				commandData.Reply("This command must be ran within a guild chat room!");
				return;
			}

			message.channel.sendTyping();

			if (args[0] == "help" || (args[0] == undefined && cmd.requireParams == true)) {
				// Display the help message automatically
				commandData.Reply("`" + command + "` - " + cmd.description + "\n" + cmd.helpMessage)
			}
			else {
				(async function () { // nasty catcher v923

					cmd.handler(commandData);
				})().catch((err)=>{
					console.error("[B] Command error, cmd: " + command + ".\nFull message: " + message.content);
					dlog("[B-e] Trace: " + err.stack);
					return true;
				}); // Run async
				
			}
			return;
		}// unknown command else {}
	} catch (err) {
		console.error("Command fault. Guild? " + ((message.guild!=undefined)? "true" : "false") + "Message: " + message.content);
		dlog("[B-e] Trace: " + err.stack);
	}
});



Client.on('interactionCreate', async interaction => { // async?
	// We've received an interaction. This could be either a message component or a slash command
	// Since we only support slash commands at the moment, I'm going on the assumption it's one of those
	try {
		if (interaction.type != "APPLICATION_COMMAND") // 1 = ping, 2 = slash command, 3 = message component, 4 = application command autocomplete ?
			return;

		await interaction.deferReply(); // This sends "is thinking" as the first response. This allows the user to see that the command was received.
		// This also allows us 15 minutes to reply rather than 3 seconds

		if (interaction.options == undefined)
			return;

		let cmd = Commands.get(interaction.commandName);

		

		var authorID = "";
		if (interaction.member != undefined)
			authorID = interaction.member.user.id;
		else
			authorID = interaction.user.id;

		var userObject = await Client.users.fetch(authorID); // Fetch the user object

		var commandData = {
			alias: interaction.commandName,
			author: userObject,
			authorID: authorID,
			guildId: interaction.guild_id,
			guild: Bismo.GetDiscordGuildObject(interaction.guildId),
			inGuild: (interaction.guildId != undefined)? true : false,
			guildAccount: Bismo.GetBismoGuildObject(interaction.guildId),
			isInteraction: true,
		};

		// Phrase the args.
		commandData.args = [];
		if (interaction.options) {
			if (interaction.options.data.length >= 1) {
				for (var i = 0; i<interaction.options.data.length; i++) {
					commandData.args[i] = interaction.options.data[i].value;
				}
			}
		}

		interaction.firstReply = true;
		commandData.channel = Bismo.GetGuildChannelObject(interaction.guildId, interaction.channelId);

		commandData.Reply = async function(msg) {
			if (interaction.firstReply) {
				interaction.firstReply = false;
				return await interaction.editReply({ content: msg, ephemeral: cmd.ephemeral });
				// update the interaction response
			} else {
				// send message
				return await interaction.followUp({ content: msg, ephemeral: cmd.ephemeral });
			}
		}

		commandData.GetReply = function(prompt, callback, options) {
			//how the hell am I going to do this one
			/*
				- register temp command in guild ?
				- just do the regular get reply, but if ephemeral just use their DM channel
			*/
		}

		// okay add the interaction object
		commandData.interaction = interaction;

		// These are deprecated because they were named by an idiot (me)
		// commandData.GAccount = commandData.guildAccount;
		// commandData.BismoAccount = commandData.bismoAccount;
		// commandData.prefix = ""; // actually not a thing in a slash command .. :shrug:

		// Find the command
		dlog("Interaction: " + interaction.commandName)
		if (cmd != undefined) {
			if (!cmd.slashCommand) {
				// unregister command
				commandData.Reply("O_O !! Command fault, not a slash command (stagnant register?).");
				return; // Not a slash command (why was it registered?)
			}

			var inGuild = interaction.guildId != undefined;
			if (inGuild) {
				if (cmd.usersOnly) {
					commandData.Reply("O_O !! Command fault, command can only be used in the DMs.");
					return;
				}
				if (cmd.whitelistGuilds != undefined) {
					var whitelisted = false;
					for (var i = 0; i<cmd.whitelistGuilds.length; i++) {
						if (cmd.whitelistGuilds[i] == interaction.guildId) {
							whitelisted = true;
							break;
						}
					}
					if (!whitelisted) {
						commandData.Reply("O_O !! Command fault, guild not authorized [W].");
						return; // Not allowed
					}
				}
				if (cmd.blacklistGuilds != undefined) {
					var blacklisted = false;
					for (var i = 0; i<cmd.blacklistGuilds.length; i++) {
						if (cmd.blacklistGuilds[i] == interaction.guildId) {
							blacklisted = true;
							break;
						}
					}
					if (blacklisted) {
						commandData.Reply("O_O !! Command fault, guild not authorized [B].");
						return; // Not allowed
					}
				}
			} else if (cmd.guildRequired) {
				commandData.Reply("O_O !! Command fault, command only allowed within server channels.");
				return;
			}

			if (typeof cmd.handler != "function") {
				// unregister the command
				commandData.Reply("O_O !! Command fault, no such handler.");
				return; // bruh what
			}

			// Execute the command
			(async function() {
				cmd.handler(commandData);
				// command done, remove status (if needed)
			})().catch((err) => {
				console.error("[B] Command (interaction) error, cmd: " + interaction.commandName);
				dlog("[B-e] Trace: " + err.stack);
				commandData.Reply("O_O !! Command fault, unhandled exception.")
				return;
			});

		} else {
			// unknown command, unregister
			cmd = { ephemeral: true };
			commandData.Reply("O_O !! Command fault, stagnant (unknown) command.");
			return;
		}
	} catch(error) {
		console.error("Command fault (unexpected exception in interaction handler).");
		dlog("[B-e] Trace: " + error.stack);
		//new Discord.WebhookClient(Client.user.id, interaction.token).send('Bismo command fault (unexpected exception in interaction handler).');
	}
}); // End interaction create




/*  STARTUP  */
Client.on("ready", async () => {
	lBismo.guildObjects = {};
	var guilds = [...Client.guilds.cache.values()];
	for (var i = 0; i<guilds.length; i++) {
		lBismo.guildObjects[guilds[i].id] = guilds[i];
		// Client.api.applications(Client.user.id).guilds(guilds[i].id).commands.put({data: []});
	}

	Bismo.botID = Client.user.id;

	Bismo.log(`\x1b[36m[D] Bot is starting up with ${Client.users.cache.size} users in ${Client.channels.cache.size} channels of ${Client.guilds.cache.size} guilds.\x1b[0m`);
	if (Client.users.size >= 1000 || Client.guilds.size >= 250)
		Bismo.log("This may take a while...");

	Client.user.setActivity("Bismo is loading...");

	// Here we can load the guilds up (one-by-one)

	// Register the slash commands now
	// Client.api.applications(Client.user.id).commands.put({data: []}); // clear the commands first
	// We should check to see if our commands actually updated or not. If they did: remove/add as needed. If they did not: do nothing.
	Bismo.InteractionManager.Unlock(); // Unlock the interaction manager
	Bismo.InteractionManager.UpdateCache().then(async function () {
		if (awaitingRegister.length >= 1)
			for (var i = 0; i < awaitingRegister.length; i++) { // For each slash command needing to be registered.
				let alias = awaitingRegister[i];
				let cmd = Commands.get(alias);
				if (!cmd.slashCommand)
					continue;

				let body = {
					name: alias,
					description: cmd.description,
					type: "CHAT_INPUT",
					options: cmd.slashCommandOptions,
				};
				if (cmd != undefined) {
					try {
						if (cmd.whitelistGuilds != undefined) {
							await Bismo.InteractionManager.RegisterGuildCommand(body, cmd.whitelistGuilds, true);
						} else {
							if (debug) {
								let guilds = ['756391901099458600']; // Debug clan
								await Bismo.InteractionManager.RegisterGuildCommand(body, guilds);
							} else {
								// Register command globally
								await Bismo.InteractionManager.RegisterGlobalCommand(body);
							}
						}
						console.log("[B] Registered `" + alias + "`");
					} catch (e) {
						// failed
						// console.log(e)
						console.log("[B] Failed to register `" + alias + "`");
					}
				}
			}

		Bismo.InteractionManager.RemoveStaleCommands(); // Remove leftover commands
	}); // Register commands


	fs.readFile('./Data/Guilds.json', 'utf8', (err, data) => {
		if (err) {
			// Load error
			console.warn(err);
			console.warn("Failed to load guild data, bot will not function correctly.");
			Client.user.setActivity("Startup failure.");
			return;
		}

		if (data.substr(0,5) == "DPAPI") {
			// Yes
			data = data.substr(5);
			data = dpapi.unprotectData(Buffer.from(data, 'utf-8'), entropy, DPAPIKeyScope);
		}


		function completed() {
			if (debug)
				Client.user.setActivity("DevBuild " + Bismo.Version.toString(false));
			else
				Client.user.setActivity(lBismo.Config.Discord.activity);
			Bismo.log("[B] Bismo loaded.");
			Bismo.Events.discord.emit('ready', Client);
		}

		// lBismo.GuildAccounts = JSON.parse(data); // Load the guilds
		let guilds = JSON.parse(data);
		if (guilds == undefined) {
			completed();
			return;
		}
		if (guilds.length == undefined) {
			completed();
			return;
		}

		for (var i = 0; i<guilds.length; i++) {
			let guild = new GuildAccount(guilds[i], Bismo);
			if (guild != undefined)
				lBismo.GuildAccounts.push(guild);
		}
		
		let loaded = 0;
		if (lBismo.GuildAccounts.length == 0) {
			completed();

		} else {
			for (var i = 0; i<lBismo.GuildAccounts.length; i++) {
				if (lBismo.GuildAccounts[i]==null)
					continue;
				
				var gID = lBismo.GuildAccounts[i].id;
				Client.guilds.fetch(gID).then(gD => {
					lBismo.guildObjects[gID] = gD;

					// Setup the guild
					var BismoPacket = {
						guildId: gID, // The guild ID
						discordGuildObject: gD, // Discord guild object
						bismoGuildObject: lBismo.GuildAccounts[i], // The guild account
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
					Bismo.Events.discord.emit('guildDiscovered', BismoPacket);
					loaded++;


					if (loaded>= lBismo.GuildAccounts.length) {
						completed();
					}
				});
			}
		}
	});


});




// Bismo commands
/*
	Bismo commands


	I would like for people to keep these commands in deployment.

	However, if you feel like they pose some security risk or other annoyance, feel free to remove them.
	There's no reason to remove them, but go for it I guess.
*/
Bismo.RegisterCommand("version", message => { // Current bot version
	message.Reply("Bismo version `" + Bismo.Version + "` "
		+ ((Bismo.debugMode)? "\n`{debug, platform?" + process.platform + "}`" : ""));
}, {
	description: "Reveal which version of Bismo is under the hood.",
	helpMessage: "Usage:\n`/version`",
	requireParams: false,
	chatCommand: true,
	slashCommand: true
});
Bismo.RegisterCommand("ping", message => {
	// Add timing information
	var messageDelay = (message.isInteraction) ? (Date.now() - message.interaction.createdTimestamp) : (Date.now() - message.message.createdTimestamp)
	message.Reply("Pong! _Delay: `" + messageDelay + "ms` | API delay: `" + Client.ws.ping + "ms`_");
}, {
	description: "Ping the bot.",
	helpMessage: "Usage:\n`/ping`",
	requireParams: false,
	chatCommand: true,
	slashCommand: true
})


Shutdown = async function() {
	console.log("\nShutting down");

	var shutdownTimeout = lBismo.Config.shutdownTimeout;
	if (typeof shutdownTimeout !== "number")
		shutdownTimeout = 5000;


	console.log("Notifying plugins @Bismo.Events.Bot#shutdown:" + shutdownTimeout);
	Bismo.Events.bot.emit('shutdown', shutdownTimeout);
	await SF.sleep(shutdownTimeout)

	console.log("[D] Logging off ...");
	Client.destroy();
	await SF.sleep(500);
	process.exit(0);
}


// Server operator interaction

const readline = require("readline");
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

function processCMD(command) {
	try {
		if (command == "exit" || command == "quit")
			Shutdown();
		else
			ogLog("Received input: " + command);
	} catch(_) {
		// do a thing or something
	}
}
function prompt() {
	rl.question("", (command) => {
		processCMD(command);
		prompt();
	});
}

rl.on("close", function () {
	Shutdown();
});

// Operator input
prompt();

// Okay, we're ready to "start"
// go for launch
Client.login(lBismo.Config.Discord.token);