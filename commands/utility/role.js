const {
    SlashCommandBuilder,
    PermissionsBitField,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    AttachmentBuilder,
    RoleSelectMenuBuilder
} = require('discord.js');
const fs = require('node:fs/promises');
const path = require('node:path');

// Define permission presets
const permissionPresets = {
    mod: {
        name: 'Moderator',
        permissions: [
            PermissionsBitField.Flags.ModerateMembers, // Timeout
            PermissionsBitField.Flags.KickMembers,
            PermissionsBitField.Flags.BanMembers,
            PermissionsBitField.Flags.ManageNicknames,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.ManageThreads,
            PermissionsBitField.Flags.PrioritySpeaker,
            PermissionsBitField.Flags.MuteMembers,
            PermissionsBitField.Flags.MoveMembers,
            PermissionsBitField.Flags.DeafenMembers,
        ]
    },
    mod_plus: {
        name: 'Moderator+',
        permissions: [
            PermissionsBitField.Flags.ModerateMembers,
            PermissionsBitField.Flags.KickMembers,
            PermissionsBitField.Flags.BanMembers,
            PermissionsBitField.Flags.ManageNicknames,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.ManageThreads,
            PermissionsBitField.Flags.PrioritySpeaker,
            PermissionsBitField.Flags.MuteMembers,
            PermissionsBitField.Flags.MoveMembers,
            PermissionsBitField.Flags.DeafenMembers,
            PermissionsBitField.Flags.ManageGuild,
            PermissionsBitField.Flags.ManageRoles,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ViewAuditLog,
        ]
    },
    admin: {
        name: 'Administrator',
        permissions: [PermissionsBitField.Flags.Administrator]
    }
};

// For the role manage subcommand
const rolePermissions = {
    view_channel: PermissionsBitField.Flags.ViewChannel,
    change_nickname: PermissionsBitField.Flags.ChangeNickname,
    send_messages: PermissionsBitField.Flags.SendMessages,
    create_public_threads: PermissionsBitField.Flags.CreatePublicThreads,
    create_private_threads: PermissionsBitField.Flags.CreatePrivateThreads,
    send_messages_in_threads: PermissionsBitField.Flags.SendMessagesInThreads,
    embed_links: PermissionsBitField.Flags.EmbedLinks,
    attach_files: PermissionsBitField.Flags.AttachFiles,
    add_reactions: PermissionsBitField.Flags.AddReactions,
    use_external_emojis: PermissionsBitField.Flags.UseExternalEmojis,
    manage_threads: PermissionsBitField.Flags.ManageThreads,
    send_polls: PermissionsBitField.Flags.SendPolls,
    use_app_commands: PermissionsBitField.Flags.UseApplicationCommands, // For slash commands & voice statuses
    use_external_stickers: PermissionsBitField.Flags.UseExternalStickers
};

