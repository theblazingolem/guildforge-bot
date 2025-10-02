const { SlashCommandBuilder, ChannelType, PermissionsBitField, MessageFlags } = require('discord.js');
const { setTimeout: wait } = require('node:timers/promises'); // For delays

const DIVIDER_CHOICES = [
    { name: 'Line │', value: '│' },
    { name: 'Dot ・', value: '・' },
    { name: 'Custom', value: 'custom' },
    { name: 'Undo', value: 'undo' },
];

// Channel types to potentially rename (exclude categories, system channels etc.)
const RENAMEABLE_CHANNEL_TYPES = [
    ChannelType.GuildText,
    ChannelType.GuildVoice,
    ChannelType.GuildAnnouncement,
    ChannelType.GuildStageVoice,
    ChannelType.GuildForum,
    ChannelType.GuildMedia,
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('divider')
        .setDescription('Adds a divider prefix to channel names within a specific scope.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .setDMPermission(false)

        // --- Server Subcommand --- 
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Apply divider to all applicable channels in the server.')
                .addStringOption(option =>
                    option.setName('divider_type')
                        .setDescription('The divider symbol to use.')
                        .setRequired(true)
                        .addChoices(...DIVIDER_CHOICES))
                .addStringOption(option =>
                    option.setName('custom_divider')
                        .setDescription('Your custom divider symbol (if type is Custom).')
                        .setRequired(false)))

        // --- Category Subcommand --- 
        .addSubcommand(subcommand =>
            subcommand
                .setName('category')
                .setDescription('Apply divider to applicable channels within a specific category.')
                .addStringOption(option => // Use String for Autocomplete ID
                    option.setName('target_category')
                        .setDescription('The category to apply dividers within (start typing).')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('divider_type')
                        .setDescription('The divider symbol to use.')
                        .setRequired(true)
                        .addChoices(...DIVIDER_CHOICES))
                .addStringOption(option =>
                    option.setName('custom_divider')
                        .setDescription('Your custom divider symbol (if type is Custom).')
                        .setRequired(false)))

        // --- Channel Subcommand --- 
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Apply divider to a specific channel.')
                .addChannelOption(option => // Use ChannelSelect
                    option.setName('target_channel')
                        .setDescription('The specific channel to apply the divider to.')
                        .setRequired(true)
                    // Optionally add channel type filters if needed
                    // .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ...)
                )
                .addStringOption(option =>
                    option.setName('divider_type')
                        .setDescription('The divider symbol to use.')
                        .setRequired(true)
                        .addChoices(...DIVIDER_CHOICES))
                .addStringOption(option =>
                    option.setName('custom_divider')
                        .setDescription('Your custom divider symbol (if type is Custom).')
                        .setRequired(false))),

    async execute(interaction) {
        // Check permissions again (belt and suspenders)
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: 'You do not have permission to manage channels.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();
        const dividerType = interaction.options.getString('divider_type');
        const customDivider = interaction.options.getString('custom_divider');

        let dividerSymbol = dividerType;
        const isUndo = dividerType === 'undo';

        // Validate and get custom divider
        if (dividerType === 'custom') {
            if (!customDivider) {
                return interaction.editReply({ content: 'You must provide a symbol for the `custom_divider` option when selecting type Custom.' });
            }
            dividerSymbol = customDivider.trim(); // No space added
        }
        // No space added for preset dividers either

        let targetChannels = [];
        let scopeDescription = '';

        try {
            // --- Determine Target Channels based on Subcommand --- 
            if (subcommand === 'server') {
                scopeDescription = 'the entire server';
                targetChannels = interaction.guild.channels.cache.filter(ch =>
                    RENAMEABLE_CHANNEL_TYPES.includes(ch.type)
                ).map(ch => ch); // Convert cache Collection to array

            } else if (subcommand === 'category') {
                const categoryId = interaction.options.getString('target_category');
                const category = interaction.guild.channels.cache.get(categoryId);

                if (!category || category.type !== ChannelType.GuildCategory) {
                    return interaction.editReply({ content: `Invalid category selection (ID: ${categoryId}). Please choose a valid category.` });
                }
                scopeDescription = `category "${category.name}"`;
                targetChannels = interaction.guild.channels.cache.filter(ch =>
                    RENAMEABLE_CHANNEL_TYPES.includes(ch.type) && ch.parentId === categoryId
                ).map(ch => ch); // Convert cache Collection to array

            } else if (subcommand === 'channel') {
                const channel = interaction.options.getChannel('target_channel');
                if (!RENAMEABLE_CHANNEL_TYPES.includes(channel.type)) {
                    return interaction.editReply({ content: `Cannot apply divider to channel type: ${ChannelType[channel.type]}.` });
                }
                scopeDescription = `channel ${channel.toString()}`;
                targetChannels.push(channel); // Single channel
            }

            if (targetChannels.length === 0) {
                return interaction.editReply({ content: `No applicable channels found for scope: ${scopeDescription}.` });
            }

            // --- Process Channels --- 
            let renamedCount = 0;
            let skippedCount = 0;
            let failedCount = 0;

            const actionText = isUndo ? "Removing first character from" : `Applying divider "${dividerSymbol}" to`;
            await interaction.editReply({ content: `${actionText} ${targetChannels.length} channel(s) in ${scopeDescription}... (This may take time)` });

            for (const channel of targetChannels) {
                try {
                    let newName;

                    if (isUndo) {
                        // For undo, remove the first character
                        if (channel.name.length <= 1) {
                            console.warn(`Skipping channel "${channel.name}" - too short to remove first character.`);
                            skippedCount++;
                            continue;
                        }
                        newName = channel.name.substring(1);
                    } else {
                        // Check if name starts with the raw divider symbol for normal mode
                        if (channel.name.startsWith(dividerSymbol)) {
                            skippedCount++;
                            continue;
                        }

                        // Prepend the raw divider symbol
                        newName = dividerSymbol + channel.name;

                        // Discord limits channel names to 100 chars
                        if (newName.length > 100) {
                            console.warn(`Skipping channel "${channel.name}" - new name exceeds 100 chars.`);
                            failedCount++;
                            continue;
                        }
                    }

                    await channel.edit({ name: newName }, `Divider command by ${interaction.user.tag}`);
                    renamedCount++;
                    await wait(1100); // Delay to avoid rate limits (adjust as needed)
                } catch (error) {
                    console.error(`Failed to rename channel ${channel.name} (${channel.id}):`, error);
                    failedCount++;
                }
            }

            // --- Final Reply --- 
            let finalMessage = `${isUndo ? "Undo" : "Divider"} process finished for ${scopeDescription}.
`;
            finalMessage += `- Renamed: ${renamedCount}
`;
            if (!isUndo) {
                finalMessage += `- Skipped (Already Prefixed): ${skippedCount}
`;
            } else {
                finalMessage += `- Skipped: ${skippedCount}
`;
            }
            finalMessage += `- Failed/Errors: ${failedCount}`;
            await interaction.editReply({ content: finalMessage });

        } catch (error) {
            console.error(`Error in divider command (${subcommand}):`, error);
            if (!interaction.replied && !interaction.deferred) {
                // Should not happen if deferred, but as fallback
                await interaction.reply({ content: 'An unexpected error occurred.', flags: MessageFlags.Ephemeral }).catch(console.error);
            } else if (!interaction.ephemeral) {
                // If somehow reply wasn't ephemeral or edit failed
                await interaction.followUp({ content: 'An unexpected error occurred.', flags: MessageFlags.Ephemeral }).catch(console.error);
            } else {
                // Default: try editing the deferred reply
                await interaction.editReply({ content: 'An unexpected error occurred processing the command.' }).catch(console.error);
            }
        }
    },
}; 