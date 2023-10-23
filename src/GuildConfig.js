/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/

const Discord = require("discord.js");

const ConfigItem = require('./ConfigItem.js');
const Version = require('./Version.js');

class GuildRolePermissions {
	/**
	 * @type {string}
	 * Friendly name of the role.
	 */
	name;

	/**
	 * @type {string}
	 * Id of the role, does not change
	 */
	id;

	/**
	 * @type {string}
	 * Roles we inherit from
	 */
	inheritedRoles;

	/**
	 * @type {number}
	 * Weight of this role. Higher number means this role overrides lower weighted roles.
	 */
	weight;

	/**
	 * @type {Map<string, boolean>}
	 * Permission name to the value.
	 */
	permissions;
}

class GuildUserPermissions {
	/**
	 * @type {string[]}
	 * Roles the user is a part of.
	 */
	roles;

	/**
	 * @type {Map<string, boolean>}
	 * Permission name to the value.
	 */
	permissions;
}

class GuildPermissions {
	/**
	 * @type {Map<string, GuildRolePermissions>}
	 * Roles (role id to permissions)
	 */
	roles;

	/**
	 * @type {Map<string, GuildUserPermissions>}
	 * Permissions for users (user id to permissions)
	 */
	users;
}


/**
 * Guild configuration
 */
class GuildConfig extends ConfigItem {
	/**
     * @type {string} 
     * The ID of the guild
     */
    id;

    /**
     * @type {string} 
     * Name of the guild
     */
    name;

    /**
     * @type {boolean} 
     * If the guild has been "claimed" (setup) yet
     */
    claimed = false;

    /**
     * @type {GuildPermissions} 
     * Permissions object assumed by the guild
     */
    permissions = {};

    /**
     * @type {object} 
     * Additional data to append to a GuildAccount by plugins
     */
    pluginData = {};

    /**
     * @type {string} 
     * Prefix of text commands in the guild
     */
    prefix;

    /**
     * @type {string} 
     * Text channel ID we log to
     */
    logTextChannel;

    /**
     * @type {string}
     * Id of the user that owns this guild.
     */
    owner;


    /**
     * @type {Promise<Discord.Guild>}
     * Discord guild object
     */
    get discordGuildObject() {
    	return this.GetDiscordObjectSync();
    }


	/**
	 * @param {ConnectionManager} configManager ConfigurationManager instance
	 * @param {string} fileName The path to the config file
	 * @return {BismoConfig}
	 */
	constructor(configManager, fileName) {
		super(configManager, fileName);
		this.LoadSync();
	}

	/**
	 * @inheritdoc
	 */
	ToJSON() {
		let JSONObject = super.ToJSON();
		JSONObject["version"] = this.version.toString();
		JSONObject["encryption"] = this.encryption;

		JSONObject["id"] = this.id;
		JSONObject["name"] = this.name;
		JSONObject["permissions"] = this.permissions;
		JSONObject["pluginData"] = this.pluginData;
		JSONObject["prefix"] = this.prefix;
		JSONObject["claimed"] = this.claimed;
		JSONObject["logTextChannel"] = this.logTextChannel;

		return JSONObject;
	}

	/**
	 * @inheritdoc
	 */
	FromJSON(JSONObject) {
		if (typeof JSONObject !== "string" && typeof JSONObject !== "object")
			throw new TypeError("JSONObject expected string or object got " + (typeof JSONObject).toString());
		
		if (typeof JSONObject === "string")
			JSONObject = JSON.parse(JSONObject);

		if (JSONObject["version"] !== undefined)
			this.version = new Version(JSONObject["version"]);

		if (JSONObject["id"] !== undefined)
			this.id = JSONObject["id"];
		if (JSONObject["name"] !== undefined)
			this.name = JSONObject["name"];
		if (JSONObject["permissions"] !== undefined)
			this.permissions = JSONObject["permissions"];
		if (JSONObject["pluginData"] !== undefined)
			this.pluginData = JSONObject["pluginData"];
		if (JSONObject["prefix"] !== undefined)
			this.prefix = JSONObject["prefix"];
		if (JSONObject["claimed"] !== undefined)
			this.claimed = JSONObject["claimed"];
		if (JSONObject["logTextChannel"] !== undefined)
			this.logTextChannel = JSONObject["logTextChannel"];
	}

