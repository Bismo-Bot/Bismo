## Audio
Playing audio into voice channels on Discord can be complicated.  Luckily Discord.JS has made it easy via Discord.JS/Voice, however, only one audio source can be played at once so we need some way to manage all of these plugins and audio focus.

yada-yada, work in progress.
Essentially allow plugins to request the voiceconnection all willynilly, but, scrub the subscribe function from that instance if possible, or redirect the function to Bismo.FocusAudio(voiceConnection)


### BismoAudioPlayer:



### BismoVoiceChannel:
This object is intended to manage the voice channel itself. Connection, disconnecting, adding and removing BismoAudioPlayers, changing the focus, etc.


Events:
connect: `(connectProperties): 
{
	voiceConnection: DiscordVoice.VoiceConnection,
}`

disconnect: `(disconnectProperties):
{
	force: boolean,
}`

destroy: `()`


called when the current player is changed:
focus: `(playerChangedProperties):
{
	newPlayer: BismoAudioPlayer,
	oldPlayer: BismoAudioPlayer,
	focusLevel: number,
	isFocusLocked: boolean,
}`




### VoiceManager methods:
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
        this.Disconnect(force);
    }
    /**
     * Little difference to `CleanUp()`, however, meant to be used when shutting down. Unsubscribing is pointless so we use force in `CleanUp(true)`. Again no major difference, we just don't have to be nice in this one.
     * @param {bool} force Skips the `Destroy()` calls, just disconnects from voice channels AS FAST AS POSSIBLE. Not recommended.
     */
    Shutdown(force) {
        // calls CleanUp, used during Bismo shutdown
    }
    /**
     * Calls `CleanUp()` essentially, think `Shutdown()` but with the intention of continuing to be useful.
     * @param {bool} hard Think of this as the `force` parameter in `CleanUp()`, attempt to not use it.
     */
    Reset(hard) {
        // similar to shutdown, intended to keep VoiceManager going, clean up
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