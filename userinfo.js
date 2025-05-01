// index.js
const { Client, GatewayIntentBits, EmbedBuilder, Partials } = require('discord.js');
require('dotenv').config();

const TOKEN  = process.env.TOKEN;
const PREFIX = '@userinfo';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.User, Partials.GuildMember, Partials.Message]
});

const FLAG_NAMES = {
  DISCORD_EMPLOYEE:        'Discord Staff',
  DISCORD_PARTNER:         'Partnered Server Owner',
  BUGHUNTER_LEVEL_1:       'Bug Hunter (Level 1)',
  BUGHUNTER_LEVEL_2:       'Bug Hunter (Level 2)',
  HYPESQUAD_EVENTS:        'HypeSquad Events',
  HOUSE_BRAVERY:           'HypeSquad Bravery',
  HOUSE_BRILLIANCE:        'HypeSquad Brilliance',
  HOUSE_BALANCE:           'HypeSquad Balance',
  EARLY_SUPPORTER:         'Early Supporter',
  TEAM_USER:               'Team User',
  VERIFIED_BOT:            'Verified Bot',
  VERIFIED_DEVELOPER:      'Verified Bot Developer',
  CERTIFIED_MODERATOR:     'Certified Moderator',
  PREMIUM_EARLY_SUPPORTER: 'Nitro Early Supporter'
};

const NITRO_TYPES = {
  0: 'None',
  1: 'Nitro Classic',
  2: 'Nitro'
};

async function buildUserInfoEmbed(user, guild, requester) {
  const member = await guild.members.fetch(user.id);
  const created = Math.floor(user.createdTimestamp / 1000);
  const joined  = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
  const boost   = member.premiumSinceTimestamp
                    ? Math.floor(member.premiumSinceTimestamp / 1000)
                    : null;

  const flagsArr = (await user.fetchFlags()).toArray();
  const badges   = flagsArr.length
                   ? flagsArr.map(f => FLAG_NAMES[f] || f).join(', ')
                   : 'None';
  const nitro    = NITRO_TYPES[user.premiumType] || 'Unknown';

  const pres    = member.presence;
  const status  = pres?.status || 'offline';
  const acts    = pres?.activities.map(a => a.name).join(', ') || 'None';
  const voice   = member.voice.channel?.name || 'None';
  const accent  = user.hexAccentColor || 'None';

  const roles = member.roles.cache
    .filter(r => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .map(r => r.name)
    .join(', ') || 'None';

  const banner = user.bannerURL({ dynamic: true, size: 1024 });

  const embed = new EmbedBuilder()
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setColor(member.displayHexColor || 0x00AE86)
    .setDescription(`**ID:** ${user.id}`)
    .addFields(
      { name: 'Created Account', value: `<t:${created}:F>`,               inline: true },
      { name: 'Joined Server',   value: joined ? `<t:${joined}:F>` : 'N/A', inline: true },
      { name: 'Boosting Since',  value: boost ? `<t:${boost}:F>` : 'No boost', inline: true },
      { name: 'Nickname',        value: member.nickname || 'None',        inline: true },
      { name: 'Highest Role',    value: member.roles.highest.name,       inline: true },
      { name: 'Role Count',      value: `${member.roles.cache.size - 1}`, inline: true },
      { name: 'Roles',           value: roles,                            inline: false },
      { name: 'Status',          value: status,                          inline: true },
      { name: 'Activities',      value: acts,                            inline: true },
      { name: 'Voice Channel',   value: voice,                           inline: true },
      { name: 'Badges',          value: badges,                          inline: false },
      { name: 'Nitro',           value: nitro,                           inline: true },
      { name: 'Accent Color',    value: accent,                          inline: true }
    )
    .setFooter({ text: `Requested by ${requester.tag}` })
    .setTimestamp();

  if (banner) embed.setImage(banner);
  return embed;
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  let target = message.mentions.users.first();

  if (!target && args[0]) {
    target = await client.users.fetch(args[0]).catch(() => null);
  }
  if (!target) target = message.author;

  const embed = await buildUserInfoEmbed(target, message.guild, message.author);
  await message.reply({ embeds: [embed] });
});

client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');