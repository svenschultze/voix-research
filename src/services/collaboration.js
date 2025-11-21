import * as Y from 'yjs'
import { toRaw } from 'vue'
import { WebsocketProvider } from 'y-websocket'

class CollaborationService {
    constructor() {
        this.doc = null
        this.provider = null
        this.stateText = null  // Y.Text for JSON storage
        this.awareness = null
        this.store = null
        this.roomId = null
        this.isSynced = false
    }

    init(roomId, store, initialPapers = [], initialConnections = []) {
        if (this.doc) {
            this.destroy()
        }

        this.roomId = roomId
        this.store = store
        this.doc = new Y.Doc()

        // Use a single Text object for JSON state
        this.stateText = this.doc.getText('state')

        // Setup WebSocket provider
        this.provider = new WebsocketProvider('ws://localhost:1234', roomId, this.doc)
        this.awareness = this.provider.awareness

        // Debug connection status
        this.provider.on('status', ({ status }) => {
            console.log('WebSocket status:', status)

            // Check if synced after connection
            if (status === 'connected' && !this.isSynced) {
                setTimeout(() => {
                    this.handleInitialSync(initialPapers, initialConnections)
                }, 100) // Small delay to ensure sync is complete
            }
        })

        this.provider.on('connection-error', (error) => {
            console.error('WebSocket connection error:', error)
        })

        this.provider.on('connection-close', () => {
            console.log('WebSocket connection closed')
        })

        // Listen for remote updates to the JSON text
        this.stateText.observe(() => {
            const jsonStr = this.stateText.toString()
            if (jsonStr) {
                try {
                    const state = JSON.parse(jsonStr)
                    console.log('Applying remote data:', state.papers?.length || 0, 'papers')
                    this.store.loadFromCollaboration(state.papers || [], state.connections || [])
                } catch (e) {
                    console.error('Failed to parse remote state:', e)
                }
            }
        })

        this.provider.on('peers', (peers) => {
            console.log('Connected peers:', peers)
        })
    }

    handleInitialSync(initialPapers, initialConnections) {
        if (this.isSynced) return
        this.isSynced = true

        const currentState = this.stateText.toString()
        const hasRemoteData = currentState.length > 0

        if (!hasRemoteData && initialPapers.length > 0) {
            // Room is empty, seed with our initial data
            console.log('Room is empty, seeding with', initialPapers.length, 'papers')
            const state = {
                papers: initialPapers,
                connections: initialConnections
            }
            this.stateText.insert(0, JSON.stringify(state))
        } else if (hasRemoteData) {
            // Room has data, load it
            try {
                const state = JSON.parse(currentState)
                console.log('Room has', state.papers?.length || 0, 'papers, loading from shared state')
                this.store.loadFromCollaboration(state.papers || [], state.connections || [])
            } catch (e) {
                console.error('Failed to parse existing state:', e)
            }
        } else {
            console.log('Room is empty and no local data to seed')
        }
    }

    // Single method to sync entire state - just update the JSON text
    syncState(papers, connections) {
        if (!this.doc) return

        const state = {
            papers: structuredClone(toRaw(papers)),
            connections: structuredClone(toRaw(connections))
        }

        const jsonStr = JSON.stringify(state)

        // Replace entire text content
        this.doc.transact(() => {
            this.stateText.delete(0, this.stateText.length)
            this.stateText.insert(0, jsonStr)
        })
    }

    destroy() {
        if (this.provider) {
            this.provider.destroy()
        }
        if (this.doc) {
            this.doc.destroy()
        }
        this.doc = null
        this.provider = null
    }
}

export const collaborationService = new CollaborationService()
