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
  // Ignore bots and non-@role messages
  if (message.author.bot || !message.content.startsWith('@role')) return;

  const args = message.content.trim().split(/\s+/);
  const action = args[1]?.toLowerCase();        // 'add' or 'remove'
  const targetUser = message.mentions.users.first();
  const roleMention = message.mentions.roles.first();

  // Validate arguments
  if (!['add', 'remove'].includes(action) || !targetUser || !roleMention) {
    const usageEmbed = new EmbedBuilder()
      .setTitle('**👥 Role Command**')
      .setDescription('Usage: `@role add @user @Role` or `@role remove @user @Role`')
      .setColor(Colors.Purple);
    return message.reply({ embeds: [usageEmbed] });
  }

  // Permission check
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    const noPermEmbed = new EmbedBuilder()
      .setTitle('**🚫 Permission Denied**')
      .setDescription('You need the `Manage Roles` permission to use this command.')
      .setColor(Colors.Purple);
    return message.reply({ embeds: [noPermEmbed] });
  }

  const guild = message.guild;
  const member = await guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    const notFoundEmbed = new EmbedBuilder()
      .setTitle('**🚷 User Not Found**')
      .setDescription('The specified user is not in this server.')
      .setColor(Colors.Purple);
    return message.reply({ embeds: [notFoundEmbed] });
  }

  const role = guild.roles.cache.get(roleMention.id);
  if (!role) {
    const roleNotFound = new EmbedBuilder()
      .setTitle('**🚫 Role Not Found**')
      .setColor(Colors.Purple);
    return message.reply({ embeds: [roleNotFound] });
  }

  // 1) Executor hierarchy check: can't manage a role >= their highest
  if (message.member.roles.highest.position <= role.position) {
    const hierarchyEmbed = new EmbedBuilder()
      .setTitle('**🚫 Hierarchy Error**')
      .setDescription('You cannot add or remove a role that is equal to or higher than your highest role.')
      .setColor(Colors.Purple);
    return message.reply({ embeds: [hierarchyEmbed] });
  }

  // 2) Executor vs. Target-member hierarchy check:
  //    can't manage roles on a member whose highest role is >= executor's highest
  if (member.roles.highest.position >= message.member.roles.highest.position) {
    const memberHierarchyEmbed = new EmbedBuilder()
      .setTitle('**🚫 Hierarchy Error**')
      .setDescription('You cannot manage roles for a member whose highest role is equal to or higher than yours.')
      .setColor(Colors.Purple);
    return message.reply({ embeds: [memberHierarchyEmbed] });
  }

  // Bot role hierarchy check
  const botMember = await guild.members.fetch(client.user.id);
  if (botMember.roles.highest.position <= role.position) {
    const botHierarchyEmbed = new EmbedBuilder()
      .setTitle('**🚫 Hierarchy Error**')
      .setDescription('I cannot manage a role equal to or higher than my highest role.')
      .setColor(Colors.Purple);
    return message.reply({ embeds: [botHierarchyEmbed] });
  }

  try {
    if (action === 'add') {
      await member.roles.add(role);
      const successEmbed = new EmbedBuilder()
        .setTitle('**✅ Role Added**')
        .setDescription(`${role} has been added to ${targetUser}.`)
        .setColor(Colors.Green);
      return message.reply({ embeds: [successEmbed] });

    } else {
      await member.roles.remove(role);
      const successEmbed = new EmbedBuilder()
        .setTitle('**✅ Role Removed**')
        .setDescription(`${role} has been removed from ${targetUser}.`)
        .setColor(Colors.Red);
      return message.reply({ embeds: [successEmbed] });
    }
  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setTitle('**❌ Operation Failed**')
      .setDescription(`An error occurred: ${error.message}`)
      .setColor(Colors.Purple);
    return message.reply({ embeds: [errorEmbed] });
  }
});

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// Replace with your actual token
client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');