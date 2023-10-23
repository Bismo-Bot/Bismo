'use strict';
/*

		____  _					
	   / __ )(_)________ ___  ____ 
	  / __  / / ___/ __ `__ \/ __ \
	 / /_/ / (__  ) / / / / / /_/ /
	/_____/_/____/_/ /_/ /_/\____/  Discord Bot Platform

	v3


*/

// Which came first? Chicken or the egg?
const Version = require('./Version.js');
global.Version = new Version(3,4,0, (process.env.debug)? "debug":"release", "BismoClassRefactor");
const isWin = process.platform === "win32";


const path = require('node:path');
global.DataDirectory = path.join(__dirname, "..", "Data"); // ./src/../Data -> ./Data
global.GuildDataDirectory = path.join(DataDirectory, "Guilds"); // ./src/../Data -> ./Data
global.LogsDirectory = path.join(__dirname, "..", "Logs");
global.PluginsDirectory = path.join(__dirname, "..", "Plugins");




// Global behavioral changes (static stuff)
/**
 * Debug mode - special stuff
 * @type {boolean}
 */
const debug = (process.env.debug !== undefined)? process.env.debug == 'true' : true; // change this later idk
process.env.debug = debug;

/**
 * output the silly log level to console (it goes	every other level > silly, silly is the lowest priority, literal spam)
 * @type {boolean}
 */
const displaySilly = true; // 
Error.stackTraceLimit = (debug)? 8 : 4;
global.consoleVisible = true;


/*
 * Pull in externals here, imports, libraries
 * 
 */
// Basic
const fs = require("node:fs")
const EventEmitter = require('node:events');
const util = require('node:util');

// Crypto
const keytar = require("keytar");

// Interaction
const readline = require("readline");


// Classes
const ConfigurationManager = require('./ConfigurationManager.js');
const BismoConfig = require("./BismoConfig.js");

const lm = require('./LogMan.js');
const LogMan = lm.LogMan;
const Logger = lm.Logger;

const NeptuneCrypto = require('./NeptuneCrypto.js');

// Discord.JS
const Discord = require('discord.js');
const DiscordVoice = require("@discordjs/voice");

global.Client = new Discord.Client({
	intents: [ 	
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMembers,
		//Discord.GatewayIntentBits.Bans,
		Discord.GatewayIntentBits.GuildEmojisAndStickers,
		//Discord.GatewayIntentBits.GuildWebhooks,
		//Discord.GatewayIntentBits.GuildInvites,
		//Discord.GatewayIntentBits.GuildVoiceStates,
		//Discord.GatewayIntentBits.GuildPresences,
		Discord.GatewayIntentBits.GuildMessages,
		Discord.GatewayIntentBits.MessageContent,
		// Discord.GatewayIntentBits.GuildMessageTyping,
		Discord.GatewayIntentBits.GuildMessageReactions,
		Discord.GatewayIntentBits.DirectMessages,
		// Discord.GatewayIntentBits.DirectMessageTyping
		Discord.GatewayIntentBits.DirectMessageReactions,
		Discord.GatewayIntentBits.GuildVoiceStates
	]

	// intents: [ Discord.Intents.ALL ] // Removed in discord.js v13 because you shouldn't do that
});



// Logging
/** @type {LogMan.ConstructorOptions} */
let logOptions = {
	fileWriteLevel: {
		debug: debug,
		silly: debug
	},
	consoleDisplayLevel: {
		debug: debug,
		silly: displaySilly
	},
	cleanLog: true,
	consoleMessageCharacterLimit: (debug? 1250 : 750),
	fileMessageCharacterLimit: (debug? 7500 : 4000),
}

global.LogMan = new LogMan("Bismo", global.LogsDirectory, logOptions);

/** @type {Logger} */
const appLog = global.LogMan.getLogger("App");
global.appLog = appLog;



// For debugging, allows you to output a nasty object into console. Neat
var utilLog = function(obj, depth) {
	appLog.debug(util.inspect(obj, {depth: (depth!=undefined)? depth : 3}));
}

// This is our "error" handler. seeeesh
process.on('unhandledRejection', (error) => {
	try {
		appLog.error('Unhandled rejection: ' + error.message + "\n" + error.stack, debug);
		appLog.error(error, false);
		// Should close now..
	} catch {
		console.error(error);
	}
});
process.on('uncaughtException', (error) => {
	try {
		appLog.error('Unhandled exception: ' + error.message + "\n" + error.stack, debug);
		appLog.error(error, false);
	} catch {
		console.error(error);
	}
});


