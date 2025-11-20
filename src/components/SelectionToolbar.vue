<template>
  <div class="selection-toolbar" :style="positionStyle">
    <div class="toolbar-section">
      <label>Border</label>
      <div class="color-picker-wrapper">
        <div class="color-preview" :style="{ backgroundColor: currentStyle.borderColor }"></div>
        <input type="color" :value="currentStyle.borderColor" @input="updateBorderColor" />
      </div>
      <select :value="currentStyle.borderWidth" @change="updateBorderWidth">
        <option value="1px">Thin</option>
        <option value="2px">Medium</option>
        <option value="4px">Thick</option>
      </select>
    </div>

    <div class="divider"></div>

    <div class="toolbar-section">
      <label>Background</label>
      <div class="color-picker-wrapper">
        <div class="color-preview" :style="{ backgroundColor: currentStyle.backgroundColor }"></div>
        <input type="color" :value="currentStyle.backgroundColor" @input="updateBackgroundColor" />
      </div>
    </div>

    <div class="divider"></div>

    <div class="toolbar-section">
      <label>Text</label>
      <div class="color-picker-wrapper">
        <div class="color-preview" :style="{ backgroundColor: currentStyle.color }"></div>
        <input type="color" :value="currentStyle.color" @input="updateTextColor" />
      </div>
    </div>

    <div class="divider"></div>

    <div class="toolbar-section">
      <button 
        class="toolbar-button"
        type="button"
        :disabled="!selectedPaper || !selectedPaper.doi"
        @click="openDoi"
      >
        <svg
          class="icon-open-in-new"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"
          />
          <path
            d="M5 5h5V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-5h-2v5H5V5z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useResearchStore } from '../stores/research'

const props = defineProps({
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const store = useResearchStore()

const selectedPaper = computed(() => {
  if (store.selectedPapers.length > 0) {
    return store.selectedPapers[0]
  }
  return null
})

const currentStyle = computed(() => {
  if (selectedPaper.value && selectedPaper.value.style) {
    return {
      borderColor: selectedPaper.value.style.borderColor || '#e2e8f0',
      borderWidth: selectedPaper.value.style.borderWidth || '1px',
      backgroundColor: selectedPaper.value.style.backgroundColor || '#ffffff',
      color: selectedPaper.value.style.color || '#1e293b'
    }
  }
  return {
    borderColor: '#e2e8f0',
    borderWidth: '1px',
    backgroundColor: '#ffffff',
    color: '#1e293b'
  }
})

const positionStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`
}))

function updateStyle(updates) {
  store.selectedPapers.forEach(paper => {
    store.updatePaperStyle(paper.id, updates)
  })
}

function updateBorderColor(e) {
  updateStyle({ borderColor: e.target.value })
}

function updateBorderWidth(e) {
  updateStyle({ borderWidth: e.target.value })
}

function updateBackgroundColor(e) {
  updateStyle({ backgroundColor: e.target.value })
}

function updateTextColor(e) {
  updateStyle({ color: e.target.value })
}

function openDoi() {
  if (!selectedPaper.value || !selectedPaper.value.doi) return

  const doi = String(selectedPaper.value.doi).trim()
  if (!doi) return

  const url = doi.startsWith('http://') || doi.startsWith('https://')
    ? doi
    : `https://doi.org/${doi}`

  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.selection-toolbar {
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

.divider {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
}

.toolbar-button {
  font-size: 0.85rem;
  padding: 6px;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: #0f172a;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.toolbar-button:disabled {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}

.toolbar-button:not(:disabled):hover {
  background: rgba(148, 163, 184, 0.18);
}

.toolbar-button:not(:disabled):active {
  transform: scale(0.96);
}

.icon-open-in-new {
  width: 18px;
  height: 18px;
  fill: currentColor;
  display: block;
}
</style>
