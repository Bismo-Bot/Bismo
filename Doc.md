	    ____  _                    
	   / __ )(_)________ ___  ____ 
	  / __  / / ___/ __ `__ \/ __ \
	 / /_/ / (__  ) / / / / / /_/ /
	/_____/_/____/_/ /_/ /_/\____/  Discord Bot Framework
	
            Yet Another JS/Discord Framework/Bot


# Bismo API
Bismo is a Discord bot "framework". _Whatever that means_\

Bismo was primarily developed so creating commands for a Discord bot was as painless as possible yet flexible. Like an abstraction layer between discord.js and commands.\
It is my take on discord.js/commando. _Are they similar?_ I don't know, I only used it once to spin-up a YouTube bot quickly.


I do not guarantee support, I'm quite busy in other fields and cannot dedicate too much time on this project. With that said, Bismo should work for quite sometime unsupervised/unmaintained (as long as the Discord API and discord.js doesn't undergo major changes).\
Also, because I'll leave a project for extended periods of time I'll typically forgot what is going on/how it works. Because of this, I like to document everything so anyone could figure it out (like myself).



## Private (internal) API
These functions are internal to the bismo.js file itself.\
`lBismo.config`: 			Local bot configuration

`lBismo.SaveConfig()`: 	Saves lBismo.config object to the config.json file

`lBismo.guildAccounts`: 	Array of Bismo guild account data (Bismo side)

`lBismo.guildObjects`: 	Object containing all the Discord guild objects


`lBismo.waitForReply`: 	Array of GetReply IDs (when using GetReply, Bismo saves an ID of the interaction so the messages handler can ignore the response)


`lBismo.apiVersion`: Bismo API version



## Public API
These functions are passed to the "plugins" (your commands) and will provide Bismo's power.\
`Bismo.SaveGuilds()`: Saves current (sterile) guild configuration information to the `./Data/Guilds.json` file.

`Bismo.GetUserReply(userID, channelID[, options])`: Grab a user's input (process in-line a user reply). Next message from a user in `channelID` is ignored except by your callback.\
`userID`: String, Discord user Id of the person you're waiting for a reply from\
`channelID`: String, Discord channel Id you're waiting for a reply in\
`options`: Bismo.GetUserReplyOptions, Additional options passed to the Discord.MessageCollector\
(\
    `options.cancelCommand`: String, What a user must type in order to dismiss and cleanup the listener (Default: `!~cancel`)\
	  `options.filter`: The filter passed to the Discord.MessageCollector, default to `m=>m.author.id === id` (only accept messages with the user's ID)\
	  `options.options`: Further options passed to the Discord.MessageCollector\
)\
The returned promise will either resolve with the user's unmodified message or reject if they canceled (using the cancel command, `!~cancel`).\
Use this to wait for additional input from a user. When called, the user's next message will be resolved and processed by the calling code without any altering.\
We do split the user's message by white space into an array called `args`\
To prevent command processing from this user we calculate the SHA1 of the user's ID and channel's ID concatenated together and then add that to the waitForReply array.\
When a normal message comes in, we always calculate this same SHA1 and check to see if anything lives in waitForReply, if something does we do not process the command.\
Since we do not process the message in any way, the bot's prefix is NOT required. The entirety of the message will be processed by your callback function.


`Bismo.GetUserReplySync(userID, channelID, options)`: Turns `Bismo.GetUserReply()` into a synchronous function. (`return await Bismo.GetUserReply(...)`).\
Returns the message object the user sent.

---

`Bismo.GetDiscordGuildObject(guildID)`: Returns a `Discord.Guild` object for the guild with the Id specified.\
`Bismo.AddGuild(ID, data)`: Creates a new `Bismo.GuildAccount` account (internal data medium for the guild).\
_See ./Support/GuildAccount.js for more info_


`Bismo.GetBismoGuildObject(ID)`: Returns the `Bismo.GuildAccount` object for the specified guild Id.

`Bismo.RemoveGuild(ID)`: Removes the `Bismo.GuildAccount` object for the specified guild Id (and from the Guilds file).

---

`Bismo.GetGuildUsers(ID)`: Returns a `Discord.GuildMemberManager` for a particular guild.

`Bismo.GetGuildUserIDs(guildID)`: Returns an array of member IDs within a guild. (Converts the output from above to their IDs)

`Bismo.IsDiscordGuildMember(ID, guildID)`: Checks to see if a user is apart of a guild. Returns true/false if `ID` is a member of `guildID`.

`Bismo.GetGuilChannels(ID, type)`: Returns an array of all channels in a particular guild (that are (if specified) a certain type).

`Bismo.GetCurrentVoiceChannel(guildID, userID)`: Returns the voice channel a user is currently (in a particular guild). Undefined if (well) undefined.

`Bismo.GetGuildChannelObject(ID, channelID)`: Returns the channel object of a channel (channelID) in a guild (Id).


---


`Bismo.RegisterCommand(alias, handler[, options])`: Registers a new chat or interaction (slash) command.\
`alias`: the name of the command _(such as mkdir, play, etc)._\
`handler`: the function we call when the command is executed by someone. When we call this function, we pass a single parameter `Bismo.CommandExecuteData`. _See `Bismo.CommandExecuteData` for more info._\
`options`: The options for the command. `Bismo.CommandOptions`. You are not required to pass any options, `friendlyName` will be you alias and `description` will be _"No description provided."_

_Options:_\
`.friendlyName`: _(Type: `string`)_ Friendly name of the command (defaults to provided alias)\
`.description`: _(Type: `string`)_ A description of the command (defaults to "No description provided")\
`.helpMessage`: _(optional) Type: `string`_  display in the bot's help command (/bismohelp) (defaults to description)\
`.slashCommand`: _(optional, default = false) Type: `boolean`_ Registers the command as a slash command on Discord.\
`.chatCommand`: _(optional, default = true) Type: `boolean`_ Command is executed via chat (with the appropriate listener cue (!) prefixing the command)\
`.slashCommandOptions`: _(optional, default = []) Type: `JSON[]`_ Slash commands allow you to specify 'options' (parameters). Use this to provide that information. You'll need to do everything manually.\
`.ephemeral`: _(optional, default = true) Type: `string`_ Slash commands only. If true only the author can see replies.\
`.usersOnly`: _(optional, default = true) Type: `boolean`_ Command only allow to be called by users (and not bots)\
`.directChannels`: _(optional, default = false) Type: `boolean`_ Runs in direct message channels (not a guild)\
`.guildChannels`: _(optional, default = true) Type: `boolean`_ Runs in a guild channel\
`.whitelistGuilds`: _(optional, default = undefined) Type: `string[]`_ Only these guilds can run this command (array)\
`.blacklistGuilds`: _(optional, default = undefined) Type: `string[]`_ These guild CAN NOT run this command (array)\
`.hidden`: _(optional, default = false) Type: `string`_ Command not listed


`Bismo.GetPlugin(name, mustBePackage)`: Returns a plugin's public API.\
`name`: Either the friendly name or package name\
`mustBePackage`: Only lookup the plugin API using the package name (note, slower)


`Bismo.GetPluginMethod(name, methodName, mustBePackage)`: Returns a function from a plugin's API. (You should use this only if you need one function, otherwise you should just use .GetPlugin()).\
`name`: Either the friendly name or package name\
`methodName`: The function you're trying to get\
`mustBePackage`: Only lookup the plugin API using the package name (note, slower)


`Bismo.GetDiscordClient()`: Returns reference to the Client object used by Bismo to interact with Discord. (This IS the discord.js Client instance Bismo uses. With this you essentially have fully access to the bot. **With great power comes great responsibility**).
Will likely get updated later on to reflect plugin permissions _ignore that_. So just be warned, this might return `undefined` at some point.


### Bismo.CommandExecuteData
When a command is ran, Bismo will try to create a neat little package to help your command understand what's going on and to reduce the number of external API calls. (We get the guild data, author data, you name it).


CommandExecuteData is passed to the command's handler as the first parameter, and is a generic object (dictionary)\
`Reply` _Type: `Reply`_ Method used to send a reply back to the user (chat commands: sends a message in the same channel, slash commands: sends a follow up message to the user)\
`GetReply` _Type: `Bismo.CommandExecuteDataGetReply`_ This is a wrapper for the Bismo.GetUserReply() function. Allows you to collect a single response from the author in chat\
`alias` _Type: `string`_ Which command was executed\
`args` _Type: `string[]`_ The parameters for the command (We automatically phrase this for you, in both chat and slash commands)\
`channel` _Type: `Discord.TextChannel`_ Channel object the message was sent over\
`author` _Type: `Discord.User`_ User object that executed the command\
`authorID` _Type: `string`_ User ID\
`guild` _Type: `Discord.Guild`_ Discord guild object\
`guildID` _Type: `string`_ Discord guild ID\
`inGuild` _Type: `boolean`_ Command executed inside a guild?\
`guildAccount` _Type: `Bismo.GuildAccount`_ Bismo guild account (special container for the guild, holds guild specific data)\
`isInteraction` _Type: `boolean`_ Whether or not this was an interaction (slash command / message interaction)\
`message?` _Type: `Discord.Message`_  Message object (if chat command)\
`interaction?` _Type: `Discord.Interaction`_  Interaction object (if slash command / message interaction)


### Internal helpers
Again, internal functions that are not directly related to Bismo/Discord but are used throughout to get basic things done. _Included for internal development_\
`writeJSONFile(path, contents)`: Write `contents` to the `path` specified. If DPAPI is enabled, we automatically encrypt `contents`.\
Returns a promise, resolves to the output of `fs.writeFile()`

`writeJSONFileSync(path, contents)`: Same as above, but synchronous

`readJSONFile(path)`: Read the contents of `path`. If DPAPI is enabled, automatically decrypts the contents (if necessary).\
Returns a promise, resolves to the contents of `path` as an object. Rejects if `fs.readFile()` returns an error

`readJSONFileSync(path)`: Same as above, but synchronous. Returns the contents.



### Intents
By default we load a few intents. It's frowned upon to load _every_ intent, so hand select the ones you think you'll need. The defaults should work fine for anyone.\
You can control which intents are included by searching for `Discord.Intents.FLAGS.*` in the `bismo.js` file



### Plugins
Plugin files are stored in `./Plugins/<Plugin Name>/`\
The file structure can be whatever you want, except you MUST have a `plugin.js` file present in the root of your plugin folder. (`./Plugins/Steam/plugin.js`)\
_If you want to include node_modules, go for it_\
You can temporarily disable a plugin by placing a(n empty) file named `disable` in the root of the plugin folder. (`./Plugins/Steam/disable`)\
Your plugin will be saved under the folder name it is placed in, the friendly name is determined by the manifest.

Your plugin file can contain whatever you want, except it MUST export a particular object. Plugins MUST export an object following this template:\
```(javascript)
{
	request: [], // Originally this was used to "request" a copy of a particular library Bismo was using, but I don't see a need in it. It does nothing currently, but _may_ be used for this purpose later. 
	main: function(), // Function that is called to setup your plugin (this is you entry point).
	manifest: {
		name: "My Awesome Plugin", // Friendly name for your plugin
		packageName: "com.cooldude42.awesomeplug", // An internal, unique (like), name for your plugin
		version: "1", // Plugin version
		author?: "CoolDude42", // Your name
		targetAPIVersion: 1, // What version of Bismo this targets (future proofing, allows the plugin loader to implement API wrappers for outdated plugins. Currently does nothing. See _Bismo Versioning_ for more info)
		
		// You can really include whatever else you'd like.
		date: "01/20/1970", // Optional date of development
	}
}
```

Walk-through of plugin loading:
- Get all the sub-directories of `./Plugins`
- For each sub-directory:
	- Grab the plugin's name
	- Try clause:
	- Skip if `plugin.js` does not exist
	- Skip if `disable` exists
	- Load code (`let plugin = require('./Plugins/${name}/plugin.js');`)
	- Skip if manifest object does not exist (or if packageName not set)
	- Setup plugin's Bismo API copy `let requests = {...Bismo}`
	- If the plugin has the main function defined:
		- New anonymous async function that calls `plugin.main(requests)`
		- Catch anonymous function, display error to console on plugin crash.


After all plugins have loaded, we emit `pluginsLoaded` on `Bismo.Events.bot`. Use this to then obtain another plugin's API.




### Events
Bismo tries to capture most discord.js events and relay them over Bismo.Events.discord with the same names and parameters.\
There are some custom Bismo events, however. Here they are:


##### Bismo.Events.discord:
`voiceChannelJoin`: Emitted whenever a user joins a voice channel. First parameters is the voice channel they joined, second is the raw oldMember and newMember from the `voiceStateUpdate` event\
`message`: Emitted when a new message is received. First (and only) parameter is the CommandExecuteData meaning you can technically listen and interpret every command Bismo receives.\
`ready`: Emitted when the bot has finished startup. Client is the only parameter


##### Bismo.Events.bot
`guildDiscovered`: On startup, this is called for each guildAccount loaded. The only parameter is an object: `{ gID: guildID, guild: Discord.Guild, bismoGuildObject: Bismo.GuildAccount } `\
`pluginsLoaded`: Emitted after all plugins have been loaded.