// Shutdown handling
let shutdownMutex = false;
/**
 * Call this function to initiate a clean shutdown
 * @param {number} [shutdownTimeout=1500] - Time to wait before closing the process
 */
async function Shutdown(shutdownTimeout) {
	if (shutdownMutex)
		return;
	shutdownMutex = true;
	if (typeof shutdownTimeout !== "number") {
		shutdownTimeout = (debug)? 1000 : 5000;
	}

	// console.log("Notifying plugins @Bismo.Events.Bot#shutdown:" + shutdownTimeout);
	Bismo.Events.bot.emit('shutdown', shutdownTimeout);

	try {
		setTimeout(() => {
			appLog.info("Logging off...");
			global.Bismo.Client.destroy();
		}, shutdownTimeout-250);
	} catch {}

	Bismo.shuttingDown = true; // For when we kill the logger
}
global.Shutdown = Shutdown;

process.on('beforeExit', code => {
	try { Bismo.shuttingDown = true; } catch {}
	global.LogMan.close();
});
process.on('SIGTERM', signal => {
	appLog.warn(`Process ${process.pid} received a SIGTERM signal`);
	Shutdown(500);
})

// User console input
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
if (process.stdin !== undefined) {
	rl.on("close", function () { // to-do: realize, hey, there's no console.
		Shutdown(); // Capture CTRL+C
	});
}





// Begin

const endTerminalCode = "\x1b[0m"; // Reset font color
if (!debug) {
	process.stdout.write("\x1B[0m\x1B[2;J\x1B[1;1H"); // Clear the terminal
	console.clear();
	console.log(endTerminalCode + "--== Bismo ==--");
} else {
	console.log(endTerminalCode);
}

appLog.info("Hello world!"); // :wave:

if (!debug) {
	appLog.info("\x1b[1m\x1b[47m\x1b[34mProduction" + endTerminalCode + ", version: " + global.Version.toString()); // Production mode
}
else
	appLog.info("\x1b[1m\x1b[41m\x1b[33m**DEV MODE**" + endTerminalCode + ", version: " + global.Version.toString()); // Developer (debug) mode

appLog.info("Running on \x1b[1m\x1b[34m" + process.platform);



// Is this ugly? Yes.
// Does it work? Yes.
// Do I like it? No.

/**
 * @type {import("./Bismo.js");}
 */
var Bismo;

