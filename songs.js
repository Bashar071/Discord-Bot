// index.js
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    Partials
  } = require('discord.js');
  const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    StreamType,
    AudioPlayerStatus,
    getVoiceConnection
  } = require('@discordjs/voice');
  const ytdl       = require('ytdl-core');
  const ytSearch   = require('yt-search');
  const ytpl       = require('ytpl');
  const fetch      = require('node-fetch');
  const { getTracks, getData } = require('spotify-url-info')(fetch);
  require('dotenv').config();
  
  const TOKEN = process.env.TOKEN;
  const PREFIX = '@';
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.GuildMember, Partials.User, Partials.Message]
  });
  
  // ----- MUSIC QUEUE MANAGEMENT -----
  const guildQueues = new Map(); // guildId -> { connection, player, queue: [ { title, url } ], playing }
  
  function formatDuration(sec) {
    const s = Number(sec);
    const m = Math.floor(s/60);
    const ss = s % 60;
    return `${m}:${ss < 10 ? '0' : ''}${ss}`;
  }
  
  async function ensureQueue(guild, voiceChannel) {
    let q = guildQueues.get(guild.id);
    if (!q) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator
      });
      const player = createAudioPlayer();
      connection.subscribe(player);
      q = { connection, player, queue: [], playing: false };
      // when a track finishes
      player.on(AudioPlayerStatus.Idle, () => {
        q.playing = false;
        if (q.queue.length) playNext(guild.id);
        else {
          q.connection.destroy();
          guildQueues.delete(guild.id);
        }
      });
      guildQueues.set(guild.id, q);
    }
    return q;
  }
  
  async function playNext(guildId) {
    const q = guildQueues.get(guildId);
    if (!q || !q.queue.length) return;
    const track = q.queue.shift();
    const stream = ytdl(track.url, { filter: 'audioonly', highWaterMark: 1<<25 });
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    q.player.play(resource);
    q.playing = true;
  }
  
  async function enqueue(guild, voiceChannel, track) {
    const q = await ensureQueue(guild, voiceChannel);
    q.queue.push(track);
    // if nothing playing, start immediately
    if (!q.playing) playNext(guild.id);
  }
  
  // ----- COMMAND HANDLER -----
  client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;
  
    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd  = args.shift().toLowerCase();
  
    // PLAY
    if (cmd === 'play') {
      const query = args.join(' ');
      if (!query) return message.reply('❌ Usage: @play {song name or YouTube/Spotify URL}');
      const vc = message.member.voice.channel;
      if (!vc) return message.reply('❌ Join a voice channel first.');
      let url, info;
      // Spotify track?
      if (query.match(/open\.spotify\.com\/track/)) {
        const data = await getData(query);
        const search = await ytSearch(`${data.name} ${data.artists.join(' ')}`);
        if (!search.videos.length) return message.reply('❌ No match on YouTube.');
        url = search.videos[0].url;
        info = { title: data.name, url };
      }
      // YouTube URL?
      else if (ytdl.validateURL(query)) {
        const vd = await ytdl.getInfo(query);
        url = query;
        info = { title: vd.videoDetails.title, url };
      }
      // keywords -> YouTube search
      else {
        const res = await ytSearch(query);
        if (!res.videos.length) return message.reply('❌ No results found.');
        url = res.videos[0].url;
        info = { title: res.videos[0].title, url };
      }
      await enqueue(message.guild, vc, info);
      return message.reply(`✅ Enqueued **${info.title}**`);
    }
  
    // SKIP
    if (cmd === 'skip') {
      const q = guildQueues.get(message.guild.id);
      if (!q || !q.playing) return message.reply('❌ Nothing is playing.');
      q.player.stop();
      return message.reply('⏭️ Skipped current track.');
    }
  
    // NEXT
    if (cmd === 'next') {
      const query = args.join(' ');
      if (!query) return message.reply('❌ Usage: @next {song name or URL}');
      const vc = message.member.voice.channel;
      if (!vc) return message.reply('❌ Join a voice channel first.');
      let url, title;
      if (ytdl.validateURL(query)) {
        url = query;
        const vd = await ytdl.getInfo(url);
        title = vd.videoDetails.title;
      } else {
        const res = await ytSearch(query);
        if (!res.videos.length) return message.reply('❌ No results found.');
        url = res.videos[0].url;
        title = res.videos[0].title;
      }
      const q = await ensureQueue(message.guild, vc);
      q.queue.splice(1, 0, { title, url });
      return message.reply(`⏭️ Will play **${title}** next.`);
    }
  
    // PLAYLIST
    if (cmd === 'playlist') {
      const url = args[0];
      if (!url) return message.reply('❌ Usage: @playlist {YouTube or Spotify playlist URL}');
      const vc = message.member.voice.channel;
      if (!vc) return message.reply('❌ Join a voice channel first.');
      const entries = [];
  
      // Spotify playlist
      if (url.match(/open\.spotify\.com\/playlist/)) {
        const tracks = await getTracks(url);
        for (const t of tracks) {
          const res = await ytSearch(`${t.name} ${t.artists.join(' ')}`);
          if (res.videos.length) entries.push({ title: t.name, url: res.videos[0].url });
        }
      }
      // YouTube playlist
      else if (ytpl.validateID(url) || url.includes('list=')) {
        const pl = await ytpl(url, { pages: Infinity });
        for (const item of pl.items) {
          entries.push({ title: item.title, url: item.shortUrl });
        }
      } else {
        return message.reply('❌ Invalid playlist URL.');
      }
  
      const q = await ensureQueue(message.guild, vc);
      q.queue.push(...entries);
      if (!q.playing) playNext(message.guild.id);
      return message.reply(`✅ Enqueued **${entries.length}** tracks from playlist.`);
    }
  
    // SONGINFO
    if (cmd === 'songinfo') {
      const query = args.join(' ');
      if (!query) return message.reply('❌ Usage: @songinfo {song name or URL}');
      let embed;
  
      // Spotify track?
      if (query.match(/open\.spotify\.com\/track/)) {
        const d = await getData(query);
        embed = new EmbedBuilder()
          .setTitle(d.name)
          .setURL(query)
          .addFields(
            { name: 'Artist(s)', value: d.artists.join(', '), inline: true },
            { name: 'Album',     value: d.album, inline: true },
            { name: 'Duration',  value: formatDuration(d.duration_ms/1000), inline: true }
          )
          .setThumbnail(d.albumImageUrl);
      }
      // YouTube URL?
      else if (ytdl.validateURL(query)) {
        const info = await ytdl.getInfo(query);
        const v = info.videoDetails;
        embed = new EmbedBuilder()
          .setTitle(v.title)
          .setURL(query)
          .addFields(
            { name: 'Channel',   value: v.author.name, inline: true },
            { name: 'Duration',  value: formatDuration(v.lengthSeconds), inline: true },
            { name: 'Views',     value: v.viewCount, inline: true },
            { name: 'Published', value: v.publishDate, inline: true }
          )
          .setThumbnail(v.thumbnails.pop().url);
      }
      // keywords -> YouTube search
      else {
        const res = await ytSearch(query);
        if (!res.videos.length) return message.reply('❌ No results found.');
        const v = res.videos[0];
        embed = new EmbedBuilder()
          .setTitle(v.title)
          .setURL(v.url)
          .addFields(
            { name: 'Channel',   value: v.author.name, inline: true },
            { name: 'Duration',  value: v.timestamp, inline: true },
            { name: 'Views',     value: v.views.toString(), inline: true },
            { name: 'PublishedAgo', value: v.ago, inline: true }
          )
          .setThumbnail(v.thumbnail);
      }
  
      return message.reply({ embeds: [embed] });
    }
  });
  
  client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
  });
  
  client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');