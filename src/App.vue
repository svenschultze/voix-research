<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import CanvasBoard from './components/CanvasBoard.vue'
import PaperDetails from './components/PaperDetails.vue'
import SemanticSearchOverlay from './components/SemanticSearchOverlay.vue'
import HelpOverlay from './components/HelpOverlay.vue'
import ManualPaperOverlay from './components/ManualPaperOverlay.vue'

const showSearch = ref(false)
const showHelp = ref(false)
const showManual = ref(false)

function openSearch() {
  showSearch.value = true
}

function closeSearch() {
  showSearch.value = false
}

function openHelp() {
  showHelp.value = true
}

function closeHelp() {
  showHelp.value = false
}

function openManual() {
  showManual.value = true
}

function closeManual() {
  showManual.value = false
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    openSearch()
    return
  }

  // Shift + ? (usually Shift + /) to open help
  if (e.shiftKey && (e.key === '?' || e.key === '/')) {
    e.preventDefault()
    openHelp()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="app-container">
    <div class="canvas-area">
      <button
        type="button"
        class="help-button"
        @click="openHelp"
        aria-label="Show keyboard shortcuts and help"
      >
        ?
      </button>
      <button
        type="button"
        class="add-button"
        @click="openManual"
        aria-label="Add paper manually"
      >
        +
      </button>
      <CanvasBoard />
    </div>
    <PaperDetails />

    <SemanticSearchOverlay v-if="showSearch" @close="closeSearch" />
    <HelpOverlay v-if="showHelp" @close="closeHelp" />
    <ManualPaperOverlay v-if="showManual" @close="closeManual" />
  </div>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

* {
  box-sizing: border-box;
}
</style>

<style scoped>
.app-container {
  display: flex;
  width: 100%;
  height: 100%;
}

.canvas-area {
  flex: 1;
  position: relative;
  height: 100%;
}

.help-button {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 20;
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 4px 8px rgba(15, 23, 42, 0.15);
}

.help-button:hover {
  background: #f8fafc;
}

.add-button {
  position: absolute;
  top: 16px;
  left: 56px;
  z-index: 20;
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
  box-shadow: 0 4px 8px rgba(15, 23, 42, 0.15);
}

.add-button:hover {
  background: #f8fafc;
}
</style>
