// Angel Bot 24/7 🪽
// By Pai 💖 For ซีม่อน

require("dotenv").config();
const fs = require("fs");

const {
	Client,
	GatewayIntentBits,
	SlashCommandBuilder,
	EmbedBuilder,
	ChannelType,
	PermissionsBitField,
} = require("discord.js");

const {
	joinVoiceChannel,
	getVoiceConnection,
	VoiceConnectionStatus,
	entersState,
} = require("@discordjs/voice");

const cron = require("node-cron");

// ================= CONFIG =================

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;

const DATA_FILE = "./data.json";

const IMAGE_URL =
	"https://cdn.discordapp.com/attachments/1469708771440857211/1469724465922310399/IMG_0154.png";

// ================= DATA =================

let data = {
	autoGreet: null,
	createLog: null,
	deleteLog: null,
	vcJoin: null,
	vcLeave: null,
};

if (fs.existsSync(DATA_FILE)) {
	data = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData() {
	fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ================= CLIENT =================

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
	],
});

// ================= READY =================

client.once("ready", async () => {
	console.log(`✅ Logged in as ${client.user.tag}`);

	const commands = [
		new SlashCommandBuilder()
			.setName("stayvc")
			.setDescription("ให้บอทเข้า VC ค้าง 24/7")
			.addChannelOption((opt) =>
				opt
					.setName("voice")
					.setDescription("เลือกห้องเสียง")
					.setRequired(true)
					.addChannelTypes(ChannelType.GuildVoice)
			),

		new SlashCommandBuilder()
			.setName("serverinfo")
			.setDescription("ดูข้อมูลเซิฟเวอร์"),

		new SlashCommandBuilder()
			.setName("autogreet")
			.setDescription("ตั้งค่าช่องทักทาย")
			.addChannelOption((opt) =>
				opt
					.setName("channel")
					.setRequired(true)
					.setDescription("เลือกช่อง")
			),

		new SlashCommandBuilder()
			.setName("setnotify")
			.setDescription("ตั้งค่าระบบแจ้งเตือน")
			.addChannelOption((o) =>
				o.setName("create").setDescription("แจ้งเตือนสร้าง").setRequired(true)
			)
			.addChannelOption((o) =>
				o.setName("delete").setDescription("แจ้งเตือนลบ").setRequired(true)
			)
			.addChannelOption((o) =>
				o.setName("join").setDescription("เข้า VC").setRequired(true)
			)
			.addChannelOption((o) =>
				o.setName("leave").setDescription("ออก VC").setRequired(true)
			),
	].map((c) => c.toJSON());

	await client.application.commands.set(commands);

	console.log("✅ Commands Loaded");
});

// ================= OWNER =================

function isOwner(i) {
	return i.user.id === OWNER_ID;
}

// ================= HEART =================

const hearts = ["💖", "💗", "💙", "💛", "💜", "💚"];

function randomHeart() {
	return hearts[Math.floor(Math.random() * hearts.length)];
}

// ================= INTERACTION =================

client.on("interactionCreate", async (i) => {
	if (!i.isChatInputCommand()) return;

	if (!isOwner(i)) {
		return i.reply({
			content: "❌ เฉพาะซีม่อนเท่านั้นนะค้าบ",
			flags: 64,
		});
	}

	// ================= stayvc =================

	if (i.commandName === "stayvc") {
		const vc = i.options.getChannel("voice");

		if (!vc) {
			return i.reply({
				content: "❌ ไม่พบห้องเสียง",
				flags: 64,
			});
		}

		// ===== CHECK PERMISSION =====

		const me = i.guild.members.me;

		const perms = vc.permissionsFor(me);

		if (
			!perms.has(PermissionsBitField.Flags.Connect) ||
			!perms.has(PermissionsBitField.Flags.Speak) ||
			!perms.has(PermissionsBitField.Flags.ViewChannel)
		) {
			return i.reply({
				content: "❌ บอทไม่มีสิทธิ์เข้า VC ห้องนี้ค้าบ",
				flags: 64,
			});
		}

		let conn = getVoiceConnection(i.guild.id);
		if (conn) conn.destroy();

		try {
			conn = joinVoiceChannel({
				channelId: vc.id,
				guildId: i.guild.id,
				adapterCreator: i.guild.voiceAdapterCreator,
				selfDeaf: false,
				selfMute: false,
			});

			await entersState(conn, VoiceConnectionStatus.Ready, 20000);

			await i.reply({
				content: `✅ เข้า VC: **${vc.name}** แล้วค้าบ 💖`,
				flags: 64,
			});

			setTimeout(() => {
				i.deleteReply().catch(() => {});
			}, 10000);
		} catch (e) {
			if (conn) conn.destroy();

			console.error("VC ERROR:", e);

			await i.reply({
				content: "❌ เข้า VC ไม่สำเร็จค้าบ",
				flags: 64,
			});

			setTimeout(() => {
				i.deleteReply().catch(() => {});
			}, 10000);
		}
	}

	// ================= serverinfo =================

	if (i.commandName === "serverinfo") {
		const g = i.guild;

		await g.members.fetch();

		const humans = g.members.cache.filter((m) => !m.user.bot).size;
		const bots = g.members.cache.filter((m) => m.user.bot).size;

		const embed = new EmbedBuilder()
			.setColor(0xffc1dc)
			.setTitle("📊 ข้อมูลเซิฟเวอร์")
			.setThumbnail(g.iconURL({ dynamic: true }))
			.setDescription(
				`🏷️ ชื่อ: ${g.name}\n` +
					`🆔 ID: ${g.id}\n` +
					`👑 เจ้าของ: <@${g.ownerId}>\n` +
					`👤 สมาชิกจริง: ${humans}\n` +
					`🤖 บอท: ${bots}\n` +
					`📁 หมวดหมู่: ${g.channels.cache.filter(
						(c) => c.type === ChannelType.GuildCategory
					).size}\n` +
					`💬 ห้องแชท: ${g.channels.cache.filter(
						(c) => c.type === ChannelType.GuildText
					).size}\n` +
					`🎧 ห้องเสียง: ${g.channels.cache.filter(
						(c) => c.type === ChannelType.GuildVoice
					).size}\n\n` +
					`📅 สร้างเมื่อ: ${g.createdAt.toLocaleString("th-TH")}`
			)
			.setTimestamp();

		await i.reply({
			embeds: [embed],
			flags: 64,
		});

		setTimeout(() => {
			i.deleteReply().catch(() => {});
		}, 10000);
	}

	// ================= autogreet =================

	if (i.commandName === "autogreet") {
		const ch = i.options.getChannel("channel");

		data.autoGreet = ch.id;
		saveData();

		await i.reply({
			content: `✅ ตั้งค่าทักทายที่ <#${ch.id}> แล้วค้าบ 💖`,
			flags: 64,
		});
	}

	// ================= setnotify =================

	if (i.commandName === "setnotify") {
		data.createLog = i.options.getChannel("create").id;
		data.deleteLog = i.options.getChannel("delete").id;
		data.vcJoin = i.options.getChannel("join").id;
		data.vcLeave = i.options.getChannel("leave").id;

		saveData();

		await i.reply({
			content: "✅ ตั้งค่าระบบแจ้งเตือนเรียบร้อยแล้วค้าบ 💖",
			flags: 64,
		});
	}
});

// ================= LOGIN =================

client.login(TOKEN);
