// index.js
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Partials
  } = require('discord.js');
  require('dotenv').config();
  
  const TOKEN  = process.env.TOKEN;
  const PREFIX = '@serverinfo';
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.GuildMember, Partials.User, Partials.Message]
  });
  
  async function buildServerInfoEmbed(guild, requester) {
    await guild.members.fetch();
    const createdTs  = Math.floor(guild.createdTimestamp / 1000);
    const ownerTag   = guild.members.cache.get(guild.ownerId)?.user.tag || 'Unknown';
  
    return new EmbedBuilder()
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }) || null)
      .setDescription(guild.description ?? 'No description')
      .addFields(
        { name: 'Server ID',          value: `${guild.id}`,                              inline: true },
        { name: 'Created On',         value: `<t:${createdTs}:F>`,                       inline: true },
        { name: 'Owner',              value: ownerTag,                                    inline: true },
        { name: 'Member Count',       value: `${guild.memberCount}`,                     inline: true },
        { name: 'Role Count',         value: `${guild.roles.cache.size}`,                inline: true },
        { name: 'Emoji Count',        value: `${guild.emojis.cache.size}`,               inline: true },
        { name: 'Boost Tier',         value: `Tier ${guild.premiumTier}`,                inline: true },
        { name: 'Boost Count',        value: `${guild.premiumSubscriptionCount}`,        inline: true },
        { name: 'Verification Level', value: `${guild.verificationLevel}`,               inline: true }
      )
      .setFooter({ text: `Requested by ${requester.tag}` })
      .setTimestamp()
      .setImage(guild.bannerURL({ dynamic: true, size: 1024 }) || null);
  }
  
  // utility to chunk long text into <=2000‑char blocks
  function chunkText(str, max = 1900) {
    const chunks = [];
    let current = '';
    for (const part of str.split(' ')) {
      if ((current + ' ' + part).length > max) {
        chunks.push(current);
        current = part;
      } else {
        current = current ? current + ' ' + part : part;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }
  
  client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
  });
  
  client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;
  
    const embed = await buildServerInfoEmbed(message.guild, message.author);
  
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('list_roles')
        .setLabel('List Roles')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('list_members')
        .setLabel('List Members')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('list_emojis')
        .setLabel('List Emojis')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('list_boosters')
        .setLabel('List Boosters')
        .setStyle(ButtonStyle.Danger)
    );
  
    await message.reply({ embeds: [embed], components: [row] });
  });
  
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || !interaction.guild) return;
  
    // pre‑fetch members if needed
    if (['list_members', 'list_boosters'].includes(interaction.customId)) {
      await interaction.guild.members.fetch();
    }
  
    switch (interaction.customId) {
      case 'list_roles': {
        const roles = interaction.guild.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => r.name)
          .join(', ') || 'None';
        return interaction.reply({
          content: `**Roles (${interaction.guild.roles.cache.size - 1}):**\n${roles}`,
          ephemeral: true
        });
      }
      case 'list_members': {
        const members = interaction.guild.members.cache
          .map(m => m.user.tag)
          .join('\n') || 'None';
        return interaction.reply({
          content: `**Members (${interaction.guild.memberCount}):**\n${members}`,
          ephemeral: true
        });
      }
      case 'list_emojis': {
        // build the full emoji string
        const all = interaction.guild.emojis.cache
          .map(e => `${e} \`:${e.name}:\``)
          .join(' ');
        // split into safe chunks
        const chunks = chunkText(all);
        // defer so we can followUp multiple times
        await interaction.deferReply({ ephemeral: true });
        for (const chunk of chunks) {
          await interaction.followUp({ content: chunk, ephemeral: true });
        }
        return;
      }
      case 'list_boosters': {
        const boosters = interaction.guild.members.cache
          .filter(m => m.premiumSinceTimestamp)
          .map(m => m.user.tag)
          .join('\n') || 'None';
        return interaction.reply({
          content: `**Boosters (${interaction.guild.premiumSubscriptionCount}):**\n${boosters}`,
          ephemeral: true
        });
      }
    }
  });
  
  client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');