	/**
	 * Gets the Discord.js object for the guild.
	 * @return {Promise<Discord.Guild>}
	 */
	GetDiscordObject() {
		return global.Bismo.Client.guilds.fetch(this.id);
	}

	/**
	 * Get all guild member objects
	 * @return {Promise<Discord.Collection<string, Discord.GuildMember>>} All guild members
	 */
	async GetUsers() {
		return this.GetDiscordObjectSync().members.fetch();
	}

	/**
	 * Get an array of user IDs within a guild
	 * @return {string[]} Array of user IDs inside a guild
	 */
	GetUserIds() {
		let users = this.GetUsersSync();

		let userIds = [];
		for (let i=0; i<users.length; i++) {
			if (users[i] !== undefined && typeof users[i].id === "string") {
				userIds.push(users[i].id);
			}
		}

		return userIds;
	}


	/**
	 * Check to see if a userId is apart of a guild
	 * @param {string} userId UserID to check
	 * @return {boolean} Discord user is apart of a guild
	 */
	IsUserGuildMember(userId) {
		let users = this.GetUsersSync();
		return users[userId] !== undefined;
	}

	static ChannelTypes = Object.freeze({
		// A text channel within a server
		"GUILD_TEXT": 0,
		// A direct message between users
		"DM": 1,
		// A voice channel within a server
		"GUILD_VOICE": 2,
		// A direct message between multiple users
		"GROUP_DM": 3,
		// An organizational category that contains up to 50 channels
		"GUILD_CATEGORY": 4,
		// A channel that users can follow and crosspost into their own server (formerly news channels)
		"GUILD_ANNOUNCEMENT": 5,
		// A temporary sub-channel within a GUILD_ANNOUNCEMENT channel
		"ANNOUNCEMENT_THREAD": 10,
		// A temporary sub-channel within a GUILD_TEXT or GUILD_FORUM channel
		"PUBLIC_THREAD": 11,
		// A temporary sub-channel within a GUILD_TEXT channel that is only viewable by those invited and those with the MANAGE_THREADS permission
		"PRIVATE_THREAD": 12,
		// A voice channel for hosting events with an audience
		"GUILD_STAGE_VOICE": 13,
		// The channel in a hub containing the listed servers
		"GUILD_DIRECTORY": 14,
		// Channel that can only contain threads
		"GUILD_FORUM": 15,
		// Channel that can only contain threads, similar to GUILD_FORUM channels
		"GUILD_MEDIA": 16
	});

	/**
	 * Get all channels in a particular guild
	 * @param {Discord.ChannelType} [type] Only return these types of channels
	 * @return {Promise<Discord.Channel[]|Discord.VoiceChannel[]|Discord.TextChannel[]|Discord.StoreChannel[]|Discord.NewsChannel[]|array>} Channels 
	 */
	GetChannels(type) {
		return new Promise(async (resolve, reject) => {
			type = type.toString().toLowerCase();

			let guild = await this.GetDiscordObject();
			let channelManager = guild.channels;
			let channels = await channelManager.fetch();
			if (type === undefined)
				resolve([...channels.values()]); // disgusting

			resolve(channels.filter(channel => channel.type.toString().toLowerCase() == type));
		});
	}

