/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/


// GuildData 'class'

var Client;


const GuildAccount = function(data) {

	if (data==undefined)
		return;

	this.id = data.id; 						// The GuildID
	this.name = data.name; 					// The guild name

	if (data.roles == undefined)
		this.permissions = {
			roles: { 						// An array containing the roles (permission sets) of the guild
				Default: {
					parents: undefined,
					name: "Default",
					permissions: {}
				}
			},
			users: {
			}
		};
	else
		this.permissions == data.permissions;	// Roles provided

	if (data.owner)							// Set the owner to full permissions
		this.permissions.users[data.owner] = {
			roles: ["Default"],
			permissions: {"*": true}
		}

	this.Parties = [];


	// This is how plugins can extend this
	if (data.PluginData == undefined)
		this.PluginData = {};
	else
		this.PluginData = data.PluginData;


	return this;
};

module.exports = function(client) {
	Client = client;
	return GuildAccount;
}