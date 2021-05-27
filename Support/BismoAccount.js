/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/


// Bismo Account 'class'

/*

	This needs to be really, really light weight
	We should only remember platform IDs, usernames and IDs.

*/

var Client;

const BismoAccount = function(accData) {
	if (accData != null)
		this.accountName = accData.accountName;
	else {
		this.accountName = ""; // The name of the account
		return;
	}

	if (accData.initalLink != null)
		this.linkedAccounts = [
			{
				platform: accData.initalLink.platform,
				id: accData.initalLink.accountID,
				username: accData.initalLink.username
			}]
	else if (accData.linkedAccounts != null)
		this.linkedAccounts = accData.linkedAccounts;
	else
		this.linkedAccounts = [
			//{
			//	platform: Platforms.Discord, // Either .Discord or .Steam - which platform the account is on (Populated on creation)
			//	id: "", // Either the Discord account ID or a SteamID (Populated on creation)
			//	username: "" // The 'username' of the user
			//}
		];

	if (accData.guilds != null) {
		this.guilds = accData.guilds;
		this._guilds = accData.guilds; // clean version (ie just the id and type.)
		
	}
	else {
		this.guilds = {
			//{
			//	id: "", // The ID of the guild (note, if account was created on a Steam Bot, the Steam Bot guild ID will be placed here)
			//	permissions: Permissions({ guidID: "" }) // Gets the default user permissions for this guild (on population)
			//}
		};
		this._guilds = {};
	}

	this.updateGuilds = function() {
		for (var i = 0; i<this._guilds.length; i++) {
			var id = this._guilds[i].id;
			this.guilds[id] = this._guilds[i];

			if (this.guilds[id].type==0) {
				// Discord guild
				this.guilds[id].data = Client.guilds.get(this.guilds[id].id)
				this.guilds[id].permissions = {}
				this.guilds[id].hasPermission = function(perm) { //returns null: undefined (not explicitly), true: yes, false: no (denied).
					// Does the user have 'perm' in their permissions?

					// Remember, in general we WANT to be false strong. So if it's NOT explicitly TRUE, it's false (or unknown if it doesn't exist)
					// Unknown just means to use the default permission for that command, which is typically treated the same as a false.


						// ask:  bismo.guild.permission.a.sub
						// have: bismo.guild.permission.a
						// return: null or false (if .a==false)


						// ask:  bismo.guild.permission.a
						// have: bismo.guild.permission.a.sub
						// not the perm, so return null (unsure)


					// return the value if we just have it defined.
					if (this.guilds[id].permissions[perm]!=null)
						return this.guilds[id].permissions[perm]; //lol okay that was easy


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
			}
		}
		this._guilds = {}
	}

	this.updatePermissions = function(data) {
		for (var i = 0; i<data.length; i++) {
			var d = data[i];
			if (d.permissions!=null && d.id != null && this.guilds[d.id]!=null) {
				if (this.guilds[d.id].id === d.id && d.permissions.users != null && d.permissions.roles != null)
					if (d.permissions.users[accountName] != null)
						if (d.permissions.users[accountName].roles != null && d.permissions.users[accountName].permissions) {

							// okay they have the correct data for us. Phrase it.. :(
							addRole = function(r) { // This is the permission dist (the group of permission entries)
								var keys = Object.keys(r);
								for (var b=0; b<keys.length; b++) {
									var key = keys[b];
									if (r[keys[b]] != undefined)
										this.guilds[d.id].permissions[key] = r[keys[b]]; // Add (override) to the permissions list
								}
							}
							addRoles = function(roles, processed) { // Add the role permissions and it's parents (so add starting at the lowest role going up)
								var keys = Object.keys(roles);
								for (var b=0; b<keys.length; b++) { //d.permissions == guild permissions
									if (d.permissions.roles[roles[b]]!=null) {
										// okay, it exists.
										var dd = d.permissions.roles[roles[b]]; // make life easier. This is the ROLE 'set'
										if (dd.parents != null) {
											addRoles(dd.permissions.roles[roles[b]].parents); // Has parents. Add them
										}
										// parents added, now add us.
										addRole(dd.permissions);
										// okay move up										
									}
								}
							}

							addRoles(d.permissions.users[accountName].roles); // Add the user roles.
							addRole(d.permissions.users[accountName].permissions) // Add the user's permissions
						}
			}
		}
	};

	this.getSterial = function() {
		// return a stripped version of our self.
		// seems easy tbh

		var ad = {
			accountName: this.accountName,
			linkedAccounts: this.linkedAccounts,
			_guilds: []
		};
		Object.keys(this.guilds).forEach(key => {
			// god I hate js
			var g = this.guilds[key];
			if (g.id != undefined) {
				ad._guilds.push({
					id: g.id,
					type: 0
				});
			}
		})

		return ad;
	}

	return this;
};

module.exports = function(client) {
	Client = client;
	return BismoAccount;
};