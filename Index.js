const { default: makeWASocket, useMultiFileAuthState, delay, disconnectType } = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function iniciarBot() {
    // Guarda la sesión en una carpeta llamada 'sesion-bot' para no tener que vincular siempre
    const { state, saveCreds } = await useMultiFileAuthState('./sesion-bot');
    
    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, // Desactivado para usar Pair Code
        auth: state
    });

    // Solicitar el código de emparejamiento si el bot no está vinculado
    if (!sock.authState.creds.registered) {
        const numero = await question('Introduce tu número de WhatsApp con código de país (ej: 5491122334455): ');
        const numeroLimpio = numero.replace(/[^0-9]/g, '');
        
        console.log('Generando código...');
        await delay(3000); 
        const codigo = await sock.requestPairingCode(numeroLimpio);
        console.log(`\n🔑 TU CÓDIGO DE EMPAREJAMIENTO ES: ${codigo}\n`);
    }

    // Guardar credenciales cuando se actualizan
    sock.ev.on('creds.update', saveCreds);
    
    // Monitorear el estado de la conexión
    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'close') {
            console.log('Conexión perdida. Reiniciando bot...');
            iniciarBot();
        } else if (connection === 'open') {
            console.log('¡Bot conectado y activo en WhatsApp!');
        }
    });

    // ESCUCHAR Y RESPONDER MENSAJES
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return; // Ignora mensajes propios o vacíos

        const textoRecibido = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const remitente = msg.key.remoteJid;

        // Comando simple: si alguien escribe "hola", el bot responde
        if (textoRecibido && textoRecibido.toLowerCase() === 'hola') {
            await sock.sendMessage(remitente, { text: '¡Hola! Soy un bot de WhatsApp automatizado. ¿En qué puedo ayudarte?' });
        }
    });
}

iniciarBot();
