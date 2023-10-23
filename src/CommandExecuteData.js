
const Discord = require("discord.js");
const ArgumentParser = require("./ArgumentParser.js");
// const { User, Guild, TetChannel, VoiceChannel, Message, CommandInteraction, Interaction } = require("discord.js");

/** @type {import("./Bismo.js")} */
const Bismo = global.Bismo;

class CommandExecuteData {
	/**
	 * @type {boolean}
	 * Whether a reply has been made before or not using `.Reply`.
	 */
	#hasReplied = false;

	/**
	 * @type {boolean}
	 * Whether the command has been processed/executed.
	 */
	#hasExectued = false;


	/** @type {import("./Command.js")} */
	#command;


	/**
	 * @type {string}
	 * Which command was executed.
	 */
	alias;

	/**
	 * @type {string[]}
	 * The parameters for the command.
	 * This is the chat message minus the first word split on spaces, so an array of words.
	 */
	args = [];

	/**
	 * @type {import("./ArgumentParser.js")}
	 * More advance argument processor.
	 */
	parser;


	// user/guild data
	/**
	 * @type {string}
	 * Id of the user that issued the command.
	 */
	authorId;

	/**
	 * @type {string}
	 * The username (or nick name) of the user that issued the command.
	 */
	authorName;

	/**
	 * @type {string}
	 * Id of the guild the user was in when the command was issued.
	 */
	guildId;

	/**
	 * @type {boolean}
	 * Whether or not the command was executed within a guild (server).
	 */
	inGuild;

	/**
	 * @type {import("./GuildConfig.js")}
	 * Bismo guild configuration (special container for the guild, hold guild data and helper functions).
	 */
	guildConfig;


	// Discord objects
	/**
	 * @type {Discord.User}
	 */
	author;

	/**
	 * @type {Discord.User}
	 * User object that executed the command.
	 */
	author;

	/**
	 * @type {Discord.Guild}
	 * Discord guild object.
	 */
	guild;

	/**
	 * @type {Discord.TextChannel}
	 * Channel object the message was sent over.
	 */
	channel;

	/**
	 * @type {string}
	 * Channel id the command was executed in.
	 */
	channelId;

	/**
	 * @type {Discord.VoiceChannel}
	 * The current voice channel the user who executed the command is connected to.
	 */
	voiceChannel;

	/**
	 * @type {string}
	 * Id of the voice channel the user who executed the command is connected to.
	 */
	voiceChannelId;


	/**
	 * @type {Discord.Message}
	 * Message object (chat command).
	 */
	message;

	/**
	 * @type {Discord.CommandInteraction}
	 * Interaction object (slash command / message interaction).
	 */
	interaction;

	/**
	 * @type {boolean}
	 * Whether or not this was an interaction (slash command) or a chat message.
	 */
	get isInteraction() {
		return this.interaction !== undefined;
	}


	// Misc
	/**
	 * @type {object}
	 * Additional data that can be used by other command interpreters, such as a Steam bot plugin.
	 */
	additionalData = {};


	/**
	 * @param {(Discord.Message|Discord.Interaction)} messageOrInteraction
	 * @param {string} command
	 * @param {string[]} args
	 */
	constructor(messageOrInteraction, command, args) {
		if (!Array.isArray(args))
			args = [];


		this.alias = command;
		this.args = args;
		this.parser = new ArgumentParser(args);

		if (messageOrInteraction instanceof Discord.Message) {
			this.message = messageOrInteraction;
			this.author = messageOrInteraction.author;
		} else {
			this.interaction = messageOrInteraction;
			this.author = messageOrInteraction.user;
		}

		this.authorId = this.author.id;
		this.authorName = messageOrInteraction.member.nickname || this.author.globalName;

		// either the guild id or the author id if not in a guild
		this.inGuild = messageOrInteraction.guild != undefined;
		// this.guildId = (this.inGuild)? messageOrInteraction.guild?.id : this.authorId;
		this.guildId = messageOrInteraction.guild?.id;

		this.channel = messageOrInteraction.channel;
		this.channelId = this.channel.id;

		this.voiceChannel = messageOrInteraction?.member?.voice?.channel;
		this.voiceChannelId = this.voiceChannel?.id;
	}

