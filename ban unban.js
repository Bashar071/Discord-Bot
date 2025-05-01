const { Client, GatewayIntentBits, EmbedBuilder, Events, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const parts = message.content.trim().split(/\s+/);
  const command = parts.shift().toLowerCase();

  // ----- @ban Command ----- //
  // Usage: @ban @user [reason...]
  if (command === '@ban') {
    // Permission check
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setTitle('Permission Denied')
          .setDescription('⚠️ You lack the Ban Members permission.')
          .setColor('#800080')
      ]});
    }

    // Fetch target user by mention or ID
    let user = message.mentions.users.first();
    if (!user && parts[0]) {
      user = await message.client.users.fetch(parts[0]).catch(() => null);
    }
    if (!user) {
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setTitle('Error')
          .setDescription('⚠️ Please mention or provide a valid user ID to ban.')
          .setColor('#800080')
      ]});
    }

    // Prevent banning administrators
    const member = message.guild.members.cache.get(user.id);
    if (member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setTitle('Error')
          .setDescription('⚠️ Cannot ban an Administrator.')
          .setColor('#800080')
      ]});
    }

    const reason = parts.slice(1).join(' ') || 'No reason provided';

    try {
      await message.guild.members.ban(user.id, { reason });
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setTitle('🔨 User Banned')
          .setDescription(`**${user.tag}** has been banned by **${message.author.tag}**.`)
          .addFields({ name: 'Reason', value: `**${reason}**`, inline: false })
          .setColor('#FFA500')
      ]});
    } catch (err) {
      console.error(err);
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setTitle('Error')
          .setDescription('⚠️ Could not ban that user. Check my permissions.')
          .setColor('#800080')
      ]});
    }
  }

  // ----- @unban Command ----- //
  // Usage: @unban <userID>
  if (command === '@unban') {
    // Permission check
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setTitle('Permission Denied')
          .setDescription('⚠️ You lack the Ban Members permission.')
          .setColor('#800080')
      ]});
    }

    // Extract and validate ID
    const raw = parts[0];
    const match = raw ? raw.match(/\d{17,19}/) : null;
    const id = match ? match[0] : null;
    if (!id) {
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setTitle('Error')
          .setDescription('⚠️ Please supply the user ID to unban.')
          .setColor('#800080')
      ]});
    }

    try {
      await message.guild.members.unban(id);
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setTitle('🔓 User Unbanned')
          .setDescription(`**<@${id}>** has been unbanned by **${message.author.tag}**.`)
          .setColor('#FFA500')
      ]});
    } catch (err) {
      console.error(err);
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setTitle('Error')
          .setDescription('⚠️ Could not unban that ID. Is it valid and banned?')
          .setColor('#800080')
      ]});
    }
  }
});

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');