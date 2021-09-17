/*

	    ____  _                    
	   / __ )(_)________ ___  ____ 
	  / __  / / ___/ __ `__ \/ __ \
	 / /_/ / (__  ) / / / / / /_/ /
	/_____/_/____/_/ /_/ /_/\____/  Discord Bot Platform

	v3


*/


// Use this to get all Guild IDs: var guilds = Client.guilds.cache.map(guild => guild.id);

const debug = true;
const build = "3.0.1[2]";

const useDPAPI = false; // Toggles use of Window's Data Protection API. DPAPI is used to protect configuration files, account data and more.
var isWin = process.platform === "win32";

if (true)
	var endTerminalCode = "\x1b[0m";
else 
	var endTerminalCode = "\x1b[0m\x1b[47m\x1b[30m"; // Default colors, \x1b[47m\x1b[30m: Black text, white background


Error.stackTraceLimit = 3;


const Bismo = {
	version: build,
	isWindows: isWin,
	debugMode: debug,
	
} // This is the public API given to the plug-ins

const lBismo = {
	config: {},
	guildAccounts: [],
	userAccounts: [],
	waitForReply: [],
} // This is our private API given to no-one.

const ogLog = console.log;
Bismo.log = function(msg) {
	ogLog(msg + endTerminalCode);
}
console.log = Bismo.log;
console.error = function(msg) {
	Bismo.log(endTerminalCode + "\x1b[31m" + msg);
}
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

const util = require('util');
utilLog = function(obj, depth) {
	console.log(util.inspect(obj, {depth: (depth!=undefined)? depth : 2}));
}


Bismo.log("--== BISMO BOT ==--");
if (!debug)
	Bismo.log("{ \x1b[1m\x1b[47m\x1b[34mProduction" + endTerminalCode + ", build: " + build + " }");
else
	Bismo.log("{ \x1b[1m\x1b[41m\x1b[33m**DEV MODE**" + endTerminalCode + ", build: " + build + " }");

Bismo.log("] Running on \x1b[1m\x1b[34m" + process.platform);
if (isWin) {
	if (useDPAPI)
		Bismo.log("] DPAPI \x1b[1m\x1b[32mACTIVE" + endTerminalCode + ", file security enabled");
	else
		Bismo.log("] DPAPI \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled.");
} else
	Bismo.log("] DPAPI \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled.");

// /^v/^\v/^\v/^\v/^\v^\
console.log("\n");



// This is our "error" handler :))))))))
process.on('unhandledRejection', (error, p) => {
  console.error('=== UNHANDLED REJECTION ===');
  dlog(error.stack);
});



// Event declares
const EventEmitter = require('events');
Bismo.events = {}
Bismo.events.discord = new EventEmitter();	// Discord events
Bismo.events.bot = new EventEmitter();		// Bot (system) events



// Outside 'APIs' (methods in other files, makes this one less crowded)
const SF = require('./Support/SupportFunctions.js');

const fs = require('fs');
const crypto = require('crypto');
var dpapi = o_o => { return o_o; };
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

const entropy = null; // The entropy used with DPAPI

