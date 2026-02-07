// Angel Bot 24/7 🪽
// By Pai 💖 For ซีม่อน

require("dotenv").config();
const fs = require("fs");

const {
	Client,
	GatewayIntentBits,
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ChannelType,
} = require("discord.js");

const {
	joinVoiceChannel,
	entersState,
	VoiceConnectionStatus,
	getVoiceConnection,
} = require("@discordjs/voice");

const cron = require("node-cron");

// ================= CONFIG =================

const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;

const DATA_FILE = "./data.json";

const IMAGE_URL = "https://cdn.discordapp.com/attachments/1469708771440857211/1469724465922310399/IMG_0154.png";

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
			.setDescription("ให้บอทเข้า VC ค้าง 24/7"),

		new SlashCommandBuilder()
			.setName("serverinfo")
			.setDescription("ดูข้อมูลเซิฟเวอร์"),

		new SlashCommandBuilder()
			.setName("autogreet")
			.setDescription("ตั้งค่าช่องทักทาย")
			.addChannelOption(opt =>
				opt.setName("channel")
					.setRequired(true)
					.setDescription("เลือกช่อง")
			),

		new SlashCommandBuilder()
			.setName("setnotify")
			.setDescription("ตั้งค่าระบบแจ้งเตือน")
			.addChannelOption(o => o.setName("create").setDescription("แจ้งเตือนสร้าง").setRequired(true))
			.addChannelOption(o => o.setName("delete").setDescription("แจ้งเตือนลบ").setRequired(true))
			.addChannelOption(o => o.setName("join").setDescription("เข้า VC").setRequired(true))
			.addChannelOption(o => o.setName("leave").setDescription("ออก VC").setRequired(true))

	].map(c => c.toJSON());

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
		return i.reply({ content: "❌ เฉพาะซีม่อนเท่านั้นนะค้าบ", ephemeral: true });
	}

	// ================= stayvc =================

	if (i.commandName === "stayvc") {

		const vcs = i.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);

		const menu = new StringSelectMenuBuilder()
			.setCustomId("vc_select")
			.setPlaceholder("🎧 เลือกห้อง")
			.addOptions(vcs.map(v => ({
				label: v.name,
				value: v.id
			})));

		await i.reply({
			components: [new ActionRowBuilder().addComponents(menu)],
			ephemeral: true
		});
	}

	// ================= serverinfo =================

	if (i.commandName === "serverinfo") {

		await i.guild.members.fetch();

		const m = i.guild.members.cache;

		let list = "";

		m.forEach(x => {
			list += `👤 ${x.user.tag}\n📅 ${x.joinedAt.toLocaleString("th-TH")}\n\n`;
		});

		const embed = new EmbedBuilder()
			.setColor(0xff9ad5)
			.setTitle("📊 ข้อมูลเซิฟเวอร์")
			.setDescription(
				`👥 สมาชิก: ${m.filter(x => !x.user.bot).size}\n` +
				`🤖 บอท: ${m.filter(x => x.user.bot).size}\n\n` +
				list
			)
			.setFooter({ text: "Angel Bot 24/7 🪽" })
			.setTimestamp();

		await i.reply({ embeds: [embed], ephemeral: true });

		setTimeout(() => i.deleteReply().catch(() => {}), 10000);
	}

	// ================= autogreet =================

	if (i.commandName === "autogreet") {

		const ch = i.options.getChannel("channel");

		data.autoGreet = ch.id;
		saveData();

		await i.reply(`✅ ตั้งค่าทักทายที่ <#${ch.id}> แล้วค้าบ 💖`);
	}

	// ================= setnotify =================

	if (i.commandName === "setnotify") {

		data.createLog = i.options.getChannel("create").id;
		data.deleteLog = i.options.getChannel("delete").id;
		data.vcJoin = i.options.getChannel("join").id;
		data.vcLeave = i.options.getChannel("leave").id;

		saveData();

		await i.reply("✅ ตั้งค่าระบบแจ้งเตือนเรียบร้อยแล้วค้าบ 💖");
	}
});

// ================= VC SELECT =================

client.on("interactionCreate", async (i) => {

	if (!i.isStringSelectMenu()) return;
	if (i.customId !== "vc_select") return;

	const ch = i.guild.channels.cache.get(i.values[0]);

	const old = getVoiceConnection(i.guild.id);
	if (old) old.destroy();

	const conn = joinVoiceChannel({
		channelId: ch.id,
		guildId: ch.guild.id,
		adapterCreator: ch.guild.voiceAdapterCreator,
		selfDeaf: true,
		selfMute: true,
		group: "angel24"
	});

	await entersState(conn, VoiceConnectionStatus.Ready, 30000);

	await i.update({
		content: `✅ เข้า ${ch.name} แล้วค้าบ 🪽`,
		components: []
	});
});

// ================= EMBED SENDER =================

function sendLog(channelId, embed) {

	if (!channelId) return;

	const ch = client.channels.cache.get(channelId);
	if (!ch) return;

	ch.send({ embeds: [embed] });
}

// ================= CHANNEL CREATE =================

