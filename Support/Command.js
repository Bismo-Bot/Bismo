/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/

/** Class representing a Command */
class Command {
	/**
	 * friendlyName - Friendly name of the command (defaults to provided alias)
	 * @type {string}
	 */
	friendlyName;
	/**
	 * description - A description of the command (defaults to "No description provided")
	 * @type {string}
	 */
	description;
	/**
	 * helpMessageMessage display in the bot's help command (/bismohelp) (defaults to description)
	 * @type {string}
	 */
	helpMessage;

	/**
	 * slashCommand - Registers the command as a slash command on Discord. (default: false)
	 * @type {boolean}
	 */
	slashCommand = false;
	/**
	 * chatCommand - Command is executed via chat (with the appropriate listener cue (!) prefixing the command) (default: true)
	 * @type {boolean}
	 */
	chatCommand = true;
	/**
	 * slashCommandOptions - Slash commands allow you to specify 'options' (parameters). Use this to provide that information. You'll need to do everything manually.
	 * @type {JSON[]}
	 */
	slashCommandOptions = [];
	/**
	 * ephemeral - Slash commands only. If true only the author can see replies. (default: true)
	 * @type {string}
	 */
	ephemeral = true;

	/**
	 * usersOnly - Command only allow to be called by users (and not bots) (default: true)
	 * @type {boolean}
	 */
	usersOnly = true;
	/**
	 * directChannels - Runs in direct message channels (not a guild) (default: false)
	 * @type {boolean}
	 */
	directChannels = false;
	/**
	 * guildChannels - Runs in a guild channel (default: true)
	 * @type {boolean}
	 */
	guildChannels = true;

	/**
	 * whitelistGuilds - Only these guilds can run this command (array)
	 * @type {string[]}
	 */
	whitelistGuilds = [];
	/**
	 * blacklistGuilds - These guild CAN NOT run this command (array)
	 * @type {string[]}
	 */
	blacklistGuilds = [];
	/**
	 * hidden - Command not listed (default: false)
	 * @type {string}
	 */
	hidden = false;
	/**
	 * requireParams - Parameters are required to run this command. If true and no parameters are provided we display the helpMessage (default: true). Note this has no effect on slash commands.
	 * @type {boolean}
	 */
	requireParams = false;

	/**

	 * @typedef {object} Bismo.Command
	 * 
	 * @property {string} data.friendlyName - Friendly name of the command (defaults to provided alias)
	 * @property {string} data.description - A description of the command (defaults to "No description provided")
	 * @property {string} [data.helpMessage] - Message display in the bot's help command (/bismohelp) (defaults to description)
	 * 
	 * @property {boolean} [data.slashCommand = false] - Registers the command as a slash command on Discord. (default: false)
	 * @property {boolean} [data.chatCommand = true] - Command is executed via chat (with the appropriate listener cue (!) prefixing the command) (default: true)
	 *
	 * @property {JSON[]} [data.slashCommandOptions = []] - Slash commands allow you to specify 'options' (parameters). Use this to provide that information. You'll need to do everything manually.
	 * @property {string} [data.ephemeral = true] - Slash commands only. If true only the author can see replies. (default: true)
	 * 
	 * @property {boolean} [data.usersOnly = true] - Command only allow to be called by users (and not bots) (default: true)
	 * @property {boolean} [data.directChannels = false] - Runs in direct message channels (not a guild) (default: false)
	 * @property {boolean} [data.guildChannels = true] - Runs in a guild channel (default: true)
	 * 
	 * @property {string[]} [data.whitelistGuilds = undefined] - Only these guilds can run this command (array)
	 * @property {string[]} [data.blacklistGuilds = undefined] - These guild CAN NOT run this command (array)
	 * @property {string} [data.hidden = false] - Command not listed (default: false)
	 * 
	 * @property {boolean} [data.requireParams = true] - Parameters are required to run this command. If true and no parameters are provided we display the helpMessage (default: true). Note this has no effect on slash commands.
	 * 
	 * 
	 */
	constructor(data) {
		this.friendlyName = friendlyName;
		this.description = description;
		this.helpMessage = data.helpMessage || description;

		this.slashCommand = data.slashCommand || false;
		this.chatCommand = data.chatCommand || true;
		this.slashCommandOptions = data.slashCommandOptions || [];
		this.ephemeral = data.ephemeral || true;

		this.usersOnly = data.usersOnly || true;
		this.directChannels = data.directChannels || false;
		this.guildChannels = data.guildChannels || true;

		this.whitelistGuilds = data.whitelistGuilds || [];
		this.blacklistGuilds = data.blacklistGuilds || [];
		this.hidden = data.hidden || false;
		this.requireParams = data.requireParams || false;
	}

}

module.exports = Command;