	/**
	 * Fires the command and processes the message.
	 * @return {Promise<void>}
	 */
	Process() {
		let me = this;
		return new Promise(async (resolve, reject) => {

			function unknownCommand() {
				if (me.isInteraction) {
					me.Reply("Hmm, unknown command. Maybe it's stagnant?");
				} else {
					me.message.react("❓");
				}
			}


			// get guild
			if (this.inGuild) {
				this.guildConfig = Bismo.GetGuildConfig(this.guildId);
				this.guild = await this.guildConfig.GetDiscordObject();
			}


			if (this.isInteraction) {
				Bismo.Events.discord.emit('interactionCreate', this.interaction);
			} else {
				Bismo.Events.discord.emit('messageCreate', this.message);
			}

			let command = Bismo.Commands.get(this.alias);
			this.#command = command;
			if (!command.directChannels && !this.inGuild) {
				this.Reply("Command must be ran within a guild!");
				return resolve();
			}

			if ((this.isInteraction && !command.slashCommand)
				|| (!this.isInteraction && !command.chatCommand)) {
				Bismo.Log.warn(`Command ${this.alias} cannot be ran as a ${this.isInteraction? "interaction" : "chat command"}.`);
				unknownCommand();
				return resolve();
			}

			// check black/white listing
			if (Array.isArray(command.whitelistGuilds)) {
				if (!command.whitelistGuilds.includes(this.guildId)) {
					Bismo.Log.silly(`Cannot run ${this.alias} in ${this.guild.name} as it is not whitelisted.`);
					unknownCommand();
					return resolve();
				}
			}
			if (Array.isArray(command.blacklistGuilds)) {
				if (command.blacklistGuilds.includes(this.guildId)) {
					Bismo.Log.silly(`Cannot run ${this.alias} in ${this.guild.name} as it is blacklisted.`);
					unknownCommand();
					return resolve();
				}
			}


			Bismo.Events.bot.emit("commandExecute", this);
			if ((this.args === undefined && command.requireParams) || (this.args !== undefined && this.args[0] == "help")) {
				let prefix = (this.isInteraction)? "/" : this.guildConfig.prefix || "!";
				this.Reply(`\`${prefix}${this.alias}\` - ${command.description}\n${command.helpMessage}`);
				return resolve();
			}

			if (typeof command.handler !== "function") {
				Bismo.Log.warn(`Command ${this.alias} has no command handler? Unable to execute.`);
				unknownCommand();
				return resolve();
			}

			if (!this.isInteraction)
				this.channel.sendTyping();
			
			try {
				command.handler(this);
				return resolve();
			} catch (err) {
				Bismo.Log.error(`Error executing ${this.alias}`);
				Bismo.Log.error(err);
				this.Reply(":face_with_raised_eyebrow: hmm, that command threw an error");
				return resolve();
			}
		});
	}


	/**
	 * Used to send a reply back to the user.
	 * @param {string} message - The message to send the user.
	 * @return {Promise<Discord.Message>|Promise<Discord.Message>}
	 */
	Reply(message) {
		if (typeof message !== "string")
			throw new TypeError("message expected string got " + (typeof message).toString());
		if (message == "" || message.trim()  == "")
			throw new Error("Message cannot be empty!");

		Bismo.Log.silly(`Sending reply "${message.substring(0, Math.max(50, message.length))}" to ${this.author.displayName}`);

		if (!this.#hasReplied)
			this.#hasReplied = true;

		if (this.isInteraction) {
			return this.interaction.followUp({
				content: message,
				ephemeral: this.#command.ephemeral !== false,
			});
		} else {
			let msg = {
				content: message,
				isInteraction: false,
				reply: {
					messageReference: this.message.id,
				}
			}
			return new Promise((resolve, reject) => {
				this.channel.send(msg).then((m) => {
					resolve(m);
				}).catch(async () => {
					msg.reply = undefined;
					resolve(await this.channel.send(msg));
				});
			});
		}
	}

	/**
	 * Wrapper for `Bismo.GetUserReply`.
	 * @param {string} prompt The prompt to give users (We append the message `Type <options.cancelCommand> to cancel.`)
	 * @param {BismoGetUserReplyOptions} options Additional options passed to the Discord.MessageCollector
	 * @return {Promise<BismoGetUserReplyResponse>} Promise object that represents the user's reply.
	 */
	GetReply(prompt, options) {
		if (typeof prompt !== "string")
			throw new TypeError("prompt expected string got " + (typeof prompt).toString());
		options = (typeof options == "object")? options : {};
		if (options.cancelCommand == undefined || options.cancelCommand.trim() == "")
			options.cancelCommand = "!~cancel";

		prompt = prompt + "\n_Type `" + options.cancelCommand + "` to cancel.`";
		let channel = (this.#command.ephemeral)? this.author.dmChannel : this.channel;

		channel.send(prompt);
		return Bismo.GetUserReply(this.authorId, this.channelId, options);
	}

	/**
	 * Stops the "is thinking" or "is typing" by reacting to the user's original message with a thumbs up.
	 * @return {void}
	 */
	End() {
		if (this.#hasReplied)
			return;
		this.#hasReplied = true;

		if (this.isInteraction) {
			this.interaction.followUp({
				content: "👍",
				ephemeral: true,
				flags: Discord.MessageFlags.Ephemeral
			});
		} else {
			this.message.react("👍").catch(() => {}); // this gives them a confirmation
			// todo: check if actually typing
			this.Reply("👍").then((msg) => msg.delete()); // this stop the typing
		}
	}
}

module.exports = CommandExecuteData;