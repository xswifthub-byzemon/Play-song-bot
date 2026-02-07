// ===============================
// 🎵 Pai Music Bot PRO By Pai 💖
// For ซีม่อน
// ===============================

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  InteractionType,
  EmbedBuilder
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior
} = require("@discordjs/voice");

const ytdl = require("ytdl-core");
const yts = require("yt-search");

require("dotenv").config();

// ===============================
// CONFIG
// ===============================

const OWNER_ID = process.env.OWNER_ID;

// ===============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const queue = new Map();

// ===============================
// PLAYER
// ===============================

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause
  }
});

// ===============================
// READY
// ===============================

client.once("ready", async () => {

  console.log("🎧 Pai Music Bot PRO Online!");

  const cmd = new SlashCommandBuilder()
    .setName("musicpanel")
    .setDescription("🎵 เปิดแผงควบคุมเพลง (เฉพาะซีม่อน)");

  await client.application.commands.create(cmd);
});

// ===============================
// TIME FORMAT
// ===============================

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ===============================
// PANEL EMBED
// ===============================

function createPanel(guildId) {

  const serverQueue = queue.get(guildId);

  if (!serverQueue || !serverQueue.songs[0]) {

    return new EmbedBuilder()
      .setColor("#ffb6ff")
      .setTitle("🎧 Music Panel")
      .setDescription("❌ ตอนนี้ยังไม่มีเพลงในคิวนะคะ 💔");
  }

  const song = serverQueue.songs[0];

  return new EmbedBuilder()
    .setColor("#ff66cc")
    .setTitle("🎵 Music Panel By Pai 💖")
    .setThumbnail(song.thumbnail)
    .setDescription(
`🎶 **กำลังเล่นอยู่**
> ${song.title}

⏱️ เวลา: ${formatTime(song.duration)}

📃 คิวทั้งหมด: ${serverQueue.songs.length} เพลง

💗 สนุกกับเสียงเพลงนะคะซีม่อน 😘`
    );
}

// ===============================
// PLAY
// ===============================

async function playSong(guild, song) {

  const serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.connection.destroy();
    queue.delete(guild.id);
    return;
  }

  const stream = ytdl(song.url, {
    filter: "audioonly",
    highWaterMark: 1 << 25
  });

  const resource = createAudioResource(stream);

  player.play(resource);
  serverQueue.connection.subscribe(player);

  player.once(AudioPlayerStatus.Idle, () => {

    serverQueue.songs.shift();
    playSong(guild, serverQueue.songs[0]);
  });
}

// ===============================
// INTERACTION
// ===============================

client.on(Events.InteractionCreate, async (interaction) => {

  // =====================
  // SLASH
  // =====================

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "musicpanel") {

      if (interaction.user.id !== OWNER_ID) {

        return interaction.reply({
          content: "❌ คำสั่งนี้สำหรับซีม่อนเท่านั้นนะคะ 💖",
          ephemeral: true
        });
      }

      const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId("add")
          .setLabel("➕ เพิ่มเพลง")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("pause")
          .setLabel("⏸️ พัก")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("resume")
          .setLabel("▶️ เล่น")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("skip")
          .setLabel("⏭️ ข้าม")
          .setStyle(ButtonStyle.Danger)
      );

      const embed = createPanel(interaction.guild.id);

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  // =====================
  // BUTTON
  // =====================

  if (interaction.isButton()) {

    const guild = interaction.guild;
    let serverQueue = queue.get(guild.id);

    // ADD
    if (interaction.customId === "add") {

      const modal = new ModalBuilder()
        .setCustomId("addSong")
        .setTitle("🎵 เพิ่มเพลง");

      const input = new TextInputBuilder()
        .setCustomId("url")
        .setLabel("ใส่ลิงก์ / ชื่อเพลง")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return interaction.showModal(modal);
    }

    // PAUSE
    if (interaction.customId === "pause") {

      player.pause();

      return interaction.reply({
        content: "⏸️ พักเพลงแล้วค่ะ 💕",
        ephemeral: true
      });
    }

    // RESUME
    if (interaction.customId === "resume") {

      player.unpause();

      return interaction.reply({
        content: "▶️ เล่นต่อแล้วค่ะ 💖",
        ephemeral: true
      });
    }

    // SKIP
    if (interaction.customId === "skip") {

      if (!serverQueue) return;

      serverQueue.songs.shift();
      playSong(guild, serverQueue.songs[0]);

      return interaction.reply({
        content: "⏭️ ข้ามเพลงแล้วค่ะ 😘",
        ephemeral: true
      });
    }
  }

  // =====================
  // MODAL
  // =====================

  if (interaction.type === InteractionType.ModalSubmit) {

    if (interaction.customId === "addSong") {

      const input = interaction.fields.getTextInputValue("url");

      const voice = interaction.member.voice.channel;

      if (!voice) {

        return interaction.reply({
          content: "❌ เข้า Voice ก่อนนะคะ 🎧",
          ephemeral: true
        });
      }

      let info;

      if (ytdl.validateURL(input)) {

        info = await ytdl.getInfo(input);

      } else {

        const r = await yts(input);
        info = r.videos[0];
      }

      const song = {
        title: info.title,
        url: info.url,
        duration: info.seconds,
        thumbnail: info.thumbnail
      };

      let serverQueue = queue.get(interaction.guild.id);

      if (!serverQueue) {

        const data = {
          connection: null,
          songs: []
        };

        queue.set(interaction.guild.id, data);

        data.songs.push(song);

        const connection = joinVoiceChannel({
          channelId: voice.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator
        });

        data.connection = connection;

        playSong(interaction.guild, data.songs[0]);

      } else {

        serverQueue.songs.push(song);
      }

      await interaction.reply({
        content: "✅ เพิ่มเพลงเข้าคิวแล้วค่ะ 💕🎶",
        ephemeral: true
      });
    }
  }
});

// ===============================
// LOGIN
// ===============================

client.login(process.env.TOKEN);
