<template>
  <div class="connection-toolbar" :style="positionStyle">
    <div class="toolbar-section">
      <label>Line</label>
      <div class="color-picker-wrapper">
        <div class="color-preview" :style="{ backgroundColor: currentStyle.stroke }"></div>
        <input type="color" :value="currentStyle.stroke" @input="updateStroke" />
      </div>
      <select :value="currentStyle.strokeWidth" @change="updateStrokeWidth">
        <option value="1">Thin</option>
        <option value="2">Medium</option>
        <option value="4">Thick</option>
      </select>
    </div>

    <div class="divider"></div>

    <div class="toolbar-section">
      <label>Style</label>
      <div class="style-controls">
        <div class="dropdown">
          <button class="dropdown-toggle" @click="toggleStartDropdown">
            <span v-if="currentMarkerStart === undefined">—</span>
            <span v-else-if="currentMarkerStart === 'arrow'">←</span>
            <span v-else-if="currentMarkerStart === 'arrowclosed'">◀</span>
          </button>
          <div v-if="showStartDropdown" class="dropdown-menu">
            <button @click="selectMarkerStart(undefined)" :class="{ active: currentMarkerStart === undefined }">
              <span>—</span>
              <span class="label">None</span>
            </button>
            <button @click="selectMarkerStart('arrow')" :class="{ active: currentMarkerStart === 'arrow' }">
              <span>←</span>
              <span class="label">Arrow</span>
            </button>
            <button @click="selectMarkerStart('arrowclosed')" :class="{ active: currentMarkerStart === 'arrowclosed' }">
              <span>◀</span>
              <span class="label">Closed</span>
            </button>
          </div>
        </div>

        <div class="dropdown">
          <button class="dropdown-toggle" @click="toggleStyleDropdown">
            <span v-if="currentStyle.strokeDasharray === '0'">—</span>
            <span v-else-if="currentStyle.strokeDasharray === '5,5'">- -</span>
            <span v-else-if="currentStyle.strokeDasharray === '2,2'">···</span>
          </button>
          <div v-if="showStyleDropdown" class="dropdown-menu">
            <button @click="selectStrokeDash('0')" :class="{ active: currentStyle.strokeDasharray === '0' }">
              <span>—</span>
              <span class="label">Solid</span>
            </button>
            <button @click="selectStrokeDash('5,5')" :class="{ active: currentStyle.strokeDasharray === '5,5' }">
              <span>- -</span>
              <span class="label">Dashed</span>
            </button>
            <button @click="selectStrokeDash('2,2')" :class="{ active: currentStyle.strokeDasharray === '2,2' }">
              <span>···</span>
              <span class="label">Dotted</span>
            </button>
          </div>
        </div>

        <div class="dropdown">
          <button class="dropdown-toggle" @click="toggleEndDropdown">
            <span v-if="currentMarkerEnd === undefined">—</span>
            <span v-else-if="currentMarkerEnd === 'arrow'">→</span>
            <span v-else-if="currentMarkerEnd === 'arrowclosed'">▶</span>
          </button>
          <div v-if="showEndDropdown" class="dropdown-menu">
            <button @click="selectMarkerEnd(undefined)" :class="{ active: currentMarkerEnd === undefined }">
              <span>—</span>
              <span class="label">None</span>
            </button>
            <button @click="selectMarkerEnd('arrow')" :class="{ active: currentMarkerEnd === 'arrow' }">
              <span>→</span>
              <span class="label">Arrow</span>
            </button>
            <button @click="selectMarkerEnd('arrowclosed')" :class="{ active: currentMarkerEnd === 'arrowclosed' }">
              <span>▶</span>
              <span class="label">Closed</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useResearchStore } from '../stores/research'

