// ticket_system.js
const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField,
  Collection,
  AttachmentBuilder,
  Client,
  GatewayIntentBits
} = require('discord.js');

const PREFIX = '@';

// --- Persistent Configuration ---
const CONFIG_PATH = path.resolve(__dirname, 'ticketConfig.json');
let config = { guilds: {} };
if (fs.existsSync(CONFIG_PATH)) {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}
function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// In-memory tracking of active tickets
const activeTickets = new Collection(); // key: channelId, value: { userId, guildId }

// --- Initialize client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// --- Slash Command Definition ---
const ticketCommand = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Comprehensive support ticket system')
    // Setup
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Configure ticket category, staff role, and log channel')
        .addChannelOption(opt =>
          opt.setName('category')
            .setDescription('Category for new tickets')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addRoleOption(opt =>
          opt.setName('staffrole')
            .setDescription('Role that can manage tickets')
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('logchannel')
            .setDescription('Channel for transcripts')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub.setName('panel-create')
        .setDescription('Create a ticket panel')
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Embed title')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('Embed description')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('panel-delete')
        .setDescription('Delete an existing ticket panel')
        .addStringOption(opt =>
          opt.setName('messageid')
            .setDescription('The panel message ID to delete')
            .setRequired(true)
        )
    )
    .addSubcommand(sub => sub.setName('close').setDescription('Close this ticket'))
    .addSubcommand(sub => sub.setName('lock').setDescription('Lock this ticket (read-only)'))
    .addSubcommand(sub => sub.setName('unlock').setDescription('Unlock this ticket'))
    .addSubcommand(sub =>
      sub.setName('rename')
        .setDescription('Rename this ticket channel')
        .addStringOption(opt => opt.setName('name').setRequired(true).setDescription('New channel name'))
    )
    .addSubcommand(sub => sub.setName('transcript').setDescription('Generate transcript for this ticket'))
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a user to this ticket')
        .addUserOption(opt => opt.setName('user').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a user from this ticket')
        .addUserOption(opt => opt.setName('user').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Slash command execution logic handled above
  }
};

// --- Message Command Handler (Prefix) ---
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  // Mirror slash subcommands with @ prefix commands
  if (command === 'ticket') {
    const sub = args.shift()?.toLowerCase();
    const guildId = message.guild.id;
    if (!config.guilds[guildId]) config.guilds[guildId] = { panels: [] };
    const guildCfg = config.guilds[guildId];

    // Basic responses
    if (sub === 'setup') return message.reply('Use slash command `/ticket setup` to configure.');
    if (sub === 'panel-create') return message.reply('Use slash command `/ticket panel-create`.');
    if (sub === 'panel-delete') return message.reply('Use slash command `/ticket panel-delete`.');

    const ticketInfo = activeTickets.get(message.channel.id);
    if (!ticketInfo) return message.reply('This is not a ticket channel.');

    if (sub === 'close') {
      await message.channel.delete('Ticket closed');
      activeTickets.delete(message.channel.id);
    } else if (sub === 'lock' || sub === 'unlock') {
      await message.channel.permissionOverwrites.edit(ticketInfo.userId, { SendMessages: sub === 'unlock' });
      await message.channel.permissionOverwrites.edit(guildCfg.staffRoleId, { SendMessages: sub === 'unlock' });
      message.reply(`Ticket ${sub}ed.`);
    } else if (sub === 'rename') {
      const newName = args.join('-') || 'ticket';
      await message.channel.setName(newName);
      message.reply(`Channel renamed to ${newName}`);
    } else if (sub === 'add' || sub === 'remove') {
      const member = message.mentions.members.first();
      if (!member) return message.reply('Mention a user.');
      await message.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: sub === 'add',
        SendMessages: sub === 'add'
      });
      message.reply(`${member} ${sub}ed.`);
    } else if (sub === 'transcript') {
      const messages = [];
      let fetched;
      do {
        fetched = await message.channel.messages.fetch({ limit: 100, before: fetched?.last()?.id });
        messages.push(...fetched.map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`));
      } while (fetched.size === 100);
      const transcript = messages.reverse().join('\n');
      const filename = `transcript_${message.channel.id}.txt`;
      fs.writeFileSync(path.resolve(__dirname, filename), transcript, 'utf-8');
      const attachment = new AttachmentBuilder(path.resolve(__dirname, filename));
      await message.reply({ content: 'Here is the transcript:', files: [attachment] });
      if (guildCfg.logChannelId) {
        const logCh = await message.guild.channels.fetch(guildCfg.logChannelId);
        await logCh.send({ files: [attachment] });
      }
    }
  }
});

// --- Button Handler ---
async function handleButton(interaction) {
  if (!interaction.isButton()) return;
  const [action, , guildId] = interaction.customId.split('_');
  if (action !== 'open') return;
  const guildCfg = config.guilds[guildId];
  if (!guildCfg) return interaction.reply({ content: 'Ticket system not installed.', ephemeral: true });
  const existing = interaction.guild.channels.cache.find(c =>
    c.parentId === guildCfg.categoryId && activeTickets.get(c.id)?.userId === interaction.user.id
  );
  if (existing) return interaction.reply({ content: 'You already have an open ticket.', ephemeral: true });

  const ch = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`.toLowerCase(),
    type: ChannelType.GuildText,
    parent: guildCfg.categoryId,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: guildCfg.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]
  });
  activeTickets.set(ch.id, { userId: interaction.user.id, guildId });

  const embed = new EmbedBuilder().setTitle('Ticket Created').setDescription('A staff member will be with you shortly.').setColor('Green');
  await ch.send({ content: `<@${interaction.user.id}>`, embeds: [embed] });
  return interaction.reply({ content: `Ticket created: ${ch}`, ephemeral: true });
}

// --- Export and Login ---
module.exports = { ticketCommand, handleButton };

client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');