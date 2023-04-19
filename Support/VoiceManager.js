const EventEmitter = require('node:events');

const DiscordVoice = require('@discordjs/voice');

const crypto = require("node:crypto");
const { isArrayBufferView } = require('node:util/types');
const { DiscordAPIError, VoiceChannel } = require('discord.js');


/**
 * @typedef {import('discord.js')} Discord
 */


/**
 * Checks if a variable is an array of a certain type
 * @param {*} data - The variable to check
 * @param {*} type - The type to check against
 * @return {boolean} True if the variable is an array of the specified type, false otherwise
 */
function isArrayOfType(data, type) {
    return Array.isArray(data) && data.every(elem => {
        if (typeof type === "function")
            return elem instanceof type
        else
            return typeof elem === type
    });
}

/**
 * Takes an array and for each element calls the callingFunction with that single value. Includes type checking (if expectedType provided)
 * @param {Array} inputArray Any array
 * @param {function} callingFunction The function to pass the single item from the array to (callingFunction(item))
 * @param [object] expectedType The required type of all array objects
 * @return Returns a map of the array's original value to the output of the calling function
 */
function arrayToSingle(inputArray, callingFunction, expectedType) {
    if (Array.isArray(inputArray)) {
        if (expectedType != undefined && expectedType != null) {
            if (!inputArray.every(i  => typeof i === expectedType)) {
                throw new TypeError("inputArray expected " + (expectedType) + "[]");
            }
        }

        let results = new Map();
        for (var i = 0; i<inputArray.length; i++) {
            results[inputArray[i]] = callingFunction(inputArray[i]);
        }

        return results;
    }
}


/**
 * BismoAudioPlayer object used to house Discord AudioPlayer objects, allows for a object for us to "subscribe" and "unsubscribe" from audio channels, ... gives us something TO manage.
 * Class should be initialized from a VoiceManager instance itself, use something like `let BAP = new voiceManager.CreateBismoAudioPlayer()`
 * 
 * **B**ismo**A**udio**P**layers are sometimes shortened to BAP or BAPs
 */
class BismoAudioPlayer extends EventEmitter {
    /**
     * VoiceManager parent used by Bismo or whoever is managing the voice channels. We use this to make 90% of our calls.
     * @type {VoiceManager}
     */
    #VoiceManager;


    /** Array of subscribed voice channel ids
     * @type {string[]} */
    #VoiceChannelIds = [];
    

    /** @type {DiscordVoice.AudioPlayer} DiscordAudioPlayer object */
    AudioPlayer;
    /** @type {string} UUID for this player */
    Id = "";
    /** @type {string} Friendly player name */
    Name = undefined;
    /** @type {string} Name of the plugin owner (who created this player) */
    PluginName = undefined;
        
    /**
     * @event this#FocusedChanged
     * @type {object}
     * @property {boolean} InFocus - Indicates whether the play entered focus (begin playing) or is no longer in focus (stop playing)
     */


     /**
      * Unofficial quick reference (cache) of the current focus level in a specific voice channel (given by its id)
      * Should be updated by the player.
      * @type {Map<string,number>}
      */
    FocusLevel = new Map();   

    

    /**
     * 
     * @param {VoiceManager} voiceManager - The VoiceManager parent used by Bismo or whoever is managing the voice channels. Populated if you call VoiceManager.CreateBismoAudioPlayer()
     * @param {string} id - The incrementing Id for this audio player. Use to uniquely identify this player.
     */
    constructor(voiceManager, id, BAPProperties) {
        super();

        if (voiceManager.constructor.name !== "VoiceManager")
            throw new TypeError("voiceManager expected instance of VoiceManager got " + ((typeof voiceManager == "object")? voiceManager.constructor.name : typeof voiceManager).toString()); // ewww

        if (typeof id !== "string")
            throw new TypeError("id expected string got " + (typeof id).toString());
        else
            id = crypto.randomUUID();

        this.#VoiceManager = voiceManager;
        this.Id = id;

        if (typeof BAPProperties === "object") {
            if (typeof BAPProperties.pluginName === "string")
                this.PluginName = BAPProperties?.pluginName;

            if (typeof BAPProperties.name === "string")
            this.Name = BAPProperties?.name;
        }

    }



    /**
     * View the current focus level of this player in one or more channels
     * @param {(string|string[])} [voiceChannelId=undefined] List of channels to check (all subscribed if none)
     * @return {(number|Map<string,number>)} Current focus level of this player in a channel, or if multiple channels specified a map of voice channel id and focus level (this[voiceChannelId]: focusLevel)
     */
    GetFocusLevel(voiceChannelId) {
        if (voiceChannelId == undefined)
            voiceChannelId = this.#VoiceChannelIds;

        if (typeof voiceChannelId !== "string" && Array.isArray(voiceChannelId) === false)
            throw new TypeError("voiceChannelId expected string got " + (typeof voiceChannelId).toString());

        if (voiceChannelId.isArray()) {
            return arrayToSingle(voiceChannelId, this.GetFocusLevel, "string");
        }

        return FocusLevel[voiceChannelId];
    }
    SetFocusLevel(voiceChannelId) {
        if (voiceChannelId == undefined)
            voiceChannelId = this.#VoiceChannelIds;

        if (typeof voiceChannelId !== "string" && Array.isArray(voiceChannelId) === false)
            throw new TypeError("voiceChannelId expected string got " + (typeof voiceChannelId).toString());
        
        if (voiceChannelId.isArray()) {
            return arrayToSingle(voiceChannelId, this.GetFocusLevel, "string");
        }

        return this.#VoiceManager.SetFocusLevel(this, voiceChannelId);
    }

    // Methods
    /**
     * Locks focus to this audio player (in a specific channel(s) if provided or all)
     * @param {(string|string[])} [voiceChannelId=undefined] The voice channel(s) to lock focus in
     * @return {(bool|string[])} Either true or false to signify successful lock, or an array of successfully locked channels
     */
    LockFocus(voiceChannelId) {
        if (voiceChannelId == undefined)
            voiceChannelId = this.#VoiceChannelIds;

        return this.#VoiceManager.LockFocus(this, voiceChannelId);
    }
    /**
     * Unlocks focus to this audio player (in a specific channel(s) if provided or all)
     * @param {(string|string[])} voiceChannelId The voice channel(s) to unlock focus in
     * @return {(bool|string[])} Either true or false to signify successful unlock, or an array of successfully unlocked channels
     */
    UnlockFocus(voiceChannelId) {
        if (voiceChannelId == undefined)
            voiceChannelId = this.#VoiceChannelIds;

        return this.#VoiceManager.UnlockFocus(this, voiceChannelId);
    }

