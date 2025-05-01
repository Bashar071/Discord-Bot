const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    Events,
    PermissionsBitField
  } = require('discord.js');
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL'] // Needed for DMs
  });
  
  // In-memory warning storage (now storing detailed objects)
  const warnings = {};
  
  // Helper function to ensure a guild and user record exist
  function initWarnings(guildId, userId) {
    if (!warnings[guildId]) warnings[guildId] = {};
    if (!warnings[guildId][userId]) warnings[guildId][userId] = [];
  }
  
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
  
    const args = message.content.split(' ');
    const command = args.shift().toLowerCase();
  
    // ----- Warn Command -----
    if (command === '@warn') {
      // Permission check: Must have ModerateMembers (Timeout Members)
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Permission Denied')
          .setDescription('⚠️ You cannot use this command. Missing permission: `Timeout Members`.')
          .setColor('#800080');
        return message.channel.send({ embeds: [errorEmbed] });
      }
  
      const userMention = message.mentions.users.first();
      if (!userMention) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('⚠️ You must mention a user to warn.')
          .setColor('#800080');
        return message.channel.send({ embeds: [errorEmbed] });
      }
  
      // Check if the target member has Administrator permission
      const member = message.guild.members.cache.get(userMention.id);
      if (member && member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('⚠️ You can’t warn a member with Administrator permissions.')
          .setColor('#800080');
        return message.channel.send({ embeds: [errorEmbed] });
      }
  
      // Remove mentions from args to get the reason
      const mentionedIDs = [userMention.id];
      const reason = args.filter(arg => !mentionedIDs.some(id => arg.includes(id))).join(' ').trim();
      if (!reason) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('⚠️ You must specify a reason for warning.')
          .setColor('#800080');
        return message.channel.send({ embeds: [errorEmbed] });
      }
  
      const guildId = message.guild.id;
      const userId = userMention.id;
      initWarnings(guildId, userId);
  
      // Add the new warning to the user's record
      warnings[guildId][userId].push({
        reason: reason,
        warnedBy: message.author.tag,
        timestamp: new Date()
      });
  
      const totalWarnings = warnings[guildId][userId].length;
  
      // Public warning embed
      const warnEmbed = new EmbedBuilder()
        .setTitle('⚠️ __Warned User__')
        .setColor('#FFA500')
        .setDescription(`**${userMention} has been warned by ${message.author}**`)
        .addFields(
          { name: 'Total Warnings', value: `**${totalWarnings}** warning(s)`, inline: false },
          { name: 'Reason', value: `**${reason}**`, inline: false },
          { name: 'Warned By', value: `${message.author}`, inline: false }
        );
  
      await message.channel.send({ embeds: [warnEmbed] });
  
      // DM the warned user
      const dmEmbed = new EmbedBuilder()
        .setTitle('⚠️ __Warned__')
        .setColor('#FFA500')
        .setDescription(`**You have been warned in ${message.guild.name}**`)
        .addFields(
          { name: 'Total Warnings', value: `You now have **${totalWarnings}** warning(s)`, inline: false },
          { name: 'Reason', value: `**${reason}**`, inline: false },
          { name: 'Warned In', value: `${message.guild.name}`, inline: false }
        );
      try {
        await userMention.send({ embeds: [dmEmbed] });
      } catch (err) {
        console.error(`Failed to DM ${userMention.tag}`);
      }
      return;
    }
  
    // ----- Unwarn Command -----
    if (command === '@unwarn') {
      // Permission check: Must have ModerateMembers (Timeout Members)
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Permission Denied')
          .setDescription('⚠️ You cannot use this command. Missing permission: `Timeout Members`.')
          .setColor('#800080');
        return message.channel.send({ embeds: [errorEmbed] });
      }
      
      const userMention = message.mentions.users.first();
      if (!userMention) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('⚠️ You must mention a user to remove a warning from.')
          .setColor('#800080');
        return message.channel.send({ embeds: [errorEmbed] });
      }
      
      const guildId = message.guild.id;
      const userId = userMention.id;
      initWarnings(guildId, userId);
      
      const userWarnings = warnings[guildId][userId];
      if (userWarnings.length === 0) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Unwarn')
          .setDescription(`✅ ${userMention} has no warnings to remove.`)
          .setColor('#800080');
        return message.channel.send({ embeds: [errorEmbed] });
      }
  
      // Check for an index argument (1-based). If provided, remove that specific warning.
      // Command usage: @unwarn @user [warning number]
      let indexToRemove = userWarnings.length - 1; // default: remove most recent warning
      if (args[0]) {
        const parsedIndex = parseInt(args[0], 10);
        if (!isNaN(parsedIndex) && parsedIndex > 0 && parsedIndex <= userWarnings.length) {
          indexToRemove = parsedIndex - 1;
        } else {
          const errorEmbed = new EmbedBuilder()
            .setTitle('Error')
            .setDescription(`⚠️ Invalid warning number provided. Please provide a number between 1 and ${userWarnings.length}.`)
            .setColor('#800080');
          return message.channel.send({ embeds: [errorEmbed] });
        }
      }
  
      const removedWarning = userWarnings.splice(indexToRemove, 1)[0];
      const updatedCount = userWarnings.length;
  
      const unwarnEmbed = new EmbedBuilder()
        .setTitle('⚠️ __Warning Removed__')
        .setColor('#FFA500')
        .setDescription(`**${userMention}** has had a warning removed by ${message.author}.`)
        .addFields(
          { name: 'Removed Warning Reason', value: `**${removedWarning.reason}**`, inline: false },
          { name: 'Remaining Warnings', value: `**${updatedCount}** warning(s)`, inline: false }
        );
  
      await message.channel.send({ embeds: [unwarnEmbed] });
      return;
    }
  
    // ----- Warnings Command -----
    if (command === '@warnings') {
      const userMention = message.mentions.users.first();
      if (!userMention) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('⚠️ You must mention a user to check their warnings.')
          .setColor('#800080');
        return message.channel.send({ embeds: [errorEmbed] });
      }
      
      const guildId = message.guild.id;
      const userId = userMention.id;
      initWarnings(guildId, userId);
      
      const userWarnings = warnings[guildId][userId];
      const count = userWarnings.length;
      
      if (count === 0) {
        const noWarnEmbed = new EmbedBuilder()
          .setTitle('Warnings Check')
          .setDescription(`✅ ${userMention} has **no warnings**.`)
          .setColor('#800080');
        return message.channel.send({ embeds: [noWarnEmbed] });
      }
      
      // Build a description listing each warning with a number, reason, moderator and timestamp.
      let warnDetails = '';
      userWarnings.forEach((w, idx) => {
        warnDetails += `**${idx + 1}.** Reason: ${w.reason}\nWarned By: ${w.warnedBy}\nTime: ${w.timestamp.toLocaleString()}\n\n`;
      });
      
      const warningsEmbed = new EmbedBuilder()
        .setTitle('⚠️ Warning Record')
        .setColor('#FFA500')
        .setDescription(`**${userMention}** has **${count}** warning(s):\n\n${warnDetails}`);
      
      return message.channel.send({ embeds: [warningsEmbed] });
    }
  });
  
  // Log the bot in and confirm startup
  client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
  });
  
  client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');