	/**
	 * Get the channel object of a channel in a guild
	 * @param {string} channelId The channel ID to get
	 * @return {(Discord.TextChannel|Discord.VoiceChannel|Discord.NewsChannel|Discord.StoreChannel)} Channel object
	 */
	GetChannel(channelId) {
		return new Promise(async (resolve, reject) => {
			if (typeof channelId !== "string")
				throw new TypeError("channelId expected string got " + (typeof channelId).toString());

			let guild = await this.GetDiscordObject();
			let channelManager = guild.channels;
			channelManager.fetch(channelId).then(resolve).catch(reject);
		});
	}

	/**
	 * Get the current voice channel a user is in within a guild
	 * @param {string} userId The user to check
	 * @return {Discord.VoiceChannel|undefined} - Voice channel that user is in
	 */
	GetUserCurrentVoiceChannel(userId) {
		return new Promise(async (resolve, reject) => {
			if (typeof userId !== "string")
				throw new TypeError("userId expected string got " + (typeof userId).toString());


			let guild = await this.GetDiscordObject();
			let channelManager = guild.channels;
			if (guild === undefined)
				resolve(undefined);
			
			guild.members.fetch(userId).then(user => {
				resolve(user.voice?.channel);
			});
		});
	}



	/**
     * Checks for a permission
     * 
     * It makes it easy to check permissions via that call.. but it requires the user account hold cloned permission data, which is stupid
     * Why have two copies of the permissions?
     *
     *
     * Then, we check if the user have 'perm' in their permissions?
     *
     * Remember, in general we WANT to be false strong. So if it's NOT explicitly TRUE, it's false (or unknown if it doesn't exist)
     * Unknown just means to use the default permission for that command, which is typically treated the same as a false.
     *
     *
     *    ask:  `bismo.guild.permission.a.sub`
     *    have: `bismo.guild.permission.a`
     *    return: `null or false (if .a==false)`
     *
     *
     *    ask:  `bismo.guild.permission.a`
     *    have: `bismo.guild.permission.a.sub`
     *    not the perm, so return `null` (unsure)
     * 
     * @param {object} permissionSet - The permissions we're looking at (what they have)
     * @param {string} permission - The permission we're checking for
     * @return {(boolean|undefined)} Permission's value
     */
    #CheckForPermission(permissionSet, permission) {
        /*
            This is a simple function that we're going to use to check if a `permission` is set within the object `permissionSet`.
            Really basic ;p

        */
        /*
            This was originally hosted in the bismoAccount class, but that was stupid and heavy
            It makes it easy to check permissions via that call.. but it requires the user account hold cloned permission data, which is stupid
            Why have two copies of the permissions?

            
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
        if (permissionSet == undefined) {
        	global.appLog.debug("permissionSet undefined");
        	return; // there's nothing to check :/
        }
        if (permissionSet[permission] != undefined) {
        	global.appLog.debug("No permissions to check against");
            return permissionSet[permission]; // Well, that was easy.
        }


        console.log("keyifying")
        let keys = Object.keys(permissionSet); // the permissions

        let wildCardTrue = undefined; // We let * at the end of permissions effect anything thereafter. BUT, we only want this to be so IF there's no other permission that IS permission...
        let wildCardDepth = 0; // Wild cards 'deeper' than previously found ones hold more weight.


        global.appLog.debug("===")

        for (var i = 0; i < keys.length; i++) { // For each permission (string)
            global.appLog.debug("---")
            // compare the two
            var permissionPartsToLookFor = permission.split('.'); // Permission we need to find
            var permissionPartsCheckingAgainst = keys[i].split('.'); // Permission we are checking against

            var maxLength = Math.max(permissionPartsToLookFor.length, permissionPartsCheckingAgainst.length);
            if (permissionPartsCheckingAgainst[permissionPartsCheckingAgainst.length - 1] == "*" && maxLength < permissionPartsToLookFor.length)
                maxLength = permissionPartsToLookFor.mLength;

            for (var b = 0; b < maxLength; b++) {                
                global.appLog.debug("Checking: " + permissionPartsToLookFor[b]);
                global.appLog.debug("Against: " + permissionPartsCheckingAgainst[b]);

                if (permissionPartsCheckingAgainst[b] == undefined && b >= permissionPartsCheckingAgainst.length) {
                	// So, permissionPartsCheckingAgainst is undefined, BUT we're outside the bounds of permissionPartsCheckingAgainst, is the last character *? Are we in a wild card?
                    
                    if (permissionPartsCheckingAgainst[permissionPartsCheckingAgainst.length - 1] != "*") { // Last character *... ?
                    	// no
                    	break;
                    }

                    if (b > wildCardDepth) { // and this the 'deepest' wild card yet.
                        global.appLog.debug("Deepest wild card: " + (this.permissions[keys[i]]==true).toString());
                        wildCardDepth = b;
                        wildCardTrue = (permissionSet[keys[i]] == true);
                    } else if (b == wildCardDepth) { // same depth, is either of them false? (are both true)
                        global.appLog.debug("Same depth: " + ( (this.permissions[keys[i]]==true) && wildCardTrue ).toString())
                        wildCardTrue = ((permissionSet[keys[i]] == true) && wildCardTrue);
                    } // we don't care (b<wildCardDepth)
                }

                if (permissionPartsToLookFor[b] == undefined || permissionPartsCheckingAgainst[b] == undefined) { // Either undefined? (too far, perhaps?)
                	global.appLog.debug("Null tripped.");
                    break; // Nothing more.
                }

                if (permissionPartsCheckingAgainst[b] !== permissionPartsToLookFor[b] && permissionPartsCheckingAgainst[b] !== "*") { // Same name (in this section)?
                	// no
                	global.appLog.debug("Not the same.");
                    break; // Not the same, next.
            	}

                if (permissionPartsCheckingAgainst[b + 1] == undefined && permissionPartsToLookFor[b + 1] == undefined) { // this is the end, no more sections after this one (for both)
                    global.appLog.debug("This is the end");
                    return permissionSet[keys[i]];
                } else if ((permissionPartsCheckingAgainst[b + 1] == undefined && permissionPartsCheckingAgainst[b] != "*") || permissionPartsToLookFor[b + 1] == undefined) { // We're asking about something this isn't next
                    global.appLog.debug("Don't have. pro null nxt:" + (permissionPartsCheckingAgainst[b+1]==null).toString() + " | chk null nxt: " + (permissionPartsToLookFor[b+1]==null).toString());
                    break;
                }
            }
        }

        return wildCardTrue; // No matches. they don't have that set.
    }

    /**
     * Checks for a permission
     * 
     * First we do input checks
     * userID should be a string that represents a ... userID (discord user ID)
     * permission should also be a string that represents a permission you're checking for
     *
     * ----------------------------------------------------------
     *
     * We first check the user's permissions (not their roles)
     * We then check the roles (working our way backwards to the top most inherited role).
     *
     * 1) User permissions
     * 2) Roles -> .. -> Inherited roles (1 by one)
     *
     * Note: this does not work on complicated inheritance setups, so just don't do that :)\
     * Right now users can inherit from roles, obv., but roles inheriting from other roles is questionable
     * 
     * @param {string} userId - The user we're checking against
     * @param {string} permission - The permission we're checking for
     * @return {(boolean|undefined)} Permission's value
     */
    UserHasPermission(userId, permission) {
    	let requiresSave = false;
        if (this.permissions === undefined) {
            this.permissions = {};
            requiresSave = true;
        }
        if (this.permissions.users === undefined) {
            this.permissions.users = {};
            requiresSave = true;
        }
        if (this.permissions[userId] === undefined) {
            this.permissions[userId] = {};
            requiresSave = true;
        }
        
        if (this.permissions.users == undefined) {
        	this.permissions.users = {};
        	requiresSave = true;
        }
        if (requiresSave)
        	this.SaveSync();

        console.log(`Checking for ${permission}`);
        if (this.owner == userId)
        	return true;

        let perm = this.#CheckForPermission(this.permissions?.users[userId]?.permissions, permission);
        if (perm != undefined && typeof perm == "boolean")
            return perm;

        console.log("Checking roles")

        let me = this;

        if (!Array.isArray(this.permissions.users[userId]?.roles))
            return undefined; // they've got no roles to check

        let rolesAlreadyChecked = [];

        /**
         * @param {GuildRolePermissions} roleToCheck
         */
        function checkRole(roleToCheck) {
        	if (roleToCheck == undefined
        		|| typeof roleToCheck !== "object"
        		|| rolesAlreadyChecked.includes(roleToCheck.id)) {
        		return;
        	}

        	rolesAlreadyChecked.push(roleToCheck.id);

        	let weight = 0;
	        let permitted = undefined;
	        for (var i = 0; i < roleToCheck.inheritedRoles.length; i++) {
	        	let roleId = roleToCheck.inheritedRoles[i];
	        	if (typeof roleId !== "string" || roleId.trim() == "")
	        		continue; // ignore invalid names.

	        	let role = this.permissions.roles[roleId];

	        	let passes = checkRole(role);
	        	if (role.weight > weight) { // higher weight overrides lower weight
	        		permitted = passes;
	        	}
	        }
	        return permitted;
        }

        let weight = 0;
        perm = undefined;
        for (var i = 0; i < this.permissions.users[userId].roles.length; i++) {
        	let roleId = this.permissions.users[userId].roles[i];
        	if (typeof roleId !== "string" || roleId.trim() == "")
        		continue; // ignore invalid names.

        	let role = this.permissions.roles[roleId];

        	let passes = checkRole(role);
        	if (role.weight > weight) { // higher weight overrides lower weight
        		perm = passes;
        	}
        }

        return perm;
    }

