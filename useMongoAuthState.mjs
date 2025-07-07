import { MongoClient } from "mongodb"
import { initAuthCreds } from "@whiskeysockets/baileys/lib/Utils/auth-utils.js";
import { BufferJSON } from '@whiskeysockets/baileys';
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
            for (const id of ids) {
              const file = `${type}-${id}.json`
              const value = await readData(file)
              
              if (value) {
                data[id] = type === 'app-state-sync-key'
                  ? proto.Message.AppStateSyncKeyData.fromObject(value)
                  : value
              } else {
                console.warn(`[MISSING KEY] ${file} not found`)
              }
            }
            return data
          },
          set: async (data) => {
            const tasks = []
            for (const [key, value] of Object.entries(data)) {
              keys[key] = value
            }
            await writeData(keysId, keys)
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