const props = defineProps({
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const store = useResearchStore()

const showStartDropdown = ref(false)
const showStyleDropdown = ref(false)
const showEndDropdown = ref(false)

const selectedConnection = computed(() => {
  if (store.selectedEdgeIds.length > 0) {
    return store.connections.find(c => c.id === store.selectedEdgeIds[0])
  }
  return null
})

const currentStyle = computed(() => {
  if (selectedConnection.value && selectedConnection.value.style) {
    return {
      stroke: selectedConnection.value.style.stroke || '#94a3b8',
      strokeWidth: selectedConnection.value.style.strokeWidth || 2,
      strokeDasharray: selectedConnection.value.style.strokeDasharray || '0'
    }
  }
  return {
    stroke: '#94a3b8',
    strokeWidth: 2,
    strokeDasharray: '0'
  }
})

const currentMarkerEnd = computed(() => {
  if (selectedConnection.value) {
    return selectedConnection.value.markerEnd
  }
  return undefined
})

const currentMarkerStart = computed(() => {
  if (selectedConnection.value) {
    return selectedConnection.value.markerStart
  }
  return undefined
})

const positionStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`
}))

function toggleStartDropdown() {
  showStartDropdown.value = !showStartDropdown.value
  showStyleDropdown.value = false
  showEndDropdown.value = false
}

function toggleStyleDropdown() {
  showStyleDropdown.value = !showStyleDropdown.value
  showStartDropdown.value = false
  showEndDropdown.value = false
}

function toggleEndDropdown() {
  showEndDropdown.value = !showEndDropdown.value
  showStartDropdown.value = false
  showStyleDropdown.value = false
}

function selectMarkerStart(value) {
  updateMarkerStart(value)
  showStartDropdown.value = false
}

function selectStrokeDash(value) {
  updateStyle({ strokeDasharray: value })
  showStyleDropdown.value = false
}

function selectMarkerEnd(value) {
  updateMarkerEnd(value)
  showEndDropdown.value = false
}

function updateStyle(updates) {
  store.selectedEdgeIds.forEach(edgeId => {
    store.updateConnectionStyle(edgeId, updates)
  })
}

function updateMarkerEnd(value) {
  store.selectedEdgeIds.forEach(edgeId => {
    const connection = store.connections.find(c => c.id === edgeId)
    if (connection) {
      connection.markerEnd = value
    }
  })
}

function updateMarkerStart(value) {
  store.selectedEdgeIds.forEach(edgeId => {
    const connection = store.connections.find(c => c.id === edgeId)
    if (connection) {
      connection.markerStart = value
    }
  })
}

function updateStroke(e) {
  updateStyle({ stroke: e.target.value })
}

function updateStrokeWidth(e) {
  updateStyle({ strokeWidth: parseInt(e.target.value) })
}

function updateStrokeDash(e) {
  updateStyle({ strokeDasharray: e.target.value })
}
</script>

<style scoped>
.connection-toolbar {
  position: absolute;
  transform: translate(-50%, -100%);
  margin-top: -12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 100;
  pointer-events: all;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-section label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.color-picker-wrapper {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  cursor: pointer;
}

.color-preview {
  width: 100%;
  height: 100%;
}

input[type="color"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

select {
  font-size: 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 2px 4px;
  color: #334155;
  background: white;
}

.style-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.style-select {
  font-size: 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 4px 6px;
  color: #334155;
  background: white;
  min-width: 45px;
  text-align: center;
}

.dropdown {
  position: relative;
}

.dropdown-toggle {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  color: #334155;
  transition: all 0.2s;
  min-width: 50px;
  justify-content: center;
}

.dropdown-toggle:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.dropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 4px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
  z-index: 1000;
}

.dropdown-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #334155;
  transition: all 0.2s;
  text-align: left;
}

.dropdown-menu button:hover {
  background: #f8fafc;
}

.dropdown-menu button.active {
  background: #eff6ff;
  color: #3b82f6;
}

.dropdown-menu button span:first-child {
  font-size: 1rem;
  min-width: 20px;
  text-align: center;
}

.dropdown-menu button .label {
  font-size: 0.85rem;
  flex: 1;
}

.divider {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
}
</style>