    /***
     * Removes a permission from the user's permission set.
     * @param {object} permissionSet Reference to the permission dictionary we're removing from
     * @param {string} permission The permission we're removing
     * @param {boolean} includingChildren Whether or not we also remove all children of `permission` (rather than that explicit permission)
     * @returns {boolean} Removed permissions (false just means they were never set)
     */
    RemovePermission(permissionSet, permission, includingChildren) {
        if (typeof permissionSet !== "object")
            throw new TypeError("permissionSet expected object got " + (typeof permissionSet).toString());
        if (typeof permission !== "string")
            throw new TypeError("permission expected string got " + (typeof permission).toString());
        if (typeof includingChildren !== "boolean")
            throw new TypeError("includingChildren expected boolean got " + (typeof includingChildren).toString());
        let removed = false;

        if (permissionSet[permission] != undefined) {
            removed = true;
            delete permissionSet[permission];
        }


        if (includingChildren) {
            permission = permission.replace(/[\.\*]+$/,"") + "."; // Remove the trailing wildcards (.*.*.* ...) and add a trailing .
            let permissions = Object.keys(permissionSet);
            for (var i = 0; i<permissions.length; i++) {
                // At this moment I have no idea how wildcards in the middle of the permission behave. I believe they're ignored and treated as a literal, but I honestly do not know.
                // They _should_ behave as just that, wildcards.
                // Right now it'll just be a literal. (because '.' is actually the regex wildcard..)
                if (permissionSet[permissions[i]].startsWith(permission)) {
                    removed = true;
                    delete permissionSet[permissions[i]];
                }
            }
        }

        if (removed)
            this.SaveSync();
        return removed;
    }

