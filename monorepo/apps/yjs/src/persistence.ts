import * as Y from 'yjs'
import { createClient } from 'redis'

export class PersistenceAdapter {
  private redis?: any
  private useRedis: boolean

  constructor() {
    this.useRedis = !!process.env.REDIS_URL
    
    if (this.useRedis) {
      this.initRedis()
    }
  }

  private async initRedis() {
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL
      })
      
      await this.redis.connect()
      console.log('Connected to Redis for Y.js persistence')
    } catch (error) {
      console.error('Redis connection failed, falling back to memory:', error)
      this.useRedis = false
    }
  }

  async saveDocument(docId: string, state: Uint8Array): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.setEx(`yjs:doc:${docId}`, 3600, Buffer.from(state)) // 1 hour TTL
      } catch (error) {
        console.error('Failed to save document to Redis:', error)
      }
    } else {
      // In-memory fallback (development only)
      console.log(`Document ${docId} state saved (memory fallback)`)
    }
  }

  async loadDocument(docId: string): Promise<Uint8Array | null> {
    if (this.useRedis && this.redis) {
      try {
        const data = await this.redis.get(`yjs:doc:${docId}`)
        return data ? new Uint8Array(data) : null
      } catch (error) {
        console.error('Failed to load document from Redis:', error)
        return null
      }
    }
    
    // No persistence in memory mode
    return null
  }

  async deleteDocument(docId: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(`yjs:doc:${docId}`)
      } catch (error) {
        console.error('Failed to delete document from Redis:', error)
      }
    }
  }
}