const permissionChoices = [
    { name: 'Enable', value: 'enable' },
    { name: 'Disable', value: 'disable' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('manage server roles (create, preset, list, settings, etc.)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .setDMPermission(false)

        // --- Create Subcommand (Permissions option removed) ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('creates a new role with custom options')
                .addStringOption(option => option.setName('name').setDescription('the name for the new role').setRequired(true))
                .addStringOption(option => option.setName('color').setDescription('hex color code (e.g. #ff0000)').setRequired(false))
                .addBooleanOption(option => option.setName('hoist').setDescription('display role members separately in member list').setRequired(false))
                .addBooleanOption(option => option.setName('mentionable').setDescription('allow anyone to @mention this role').setRequired(false))
        )

        // --- Preset Subcommand ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('preset')
                .setDescription('creates a role based on a predefined permission preset')
                .addStringOption(option =>
                    option.setName('preset_name')
                        .setDescription('select the permission preset')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Moderator', value: 'mod' },
                            { name: 'Moderator+', value: 'mod_plus' },
                            { name: 'Administrator', value: 'admin' }
                        ))
                .addStringOption(option =>
                    option.setName('role_name')
                        .setDescription('optional custom name for the role (defaults to preset name)')
                        .setRequired(false))
        )

        // --- List Subcommand ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('lists all roles in the server')
        )

        // --- Color Subcommand ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('color')
                .setDescription('creates ~40 color roles')
        )

        // --- Scrape Subcommand ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('scrape')
                .setDescription('scrapes server roles into a json file.')
        )

        // --- Toggle Subcommand ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('adds or removes a specific role from a user.')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('the role to toggle.')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('the user to toggle the role for.')
                        .setRequired(true))
        )

        // --- Manage Subcommand ---
        .addSubcommand(subcommand => {
            subcommand
                .setName('manage')
                .setDescription('Modify settings and permissions for an existing role.')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to modify.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('rename')
                        .setDescription('rename the role'))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Hex color code (e.g., #FF0000)'))
                .addBooleanOption(option =>
                    option.setName('hoisted')
                        .setDescription('Display role separately in member list?'))
                .addBooleanOption(option =>
                    option.setName('mentionable')
                        .setDescription('Allow anyone to @mention this role?'));

            // Add individual permission options
            for (const [permName, flagBit] of Object.entries(rolePermissions)) {
                subcommand.addStringOption(option =>
                    option.setName(permName)
                        .setDescription(`Set permission: ${permName.replace(/_/g, ' ')}`)
                        .addChoices(...permissionChoices)
                );
            }

            return subcommand;
        })

        // --- Clear Subcommand ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('clear all permissions from a role or multiple roles')
                .addRoleOption(option =>
                    option.setName('target')
                        .setDescription('the role to clear permissions from (leave empty to select multiple)')
                        .setRequired(false))
        )

        // --- Delete Subcommand ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('delete a role or multiple roles from the server')
                .addRoleOption(option =>
                    option.setName('target')
                        .setDescription('the role to delete (leave empty to select multiple roles)')
                        .setRequired(false))
        ),

    // --- Execute Function ---
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: 'you do not have permission to manage server roles.',
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // ============================
        // === CREATE Subcommand (permissions preset logic removed) ===
        // ============================
        if (subcommand === 'create') {
            const roleName = interaction.options.getString('name');
            const color = interaction.options.getString('color');
            const hoisted = interaction.options.getBoolean('hoist');
            const mentionable = interaction.options.getBoolean('mentionable');

            if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
                return interaction.editReply({ content: 'Invalid hex color format.', flags: MessageFlags.Ephemeral });
            }

            try {
                const roleOptions = {
                    name: roleName,
                    color: color !== null ? color : undefined, // Only include if provided
                    hoist: hoisted !== null ? hoisted : false, // Default false
                    mentionable: mentionable !== null ? mentionable : false, // Default false
                    permissions: [] // Default no permissions for 'create'
                };

                const targetRole = await interaction.guild.roles.create(roleOptions);
                console.log(`Created role: ${targetRole.name} (${targetRole.id}) with options:`, roleOptions);
                await interaction.editReply({ content: `Successfully created role: <@&${targetRole.id}>`, flags: MessageFlags.Ephemeral });

            } catch (error) {
                console.error(`Error creating role "${roleName}":`, error);
                await interaction.editReply({ content: 'There was an error trying to create the role.', flags: MessageFlags.Ephemeral });
            }
        }
        // ============================
        // === PRESET Subcommand =====
        // ============================
        else if (subcommand === 'preset') {
            const presetKey = interaction.options.getString('preset_name');
            const customName = interaction.options.getString('role_name'); // Optional

            const preset = permissionPresets[presetKey];
            if (!preset) {
                // Should not happen due to choices, but good safety check
                return interaction.editReply({ content: 'Invalid preset selected.', flags: MessageFlags.Ephemeral });
            }

            const roleName = customName || preset.name; // Use custom name or default preset name

            try {
                const roleOptions = {
                    name: roleName,
                    permissions: preset.permissions,
                    hoist: true, // Default hoisted for presets
                    mentionable: true // Default mentionable for presets
                    // Color can be added later or left as default
                };

                const targetRole = await interaction.guild.roles.create(roleOptions);
                console.log(`Created preset role: ${targetRole.name} (${targetRole.id}) using preset "${presetKey}" with options:`, roleOptions);
                await interaction.editReply({ content: `Successfully created role <@&${targetRole.id}> using the "${preset.name}" preset.`, flags: MessageFlags.Ephemeral });

            } catch (error) {
                console.error(`Error creating preset role "${roleName}" (preset: ${presetKey}):`, error);
                await interaction.editReply({ content: 'There was an error trying to create the preset role.', flags: MessageFlags.Ephemeral });
            }
        }
        // ============================
        // === LIST Subcommand =======
        // ============================
        else if (subcommand === 'list') {
            try {
                // Fetch roles, sort by position descending (highest first)
                const roles = interaction.guild.roles.cache
                    .sort((a, b) => b.position - a.position)
                    // Format as markdown list items
                    .map(role => `- ${role.toString()}`);

                // Remove @everyone if it's included (it usually has position 0)
                const roleList = roles.filter(listItem => !listItem.includes('<@&' + interaction.guild.id + '>'));

                if (roleList.length === 0) {
                    return interaction.editReply({ content: 'There are no roles in this server (besides @everyone).', flags: MessageFlags.Ephemeral });
                }

                const roleString = roleList.join('\n');

                // Handle potential message length limit (2000 characters)
                if (roleString.length <= 2000) {
                    await interaction.editReply({
                        content: `**Server Roles (${roleList.length}):**\n${roleString}`,
                        flags: MessageFlags.Ephemeral,
                        allowedMentions: { roles: [] } // Prevent pinging roles
                    });
                } else {
                    // If too long, send as a file or use pagination (simple file approach here)
                    const attachment = new AttachmentBuilder(Buffer.from(roleList.join('\n')), { name: 'server-roles.txt' });
                    await interaction.editReply({
                        content: `There are too many roles (${roleList.length}) to display directly. Here is a list as a file:`,
                        files: [attachment],
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (error) {
                console.error('Error listing roles:', error);
                await interaction.editReply({ content: 'An error occurred while trying to list the roles.', flags: MessageFlags.Ephemeral });
            }
        }
        // ============================
        // === COLOR Subcommand =====
        // ============================
        else if (subcommand === 'color') {
            const filePath = path.join(__dirname, '../../colorRoles.json'); // Path to source file
            let createdCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            let rolesToCreate = [];
            const createdRoleIds = [];

            try {
                const data = await fs.readFile(filePath, 'utf8');
                rolesToCreate = JSON.parse(data);
            } catch (error) {
                console.error('Error reading/parsing colorRoles.json:', error);
                return interaction.editReply({ content: 'Error reading/parsing `colorRoles.json`. Make sure file exists & is valid JSON.', flags: MessageFlags.Ephemeral });
            }

            if (!Array.isArray(rolesToCreate)) {
                return interaction.editReply({ content: '`colorRoles.json` does not contain a valid JSON array.', flags: MessageFlags.Ephemeral });
            }

            const existingRoleNames = interaction.guild.roles.cache.map(r => r.name.toLowerCase());

            for (const roleData of rolesToCreate) {
                if (!roleData.name || !roleData.color) {
                    console.warn(`Skipping invalid entry: ${JSON.stringify(roleData)}`);
                    errorCount++; continue;
                }
                if (existingRoleNames.includes(roleData.name.toLowerCase())) {
                    console.log(`Role "${roleData.name}" exists. Skipping.`);
                    skippedCount++; continue;
                }
                if (!/^#[0-9A-F]{6}$/i.test(roleData.color)) {
                    console.warn(`Skipping "${roleData.name}" invalid color: ${roleData.color}`);
                    errorCount++; continue;
                }
                try {
                    const newRole = await interaction.guild.roles.create({
                        name: roleData.name, color: roleData.color,
                        permissions: [], hoist: false
                    });
                    console.log(`Created role: ${newRole.name} (${newRole.id})`);
                    createdRoleIds.push(newRole.id);
                    createdCount++;
                } catch (error) {
                    console.error(`Failed to create role "${roleData.name}":`, error);
                    errorCount++;
                }
            }

            let replyMessage = `Color role creation finished.\n- Created: ${createdCount}\n- Existed: ${skippedCount}\n- Failed: ${errorCount}`;
            const components = [];
            if (createdCount > 0) {
                const deleteButtonId = `delete-color-roles-${interaction.id}`;
                const deleteButton = new ButtonBuilder().setCustomId(deleteButtonId).setLabel('Delete Created Roles').setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder().addComponents(deleteButton);
                components.push(row);

                const reply = await interaction.editReply({ content: replyMessage, components: components, flags: MessageFlags.Ephemeral });
                const collectorFilter = i => i.customId === deleteButtonId && i.user.id === interaction.user.id;
                try {
                    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, filter: collectorFilter, time: 60_000 });
                    collector.on('collect', async i => {
                        await i.deferUpdate();
                        let deletedCount = 0, deleteErrorCount = 0;
                        await i.editReply({ content: `Deleting ${createdRoleIds.length} created roles...`, components: [] });
                        for (const roleId of createdRoleIds) {
                            try {
                                await interaction.guild.roles.delete(roleId, 'Undo color role creation');
                                deletedCount++;
                            } catch (delErr) { console.error(`Failed delete role ${roleId}:`, delErr); deleteErrorCount++; }
                        }
                        await i.editReply({ content: `Deletion finished. Deleted: ${deletedCount}. Failed: ${deleteErrorCount}.`, components: [] });
                        collector.stop();
                    });
                    collector.on('end', collected => {
                        if (collected.size === 0) {
                            deleteButton.setDisabled(true);
                            interaction.editReply({ content: replyMessage + '\n(Delete button timed out)', components: [row] }).catch(() => { });
                        }
                    });
                } catch (collectorError) {
                    console.error("Collector error:", collectorError);
                    await interaction.editReply({ content: replyMessage + '\n(Could not set up delete button)', components: [] });
                }
            } else {
                await interaction.editReply({ content: replyMessage, components: [] });
            }
        }
        // ============================
        // === SCRAPE Subcommand ====
        // ============================
        else if (subcommand === 'scrape') {
            try {
                const roles = interaction.guild.roles.cache;
                // Map ALL roles to name and color
                const allRolesData = roles.map(role => ({
                    name: role.name,
                    color: role.hexColor
                }));

                // Convert ALL roles data to JSON string and then Buffer
                const jsonData = JSON.stringify(allRolesData, null, 4); // Use allRolesData
                const buffer = Buffer.from(jsonData, 'utf-8');

                // Create the attachment
                const attachment = new AttachmentBuilder(buffer, { name: 'all_server_roles.json' }); // Changed filename

                // Send the file back to the user
                await interaction.editReply({
                    content: `Successfully scraped ${allRolesData.length} roles. Here is the JSON file:`, // Update count source
                    files: [attachment],
                    flags: MessageFlags.Ephemeral
                });

            } catch (error) {
                console.error('Error scraping roles:', error);
                await interaction.editReply({ content: 'There was an error trying to scrape roles.', flags: MessageFlags.Ephemeral });
            }
        }
        // ============================
        // === TOGGLE Subcommand ====
        // ============================
        else if (subcommand === 'toggle') {
            const roleToToggle = interaction.options.getRole('role');
            const targetUser = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null); // Fetch member object

            if (!member) {
                return interaction.editReply({ content: `Could not find user ${targetUser.tag} in this server.`, flags: MessageFlags.Ephemeral });
            }

            // Role hierarchy check (cannot assign roles higher than bot's highest role)
            if (roleToToggle.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.editReply({ content: `I cannot manage the role ${roleToToggle.name} because it's higher than or equal to my highest role.`, flags: MessageFlags.Ephemeral });
            }
            // Optional: Check if command user's highest role is high enough
            if (roleToToggle.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: `You cannot manage the role ${roleToToggle.name} because it's higher than or equal to your highest role.`, flags: MessageFlags.Ephemeral });
            }

            try {
                if (member.roles.cache.has(roleToToggle.id)) {
                    // Role exists, remove it
                    await member.roles.remove(roleToToggle.id);
                    await interaction.editReply({ content: `Removed role <@&${roleToToggle.id}> from ${member.user.tag}.`, flags: MessageFlags.Ephemeral });
                } else {
                    // Role doesn't exist, add it
                    await member.roles.add(roleToToggle.id);
                    await interaction.editReply({ content: `Added role <@&${roleToToggle.id}> to ${member.user.tag}.`, flags: MessageFlags.Ephemeral });
                }
            } catch (error) {
                console.error(`Error toggling role ${roleToToggle.name} for ${member.user.tag}:`, error);
                await interaction.editReply({ content: `Failed to toggle role <@&${roleToToggle.id}>. Check my permissions and role hierarchy.`, flags: MessageFlags.Ephemeral });
            }
        }
        // ============================
        // === MANAGE Subcommand ====
        // ============================
        else if (subcommand === 'manage') {
            const targetRole = interaction.options.getRole('role');
            const newName = interaction.options.getString('rename');
            const color = interaction.options.getString('color');
            const hoisted = interaction.options.getBoolean('hoisted');
            const mentionable = interaction.options.getBoolean('mentionable');

            // Role hierarchy checks
            if (targetRole.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.editReply({ content: `I cannot manage the role ${targetRole.name} because it's higher than or equal to my highest role.`, flags: MessageFlags.Ephemeral });
            }

            if (interaction.user.id !== interaction.guild.ownerId &&
                targetRole.position >= interaction.member.roles.highest.position) {
                return interaction.editReply({ content: `You cannot manage the role ${targetRole.name} because it's higher than or equal to your highest role.`, flags: MessageFlags.Ephemeral });
            }

            if (targetRole.id === interaction.guild.id) {
                return interaction.editReply({ content: `Cannot modify the @everyone role with this command.`, flags: MessageFlags.Ephemeral });
            }

            try {
                // Prepare role edit options
                const roleOptions = {};
                let permissionsModified = false;

                // Handle basic settings
                if (newName !== null) roleOptions.name = newName;
                if (color !== null) {
                    if (!/^#[0-9A-F]{6}$/i.test(color)) {
                        return interaction.editReply({ content: 'Invalid hex color format. Use format #RRGGBB (e.g., #FF0000 for red).', flags: MessageFlags.Ephemeral });
                    }
                    roleOptions.color = color;
                }

                if (hoisted !== null) roleOptions.hoist = hoisted;
                if (mentionable !== null) roleOptions.mentionable = mentionable;

                // Get current permissions to modify
                let currentPermissions = new PermissionsBitField(targetRole.permissions);

                // Process each permission individually
                for (const [permName, flagBit] of Object.entries(rolePermissions)) {
                    const setting = interaction.options.getString(permName);

                    if (setting !== null) {
                        permissionsModified = true;

                        if (setting === 'enable') {
                            currentPermissions.add(flagBit);
                        } else if (setting === 'disable') {
                            currentPermissions.remove(flagBit);
                        }
                    }
                }

                // Apply permission changes if any were made
                if (permissionsModified) {
                    roleOptions.permissions = currentPermissions;
                }

                // Check if any changes are being made
                if (Object.keys(roleOptions).length === 0) {
                    return interaction.editReply({ content: 'No changes specified for the role.', flags: MessageFlags.Ephemeral });
                }

                // Edit the role
                await targetRole.edit(roleOptions, `Modified by ${interaction.user.tag} using role manage command`);

                // Prepare confirmation message
                let changes = [];
                if (newName !== null) changes.push(`name: ${newName}`);
                if (color !== null) changes.push(`color: ${color}`);
                if (hoisted !== null) changes.push(`displayed separately: ${hoisted ? 'Yes' : 'No'}`);
                if (mentionable !== null) changes.push(`mentionable: ${mentionable ? 'Yes' : 'No'}`);
                if (permissionsModified) changes.push('permissions updated');

                await interaction.editReply({ content: `Successfully updated role <@&${targetRole.id}> (${changes.join(', ')}).`, flags: MessageFlags.Ephemeral });

            } catch (error) {
                console.error(`Error modifying role ${targetRole.name} (${targetRole.id}):`, error);
                await interaction.editReply({ content: 'An error occurred while modifying the role. Check my permissions and role hierarchy.', flags: MessageFlags.Ephemeral });
            }
        }
        // ============================
        // === CLEAR Subcommand ====
        // ============================
        else if (subcommand === 'clear') {
            const targetRole = interaction.options.getRole('target');

            // If a role was provided directly
            if (targetRole) {
                // Role hierarchy checks
                if (targetRole.position >= interaction.guild.members.me.roles.highest.position) {
                    return interaction.editReply({ content: `I cannot modify the role ${targetRole.name} because it's higher than or equal to my highest role.`, flags: MessageFlags.Ephemeral });
                }

                if (interaction.user.id !== interaction.guild.ownerId &&
                    targetRole.position >= interaction.member.roles.highest.position) {
                    return interaction.editReply({ content: `You cannot modify the role ${targetRole.name} because it's higher than or equal to your highest role.`, flags: MessageFlags.Ephemeral });
                }

                if (targetRole.id === interaction.guild.id) {
                    return interaction.editReply({ content: `Cannot modify the @everyone role with this command.`, flags: MessageFlags.Ephemeral });
                }

                try {
                    // Edit the role to have no permissions
                    await targetRole.edit({
                        permissions: []
                    }, `Permissions cleared by ${interaction.user.tag}`);

                    await interaction.editReply({ content: `Successfully cleared all permissions from the role <@&${targetRole.id}>.`, flags: MessageFlags.Ephemeral });
                } catch (error) {
                    console.error(`Error clearing permissions for role ${targetRole.name} (${targetRole.id}):`, error);
                    await interaction.editReply({ content: 'An error occurred while clearing permissions. Check my permissions and role hierarchy.', flags: MessageFlags.Ephemeral });
                }
            }
            // If no role was provided, show a role select menu
            else {
                try {
                    // Create a role select menu
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new RoleSelectMenuBuilder()
                                .setCustomId('role-clear-menu')
                                .setPlaceholder('Select roles to clear permissions from')
                                .setMinValues(1)
                                .setMaxValues(10) // Allow up to 10 roles at once
                        );

                    // Send message with the role select menu
                    const response = await interaction.editReply({
                        content: 'Select the roles you want to clear all permissions from:',
                        components: [row],
                        flags: MessageFlags.Ephemeral
                    });

                    // Create a collector for the select menu interaction
                    const collector = response.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 60000, // 1 minute timeout
                        componentType: ComponentType.RoleSelect
                    });

                    collector.on('collect', async i => {
                        await i.deferUpdate();
                        const selectedRoles = i.values;

                        if (selectedRoles.length === 0) {
                            await interaction.editReply({
                                content: 'No roles were selected.',
                                components: [],
                                flags: MessageFlags.Ephemeral
                            });
                            return collector.stop();
                        }

                        let successCount = 0;
                        let errorCount = 0;
                        let skippedCount = 0;
                        let errorRoles = [];
                        let skippedRoles = [];

                        // Process each selected role
                        for (const roleId of selectedRoles) {
                            const role = interaction.guild.roles.cache.get(roleId);

                            if (!role) {
                                errorCount++;
                                errorRoles.push(`Unknown Role`);
                                continue;
                            }

                            // Role hierarchy checks
                            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                                skippedCount++;
                                skippedRoles.push(role.name);
                                continue;
                            }

                            if (interaction.user.id !== interaction.guild.ownerId &&
                                role.position >= interaction.member.roles.highest.position) {
                                skippedCount++;
                                skippedRoles.push(role.name);
                                continue;
                            }

                            if (role.id === interaction.guild.id) {
                                skippedCount++;
                                skippedRoles.push('@everyone');
                                continue;
                            }

                            try {
                                // Clear the role's permissions
                                await role.edit({
                                    permissions: []
                                }, `Permissions cleared by ${interaction.user.tag}`);

                                successCount++;
                            } catch (error) {
                                console.error(`Error clearing permissions for role ${role.name} (${role.id}):`, error);
                                errorCount++;
                                errorRoles.push(role.name);
                            }
                        }

                        // Prepare result message
                        let resultMessage = `Results of clearing permissions:\n✅ Successfully cleared: ${successCount} role(s)`;

                        if (skippedCount > 0) {
                            resultMessage += `\n⚠️ Skipped due to hierarchy: ${skippedCount} role(s) [${skippedRoles.join(', ')}]`;
                        }

                        if (errorCount > 0) {
                            resultMessage += `\n❌ Failed to clear: ${errorCount} role(s) [${errorRoles.join(', ')}]`;
                        }

                        // Update the message with results
                        await interaction.editReply({
                            content: resultMessage,
                            components: [], // Remove the select menu
                            flags: MessageFlags.Ephemeral
                        });

                        collector.stop();
                    });

                    collector.on('end', (collected, reason) => {
                        if (reason === 'time' && collected.size === 0) {
                            interaction.editReply({
                                content: 'Role selection timed out. No permissions were cleared.',
                                components: [],
                                flags: MessageFlags.Ephemeral
                            }).catch(() => { });
                        }
                    });
                } catch (error) {
                    console.error('Error creating role select menu:', error);
                    await interaction.editReply({ content: 'An error occurred while setting up the role selection. Please try again.', flags: MessageFlags.Ephemeral });
                }
            }
        }
        // ============================
        // === DELETE Subcommand ====
        // ============================
        else if (subcommand === 'delete') {
            const targetRole = interaction.options.getRole('target');

            // If a role was provided directly
            if (targetRole) {
                // Role hierarchy checks
                if (targetRole.position >= interaction.guild.members.me.roles.highest.position) {
                    return interaction.editReply({ content: `I cannot delete the role ${targetRole.name} because it's higher than or equal to my highest role.`, flags: MessageFlags.Ephemeral });
                }

                if (interaction.user.id !== interaction.guild.ownerId &&
                    targetRole.position >= interaction.member.roles.highest.position) {
                    return interaction.editReply({ content: `You cannot delete the role ${targetRole.name} because it's higher than or equal to your highest role.`, flags: MessageFlags.Ephemeral });
                }

                if (targetRole.id === interaction.guild.id) {
                    return interaction.editReply({ content: `Cannot delete the @everyone role.`, flags: MessageFlags.Ephemeral });
                }

                try {
                    // Store role name for confirmation message
                    const roleName = targetRole.name;
                    const roleId = targetRole.id;

                    // Delete the role
                    await targetRole.delete(`Deleted by ${interaction.user.tag}`);

                    await interaction.editReply({ content: `Successfully deleted the role "${roleName}" (was <@&${roleId}>).`, flags: MessageFlags.Ephemeral });
                } catch (error) {
                    console.error(`Error deleting role ${targetRole.name} (${targetRole.id}):`, error);
                    await interaction.editReply({ content: 'An error occurred while deleting the role. Check my permissions and role hierarchy.', flags: MessageFlags.Ephemeral });
                }
            }
            // If no role was provided, show a role select menu
            else {
                try {
                    // Create a role select menu
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new RoleSelectMenuBuilder()
                                .setCustomId('role-delete-menu')
                                .setPlaceholder('Select roles to delete')
                                .setMinValues(1)
                                .setMaxValues(10) // Allow up to 10 roles at once
                        );

                    // Add a confirmation button
                    const confirmRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('confirm-delete')
                                .setLabel('Confirm Deletion')
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId('cancel-delete')
                                .setLabel('Cancel')
                                .setStyle(ButtonStyle.Secondary)
                        );

                    // Send message with the role select menu
                    const response = await interaction.editReply({
                        content: 'Select the roles you want to delete:',
                        components: [row],
                        flags: MessageFlags.Ephemeral
                    });

                    // Create collectors
                    const roleCollector = response.createMessageComponentCollector({
                        filter: i => i.customId === 'role-delete-menu' && i.user.id === interaction.user.id,
                        time: 60000 // 1 minute timeout
                    });

                    let selectedRoles = [];
                    let selectedRoleObjects = [];

                    roleCollector.on('collect', async i => {
                        await i.deferUpdate();
                        selectedRoles = i.values;
                        selectedRoleObjects = selectedRoles.map(id => interaction.guild.roles.cache.get(id)).filter(r => r);

                        // Check if any roles were selected
                        if (selectedRoles.length === 0) {
                            await interaction.editReply({
                                content: 'No roles were selected.',
                                components: [],
                                flags: MessageFlags.Ephemeral
                            });
                            return roleCollector.stop();
                        }

                        // Show confirmation with selected role names
                        const roleNames = selectedRoleObjects.map(r => `"${r?.name || 'unknown'}"`).join(', ');
                        await interaction.editReply({
                            content: `You are about to delete ${selectedRoles.length} role(s): ${roleNames}\n⚠️ **This action cannot be undone!** Are you sure?`,
                            components: [confirmRow],
                            flags: MessageFlags.Ephemeral
                        });

                        // Stop the role collector as we now need confirmation
                        roleCollector.stop('roles_selected');
                    });

                    // When roles are selected, start confirmation collector
                    roleCollector.on('end', (collected, reason) => {
                        if (reason === 'time') {
                            interaction.editReply({
                                content: 'Role selection timed out. No roles were deleted.',
                                components: [],
                                flags: MessageFlags.Ephemeral
                            }).catch(() => { });
                        }
                        else if (reason === 'roles_selected') {
                            // Start the confirmation collector
                            const confirmCollector = response.createMessageComponentCollector({
                                filter: i =>
                                    (i.customId === 'confirm-delete' || i.customId === 'cancel-delete') &&
                                    i.user.id === interaction.user.id,
                                time: 30000, // 30 seconds to confirm
                                max: 1 // Only collect one interaction
                            });

                            confirmCollector.on('collect', async i => {
                                await i.deferUpdate();

                                // Handle cancel
                                if (i.customId === 'cancel-delete') {
                                    await interaction.editReply({
                                        content: 'Role deletion cancelled.',
                                        components: [],
                                        flags: MessageFlags.Ephemeral
                                    });
                                    return;
                                }

                                // Handle confirm
                                if (i.customId === 'confirm-delete') {
                                    await interaction.editReply({
                                        content: `Deleting ${selectedRoles.length} roles... This may take a moment.`,
                                        components: [],
                                        flags: MessageFlags.Ephemeral
                                    });

                                    let successCount = 0;
                                    let errorCount = 0;
                                    let skippedCount = 0;
                                    let errorRoles = [];
                                    let skippedRoles = [];

                                    // Process each selected role
                                    for (const role of selectedRoleObjects) {
                                        // Skip if role no longer exists
                                        if (!role) {
                                            errorCount++;
                                            errorRoles.push("Unknown Role");
                                            continue;
                                        }

                                        // Role hierarchy checks
                                        if (role.position >= interaction.guild.members.me.roles.highest.position) {
                                            skippedCount++;
                                            skippedRoles.push(role?.name || 'unknown');
                                            continue;
                                        }

                                        if (interaction.user.id !== interaction.guild.ownerId &&
                                            role.position >= interaction.member.roles.highest.position) {
                                            skippedCount++;
                                            skippedRoles.push(role?.name || 'unknown');
                                            continue;
                                        }

                                        if (role.id === interaction.guild.id) {
                                            skippedCount++;
                                            skippedRoles.push('@everyone');
                                            continue;
                                        }

                                        try {
                                            // Delete the role
                                            const roleName = role.name;
                                            await role.delete(`Deleted by ${interaction.user.tag}`);
                                            successCount++;
                                        } catch (error) {
                                            console.error(`Error deleting role ${role?.name || 'unknown'} (${role?.id || 'unknown'}):`, error);
                                            errorCount++;
                                            errorRoles.push(role?.name || 'Unknown Role');
                                        }
                                    }

                                    // Prepare result message
                                    let resultMessage = `Results of role deletion:\n✅ Successfully deleted: ${successCount} role(s)`;

                                    if (skippedCount > 0) {
                                        resultMessage += `\n⚠️ Skipped due to hierarchy: ${skippedCount} role(s) [${skippedRoles.join(', ')}]`;
                                    }

                                    if (errorCount > 0) {
                                        resultMessage += `\n❌ Failed to delete: ${errorCount} role(s) [${errorRoles.join(', ')}]`;
                                    }

                                    // Update with the final results
                                    await interaction.editReply({
                                        content: resultMessage,
                                        components: [],
                                        flags: MessageFlags.Ephemeral
                                    });
                                }
                            });

                            confirmCollector.on('end', (collected, reason) => {
                                if (reason === 'time' && collected.size === 0) {
                                    interaction.editReply({
                                        content: 'Confirmation timed out. No roles were deleted.',
                                        components: [],
                                        flags: MessageFlags.Ephemeral
                                    }).catch(() => { });
                                }
                            });
                        }
                    });

                } catch (error) {
                    console.error('Error creating role deletion menu:', error);
                    await interaction.editReply({ content: 'An error occurred while setting up the role deletion menu. Please try again.', flags: MessageFlags.Ephemeral });
                }
            }
        }
    },
}; 