    /**
     * Checks if the user exists in the permissions storage for the guild
     * @param {string} userId
     * @return {boolean}
     */
    UserExists(userId) {
        if (typeof userId !== "string")
            throw new TypeError("userId expected string got " + (typeof userId).toString());

        if (this.permissions.users[userId] != undefined) {
            if (this.permissions.users[userId].permissions == undefined)
                this.permissions.users[userId].permissions = {}
            if (this.permissions.users[userId].roles == undefined)
                this.permissions.users[userId].roles = []
            return true
        }
        return false;
    }

    /***
     * Removes a permission from the user's permission set.
     * @param {string} userId User we're removing the permission from
     * @param {string} permission The permission we're removing
     * @param {boolean} includingChildren Whether or not we also remove all children of `permission` (rather than that explicit permission)
     * @returns {boolean} Removed permissions (false just means they were never set)
     */
    RemoveUserPermission(userId, permission, includingChildren) {
    	if (typeof userId !== "string")
    		throw new TypeError("userId expected string got " + (typeof userId).toString());

        return this.RemovePermission(this.permissions.users[userId]?.permissions, permission, includingChildren);
    }

    /**
     * Sets a permission for a user
     * @param {string} userId
     * @param {string} permission
     * @param {boolean} value
     */
    SetUserPermission(userId, permission, value) {
        if (typeof userId !== "string")
            throw new TypeError("userId expected string got " + (typeof userId).toString());
        if (typeof permission !== "string")
            throw new TypeError("permission expected string got " + (typeof permission).toString());

        if (!this.UserExists(userId))
            this.permissions.users[userId] = {
                permissions: {},
                roles: []
            }

        this.permissions.users[userId].permissions[permission] = value;

        this.SaveSync();
    }

