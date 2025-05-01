const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Events,
  ComponentType
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('@help') || message.author.bot) return;

  const helpEmbed = new EmbedBuilder()
    .setTitle('Bot Help Menu')
    .setDescription('Choose a category from the dropdown below to see its commands.')
    .setColor('#8A2BE2'); // Replaced "Violet" with hex code

  const dropdown = new StringSelectMenuBuilder()
    .setCustomId('help-menu')
    .setPlaceholder('Select a category')
    .addOptions([
      {
        label: 'Entertainment',
        description: 'Games and interactive commands',
        value: 'fun',
      },
      {
        label: 'Moderation',
        description: 'Moderation tools and commands',
        value: 'moderation',
      },
      {
        label: 'Music',
        description: 'Play music in voice channels',
        value: 'music',
      },
      {
        label: 'Tools',
        description: 'Utility commands and tools',
        value: 'tools',
      },
    ]);

  const row = new ActionRowBuilder().addComponents(dropdown);

  const sentMessage = await message.reply({
    embeds: [helpEmbed],
    components: [row]
  });

  const collector = sentMessage.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60000
  });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({
        content: 'Only the person who used the command can interact with this menu.',
        ephemeral: true
      });
    }

    let embed;

    switch (interaction.values[0]) {
      case 'moderation':
        embed = new EmbedBuilder()
          .setTitle('Moderation Commands')
          .setColor('#8A2BE2')
          .setDescription(`
**@kick @user [reason]** - Kicks the mentioned user for the given reason  
**@ban @user [reason]** - Bans the mentioned user for the given reason  
**@unban @user ** - Unbans the mentioned user 
**@warn @user [reason]** - Sends a warning to the user  
**@unwarn @user ** - unwarns the user  
**@warnings @user ** - Shows the warnings of the user  
**@mute @user [duration]** - Mutes the member for a mentioned time
**@unmute @user ** - Unmutes the member
**@role add @user @role ** - To add a role from a user
**@role remove @user @role ** - To remove a role from a user
**@nick [nickname]** - To change your nickname
**@nickname @user [nickname]** - To change someones nickname
          `);
        break;

      case 'fun':
        embed = new EmbedBuilder()
          .setTitle('Entertainment Commands')
          .setColor('#8A2BE2')
          .setDescription(`
**@tictactoe @user** - Play TicTacToe with a user  
**@{position} (e.g. @6)** - Make a move in TicTacToe  
**@tictaend** - Ends the current TicTacToe game  
**@tictactoe @bot** - Play TicTacToe with the bot 
          `);
        break;

      case 'music':
        embed = new EmbedBuilder()
          .setTitle('Music Commands')
          .setColor('#8A2BE2')
          .setDescription(`
**@play {Song name or URL}** - Plays a song in the current voice channel
**@skips** - Skips the current play 
**@next {Song name or URL}** - Plays a song after the current song gets over
**@playlist {URL}** - Plays tens of songs orderwise of playlist
**@songinfo {Song name or URL}** - List the information about song
          `);
        break;

      case 'tools':
        embed = new EmbedBuilder()
          .setTitle('Tools')
          .setColor('#8A2BE2')
          .setDescription(`
**@userinfo @user** - List the information about mentions User
**@serverinfo** - List the information about Server 
**@songinfo {Song name or URL}** - List the information about song
**@nick [nickname]** - To change your nickname
          `);
        break;
    }

    await interaction.update({ embeds: [embed], components: [row] });
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      StringSelectMenuBuilder.from(dropdown).setDisabled(true)
    );

    await sentMessage.edit({
      components: [disabledRow]
    });
  });
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

client.on('error', (error) => {
  console.error('Client Error:', error);
});

client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM'); // Replace with your actual bot token