async function main() {
	// Generate the folders
	if (!fs.existsSync(DataDirectory))
		fs.mkdirSync(DataDirectory);
	if (!fs.existsSync(GuildDataDirectory))
		fs.mkdirSync(GuildDataDirectory);
	if (!fs.existsSync(path.join(DataDirectory, "Plugins")))
		fs.mkdirSync(path.join(DataDirectory, "Plugins"));

	if (!fs.existsSync(LogsDirectory))
		fs.mkdirSync(LogsDirectory);

	if (!fs.existsSync(PluginsDirectory))
		fs.mkdirSync(PluginsDirectory);



	var firstRun = (fs.existsSync(path.join(global.DataDirectory, "Bismo.json")) === false);

	// stored in the credential manager
	let encryptionKey = await keytar.getPassword("Bismo","ConfigKey");
	let keyFound = (encryptionKey !== null && encryptionKey !== "");
	if (encryptionKey == null)
		encryptionKey = undefined;


	try {
		global.ConfigurationManager = new ConfigurationManager(global.DataDirectory, (keyFound)? encryptionKey : undefined);
		Bismo = require("./Bismo.js");

		// For whatever reason, this try block just does not work! Very cool!
		// manually check the encryption:
		let encryptionCheck = fs.readFileSync(path.join(global.DataDirectory, "Bismo.json"));
		if (NeptuneCrypto.isEncrypted(encryptionCheck)) { // if there's actual encryption.
			encryptionCheck = NeptuneCrypto.decrypt(encryptionCheck, encryptionKey);
			// eh probably worked.
			encryptionCheck = JSON.parse(encryptionCheck);
			encryptionCheck = {}; // good enough
		}
	} catch (err) {
		if (err instanceof NeptuneCrypto.Errors.InvalidDecryptionKey) {
			appLog.error("Encryption key is invalid! Data is in a limbo state, possibly corrupted.");
			appLog.warn("Bismo will halt. To load Bismo, please fix this error by deleting/moving the config files, fixing the encryption key, or fixing the configs.");
		} else if (err instanceof NeptuneCrypto.Errors.MissingDecryptionKey) {
			appLog.error("Encryption key is missing! Data is still there, but good luck decrypting it !");
			appLog.warn("Bismo will halt. To load Bismo, please fix this error by deleting/moving the config files, fixing the encryption key, or fixing the configs.");
		} else {
			appLog.error("Config is completely broken!");
		}

		if (debug)
			appLog.debug("Encryption KEY: " + encryptionKey); // huh

		console.log("")
		appLog.critical(" === ::error on read Bismo config:: === ");
		appLog.critical(err);

		console.log("");
		appLog.error("Stack: ");
		appLog.error(err.stack);

		process.exitCode = -1;
		process.exit();
	}

	let data = Bismo.Config.ReadSync();
	if (data == "" || data == "{}") {
		firstRun = true;
		appLog.verbose("Config is completely empty, setting as first run...");
	} else {
		if (Bismo.Config.firstRun === true) {
			firstRun = true;
			appLog.verbose("Config has firstRun set to true. Either a reset or a new config.");
		}
	}
	if (firstRun) {
		appLog.verbose("First run! Generated default config file.");
	
		Bismo.Config = new BismoConfig(Bismo.ConfigurationManager, global.configurationPath);
		Bismo.Config.encryption.enabled = !debug || true;
		Bismo.Config.firstRun = false;
		Bismo.Config.SaveSync();

		if (!keyFound && Bismo.Config.encryption.enabled) {
			// Set a new key
			Math.random(); // .. seed the machine later (roll own RNG ? Probably a bad idea.)
			encryptionKey = NeptuneCrypto.randomString(Bismo.Config.encryption.newKeyLength, 33, 220);
			appLog.verbose("Generated encryption key of length " + Bismo.Config.encryption.newKeyLength);
			keytar.setPassword("Bismo","ConfigKey",encryptionKey);
			Bismo.ConfigurationManager.SetEncryptionKey(encryptionKey);
			appLog.verbose("Encryption key loaded");
			Bismo.Config.SaveSync();
		} else if (keyFound && Bismo.Config.encryption.enabled) {
			appLog.verbose("Encryption key loaded from OS keychain");
		}
	}

	if (keyFound && Bismo.Config.encryption.enabled === false) {
		appLog.verbose("Key found, yet encryption is disabled. Odd. Running re-key to completely disable.")
		Bismo.ConfigurationManager.Rekey(); // Encryption is set to off, but the key is there? Make sure to decrypt everything and remove key
	}


	if (Bismo.Config.encryption.enabled && (encryptionKey !== undefined && encryptionKey !== ""))
		appLog.info("File encryption \x1b[1m\x1b[32mACTIVE" + endTerminalCode + ", file security enabled");
	else {
		appLog.info("File encryption \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled.");
		// appLog.debug("Bismo config:");
		// utilLog(Bismo.Config);
	}
	if (encryptionKey !== undefined) {
		encryptionKey = NeptuneCrypto.randomString(encryptionKey.length); // Don't need that, configuration manager has it now
	}


	// Bismo stuff
	Bismo.LoadPlugins();

	require('./RegisterDiscordEventHandlers.js');
	

	/* STARTUP */
	global.Client.on("ready", async () => {
		appLog(`Bot is starting up with ${global.Client.users.cache.size} users in ${global.Client.channels.cache.size} channels of ${global.Client.guilds.cache.size} guilds.`);
		// if (Client.users.size >= 1000 || Client.guilds.size >= 250)
		// 	appLog("This may take a while...");

		global.Client.user.setActivity("👀");

		Bismo.LoadGuilds();
	});

	/*
		Bismo commands


		I would like for people to keep these commands in deployment.

		However, if you feel like they pose some security risk or other annoyance, feel free to remove them.
		There's no reason to remove them, but go for it I guess.
	*/
	Bismo.RegisterCommand("version", message => { // Current bot version
		message.Reply("Bismo version `" + Bismo.Version + "` "
			+ ((debug)? "\n`{debug, platform?" + process.platform + "}`" : ""));
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
		message.Reply("Pong! _Delay: `" + messageDelay + "ms` | API delay: `" + global.Bismo.Client.ws.ping + "ms`_");
	}, {
		description: "Ping the bot.",
		helpMessage: "Usage:\n`/ping`",
		requireParams: false,
		chatCommand: true,
		slashCommand: true
	});

	// Server operator interaction
	function processCMD(command) {
		try {
			if (command == "exit" || command == "quit" || command == "q")
				Shutdown();
			else
				ogLog(eval(command))
				// ogLog("Received input: " + command);
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
	global.Client.login(Bismo.Config.discordToken).catch(err => {
		appLog.error("Failed to start bot!");
		appLog.error(err);
		Shutdown();
	})
}


if (debug) {
	main(); // I don't want that stupid crash report
} else {
	main().catch((err) => { // oh man

		var crashReportWritten = false;
		try {
			// Write crash report
			let dateTime = new Date();
			let date = dateTime.toISOString().split('T')[0];
			let time = dateTime.toISOString().split('T')[1].split('.')[0]; // very cool
			
			let crashReport = `He's dead, Jim.

Bismo has crashed catastrophically, here's what we know:

DateTime: ${dateTime.toISOString()}\\
Bismo version: ${Bismo.version}\\
Debug: ${debug}
Platform: ${process.platform}


== Error info ==\\
Message: \`${err.message}\`\\
Stack: 
\`\`\`
${err.stack}
\`\`\`


== Process info ==\\
arch: ${process.arch}\\
platform: ${process.platform}
exitCode: ${process.exitCode}\\
env.NODE_ENV: "${process.env.NODE_ENV}"\\
debugPort: ${process.debugPort}


title: "${process.title}"\\
argv: "${process.argv.toString()}"\\
execArgv: ${process.execArgv}\\
pid: ${process.pid}\\
ppid: ${process.ppid}\\



versions:
\`\`\`JSON
{
	"node": "${process.versions.node}",
	"v8": "${process.versions.v8}",
	"uv": "${process.versions.uv}",
	"zlib": "${process.versions.zlib}",
	"brotli": "${process.versions.brotli}",
	"ares": "${process.versions.ares}",
	"modules": "${process.versions.modules}",
	"nghttp2": "${process.versions.nghttp2}",
	"napi": "${process.versions.napi}",
	"llhttp": "${process.versions.llhttp}",
	"openssl": "${process.versions.openssl}",
	"cldr": "${process.versions.cldr}",
	"icu": "${process.versions.icu}",
	"tz": "${process.versions.tz}",
	"unicode": "${process.versions.unicode}",
	"ngtcp2": "${process.versions.ngtcp2}",
	"nghttp3": "${process.versions.nghttp3}"
}
\`\`\`

process.features:
\`\`\`JSON
{
	"inspector": ${process.features.inspector},
	"debug": ${process.features.debug},
	"uv": ${process.features.uv},
	"ipv6": ${process.features.ipv6},
	"tls_alpn": ${process.features.tls_alpn},
	"tls_sni": ${process.features.tls_sni},
	"tls_ocsp": ${process.features.tls_ocsp},
	"tls": ${process.features.tls}
}
\`\`\``;

		fs.writeFileSync(__dirname + "/../crashReport-" + date + "T" + time.replace(/:/g,"_") + ".md", crashReport);
		crashReportWritten = true;
		appLogMan.open();
		appLog.critical(crashReport.replace(/`/g,'').replace(/\\$/g,'').replace(/JSON/g,''))
		console.log("");
		appLog.critical("Please send the crash report and Bismo log to the team and we'll look into it.");
		appLog.info("The crash report was written to \"" + __dirname + "/../crashReport-" + date + "T" + time.replace(/:/g,"_") + ".md\" (and in the Bismo log file ./Data/logs/appLog)");
		console.log("")
		appLog.info("Exiting now", false);
		global.shuttingDown = true;
		appLogMan.close();
	} catch(error) {
		appLog("\n\nGee billy, your mom lets you have TWO errors?");
		appLog.error(`Bismo has crashed catastrophically, and then crashed trying to tell you it crashed. Go figure.

Please send any data over to the team and we'll look into it.
If the crash report was written, it'll be at ./crashReport-<date>.md (./ signifying the current running directory).
Crash report written: ${crashReportWritten}

---
First error: ${err.message}

First error stack: ${err.stack}

---

Second error: ${error.message}

Second error stack: ${error.stack}`);
		} finally {
			console.log("Exiting... (using abort, expect a bunch of junk below)");
			if (process.exitCode === undefined)
				process.exitCode = -9001;
			process.abort();
		}
	});
}