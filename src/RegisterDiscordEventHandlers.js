/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/

const GuildConfig = require("./GuildConfig.js");
const Discord = require("discord.js");

const ArgumentParser = require("./ArgumentParser.js");

const crypto = require("node:crypto");
const { BismoVoiceChannel } = require("./VoiceManager.js");
const CommandExecuteData = require("./CommandExecuteData.js");


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
	} else if (newMember.id == Client.user.id) {
		// User moved
		Bismo.Events.discord.emit('voiceChannelMove', { oldMember: oldMember, newMember: newMember });
	}
});



/*  MESSAGES / COMMANDS  */
Client.on("messageCreate", msg => {
	/** @type {Discord.Message} */
	let message = msg;
	/** @type {import('./Bismo.js')} */
	let Bismo = global.Bismo;
	try {

		// The most import part, commands.
		if(message.type === "PINS_ADD" && message.author.bot) message.delete(); // Remove pin notifications from the bot.

		if (message.author.bot || message.author.system) return; // Do not process bot responses.
		// we should not sha1 this, seems slow as hell
		if (Bismo.WaitingForReply.indexOf(crypto.createHash('sha1').update(message.author.id + message.channel.id).digest('base64'))>-1) return; // Do not process reply responses. (this is already processed.)


		// // Emotes
		// if (message.content.startsWith("<:") && message.content.endsWith(">")) {
		//  if (message.content.startsWith("<:dawson:")) {
		//	  message.delete().then(o_o=>{ message.channel.send("", {files: ["https://s.cnewb.co/dawson.png"]}) });
		//  }

		//  return;
		// }


		// Grab required data
		let guildId = message.author.id;
		if (message.guild!=undefined)
			guildId = message.guild.id;

		let myMention = "<@!" + Bismo.Client.user.id + ">";
		let guildConfig = Bismo.GetGuildConfig(guildId);

		// Only listen to the guild's prefix or my mention
		let prefix = "";
		if (message.content.startsWith(guildConfig.prefix || "!")) {
			prefix = guildConfig.prefix || "!";
		}

		if (message.content.startsWith(myMention)) {
			prefix = myMention + " ";
		}

		if (prefix == "") {
			return;
		}

		// Slice message
		let args = message.content.slice(prefix.length).trim().split(/ +/g); //Chop off the prefix, trim, split using spaces.
		let command = args.shift().toLowerCase();

		// Valid command?
		if (!Bismo.Commands.has(command))
			return;

		
		let commandExecuteData = new CommandExecuteData(message, command, args);
		commandExecuteData.Process().catch(err => {
			Bismo.Log.error("Error calling CommandExecuteData.Process() (chat message)");
			Bismo.Log.error(err);
		});

	} catch (err) {
		Bismo.Log.error("Command fault. Guild? " + ((message.guild!=undefined)? "true" : "false"));
		Bismo.Log.debug("Message: " + message.content);
		Bismo.Log.error(err);
	}
});



Client.on('interactionCreate', async iaction => { // async?
	// We've received an interaction. This could be either a message component or a slash command
	// Since we only support slash commands at the moment, I'm going on the assumption it's one of those

	/** @type {Discord.Interaction} */
	let interaction = iaction;
	/** @type {import('./Bismo.js')} */
	let Bismo = global.Bismo;
	try {
		// This also allows us 15 minutes to reply rather than 3 seconds
		await interaction.deferReply(); // This sends "is thinking" as the first response. This allows the user to see that the command was received.

		// 1 = ping, 2 = slash command, 3 = message component, 4 = application command autocomplete ?
		if (interaction.type == Discord.InteractionType.ApplicationCommand) {
			let alias = interaction.commandName;
			if (!Bismo.Commands.has(alias)) {
				interaction.followUp({
					content: "O_O !! Command fault, stagnant (unknown) command.",
					ephemeral: true,
				});
				return;
			}
			
			if (interaction.options == undefined)
				return;

			let args = []
			if (interaction.options.data !== undefined && interaction.options.data?.length >= 1) {
				for (let i = 0; i<interaction.options.data.length; i++) {
					args[i] = interaction.options.data[i].value;
				}
			}

			let commandExecuteData = new CommandExecuteData(interaction, alias, args);
			commandExecuteData.Process().catch(err => {
				Bismo.Log.error("Error calling CommandExecuteData.Process() (interaction)");
				Bismo.Log.error(err);
			});

		}
	} catch(error) {
		Bismo.Log.error("Command fault (unexpected exception in interaction handler).");
		Bismo.Log.error("[B-e] Trace: " + error.stack);
	}
}); // End interaction create