    /***
     * Adds a role to a user
     * 
     * @param {string} userId User we're modifying
     * @param {string} role The role we're adding to the user
     */
    AddUserRole(userId, role) {
        if (typeof userId !== "string")
            throw new TypeError("userId expected string got " + (typeof userId).toString());
        if (typeof role !== "string")
            throw new TypeError("role expected string got " + (typeof role).toString());

        if (!this.UserExists(userId))
            this.permissions.users[userId] = {
                permissions: {},
                roles: []
            }

        if (this.permissions.users[userId].roles.indexOf(role) === -1)
            this.permissions.users[userId].roles.push(role);

        this.SaveSync();
    }

    /***
     * Adds a role to a user
     * Ignores if the user doesn't exist

     * @param {string} userId User we're modifying
     * @param {string} role The role we're removing from the user
     */
    RemoveUserRole(userId, role) {
        if (typeof userId !== "string")
            throw new TypeError("userId expected string got " + (typeof userId).toString());
        if (typeof role !== "string")
            throw new TypeError("role expected string got " + (typeof role).toString());

        if (this.UserExists(userId))
            this.permissions.users[userId].roles = this.permissions.users[userId].roles.filter(i => i!=role);

        this.SaveSync();
    }

    /***
     * Adds a role to a user
     * Ignores if the user doesn't exist

     * @param {string} userId User we're modifying
     * @param {string} role The role we're adding to the user
     */
    SetUserRoles(userId, roles) {
        if (typeof userId !== "string")
            throw new TypeError("userId expected string got " + (typeof userId).toString());
        if (!Array.isArray(roles))
            throw new TypeError("role expected array got " + (typeof role).toString());

        if (this.UserExists(userId))
            this.permissions.users[userId].roles = [...roles];

        this.SaveSync();
    }

    /***
     * Clear a user's roles (resets them)
     * Ignores if the user doesn't exist

     * @param {string} userId User we're modifying
     */
    ClearUserRoles(userId) {
        if (typeof userId !== "string")
            throw new TypeError("userId expected string got " + (typeof userId).toString());
        if (this.UserExists(userId))
            this.permissions.users[userId].roles = [];

        this.SaveSync();
    }

    /***
     * Resets a user's permissions (just the permissions)
     * Ignores if the user doesn't exist

     * @param {string} userId User we're resetting
     */
    ClearUserPermissions(userId) {
        if (typeof userId !== "string")
            throw new TypeError("userId expected string got " + (typeof userId).toString());
        if (this.UserExists(userId))
            this.permissions.users[userId].permissions = {};

        this.SaveSync();
    }

