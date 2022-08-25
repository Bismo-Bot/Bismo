// Song 'class'
/**
 * VoiceManager class: manages currently playing/subscribed AudioPlayers to allow for predicable and manageable audio behavior
 */
class VoiceManager {
    // Bismo API
    Bismo;
    // Discord API
    Client;

    

    /**
     * Creates a new Song object
     * 
     * @param {import('discord.js').Client} client Discord bot's client
     * @param {import('./../bismo.js').Bismo} bismo Bismo API
     * 
     */
    constructor(client, bismo) {
        this.Client = client;
        this.Bismo = bismo;
    }


    /**
     * Bismo Audio Player package (allows for focus and unfocus call backs)
     * @typedef {object} BismoAudioPlayer
     * @property {DiscordVoice.AudioPlayer} AudioPlayer The AudioPlayer that would be subscribed to
     * @property {function} Focused Callback when this player becomes focused (subscribed to)
     * @property {function} Unfocused Callback when this player is no longer focused (unsubscribed)
     * @property {int} ID Unique ID for this player (increments per player, used to distinguish players apart)
     */

    /**
     * Checks the audioPlayer queue and subscribes the current focused player VoiceConnection 
     */
    #UpdateCurrentAudioSubscription(voiceChannelID) {
        let audioPlayerQueue = lBismo.AudioPlayerQueues.get(voiceChannelID); // Get all the current audioPlayers

        // Work our way DOWN the queue 9->8->7->...->-1 until we to something playable
        // If no audioPlayers, leave V/C
        let voiceConnection = Bismo.GetVoiceConnection(voiceChannelID);
        for (var i = 9; i>-2; i--) {
            if (audioPlayerQueue[i] != undefined) { // array
                if (audioPlayerQueue[i].length > 0) {
                    for (var b = 0; b<audioPlayerQueue[i].length; b++) {
                        if (audioPlayerQueue[i][b].AudioPlayer != undefined) {
                            let subscription = voiceConnection.subscribe(audioPlayerQueue[i][b].AudioPlayer)
                            if (subscription != undefined) {
                                // Focus updated, wew
                                Bismo.VoiceManager.Events.emit(voiceChannelID, "focus", )
                            }
                        }
                    }

                }
            }
        }

    }
    /**
     * Subscribes an AudioPlayer to a VoiceConnection (if no other AudioPlayer has higher priority)
     * @param {string} voiceChannelID Voice channel ID you'll like to connect the AudioPlayer to
     * @param {BismoAudioPlayer} AudioPlayer to subscribe the VoiceConnection to
     * @param {int} [focusLevel = 1] 
     */
    Subscribe(voiceChannelID, audioPlayerPackage, focusLevel) {

    }
    Unsubscribe(voiceChannelID, audioPlayerPackage) {

    }

    GetActiveFocus(voiceChannelID) {

    }
    GetActiveFocusLevel(voiceChannelID) {

    }


    Receive(userID) {

    }

}

// module.exports = function(bismo) {
    // Bismo = bismo;
    // return Song;
// }

module.exports = VoiceManager;