    /**
     * Calls VoiceManager.Subscribe(this, voiceChannelId)
     * @param [string|string[]|Discord.VoiceChannel|Discord.VoiceChannel[]] voiceChannelId The voice channel(s) to subscribe this player to (play in)
     * @return [bool]
     */
    Subscribe(voiceChannelId) {
        if (voiceChannelId == undefined)
            voiceChannelId = this.#VoiceChannelIds;

        return this.#VoiceManager.Subscribe(this, voiceChannelId);
    }
    /**
     * Unsubscribe this audio player form one or more voice channels by calling VoiceManager.Unsubscribe(this, voiceChannelId)
     * @param [string|string[]|Discord.VoiceChannel|Discord.VoiceChannel[]] voiceChannelId The voice channel(s) to unsubscribe this player from (default: all active channels)
     */
    Unsubscribe(voiceChannelId) {
        if (voiceChannelId == undefined)
            voiceChannelId = this.#VoiceChannelIds;

        return this.#VoiceManager.Unsubscribe(this, voiceChannelId);
    }


    /**
     * List of the currently subscribed voice channels
     * @return {string[]} String array of subscribed voice channels
     */
    GetVoiceChannelIds() {
        return this.#VoiceChannelIds;
    }


    /**
     * Unsubscribes the BAP from all channels and destroys the AudioPlayer
     */
    Destroy() {
        this.#VoiceManager.Unsubscribe(this, this.#VoiceChannelIds);
        this.AudioPlayer.stop();
        delete this.AudioPlayer;
        delete this;
    }
}

/**
 * This is where most of the VoiceManager logic lives
 * @class {EventEmitter} BismoVoiceChannel 
 */
class BismoVoiceChannel extends EventEmitter {
    /**
     * VoiceManager parent used by Bismo or whoever is managing the voice channels. We use this to make 90% of our calls.
     * @type {VoiceManager}
     */
    #VoiceManager;

    /**
     * The VoiceChannel identification we're representing
     * @type {string}
     */
    Id;

    /**
     * Discord VoiceChannel object we're representing
     * @type {Discord.VoiceChannel}
     */
    ChannelObject;


    /**
     * Used to prevent multiple destroys from running at once
     * @type {boolean}
     */
    #Destroying;


    /**
     * @typedef {object} Focus
     * @property {Map<number,BismoAudioPlayer[]>} Stack - The current focus stack. The number is the focus level. The higher the number the higher the priority. 1 is default. After that, it's a FIFO order
     * @property {boolean} IsLocked - Whether the current player is the current player because it has focus lock
     * @property {BismoAudioPlayer} CurrentPlayer - Current BismoAudio player that is out putting to this channel
     */
    /** @type {Focus} */
    Focus = {
        Stack: new Map(),
        IsLocked: false,
        CurrentPlayer: undefined
    }

    /** @type {import('./LogMan.js').Logger} */
    #log;

    /**
     * @type {VoiceManagerOptions}
     */
    options = {
        selfDeaf: true,
        selfMute: false,
    };

    /**
     * 
     * @typedef {object} VoiceManagerOptions
     * @property {boolean} selfDeaf - Should we be deafened in the VoiceChannel? Default: true
     * @property {boolean} selfMute - Should we be muted in the VoiceChannel? Default: false
     */

    /**
     * @param {VoiceManager} voiceManager - Parent VoiceManager class
     * @param {(Discord.VoiceChannel|string)} voiceChannelId - It would be smart to just pass the voice channel object. If you do not we'll have to search for it (slow)
     * @param {string} [guildId=undefined] - Guild id containing this voice channel
     * @param {VoiceManagerOptions} options - Various options, such as selfDeaf and selfMute which are passed when creating the VoiceConnection
     */
    constructor(voiceManager, voiceChannelId, guildId, options) {
        super();
        

        this.#VoiceManager = voiceManager;
        this.Id = crypto.randomUUID();
        this.#log = process.Bismo.LogMan.getLogger("BVC-" + this.Id);

        if (typeof voiceChannelId !== "string") {
            if (voiceChannelId.id !== undefined) {
                // this.Id = voiceChannelId.id;
                this.ChannelObject = voiceChannelId;
            }
        } else {
            // this.Id = voiceChannelId;
            // We don't know the guildId, which is fine, we can just say "hey we don't know which guild this is in, can you search ALL the guilds??"
            // It's stupid, but works. At scale this will be painful.
            this.ChannelObject = this.#VoiceManager.Bismo.GetGuildChannelObject(guildId, voiceChannelId);
        }

        if (this.ChannelObject.type != "GUILD_VOICE" && this.ChannelObject.type != "DM" && this.ChannelObject.type != "GROUP_DM")
            throw new Error("Invalid channel!");

        if (options != undefined) {
            if (typeof options.selfDeaf == "boolean")
                this.options.selfDeaf = options.selfDeaf;
            if (typeof options.selfMute == "boolean")
                this.options.selfMute = options.selfMute;
        }

        if (typeof this.ChannelObject.permissionsFor != "function")
            return undefined;
        let permissions = this.ChannelObject.permissionsFor(process.Client.user)
        if (!permissions.has("CONNECT"))
            throw new Error("No VoiceChannel permission: connect");

        if (!this.options.selfMute)
            if (!permissions.has("SPEAK")) // We can probably ignore that...
                throw new Error("No VoiceChannel permission: speak");

        if (this.ChannelObject === undefined)
            throw new Error("Undefined VoiceChannelObject!");


        this.on('moved', (oldChannel, newChannel) => {
            if (oldChannel != undefined && newChannel != undefined)
            this.#log.debug("Moved from " + oldChannel.id + " to " + newChannel.id);
        });
    }


