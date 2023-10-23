/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot


	BCommands are a just some essential commands for the bot.
	Use this as an example on how to create a plugin (or improve on its design)
*/

const { ChannelType } = require("discord.js");

/**
 * @type {import('./../../src/Bismo.js')}
 */
var Bismo = {}
/**
 * @type {import('./../../src/LogMan.js').Logger}
 */
let log = {};


var Plugin = {}

/**
 * @param {import('./../../src/CommandExecuteData.js')} message
 */
function claimHandler(message) {
	if (message.guildConfig.claimed) {
		message.Reply("This guild has already been registered! You can reset the guild using `/resetguild`.");
		return;
	}

	if (message.authorId != message.guild.ownerId) {
		if (message.isInteraction) {
			message.interaction.followUp({
				content: "You're not permitted to do this.",
				ephemeral: true
			});
		} else {
			message.message.delete();
		}
		return;
	}

	// var guild = message.guild;
	log("Registering a new guild! Welcome " + message.guild.name + "!");

	message.guildConfig.claimed = true;
	message.guildConfig.SaveSync();

	if (message.isInteraction) {
		message.Reply("Check you DMs to continue!");
	} else {
		message.message.delete();
	}



	function reply(msg) {
		return message.author.send(msg);
	}

	/** @param {import('discord.js').Message} msg */
	async function finishSetup(msg) {
		if (msg.content != "!skip") {
			let textChannel = await message.guild.channels.fetch(msg.content);

			if (textChannel != undefined) {
				if (textChannel.type == ChannelType.GuildText) {
					message.guildConfig.textChannel = textChannel;
					message.guildConfig.SaveSync();
				}
				reply("Using channel `" + textChannel.name + "` as the primary channel ! 🤓");

			} else {
				reply("That channel wasn't valid, but that's okay. Skipping.");
			}
		}

		reply("Setup complete. Your guild's prefix is set to: `" + message.guildConfig.prefix + "`\n"
			+ "For best results, allow Bismo administrator access to your server. (Not required, however, prevents any permission based errors).\n"
			+ "\n**I hope you enjoy Bismo! For help or support, visit **`https://bismo.co`**.**"
			+ "\n_Access your guild's web interface via: https://bismo.co/guild/" + message.guild.id + "/_");
	}

	/** @param {import('discord.js').Message} msg */
	async function askPrimaryChannel(msg) {
		if (msg.content != "!skip") {
			message.guildConfig.prefix = msg.content;
			message.guildConfig.SaveSync();
		}


		// Set text_channel
		let channelsString = "";
		let channels = await message.guildConfig.GetChannels(ChannelType.GuildText);
		channels = [...channels.values()]
		for (var i = 0; i<channels.length; i++) {
			if(channels[i] != undefined && channels[i].type == ChannelType.GuildText) {
				 channelsString = channelsString + `\n${channels[i].name}'s ID: ` + "`" + channels[i].id + "`";
			}
		}

		reply("**What channel do you want me to send alerts on?**\n"
			+ "This will be my primary channel. I can send messages on other channels, but only as replies. _This is the only channel I will initiate conversation._\n"
			+ "_You can change this anytime with the `set` command._ Imagine this as my console.\n"
			+ "Type \"!cancel\" to cancel setup.\n" + channelsString).then(m => {
				Bismo.GetUserReply(message.author.id, message.author.dmChannel, { cancelCommand: '!cancel'}).then(botTextChannel => {
					finishSetup(botTextChannel);				
				});
			});

	}

	reply("=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\n"
		+ "Hello <@"+message.author.id+">, thank you for choosing me :^)\n"
		+ "What would you like the prefix for commands to be? _Example: `!` `.`._\n"
		+ "This can be anything, but just remember _you can always use my mention as a prefix, no matter this setting._\n"
		+ "Type `!skip` to skip.\n"
		+ "At anytime you can type `!cancel` to stop this process.").then(m => {
			Bismo.GetUserReply(message.author.id, message.author.dmChannel, { cancelCommand: '!cancel'}).then(guildPrefix => {
				askPrimaryChannel(guildPrefix);
			});
	}).catch(err => {
		log.error("Failed claiming a guild!");
		log.error(err);
	});
}

// Change this to a queue system
/**
 * @param {import('./../../src/CommandExecuteData.js')} message
 */
function destroyHandler(message) {
	if (!message.inGuild) {
		if (message.isInteraction) {
			message.interaction.followUp({
				content: "Run this command in a guild.",
				ephemeral: true
			});
		} else {
			message.Reply("Run this command in a guild.");
			message.message.delete();
		}
		return;
	}

	if (message.authorId != message.guild.ownerId) {
		if (message.isInteraction) {
			message.interaction.followUp({
				content: "You're not permitted to do this.",
				ephemeral: true
			});
		} else {
			message.message.delete();
		}
		return;
	}

	if (!message.guildConfig.claimed) {
		message.End();
		return;
	}

	var randomString = Math.random().toString(36).substring(5);

	message.Reply("Type `" + randomString + "` to confirm guild reset.");

	Bismo.GetUserReply(message.author.id, message.channel).then(msg => {
		msg.delete({ reason: "Confirmation code spam." });
		if (msg.content == randomString)
		{
			message.guildConfig.Delete();
			message.Reply("Guild reset. Please rerun the setup command `/claimguild`!");
		}
		else {
			message.Reply("The two did not match. Your guild was not reset.");
		}
	});
}


/**
 * @param {Bismo.PluginSetupObject} requests
 */
function main(requests) {
	Bismo = requests.Bismo // The Bismo API
	Bismo = requests.Bismo // The Bismo API
	log = requests.Log;

	Bismo.RegisterCommand("claimguild", claimHandler, {
		description: "Setup the Bismo bot for this guild.",
		helpMessage: "Usage:\n`!claimguild`\nNo additional parameters for this command.",
		requireParams: false,
		ephemeral: true,
		guildRequried: true,
		slashCommand: true,
	});

	Bismo.RegisterCommand("resetguild", destroyHandler, {
		description: "Destroys all saved guild data.",
		helpMessage: "Usage:\n`!resetguild`\nNo additional parameters for this command.",
		requireParams: false,
		ephemeral: true,
		guildRequried: true,
		slashCommand: true,
	});

	Bismo.RegisterCommand("prefix", message => {
		if (message.guildAccount != undefined) {
			message.Reply("Your guild's prefix is: `" + message.guildAccount.prefix + "`. You can also use `@Bismo`.");
		} else {
			message.Reply("This guild is not yet setup. Tell the owner to run `@Bismo claim`.");
		}
	}, {
		description: "Returns the Guild's prefix for the bot.", 
		helpMessage: "No special usage, just run `@Bismo prefix`",
		requireParams: false,
		ephemeral: true,
		guildRequried: true,
		slashCommand: true,
	});
}





module.exports = {
	main: main,
	manifest: {
		name: "BCommands",
		packageName: "com.bismo.bcommands",
		author: "Watsuprico",
		date: "7/7/2021",
		version: "1.2"
	},
	api: Plugin
}