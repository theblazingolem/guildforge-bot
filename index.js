// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, ActivityType, MessageFlags, InteractionType, ChannelType } = require('discord.js');
const { token } = require('./config.json');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const currentPath = path.join(foldersPath, folder);
    // Check if the item is a directory before proceeding
    if (fs.statSync(currentPath).isDirectory()) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            // Set a new item in the Collection with the key as the command name and the value as the exported module
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    } // Add the closing brace for the if statement
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// --- Autocomplete Handler --- 
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.type !== InteractionType.ApplicationCommandAutocomplete) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    // --- Channel Category Autocomplete ---
    if (interaction.commandName === 'channel' && interaction.options.getSubcommand() === 'create' && interaction.options.getFocused(true).name === 'category') {
        const focusedValue = interaction.options.getFocused();
        const categories = interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildCategory);
        const filtered = categories.filter(category =>
            category.name.toLowerCase().startsWith(focusedValue.toLowerCase())
        ).map(category => ({ name: category.name, value: category.id }));
        await interaction.respond(filtered.slice(0, 25)).catch(console.error);
    }

    // --- Divider Category Autocomplete --- 
    else if (interaction.commandName === 'divider' && interaction.options.getSubcommand() === 'category' && interaction.options.getFocused(true).name === 'target_category') {
        const focusedValue = interaction.options.getFocused();
        const categories = interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildCategory);
        const filtered = categories.filter(category =>
            category.name.toLowerCase().startsWith(focusedValue.toLowerCase())
        ).map(category => ({ name: category.name, value: category.id }));
        await interaction.respond(filtered.slice(0, 25)).catch(console.error);
    }

    // // Add other autocomplete handlers here
    // else if (interaction.commandName === 'another_command') {
    //     // ...
    // }
});

// --- REMOVED Regular Command Execution Handler --- 
// The following block is removed as it's assumed to be handled by your events/interactionCreate.js
/*
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return; 
    // ... rest of command execution logic ... 
});
*/

// Log in to Discord with your client's token
client.login(token);