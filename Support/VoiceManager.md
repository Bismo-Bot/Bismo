## Audio
Playing audio into voice channels on Discord can be complicated.  Luckily Discord.JS has made it easy via Discord.JS/Voice, however, only one audio source can be played at once so we need some way to manage all of these plugins and audio focus.

yada-yada, work in progress.
Essentially allow plugins to request the voiceconnection all willynilly, but, scrub the subscribe function from that instance if possible, or redirect the function to Bismo.FocusAudio(voiceConnection)

BismoAudioPlayer: very little logic is contained inside, we simply redirect to VoiceManager methods providing our self as the BAP.
BismoVoiceChannel: contains most of the logic for VoiceManager. Handles subscriptions (subscribe, unsubscribe), voice channel connection and disconnection, DiscordVoice.VoiceConnection, DiscordVoice.VoiceReceiver, focus lock (set, get, remove), focus levels, and the currently playing BAP
VoiceManager: manages the BismoVoiceChannels, redirects calls to the BVCs and possibly BAPs. Used to get/create BismoVoiceChannels or just create BismoAudioPlayers.


### Focus levels:
Each `BismoVoiceChannel` contains a focus "stack". This stack is a mapping pointing the focus level to the array of `BismoAudioPlayer`'s on that focus level.

_What is Focus Level?_\
Focus level can be seen as the priority of a set of BAPs. The higher the focus level, the higher priority those players have. So a BAP on level 3 will be played (used) before a BAP on level 1 will be.\
Each focus level holds an array of BAPs, with the last one being added getting the highest priority within the focus level.


