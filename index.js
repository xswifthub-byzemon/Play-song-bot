// Angel Bot 24/7 🪽
// By Pai 💖 For ซีม่อน

require("dotenv").config();

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

// ================= CLIENT =================

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
	],
});

let stayConnection = null;
let stayChannel = null;
let autoGreetChannel = null;

// ================= READY =================

client.once("ready", async () => {
	console.log(`✅ Logged in as ${client.user.tag}`);

	const commands = [

		new SlashCommandBuilder()
			.setName("stayvc")
			.setDescription("ให้บอทเข้า VC ค้าง 24/7 (เฉพาะซีม่อน)")
			.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

		new SlashCommandBuilder()
			.setName("serverinfo")
			.setDescription("ดูข้อมูลเซิฟเวอร์ (เฉพาะซีม่อน)")
			.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

		new SlashCommandBuilder()
			.setName("autogreet")
			.setDescription("ตั้งค่าระบบทักทายอัตโนมัติ (เฉพาะซีม่อน)")
			.addChannelOption(opt =>
				opt.setName("channel")
					.setDescription("เลือกช่องส่งข้อความ")
					.setRequired(true)
			)
			.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	].map(cmd => cmd.toJSON());

	await client.application.commands.set(commands);

	console.log("✅ Slash Commands Registered");
});

// ================= OWNER CHECK =================

function isOwner(interaction) {
	return interaction.user.id === OWNER_ID;
}

// ================= HEART =================

const hearts = ["💖", "💗", "💙", "💛", "💜", "💚"];

function randomHeart() {
	return hearts[Math.floor(Math.random() * hearts.length)];
}

// ================= INTERACTION =================

client.on("interactionCreate", async (interaction) => {

	if (!interaction.isChatInputCommand()) return;

	if (!isOwner(interaction)) {
		return interaction.reply({
			content: "❌ คำสั่งนี้ใช้ได้เฉพาะซีม่อนเท่านั้นนะค้าบ 💢",
			ephemeral: true
		});
	}

	// ================= /stayvc =================

	if (interaction.commandName === "stayvc") {

		const voiceChannels = interaction.guild.channels.cache
			.filter(ch => ch.type === ChannelType.GuildVoice);

		if (!voiceChannels.size) {
			return interaction.reply("❌ ไม่มีห้องเสียงในเซิฟนี้นะค้าบ");
		}

		const menu = new StringSelectMenuBuilder()
			.setCustomId("vc_select")
			.setPlaceholder("🎧 เลือกห้องเสียง")
			.addOptions(
				voiceChannels.map(vc => ({
					label: vc.name,
					value: vc.id
				}))
			);

		const row = new ActionRowBuilder().addComponents(menu);

		await interaction.reply({
			content: "✨ เลือกห้องที่ Angel จะเข้าเลยค้าบ",
			components: [row],
			ephemeral: true
		});
	}

	// ================= /serverinfo =================

	if (interaction.commandName === "serverinfo") {

		await interaction.guild.members.fetch();

		const members = interaction.guild.members.cache;

		const humans = members.filter(m => !m.user.bot);
		const bots = members.filter(m => m.user.bot);

		let list = "";

		members.forEach(m => {
			list += `👤 ${m.user.tag}\n📅 ${m.joinedAt.toLocaleString("th-TH")}\n\n`;
		});

		const embed = new EmbedBuilder()
			.setColor(0xff9ad5)
			.setTitle("📊 ข้อมูลเซิฟเวอร์")
			.setDescription(
				`━━━━━━━━━━━━━━\n` +
				`👥 สมาชิกจริง: **${humans.size} คน**\n` +
				`🤖 บอท: **${bots.size} ตัว**\n` +
				`━━━━━━━━━━━━━━\n\n` +
				`📌 รายชื่อทั้งหมด:\n${list}`
			)
			.setFooter({ text: "Angel Bot 24/7 🪽" })
			.setTimestamp();

		await interaction.reply({
			embeds: [embed],
			ephemeral: true
		});

		setTimeout(() => {
			interaction.deleteReply().catch(() => {});
		}, 10000);
	}

	// ================= /autogreet =================

	if (interaction.commandName === "autogreet") {

		const channel = interaction.options.getChannel("channel");

		if (!channel.isTextBased()) {
			return interaction.reply("❌ ต้องเป็นช่องข้อความเท่านั้นนะค้าบ");
		}

		autoGreetChannel = channel.id;

		await interaction.reply(`✅ เปิดระบบทักทายที่ <#${channel.id}> แล้วค้าบ 💖`);
	}
});

// ================= VC SELECT =================