function writeJSONFileSync(path, contents) {
	if (!isWin || !useDPAPI) {
		fs.writeFileSync(path, contents, 'utf8');
	} else {
		contents = JSON.stringify(contents);
		var encrypted = dpapi.protectData(Buffer.from(contents, 'utf-8'), entropy, "CurrentUser").toString();
		encrypted = "DPAPI" + encrypted;
		fs.writeFileSync(path, encrypted, 'utf8');
	}
}
function readJSONFileSync(path) {
	if (!isWin || !useDPAPI)
		return require(path); // quick and dirty
	else {
		// Is DPAPI protected?
		var contents = fs.readFileSync(path).toString();
		if (contents.substr(0,5) == "DPAPI") {
			// Yes
			contents = contents.substr(5);
			Bismo.log(contents);
			return JSON.parse(dpapi.unprotectData(Buffer.from(contents, 'utf-8'), entropy, "CurrentUser")); // Note: you can also use the LocalMachine key rather than CurrentUser
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
}







// Discord.JS
const Discord = require('discord.js');
const Client = new Discord.Client({
	// intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, 'GUILD_MEMBERS', 'DIRECT_MESSAGES', 'GUILD_MESSAGES_REACTIONS', 'GUILD_INVITES']
	intents: [ Discord.Intents.ALL ]
});

// Express
const http = require('http');
const express = require('express');
const session = require('express-session');
const bodyParser = require("body-parser");

const app = express();
const httpServer = http.createServer(app);
var expressWs = require('express-ws')(app, httpServer);
app.use(bodyParser.urlencoded({ extended: false }));




const BismoAccount = require('./Support/BismoAccount')(Client);
const GuildAccount = require('./Support/GuildAccount')(Client);
const BSF = require('./Support/SupportFunctions'); // lazy

// Setup

// Load and decrypt the config file (if on Windows)

const Config = readJSONFileSync('./Data/Config.json');

// var GAccounts = []; // These are our configurations regarding guilds
// var Accounts = []; // " regarding users

var Commands = new Map();



/*  Bismo API  */

//### Begin Bismo public API

// Use this to wait for additional input from a user. When called, the user ($ID)'s next message will be sent straight to the callback function. We do not process the next message from user $ID (as a command or anything else)
// To cancel input collection, the user just has to reply with the "cancel command".
// Note, this command DOES NOT require the user to type the bot's prefix, (! or its mention) for us to process it. The user just types the cancel command in itsentirety.
Bismo.WaitForUserMessage = function(id, channel, cancelCommand, callback, filter, options) { // userID, reply channel, cancel command (to stop listening), callback function (when reply got), filter, options
	var wFRID = crypto.createHash('sha1').update(id + channel).digest('base64');
	lBismo.waitForReply.push(wFRID); // So we can ignore the reply in the main bot message handler

	if (filter ==  undefined)
		filter =  m => m.author.id === id; // Sets our filter to only accept messages from the user with $ID

	if (cancelCommand == undefined || cancelCommand == "")
		cancelCommand == "!~cancel"

	var collector = new Discord.MessageCollector(channel, filter, options);
	collector.on('collect', msg => { 
		collector.stop(); // Stop collection

		var i = lBismo.waitForReply.indexOf(wFRID);
		if (i>-1) {
			lBismo.waitForReply.splice(i,1); // Remove user from WaitForReply list
		}
		if (msg.content === cancelCommand) {
			channel.send("Canceled.")
			return;
		} else {
			msg.args = msg.content.trim().split(/ +/g); // split using spaces.
			callback(msg); // Call the ... callback ...
		}
	});
}

Bismo.GetUserReply = function(userID, channelID, callback, options) {
	if (options == undefined)
		options = {};

	if (options.cancelCommand == undefined || options.cancelCommand == "")
		options.cancelCommand == "!~cancel"

	Bismo.WaitForUserMessage(userID, channelID, options.cancelCommand, callback || options.callback, options.filter, options.options);
}




Bismo.SaveGuilds = function() {
	// Clear runtime settings, convert to JSON, save file

	var CleanGuilds = []; //SF.getCleanArray(lBismo.guildAccounts);
	// utilLog(lBismo.guildAccounts)
	for (var i = 0; i<lBismo.guildAccounts.length; i++) {
		CleanGuilds[i] = lBismo.guildAccounts[i].GetSterial();
	}

	// Bismo.log(GAccounts)
	//path, contents

	writeJSONFileSync('./Data/Guilds.json', JSON.stringify(CleanGuilds));
	dlog("Guild data saved.");
}

// Bismo.SaveAccounts = function() {
// 	var CleanAccounts = [];
// 	for (var i = 0; i<lBismo.userAccounts.length; i++) {
// 		CleanAccounts.push(lBismo.userAccounts[i].getSterial());
// 	}

// 	writeJSONFileSync('./Data/Accounts.json', JSON.stringify(CleanAccounts));
// 	dlog("Account data saved.");
// }




// // Returns the Bismo account for this ID (typically the Discord user ID)
// // Can be any linked account IDs
// // Returns undefined if no account was found
// Bismo.GetAccount = function(ID) {
// 	var acc = undefined;
// 	for (var i = 0; i<lBismo.userAccounts.length; i++) {
// 		// for each account,
// 		if (lBismo.userAccounts[i] != null) {
// 			// if it actually exists...
// 			if (lBismo.userAccounts[i].accountName == ID) // if the account name is the ID... (discord ID==discord ID) (fast!ish)
// 				return lBismo.userAccounts[i]; // return this account
// 			if (lBismo.userAccounts[i].linkedAccount!=null) // if it has linked accounts
// 				for (var o = 0; o<lBismo.userAccounts[i].linkedAccounts.length; o++) // for each linked account (ungodly slow!)
// 					if (lBismo.userAccounts[i].linkedAccounts[o] != null) // if that actually exists...
// 						if (lBismo.userAccounts[i].linkedAccounts[o].id == ID) // if the account ids equal
// 							return lBismo.userAccounts[i]; // return this account
// 		}
// 	}
// 	return acc; // lol undefined?
// }

// // Checks to see if the Bismo account exists for this ID (typically the Discord user ID)
// // Returns false if Bismo.getAccount returns undefined (I.E. no account)
// Bismo.AccountExists = function(ID) {
// 	return (Bismo.getAccount(ID)!=undefined);
// }

// // Adds a Bismo account (ID is the account ID, typically the Discord user ID)
// Bismo.AddAccount = function(userID, username, metaData) { // metaData is reserved for additional data
// 	if (Bismo.accountExists(userID))
// 		return;


// 	var ourGuilds = []
// 	// go through all our guilds and check if the user is in them.
// 	// note: for some dumbass reason, either the user has to interact with the bot in these servers OR the bot has to interact with these servers before the members list is accurate..
// 	// jesus I hate this thing more and more as the days go on
// 	var guilds = Client.guilds.cache;
// 	for (var i = 0; i<guilds.length; i++)
// 	{
// 		var member = guilds[i].members.get(userID)
// 		if (member!=null) {
// 			if (member.id == userID)
// 			{
// 				// We have this guild together
// 				ourGuilds.push({ ID: guilds[i].id, type: 0 });
// 			}
// 		}
// 	}

// 	var acct = new BismoAccount({
// 		accountName: userID,
// 		initalLink: {
// 			accountID: userID,
// 			username: username
// 		},
// 		guilds: ourGuilds
// 	});

// 	// Account 'created', now add it to the account list and save

// 	dlog(username + " created an account! (" + userID + ")");
// 	acct.updatePermissions(ourGuilds); // uhhhhh
// 	lBismo.userAccounts.push(acct);
// 	Bismo.SaveAccounts();
// 	return acct;
// }

// Bismo.RemoveAccount = function(ID) {
// 	for (var i = 0; i<lBismo.userAccounts.length; i++)
// 		if (lBismo.userAccounts[i] != null) {
// 			if (lBismo.userAccounts[i].accountName == ID)
// 			{
// 				dlog("Deleting account " + lBismo.userAccounts[i].accountName);
// 				lBismo.userAccounts.splice(i,1);
// 				Bismo.SaveAccounts();
// 				return true;
// 			}
// 			if (lBismo.userAccounts[i].linkedAccount!=null)
// 				for (var o = 0; o<lBismo.userAccounts[i].linkedAccounts.length; o++)
// 					if (lBismo.userAccounts[i].linkedAccounts[o] != null)
// 						if (lBismo.userAccounts[i].linkedAccounts[o].id == ID)
// 						{
// 							dlog("Deleting account " + lBismo.userAccounts[i].accountName);
// 							lBismo.userAccounts.splice(i,1);
// 							Bismo.SaveAccounts();
// 							return true;
// 						}
// 	}
// 	return false;
// }

// ================================

// Get the Discord GuildManager
Bismo.GetDiscordGuildObject = function(ID) {
	var a = lBismo.guildObjects[ID];
	return a;

	// Client.guilds.fetch(ID)
	// 	.then(data => { return data })
	// 	.catch(console.error);
}

// Adds a GuildAccount
Bismo.AddGuild = function(ID, data) {
	// Check if this guild account exists
	for(var i = 0; i<lBismo.guildAccounts.length; i++)
		if (lBismo.guildAccounts[i] != null)
			if (lBismo.guildAccounts[i].id == ID)
				return lBismo.guildAccounts[i];

	if (data==null)
		data = {}

	data.id = ID;
	data.name = Bismo.GetDiscordGuildObject(ID).name;

	// Bismo.log(data);
	if (data.name == undefined) // this guild doesn't actually exist.
		return undefined;

		

	var gData = new GuildAccount(data);

	lBismo.guildAccounts.push(gData);
	Bismo.SaveGuilds();
	return gData;
}

// Returns a GuildAccount
Bismo.GetBismoGuildObject = function(ID) {
	for (var i = 0; i<lBismo.guildAccounts.length; i++)
		if (lBismo.guildAccounts[i] != null)
			if (lBismo.guildAccounts[i].id == ID)
				return lBismo.guildAccounts[i];
}

Bismo.RemoveGuild = function(ID) {
	for (var i = 0; i<lBismo.guildAccounts.length; i++)
		if (lBismo.guildAccounts[i] != null)
			if (lBismo.guildAccounts[i].id == ID) {
				// lBismo.guildAccounts[i] = undefined;
				lBismo.guildAccounts.splice(i,1);
			}

	Bismo.SaveGuilds();
}


// Returns a list of Discord userIDs from a guild
Bismo.GetGuildUsers = async function(guildID) {
	return await Bismo.GetDiscordGuildObject(guildID).members.fetch();
}
Bismo.GetGuildUserIDs = function(guildID) {
	var users = Bismo.GetGuildUsers(guildID);

	var cleanUsers = []
	for (var i = 0; i<users.length; i++)
		if (users[i]!=null)
			if (users[i].id != undefined)
				cleanUsers.push(users[i].id);

	return cleanUsers;
}

// Returns an array of Bismo Accounts for the users in a guild
// Bismo.GetGuildBismoAccounts = function(guildID) {
// 	var users = Bismo.GetGuildUserIDs(guildID);
// 	var accs = [];
// 	for (var i = 0; i<users.length; i++)
// 		if (users[i]!=null)
// 			accs.push(Bismo.GetAccount(users[i]));

// 	return BSF.getCleanArray(accs);
// }

// Checks to see if a Bismo account (linked to ID) is in a particular guild
// Bismo.IsAccountGuildMember = function(ID, guildID) {
// 	var account = Bismo.GetAccount(ID);
// 	if (account != undefined) {
// 		for (var i = 0; i<account.guilds.length; i++) {
// 			if (account.guilds[i].id == guildID)
// 				return true;
// 		}
// 	}

// 	return false;
// }
// If this Discord ID is in a guild
Bismo.IsDiscordGuildMember = function(ID, guildID) {
	var members = Bismo.GetGuildUserIDs(guildID);
	for (var i = 0; i<members.length; i++) {
		if (members[i] == ID)
			return true;
	}

	return false;
}

// Returns an array of Bismo accounts that are considered Admins for a particular guild
Bismo.GetGuildAdminAccounts = function(ID) {
	// get all guild members for ID,
	// check permissions

	var accts = Bismo.GetGuildBismoAccounts(ID);
	var admins = [];
	for (var i = 0; i<accts.length; i++) {
		if (accts[i].hasPermission("discord.administrator")) {
			admins.push(accts[i]);
		}
	}

	return admins;
}

// Returns a string of mentions for guild admins
Bismo.GetGuildAdminMentions = function(ID) {
	var accts = Bismo.GetGuildBismoAccounts(ID);
	var admins = [];
	for (var i = 0; i<accts.length; i++) {
		if (accts[i].hasPermission("discord.administrator.mention")) { // Only allow accounts with discord.administrator.mention
			for (var b = 0; b<accts[i].linkedAccounts.length; b++) {
				if (Bismo.IsDiscordGuildMember(accts[i].linkedAccounts[b].id))
					admins.push(accts[i].linkedAccounts[b].id); // This ID is in the guild
			}
			
		}
	}
	
	// we got the admin accounts, now formulate the mentions
	var mention = "";
	for (var i = 0; i<admins.length; i++) {
		mention = mention + "<@" + admins[i] + "> ";
	}
	return mention;
}

// Returns all the channels in a guild (optional: if they are X type)
Bismo.GetGuildChannels = function(ID, type) {

	var channels = Bismo.GetDiscordGuildObject(ID).channels.cache.array();
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

// Return the voice channel ID that user $userID is in on the guild $guildID
Bismo.GetCurrentVoiceChannel = function(guildID, userID) {
	voiceChannels = Bismo.GetGuildChannels(guildID, "voice");

	for (var i = 0; i<voiceChannels.length; i++)
	{	
		var members = voiceChannels[i].members.array();
		for (var m = 0; m<members.length; m++)
			if (members[m].id == userID)
				return voiceChannels[i].id;
	}

	return undefined;
}

// Return the channel object for $channelID in guild $ID
Bismo.GetGuildChannelObject = function(ID,channelID) {
	var g = Bismo.GetDiscordGuildObject(ID);
	if(g.channels != undefined) {
		// utilLog(g.channels)
		var channels = g.channels.cache.array()
		// var channel = g.channels.get(channelID);
		// return channel;

		for(var o = 0; o<channels.length; o++) {
			if (channels[o]!=null) {
				if (channels[o].id == channelID) {
					return channels[o];
				}
			}
		}
	}

	return undefined;
}



// ** Bot internal? API

// Registers a command
// we have to wait until after the bot logins to register slash commands!
awaitingRegister = []; // This array will contain the commands that need to be registered
Bismo.RegisterCommand = function(alias, handler, options) {
	// https://discord.com/developers/docs/interactions/slash-commands
	// https://gist.github.com/advaith1/287e69c3347ef5165c0dbde00aa305d2 # making the API calls with Discord.JS

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
			if (Client.user != undefined) {
				if (options.whitelistGuilds) {
					for (var i = 0; i<options.whitelistGuilds.length; i++) { // Only add the command to guilds that are allowed to use the command ;P
						try {
							Client.api.applications(Client.user.id).guilds(options.whitelistGuilds[i]).commands.post({data: {
								name: alias,
								description: options.description,
								options: options.slashCommandOptions,
							}}).error(()=> {
								console.log("[B] Failed to register slash command.");
							});
						} catch(e) {
							// failed
							console.log(e)
							console.log("[B] Failed to register slash command.");
						}
					}
				} else {
					Client.api.applications(Client.user.id).commands.post({data: {
						name: alias,
						description: options.description,
						options: options.slashCommandOptions,
					}}).error(()=> {
						console.log("[B] Failed to register slash command.");
					});;
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

Bismo.registerCommand = function(name, handler, description, helpMessage, data) {
	if (data == undefined)
		data = {};
	if (Commands.get(name) == undefined) {
		Bismo.log(`[32mNew command registered: "!${name}"[0m`);
		Commands.set(name, {
			handler: handler,
			description: description,
			helpMessage: helpMessage,
			usersOnly: data.usersOnly,
			chatCommand: true,
			slashCommand: false,
			whitelistGuilds: data.whitelistGuilds,
			blacklistGuilds: data.blacklistGuilds,
			hidden: data.hidden,
			guildRequired: data.guildRequired,
			noParams: data.noParams,
		});
		return true;
	} else {
		Bismo.log(`[91mFailed to register command "!${name}"! It was already registered.[0m`)
		return false;
	}
}



/**
 * Gets a plugin's API
 * 
 * @param {string} name - Name of the plugin (either friendly name or package name)
 * @param {boolean} [mustBePackage = false] - Whether or not the name is the package name.
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
 * @param {string} name - Name of the plugin
 * @param {string} method - Name of the method
 * @param {boolean} [mustBePackage = false] - Whether or not the name is the package name.
 * @return {function} Requested plugin method
 */
Bismo.GetPluginMethod = function(name, method, mustBePackage) {
	let plugin = Bismo.GetPlugin(name, mustBePackage);

	if (plugin != undefined) {
		return plugin[method];
	}
}








// Plug-ins
var Plugins = {};
const { readdirSync, statSync } = require('fs')
const { join } = require('path');
const { exception } = require('console');

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

				var plugin = require(`./Plugins/${fName}/plugin.js`); // Load the code
					
				let name  = fName;
				if (plugin.manifest == null)
					plugin.manifest = {
						name: fName,
						version: 1,
						packageName: `bismo.unknown.${fName}`,
					};
				else if (!SF.isNullOrEmpty(plugin.manifest.name))
					name = plugin.manifest.name;

				if (plugin.manifest.version == null)
					plugin.manifest.version = 1;

				var legacyLoad = false; // Currently legacy load is version one (OG). I'll support at least one version back, and I'll *try* to go two back (but imo that's a horrible idea)
				if (plugin.manifest.version < 2)
					legacyLoad = true;

				Bismo.log(`[B] Loading plugin (${i + 1}/${dirs.length}) ${name}`); // Hey, we're loading!
				Plugins[name] = plugin;

				const requests = {
					Bismo: {...Bismo}
				};

				if (plugin.requests != undefined)
					for (var a = 0; a < plugin.requests.length; a++) {
						var component = plugin.requests[a];
						switch (component) {
							case "express":
								requests.express = express;
								break;

							case "httpServer":
								requests.httpServer = httpServer;
								break;

							default:
								break;
						}
					}


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

				requests.Bismo.ReadConfig = function(name) { // You can provide a special configuration name here.
					try {
						if (name!=undefined) {
							return require(`./Plugins/${fName}/${name}.json`);
						}
						else {
							return require(`./Plugins/${fName}/config.json`);
						}
					} catch (err) {
						// error
						console.error(`[B - ${fName} ] Error loading configuration file "config.json".`);
					}
				}

				requests.Bismo.WriteConfig = function(data, callback, name) { // Same above with the name
					if (name!=undefined)
						fs.writeFile(`./Plugins/${fName}/${name}.json`, JSON.stringify(data), 'utf8', o_O=>{ if (typeof callback === "function") callback(o_O); });
					else
						fs.writeFile(`./Plugins/${fName}/config.json`, JSON.stringify(data), 'utf8', o_O=>{ if (typeof callback === "function") callback(o_O); });
				}
				requests.Bismo.log = function(msg) {
					Bismo.log("\x1b[36m[ " + fName + " ] " + msg + "\x1b[0m");
				}
				requests.Bismo.error = function(msg) {
					Bismo.log("\x1b[35m[ " + fName + " ] " + msg + "\x1b[0m");
				}
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
				//Bismo.log("[B] Warning! Invalid plugin: " + fName);
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
*	Each event is emitted with a /Bismo/ "packet" which is a special version of the API that only allows access to that guild
*
*/
var loaded = false; // Set to true if we can load guild data (and setup the bot) correctly


Bismo.log("[B] Plugins loaded.");

Bismo.events.bot.emit('pluginsLoaded');


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
		Bismo.events.discord.emit('voiceChannelJoin', newUserChannel, { oldMember: oldMember, newMember: newMember }); // Call observer

	} else if(newUserChannel === undefined){
		// User leaves a voice channel
		Bismo.events.discord.emit('voiceChannelLeave', oldUserChannel, { oldMember: oldMember, newMember: newMember }); // Call observer)
	}
})



/*  MESSAGES / COMMANDS  */
Client.on("message", message => {
	try {
		// The most import part, commands.
		if(message.type === "PINS_ADD" && message.author.bot) message.delete(); // Remove pin notifications from the bot.

		if (message.author.bot || message.author.system) return; // Do not process bot responses.
		// we should not sha1 this, seems slow as hell
		if (lBismo.waitForReply.indexOf(crypto.createHash('sha1').update(message.author.id + message.channel.id).digest('base64'))>-1) return; // Do not process reply responses. (this is already processed.)


		// // Emotes
		// if (message.content.startsWith("<:") && message.content.endsWith(">")) {
		// 	if (message.content.startsWith("<:dawson:")) {
		// 		message.delete().then(o_o=>{ message.channel.send("", {files: ["https://s.cnewb.co/dawson.png"]}) });
		// 	}

		// 	return;
		// }





		// Grab required data
		var guildID = message.author.id;
		if (message.guild!=undefined)
			guildID = message.guild.id;

		var myMention = "<@!" + Client.user.id + ">";
		var guildData = Bismo.GetBismoGuildObject(guildID);


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
		const args = message.content.slice(prefix.length).trim().split(/ +/g); //Chop off the prefix, trim, split using spaces.
		const command = args.shift().toLowerCase();


		// Generate command packet
		var commandData = {
			alias: command,
			args: args,
			channel: message.channel,
			author: message.author,
			authorID: message.author.id,
			guildID: guildID,
			guild: Bismo.GetDiscordGuildObject(guildID),
			inGuild: (message.guild != undefined)? true : false,
			guildAccount: Bismo.GetBismoGuildObject(guildID),
			isInteraction: false,
		}

		message.firstReply = true;

		commandData.Reply = function(msg) {
			if (message.firstReply) {
				message.channel.stopTyping();
				message.firstReply = false;
			}
			message.channel.send(msg);
		}
		commandData.reply = commandData.Reply;

		commandData.message = message;

		commandData.GetReply = function(prompt, callback, options) {
			if (options == undefined)
				options = {};

			if (options.cancelCommand == undefined || options.cancelCommand == "")
				options.cancelCommand == "!~cancel"

			message.reply(prompt + "\nTo cancel, type `" + options.cancelCommand + "`");

			Bismo.getUserReply(message.author.id, message.channel.id, callback, options);
		}

		// Okay, we have everything.
		// Emit an event.
		Bismo.events.discord.emit('message', message); // ideally this would be able to be captured so listening code could halt execution and/or we wait for the listeners.

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
						if (cmd.whitelistGuilds[i] == guildID) {
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
						if (cmd.blacklistGuilds[i] == guildID) {
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


			message.channel.startTyping();

			if (args[0] == "help" || (args[0] == undefined && cmd.requireParams == true)) {
				// Display the help message automatically
				commandData.Reply("`" + command + "` - " + cmd.description + "\n" + cmd.helpMessage)
			}
			else {
				(async function(){ // nasty catcher v923
					cmd.handler(commandData);
				})().catch((err)=>{
					console.error("[B] Command error, cmd: " + command + ".\nFull message: " + message.content);
					dlog("[B-e] Trace: " + err.stack);
					return true;
				}).finally(async ()=>{
					await new Promise(resolve => setTimeout(resolve, 500));
					message.channel.stopTyping(true);
				}); // Run async
				
			}
			return;
		}// unknown command else {}
	} catch (err) {
		console.error("Command fault. Guild? " + ((message.guild!=undefined)? "true" : "false") + "Message: " + message.content);
		dlog("[B-e] Trace: " + err.stack);
	}
});


// Sample reply:
/*
{
  version: 1,
  type: 2,
  token: '',
  member: {
    user: {
      username: 'Corporate America',
      public_flags: 0,
      id: '',
      discriminator: '',
      avatar: ''
    },
    roles: [ '', '' ],
    premium_since: null,
    permissions: '',
    pending: false,
    nick: null,
    mute: false,
    joined_at: '',
    is_pending: false,
    deaf: false,
    avatar: null
  },
  id: '858419041417035828',
  guild_id: '',
  data: { 
  	options: [
      { value: 'animal_cat', type: 3, name: 'animal' },
      { value: true, type: 5, name: 'only_smol' }
    ],
  	name: 'testcommand',
  	id: '858418480062922814'
  },
  channel_id: '',
  application_id: ''
}

*/

// Bismo.RegisterCommand("testCommand", bruh => {
// 		// utilLog(bruh);
// 		bruh.Reply("reply1")
// 		setTimeout(()=>{
// 			bruh.Reply("you've been GNOMED");
// 		}, 1500);
// 	}, {
// 		friendlyName: "Test Command",
// 		description: "Used to test things. Send a random adorable animal photo",
// 		helpMessage: "I don't know",
// 		slashCommand: true,
// 		chatCommand: false,
// 		whitelistGuilds: ['344624502954524684'],
// 	});

Client.ws.on('INTERACTION_CREATE', async interaction => { // async?
	// We've received an interaction. This could be either a message component or a slash command
	// Since we only support slash commands at the moment, I'm going on the assumption it's one of those
	try {
		if (interaction.type != 2) // 1 = ping, 2 = slash command, 3 = message component
			return;

		if (interaction.data == undefined)
			return;

		let cmd = Commands.get(interaction.data.name);

		Client.api.interactions(interaction.id, interaction.token).callback.post({
			data: {
				type: 5,
				data: {
					content: "Processing...",
					flags: 1<<6,
				}
			}
		}); // This sends "is thinking" as the first response. This allows the user to see that the command was received.

		var authorID = "";
		if (interaction.member != undefined)
			authorID = interaction.member.user.id;
		else
			authorID = interaction.user.id;

		var userObject = await Client.users.fetch(authorID); // Fetch the user object

		var commandData = {
			alias: interaction.data.name, // for the idiot that uses the same handler for every command. LOL who would do that? hahaha don't look at my stuff
			author: userObject,
			authorID: authorID,
			guildID: interaction.guild_id,
			guild: Bismo.GetDiscordGuildObject(interaction.guild_id),
			inGuild: (interaction.guild_id != undefined)? true : false,
			guildAccount: Bismo.GetBismoGuildObject(interaction.guild_id),
			isInteraction: true, // duh lol xD god I've drunk so much caffeine I DID COKE LMAO - COKE MORE LIKE CODE POWDER XDDDD waitwait CODING SOCKES: ACTIVE, CODING POWDER: SNORTED LOLLLL
		};

		// Phrase the args.
		commandData.args = [];
		if (interaction.data.options) {
			if (interaction.data.options.length >= 1) {
				for (var i = 0; i<interaction.data.options.length; i++) {
					commandData.args[i] = interaction.data.options[i].value;
				}
			}
		}

		interaction.firstReply = true;
		commandData.channel = Bismo.GetGuildChannelObject(interaction.guild_id, interaction.channel_id);

		commandData.Reply = function(msg) {
			if (interaction.firstReply) {
				interaction.firstReply = false;
				// update the interaction response
			}
			// } else {
				// send message
				// interaction.channel.send(msg); // technically we can just do the same as the above but fuck it
			// }
			Client.api.webhooks(Client.user.id, interaction.token).post({
				type: 4,
				data: {
					content: msg,
					flags: 1<<6,
				}
			});
				//send(msg);
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
		dlog("Interaction: " + interaction.data.name)
		if (cmd != undefined) {
			if (!cmd.slashCommand) {
				// unregister command
				commandData.Reply("O_O !! Command fault, stagnant (unknown) command.");
				return; // Not a slash command (why was it registered?)
			}

			var inGuild = interaction.guild_id != undefined;
			if (inGuild) {
				if (cmd.usersOnly) {
					commandData.Reply("O_O !! Command fault, command can only be used in the DMs.");
					return;
				}
				if (cmd.whitelistGuilds != undefined) {
					var whitelisted = false;
					for (var i = 0; i<cmd.whitelistGuilds.length; i++) {
						if (cmd.whitelistGuilds[i] == interaction.guild_id) {
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
						if (cmd.blacklistGuilds[i] == interaction.guild_id) {
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

				if (interaction.firstReply) {
					// remove?
					// new Discord.WebhookClient(Client.user.id, interaction.token).send('👌')//.then(()=> {
						// setTimeout(() => { 
							// Client.api.webhooks(Client.user.id, interaction.token).messages('\@original').delete(); // delete that message, lol
						// }, 1000);

					// });
				}
			})().catch((err) => {
				console.error("[B] Command (interaction) error, cmd: " + interaction.data.name);
				dlog("[B-e] Trace: " + err.stack);
				commandData.Reply("O_O !! Command fault, unexpected exception.")
				return;
			});

		} else {
			// unknown command, unregister
			commandData.Reply("O_O !! Command fault, stagnant (unknown) command.");
			return;
		}
	} catch(error) {
		console.error("Command fault (unexpected exception in interaction handler).");
		dlog("[B-e] Trace: " + error.stack);
		new Discord.WebhookClient(Client.user.id, interaction.token).send('Bismo command fault (unexpected exception in interaction handler).');
	}
}); // End interaction create



/*  STARTUP  */

Client.on("ready", () => {
	lBismo.guildObjects = {};
	var guilds = Client.guilds.cache.array();
	for (var i = 0; i<guilds.length; i++) {
		lBismo.guildObjects[guilds[i].id] = guilds[i];
		Client.api.applications(Client.user.id).guilds(guilds[i].id).commands.put({data: []});
	}

	Bismo.botID = Client.user.id;

	Bismo.log(`\x1b[36m[D] Bot is starting up with ${Client.users.cache.size} users in ${Client.channels.cache.size} channels of ${Client.guilds.cache.size} guilds.\x1b[0m`);
	if (Client.users.size >= 1000 || Client.guilds.size >= 250)
		Bismo.log("This may take a while...");

	Client.user.setActivity("Bismo is loading...");

	// Here we can load the guilds up (one-by-one)

	// Register the slash commands now
	Client.api.applications(Client.user.id).commands.put({data: []}); // clear the commands first

	

	if (awaitingRegister.length>=1)
		for (var i = 0; i<awaitingRegister.length; i++) {
			let alias = awaitingRegister[i];
			var cmd = Commands.get(alias);
			if (cmd != undefined) {
				try {
					if (cmd.whitelistGuilds != undefined) {
						for (var b = 0; b<cmd.whitelistGuilds.length; b++) { // Only add the command to guilds that are allowed to use the command ;P
							// lol used i and not b, screwed the loader! hahaha whoops ....
							Client.api.applications(Client.user.id).guilds(cmd.whitelistGuilds[b]).commands.post({data: {
								name: alias,
								description: cmd.description,
								options: cmd.slashCommandOptions,
							}}).error(()=> {
								console.log("[B] Failed to register `" + alias + "`");
							});
						}
					} else {
						if (debug) {
							let keys = Object.keys(lBismo.guildObjects);
							for (var o = 0; o<keys.length; o++) {
								Client.api.applications(Client.user.id).guilds(keys[o]).commands.post({data: {
									name: alias,
									description: cmd.description,
									options: cmd.slashCommandOptions,
								}}).error(()=> {
								console.log("[B] Failed to register `" + alias + "`");
							});
							}
						} else {
							Client.api.applications(Client.user.id).commands.post({data: {
								name: alias,
								description: cmd.description,
								cmd: cmd.slashCommandOptions,
							}}).error(()=> {
								console.log("[B] Failed to register `" + alias + "`");
							});;
						}
					}
					console.log("[B] Registered `" + alias + "`");
				} catch(e) {
					// failed
					// console.log(e)
					console.log("[B] Failed to register `" + alias + "`");
				}
			}
		}

	// (async () => {
 //    // let commands = await Client.api.applications(Client.user.id).commands.get();
 //    let commands = await Client.api.applications(Client.user.id).guilds('344624502954524684').commands.get();
 //    utilLog(commands);
 //  })();



	fs.readFile('./Data/Guilds.json', 'utf8', (err, data) => {
		if (err) {
			// Load error
			console.warn(err);
			console.warn("Failed to load guild data, bot will not function correctly.");
			Client.user.setActivity("Startup failure.");
			loaded = false;
			return;
		}

		if (data.substr(0,5) == "DPAPI") {
			// Yes
			data = data.substr(5);
			data = dpapi.unprotectData(Buffer.from(data, 'utf-8'), entropy, "CurrentUser"); // Note: you can also use the LocalMachine key rather than CurrentUser
			// The null refers to the option entropy that we're ignoring
		}


		function completed() {
			Client.user.setActivity(Config.Discord.activity);
			Bismo.log("[B] Bismo loaded.");
			Bismo.events.discord.emit('ready', Client);
		}

		// lBismo.guildAccounts = JSON.parse(data); // Load the guilds
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
			let guild = new GuildAccount(guilds[i]);
			if (guild != undefined)
				lBismo.guildAccounts.push(guild);
		}

		// Update the permissions for each Bismo account (since we save permissions with the guilds, not users.)
		// for (var i = 0; i<Accounts.length; i++) {
		// 	if (Accounts[i]!=null) {
		// 		Accounts[i].updatePermissions(GAccounts);
		// 	}
		// }
		
		var loaded = 0;
		if (lBismo.guildAccounts.length == 0) {
			// loaded
			completed();

		} else {
			for (var i = 0; i<lBismo.guildAccounts.length; i++) {
				if (lBismo.guildAccounts[i]==null)
					continue;
				
				var gID = lBismo.guildAccounts[i].id;
				Client.guilds.fetch(gID).then(gD => {
					// Setup the guild
					var BismoPacket = {
						gID: gID, // The guild ID
						guild: gD, // Discord guild object
						bismoGuildObject: lBismo.guildAccounts[i], // The guild account
					};
					Bismo.events.bot.emit('guildDiscovered', BismoPacket);
					loaded++;


					if (loaded>= lBismo.guildAccounts.length) {
						loaded = true;
						completed();
					}
				});
			}
		}
	});


});



// Okay, we're ready to "start"


// Web server
httpServer.listen(Config.webPort, () => {
	Bismo.log("[Web] Express server listening on port " + Config.webPort);
});



app.get("/", (req, res) => {
	res.end(`<html>
	<head>
		<title>Project Bismo</title>
	</head>
	<body>
		<h1>Landing page</h1>
	</body>
</html>`);
});






// Start the bot

Bismo.RegisterCommand("version", message => {
		let debugActive = "";
		if (Bismo.debugMode) {
			debugActive = "\n`{*debug*, isWin?" + Bismo.isWindows + "}`";
		}

		message.Reply("Running  _Bismo_  version `" + Bismo.version + "` " + debugActive + "");
	}, {
		description: "Reveal which version of Bismo is under the hood.",
		helpMessage: "Usage:\n`/version`",
		requireParams: false,
		chatCommand: true,
		slashCommand: true
	});


// go for launch
Client.login(Config.Discord.token);


// fs.readFile('./accounts.json', 'utf8', function readFileCallback(err, data){
// 	if (err){
// 		Bismo.log("\x1b[31mError loading account data! The bot has halted until the error is solved. (Possible arroundData corruption?)\n\nError: " + err + "\x1b[0m");
// 		process.exit(1);
// 	} else {
// 		var accountJSON = JSON.parse(data);
// 		for (var i = 0; i<accountJSON.length; i++)
// 		{
// 			Accounts.push(BismoAccount(accountJSON[i]))
// 		}

// 		Bismo.log("[B] Accounts loaded.");
		
// 	}
// });