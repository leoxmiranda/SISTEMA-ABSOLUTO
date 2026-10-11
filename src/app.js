// ══════════════════════════════════════════════════════════════
// ⬛  SISTEMA DEL ABSOLUTO — Bot Principal
// ══════════════════════════════════════════════════════════════
// Gestiona las Constelaciones del Dominio Absoluto.
// Asigna apodos secuenciales inmutables a cada miembro.
// ══════════════════════════════════════════════════════════════

import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ActivityType,
} from 'discord.js';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Paths ──────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'constellations.json');

// ── Database helpers ───────────────────────────────────────
function loadDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_PATH)) {
      const empty = { lastCounter: 0, users: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
      return empty;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { lastCounter: 0, users: {} };
  }
}

function saveDB(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── Formatters ─────────────────────────────────────────────
function padNumber(n) {
  return String(n).padStart(6, '0');
}

function constellationNick(number) {
  return `Constelación Sin Nombre N-${padNumber(number)}`;
}

// ── Embed builder (sistema style) ──────────────────────────
function systemEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x00cfff)               // cyan del sistema
    .setTitle(`⬛ ${title}`)
    .setDescription(description)
    .setFooter({ text: '⟡ Sistema del Absoluto v1.0' })
    .setTimestamp();
}

// ── Role finder / creator ──────────────────────────────────
async function ensureRole(guild, roleName, color = 0x00cfff) {
  let role = guild.roles.cache.find(r => r.name === roleName);
  if (!role) {
    role = await guild.roles.create({
      name: roleName,
      color,
      reason: 'Sistema del Absoluto — rol automático',
    });
  }
  return role;
}

// ══════════════════════════════════════════════════════════════
//  CLIENT
// ══════════════════════════════════════════════════════════════
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Slash commands definition ──────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('registro')
    .setDescription('📜 Consulta tu número de Constelación asignado por el Sistema.'),

  new SlashCommandBuilder()
    .setName('puntos')
    .setDescription('⭐ Consulta tus Puntos Estelares actuales.'),

  new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('🏆 Muestra el Top 10 de Constelaciones con más Puntos Estelares.'),

  new SlashCommandBuilder()
    .setName('diario')
    .setDescription('📅 Reclama tus Puntos Estelares diarios (+200 ⭐).'),

  new SlashCommandBuilder()
    .setName('info')
    .setDescription('📖 Información sobre el Sistema del Absoluto y sus reglas.'),

  new SlashCommandBuilder()
    .setName('manual')
    .setDescription('📚 Manual oficial del Sistema del Absoluto. Consulta reglas, roles y entidades.'),

  new SlashCommandBuilder()
    .setName('reset-constelacion')
    .setDescription('🔄 [ADMIN] Reinicia los datos de una constelación.')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('La constelación a reiniciar')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// ══════════════════════════════════════════════════════════════
//  READY
// ══════════════════════════════════════════════════════════════
client.once('ready', async () => {
  console.log('══════════════════════════════════════════════════');
  console.log(`⬛ SISTEMA DEL ABSOLUTO — EN LÍNEA`);
  console.log(`   Bot: ${client.user.tag}`);
  console.log(`   Servidores: ${client.guilds.cache.size}`);
  console.log('══════════════════════════════════════════════════');

  // Status
  client.user.setActivity('las Constelaciones', { type: ActivityType.Watching });

  // Register slash commands
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log('⟡ Registrando comandos slash...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands.map(c => c.toJSON()) },
    );
    console.log('✅ Comandos slash registrados.');
  } catch (err) {
    console.error('❌ Error registrando comandos:', err);
  }
});

// ══════════════════════════════════════════════════════════════
//  MEMBER JOIN — Asignar número secuencial
// ══════════════════════════════════════════════════════════════
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;

  const db = loadDB();
  const odId = member.id;
  let number;
  let isReturning = false;

  // Check if this user already has a number (returning member)
  if (db.users[odId]) {
    number = db.users[odId].number;
    isReturning = true;
  } else {
    // New constellation — assign next number
    db.lastCounter += 1;
    number = db.lastCounter;
    db.users[odId] = {
      number,
      points: 0,
      joinedAt: new Date().toISOString(),
      lastDaily: null,
      customName: null,          // null = sin nombre propio
    };
    saveDB(db);
  }

  const nick = constellationNick(number);

  // Set nickname
  try {
    await member.setNickname(nick, 'Sistema del Absoluto — asignación automática');
  } catch (err) {
    console.error(`No se pudo cambiar el apodo de ${member.user.tag}:`, err.message);
  }

  // Assign role
  try {
    const role = await ensureRole(member.guild, 'Constelación Sin Nombre');
    await member.roles.add(role, 'Sistema del Absoluto — rol automático');
  } catch (err) {
    console.error(`No se pudo asignar rol a ${member.user.tag}:`, err.message);
  }

  // Welcome message in #bienvenida-constelaciones (or first text channel)
  const welcomeCh =
    member.guild.channels.cache.find(c => c.name === 'bienvenida-constelaciones') ||
    member.guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(member.guild.members.me)?.has('SendMessages'));

  if (welcomeCh) {
    const embed = systemEmbed(
      'Nueva Constelación Detectada',
      isReturning
        ? `El alma de **${nick}** ha regresado al Dominio.\n\n` +
          `> *El Sistema recuerda a todas las almas que alguna vez cruzaron este umbral.*\n\n` +
          `⟡ Tu número es permanente. Bienvenido de vuelta.`
        : `Una nueva alma ha sido registrada en el Sistema.\n\n` +
          `**Designación:** \`${nick}\`\n\n` +
          `> *"Hasta que demuestres tu valor, serás conocido solo por tu número."*\n\n` +
          `⟡ Puntos Estelares iniciales: **0 ⭐**\n` +
          `⟡ Usa \`/diario\` cada día para reclamar **+200 ⭐**`,
    );
    welcomeCh.send({ embeds: [embed] }).catch(() => {});
  }
});

