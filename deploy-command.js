// deploy-commands.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const token    = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId  = process.env.GUILD_ID;  // your test server ID

// Dynamically load all command modules from the 'commands' folder
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && typeof command.data.toJSON === 'function') {
    commands.push(command.data.toJSON());
  }
}

// Register slash commands with Discord API
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    console.log('Started refreshing ${commands.length} commands.');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('Successfully reloaded application commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();
