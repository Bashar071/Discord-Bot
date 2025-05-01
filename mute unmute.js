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
    partials: ['CHANNEL']
  });
  
  // In‑memory storage for warnings
  const warnings = {};
  function initWarnings(guildId, userId) {
    if (!warnings[guildId]) warnings[guildId] = {};
    if (!warnings[guildId][userId]) warnings[guildId][userId] = [];
  }
  
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
  
    const parts = message.content.trim().split(/\s+/);
    const command = parts.shift().toLowerCase();
  
    // ----- @warn, @unwarn, @warnings (unchanged) -----
    // … your existing warn/unwarn/warnings code here …
  
    // ----- @mute Command -----
    // Usage: @mute @User 10m reason...
    if (command === '@mute') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('Permission Denied')
            .setDescription('⚠️ You lack the `Timeout Members` permission.')
            .setColor('#800080')]
        });
      }
  
      const user = message.mentions.users.first();
      if (!user) {
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('⚠️ Please mention someone to mute.')
            .setColor('#800080')]
        });
      }
  
      // Extract rawDuration and reason
      const rawDuration = parts[1];               // after mention
      const reason = parts.slice(2).join(' ') || 'No reason provided';
  
      // Parse duration: number + unit
      const match = rawDuration && rawDuration.match(/^(\d+)\s*(m(?:in(?:ute)?s?)?|h(?:r|ours?)?|w(?:eeks?)?)$/i);
      if (!match) {
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('⚠️ Provide a duration, e.g. `10m`, `2h`, `1w` (with optional “min”/“hour”/“week”).')
            .setColor('#800080')]
        });
      }
  
      const value = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      let ms;
      if (unit.startsWith('m'))           ms = value * 60_000;            // minutes
      else if (unit.startsWith('h'))      ms = value * 3_600_000;         // hours
      else /* week */                     ms = value * 7 * 24 * 3_600_000;
  
      try {
        const member = await message.guild.members.fetch(user.id);
        await member.timeout(ms, reason);
  
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('🔇 User Muted')
            .setDescription(`**${user}** was muted for **${value}${unit.replace(/[^a-z]/g,'')}** by **${message.author}**.`)
            .addFields({ name: 'Reason', value: `**${reason}**`, inline: false })
            .setColor('#FFA500')]
        });
      } catch (err) {
        console.error(err);
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('⚠️ Could not mute that user. Do I have the right permissions?')
            .setColor('#800080')]
        });
      }
    }
  
    // ----- @unmute Command (unchanged) -----
    if (command === '@unmute') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('Permission Denied')
            .setDescription('⚠️ You lack the `Timeout Members` permission.')
            .setColor('#800080')]
        });
      }
  
      const user = message.mentions.users.first();
      if (!user) {
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('⚠️ Please mention someone to unmute.')
            .setColor('#800080')]
        });
      }
  
      try {
        const member = await message.guild.members.fetch(user.id);
        await member.timeout(null);
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('🔊 User Unmuted')
            .setDescription(`**${user}** has been unmuted by **${message.author}**.`)
            .setColor('#FFA500')]
        });
      } catch (err) {
        console.error(err);
        return message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('⚠️ Could not unmute that user.')
            .setColor('#800080')]
        });
      }
    }
  });
  
  client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
  });
  
  client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');