    /**
     * Returns whether a BismoAudioPlayer is subscribed to this BismoVoiceChannel (it is inside the Focus Stack)
     * @param {BismoAudioPlayer} bismoAudioPlayer
     * @return {boolean} bismoAudioPlayer present in Focus Stack
     */
    #IsBismoAudioPlayerSubscribed(bismoAudioPlayer) {
        let players = this.GetBismoAudioPlayers(true);
        players.forEach((player) => {
            if (player.Id == bismoAudioPlayer.Id)
                return true;
        });
        return false;
    }
    /**
     * Throws an error if a BismoAudioPlayer is not subscribed to this BismoVoiceChannel
     * @param {BismoAudioPlayer} bismoAudioPlayer
     * @throws {Error} - Player not found in focus stack
     */
    #CheckIsBismoAudioPlayerSubscribed(bismoAudioPlayer) {
        let subscribed = this.#IsBismoAudioPlayerSubscribed(bismoAudioPlayer);
        if (!subscribed)
            throw new Error("BismoAudioPlayer is not subscribed or otherwise in this channel.");
    }


    /**
     * This method is intended to be use to set the current player and subscribe the voice connection to that player.
     * Removes the focus lock if that player ended up dying.
     * Finds the player (if not focus locked) that should be playing and makes sure that player is in fact playing.
     * 
     */
    #UpdateCurrentPlayer() {
        // Locked?
        if (this.Focus.IsLocked) {
            // Make sure the BAP is still active.. If not, bye-bye
            if (!this.Focus.CurrentPlayer.AudioPlayer.playable) { // update later
                this.Focus.IsLocked = false;
            } else {
                return true;
            }
        }

        // Work our way DOWN the queue 9->8->7->...->-1 until we to something playable
        // If no audioPlayers, leave V/C
        let oldPlayer = this.Focus.CurrentPlayer;
        let voiceConnection = this.GetVoiceConnection();
        let levels = [...this.Focus.Stack.keys()].sort((a,b) => b-a); // This is the focus levels going from highest to lowest (9->1)
        for (var level of levels) { // For each level (starting at the top)
            let players = this.Focus.Stack.get(level); // Get the players
            for (var playerIndex = players.length-1; playerIndex>=0; playerIndex--) { // Then go through the players (starting with the latest) until we get something playable.
                if (players[playerIndex].AudioPlayer) {
                    // We got a winner! Subscribe that sucker
                    voiceConnection.subscribe(players[playerIndex].AudioPlayer);
                    this.emit("focus", { // Emit our "hey, we just changed the player"
                        newPlayer: players[playerIndex],
                        oldPlayer: oldPlayer,
                        focusLevel: level,
                        isFocusLocked: false,
                    });
                }
            }
        }
    }

    /**
     * This method is intended to set the current player to the provided audio player. Automatically emits the focus updated event
     * @param {BismoAudioPlayer} [bismoAudioPlayer] - New current player. If undefined, then we have no player.
     * @param {boolean} [isFocusLocked] - Whether or not the player is going to be focus locked or not.
     */
    #SetCurrentPlayer(bismoAudioPlayer, isFocusLocked) {
        this.#CheckIsBismoAudioPlayerSubscribed(bismoAudioPlayer);

        let oldPlayer = this.Focus.CurrentPlayer;
        this.Focus.CurrentPlayer = bismoAudioPlayer;
        this.Focus.IsLocked = (isFocusLocked === true)? true : false

        this.emit("focus", {
            newPlayer: bismoAudioPlayer,
            oldPlayer: oldPlayer,
            focusLevel: bismoAudioPlayer.FocusLevel.get(this.Id),
            isFocusLocked: isFocusLocked,
        });
    }



    /**
     * Subscribes an audio player (`BismoAudioPlayer`) to this voice channel. Does not necessarily start outputting, depends on other subscribed players and the focus level.
     * @param {(BismoAudioPlayer|BismoAudioPlayer[])} bismoAudioPlayers Audio player(s) being subscribed to the channel(s)
     * @param {number} [focusLevel = 1] Which focus level to place the player(s) on
     */
    Subscribe(bismoAudioPlayers, focusLevel) {
        if (focusLevel === undefined || typeof focusLevel !== "number")
            focusLevel = 1;
        if (!Array.isArray(bismoAudioPlayers))
            bismoAudioPlayers = [bismoAudioPlayers];

        let subbedPlayers = [];
        for (var i = 0; i<bismoAudioPlayers.length; i++) {
            if (!(bismoAudioPlayers[i] instanceof BismoAudioPlayer))
                continue;

            // Make sure this is not already subscribed.
            let subscribed = this.#IsBismoAudioPlayerSubscribed(bismoAudioPlayers[i]);
            if (subscribed) {
                // hmm... okay? Move?
                this.SetFocusLevel(bismoAudioPlayers[i], focusLevel);
                return;
            }

            // Subscribe (add it in)
            let players = this.Focus.Stack.get(focusLevel);
            if (players === undefined)
                players = [bismoAudioPlayers[i]];
            else
                players.push(bismoAudioPlayers[i]);
            this.Focus.Stack.set(focusLevel, players);

            // Update player (literal, current)
            bismoAudioPlayers[i].FocusLevel.set(this.Id, focusLevel);
            bismoAudioPlayers[i].emit('subscribed', {
                voiceChannel: this,
                focusLevel: focusLevel,
            });
            subbedPlayers.push(bismoAudioPlayers[i]);

            this.#log.debug("BAP (" + bismoAudioPlayers[i].Id + ") subscribed! Name: \"" + bismoAudioPlayers[i].Name + "\" (plugin: \"" + bismoAudioPlayers[i].PluginName + "\")");
        }
        
        this.emit('subscribe', {
            bismoAudioPlayers: subbedPlayers,
            focusLevel: focusLevel,
        });
        this.#UpdateCurrentPlayer();
    }
    /**
     * Unsubscribes an audio player (`BismoAudioPlayer`) from this voice channel
     * @param {(BismoAudioPlayer|BismoAudioPlayer[])} bismoAudioPlayer Audio player(s) being unsubscribed from the channel
     */
    Unsubscribe(bismoAudioPlayers) {
        if (!Array.isArray(bismoAudioPlayers))
            bismoAudioPlayers = [bismoAudioPlayers];

        let unsubbedPlayers = [];
        for (var i = 0; i<bismoAudioPlayers.length; i++) {
            if (!(bismoAudioPlayers[i] instanceof BismoAudioPlayer))
                continue;

            // Make sure this is subscribed.
            let subscribed = this.#IsBismoAudioPlayerSubscribed(bismoAudioPlayers[i]);
            if (!subscribed) {
                // hmm... okay? Remove us from that player and exit
                bismoAudioPlayers[i].FocusLevel.delete(this.Id);
                continue;
            }

            // Remove
            let focusLevel = this.GetFocusLevel(bismoAudioPlayers[i]);
            let players = this.Focus.Stack.get(focusLevel);
            let index = -1;
            for (var i = 0; i<players.length; i++) {
                if (players[i].Id == bap.Id) {
                    index = i;
                    break;
                }
            }

            if (index !== -1) {
                players.splice(index, 1);
            }
            this.Focus.Stack.set(focusLevel, players);

            // Update player (literal, current)
            bismoAudioPlayers[i].FocusLevel.delete(this.Id);
            bismoAudioPlayers[i].emit("unsubscribed", {
                voiceChannel: this,
            });

            this.#log.debug("BAP unsubscribed: " + bismoAudioPlayers[i].Id);

            unsubbedPlayers.push(bismoAudioPlayer[i]);
        }

        this.emit('unsubscribe', {
            bismoAudioPlayers: unsubbedPlayers,
        });
        this.#UpdateCurrentPlayer(); // Do this after everything is subscribed.
    }



    /**
     * Attempts to join the voice channel and create a voice connection
     * @return {DiscordVoice.VoiceConnection}
     */
    Connect() {
        let attempt = this.GetVoiceConnection();
        if (attempt !== undefined) {
            // Check if it's destroyed
            if (attempt.state != DiscordVoice.VoiceConnectionStatus.Destroyed) {
                // we should be connected ..
                return attempt;
            } else if (attempt.state == DiscordVoice.VoiceConnectionStatus.Disconnected) {
                // attempt reconnect
                attempt.rejoin();
                this.emit("connect", { voiceConnection: attempt });
                return attempt;
            }
        }
        if (this.ChannelObject === undefined) {
            // can't do
            this.#log.warn("No ChannelObject");
            return undefined;
        }

        let connection = DiscordVoice.joinVoiceChannel({
            channelId: this.ChannelObject.id,
            guildId: this.ChannelObject.guildId,
            adapterCreator: this.ChannelObject.guild.voiceAdapterCreator,
            selfDeaf: this.options.selfDeaf,
            selfMute: this.options.selfMute,
        });

        // Listen for state changes, destroy on disconnect
        connection.on(DiscordVoice.VoiceConnectionStatus.Disconnected, async(oldState, newState) => {
            try {
                await Promise.race([
                    DiscordVoice.entersState(connection, DiscordVoice.VoiceConnectionStatus.Signalling, 5_000),
                    DiscordVoice.entersState(connection, DiscordVoice.VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Seems to be reconnecting to a new channel
            } catch (error) {
                // Seems to be a real disconnect which SHOULDN'T be recovered from
                connection.destroy();
                this.Disconnect();
            }
        });

        connection.on(DiscordVoice.VoiceConnectionStatus.Destroyed, () => {
            this.#log.warn("VoiceConnection destroyed");
        });
        
        this.#log.info("Connected! VC: " + this.ChannelObject.id);
        this.emit("connect", { voiceConnection: connection });
        return connection;
    }

    /**
     * Disconnects the VoiceConnection (leaves the voice channel), however, you can reconnect using `.Connect()`
     * @param {boolean} force - Not used currently
     */
    Disconnect(force) {
        let voiceConnection = this.GetVoiceConnection();
        if (voiceConnection !== undefined)
            if (voiceConnection.state != DiscordVoice.VoiceConnectionStatus.Destroyed)
                voiceConnection.destroy();
        this.#log.info("Disconnected");
        this.emit("disconnect", { force: force });
    }

    /**
     * Unsubscribes all BismoAudioPlayers, (destroys them if they have no other subscriptions), and destroys the voiceConnection.
     * This is intended to be used to, well, destroy the BVC. A new one must be created.
     */
    Destroy() {
        if (this.#Destroying == true)
            return;

        this.#Destroying = true;

        this.Disconnect(true);
        let allPlayers = this.GetBismoAudioPlayers(true);
        allPlayers.forEach((player) => {
            if (player.GetVoiceChannelIds().length == 1)
                player.Destroy();
            else
                this.Unsubscribe(player); //err ehh ignore it
        });
        this.ChannelObject = undefined;
        let voiceConnection = this.GetVoiceConnection();
        if (voiceConnection !== undefined)
            if (voiceConnection.state != DiscordVoice.VoiceConnectionStatus.Destroyed) {
                voiceConnection.setSpeaking(0);
                voiceConnection.dispatchAudio();
                voiceConnection.disconnect();
                voiceConnection.destroy();
            }
        this.#log.info("Destroyed");
        this.emit("destroy");
        delete this;
    }

    SetSpeaking(speaking) {
        this.GetVoiceConnection().setSpeaking(speaking);
    }

    /**
     * Gets the VoiceConnection for this VoiceChannel
     * @return {(DiscordVoice.VoiceConnection|undefined)}
     */
    GetVoiceConnection() {
        if (this.ChannelObject == undefined)
            return undefined
        return DiscordVoice.getVoiceConnection(this.ChannelObject.guildId);
    }

    /** @return {(DiscordVoice.VoiceReceiver|undefined)} */
    GetVoiceReceiver() {
        return GetVoiceConnection().receiver;
    }


    /**
     * Locks focus (output) to a specific BAP in one or more channels. The idea is you want a BAP to temporarily jump the focus stack and begin outputting. Kind of like maximizing a window.
     * DO NOT abuse this! BAP will stay "locked" until someone unlocks it.
     * @param {BismoAudioPlayer} bismoAudioPlayer Audio player to lock focus to
     * @parma {bool} active Whether to engage focus lock or not
     */
    SetFocusLock(bismoAudioPlayer, active) {
        if (active && this.Focus.IsLocked)
            throw new VoiceChannelFocusLocked("Cannot set focus lock as the focus is already locked to a player.");

        this.#SetCurrentPlayer(bismoAudioPlayer, active);
    }
    /**
     * Removes focus lock
     */
    RemoveFocusLock() {
        this.Focus.IsLocked = false;
        this.#UpdateCurrentPlayer();
    }
    /**
     * Gets the `BismoAudioPlayer` that is currently focus locked
     * @return {(undefined|BismoAudioPlayer)} Nothing if none locked or the BAP that is currently in focus.
     */
    GetFocusLock() {
        if (this.Focus.IsLocked)
            return this.Focus.CurrentPlayer;
    }


    /**
     * Returns the current BismoAudioPlayer. (Either the locked BAP or currently in focus player)
     * @return {BismoAudioPlayer}
     */
    GetCurrentPlayer() {
        return this.Focus.CurrentPlayer;
    }
    /**
     * Makes sure that the correct player is currently playing. Updates the current player to the appropriate one.
     */
    UpdateCurrentPlayer() {
        this.#UpdateCurrentPlayer();
    }


    /**
     * Returns the focus level for the current player
     * @return {number} Focus level this channel is on. -1 if locked.
     */
    GetCurrentFocusLevel() {
        if (this.Focus.IsLocked)
            return -1
        else
            return this.GetFocusLevel(this.Focus.CurrentPlayer);
    }

    /**
     * Gets the focus level of a player object
     * @param {BismoAudioPlayer} bap - Audio player to check
     * @return {number} Focus level this channel is on. -1 if locked.
     */
    GetFocusLevel(bap) {
        if (this.Focus.CurrentPlayer.Id == bap.Id && this.Focus.IsLocked)
            return -1;

        let keys = [...this.Focus.Stack.keys()];
        for (var i = 0; keys.length; i++) {
            let players = this.Focus.Stack.get(i);
            players.forEach((player) => {
                if (player.Id == bap.Id)
                    return i;
            });
        }

        throw new Error("BismoAudioPlayer is not subscribed or otherwise in this channel.");
    }
    /**
     * Sets the focus level of a player object
     * 
     * @param {BismoAudioPlayer} bap - Audio player to update
     * @param {number} newLevel - New focus level to set the player on
     */
    SetFocusLevel(bap, newLevel) {
        let currentFocusLevel = this.GetFocusLevel(bap);

        let players = this.Focus.Stack.get(currentFocusLevel);
        let index = -1;
        for (var i = 0; i<players.length; i++) {
            if (players[i].Id == bap.Id) {
                index = i;
                break;
            }
        }

        if (index !== -1) {
            players.splice(index, 1);
        } else {
            throw Error("Unable to change BismoAudioPlayer focus level!");
        }

        this.Focus.Stack.set(currentFocusLevel, players);
        let newLevelPlayers = this.Focus.Stack.get(newLevel);
        newLevelPlayers.push(bap);
        this.Focus.Stack.set(newLevel, newLevelPlayers);

        bap.FocusLevel.set(this.Id, newLevel);

        this.#UpdateCurrentPlayer();
    }

    

    /**
     * Gets all the BismoAudioPlayers currently in the focus stack
     * @param {boolean} [asArray=false] - If the players should be throw into a massive array, which will remove any focus level data. If a single level specified, this is always true.
     * @param {number} [level] - Specific focus level to get the players from. All level if undefined
     * @return {(Map<number, BismoAudioPlayer[]>|BismoAudioPlayer[])}
     */
    GetBismoAudioPlayers(asArray, level) {
        if (typeof level === "number")
            return this.Focus.Stack.get(level);

        if (asArray) {
            let players = []
            this.Focus.Stack.forEach((levelPlayers) => {
                players.concat(levelPlayers);
            });
            return players;
        }
        return this.Focus.Stack;
    }


    /**
     * Returns the number of listeners (users) in this voice channel.
     * @param {boolean} [includeBots=false] - Include bots in the count
     * @return {number}
     */
    GetNumberOfVoiceChannelMembers(includeBots) {
        if (this.ChannelObject === undefined)
            return 0;
        if (this.ChannelObject.type == "DM")
            return 1;
        if (this.ChannelObject.members?.cache === undefined)
            return 0;

        if (includeBots) {
            return this.ChannelObject.members.size;
        } else {
            let count = 0;
            this.ChannelObject.members.cache.forEach((member) => {
                if (member != undefined)
                    if (member.user != undefined)
                        count += (member.user.bot)? 0 : 1; // Adds 1 if not a bot, 0 if a bot
            });
            return count;
        }
    }

    /**
     * Checks whether a particular user is present inside a voice channel
     * @param {string} userId - User id to look for
     * @return {boolean} user present in voice channel
     */
    GetUserMemberOfVoiceChannel(userId) {
        if (typeof userId !== "string")
            return false;

        if (this.ChannelObject === undefined)
            return false;
        if (this.ChannelObject.type == "DM")
            return this.ChannelObject.recipient.id == userId;
        if (this.ChannelObject.members?.cache === undefined)
            return false;

        return this.ChannelObject.members.cache.has(userId);
    }
}


/**
 * VoiceManager class: manages currently playing/subscribed AudioPlayers to allow for predicable and manageable audio behavior
 * This manages the BismoVoiceChannels .. which sudo manage the BismoAudioPlayers
 */
class VoiceManager extends EventEmitter {
    // Bismo API
    /**
     * Bismo API
     * @type {import('./../bismo.js').Bismo}
     */
    Bismo;

    /**
     * Discord API
     * @type {Discord.Client}
     */
    #Client;


    /**
     * Voice channels, a map of voiceChannelIds to BismoVoiceChannels
     * @type {Map<number, BismoVoiceChannel>}
     */
    #VoiceChannels = new Map();

    

    /**
     * Creates a new Song object
     * 
     * @param {import('discord.js').Client} client Discord bot's client
     * @param {import('./../bismo.js').Bismo} bismo Bismo API
     * 
     */
    constructor(client, bismo) {
        super();

        this.#Client = client;
        this.Bismo = bismo;

        let actualThis = this;
        this.Bismo.Events.bot.on('shutdown', () => {
            actualThis.Shutdown();
        });

        this.#Client.on('voiceStateUpdate', (oldMember, newMember) => {
            if (oldMember != undefined && newMember != undefined) {
                if (newMember.id != actualThis.#Client.user.id)
                    return; // Not us
                if (oldMember.channelId == newMember.channelId)
                    return;

                if (oldMember?.channel == undefined || newMember?.channel == undefined)
                    return;

                if (actualThis.#VoiceChannels.has(oldMember.channelId)) {
                    let channelToUpdate = actualThis.#VoiceChannels.get(oldMember.channelId);
                    channelToUpdate.ChannelObject = newMember.channel;

                    actualThis.#VoiceChannels.set(newMember.channelId, channelToUpdate);
                    actualThis.#VoiceChannels.delete(oldMember.channelId);

                    channelToUpdate.emit('moved', oldMember.channel, newMember.channel);
                }
            }
        });
    }


    /**
     * Converts a single voiceChannelId to an array and provides type checking to make sure everything is valid.
     * @param {(string|string[])} voiceChannelId
     * @return {string[]} Valid voiceChannelId array
     */
    #voiceChannelIdArrayCheck(voiceChannelId) {
        if (!Array.isArray(voiceChannelId)) {
            voiceChannelId = [voiceChannelId];
        }
        if (!isArrayOfType(voiceChannelId, "string") && !isArrayOfType(voiceChannelId, VoiceChannel))
            throw new TypeError("voiceChannelId expected an array of strings.");
        
        return voiceChannelId;
    }




    // For creating new BAPs
    CreateBismoAudioPlayer(BAPProperties) {
        return new BismoAudioPlayer(this, crypto.randomUUID(), BAPProperties);
    }

    /**
     * Returns or creates a BismoVoiceChanel object given a VoiceChannel id or object
     * @param {(VoiceChannel|VoiceChannel[]|string|string[])} voiceChannelIds - Can be one VoiceChannel, an array of them, one string (of a voice channel id), or an array of voice channel ids.
     * @param {string[]} [guildIds] - Guild ids of the guilds the voice channels live in. ONLY necessary IF you provide a string or an array of strings the voiceChannelIds parameter. 
     * @return {(BismoVoiceChannel|Map<string, BismoVoiceChannel>)} either a single BismoVoiceChannel or a map where the voice channel id points to the BismoVoiceChannel
     */
    GetBismoVoiceChannel(voiceChannelIds, guildIds) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);
        if (!isArrayOfType(voiceChannelIds, VoiceChannel))
            guildIds = this.#voiceChannelIdArrayCheck(guildIds);

        let results = new Map();

        if (!isArrayOfType(voiceChannelIds, VoiceChannel))
            if (voiceChannelIds.length !== guildIds.length)
                throw new Error("voiceChannelId and guidId must be the same length. #voiceChannels: " + voiceChannelIds.length + " and #guildIds: " + guildIds.length);

        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject;
            let vcid = voiceChannelIds;
            let gid = 0;
            if (voiceChannelIds[i] instanceof VoiceChannel) {
                vcid = voiceChannelIds[i].id;
                gid = voiceChannelIds[i].guildId;
            }
            else
                gid = guildIds[i];

            if (!this.#VoiceChannels.has(vcid)) {
                // Create it
                voiceChannelObject = new BismoVoiceChannel(this, vcid, gid);
                this.#VoiceChannels.set(vcid, voiceChannelObject);

                voiceChannelObject.on('destroy', (destroyObject) => {
                    this.#VoiceChannels.delete(vcid); // Delete on destroy
                });
            }
            if (voiceChannelIds.length == 1)
                return this.#VoiceChannels.get(vcid);
            else
                result.set(vcid, this.#VoiceChannels.get(vcid))
        }

        return results;
    }



    // Voice channel things

    /**
     * Subscribes an audio player (`BismoAudioPlayer`) to one or more voice channels. Does not necessarily start outputting, depends on other subscribed players and the focus level.
     * @param {(BismoAudioPlayer|BismoAudioPlayer[])} bismoAudioPlayer Audio player(s) being subscribed to the channel(s)
     * @param {(string|string[])} voiceChannelIds Voice channel id(s) you'll like to connect (pipe) the audio player to
     * @param {number} [focusLevel = 1] Which focus level to place the player on
     */
    Subscribe(bismoAudioPlayer, voiceChannelIds, focusLevel) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        for (var voiceChannel of voiceChannelIds) {
            this.#VoiceChannels.get(voiceChannel).Subscribe(bismoAudioPlayer, focusLevel);
        }
    }
    /**
     * Unsubscribes an audio player (`BismoAudioPlayer`) from one or more voice channels.
     * @param {(BismoAudioPlayer|BismoAudioPlayer[])} bismoAudioPlayer Audio player(s) being unsubscribed from the channel
     * @param {(string|string[])} voiceChannelId Voice channel id(s) you'll like to unsubscribe (disconnect) the audio player from
     */
    Unsubscribe(bismoAudioPlayer, voiceChannelIds) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        for (var voiceChannel of voiceChannelIds) {
            this.#VoiceChannels.get(voiceChannel).Unsubscribe(bismoAudioPlayer);
        }
    }


    /**
     * Connects the bot to one or more voice channels. Does not play audio, does not subscribe any BAPs, just connects. Called on first subscription if no existing connection to the vc.
     * @param {(string|string[])} voiceChannelId Voice channel id(s) to connect the bot to
     * @param {(string|string[])} guildIds The guildId(s) of the provided voice channels
     * @return {(bool|Map<string,bool>)} Whether we successfully connected to a channel or not. Map is the channel id and whether connection was successful (if multiple vcIds provided).
     */
    Connect(voiceChannelIds, guildIds) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);
        guildIds = this.#voiceChannelIdArrayCheck(guildIds);

        if (voiceChannelIds.length !== guildIds.length)
            throw new Error("voiceChannelId and guidId must be the same length. #voiceChannels: " + voiceChannelIds.length + " and #guildIds: " + guildIds.length);


        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject;
            if (!this.#VoiceChannels.has(voiceChannelIds[i]) === undefined) {
                // Create it
                voiceChannelObject = new BismoVoiceChannel(this, voiceChannelIds[i], guilds[i]);
                this.#VoiceChannels.set(voiceChannelIds[i], voiceChannelObj);

                voiceChannelObject.on('destroy', (destroyObject) => {
                    this.#VoiceChannels.delete(voiceChannelIds[i]); // Delete on destroy
                });
            } else
                this.#VoiceChannels.get(voiceChannelIds[i]);
            voiceChannelObject.Connect();
        }
    }

    /**
     * Disconnects from specified voice channel(s) by unsubscribing all BAPs (if `force != true`) and leaving the voice channel.
     * @param {(string|string[])} voiceChannelIds Voice channel id(s) you'll be disconnecting from
     * @param {bool} force Whether to nicely unsubscribed any BAPs or to just destroy them. (force = destroy, not unsubscribe). BAPs are destroyed eventually regardless.
     * @return {(bool|Map<string,bool>)} Whether we successfully disconnected from a channel or not. Map is the channel id and whether disconnect was successful (if multiple vcIds provided).
     */
    Disconnect(voiceChannelIds, force) {
        if (voiceChannelIds == undefined)
            voiceChannelIds = Array.from(this.#VoiceChannels.values());

        // unsubscribe all BAPs, if fail and not force: cancel
        // force does not run Unsubscribe, calls Destroy() for all BAPs and leaves the VC
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject = this.#VoiceChannels.get(voiceChannelIds[i]);
            if (voiceChannelObject !== undefined) {
                voiceChannelObject.Disconnect(force);
            }
        }
    }



    /**
     * Locks focus (output) to a specific BAP in one or more channels. The idea is you want a BAP to temporarily jump the focus stack and begin outputting. Kind of like maximizing a window.
     * DO NOT abuse this! BAP will stay "locked" until someone unlocks it.
     * @param {BismoAudioPlayer} bismoAudioPlayer Audio player to lock focus to
     * @param {string|string[]} voiceChannelIds Voice channel(s) to set the BAP to focus lock (if undefined, all subscribed channels)
     * @parma {bool} active Whether to engage focus lock or not
     * @return {(bool|Map<string,bool)} Whether focus lock has been applied to one channel, or a list of channels and whether focus lock has been applied.
     */
    SetFocusLock(bismoAudioPlayer, voiceChannelIds, active) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject = this.#VoiceChannels.get(voiceChannelIds[i]);
            if (voiceChannelObject !== undefined) {
                voiceChannelObject.SetFocusLock(bismoAudioPlayer, active);
            }
        }
    }
    /**
     * Removes focus lock from one or more channels or from one or more BAPs. Calls `SetFocusLock(bap, vcId, false)`.
     * @param {(BismoAudioPlayer|BismoAudioPlayer[]|string|string[])} playerOrVoiceChannelId BAP(s) or voice channel(s) to unlock focus on
     * @return {(bool|Map<sting,bool>)}
     * 
     */
    RemoveFocusLock(playerOrVoiceChannelId) {
        if (!Array.isArray(playerOrVoiceChannelId))
            playerOrVoiceChannelId = [playerOrVoiceChannelId];

        for (var i = 0; i<playerOrVoiceChannelId.length; i++) {
            if (typeof playerOrVoiceChannelId[i] === "string") {
                let voiceChannelObject = this.#VoiceChannels.get(playerOrVoiceChannelId[i]);
                if (voiceChannelObject !== undefined) {
                    voiceChannelObject.RemoveFocusLock();
                }
            } else {
                // Hope this is a BAP.
                playerOrVoiceChannelId[i].GetVoiceChannelIds().forEach((voiceChannelId) => {
                    let voiceChannelObject = this.#VoiceChannels.get(voiceChannelId);
                    if (voiceChannelObject !== undefined) {
                        voiceChannelObject.RemoveFocusLock();
                    }
                });
            }
        }
    }
    /**
     * Checks to see which BAP is currently locked for one or more voice channels
     * 
     * If you provide a voice channel (string), only the `BismoAudioPlayer` that is currently locked will be returned.
     * 
     * If you provide multiple voice channels (string[]), we return the BAP currently locked for each channel.
     * 
     * If you provide a BAP, we check all subscribed voice channels to see if it is locked or not.
     * 
     * If you provide multiple BAPs, we run this method for each BAP and throw the results in to a map, with the BAP: GetFocusLock(BAP).
     * @param {(string|string[]|BismoAudioPlayer|BismoAudioPlayer[])}
     * @return {(undefined|Map<string,(BismoAudioPlayer|Map<string, boolean>)>)} Nothing if none locked or the key will be the BAP id or VoiceChannel id with the BAP as the locked value.
     */
    GetFocusLock(playerOrVoiceChannelId) {
        if (!Array.isArray(playerOrVoiceChannelId))
            playerOrVoiceChannelId = [playerOrVoiceChannelId];

        let results = new Map();

        for (var i = 0; i<playerOrVoiceChannelId.length; i++) {
            if (typeof playerOrVoiceChannelId[i] === "string") {
                let voiceChannelObject = this.#VoiceChannels.get(playerOrVoiceChannelId[i]);
                if (voiceChannelObject !== undefined) {
                    results.set(playerOrVoiceChannelId[i], voiceChannelObject.GetFocusLock());
                }
            } else {
                // Hope this is a BAP.
                let bapResults = new Map();
                playerOrVoiceChannelId[i].GetVoiceChannelIds().forEach((voiceChannelId) => {
                    let voiceChannelObject = this.#VoiceChannels.get(playerOrVoiceChannelId[i]);
                    if (voiceChannelObject !== undefined) {
                        bapResults.set(voiceChannelObject.Id, voiceChannelObject.GetFocusLock().Id == playerOrVoiceChannelId[i].Id);
                    }
                });
                results.set(playerOrVoiceChannelId[i].Id, bapResults);
            }
        }
    }

    // Support methods
    /**
     * Returns the focused BAP in a voice channel. (Either the locked BAP or currently in focus player)
     * @return {(BismoAudioPlayer|Map<string,BismoAudioPlayer>)}
     */
    GetCurrentPlayer(voiceChannelIds) {
        // returns the focused BAP for a VC
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        let results = new Map();
        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject = this.#VoiceChannels.get(voiceChannelIds[i]);
            if (voiceChannelObject !== undefined) {
                if  (voiceChannelIds.length == 1)
                    return voiceChannelObject.GetCurrentPlayer();
                else
                    results.set(voiceChannelIds[i], voiceChannelObject.GetCurrentPlayer());
            }
        }
        return results;
    }
    GetCurrentFocusLevel(voiceChannelIds) {
        // focus level of the focused BAP for a VC
        // returns the focused BAP for a VC
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        let results = new Map();
        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject = this.#VoiceChannels.get(voiceChannelIds[i]);
            if (voiceChannelObject !== undefined) {
                if  (voiceChannelIds.length == 1)
                    return voiceChannelObject.GetCurrentFocusLevel();
                else
                    results.set(voiceChannelIds[i], voiceChannelObject.GetCurrentFocusLevel());
            }
        }
        return results;
    }
    /**
     * Checks whether or not a BAP is currently active
     * @param {BismoAudioPlayer} bismoAudioPlayer Player to check active status
     * @param {string|string[]} voiceChannelId Check in this specific channel or channels
     * @return {(bool|Map<string, bool>)} Whether the BAP is active, or a map of channel ids and whether or not it is active.
     */
    IsActive(bismoAudioPlayer, voiceChannelIds) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        let results = new Map();
        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject = this.#VoiceChannels.get(voiceChannelIds[i]);
            if (voiceChannelObject !== undefined) {
                if  (voiceChannelIds.length == 1)
                    return voiceChannelObject.GetCurrentPlayer().Id == bismoAudioPlayer.Id;
                else
                    results.set(voiceChannelIds[i], voiceChannelObject.GetCurrentPlayer() == bismoAudioPlayer.Id);
            }
        }
        return resutls;
    }
    /**
     * Returns a list of BismoAudioPlayers subscribed in a voice channel, or if no id specified all BAPs
     * 
     * @param {(string|string[])} voiceChannelId Which channel these BAPs are in
     * @return {BismoAudioPlayer[]} BAPs subscribed to one or more voice channels, or all known 
     */
    GetBismoAudioPlayers(voiceChannelIds) {
        let players = new Map();
        if (voiceChannelIds == undefined)
            this.#VoiceChannels.forEach((voiceChannel) => {
                voiceChannel.GetBismoAudioPlayers().forEach((BAP) => {
                    if (!players.has(BAP.Id))
                        players.set(BAP.Id, BAP);
                });
            });
        else {
            if (!Array.isArray(voiceChannelIds))
                voiceChannelIds = [voiceChannelIds];
            if (!isArrayOfType(voiceChannelIds, "string"))
                throw new TypeError("voiceChannelIds expected array of strings.");

            voiceChannelIds.forEach((vId) => {
                if (this.#VoiceChannels.has(vId)) {
                    this.#VoiceChannels.get(vId).GetBismoAudioPlayers().forEach((BAP) => {
                        if (!players.has(BAP.Id))
                            players.set(BAP.Id, BAP);
                    });
                }
            });

        }

        return [...players.values()];

        // return the BAPs for (a) particular voiceChannelId(s)
        // if none specified, return all.
    }

    /**
     * Get the up-to-date focus level for a BAP given the specified voice channel id(s)
     * 
     * @param {BismoAudioPlayer} bismoAudioPlayer - BAP to check focus level of
     * @param {(string|string[])} voiceChannelIds - Voice channels to check in
     * @return {(number|Map<string,number>)} Focus level of one BAP in one channel, focus level of one BAP in multiple channels, or focus level of multiple BAPs in multiple channels 
     */
    GetFocusLevel(bismoAudioPlayer, voiceChannelIds) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        let results = new Map();
        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject = this.#VoiceChannels.get(voiceChannelIds[i]);
            if (voiceChannelObject !== undefined) {
                if  (voiceChannelIds.length == 1)
                    return voiceChannelObject.GetFocusLevel(bismoAudioPlayer);
                else
                    results.set(voiceChannelIds[i], voiceChannelObject.GetFocusLevel(bismoAudioPlayer));
            }
        }
        return results;
    }
    /**
     * Allows you to change the focus level of one or more BAPs in one or more voice channels
     * @param {BismoAudioPlayer|BismoAudioPlayer[]} bismoAudioPlayer BAP to change focus level for
     * @param {(string|string[])} voiceChannelIds - Voice channels to check in
     * @param {number} focusLevel - Focus level to set the player to.
     */
    SetFocusLevel(bismoAudioPlayer, voiceChannelIds) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject = this.#VoiceChannels.get(voiceChannelIds[i]);
            if (voiceChannelObject !== undefined) {
                voiceChannelObject.SetFocusLevel(bismoAudioPlayer, focusLevel);
            }
        }
    }
    /**
     * Returns an array of BAPs for a given focus level, or a map of focus level and BismoAudioPlayer[]
     * @param {(string|string[])} voiceChannelId Voice channel(s) to check
     * @param {number} focusLevel Focus level to check
     * @return {(BismoAudioPlayer[]|Map<string,BismoAudioPlayer[])} Either an array of BAPs for that focus level in one channel, or a map of vcId to BAP array for that specified focus level. 
     */
    GetBismoAudioPlayersOnFocusLevel(voiceChannelIds, focusLevel) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        let results = new Map();
        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject = this.#VoiceChannels.get(voiceChannelIds[i]);
            if (voiceChannelObject !== undefined) {
                if  (voiceChannelIds.length == 1)
                    return voiceChannelObject.GetBismoAudioPlayers(true, focusLevel);
                else
                    results.set(voiceChannelIds[i], voiceChannelObject.GetBismoAudioPlayers(true, focusLevel));
            }
        }
        return results;
    }

    /**
     * Locks focus to a BAP in one or more specified voice channels
     * @param {BismoAudioPlayer} bismoAudioPlayer The player to lock
     * @param {(string|string[])} voiceChannelId Voice channel(s) to lock in
     */
    LockFocus(bismoAudioPlayer, voiceChannelIds) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject = this.#VoiceChannels.get(voiceChannelIds[i]);
            if (voiceChannelObject !== undefined) {
                voiceChannelObject.SetFocusLock(bismoAudioPlayer, true);
            }
        }
    }

    /**
     * Unlocks focus to a BAP in one or more specified voice channels. No BAP is required, there's only one that can be locked.
     * @param {(string|string[])} voiceChannelId Voice channel(s) to lock in
     * @return {(bool|Map<string,bool>)} Whether successful or not
     */
    UnlockFocus(voiceChannelIds) {
        voiceChannelIds = this.#voiceChannelIdArrayCheck(voiceChannelIds);

        for (var i = 0; i<voiceChannelIds.length; i++) {
            let voiceChannelObject = this.#VoiceChannels.get(voiceChannelIds[i]);
            if (voiceChannelObject !== undefined) {
                voiceChannelObject.RemoveFocusLock();
            }
        }
    }


    /**
     * Unsubscribes all BismoAudioPlayers (if force not true), destroys all BAPs, and disconnects all active voice channels. (...cleans up the voice manager, makes like new)
     * @param {bool} force If true skips the unsubscribe part, just calls `Destroy()` on all BAPs. (Tries to not wait around and disconnects)
     */
    CleanUp(force) {
        // disconnect all active voice channels, remove all BAPs (via Destroy() calls)
        // force = no unsubscribe, !force = unsubscribe each BAP
        this.#VoiceChannels.forEach((voiceChannel) => {
            voiceChannel.Disconnect(force);
        });
        this.emit('cleanup', force)
    }
    /**
     * Destroys all BismoVoiceChannels we know of.
     */
    Shutdown() {
        // calls CleanUp, used during Bismo shutdown
        this.#VoiceChannels.forEach((voiceChannel) => {
            voiceChannel.Destroy();
        });
        this.emit('shutdown');
    }



    // /**
    //  * **Unfinished, do not use**. Returns array of `Discord.AudioReceivers` of specified userIds, or (if none specified) all connected, in a voice channel.
    //  * @param {string} Voice channel to get AudioReceivers from. Cannot be an array, must be one channel id.
    //  * @return {Map<string,DiscordVoice.AudioReceivers>} userId: AudioReceivers
    //  */
    // Receive(voiceChannelId, userID) {
    //     // Return array of AudioReceivers of specified userIds (or all connected) in a voice channel.
    // }

}


class VoiceChannelFocusLocked extends Error {
    constructor(msg) {
        super(msg);
        this.name = "VoiceChannelFocusLocked";
        Error.captureStackTrace(this, this.constructor);
    }
}


module.exports = {
    VoiceManager: VoiceManager,
    BismoVoiceChannel: BismoVoiceChannel,
    BismoAudioPlayer: BismoAudioPlayer,
}