import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { useMongoAuthState } from './useMongoAuthState.mjs';

const startSock = async () => {
    const { state, saveCreds } = await useMongoAuthState('auth');
    console.log(await state())

    const sock = makeWASocket({
        auth: await state()
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;

        if (qr) {
            console.log("Scan this QR code with your phone:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('Connected to WhatsApp!');
        } else if (connection === 'close') {
            console.log('Connection closed. Reconnecting...');
            startSock();
        }
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type === 'notify' && messages[0]?.message?.conversation) {
            console.log("📩 New message:", messages[0].message.conversation, messages[0].key.remoteJid);
            console.log(messages)
        }
    });
};

startSock();

// 918427963666@s.whatsapp.net
