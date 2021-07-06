/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/


// GuildData 'class'


class GuildAccount {
    constructor(data) {

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
            this.permissions == data.permissions; // Roles provided

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


        this.UserHasPermission = function(userID, permission) {
            /*
                First we do input checks
                userID should be a string that represents a ... userID (discord user ID)
                permission should also be a string that represents a permission you're checking for
    
                ----------------------------------------------------------
    
                We first check the user's permissions (not their roles)
                We go opposite of inheritance (so start at the top and work our way down)
                This saves processing power as we start with what will rule supreme anyways
    
                1) User permissions
                2) Roles -> top inheritance
    
                Note: this does not work on complicated inheritance setups, so just don't do that :)
                Right now users can inherit from roles, obv., but roles inheriting from other roles is questionable and I don't wanna fix it right now
    
            */
            var perm = this.CheckForPermission(this.permissons.users[userID], permission);

            if (typeof perm === "boolean")
                return perm;

            // User does not have this permission explicitly set, so check their roles
            function getRole(name) {
                if (typeof name == "string") {
                    // they gave us the name :p
                    name = name.toLowerCase();
                    let keys = Object.keys(this.permissons.roles);
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
                let parents = getParent(this.permissons.users[userID].roles[i], []);
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

        this.GetSterial = function() {
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

module.exports = function(client) {
	Client = client;
	return GuildAccount;
}