const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get invite links for bots.')
        .addBooleanOption(option =>
            option.setName('self')
                .setDescription('Show invite for this bot only?')
                .setRequired(true)),

    async execute(interaction) {
        const showSelf = interaction.options.getBoolean('self');

        if (showSelf) {
            // Return the self-invite link
            await interaction.reply({
                content: '[Invite](https://discord.com/oauth2/authorize?client_id=1360109607183323206&permissions=8&integration_type=0&scope=bot) <@868491392589127700> to your server',
                flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds
            });
        } else {
            // Return the list of other bots
            await interaction.reply({
                content: `## Bot Invite Links
some useful free bot invite links
- **[Carl](<https://discord.com/oauth2/authorize?&client_id=235148962103951360&scope=applications.commands+bot&permissions=2088234230&response_type=code&redirect_uri=https://carl.gg/api/server_auth>)** - logging, welcome, notifications
- **[Sapphire](<https://discord.com/oauth2/authorize?scope=bot+applications.commands&response_type=code&redirect_uri=https://sapph.xyz/dashboard&permissions=1101596716286&client_id=678344927997853742&guild_id=1355771301259771965>)** - menus, logging, welcome
- **[Statbot](<https://discord.com/oauth2/authorize?client_id=491769129318088714&scope=bot+applications.commands&permissions=275147508760>)** - message tracking
- **[Activity Rank](<https://discord.com/oauth2/authorize?client_id=534589798267224065&permissions=294172224721&scope=bot%20applications.commands>)** - levelling
- **[Formify](<https://discord.com/oauth2/authorize?client_id=945331235977310280&permissions=0&scope=bot%20applications.commands>)** - forms, ticketing
- **[Discohook](<https://discord.com/oauth2/authorize?client_id=792842038332358656&permissions=805694528&scope=bot%20applications.commands>)** - menus
- **[X Follow-Up](<https://discord.com/oauth2/authorize?client_id=1174332637322674186&permissions=2147862592&scope=bot%20applications.commands>)** - twitter notifications
- **[Fredboat](<https://discord.com/oauth2/authorize?client_id=184405253028970496&scope=bot+identify&redirect_uri=https%3A%2F%2Ffredboat.com%2Fcallback%2Fmusic&response_type=code>)** - music
- **[Tickets](<https://discord.com/oauth2/authorize?client_id=1325579039888511056&scope=bot+applications.commands&permissions=395942816984>)** - ticketing`,
                flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds
            });
        }
    },
}; 