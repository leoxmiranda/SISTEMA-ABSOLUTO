import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta a la base de datos local JSON
const dbPath = path.join(__dirname, '../../../data/constellations.json');

function loadDatabase() {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ lastCounter: 0, users: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDatabase(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export default {
    name: 'verify_user',
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        
        // 🔒 Respuesta diferida EFÍMERA (Privada)
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const member = interaction.member;
        const guild = interaction.guild;

        // ⚠️ IDs CONFIGURADOS
        const ROLE_ID = '1557455677365035140'; // Rol "Constelación Sin Nombre"
        const WELCOME_CHANNEL_ID = '1558813866991951902'; // Canal ✨︱bienvenida-constelaciones

        const db = loadDatabase();
        let userRecord = db.users[userId];
        const hasRole = member.roles.cache.has(ROLE_ID);

        // 🚫 CASO 1: YA ESTÁ REGISTRADO Y TIENE EL ROL
        if (userRecord && hasRole) {
            const alreadyRegisteredEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('⚠️ [ VÍNCULO ACTIVO ]')
                .setDescription(`Tu alma ya se encuentra vinculada al **Dominio Absoluto**.\n\n**Identidad Registrada:** \`${userRecord.nickname}\`\n*No es necesario ejecutar una nueva sintonización.*`);

            return interaction.editReply({ embeds: [alreadyRegisteredEmbed] });
        }

        let isReturningUser = false;
        let assignedNickname = '';

        if (userRecord) {
            // 🔄 CASO 2: REGRESA AL SERVIDOR
            isReturningUser = true;
            assignedNickname = userRecord.nickname || `[Constelación Sin Nombre N.º${String(userRecord.number).padStart(7, '0')}]`;
        } else {
            // ✨ CASO 3: NUEVA CONSTELACIÓN
            db.lastCounter += 1;
            const formattedNumber = String(db.lastCounter).padStart(7, '0');
            assignedNickname = `[Constelación Sin Nombre N.º${formattedNumber}]`;

            db.users[userId] = {
                number: db.lastCounter,
                nickname: assignedNickname
            };
            saveDatabase(db);
        }

        try {
            // 1. Asignar el rol
            const role = guild.roles.cache.get(ROLE_ID);
            if (role && !hasRole) {
                await member.roles.add(role);
            }

            // 2. Cambiar apodo (Evita error si es el dueño del servidor)
            if (guild.ownerId !== userId) {
                await member.setNickname(assignedNickname);
            }

            // Guardar apodo final en la BD
            db.users[userId].nickname = assignedNickname;
            saveDatabase(db);

            // 📢 3. MENSAJE PÚBLICO EN EL CANAL DE BIENVENIDA (Usa .fetch para forzar la búsqueda)
            try {
                let welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID);
                if (!welcomeChannel) {
                    welcomeChannel = await guild.channels.fetch(WELCOME_CHANNEL_ID);
                }

                if (welcomeChannel) {
                    if (isReturningUser) {
                        const returnEmbed = new EmbedBuilder()
                            .setColor('#00a8ff')
                            .setTitle('🌌 [ SINTONIZACIÓN RESTABLECIDA ]')
                            .setDescription(`La Constelación **${assignedNickname}** (${member}) ha reestablecido su conexión con el **Sistema del Dominio Absoluto**.\n\n*Su registro e historial permanecen intactos.*`)
                            .setTimestamp();

                        await welcomeChannel.send({ embeds: [returnEmbed] });
                    } else {
                        const newEmbed = new EmbedBuilder()
                            .setColor('#00ff88')
                            .setTitle('✨ [ NUEVO REGISTRO EN EL SISTEMA ]')
                            .setDescription(`Una nueva Constelación se ha registrado con éxito en el **Dominio Absoluto**.\n\n**Identidad Asignada:** \`${assignedNickname}\` (${member})\n*Bienvenido al plano de sintonización.*`)
                            .setTimestamp();

                        await welcomeChannel.send({ embeds: [newEmbed] });
                    }
                }
            } catch (channelError) {
                console.error('Error al enviar mensaje al canal de bienvenida:', channelError);
            }

            // 🔒 4. MENSAJE PRIVADO (EFÍMERO)
            const privateEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('🌌 [ SINCRONIZACIÓN EXITOSA ]')
                .setDescription(isReturningUser 
                    ? `Bienvenido de vuelta. Tu apodo ha sido restaurado a: **\`${assignedNickname}\`**.`
                    : `Tu sintonización inicial ha concluido. Tu identidad asignada es: **\`${assignedNickname}\`**.`);

            return interaction.editReply({ embeds: [privateEmbed] });

        } catch (error) {
            console.error('Error crítico al sintonizar usuario:', error);
            return interaction.editReply({
                content: '⚠️ Hubo un error al procesar tu sintonización. Verifica que el rol del bot esté por encima del rol asignado en la jerarquía del servidor.'
            });
        }
    }
};