client.on("channelCreate", ch => {

	const embed = new EmbedBuilder()
		.setColor(0x55efc4)
		.setTitle("📁 สร้างห้องใหม่")
		.setDescription(
			`👤 <@${ch.creatorId || "unknown"}>\n` +
			`📂 ${ch.parent ? ch.parent.name : "ไม่มีหมวด"}\n` +
			`#️⃣ <#${ch.id}>\n\n` +
			`📅 ${new Date().toLocaleString("th-TH")}`
		)
		.setTimestamp();

	sendLog(data.createLog, embed);
});

// ================= CHANNEL DELETE =================

client.on("channelDelete", ch => {

	const embed = new EmbedBuilder()
		.setColor(0xff7675)
		.setTitle("🗑️ ลบห้อง")
		.setDescription(
			`📂 ${ch.parent ? ch.parent.name : "ไม่มีหมวด"}\n` +
			`#️⃣ ${ch.name}\n\n` +
			`📅 ${new Date().toLocaleString("th-TH")}`
		)
		.setTimestamp();

	sendLog(data.deleteLog, embed);
});

// ================= VOICE UPDATE =================

client.on("voiceStateUpdate", (oldS, newS) => {

	const user = newS.member || oldS.member;

	// JOIN
	if (!oldS.channel && newS.channel) {

		const embed = new EmbedBuilder()
			.setColor(0x74b9ff)
			.setTitle("🎧 เข้า VC")
			.setDescription(
				`👤 ${user}\n` +
				`🔊 <#${newS.channel.id}>\n\n` +
				`📅 ${new Date().toLocaleString("th-TH")}`
			);

		sendLog(data.vcJoin, embed);
	}

	// LEAVE
	if (oldS.channel && !newS.channel) {

		const embed = new EmbedBuilder()
			.setColor(0xa29bfe)
			.setTitle("🚪 ออก VC")
			.setDescription(
				`👤 ${user}\n` +
				`🔊 <#${oldS.channel.id}>\n\n` +
				`📅 ${new Date().toLocaleString("th-TH")}`
			);

		sendLog(data.vcLeave, embed);
	}
});

// ================= AUTO GREET =================

async function sendEmbed(title, msg, color) {

	if (!data.autoGreet) return;

	const ch = client.channels.cache.get(data.autoGreet);
	if (!ch) return;

	const embed = new EmbedBuilder()
		.setColor(color)
		.setTitle(title)
		.setDescription(msg)
		.setImage(IMAGE_URL)
		.setFooter({ text: "Angel Bot 24/7 🪽" })
		.setTimestamp();

	const m = await ch.send({
		content: "@everyone @here",
		embeds: [embed]
	});

	await m.react(randomHeart());
}

// ================= CRON =================

cron.schedule("0 6 * * *", () => {
	sendEmbed("🌤️ สวัสดีตอนเช้า",
		"💖 อรุณสวัสดิ์ค้าบทุกคนน~\n\n🌞 เช้าแล้วนะ ตื่นได้แล้ววว\n🛁 อาบน้ำ แปรงฟัน ล้างหน้า\n🍳 กินข้าวให้อิ่มๆ\n📚 ไปเรียน / ไปทำงาน / ไปเล่น\n\n✨ ขอให้วันนี้สดใสทั้งวันนะค้าบ 💕",
		0xffc1dc
	);
});

cron.schedule("0 12 * * *", () => {
	sendEmbed("🍽️ เที่ยงแล้ว",
		"💗 เที่ยงแล้วน้าา~\n\n🍛 อย่าลืมกินข้าวนะค้าบ\n🥤 ดื่มน้ำเยอะๆด้วย\n🧠 พักสายตาบ้าง\n\n✨ ดูแลตัวเองดีๆนะค้าบ 🫶",
		0xffe066
	);
});

cron.schedule("0 17 * * *", () => {
	sendEmbed("🌇 ตอนเย็นแล้ว",
		"💕 เย็นแล้ววว~\n\n😴 เหนื่อยมาทั้งวันเลยใช่ม้า\n🍜 ไปหาอะไรกินอร่อยๆ\n🏠 กลับบ้านปลอดภัยนะ\n\n✨ เก่งมากทุกคนเลย 💖",
		0xa29bfe
	);
});

cron.schedule("0 22 * * *", () => {
	sendEmbed("🌙 Good Night",
		"💫 ดึกแล้วนะค้าบ~\n\n📱 วางมือถือบ้างน้า\n🛏️ ไปนอนได้แล้ว\n😴 พักผ่อนให้พอ\n\n✨ ฝันดีนะค้าบทุกคน 💖",
		0x74b9ff
	);
});

cron.schedule("0 0 * * *", () => {
	sendEmbed("🎊 วันใหม่แล้ว",
		"💖 ติ๊งงง~ วันใหม่มาแล้วว\n\n🌈 เริ่มต้นใหม่อีกวัน\n🚀 ขอให้ปังกว่าเดิม\n🪽 Angel อยู่ข้างๆเสมอ\n\n✨ สู้ๆนะค้าบ 💕",
		0x55efc4
	);
});

// ================= LOGIN =================

client.login(TOKEN);