Here's an example look at the "stack"
`{
	7: [],
	5: [BAP1, BAP4],
	2: [BAP5],
	1: [BAP2]
}`
This stack shows us that BAP 1 and 4 are in the 5th focus level. Since the 5th focus level is the highest level with ACTIVE BAPs (that is their AudioPlayer's are available) we'll set this as our current focus level.\
Within this level we see BAP 4 is the last one to be added (that is has the highest index in this level). If BAP 4 is ACTIVE then we'll set that as the current player and subscribe the VoiceConnection of this channel to that BAP's AudioPlayer.


---


### BismoAudioPlayer:
#### Events:
unsubscribe: BAP is unsubscribed from a BismoVoiceChannel. We provide the BVC.
Emit call is inside the BVC.
`{
	voiceChannel: BismoVoiceChannel,
}`


subscribe: BAP is subscribed into a BVC. Not necessarily playing, however.
Emit call is inside the BVC.
`{ 
	voiceChannel: BismoVoiceChannel,
	focusLevel: number,
}`


unfocused: BAP is no longer in focus (current player) for a particular BVC.
Emit call is inside the BVC.
`{
	voiceChannel: BismoVoiceChannel,
	isFocusLocked: number,
}`


focused: BAP is now the current player for a BVC.
Emit call is inside the BVC.
`{
	voiceChannel: BismoVoiceChannel,
}` 


---


### BismoVoiceChannel:
This object is intended to manage the voice channel itself. Connection, disconnecting, adding and removing BismoAudioPlayers, changing the focus, etc.


#### Events:
connect: BVC has created the VoiceConnection for a VoiceChannel
`{
	voiceConnection: DiscordVoice.VoiceConnection,
}`


disconnect: BVC disconnected from the VoiceChannel (VoiceConnection disconnected). Call Connect() to rejoin
`{
	force: boolean,
}`


destroy: BVC has been destroyed. All BAPs have been unsubscribed, or, if they're only subscribed to this BVC, destroyed. No event args


focus: the current player has changed
`{
	newPlayer: BismoAudioPlayer,
	oldPlayer: BismoAudioPlayer,
	focusLevel: number,
	isFocusLocked: boolean,
}`


subscribe: BAP(s) has been subscribed
`{
	bismoAudioPlayers: BismoAudioPlayer[],
	focusLevel: focusLevel
}`


unsubscribe: BAP(s) has been unsubscribed
`{
	bismoAudioPlayers: BismoAudioPlayer[],
}`


#### Properties
`#log`: LogMan logger, used to log data and messages to console + terminal
`#VoiceManager`: Parent VoiceManager class that created this VoiceManager. You _could_ have multiple VoiceManagers going, although this would be inadvisable since they'll fight for control and it defeats the central control idea.
	Type: `VoiceManager`

`Id`: Id of the VoiceChannel we are representing (VoiceChannel.id)
	Type: `string` (really a number but represented in a string)

`ChannelObject`: VoiceChannel object we are representing
	Type: `Discord.VoiceChannel`

`Focus`: Focus container, holds the `Stack: Map<number, BismoAudioPlayer[]>`, `IsLocked: boolean` and `CurrentPlayer: BismoAudioPlayer`.
	`Stack`: The Stack is a map with the focus level (0->9) being the key and the value being the BismoAudioPlayer(s) on that specific focus level. We use a FIFO style, so the latest BAP to be added is playing (if that focus level is active).


#### Methods
_Private:_
```javascript
/**
 * Returns whether a BismoAudioPlayer is subscribed to this BismoVoiceChannel (it is inside the Focus Stack)
 * @param {BismoAudioPlayer} bismoAudioPlayer
 * @return {boolean} bismoAudioPlayer present in Focus Stack
 */
#IsBismoAudioPlayerSubscribed(bismoAudioPlayer)
/**
 * Throws an error if a BismoAudioPlayer is not subscribed to this BismoVoiceChannel
 * @param {BismoAudioPlayer} bismoAudioPlayer
 * @throws {Error} - Player not found in focus stack
 */
#CheckIsBismoAudioPlayerSubscribed(bismoAudioPlayer)

/**
 * This method is intended to be use to set the current player and subscribe the voice connection to that player.
 * Removes the focus lock if that player ended up dying.
 * Finds the player (if not focus locked) that should be playing and makes sure that player is in fact playing.
 * 
 */
#UpdateCurrentPlayer() {
}

/**
 * This method is intended to set the current player to the provided audio player. Automatically emits the focus updated event
 * @param {BismoAudioPlayer} [bismoAudioPlayer] - New current player. If undefined, then we have no player.
 * @param {boolean} [isFocusLocked] - Whether or not the player is going to be focus locked or not.
 */
#SetCurrentPlayer(bismoAudioPlayer, isFocusLocked) {
}
```



_Public:_
```javascript
/**
 * @param {VoiceManager} voiceManager - Parent VoiceManager class
 * @param {(Discord.VoiceChannel|string)} voiceChannelId - It would be smart to just pass the voice channel object. If you do not we'll have to search for it (slow)
 * @param {string} [guildId=undefined] - Guild id containing this voice channel
 * @param {VoiceManagerOptions} options - Various options, such as selfDeaf and selfMute which are passed when creating the VoiceConnection
 */
constructor(voiceManager, voiceChannelId, guildId, options)
```
You should not create the VoiceChannel yourself! Use `VoiceManager.GetBismoVoiceChannel(voiceChannelId)` to retrieve/create the BVC. 



Subscribe:
```javascript
/**
 * Subscribes an audio player (`BismoAudioPlayer`) to this voice channel. Does not necessarily start outputting, depends on other subscribed players and the focus level.
 * @param {(BismoAudioPlayer|BismoAudioPlayer[])} bismoAudioPlayers Audio player(s) being subscribed to the channel(s)
 * @param {number} [focusLevel = 1] Which focus level to place the player(s) on
 */
Subscribe(bismoAudioPlayers, focusLevel) {
}
```
This is used to add one or more `BismoAudioPlayer`'s to the focus stack (subscribe).

Unsubscribe:
```javascript
/**
 * Unsubscribes an audio player (`BismoAudioPlayer`) from this voice channel
 * @param {(BismoAudioPlayer|BismoAudioPlayer[])} bismoAudioPlayer Audio player(s) being unsubscribed from the channel
 */
Unsubscribe(bismoAudioPlayers) {
}
```
Used to remove one or more `BismoAudioPlayer`'s from the focus stack (unsubscribe).


```javascript
/**
 * Attempts to join the voice channel and create a voice connection
 * @return {DiscordVoice.VoiceConnection}
 */
Connect() {
}

/**
 * Disconnects the VoiceConnection (leaves the voice channel), however, you can reconnect using `.Connect()`
 * @param {boolean} force - Not used currently
 */
Disconnect(force) {
}

/**
 * Unsubscribes all BismoAudioPlayers, (destroys them if they have no other subscriptions), and destroys the voiceConnection.
 * This is intended to be used to, well, destroy the BVC. A new one must be created.
 */
Destroy() {
}
```

VoiceConnection related:
```javascript
SetSpeaking(speaking) {
    this.GetVoiceConnection().setSpeaking(speaking);
}

/**
 * Gets the VoiceConnection for this VoiceChannel
 * @return {(DiscordVoice.VoiceConnection|undefined)}
 */
GetVoiceConnection() {
    return DiscordVoice.getVoiceConnection(this.ChannelObject.guildId);
}

/** @return {(DiscordVoice.VoiceReceiver|undefined)} */
GetVoiceReceiver() {
    return GetVoiceConnection().receiver;
}
```

```javascript
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

}

/**
 * Gets the focus level of a player object
 * @param {BismoAudioPlayer} bap - Audio player to check
 * @return {number} Focus level this channel is on. -1 if locked.
 */
GetFocusLevel(bap) {

}
/**
 * Sets the focus level of a player object
 * 
 * @param {BismoAudioPlayer} bap - Audio player to update
 * @param {number} newLevel - New focus level to set the player on
 */
SetFocusLevel(bap, newLevel) {

}



/**
 * Gets all the BismoAudioPlayers currently in the focus stack
 * @param {boolean} [asArray=false] - If the players should be throw into a massive array, which will remove any focus level data. If a single level specified, this is always true.
 * @param {number} [level] - Specific focus level to get the players from. All level if undefined
 * @return {(Map<number, BismoAudioPlayer[]>|BismoAudioPlayer[])}
 */
GetBismoAudioPlayers(asArray, level) {

}
```


---


### VoiceManager:
#### Events:
`cleanup`: emitted when `CleanUp(force)` is called, we provide the force parameter
`shutdown`: emitted when `Shutdown()` is called, no additional parameters provided



#### Properties:
`Bismo`: Bismo (technically this is redundant, in Bismo you can access the APIs via `process.Bismo`). Eventually, however, `process.Bismo` will be removed.
`Client`: Discord client
`#VoiceChannels`: `Map<number (voice channel id), BismoVoiceChannel>` a collection of BismoVoiceChannels



#### Methods:
```javascript
	/**
     * Subscribes an audio player (`BismoAudioPlayer`) to one or more voice channels. Does not necessarily start outputting, depends on other subscribed players and the focus level.
     * @param {(BismoAudioPlayer|BismoAudioPlayer[])} bismoAudioPlayer Audio player(s) being subscribed to the channel(s)
     * @param {(string|string[])} voiceChannelId Voice channel id(s) you'll like to connect (pipe) the audio player to
     * @param {number} [focusLevel = 1] Which focus level to place the player on
     * @return {(bool|Map<string,bool)} Whether successfully added to one channel, or a map of the voice channel and whether successfully subscribed to that channel `{"vcId": true, "vcId2": false}`
     */
    Subscribe(bismoAudioPlayer, voiceChannelId, focusLevel) {

    }
    /**
     * Unsubscribes an audio player (`BismoAudioPlayer`) from one or more voice channels.
     * @param {(BismoAudioPlayer|BismoAudioPlayer[])} bismoAudioPlayer Audio player(s) being unsubscribed from the channel
     * @param {(string|string[])} voiceChannelId Voice channel id(s) you'll like to unsubscribe (disconnect) the audio player from
     * @return {(bool|Map<string,bool)} Whether successfully remove to one channel, or a map of the voice channel and whether successfully unsubscribed to that channel `{"vcId": true, "vcId2": false}`
     */
    Unsubscribe(bismoAudioPlayer, voiceChannelId) {

    }


    /**
     * Disconnects from specified voice channel(s) by unsubscribing all BAPs (if `force != true`) and leaving the voice channel.
     * @param {(string|string[])} voiceChannelId Voice channel id(s) you'll be disconnecting from
     * @param {bool} force Whether to nicely unsubscribed any BAPs or to just destroy them. (force = destroy, not unsubscribe). BAPs are destroyed eventually regardless.
     * @return {(bool|Map<string,bool>)} Whether we successfully disconnected from a channel or not. Map is the channel id and whether disconnect was successful (if multiple vcIds provided).
     */
    Disconnect(voiceChannelId, force) {
        // unsubscribe all BAPs, if fail and not force: cancel
        // force does not run Unsubscribe, calls Destroy() for all BAPs and leaves the VC
    }
    /**
     * Connects the bot to one or more voice channels. Does not play audio, does not subscribe any BAPs, just connects. Called on first subscription if no existing connection to the vc.
     * @param {(string|string[])} voiceChannelId Voice channel id(s) to connect the bot to
     * @return {(bool|Map<string,bool>)} Whether we successfully connected to a channel or not. Map is the channel id and whether connection was successful (if multiple vcIds provided).
     */
    Connect(voiceChannelId) {
        // connect the bot to a voice channel, (no players active)
    }


    /**
     * Locks focus (output) to a specific BAP in one or more channels. The idea is you want a BAP to temporarily jump the focus stack and begin outputting. Kind of like maximizing a window.
     * DO NOT abuse this! BAP will stay "locked" until someone unlocks it.
     * @param {BismoAudioPlayer} bismoAudioPlayer Audio player to lock focus to
     * @param {string|string[]} voiceChannelId Voice channel(s) to set the BAP to focus lock (if undefined, all subscribed channels)
     * @parma {bool} active Whether to engage focus lock or not
     * @return {(bool|Map<string,bool)} Whether focus lock has been applied to one channel, or a list of channels and whether focus lock has been applied.
     */
    SetFocusLock(bismoAudioPlayer, voiceChannelId, active) {

    }
    /**
     * Removes focus lock from one or more channels or from one or more BAPs. Calls `SetFocusLock(bap, vcId, false)`.
     * @param {(BismoAudioPlayer|BismoAudioPlayer[]|string|string[])} playerOrVoiceChannelId BAP(s) or voice channel(s) to unlock focus on
     * @return {(bool|Map<sting,bool>)}
     * 
     */
    RemoveFocusLock(playerOrVoiceChannelId) {
        // Just calls SetFocusLock(x, false, x);
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
     * @return {(undefined|BismoAudioPlayer|Map<string,true>|Map<string,BismoAudioPlayer>|Map<BismoAudioPlayer,Map<string,true>>)} Nothing if none locked, BAP locked in a specified voice channel, map of voice channels and the locked BAPs, or a map of subscribed voice channels and whether the BAP is locked there
     */
    GetFocusLock(playerOrVoiceChannelId) {

    }

    // Support methods
    /**
     * Returns the focused BAP in a voice channel. (Either the locked BAP or currently in focus player)
     * @return {(BismoAudioPlayer|Map<string,BismoAudioPlayer>)}
     */
    GetActivePlayer(voiceChannelId) {
        // returns the focused BAP for a VC
    }
    GetActiveFocusLevel(voiceChannelId) {
        // focus level of the focused BAP for a VC
    }
    /**
     * Checks whether or not a BAP is currently active
     * @param {BismoAudioPlayer} bismoAudioPlayer Player to check active status
     * @param {string|string[]} voiceChannelId Check in this specific channel or channels
     * @return {(bool|Map<string, bool>)} Whether the BAP is active, or a map of channel ids and whether or not it is active.
     */
    IsActive(bismoAudioPlayer, voiceChannelId) {

    }
    /**
     * Returns a list of BismoAudioPlayers subscribed in a voice channel, or if no id specified all BAPs
     * 
     * @param {(string|string[])} voiceChannelId Which channel these BAPs are in
     * @return {BismoAudioPlayer[]} BAPs subscribed to one or more voice channels, or all known 
     */
    GetBismoAudioPlayers(voiceChannelId) {
        if (voiceChannelId == undefined)
            return this.#BismoAudioPlayers;

        // return the BAPs for (a) particular voiceChannelId(s)
        // if none specified, return all.
    }

    /**
     * Get the up-to-date focus level for a BAP given the specified voice channel id(s)
     * 
     * @param {BismoAudioPlayer} BAP to check focus level of
     * @param {(string|string[])} Voice channels to check in
     * @return {(number|Map<string,number>|Map<BismoAudioPlayer,Map<string,number>>)} Focus level of one BAP in one channel, focus level of one BAP in multiple channels, or focus level of multiple BAPs in multiple channels 
     */
    GetFocusLevel(bismoAudioPlayer, voiceChannelId) {
        // Returns the up-to-date focus level for a BAP given specified voiceChannelId(s)

        // for each VoiceChannelSubscription[] == voiceChannelId, if for each FocusStack[focusLevel] == bismoAudioPlayer.id return focusLevel
    }
    /**
     * Allows you to change the focus level of one or more BAPs in one or more voice channels
     * @param {BismoAudioPlayer|BismoAudioPlayer[]} bismoAduioPlayer BAP to change focus level for
     * @param {Map<string,number>} voiceChannelIdsFocusLevelMap Map of voice channel id(s) to the focus level ({vcId: <focusLevel>, ...})
     * @return {(Map<string,number>|Map<BismoAudioPlayer,Map<string,number>>)} Update focus level(s) of voice channels and one or more BAPs
     */
    SetFocusLevel(bismoAudioPlayer, voiceChannelIdsFocusLevelMap) {
        // voiceChannelIdsFocusLevelMap = { vcId: <focusLevel>, ...}

    }
    /**
     * Returns an array of BAPs for a given focus level, or a map of focus level and BismoAudioPlayer[]
     * @param {(string|string[])} voiceChannelId Voice channel(s) to check
     * @param {number} focusLevel Focus level to check
     * @return {(BismoAudioPlayer[]|Map<string,BismoAudioPlayer[])} Either an array of BAPs for that focus level in one channel, or a map of vcId to BAP array for that specified focus level. 
     */
    GetBismoAudioPlayersOnFocusLevel(voiceChannelId, focusLevel) {

    }

    /**
     * Locks focus to a BAP in one or more specified voice channels
     * @param {BismoAudioPlayer} bismoAudioPlayer The player to lock
     * @param {(string|string[])} voiceChannelId Voice channel(s) to lock in
     * @return {(bool|Map<string,bool>)} Whether successful or not
     */
    LockFocus(bismoAudioPlayer, voiceChannelId) {
        // lock focus to BAP in one or more specified voice channels
    }

    /**
     * Unlocks focus to a BAP in one or more specified voice channels. No BAP is required, there's only one that can be locked.
     * @param {(string|string[])} voiceChannelId Voice channel(s) to lock in
     * @return {(bool|Map<string,bool>)} Whether successful or not
     */
    UnlockFocus(voiceChannelId) {
        // unlock focus to BAP in one or more specified voice channels
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
    }
    /**
     * Destroys all BismoVoiceChannels we know of.
     */
    Shutdown(force) {
        // calls CleanUp, used during Bismo shutdown
        this.#VoiceChannels.forEach((voiceChannel) => {
            voiceChannel.Destroy();
        });
    }


    /**
     * **Unfinished, do not use**. Returns array of `Discord.AudioReceivers` of specified userIds, or (if none specified) all connected, in a voice channel.
     * @param {string} Voice channel to get AudioReceivers from. Cannot be an array, must be one channel id.
     * @return {Map<string,DiscordVoice.AudioReceivers>} userId: AudioReceivers
     */
    Receive(voiceChannelId, userID) {
        // Return array of AudioReceivers of specified userIds (or all connected) in a voice channel.
    }
```