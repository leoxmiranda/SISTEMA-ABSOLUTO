const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Ruta a la base de datos local JSON (persistencia por ID única de Discord)
const dbPath = path.join(__dirname, '../../../../data/constellations.json');

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

module.exports = {
    data: {
        name: 'verify_user' // Coincide exactamente con el customId del botón
    },
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        
        // 🔒 Respuesta diferida EFÍMERA (Privada, solo la ve el usuario)
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const member = interaction.member;
        const guild = interaction.guild;

        // ⚠️ CONFIGURACIÓN DE IDs EN TU DISCORD
        const ROLE_ID = '1557455677365035140'; // ID del rol "Constelación Sin Nombre"
        const WELCOME_CHANNEL_ID = '1558813866991951902'; // ID del canal ✨︱bienvenida-constelaciones

        const db = loadDatabase();
        let userRecord = db.users[userId];
        const hasRole = member.roles.cache.has(ROLE_ID);

        // 🚫 CASO 1: EL USUARIO YA ESTÁ REGISTRADO Y TIENE EL ROL DENTRO DEL SERVIDOR
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
            // 🔄 CASO 2: CONSTELACIÓN QUE REGRESA AL SERVIDOR (Recupera su registro previo)
            isReturningUser = true;
            assignedNickname = userRecord.nickname || `[Constelación Sin Nombre N.º${String(userRecord.number).padStart(7, '0')}]`;
        } else {
            // ✨ CASO 3: NUEVA CONSTELACIÓN EN SECUENCIA
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
            // Asignar el rol
            const role = guild.roles.cache.get(ROLE_ID);
            if (role && !hasRole) {
                await member.roles.add(role);
            }

            // Cambiar el apodo automáticamente
            await member.setNickname(assignedNickname);

            // Actualizar apodo actual en la base de datos
            db.users[userId].nickname = assignedNickname;
            saveDatabase(db);

            // 📢 1. MENSAJE PÚBLICO EN ✨︱bienvenida-constelaciones
            const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID);
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

            // 🔒 2. MENSAJE PRIVADO (EFÍMERO) EN EL CANAL DE REGISTRO
            const privateEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('🌌 [ SINCRONIZACIÓN EXITOSA ]')
                .setDescription(isReturningUser 
                    ? `Bienvenido de vuelta. Tu apodo ha sido restaurado a: **\`${assignedNickname}\`**.`
                    : `Tu sintonización inicial ha concluido. Tu identidad asignada es: **\`${assignedNickname}\`**.`);

            return interaction.editReply({ embeds: [privateEmbed] });

        } catch (error) {
            console.error('Error al sintonizar usuario:', error);
            return interaction.editReply({
                content: '⚠️ Tu registro fue guardado, pero ocurrió un error al actualizar el apodo o publicar el mensaje. Revisa que el rol del bot esté por encima en la jerarquía de roles.'
            });
        }
    }
};
