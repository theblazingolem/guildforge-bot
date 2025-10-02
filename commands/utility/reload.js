const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const path = require('path');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('reloads a command.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to reload.')
                .setRequired(true)),
    async execute(interaction) {
        const commandName = interaction.options.getString('command', true).toLowerCase();
        const command = interaction.client.commands.get(commandName);

        if (!command) {
            return interaction.reply({ content: `There is no command with the name \`/${commandName}\`!`, flags: MessageFlags.Ephemeral });
        }

        try {
            // Correct path for commands under 'commands/utility'
            const commandPath = path.join(__dirname, `${command.data.name}.js`);

            // Delete from cache
            delete require.cache[require.resolve(commandPath)];

            // Reload the command
            const newCommand = require(commandPath);
            interaction.client.commands.set(newCommand.data.name, newCommand);

            await interaction.reply({ content: `Command \`/${newCommand.data.name}\` was successfully reloaded! 🔄`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `Error reloading \`/${newCommand.data.name}\`\n\`${error.message}\``, flags: MessageFlags.Ephemeral });
        }
    },
};