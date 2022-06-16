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
/**
 * @typedef {import('./../../bismo.js').BismoRequests} BismoRequests
 */

/**
 * @type {import('./../../bismo.js').Bismo}
 */
var Bismo = {} // Bismo API, provided to use in the main function (under the Requests packet)

var Plugin = {
}

/**
 * @param {BismoCommandExecuteData} message
 */
function claimHandler(message) {
	if (message.guildAccount == undefined && message.guild != undefined) { // No guild data existing, in a guild currently
		if (message.author.id != message.guild.owner.id) {
			return;
		}

		// var guild = message.guild;
		console.log("[D] Registering a new guild! Welcome " + message.guild.name + "!");
		Bismo.AddGuild(message.guild.id, {
			id: message.guild.id,
			name: message.guild.name,
			owner: message.author.id
		});
		var gData = Bismo.GetBismoGuildObject(message.guild.id);


		message.Reply("Check your DMs to continue!");

		Reply = function(msg) {
			message.author.send(msg);
		}

		message.author.send("=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\n"
			+ "Hello <@"+message.author.id+">, thank you for choosing me :^)\n"
			+ "What would you like the prefix for commands to be? _Example: `!` `.`._\n"
			+ "This can be anything, but just remember _you can always use my mention as a prefix, no matter this setting._\n"
			+ "Type `!skip` to skip.\n"
			+ "At anytime you can type `!cancel` to stop this process.").then(m => {

				var stopSetup = false;

				// console.log(m);

				Bismo.WaitForUserMessage(message.author.id, m.channel, '!cancel', guildPrefix => {
					if (guildPrefix.content != "!skip") {				
						guildPrefix = guildPrefix.content;
						gData.prefix = guildPrefix;
					}


					// Set text_channel
					var c = "";
					var channels = Bismo.GetGuildChannels(message.guild.id, "text");
					for (var i = 0; i<channels.length; i++)
						if(channels[i] != null)
							if (channels[i].type == "text")
								c = c + `\n${channels[i].name}'s ID: ` + "`" + channels[i].id + "`";

					Reply("**What channel do you want me to send alerts on?**\n"
						+ "This will be my primary channel. I can send messages on other channels, but only as replies. _This is the only channel I will initiate conversation._\n"
						+ "_You can change this anytime with the `set` command._ Imagine this as my console.\n"
						+ "Type \"!cancel\" to cancel setup.\n" + c);

					Bismo.WaitForUserMessage(message.author.id, m.channel, '!cancel', botTextChannel => {
						if (botTextChannel.content == "!cancel") {
							botTextChannel = botTextChannel.content
							tChan = message.guild.channels.resolve(botTextChannel);

							if (tChan!=null) {
								if (tChan.type=="text")
									gData.textChannel = botTextChannel;
							} else
								Reply("That channel wasn't valid. Skipping.");
							// Bismo.SaveGuilds();
						}




						Reply("Setup complete. Your guild's prefix is set to: `" + guildPrefix + "`\n"
							+ "To setup Twilio and Steam integrations, run `" + guildPrefix + "<service> register`.\n"
							+ "For best results, allow Bismo administrator access to your server. (Not required, however, prevents any permission based errors).\n"
							+ "\n**I hope you enjoy Bismo! For help or support, visit **`https://bismo.co`**.**"
							+ "\n_Access your guild's web interface via: https://bismo.co/guild/" + message.guild.id + "/_");
						Bismo.SaveGuilds();
						
					});

					if (stopSetup) {
						Reply("Setup halted. You're guild data has been added, however you canceled first-time setup. First-time setup was to ease installation and guide owners through basic setup. The bot is ready to use, but more configuration is required."
							+ "\nAccess your guild's web interface via: https://bismo.co/guild/" + message.guild.id + "/");
						return;
					}



				});
				



			}).catch(err => {
				console.log(err);
			});
	} else {
		message.Reply("This guild has already been registered! You can reset the guild using `/resetguild`.")
	}
}

// Change this to a queue system
/**
 * @param {BismoCommandExecuteData} message
 */
function destroyHandler(message) {
	if (message.guildAccount == undefined || message.guild == undefined) {
		message.Reply("Run this command in a guild.");
		return;
	}

	if (message.author.id != message.guild.owner.id) {
		message.Reply("Only the guild owner has this permission.");
		return;
	}

	var randomString = Math.random().toString(36).substring(5);

	message.Reply("Type `" + randomString + "` to confirm guild reset.");

	Bismo.GetUserReply(message.author.id, message.channel, msg=> {
		msg.delete({ reason: "Confirmation code spam." });
		if (msg.content == randomString)
		{
			Bismo.RemoveGuild(message.guild.id);
			message.Reply("Guild reset. Please rerun the setup command `/claimguild`!");
		}
		else {
			message.Reply("The two did not match. Your guild was not reset.");
		}
	});
}


/**
 * @param {BismoRequests} Requests
 */
function main(Requests) {
	Bismo = Requests.Bismo // The Bismo API


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
	requests: {

	},
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