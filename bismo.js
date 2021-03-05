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
const build = "3.0.1[1]";

const useDPAPI = false; // DPAPI is currently broken here
var isWin = process.platform === "win32";

const endTerminalCode = "\x1b[0m\x1b[47m\x1b[30m"; // Default colors, \x1b[47m\x1b[30m: Black text, white background




const Bismo = {
	
} // This is the public API given to the plug-ins

const ogLog = console.log;
Bismo.log = function(msg) {
	ogLog(msg + endTerminalCode);
}
console.log = Bismo.log;

ogLog(endTerminalCode);
ogLog();
if (!debug) {
	process.stdout.write('\033c'); // Clear
	console.clear();
};


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


function writeJSONFileSync(path, contents) {
	if (!isWin || !useDPAPI) {
		fs.writeFileSync(path, contents, 'utf8');
	} else {
		contents = JSON.stringify(contents);
		var encrypted = dpapi.protectData(Buffer.from(contents, 'utf-8'), null, "CurrentUser").toString();
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
			return JSON.parse(dpapi.unprotectData(Buffer.from(contents, 'utf-8'), null, "CurrentUser")); // Note: you can also use the LocalMachine key rather than CurrentUser
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
const Client = new Discord.Client();

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

const Config = readJSONFileSync('./config.json');

var GAccounts = []; // These are our configurations regarding guilds
var Accounts = []; // " regarding users

var Commands = {};
var WaitForReply = [];
// Use this to wait for additional input from a user. When called, the user ($ID)'s next message will be sent straight to the callback function. We do not process the next message from user $ID (as a command or anything else)
// To cancel input collection, the user just has to reply with the "cancel command". Note, this command DOES NOT require the user to type the bot's prefix, (! or its mention) for us to process it. The user just types the cancel command in its entirety.
Bismo.waitForUserMessage = function(id, channel, cancelCommand, callback, filter, options) { // userID, reply channel, cancel command (to stop listening), callback function (when reply got), filter, options
	var wFRID = crypto.createHash('sha1').update(id + channel).digest('base64');
	WaitForReply.push(wFRID); // So we can ignore the reply in the main bot message handler
	if (filter ==  undefined)
		filter =  m => m.author.id === id; // Sets our filter to only accept messages from the user with $ID
	if (cancelCommand == undefined || cancelCommand == "")
		cancelCommand == "!~cancel"
	var collector = new Discord.MessageCollector(channel, filter, options);
	collector.on('collect', msg => { 
		collector.stop(); // Stop collection
		var i = WaitForReply.indexOf(wFRID);
		if (i>-1) {
			WaitForReply.splice(i,1); // Remove user from WaitForReply list
		}
		if (msg.content === cancelCommand)
		{
			channel.send("Canceled.")
			return;
		}
		msg.args = msg.content.trim().split(/ +/g); //Chop off the prefix, trim, split using spaces.
		callback(msg); // Return the message
	});
}

Bismo.getUserReply = function(userID, channelID, callback, options) {
	if (options == undefined)
		options = {};

	if (options.cancelCommand == undefined || options.cancelCommand == "")
		options.cancelCommand == "!~cancel"

	Bismo.waitForUserMessage(userID, channelID, options.cancelCommand, callback || options.callback, options.filter, options.options);
}



function dlog(msg) {
	if (debug)
		Bismo.log("[Debug] " + msg);
}




/*  Bismo API  */

Bismo.saveGuilds = function() {
	// Clear runtime settings, convert to JSON, save file

	var CleanGuilds = SF.getCleanArray(GAccounts);
	for (var i = 0; i<CleanGuilds.length; i++) {
		CleanGuilds.runtime = undefined;
	}

	Bismo.log(GAccounts)

	fs.writeFile('./guilds.json', JSON.stringify(CleanGuilds), 'utf8', o_o => {
		dlog("Guild data saved.");
	})
}
Bismo.saveAccounts = function() {
	var CleanAccounts = [];
	var CleanTable = BSF.getCleanArray(Accounts);
	for (var i = 0; i<CleanTable.length; i++) {
		CleanAccounts.push(CleanTable[i].getSterial());
	}

	fs.writeFile('./accounts.json', JSON.stringify(CleanAccounts), 'utf8', o_O=>{
		dlog("Account data saved.");
	});
}

// Returns the Bismo account for this ID (typically the Discord user ID)
// Can be any linked account IDs
// Returns undefined if no account was found
Bismo.getAccount = function(ID) {
	var acc = undefined;
	for (var i = 0; i<Accounts.length; i++)
		if (Accounts[i] != null) {
			if (Accounts[i].accountName == ID)
				return Accounts[i];
			if (Accounts[i].linkedAccount!=null)
				for (var o = 0; o<Accounts[i].linkedAccounts.length; o++)
					if (Accounts[i].linkedAccounts[o] != null)
						if (Accounts[i].linkedAccounts[o].id == ID)
							return Accounts[i];
		}
	return acc;
}

// Checks to see if the Bismo account exists for this ID (typically the Discord user ID)
// Returns false if Bismo.getAccount returns undefined (I.E. no account)
Bismo.accountExists = function(ID) {
	return (Bismo.getAccount(ID)!=undefined);
}

// Adds a Bismo account (ID is the account ID, typically the Discord user ID)
Bismo.addAccount = function(userID, username, metaData) { // metaData is reserved for additional data
	if (Bismo.accountExists(userID))
		return;


	var ourGuilds = []
	// go through all our guilds and check if the user is in them.
	// note: for some dumbass reason, either the user has to interact with the bot in these servers OR the bot has to interact with these servers before the members list is accurate..
	// jesus I hate this thing more and more as the days go on
	var guilds = Client.guilds.cache;
	for (var i = 0; i<guilds.length; i++)
	{
		var member = guilds[i].members.get(userID)
		if (member!=null) {
			if (member.id == userID)
			{
				// We have this guild together
				ourGuilds.push({ ID: guilds[i].id, type: 0 });
			}
		}
	}

	var acct = new BismoAccount({
		accountName: userID,
		initalLink: {
			accountID: userID,
			username: username
		},
		guilds: ourGuilds
	});

	// Account 'created', now add it to the account list and save

	dlog(username + " created an account! (" + userID + ")");
	acct.updatePermissions(GAccounts);
	Accounts.push(acct);
	Bismo.saveAccounts();
	return acct;
}

Bismo.removeAccount = function(ID) {
	for (var i = 0; i<Accounts.length; i++)
		if (Accounts[i] != null) {
			if (Accounts[i].accountName == ID)
			{
				dlog("Deleting account " + Accounts[i].accountName);
				Accounts[i] = undefined;
				Bismo.saveAccounts();
				return true;
			}
			if (Accounts[i].linkedAccount!=null)
				for (var o = 0; o<Accounts[i].linkedAccounts.length; o++)
					if (Accounts[i].linkedAccounts[o] != null)
						if (Accounts[i].linkedAccounts[o].id == ID)
						{
							dlog("Deleting account " + Accounts[i].accountName);
							Accounts[i] = undefined;
							Bismo.saveAccounts();
							return true;
						}
	}
	return false;
}

// ================================

// Get the Discord GuildManager
Bismo.getGuildManager = function(ID) {
	Bismo.log("Fetching ID: " + ID);
	var a = GuildManagers[ID];
	return a;

	// Client.guilds.fetch(ID)
	// 	.then(data => { return data })
	// 	.catch(console.error);
}

// Adds a GuildAccount
Bismo.addGuild = function(ID, data) {
	// Check if this guild account exists
	for(var i = 0; i<GAccounts.length; i++)
		if (GAccounts[i] != null)
			if (GAccounts[i].id == ID)
				return GAccounts[i];

	if (data==null)
		data = {}

	data.id = ID;
	data.name = Bismo.getGuildManager(ID).name;

	Bismo.log(data);
	if (data.name == undefined) // this guild doesn't actually exist.
		return undefined;

		

	var gData = new GuildAccount(data);

	GAccounts.push(gData);
	Bismo.saveGuilds();
	return gData;
}

// Returns a GuildAccount
Bismo.getGuild = function(ID) {
	for (var i = 0; i<GAccounts.length; i++)
		if (GAccounts[i] != null)
			if (GAccounts[i].id == ID)
				return GAccounts[i];
}

Bismo.resetGuild = function(ID) {
	for (var i = 0; i<GAccounts.length; i++)
		if (GAccounts[i] != null)
			if (GAccounts[i].id == ID)
				GAccounts[i] = undefined;

	Bismo.saveGuilds();
}


// Returns a list of Discord userIDs from a guild
Bismo.getGuildUserIDs = function(ID) {
	var users = Client.users.cache.array();

	var cleanUsers = []
	for (var i = 0; i<users.length; i++)
		if (users[i]!=null)
			if (users[i].id)
				cleanUsers.push(users[i].id);

	return cleanUsers;
}

// Returns an array of Bismo Accounts for the users in a guild
Bismo.getGuildBismoAccounts = function(guildID) {
	var users = Bismo.getGuildUserIDs(guildID);
	var accs = [];
	for (var i = 0; i<users.length; i++)
		if (users[i]!=null)
			accs.push(Bismo.getAccount(users[i]));

	return BSF.getCleanArray(accs);
}

// Checks to see if a Bismo account (linked to ID) is in a particular guild
Bismo.isGuildMember = function(ID, guildID) {
	var account = Bismo.getAccount(ID);
	if (account != undefined) {
		for (var i = 0; i<account.guilds.length; i++) {
			if (account.guilds[i].id == guildID)
				return true;
		}
	}

	return false;
}
// If this Discord ID is in a guild
Bismo.isDiscordGuildMember = function(ID, guildID) {
	var members = Bismo.getGuildUserIDs(guildID);
	for (var i = 0; i<members.length; i++) {
		if (members[i] == ID)
			return true;
	}

	return false;
}

// Returns an array of Bismo accounts that are considered Admins for a particular guild
Bismo.getGuildAdmins = function(ID) {
	// get all guild members for ID,
	// check permissions

	var accts = Bismo.getGuildBismoAccounts(ID);
	var admins = [];
	for (var i = 0; i<accts.length; i++) {
		if (accts[i].hasPermission("discord.administrator")) {
			admins.push(accts[i]);
		}
	}

	return admins;
}

// Returns a string of mentions for guild admins
Bismo.getGuildAdminMentions = function(ID) {
	var accts = Bismo.getGuildBismoAccounts(ID);
	var admins = [];
	for (var i = 0; i<accts.length; i++) {
		if (accts[i].hasPermission("discord.administrator.mention")) { // Only allow accounts with discord.administrator.mention
			for (var b = 0; b<accts[i].linkedAccounts.length; b++) {
				if (Bismo.isDiscordGuildMember(accts[i].linkedAccounts[b].id))
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
Bismo.getGuildChannels = function(ID, type) {

	var channels = Bismo.getGuildManager(ID).channels.cache.array();
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
Bismo.getCurrentVoiceChannel = function(guildID, userID) {
	voiceChannels = Bismo.getGuildChannels(guildID, "voice");

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
Bismo.getGuildChannelObject = function(ID,channelID) {
	var g = Bismo.getGuildManager(ID);
	if(g.channels!=null) {
		var channels = g.channels.array()
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
Bismo.registerCommand = function(name, handler, description, helpMessage, data) {
	if (data == undefined)
		data = {};
	if (Commands[name] == undefined) {
		Bismo.log("\x1b[32mNew command registered: \"!" + name + "\"\x1b[0m");
		Commands[name] = {
			handler: handler,
			description: description,
			helpMessage: helpMessage,
			usersOnly: data.usersOnly,
			whitelistGuilds: data.whitelistGuilds,
			blacklistGuilds: data.blacklistGuilds,
			hidden: data.hidden,
			guildRequired: data.guildRequired,
			noParams: data.noParams,
		};
		return true;
	} else {
		dlog("Failed to register command \"!" + name + "\"! It was already registered.")
		return false;
	}
}





// Plug-ins
var Plugins = {};
const { readdirSync, statSync } = require('fs')
const { join } = require('path')

const getDirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
var dirs = getDirs('./Plugins');
Bismo.log("[B] Found " + dirs.length + " potential plugins..");
for (var i = 0; i<dirs.length; i++) {
	(function() {
		const fName = dirs[i]; // Folder name
		try {
			if (fs.existsSync('./Plugins/' + fName + '/plugin.js')) { // Plugin file exists?
				var plugin = require('./Plugins/' + fName + '/plugin.js'); // Load the code
					
				let name  = fName;
				if (plugin.manifest == null)
					plugin.manifest = {
						name: fName,
						packageName: "bismo.unknown.package." + fName,
					};
				else if (!SF.isNullOrEmpty(plugin.manifest.name))
					name = plugin.manifest.name;

				Bismo.log("[B] Loading plugin (" + (i+1) + "/" + dirs.length + ") " + name); // Hey, we're loading!
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

							case "masterConfig": // Probably shouldn't provide since the plugin has its own config file...
								requests.masterConfig = Config;
								break;

							default:
								break;
						}
					}


				requests.Bismo.getPlugin = function(name, mustBePackage) {
					function getFromPackageName(name) {
						for (const [key, value] of Object.entries(Plugins)) {
							if (Plugins[key].manifest.packageName == name) {
								return Plugins[key].api;
							}
						}

						Bismo.log("\x1b[31m[B - " + fName + " ] Error, failed to load plugin API for " + name + " (that plugin does not exist." + "\x1b[0m");
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

				requests.Bismo.readConfig = function(name) { // You can provide a special configuration name here.
					try {
						if (name!=undefined) {
							return require('./Plugins/' + fName + '/' + name + '.json');
						}
						else {
							return require('./Plugins/' + fName + '/config.json');
						}
					} catch (err) {
						// error
						console.error("[B - " + fName + " ] Error loading configuration file \"" + name  + "\".");
					}
				}

				requests.Bismo.writeConfig = function(data, callback, name) { // Same above with the name
					if (name!=undefined)
						fs.writeFile('./Plugins/' + fName + '/' + name + '.json', JSON.stringify(data), 'utf8', o_O=>{ if (typeof callback === "function") callback(o_O); });
					else
						fs.writeFile('./Plugins/' + fName + '/config.json', JSON.stringify(data), 'utf8', o_O=>{ if (typeof callback === "function") callback(o_O); });
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
					}());
				else
					Bismo.log("\x1b[31m[B] Error, the plugin " + fName + " is missing the main function and therefore not valid!" + "\x1b[0m");

			} else {
				Bismo.log("[B] Warning! Invalid plugin: " + fName);
			}
		} catch (error) {
			console.error(error);
			Bismo.log("\x1b[31m[B **] Warning! Failed to load plugin " + fName + "!\nError: " + error + "\x1b[0m");
		}
	}());
}








// Event registers
/*
*
*	Each event is emitted with a /Bimso/ "packet" which is a special version of the API that only allows access to that guild
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
	guild = DSF.getGuild(newGuild.id);
	guild.name = newGuild.name; // only thing I got so far.
}); // Guild data changed, reflect that in our data
Client.on('guildUnavailable', (guild) => {}); // server down

Client.on('guildBanRemove', (guild, member) => {}) // Someone got unbanned
Client.on('guildBanAdd', (guild) => {}); // Someone got banned

Client.on('guildDelete', (guild) => {
	Bismo.log("[D] Removed from " + guild.name + "!");
});
Client.on('guildCreate', (guild) => {
	Bismo.log("[D] I've been added to " + guild.name + "!");
	guild.owner.send("Hello! Thank you for adding me. To get started, mention me in any text channel in your guild.");
}); // added to guild

Client.on('guildMemberRemove', (member) => {}); // goodbye
Client.on('guildMemberAdd', (member) => {}); // Someone new
Client.on('guildMembersChunk', (members, guild, chunk) => {}); // https://discord.js.org/#/docs/main/stable/class/Client?scrollTo=e-guildMembersChunk
Client.on('guildMemberSpeaking', (memeber, speaking) => {});
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
Client.on("message", async message => {
	// The most import part, commands.
	if(message.type === "PINS_ADD" && message.author.bot) message.delete(); // Remove pin notifications from the bot.

	if (message.author.bot || message.author.system) return; // Do not process bot responses.
	if (WaitForReply.indexOf(crypto.createHash('sha1').update(message.author.id + message.channel.id).digest('base64'))>-1) return; // Do not process reply responses. (this is already processed.)


	// Emotes
	if (message.content.startsWith("<:") && message.content.endsWith(">")) {
		if (message.content.startsWith("<:dawson:")) {
			message.delete().then(o_o=>{ message.channel.send("", {files: ["https://s.cnewb.co/dawson.png"]}) });
		}

		return;
	}


	function Reply(msg) {
		message.channel.send(msg);
	}


	// Grab required data
	var guildID = message.author.id;
	if (message.guild!=undefined)
		guildID = message.guild.id;

	var myMention = "<@!" + Client.user.id + ">";
	var guildData = Bismo.getGuild(guildID);


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
	const args = message.content.toLowerCase().slice(prefix.length).trim().split(/ +/g); //Chop off the prefix, trim, split using spaces.
	const command = args.shift().toLowerCase();


	// Author's Bismo account
	var AccountData = Bismo.getAccount(message.author.id);
	try {
		AccountData.hasPermission = AccountData.guilds[guildID].hasPermission;
	}
	catch (e) {}
	if (AccountData===undefined) {
		AccountData = {
			hasPermission: function(perm) {
				return null;
			}
		}
	} else if (AccountData.hasPermission === undefined) {
		AccountData.hasPermission = function(perm) {
			return null;
		}
	}


	// Can they interact with us?
	if (AccountData.hasPermission("bismo.interact")===false) {
		dlog("User " + message.author.username + " has no permission to interact with this bot.");
		return;
	}

	message.prefix = prefix;
	message.args = args;
	message.reply = Reply; // Discord.js includes this now
	message.BismoAccount = AccountData;
	message.GAccount = guildData;

	message.getReply = function(prompt, callback, options) {
		message.reply(prompt);
		Bismo.getUserReply(message.author.id, message.channel.id, callback, options);
	}

	// Okay, we have everything.
	// Emit an event.

	Bismo.events.discord.emit('message', message);

	// Cycle through our command handlers
	for (const [key, value] of Object.entries(Commands)) {
		if (key == command) {
			// This is our handler.

			// Run basic checks
			if (inGuild) {
				if (value.usersOnly) {
					break; // Command not allowed here.
				} else if (value.whitelistGuilds != undefined) {
					var whitelisted = false;
					for (var i = 0; i<value.whitelistGuilds.length; i++) {
						if (value.whitelistGuilds[i] == guildID) {
							whitelisted = true;
							break;
						}
					}
					if (!whitelisted)
						break; // Not allowed

				} else if (value.blacklistGuilds != undefined) {
					var blacklisted = false;
					for (var i = 0; i<value.blacklistGuilds.length; i++) {
						if (value.blacklistGuilds[i] == guildID) {
							blacklisted = true;
							break;
						}
					}
					if (blacklisted)
						break; // Not allowed.
				}
			}  else if (value.guildRequired) {
				Reply("This command must be ran within a guild chat room!");
				break;
			}

			if (args[0] == "help" || (args[0] == undefined && value.noParams != true)) {
				// Display the help message automatically
				Reply("`" + command + "` - " + value.description + "\n" + value.helpMessage)
			}
			else {
				value.handler(message);
			}
			break;
		}
	}

	// Done.
});


// Bimso.registerCommand("",)





/*  STARTUP  */

Client.on("ready", () => {
	GuildManagers = {};
	var guilds = Client.guilds.cache.array();
	for (var i = 0; i<guilds.length; i++) {
		GuildManagers[guilds[i].id] = guilds[i];
	}

	Bismo.botID = Client.user.id;

	Bismo.log(`\x1b[36m[D] Bot is starting up with ${Client.users.cache.size} users in ${Client.channels.cache.size} channels of ${Client.guilds.cache.size} guilds.\x1b[0m`);
	if (Client.users.size >= 1000 || Client.guilds.size >= 250)
		Bismo.log("This may take a while...");

	Client.user.setActivity("Bismo is loading...");

	// Here we can load the guilds up (one-by-one)


	fs.readFile('./guilds.json', 'utf8', (err, data) => {
		if (err) {
			// Load error
			console.warn(err);
			console.warn("Failed to load guild data, bot will not function correctly.");
			Client.user.setActivity("Startup failure.");
			loaded = false;
			return;
		}

		GAccounts = JSON.parse(data); // Load the guilds

		// Update the permissions for each Bismo account (since we save permissions with the guilds, not users.)
		for (var i = 0; i<Accounts.length; i++) {
			if (Accounts[i]!=null) {
				Accounts[i].updatePermissions(GAccounts);
			}
		}
		

		var loaded = 0;
		for (var i = 0; i<GAccounts.length; i++) {
			var gID = GAccounts[i].id;
			Client.guilds.fetch(gID).then(gD => {
				// Setup the guild
				var BismoPacket = {
					gID: gID, // The guild ID
					guild: gD, // Discord guild object
					GAccount: GAccounts[i], // The guild account
					Accounts: Bismo.getGuildBismoAccounts(gID) // The Bismo accounts of the users in this guild (not globally modifiable!)
				};
				Bismo.events.bot.emit('setup', BismoPacket);
				loaded++;


				if (loaded>= GAccounts.length) {
					loaded = true;
					Client.user.setActivity(Config.Discord.activity);
				}
			});
		}
	});


});



// Okay, we're ready to "start"


// Web server
httpServer.listen(Config.webPort, () => {
	Bismo.log("[Web] Express server listening on port " + Config.webPort);
});


fs.readFile('./accounts.json', 'utf8', function readFileCallback(err, data){
	if (err){
		Bismo.log("\x1b[31mError loading account data! The bot has halted until the error is solved. (Possible arroundData corruption?)\n\nError: " + err + "\x1b[0m");
		process.exit(1);
	} else {
		var accountJSON = JSON.parse(data);
		for (var i = 0; i<accountJSON.length; i++)
		{
			Accounts.push(BismoAccount(accountJSON[i]))
		}

		Bismo.log("[B] Accounts loaded.");

		// go for launch
		Client.login(Config.Discord.token);
	}
});