    /**
     * Removes a user from the list of users in permission storage
     * This clears their roles and permissions and removes any reference to them
     * @param {string} userId
     */
    DeleteUserPermissions(userId) {
        if (typeof userId !== "string")
            throw new TypeError("userId expected string got " + (typeof userId).toString());
        if (this.permissions.users[userId] != undefined)
            delete this.permissions.users[userId];

        this.SaveSync();
    }

    //-------

    /**
     * Checks if a role is defined in the guild
     * @param {string} role
     * @returns {boolean}
     */
    RoleExists(role) {
        if (typeof role !== "string")
            throw new TypeError("role expected string got " + (typeof role).toString());
        if (this.permissions.roles[role] != undefined)
            return true;
        return false;
    }

    /**
     * Sets a permission in a guild role
     * @param {string} role Role name
     * @param {string} permission
     * @param {boolean} value
     */
    SetRolePermission(role, permission, value) {
        if (typeof role !== "string")
            throw new TypeError("role expected string got " + (typeof role).toString());
        if (typeof permission !== "string")
            throw new TypeError("permission expected string got " + (typeof permission).toString());
        // a permission can be set to any value... I think. It's not like it has to be a boolean, so I'm not going to type check permission values anywhere.
        // Undocumented, except here. Enjoy that tidbit of knowledge
        if (!this.RoleExists(role))
            this.permissions.roles[role] = {
                parents: undefined,
                name: role,
                permissions: {}
            };

        if (this.permissions.roles[role].permissions == undefined)
            this.permissions.roles[role].permissions = {};

        this.permissions.roles[role].permissions[permission] = value;

        this.SaveSync();               
    }

    /**
     * Removes a permission from a guild role
     * @param {string} role
     * @param {string} permission The permission we're removing
     * @param {boolean} includingChildren Whether or not we also remove all children of `permission` (rather than that explicit permission)
     * @returns {boolean} Removed permissions (false just means they were never set)
     */
    RemoveRolePermission(role, permission, includingChildren) {
    	if (typeof role !== "string")
    		throw new TypeError("role expected string got " + (typeof role).toString());

        return this.RemovePermission(this.permissions.roles[role]?.permissions, permission, includingChildren);
    }

    /**
     * Rename a guild permission role
     * @param {string} currentName Role's current name
     * @param {string} newName Role's new name
     */
    RenameRole(currentName, newName) {
        if (typeof currentName !== "string")
            throw new TypeError("currentName expected string, got " + (typeof currentName).toString())
        if (typeof newName !== "string")
            throw new TypeError("newName expected string, got" + (typeof newName).toString())

        if (this.permissions.roles[newName] != undefined)
            throw new Error("New name already exists")
        if (this.permissions.roles[currentName] == undefined)
            return;

        this.permissions.roles[newName] = {...this.permissions.roles[currentName]}; // Copy
        delete this.permissions.roles[currentName]; // Delete
        this.permissions.roles[newName].name = newName;

        let users = Object.keys(this.permissions.users);
        for (var i = 0; i<users.length; i++) {
            // For each user, update the name
            this.permissions.users[users[i]].roles = this.permissions.users[users[i]].roles.filter(i => i!=role);
            this.permissions.users[users[i]].roles.push(newName);
        }

        this.SaveSync();
    }

    /**
     * Delete a role from the guild
     * @param {string} role
     */
    DeleteRole(role) {
        if (this.RoleExists(role))
            delete this.permissions.roles[role];

        let users = Object.keys(this.permissions.users);
        for (var i = 0; i<users.length; i++) {
            // For each user, update the name
            this.permissions.users[users[i]].roles = this.permissions.users[users[i]].roles.filter(i => i!=role);
        }

        this.SaveSync();
    }
}

module.exports = GuildConfig;