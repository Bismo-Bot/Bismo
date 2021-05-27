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


	this.userHasPermission = function(bismoAccount, permission) {
		/*
			This was originally hosted in the bismoAccount class, but that was stupid and heavy
			It makes it easy to check permissions via that call.. but it requires the user account hold cloned permission data, which is stupid
			Why have two copies of the permissions?

			First we extract the user's ID


			
			Then, we check if the user have 'perm' in their permissions?

			Remember, in general we WANT to be false strong. So if it's NOT explicitly TRUE, it's false (or unknown if it doesn't exist)
			Unknown just means to use the default permission for that command, which is typically treated the same as a false.


				ask:  bismo.guild.permission.a.sub
				have: bismo.guild.permission.a
				return: null or false (if .a==false)


				ask:  bismo.guild.permission.a
				have: bismo.guild.permission.a.sub
				not the perm, so return null (unsure)

		*/
			


		var userID = bismoAccount.accountName;

		// Okay, do they have this permission set?
		if (this.permissions.users[userID] != undefined)
			return this.permissions.users[userID]; // Well that was easy.
		


		var keys = Object.keys(this.guilds[id].permissions);

		var wildCardTrue = null // We let * at the end of permissions effect anything thereafter. BUT, we only want this to be so IF there's no other permission that IS permission...
		var wildCardDepth = 0; // Wild cards 'deeper' than previously found ones override them.

		// console.log('===')
		for (var i = 0; i<keys.length; i++) {
			// console.log("---")
			// compare the two
			var chkPerm = perm.split('.');
			var proPerm = keys[i].split('.');

			var mLength = Math.max(chkPerm.length, proPerm.length);
			if (proPerm[proPerm.length-1] == "*" && mLength < chkPerm.length)
				mLength = chkPerm.mLength;

			for (var b = 0; b<mLength; b++) {
				// console.log("Checking: " + chkPerm[b]);
				// console.log("Against: " + proPerm[b]);
				if (proPerm[b] == null && b>=proPerm.length) { // So proPerm is null, BUT we're outside the bounds of proPerm, is the last character *? Are we in a wild card?
					if (proPerm[proPerm.length-1] == "*") { // Last character *...
						if (b>wildCardDepth) { // and this the 'deepest' wild card yet.
							// console.log("Deepest wild card: " + (this.permissions[keys[i]]==true).toString());
							wildCardDepth = b;
							wildCardTrue = (this.guilds[id].permissions[keys[i]]==true);
						} else if (b==wildCardDepth) { // same depth, is either of them false? (are both true)
							// console.log("Same depth: " + ( (this.permissions[keys[i]]==true) && wildCardTrue ).toString())
							wildCardTrue = ( (this.guilds[id].permissions[keys[i]]==true) && wildCardTrue );
						} // we don't care
					} // lol never mind this really do be the end.
					break;
				}

				if (chkPerm[b] != null && proPerm[b] != null) { // Null check
					if (proPerm[b]===chkPerm[b] || proPerm[b]==="*") // Same name (in this section)
					{
						if (proPerm[b+1] == null && chkPerm[b+1] == null) { // this is the end, no more sections after this one (for both)
							// console.log("This is the end");
							if (!this.guilds[id].permissions[keys[i]])
								return false;
							return this.guilds[id].permissions[keys[i]];
						} else if ((proPerm[b+1] == null && proPerm[b]!="*") || chkPerm[b+1] == null) { // We're asking about something this isn't next
							// console.log("Don't have. pro null nxt:" + (proPerm[b+1]==null).toString() + " | chk null nxt: " + (chkPerm[b+1]==null).toString());
							break;
						}
					} else {
						// console.log("Not the same.");
						break; // Not the same, next.
					}
				} else {
					// console.log("Null tripped.");
					break; // Nothing more.
				}
			}
		}
		
		return wildCardTrue; // No matches. they don't have that set.

	}


	return this;
};

module.exports = function(client) {
	Client = client;
	return GuildAccount;
}