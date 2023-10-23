/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot


	BCommands are a just some essential commands for the bot.
	Use this as an example on how to create a plugin (or improve on its design)
*/

/**
 * @typedef {import('./../../bismo.js').BismoCommandExecuteData} BismoCommandExecuteData
 */

var Bismo = {} // Bismo API, provided to use in the main function (under the Requests packet)

var Plugin = {}

// Change this to a queue system
/**
 * @param {BismoCommandExecuteData} message
 */
function getPermission(message) {
	message.Reply("Permission \"" + message.args[0] + "\"?: " + message.guildConfig.UserHasPermission(message.authorID, message.args[0]));
}

/**
 * @param {BismoCommandExecuteData} message
 */
function setPermission(message) {
	message.Reply(message.guildConfig.SetUserPermission(message.authorID, message.args[0], true))
}


/**
 * @param {BismoRequests} Requests
 */
function main(Requests) {
	Bismo = Requests.Bismo // The Bismo API

	
	Bismo.RegisterCommand("getperm", getPermission, {
		description: "Returns permission setting for <permission>", 
		helpMessage: "/getperm <permission>`",
		requireParams: true,
		ephemeral: true,
		guildRequried: true,
	});

	Bismo.RegisterCommand("setperm", setPermission, {
		description: "Sets and returns permission setting for <permission>", 
		helpMessage: "/setperm <permission> <value>`",
		requireParams: true,
		ephemeral: true,
		guildRequried: true,
	});
}





module.exports = {
	main: main,
	manifest: {
		name: "Permission Manager",
		packageName: "com.bismo.permissionmanager",
		author: "Watsuprico",
		date: "12/9/2021",
		version: "1"
	},
	api: Plugin
}