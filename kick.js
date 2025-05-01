const { Client, GatewayIntentBits, EmbedBuilder, Partials, Colors, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel],
});

client.on('messageCreate', async message => {
  // Only process the message if it starts with @kick and the message is from a user (not a bot)
  if (message.author.bot || !message.content.startsWith('@kick')) return;

  // Get the user mention and the reason
  const args = message.content.split(' ');
  const targetUser = message.mentions.users.first();
  const reason = args.slice(2).join(' '); // Reason is everything after @user

  if (!targetUser || !reason) {
    const failEmbed = new EmbedBuilder()
      .setTitle('**Kick Failure**')
      .setDescription('You must mention a user and provide a reason.')
      .setColor(Colors.Purple); // Fixed color reference
    return message.reply({ embeds: [failEmbed] });
  }

  const member = message.guild.members.cache.get(targetUser.id);

  if (!member) {
    const failEmbed = new EmbedBuilder()
      .setTitle('**Kick Failure**')
      .setDescription('User not found in this server.')
      .setColor(Colors.Purple); // Fixed color reference
    return message.reply({ embeds: [failEmbed] });
  }

  // Check if the member has a higher role than the command executor
  if (message.member.roles.highest.position <= member.roles.highest.position) {
    const failEmbed = new EmbedBuilder()
      .setTitle('**Kick Failure**')
      .setDescription('You cannot kick a member with a higher or equal role.')
      .setColor(Colors.Purple); // Fixed color reference
    return message.reply({ embeds: [failEmbed] });
  }

  if (!member.kickable) {
    const failEmbed = new EmbedBuilder()
      .setTitle('**Kick Failure**')
      .setDescription('I do not have permission to kick this user.')
      .setColor(Colors.Purple); // Fixed color reference
    return message.reply({ embeds: [failEmbed] });
  }

  // DM embed
  const dmEmbed = new EmbedBuilder()
    .setTitle('**Kicked**')
    .setDescription(`You were kicked from ||**${message.guild.name}**||`)
    .setAuthor({ name: '__Reason__' })
    .addFields({ name: '\u200B', value: reason })
    .setColor(Colors.Red); // Change the color for the DM to red

  try {
    await targetUser.send({ embeds: [dmEmbed] });
  } catch (error) {
    console.log('Could not DM the user:', error.message);
  }

  try {
    await member.kick(reason);
  } catch (err) {
    const failEmbed = new EmbedBuilder()
      .setTitle('**Kick Failure**')
      .setDescription(`Failed to kick user: ${err.message}`)
      .setColor(Colors.Purple); // Fixed color reference
    return message.reply({ embeds: [failEmbed] });
  }

  const kickEmbed = new EmbedBuilder()
    .setTitle('**__⛔ KICK__**')
    .setAuthor({ name: '__Kicked by__' })
    .setDescription(`${message.author}`)
    .addFields({
      name: '__Reason__',
      value: reason
    })
    .setColor(Colors.Red); // Change the color to red for kick confirmation

  message.channel.send({ embeds: [kickEmbed] });
});

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');