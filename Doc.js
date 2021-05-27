/*
	    ____  _                    
	   / __ )(_)________ ___  ____ 
	  / __  / / ___/ __ `__ \/ __ \
	 / /_/ / (__  ) / / / / / /_/ /
	/_____/_/____/_/ /_/ /_/\____/  Discord & Steam Bot
	
			A tool for gods

	

	/account


	Web endpoints:
		bismo.co/*
			/API/<guildID>: Web API
			/guild/<guildID>: Web interface



	\Plugins:
		Stored in ./Plugins/<Plug-in Name>/
		The file structure can be whatever you want, EXCEPT, you MUST have a "plugin.js" file present in the ROOT of your plugin folder
		(I.E. ./Plugins/Steam/plugin.js)
		The plugin.js file MUST export a table *.requests and a function *.main()
			*.requests: An array that marks what data we must provide to your plugin (things such as our express instance)
				express,
				httpServer,
				masterConfig

				All plugins are given Bismo API access, and read/write abilities to their unique config file (Bismo.readConfig(), Bismo.writeConfig(JSON-contents, callback)).


			*.main(Requests): This is the main function that Bismo will call to start your plugin. This is the only thing Bismo will directly call. Use this to initialize your listeners and what not.
				We will pass any requested APIs/Data through the 'Requests' parameter as a {}. Key names are the same as requested, plus we include the Bismo API (as 'Bismo')

			*.manifest: A table containing various details about this plug
				name,			:: The friendly name of the plugin
				packageName,	:: Something similar to com.my.plugin
				author,			:: Your name/screen name
				date,			:: Optional date of development
				version			:: The version of this plugin

			*.api: A table including API calls for your plugin. These calls will be public via Bismo.getPluginAPI("<plugin package name>") or Bismo.getPlugin(<package name>);

		Bismo API includes special functions for plugins:
			Bismo.getPlugin(name[, mustBePackage]): Returns the plugin API for the plugin with <name>
													(note this can either be the friendly name or the package name. Friendly name will load *slightly* fast, package is safer.)
													To force package name lookup, set mustBePackage to true

			Bismo.readConfig([name]): Returns a configuration file for your plugin (name defaults to config)
			Bismo.writeConfig(data, [callback, name]): Writes data to the plugin configuration file. (callback is called when save successful, name defaults to config)
			Bismo.log(msg): Output to the console with your plugins name. Do not use console.log, use this instead.
			Bismo.registerCommand(command, callback, description, helpMessage): Allows you to register a command. This is the first string of text after our listener cue (! or mention). The call back is the handler for this command.
				We pass the following to the callback
					message: The Discord message object. We include some extras with this...
						prefix: The prefix used to get the bot's attention (like !)
						args: An array containing everything after the command, split up on spaces (So, if the user sends "!account create bigdog" args would contain ["create", "bigdog"])
						reply(msg): Quick easy way to reply to the author
						BismoAccount: The Bismo of the author (sender) of the message.
							This has the addition of .hasPermission(perm) for checking current permissions (if in guild)
							To compare against another guild, do BismoAccount.guilds[guildID].hasPermission(perm)
						GAccount: The (if available) Guild account for the guild this message was sent via

				Description: a description of the command
				HelpMessage: the message displayed when !command [help] is ran
				MetaData: Optional data to include ...
					usersOnly: Command can't be used in guilds, only DMs
					whitelistGuilds: These guilds (ids) are the only ones that can use this command
					blacklistGuilds: These guilds (ids) can not use this command
					hidden: Command is hidden from help/list commands
					guildRequired: Only run within a guild
					noParams: No additional parameters for this command.


		On guild setup (as in guild account loading) we issue an event 'setup' on the main register for Bismo. In this event we include a single {} (name BismoPacket). This table includes:
			gID: The guild's ID
			guild: The guild's Discord Object
			GAccount: The guild's Bismo account
			Accounts: A copy of the Bismo accounts of all users in this guild (note, since this is a copy you cannot modify global settings via this table)



	\.Bismo API:
		.getUserReply(userID, channelID, callback[, options]):
			userID: The user we are waiting for a message from
			inChannelID: The channel this message we be sent over
			callback: The function we call when the message is collected (we pass the message)
			options: {
				cancelCommand: The command used to cancel the collector
					Note: this is EXCATLY what the user would send back. So if you set this to "bruh" the user would have to type "bruh" to cancel. We do not process prefixes.
				filter: The filter passed to the Discord message collector. (Default: m=>m.author.id === id)
				options: The options passed to the Discord message collector.
			}

		.waitForUserMessage(userID, inChannelID, cancelCommand, callback, filter, options)
			userID: The user we are waiting for a message from
			inChannelID: The channel this message must be sent over
			cancelCommand: The string of text the user must type to cancel this collector (I.E. not call the callback).
				Note: this is EXCATLY what the user would send back. So if you set this to "bruh" the user would have to type "bruh" to cancel. We do not process prefixes.
			callback: The function we send the collected message to (we only send the message object, nothing else)
			filter, options: These are passed directly to a new Discord.MessageCollector() instance. (Filter defaults to only allowing messages sent by the user $ID)

			When called, we create a simple hash of the userID and inChannelID to add to the array WaitForReply. This is done so the main message handler of the bot can ignore a message sent by userID over inChannelID (since we're handling it here)



	Message 'packet':
		The regular 'message' packet PLUS:
			.prefix: what prefix was used before this command
			.args: everything after the 'command' (first non-spaced word)
			.reply: same channel reply function
			.BismoAccount: Bismo account of the sender (if available)
			.GAccount: the guild account (if available)
			.getReply(prompt, callback[, options]): This is a wrapper for the Bismo.getUserReply() function.


	Events:
		Bismo.events.bot:
			pluginsLoaded: Emitted after all plugins have loaded. No data emitted with this.
			setup: When a guild's data is loaded (from discord) we emit this along with the Bismo packet (see note about 'On guild setup')


		Bismo.events.discord:
			message: Emitted when a message is received. Data passed includes the 'message' with a few things added. This is the same message package sent to command handlers.

			voiceChannelLeave: When a user leaves a voice channel. Data passed: the channel they left, { oldMember, newMember } (see voiceStateUpdate event for more info)
			voiceChannelJoin: When a user joins a voice channel. Data passed: 	the channel they joined, { oldMember, newMember }
















	QUEUER:
		TODO: {
			pin a message on first join, this pin message will update everytime the song changes so the channel can easily view the current song

			react to messages where possible

			add collectors to make commands easier

			pause, play, seek
		}


		Queue acts as the middleman between a sea of 'play' commands and different addons that pull music from various sources.
	
		Song object: {
			id: 0,			// The song ID in the queue. This is not necessarily the track position in the queue (unless shuffle is disabled).
			loop: false, 	// If `true` we loop this song

			title: "Never Gonna Give You Up",		// Title of the song
			addedBy: "<discord userID>",			// The ID of the user that added this song
			addedByUsername: "<username>",			// The username of the user ""
			timeStamp: "3:32",						// Needed
			packageName: "com.watsuprico.youtube",	// The plugin that added this to the queue


			// Optional functions (try to make these functions as slim as possible, potentially just a wrapper to the Plugin's API)
			play: function(queue),			// Begin playing the song. This should play the song from the beginning; think of this as startSong()
			
			seek: function(queue, time),	// Seek playback to <time> (which is given in seconds)


			// If the plugin needs to store information relevant to playback, such as URL for example, then it can store that data in the following object:
			persistentData: {
				url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
			}

			// When we sterilize this song for saving it, we ONLY record the meta-data and persistentData. All functions and additional data will NOT be stored.

		}

		When loading a song (from being saved) we call `songObj = Plugin.setSong(songObj);`
		It is up to the plugin to setup the song data as it should be (add the play, seek etc function)

		Queuer reactions (responses):
			🖖: Voice channel disconnected,
				"Goodbye"
			
			⭕: Queue created, joined voice channel 
				"Hello!"
	
			⁉️: Illegal operation: attempt to modify non-existent queue.
				"What?" / No queue active"

			👌: Operation completed successful.
				"Okay!" / "Done"
			
			🙅‍X: Disabled X, where X is an emoji (for example, 🙅‍🔁 means 'disabled repeat' or 'NO repeat' or 'repeat off')

			🔂: Song on repeat
			🔁: Queue on repeat
			🔀: Shuffle active
			▶️:  Playing
			⏸️: Paused
			⏭️: Skipped




		Queue commands (alias: q, queuer) {
			-q stop|clear|end|leave: Clears the queue and makes the bot leave the voice channel.
			
			-q view|queue [fromIndex]: Displays the current queue (up to 5 items a time). To view beyond these 5 items, specify a 'fromIndex' to display the tracks after that song ID. (!q view shows 0-4, !q view 5 shows 5-10)
			
			-q loop|repeat [song|queue]: If song|queue is not specified, this toggles the repeat mode.
				No loop -> loop queue -> loop track -> no loop -> ...
				You can specify if you want to manually enable repeat for the track or song by specifying that with something like !q loop song
			
			- q remove|rm|del|delete <startID> <endID>: Removes a song from index <startID> to <endID>
			- q remove|rm|del|delete <title>: Remove the song with the title <title>. Exact matches only (not case sensitive).
			- q remove|rm|del|delete next|n: Remove the next song
			- q remove|rm|del|delete current|cur|c: Removes the current song (and goes to the next song)
			- q remove|rm|del|delete previous|prev|p: Removes the previous song


			- q skip|next: Go to the next song. If playing the last song in the queue, we actually loop over to the beginning.
				To do this we temporally enable queue loop, issue the next command, and then disable the set the loop back to whatever it was

			- q volume|vol <percentage %>: Changes the playback volume to <percentage>% (200-0)

			- q shuffle: Toggle shuffle mode. Once enabled, we move the current song to the beginning and randomly sort the queue.
				You can then disable shuffle and everything will go back to how it was before. (idea was to mimic Spotify shuffling)

			- q save name: Save the current queue (as private)
			- q save save-p|save-private <name>: Save queue to author's private storage (as <name>)
			- q save save-g|save-guild <name>: Save queue to guild (as <name>)
				If personal is specified as the save location then only the author can retrieve the queue. The queue can be retrieved in any guild
				If guild is specified as the save location, then anyone in the guild can retrieve the queue, but ONLY in that guild.
				
				The ID is a MD5 hash of the following information:
					name: name of the saved queue... (all locations)
					queueID: Either a guildID or userID (guild & guild-private use guildID, private uses userID)
					authorID: The person who saved this. (guild-private)

				We save queues like this: savedQueues = {
					[ID] = savedQueue;
				}
				When saving the queue, we strip all song data except: {
					id,
					title,
					addedBy,
					timeStamp,
					packageName,
					persistentData,
				}
			
			-q (load | loadq | lq) name: Load a song by name
				We first check the for a private guild queue of that name,
				then personal queues,
				and then finally public guild queues
				guild (private) -> personal -> guild
				This allows users to save custom queues per-guild by the same name as a private queue. (So making a custom version of the queue for a guild).

		}


		Groovy commands:
			Need to add:
				playlists

			X-play [link | title]
			X-play <file>
			-join
			X-queue: View
			X-next
			X-back
			X-clear: Queue
			x-jump: GOTO
			-move
			X-loop track|queue|off
			-lyrics [query]
			X-pause
			X-resume
			X-remove [title | position]
			X-remove range [start] [end]
			X-disconnect
			X-shuffle
			X-song [song]: Info about song
			-24/7
			X-volume [vol]
			-seek
			-fastfoward: Seek, but relative
			-rewind
			-search: Display search results
			X-stop


			-bass boost [amount]
			-speed [speed]
			-pitch [%]
			-nightcore
			-vaporwave
*/