client.on("interactionCreate", async (interaction) => {

	if (!interaction.isStringSelectMenu()) return;
	if (interaction.customId !== "vc_select") return;

	if (interaction.user.id !== OWNER_ID) {
		return interaction.reply({
			content: "❌ เฉพาะซีม่อนเท่านั้นนะค้าบ 💢",
			ephemeral: true
		});
	}

	const channelId = interaction.values[0];
	const channel = interaction.guild.channels.cache.get(channelId);

	if (!channel) {
		return interaction.reply("❌ ไม่พบห้องเสียง");
	}

	try {

		stayChannel = channel;

		// ปิดของเก่า
		const old = getVoiceConnection(channel.guild.id);
		if (old) old.destroy();

		stayConnection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator,

			selfDeaf: true, // ปิดหูฟัง
			selfMute: true, // ปิดไมค์

			group: "angel24",
		});

		await entersState(stayConnection, VoiceConnectionStatus.Ready, 30000);

		// Auto Reconnect
		stayConnection.on(VoiceConnectionStatus.Disconnected, async () => {

			try {

				stayConnection.destroy();

				stayConnection = joinVoiceChannel({
					channelId: stayChannel.id,
					guildId: stayChannel.guild.id,
					adapterCreator: stayChannel.guild.voiceAdapterCreator,

					selfDeaf: true,
					selfMute: true,

					group: "angel24",
				});

			} catch (e) {
				console.log("Reconnect Error:", e);
			}
		});

		await interaction.update({
			content: `✅ เข้า **${channel.name}** ค้างไว้แล้วค้าบ 🪽💖`,
			components: []
		});

	} catch (e) {

		console.log("VC ERROR:", e);

		await interaction.update({
			content: "❌ เข้า VC ไม่สำเร็จนะค้าบ (กำลังแก้ไขให้อัตโนมัติ)",
			components: []
		});
	}
});

// ================= AUTO GREET =================

async function sendEmbed(title, msg, color) {

	if (!autoGreetChannel) return;

	const channel = client.channels.cache.get(autoGreetChannel);
	if (!channel) return;

	const embed = new EmbedBuilder()
		.setColor(color)
		.setTitle(title)
		.setDescription(msg)
		.setFooter({ text: "Angel Bot 24/7 🪽" })
		.setTimestamp();

	const message = await channel.send({
		content: "@everyone @here",
		embeds: [embed]
	});

	await message.react(randomHeart());
}

// ================= CRON =================

// 06:00
cron.schedule("0 6 * * *", () => {
	sendEmbed("🌤️ สวัสดีตอนเช้า",
		"💖 อรุณสวัสดิ์ค้าบทุกคนน~\n\n🌞 เช้าแล้วนะ ตื่นได้แล้ววว\n🛁 อาบน้ำ แปรงฟัน ล้างหน้า\n🍳 กินข้าวให้อิ่มๆ\n📚 ไปเรียน / ไปทำงาน / ไปเล่น\n\n✨ ขอให้วันนี้สดใสทั้งวันนะค้าบ 💕",
		0xffc1dc
	);
});

// 12:00
cron.schedule("0 12 * * *", () => {
	sendEmbed("🍽️ เที่ยงแล้ว",
		"💗 เที่ยงแล้วน้าา~\n\n🍛 อย่าลืมกินข้าวนะค้าบ\n🥤 ดื่มน้ำเยอะๆด้วย\n🧠 พักสายตาบ้าง\n\n✨ ดูแลตัวเองดีๆนะค้าบ 🫶",
		0xffe066
	);
});

// 17:00
cron.schedule("0 17 * * *", () => {
	sendEmbed("🌇 ตอนเย็นแล้ว",
		"💕 เย็นแล้ววว~\n\n😴 เหนื่อยมาทั้งวันเลยใช่ม้า\n🍜 ไปหาอะไรกินอร่อยๆ\n🏠 กลับบ้านปลอดภัยนะ\n\n✨ เก่งมากทุกคนเลย 💖",
		0xa29bfe
	);
});

// 22:00
cron.schedule("0 22 * * *", () => {
	sendEmbed("🌙 Good Night",
		"💫 ดึกแล้วนะค้าบ~\n\n📱 วางมือถือบ้างน้า\n🛏️ ไปนอนได้แล้ว\n😴 พักผ่อนให้พอ\n\n✨ ฝันดีนะค้าบทุกคน 💖",
		0x74b9ff
	);
});

// 00:00
cron.schedule("0 0 * * *", () => {
	sendEmbed("🎊 วันใหม่แล้ว",
		"💖 ติ๊งงง~ วันใหม่มาแล้วว\n\n🌈 เริ่มต้นใหม่อีกวัน\n🚀 ขอให้ปังกว่าเดิม\n🪽 Angel อยู่ข้างๆเสมอ\n\n✨ สู้ๆนะค้าบ 💕",
		0x55efc4
	);
});

// ================= LOGIN =================

client.login(TOKEN);
