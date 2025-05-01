const { Client, GatewayIntentBits, EmbedBuilder, Colors, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const content = message.content.trim();

  // Self nickname change: @nick NewNickname
  if (content.startsWith('@nick')) {
    const args = content.split(/\s+/);
    const newNick = args.slice(1).join(' ');

    if (!newNick) {
      const embed = new EmbedBuilder()
        .setTitle('**Nickname Change Failed**')
        .setDescription('Usage: `@nick NewNickname`')
        .setColor(Colors.Purple);
      return message.reply({ embeds: [embed] });
    }

    const member = message.member;
    const botMember = await message.guild.members.fetch(client.user.id);

    // Hierarchy check: bot role must be higher than member's
    if (botMember.roles.highest.position <= member.roles.highest.position) {
      const err = new EmbedBuilder()
        .setTitle('**Hierarchy Error**')
        .setDescription('I cannot change your nickname due to role hierarchy.')
        .setColor(Colors.Purple);
      return message.reply({ embeds: [err] });
    }

    try {
      await member.setNickname(newNick);
      const success = new EmbedBuilder()
        .setTitle('**Nickname Changed**')
        .setDescription(`Your nickname was changed to **${newNick}**`)
        .setColor(Colors.Green);
      return message.reply({ embeds: [success] });
    } catch (error) {
      const fail = new EmbedBuilder()
        .setTitle('**Nickname Change Failed**')
        .setDescription(`Error: ${error.message}`)
        .setColor(Colors.Purple);
      return message.reply({ embeds: [fail] });
    }
  }

  // Change someone else's nickname: @nickname @user NewNickname
  if (content.startsWith('@nickname')) {
    const args = content.split(/\s+/);
    const targetUser = message.mentions.users.first();
    const newNick = args.slice(2).join(' ');

    if (!targetUser || !newNick) {
      const embed = new EmbedBuilder()
        .setTitle('**Nickname Command Usage**')
        .setDescription('Usage: `@nickname @user NewNickname`')
        .setColor(Colors.Purple);
      return message.reply({ embeds: [embed] });
    }

    // Permission check for executor
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      const noPerm = new EmbedBuilder()
        .setTitle('**Permission Denied**')
        .setDescription('You need the `Manage Nicknames` permission.')
        .setColor(Colors.Purple);
      return message.reply({ embeds: [noPerm] });
    }

    const guild = message.guild;
    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      const notFound = new EmbedBuilder()
        .setTitle('**User Not Found**')
        .setColor(Colors.Purple);
      return message.reply({ embeds: [notFound] });
    }

    const botMember = await guild.members.fetch(client.user.id);
    // Hierarchy checks: executor > target, bot > target
    if (message.member.roles.highest.position <= member.roles.highest.position) {
      const err = new EmbedBuilder()
        .setTitle('**Hierarchy Error**')
        .setDescription('You cannot change nickname of someone with equal or higher role.')
        .setColor(Colors.Purple);
      return message.reply({ embeds: [err] });
    }
    if (botMember.roles.highest.position <= member.roles.highest.position) {
      const err = new EmbedBuilder()
        .setTitle('**Hierarchy Error**')
        .setDescription('I cannot change their nickname due to role hierarchy.')
        .setColor(Colors.Purple);
      return message.reply({ embeds: [err] });
    }

    try {
      await member.setNickname(newNick);
      const success = new EmbedBuilder()
        .setTitle('**Nickname Changed**')
        .setDescription(`Changed ${targetUser}'s nickname to **${newNick}**`)
        .setColor(Colors.Green);
      return message.reply({ embeds: [success] });
    } catch (error) {
      const fail = new EmbedBuilder()
        .setTitle('**Nickname Change Failed**')
        .setDescription(`Error: ${error.message}`)
        .setColor(Colors.Purple);
      return message.reply({ embeds: [fail] });
    }
  }
});

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// Replace with your bot token
client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');