/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/



/**
 * GuildAccount class
 * @class
 */
class GuildAccount {
    


    /**
     * id - The ID of the guild
     * @type {string} 
     */
    id;

    /**
     * name - Name of the guild
     * @type {string} 
     */
    name;

    /**
     * permissions - Permissions object assumed by the guild
     * @type {Bismo.Permissions} 
     */
    permissions;

    /**
     * pluginData - Additional data to append to a GuildAccount by plugins
     * @type {object} 
     */
    pluginData;

    /**
     * prefix - Prefix of text commands in the guild
     * @type {string} 
     */
    prefix;

    /**
     * claim - If the guild has been "claimed" (setup) yet
     * @type {boolean} 
     */
    claimed;

    /**
     * textChannel - Text channel ID we log to
     * @type {string} 
     */
    textChannel;


    /**
     * GuildAccount constructor
     * @param {import('./../bismo.js').BismoGuildAccountConstructorData} data GuildAccountContructor data
     */
    constructor(data, Bismo) {

        if (data == undefined)
            return undefined;

        if (typeof data.id != "string" || typeof data.name != "string")
            return undefined; // No guild data :/

        this.id = data.id; // The GuildID
        this.name = data.name; // The guild name

        if (data.permissions == undefined)
            this.permissions = {
                roles: {
                    Default: {
                        parents: undefined,
                        name: "Default",
                        permissions: {}
                    }
                },
                users: {}
            };
        else
            this.permissions = { ...data.permissions }; // Roles provided

        if (typeof data.owner == "string") // Set the owner to full permissions
            this.permissions.users[data.owner] = {
                roles: ["Default"],
                permissions: { "*": true }
            };


        // This is how plugins can extend this
        if (typeof data.pluginData == "object")
            this.pluginData = data.pluginData;

        else
            this.pluginData = {};

        if (typeof data.prefix == "string")
            this.prefix = data.prefix;


        if (typeof data.claimed == "boolean")
            this.claimed = data.claimed;

        else
            this.claimed = false;

        if (typeof data.textChannel == "string")
            this.textChannel = data.textChannel;

        /**
         * Checks for a permission
         * 
         * This was originally hosted in the bismoAccount class, but that was stupid and heavy\
         * It makes it easy to check permissions via that call.. but it requires the user account hold cloned permission data, which is stupid\
         * Why have two copies of the permissions?
         *
         *
         * Then, we check if the user have 'perm' in their permissions?
         *
         * Remember, in general we WANT to be false strong. So if it's NOT explicitly TRUE, it's false (or unknown if it doesn't exist)\
         * Unknown just means to use the default permission for that command, which is typically treated the same as a false.
         *
         *
         *    ask:  `bismo.guild.permission.a.sub`\
         *    have: `bismo.guild.permission.a`\
         *    return: `null or false (if .a==false)`
         *
         *
         *    ask:  `bismo.guild.permission.a`\
         *    have: `bismo.guild.permission.a.sub`\
         *    not the perm, so return `null` (unsure)
         * 
         * @param {object} permissionSet - The permissions we're looking at (what they have)
         * @param {string} permission - The permission we're checking for
         * @return {(boolean|undefined)} Permission's value
         */
        this.CheckForPermission = function(permissionSet, permission) {
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
            if (permissionSet[permission] != undefined)
                return permissionSet[permission]; // Well that was easy.



            var keys = Object.keys(permissionSet);

            var wildCardTrue = null; // We let * at the end of permissions effect anything thereafter. BUT, we only want this to be so IF there's no other permission that IS permission...
            var wildCardDepth = 0; // Wild cards 'deeper' than previously found ones override them.


            // console.log('===')
            for (var i = 0; i < keys.length; i++) { // For each permission (string)
                // console.log("---")
                // compare the two
                var chkPerm = permission.split('.'); // Permission we need to find
                var proPerm = keys[i].split('.'); // Permission we are checking against

                var maxLength = Math.max(chkPerm.length, proPerm.length);
                if (proPerm[proPerm.length - 1] == "*" && maxLength < chkPerm.length)
                    maxLength = chkPerm.mLength;

                for (var b = 0; b < maxLength; b++) {
                    // console.log("Checking: " + chkPerm[b]);
                    // console.log("Against: " + proPerm[b]);
                    if (proPerm[b] == null && b >= proPerm.length) { // So proPerm is null, BUT we're outside the bounds of proPerm, is the last character *? Are we in a wild card?
                        if (proPerm[proPerm.length - 1] == "*") { // Last character *...
                            if (b > wildCardDepth) { // and this the 'deepest' wild card yet.
                                // console.log("Deepest wild card: " + (this.permissions[keys[i]]==true).toString());
                                wildCardDepth = b;
                                wildCardTrue = (permissionSet[keys[i]] == true);
                            } else if (b == wildCardDepth) { // same depth, is either of them false? (are both true)
                                // console.log("Same depth: " + ( (this.permissions[keys[i]]==true) && wildCardTrue ).toString())
                                wildCardTrue = ((permissionSet[keys[i]] == true) && wildCardTrue);
                            } // we don't care
                        } // lol never mind this really do be the end.
                        break;
                    }

                    if (chkPerm[b] != null && proPerm[b] != null) { // Null check
                        if (proPerm[b] === chkPerm[b] || proPerm[b] === "*") // Same name (in this section)
                        {
                            if (proPerm[b + 1] == null && chkPerm[b + 1] == null) { // this is the end, no more sections after this one (for both)
                                // console.log("This is the end");
                                return permissionSet[keys[i]];
                            } else if ((proPerm[b + 1] == null && proPerm[b] != "*") || chkPerm[b + 1] == null) { // We're asking about something this isn't next
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
        };

        /**
         * Checks for a permission
         * 
         * First we do input checks
         * userID should be a string that represents a ... userID (discord user ID)
         * permission should also be a string that represents a permission you're checking for
         *
         * ----------------------------------------------------------
         *
         * We first check the user's permissions (not their roles)\
         * We go opposite of inheritance (so start at the top and work our way down)\
         * This saves processing power as we start with what will rule supreme anyways
         *
         * 1) User permissions\
         * 2) Roles -> top inheritance
         *
         * Note: this does not work on complicated inheritance setups, so just don't do that :)\
         * Right now users can inherit from roles, obv., but roles inheriting from other roles is questionable and I don't wanna fix it right now
         * 
         * @param {string} userID - The user we're checking against
         * @param {string} permission - The permission we're checking for
         * @return {(boolean|undefined)} Permission's value
         */
        this.UserHasPermission = function(userID, permission) {
            var perm = this.CheckForPermission(this.permissions.users[userID].permissions, permission);

            //if (typeof perm === "boolean")
            if (perm != undefined)
                return perm;

            // User does not have this permission explicitly set, so check their roles
            function getRole(name) {
                if (typeof name == "string") {
                    // they gave us the name :p
                    name = name.toLowerCase();
                    let keys = Object.keys(this.permissions.roles);
                    for (var i = 0; i < keys.length; i++) {
                        if (key[i].toLowerCase() == name) {
                            name = key;
                            break;
                        }
                    }
                    if (typeof name != "string")
                        return name;
                }
                return undefined;
            }

            function getParent(role, previous) {
                // in the future this will be changed to a 2D array, first dimension being the level of inheritance, second dimension being the roles in that level of inheritance
                // so until then this is kinda broken and you can't do advance levels of inheritance :/
                if (typeof role == "string") {
                    // they gave us the name :p
                    role = getRole(role);
                }

                if (typeof previous != "object")
                    previous = [];

                // Check if in previous
                var circular = false;
                let keys = Object.keys(previous);
                for (var i = 0; i < keys.length; i++) {
                    if (keys[i] == role.name) {
                        circular = true;
                        break;
                    }
                }
                if (circular)
                    return; // Circular inheritance ..

                if (typeof role == "object") {
                    if (typeof role.parents == "object") {
                        // multiple parents
                        let keys = Object.keys(role.parents);
                        var parents = [];
                        previous.push(role.name);
                        for (var i = 0; i < keys.length; i++) {
                            parents.push(getParent(keys[i], previous));
                            previous.push(keys[i]);
                        }
                        return parents;

                    } else if (typeof role.parents == "string") {
                        // single parent
                        return getParent(role.parents, previous.push(role.name));
                    } else {
                        return [role]; // No parents
                    }
                } else {
                    // bro I don't fucking know
                    return undefined;
                }
            }

            if (typeof this.permissions.users[userID].roles != "object")
                return undefined; // idk

            let roles = [];
            for (var i = 0; i < this.permissions.users[userID].roles.length; i++) {
                // Get the parent roles
                let parents = getParent(this.permissions.users[userID].roles[i], []);
                for (var o = 0; o < parents.length; o++) {
                    roles.push(parents[o]);
                }
            }

            var permission = undefined;
            for (var i = 0; i < roles; i++) {
                let role = getRole(roles[i]);
                if (role != undefined)
                    permission = this.CheckForPermission(role.permissions);
            }

            return permission;

        };

        /***
         * Removes a permission from the user's permission set.
         * @param {object} permissionSet Reference to the permission dictionary we're removing from
         * @param {string} permission The permission we're removing
         * @param {boolean} includingChildren Whether or not we also remove all children of `permission` (rather than that explicit permission)
         * @returns {boolean} Removed permissions (false just means they were never set)
         */
        this.RemovePermission = function(permissionSet, permission, includingChildren) {
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
                this.Save();
            return removed;
        }

        /**
         * Checks if the user exists in the permissions storage for the guild
         * @param {string} userId
         * @return {boolean}
         */
        this.UserExists = function(userId) {
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
        this.RemoveUserPermission = function(userId, permission, includingChildren) {
            return this.RemovePermission(this.permissions.users[userId]?.permissions, permission, includingChildren);
        }

        /**
         * Sets a permission for a user
         * @param {string} userId
         * @param {string} permission
         * @param {boolean} value
         */
        this.SetUserPermission = function(userId, permission, value) {
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

            this.Save();
        }

        /***
         * Adds a role to a user
         * 
         * @param {string} userId User we're modifying
         * @param {string} role The role we're adding to the user
         */
        this.AddUserRole = function(userId, role) {
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

            this.Save();
        }

        /***
         * Adds a role to a user
         * Ignores if the user doesn't exist

         * @param {string} userId User we're modifying
         * @param {string} role The role we're removing from the user
         */
        this.RemoveUserRole = function(userId, role) {
            if (typeof userId !== "string")
                throw new TypeError("userId expected string got " + (typeof userId).toString());
            if (typeof role !== "string")
                throw new TypeError("role expected string got " + (typeof role).toString());

            if (this.UserExists(userId))
                this.permissions.users[userId].roles = this.permissions.users[userId].roles.filter(i => i!=role);

            this.Save();
        }

        /***
         * Adds a role to a user
         * Ignores if the user doesn't exist

         * @param {string} userId User we're modifying
         * @param {string} role The role we're adding to the user
         */
        this.SetUserRoles = function(userId, roles) {
            if (typeof userId !== "string")
                throw new TypeError("userId expected string got " + (typeof userId).toString());
            if (Array.isArray(roles))
                throw new TypeError("role expected array got " + (typeof role).toString());

            if (this.UserExists(userId))
                this.permissions.users[userId].roles = [...roles];

            this.Save();
        }

        /***
         * Clear a user's roles (resets them)
         * Ignores if the user doesn't exist

         * @param {string} userId User we're modifying
         */
        this.ClearUserRoles = function(userId) {
            if (typeof userId !== "string")
                throw new TypeError("userId expected string got " + (typeof userId).toString());
            if (this.UserExists(userId))
                this.permissions.users[userId].roles = [];

            this.Save();
        }

        /***
         * Resets a user's permissions (just the permissions)
         * Ignores if the user doesn't exist

         * @param {string} userId User we're resetting
         */
        this.ClearUserPermissions = function(userId) {
            if (typeof userId !== "string")
                throw new TypeError("userId expected string got " + (typeof userId).toString());
            if (this.UserExists(userId))
                this.permissions.users[userId].permissions = {};

            this.Save();
        }

        /**
         * Removes a user from the list of users in permission storage
         * This clears their roles and permissions and removes any reference to them
         * @param {string} userId
         */
        this.DeleteUserPermissions = function(userId) {
            if (typeof userId !== "string")
                throw new TypeError("userId expected string got " + (typeof userId).toString());
            if (this.permissions.users[userId] != undefined)
                delete this.permissions.users[userId];

            this.Save();
        }

        //-------

        /**
         * Checks if a role is defined in the guild
         * @param {string} role
         * @returns {boolean}
         */
        this.RoleExists = function(role) {
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
        this.SetRolePermission = function(role, permission, value) {
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

            this.Save();               
        }

        /**
         * Removes a permission from a guild role
         * @param {string} role
         * @param {string} permission The permission we're removing
         * @param {boolean} includingChildren Whether or not we also remove all children of `permission` (rather than that explicit permission)
         * @returns {boolean} Removed permissions (false just means they were never set)
         */
        this.RemoveRolePermission = function(role, permission, includingChildren) {
            return this.RemovePermission(this.permissions.roles[role]?.permissions, permission, includingChildren);
        }

        /**
         * Rename a guild permission role
         * @param {string} currentName Role's current name
         * @param {string} newName Role's new name
         */
        this.RenameRole = function(currentName, newName) {
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

            this.Save();
        }

        /**
         * Delete a role from the guild
         * @param {string} role
         */
        this.DeleteRole = function(role) {
            if (this.RoleExists(role))
                delete this.permissions.roles[role];

            let users = Object.keys(this.permissions.users);
            for (var i = 0; i<users.length; i++) {
                // For each user, update the name
                this.permissions.users[users[i]].roles = this.permissions.users[users[i]].roles.filter(i => i!=role);
            }

            this.Save();
        }


        this.Save = function() {
            Bismo.SaveGuilds();
        }


        /**
         * Returns a stripped, file safe, version of this guild data
         */
        this.GetSterile = function() {
            // Strip runtime details and methods
            var stripped = {
                id: this.id,
                name: this.name,
                permissions: this.permissions,
                pluginData: this.pluginData,
                prefix: this.prefix,
                owner: this.owner,
                textChannel: this.textChannel,
            };

            // do other shit here idk
            return stripped;
        };


        return this;
    }
}

module.exports = GuildAccount;