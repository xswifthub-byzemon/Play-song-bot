// ===============================
// 🎵 Pai Music Bot By Pai 💖
// For ซีม่อน
// Node.js Discord Music Bot
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
  InteractionType
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior
} = require("@discordjs/voice");

const ytdl = require("ytdl-core");

require("dotenv").config();

// ===============================
// CONFIG
// ===============================

// ใส่ Discord ID ซีม่อนตรงนี้
const OWNER_ID = "ใส่DiscordIDซีม่อนตรงนี้";

// ===============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const queue = new Map();

// ===============================
// AUDIO PLAYER
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
  console.log("🎧 Pai Music Bot Online!");

  const cmd = new SlashCommandBuilder()
    .setName("musicpanel")
    .setDescription("🎵 เปิดแผงควบคุมเพลง (เฉพาะซีม่อน)");

  await client.application.commands.create(cmd);
});

// ===============================
// PLAY FUNCTION
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

  // Slash Command
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
          .setLabel("➕ ใส่ลิงก์เพลง")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("pause")
          .setLabel("⏸️ พักเพลง")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("resume")
          .setLabel("▶️ เล่นต่อ")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("skip")
          .setLabel("⏭️ ข้ามเพลง")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        content:
`🎵 **Music Panel By Pai 💖**

📌 วิธีใช้งาน:
➕ ใส่ลิงก์ → เพิ่มเพลง
⏸️ พัก → หยุดชั่วคราว
▶️ เล่นต่อ → เล่นต่อ
⏭️ ข้าม → เพลงถัดไป

👥 สมาชิกกดปุ่มได้
👑 ซีม่อนเปิด Panel เท่านั้น

✨ สนุกกับเสียงเพลงนะคะ 💕`,
        components: [row]
      });
    }
  }

  // Button
  if (interaction.isButton()) {

    const guild = interaction.guild;
    let serverQueue = queue.get(guild.id);

    // ADD SONG
    if (interaction.customId === "add") {

      const modal = new ModalBuilder()
        .setCustomId("addSong")
        .setTitle("🎵 เพิ่มเพลง");

      const input = new TextInputBuilder()
        .setCustomId("url")
        .setLabel("ใส่ลิงก์ YouTube")
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
      return interaction.reply({ content: "⏸️ พักเพลงแล้วค่ะ", ephemeral: true });
    }

    // RESUME
    if (interaction.customId === "resume") {
      player.unpause();
      return interaction.reply({ content: "▶️ เล่นต่อแล้วค่ะ", ephemeral: true });
    }

    // SKIP
    if (interaction.customId === "skip") {

      if (!serverQueue) return;

      serverQueue.songs.shift();
      playSong(guild, serverQueue.songs[0]);

      return interaction.reply({ content: "⏭️ ข้ามเพลงแล้วค่ะ", ephemeral: true });
    }
  }

  // MODAL
  if (interaction.type === InteractionType.ModalSubmit) {

    if (interaction.customId === "addSong") {

      const url = interaction.fields.getTextInputValue("url");

      if (!ytdl.validateURL(url)) {
        return interaction.reply({
          content: "❌ ลิงก์ไม่ถูกต้องนะคะ",
          ephemeral: true
        });
      }

      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: "❌ ต้องเข้า Voice ก่อนนะคะ 🎧",
          ephemeral: true
        });
      }

      const song = { url };

      let serverQueue = queue.get(interaction.guild.id);

      if (!serverQueue) {

        const queueData = {
          connection: null,
          songs: []
        };

        queue.set(interaction.guild.id, queueData);
        queueData.songs.push(song);

        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator
        });

        queueData.connection = connection;

        playSong(interaction.guild, queueData.songs[0]);

      } else {
        serverQueue.songs.push(song);
      }

      await interaction.reply({
        content: "✅ เพิ่มเพลงเข้าคิวแล้วค่ะ 💕",
        ephemeral: true
      });
    }
  }
});

// ===============================
// LOGIN
// ===============================

client.login(process.env.TOKEN);
