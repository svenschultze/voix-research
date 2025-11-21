import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'

class CollaborationService {
    constructor() {
        this.doc = null
        this.provider = null
        this.persistence = null
        this.papersMap = null
        this.connectionsArray = null
        this.awareness = null
        this.store = null
        this.roomId = null
        this.isSynced = false
    }

    init(roomId, store) {
        if (this.doc) {
            this.destroy()
        }

        this.roomId = roomId
        this.store = store
        this.doc = new Y.Doc()

        // Initialize types
        this.papersMap = this.doc.getMap('papers')
        this.connectionsArray = this.doc.getArray('connections')

        // Setup WebRTC provider
        // Using default public signaling servers for now
        this.provider = new WebrtcProvider(roomId, this.doc, {
            signaling: ['ws://localhost:4444', 'wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com', 'wss://y-webrtc-signaling-us.herokuapp.com']
        })

        this.awareness = this.provider.awareness

        // Setup Persistence
        this.persistence = new IndexeddbPersistence(roomId, this.doc)

        this.persistence.on('synced', () => {
            console.log('Content loaded from IndexedDB')
            this.isSynced = true
            this.applyRemoteToStore()
        })

        // Listen for remote updates
        this.papersMap.observe(() => {
            if (!this.isLocalUpdate) {
                this.applyRemoteToStore()
            }
        })

        this.connectionsArray.observe(() => {
            if (!this.isLocalUpdate) {
                this.applyRemoteToStore()
            }
        })

        // Initial sync from store if empty (optional, usually we trust Yjs/IndexedDB first)
        // But if it's a new room and we have local state, we might want to push it?
        // For simplicity, we'll assume the Yjs doc is the source of truth once connected.
    }

    applyRemoteToStore() {
        if (!this.store) return

        const papers = Array.from(this.papersMap.values())
        const connections = this.connectionsArray.toArray()

        this.store.loadFromCollaboration(papers, connections)
    }

    // Called by store when local state changes
    updateLocalState(papers, connections) {
        if (!this.doc) return

        this.isLocalUpdate = true

        this.doc.transact(() => {
            // Sync Papers
            // Strategy: Update existing, add new, remove missing
            // This is a naive full-sync approach. For better perf, we should track granular deltas.
            // But for this app size, it's acceptable.

            const currentIds = new Set(papers.map(p => p.id))
            const remoteIds = new Set(this.papersMap.keys())

            // Update/Add
            papers.forEach(p => {
                this.papersMap.set(p.id, p)
            })

            // Remove
            remoteIds.forEach(id => {
                if (!currentIds.has(id)) {
                    this.papersMap.delete(id)
                }
            })

            // Sync Connections
            // Y.Array is harder to diff. We'll clear and push if different.
            // Optimization: Only update if length or content changed significantly?
            // For now, we'll just replace content to ensure consistency.
            // NOTE: This might break other users' selection if we are not careful, 
            // but since connections are simple objects, it's okay.
            // A better way for Y.Array is to calculate diff, but let's try simple replace first.

            if (JSON.stringify(this.connectionsArray.toArray()) !== JSON.stringify(connections)) {
                this.connectionsArray.delete(0, this.connectionsArray.length)
                this.connectionsArray.insert(0, connections)
            }
        })

        this.isLocalUpdate = false
    }

    destroy() {
        if (this.provider) {
            this.provider.destroy()
        }
        if (this.persistence) {
            this.persistence.destroy()
        }
        if (this.doc) {
            this.doc.destroy()
        }
        this.doc = null
        this.provider = null
        this.persistence = null
    }
}

export const collaborationService = new CollaborationService()