// ══════════════════════════════════════════════════════════════
//  NICKNAME CHANGE GUARD — Prevent unauthorized changes
// ══════════════════════════════════════════════════════════════
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (newMember.user.bot) return;

  const db = loadDB();
  const userData = db.users[newMember.id];
  if (!userData) return; // not registered

  const expectedNick = userData.customName || constellationNick(userData.number);

  // If nickname was changed to something else, revert it
  if (newMember.nickname !== expectedNick && newMember.nickname !== null) {
    try {
      await newMember.setNickname(expectedNick, 'Sistema del Absoluto — apodo inmutable');
    } catch {
      // Bot may lack permissions for server owner
    }
  }
});

// ══════════════════════════════════════════════════════════════
//  SLASH COMMAND HANDLER
// ══════════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const db = loadDB();
  const userId = interaction.user.id;

  // ── /registro ──────────────────────────────────────────
  if (interaction.commandName === 'registro') {
    const userData = db.users[userId];
    if (!userData) {
      return interaction.reply({
        embeds: [systemEmbed(
          'Registro No Encontrado',
          'No estás registrado en el Sistema.\n\nTu número se asigna automáticamente al unirte al servidor.',
        )],
        ephemeral: true,
      });
    }

    const nick = userData.customName || constellationNick(userData.number);
    const embed = systemEmbed(
      'Registro de Constelación',
      `**Designación:** \`${nick}\`\n` +
      `**Número:** \`N-${padNumber(userData.number)}\`\n` +
      `**Puntos Estelares:** ${userData.points} ⭐\n` +
      `**Registrado:** ${new Date(userData.joinedAt).toLocaleDateString('es-ES')}\n` +
      `**Estado:** ${userData.customName ? '🌟 Nombre Propio' : '⬜ Sin Nombre'}`,
    );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ── /puntos ────────────────────────────────────────────
  if (interaction.commandName === 'puntos') {
    const userData = db.users[userId];
    if (!userData) {
      return interaction.reply({
        embeds: [systemEmbed('Error', 'No estás registrado en el Sistema.')],
        ephemeral: true,
      });
    }

    const embed = systemEmbed(
      'Puntos Estelares',
      `**${userData.customName || constellationNick(userData.number)}**\n\n` +
      `⭐ **${userData.points}** Puntos Estelares\n\n` +
      `> Usa \`/diario\` para reclamar +200 ⭐ cada día.`,
    );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ── /ranking ───────────────────────────────────────────
  if (interaction.commandName === 'ranking') {
    const sorted = Object.entries(db.users)
      .sort(([, a], [, b]) => b.points - a.points)
      .slice(0, 10);

    if (sorted.length === 0) {
      return interaction.reply({
        embeds: [systemEmbed('Ranking', 'Aún no hay constelaciones registradas.')],
      });
    }

    const medals = ['🥇', '🥈', '🥉'];
    let desc = '';
    for (let i = 0; i < sorted.length; i++) {
      const [uid, data] = sorted[i];
      const name = data.customName || constellationNick(data.number);
      const medal = medals[i] || `**${i + 1}.**`;
      desc += `${medal} \`${name}\` — ${data.points} ⭐\n`;
    }

    const embed = systemEmbed('🏆 Ranking de Constelaciones — Top 10', desc);
    return interaction.reply({ embeds: [embed] });
  }

  // ── /diario ────────────────────────────────────────────
  if (interaction.commandName === 'diario') {
    const userData = db.users[userId];
    if (!userData) {
      return interaction.reply({
        embeds: [systemEmbed('Error', 'No estás registrado en el Sistema.')],
        ephemeral: true,
      });
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

    if (userData.lastDaily === today) {
      return interaction.reply({
        embeds: [systemEmbed(
          'Puntos Diarios',
          '⏳ Ya has reclamado tus puntos hoy.\n\nVuelve mañana para reclamar +200 ⭐.',
        )],
        ephemeral: true,
      });
    }

    userData.points += 200;
    userData.lastDaily = today;
    saveDB(db);

    const embed = systemEmbed(
      'Puntos Diarios Reclamados',
      `✅ Has recibido **+200 ⭐** Puntos Estelares.\n\n` +
      `⭐ **Total:** ${userData.points} Puntos Estelares\n\n` +
      `> *Vuelve mañana para reclamar más.*`,
    );
    return interaction.reply({ embeds: [embed] });
  }

  // ── /info ──────────────────────────────────────────────
  if (interaction.commandName === 'info') {
    const embed = systemEmbed(
      'Sistema del Absoluto — Información',
      `**¿Qué es el Sistema del Absoluto?**\n` +
      `El Sistema es la entidad que gobierna el Dominio Absoluto, ` +
      `un mundo donde el Jugador enfrenta escenarios creados por las Constelaciones.\n\n` +
      `**Roles:**\n` +
      `🔷 **El Ser Absoluto** — Soberano del Dominio. Su palabra es ley.\n` +
      `🟢 **El Jugador** — Protagonista de los escenarios en Minecraft.\n` +
      `🔴 **Cronos** — Ejecutor del Caos. Envía calamidades.\n` +
      `🟡 **Aura** — Ejecutora de Bendiciones.\n` +
      `⬜ **Constelaciones** — Los espectadores. Pueden influir con Puntos Estelares.\n\n` +
      `**Reglas Clave:**\n` +
      `1️⃣ El Ser Absoluto tiene poder de veto sobre cualquier escenario.\n` +
      `2️⃣ Los puntos se ganan con \`/diario\` y actividad.\n` +
      `3️⃣ Tu número de constelación es **inmutable** hasta obtener Nombre Propio.\n` +
      `4️⃣ El Mercado Estelar llegará en la **v2.0**.\n\n` +
      `⟡ [Página Web del Sistema](https://eldominioabsoluto.com) · ` +
      `[YouTube](https://youtube.com/@eldominioabsoluto)`,
    );
    return interaction.reply({ embeds: [embed] });
  }

  // ── /manual ──────────────────────────────────────────────
  if (interaction.commandName === 'manual') {
    const manualEmbed = new EmbedBuilder()
      .setColor(0x00cfff)
      .setTitle('📚 MANUAL OFICIAL — Sistema del Absoluto')
      .setDescription('`⬛` *Protocolo de Transmisión v1.0 — Reglas, Roles y Entidades del Dominio Absoluto.*`')
      .setThumbnail('https://raw.githubusercontent.com/leoxmiranda/bot-dominio-absoluto/main/assets/mascot.png')
      .addFields(
        { name: '👑 EL SER ABSOLUTO', value: '_Soberano del Dominio. Su palabra es ley._', inline: false },
        { name: '🟢 EL JUGADOR', value: '_Protagonista de los escenarios en Minecraft._', inline: false },
        { name: '🔴 CRONOS', value: '_Ejecutor del Caos. Envía calamidades._', inline: false },
        { name: '🟡 AURA', value: '_Ejecutora de Bendiciones. Da suministros y curaciones._', inline: false },
        { name: '⬜ CONSTELACIONES', value: '_Los espectadores. Pueden influir con Puntos Estelares._', inline: false },
      )
      .addFields({ name: '📜 REGLAS CLAVE', value: '**1️⃣** El Ser Absoluto tiene poder de veto sobre escenarios.\n**2️⃣** Puntos con \`/diario\` y actividad.\n**3️⃣** Tu número es inmutable hasta obtener Nombre Propio.\n**4️⃣** El Mercado Estelar llega en v2.0.' })
      .setImage('https://raw.githubusercontent.com/leoxmiranda/bot-dominio-absoluto/main/assets/frame_banner_wide.png')
      .setFooter({ text: '⟡ Sistema del Absoluto v1.0 • Página Web: eldominioabsoluto.com' })
      .setTimestamp();
    return interaction.reply({ embeds: [manualEmbed] });
  }

  // ── /reset-constelacion ────────────────────────────────
  if (interaction.commandName === 'reset-constelacion') {
    const target = interaction.options.getUser('usuario');
    if (!db.users[target.id]) {
      return interaction.reply({
        embeds: [systemEmbed('Error', 'Esa constelación no está registrada.')],
        ephemeral: true,
      });
    }

    // Keep the number, reset points
    db.users[target.id].points = 0;
    db.users[target.id].lastDaily = null;
    saveDB(db);

    return interaction.reply({
      embeds: [systemEmbed(
        'Constelación Reiniciada',
        `Los puntos de **${constellationNick(db.users[target.id].number)}** han sido reiniciados a 0.`,
      )],
      ephemeral: true,
    });
  }
});

// ══════════════════════════════════════════════════════════════
//  WEB SERVER (Railway health check)
// ══════════════════════════════════════════════════════════════
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: '⬛ Sistema del Absoluto — En Línea',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⟡ Servidor web en puerto ${PORT}`);
});

// ══════════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════════
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('❌ Error al conectar con Discord:', err.message);
  process.exit(1);
});