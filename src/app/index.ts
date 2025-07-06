import pkg from 'whatsapp-web.js';
const { Client, RemoteAuth } = pkg;

import mongopkg from 'wwebjs-mongo';
const { MongoStore } = mongopkg

import mongoose from 'mongoose';

const main = async () => {
    await mongoose.connect(process.env.DB_URI!);
    await mongoose.connection.asPromise();

    return new Promise((resolve, reject) => {
        const store = new MongoStore({ mongoose });

        const client = new Client({
            authStrategy: new RemoteAuth({
                store,
                clientId: 'kanishk',
                backupSyncIntervalMs: 60000,
            }),
            webVersionCache: {
                type: "none"
            }
        });

        client.on('qr', (qr) => {
            console.log("device not linked via qr")
        });

        client.on('remote_session_saved', () => {
            console.log('✅ remote_session_saved');
        });

        client.on('ready', async () => {
            console.log('✅ Client is ready!');

            try {
                const chatId = process.env.JID!;
                const chat = await client.getChatById(chatId);

                const messages = await chat.fetchMessages({ limit: 2 });
                const text = messages[0]?.body || 'No messages found';

                console.log('📩 Fetched text:', text);

                await client.destroy();
                resolve(text);
            } catch (err) {
                reject(err);
            }
        });

        client.on('disconnected', () => {
            console.log('⚠️ Client disconnected');
        });

        client.initialize();
    });
};

export default main;