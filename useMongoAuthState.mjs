import { MongoClient } from "mongodb"
import { initAuthCreds } from "@whiskeysockets/baileys/lib/Utils/auth-utils.js";
import { BufferJSON } from '@whiskeysockets/baileys';
import protopkg from "@whiskeysockets/baileys";
const { proto } = protopkg
import pkg from 'lodash';
const { merge } = pkg;

import { configDotenv } from 'dotenv';
configDotenv();

const DB_NAME = 'baileys'
const COLLECTION_NAME = 'auth'

export async function useMongoAuthState(sessionId = 'default') {
  const client = new MongoClient(process.env.MONGO_URI)
  await client.connect()
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME)

  const credsId = `creds-${sessionId}`
  const keysId = `keys-${sessionId}`

  async function readData(id) {
    const doc = await collection.findOne({ _id: id })
    if (!doc) return null
    return JSON.parse(JSON.stringify(doc.data), BufferJSON.reviver)
  }

  async function writeData(id, value) {
    const existing = await readData(id) || {}
    const merged = merge({}, existing, value)
    const serialized = JSON.parse(JSON.stringify(merged, BufferJSON.replacer))
    await collection.updateOne({ _id: id }, { $set: { data: serialized } }, { upsert: true })
  }

  async function removeData(id) {
    await collection.deleteOne({_id: id});
  }

  const state = {
    async state() {
      let creds = await readData(credsId)
      if (!creds) {
        creds = initAuthCreds();
        await writeData(credsId, creds);
      }

      const keys = await readData(keysId) || {}

      return {
        creds,
        keys: {
          get: async (type, ids) => {
            const data = {}
            await Promise.all(
              ids.map(async id => {
                let value = await readData(`${type}-${id}`)
                if (type === 'app-state-sync-key' && value) {
                  value = protopkg.Message.AppStateSyncKeyData.fromObject(value)
                }

                data[id] = value
              })
            )
            return data
          },
          set: async (data) => {
            console.log(data)
            const tasks = []
            for (const category in data) {
              for (const id in data[category]) {
                const fieldId = `${category}-${id}`
                const value = data[category][id]
							  tasks.push(value ? writeData(fieldId, value) : removeData(fieldId))
              }
            }
            await Promise.all(tasks)
          }
        }
      }
    },
    saveCreds: async (creds) => {
      await writeData(credsId, creds)
    }
  }

  return state
}