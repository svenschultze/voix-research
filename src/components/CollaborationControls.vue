

<template>
  <div class="collaboration-controls">
    <div v-if="!isConnected" class="start-controls">
      <button v-if="!showInput" @click="startSession" class="collab-btn primary">
        <span class="icon">👥</span> Start Collaboration
      </button>
      <button v-if="!showInput" @click="showInput = true" class="collab-btn secondary">
        Join Room
      </button>
      
      <div v-if="showInput" class="join-input">
        <input v-model="roomIdInput" placeholder="Enter Room ID" @keyup.enter="joinSession" />
        <button @click="joinSession" class="confirm-btn">Join</button>
        <button @click="showInput = false" class="cancel-btn">✕</button>
      </div>
    </div>

    <div v-else class="active-session">
      <div class="status">
        <span class="indicator">●</span>
        <span class="count">{{ onlineCount }} Online</span>
      </div>
      <div class="room-info">
        <span class="room-id">Room: {{ currentRoom }}</span>
        <button @click="copyLink" class="icon-btn" title="Copy Link">🔗</button>
      </div>
      <button @click="disconnect" class="disconnect-btn">Stop</button>
    </div>
    
    <!-- Debug Controls -->
    <div v-if="isConnected" class="debug-controls">
      <button @click="forcePush" class="debug-btn" title="Force Push Local State">⬆ Push</button>
      <button @click="logState" class="debug-btn" title="Log Yjs State">Unknown Log</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useResearchStore } from '../stores/research'
import { collaborationService } from '../services/collaboration'

const store = useResearchStore()
const showInput = ref(false)
const roomIdInput = ref('')

const isConnected = computed(() => store.isCollaborating)
const onlineCount = computed(() => store.onlineUsers)
const currentRoom = computed(() => store.collaborationRoomId)

function startSession() {
  const newRoomId = Math.random().toString(36).substring(2, 15)
  store.initCollaboration(newRoomId, true) // Owner
  updateUrl(newRoomId)
}

function joinSession() {
  if (roomIdInput.value) {
    store.initCollaboration(roomIdInput.value, false) // Guest
    updateUrl(roomIdInput.value)
    showInput.value = false
  }
}

function disconnect() {
  store.stopCollaboration()
  updateUrl(null)
}

function updateUrl(roomId) {
  const url = new URL(window.location.href)
  if (roomId) {
    url.searchParams.set('room', roomId)
  } else {
    url.searchParams.delete('room')
  }
  window.history.pushState({}, '', url)
}

function copyLink() {
  const url = window.location.href
  navigator.clipboard.writeText(url)
  alert('Link copied to clipboard!')
}

function forcePush() {
  console.log('Force pushing local state...')
  collaborationService.updateLocalState(store.papers, store.connections)
}

function logState() {
  console.log('--- Yjs State Debug ---')
  console.log('Room:', collaborationService.roomId)
  console.log('Synced:', collaborationService.isSynced)
  console.log('Papers Map Size:', collaborationService.papersMap?.size)
  console.log('Papers Map Content:', collaborationService.papersMap?.toJSON())
  console.log('Connections Array Length:', collaborationService.connectionsArray?.length)
  console.log('Connections Array Content:', collaborationService.connectionsArray?.toArray())
  console.log('Awareness States:', collaborationService.awareness?.getStates())
  console.log('-----------------------')
}
</script>

<style scoped>
.collaboration-controls {
  position: fixed;
  top: 1rem;
  z-index: 100;
  background: white;
  padding: 0.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.collab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.collab-btn.primary {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.collab-btn.primary:hover {
  background: #dbeafe;
}

.collab-btn.secondary:hover {
  background: #f8fafc;
}

.join-input {
  display: flex;
  gap: 0.25rem;
}

.join-input input {
  padding: 0.25rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.875rem;
  width: 120px;
}

.confirm-btn {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 0.5rem;
  cursor: pointer;
}

.cancel-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0 0.25rem;
}

.active-session {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.25rem 0.5rem;
}

.status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #16a34a;
  font-weight: 500;
}

.indicator {
  font-size: 0.75rem;
  animation: pulse 2s infinite;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  border-left: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  padding: 0 0.75rem;
}

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
}

.icon-btn:hover {
  background: #f1f5f9;
}

.disconnect-btn {
  background: #fee2e2;
  color: #ef4444;
  border: 1px solid #fecaca;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
}

.disconnect-btn:hover {
  background: #fecaca;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>
