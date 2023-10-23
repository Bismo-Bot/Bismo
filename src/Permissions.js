/*
	 __
	| / . /
	|=\   \  _ _   _
	|_/ | / / | \ |_| .... A Bad Rats playing bot
*/
const GuildConfig = require('./GuildConfig.js');

class Permissions {
	/**
	 * Check if a user has a particular Bismo permission in a guild
	 * @param {string|GuildConfig} guild - Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId - The user we're checking against
	 * @param {string} permission - The permission we're checking for
	 * @return {?boolean} Permission's value
	 */
	UserHasPermission(guild, userId, permission) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.UserHasPermission(userId, permission);
	}

	/**
	 * Set a permission for a user in a guild
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId User ID we're adding the permission to
	 * @param {string} permission The permission we're adding (Similar to Minecraft's permission system, wildcard/sub permissions allowed)
	 * @param {boolean} permissionValue What the permission will be set to
	 */
	SetUserPermission(guild, userId, permission, permissionValue) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.SetUserPermission(userId, permission, permissionValue);
	}

	/**
	 * Checks if the user exists in the permissions storage for the guild
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId
	 * @return {boolean}
	 */
	UserExists(guild, userId) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.UserExists(userId);
	}

	/***
	 * Adds a role to a user
	 * 
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId User we're modifying
	 * @param {string} role The role we're adding to the user
	 * @return {void}
	 */
	AddUserRole(guild, userId, role) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		guildConfig?.AddUserRole(userId, role);
	}

	/***
	 * Adds a role to a user
	 * Ignores if the user doesn't exist

	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId User we're modifying
	 * @param {string} role The role we're removing from the user
	 * @return {void}
	 */
	RemoveUserRole(guild, userId, role) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		guildConfig?.RemoveUserRole(userId, role);
	}

	/***
	 * Adds a role to a user
	 * Ignores if the user doesn't exist

	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId User we're modifying
	 * @param {string} role The role we're adding to the user
	 * @return {void}
	 */
	SetUserRoles(guild, userId, roles) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.SetUserRoles(userId, roles);
	}

	/***
	 * Clear a user's roles (resets them)
	 * Ignores if the user doesn't exist

	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId User we're modifying
	 * @return {void}
	 */
	ClearUserRoles(guild, userId) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.ClearUserRoles(userId);
	}

	/***
	 * Resets a user's permissions (just the permissions)
	 * Ignores if the user doesn't exist

	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId User we're resetting
	 * @return {void}
	 */
	ClearUserPermissions(guild, userId) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.ClearUserPermissions(userId);
	}

	/**
	 * Removes a user from the list of users in permission storage
	 * This clears their roles and permissions and removes any reference to them
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId
	 * @return {void}
	 */
	DeleteUserPermissions(guild, userId) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.DeleteUserPermissions(userId);
	}

	/**
	 * Checks if a role is defined in the guild
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} role
	 * @returns {boolean}
	 */
	RoleExists(guild, role) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.RoleExists(role);
	}

	/**
	 * Sets a permission in a guild role
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} role Role name
	 * @param {string} permission
	 * @param {boolean} value
	 */
	SetRolePermission(guild, role, permission, value) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.SetRolePermission(role, permission, value);
	}

	/**
	 * Removes a permission from a guild role
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} role
	 * @param {string} permission The permission we're removing
	 * @param {boolean} includingChildren Whether or not we also remove all children of `permission` (rather than that explicit permission)
	 * @returns {boolean} Removed permissions (false just means they were never set)
	 */
	RemoveRolePermission(guild, role, permission, includingChildren) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.RemoveRolePermission(role, permission, includingChildren);
	}

	/**
	 * Rename a guild permission role
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} currentName Role's current name
	 * @param {string} newName Role's new name
	 * @return {void}
	 */
	RenameRole(guild, currentName, newName) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.RenameRole(currentName, newName);
	}

	/**
	 * Delete a role from the guild
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} role
	 * @return {void}
	 */
	DeleteRole(guild, role) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.DeleteRole(role);
	}

	// Raw permissions
	// I do not know why this is included, especially since all you have to do is grab the GuildConfig, but here it

	/**
	 * Get raw user permissions
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId
	 * @return {object} permissions dictionary (`{ "bismo.sample.permission": false }`)
	 */
	GetRawUserPermissions(guild, userId) {
		if (typeof userId !== "string")
			throw new TypeError("userId expected string got " + (typeof userId).toString());
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		if (guildConfig?.permissions?.users == undefined)
			return undefined;
		return guildConfig.permissions.users[userId]?.permissions;
	}
	/**
	 * Get raw user roles
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {string} userId
	 * @return {object} permissions dictionary (["RoleName","AnotherOne"])
	 */
	GetRawUserRoles(guild, userId) {
		if (typeof userId !== "string")
			throw new TypeError("userId expected string got " + (typeof userId).toString());
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		if (guildConfig?.permissions?.users == undefined)
			return undefined;
		return guildConfig.permissions.users[userId]?.roles;
	}
	/**
	 * Get raw role
	 * @param {string|GuildConfig} guild Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @param {sting} role
	 * @return {object} permissions dictionary (`{ name: RoleName, permissions: {} }`)
	 */
	GetRawRole(guild, role) {
		if (typeof role !== "string")
			throw new TypeError("role expected string got " + (typeof role).toString());
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		if (guildConfig?.permissions?.roles == undefined)
			return undefined;
		return guildConfig.permissions.roles[role];
	}
	/**
	 * Get raw permissions
	 * @param {string|GuildConfig} guildId Either the GuildConfig or string represent thing guild's Id. Permissions are unique for each guild.
	 * @return {object} permissions dictionary (`{ roles: {}, users: {} }`)
	 */
	GetRaw(guild) {
		let guildConfig = global.Bismo.GetGuildConfig(guild);
		return guildConfig?.permissions;
	}
}

module.exports = Permissions;