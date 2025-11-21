<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import CanvasBoard from './components/CanvasBoard.vue'
import PaperDetails from './components/PaperDetails.vue'
import SemanticSearchOverlay from './components/SemanticSearchOverlay.vue'
import HelpOverlay from './components/HelpOverlay.vue'
import ManualPaperOverlay from './components/ManualPaperOverlay.vue'
import { useResearchStore } from './stores/research'

const showSearch = ref(false)
const showHelp = ref(false)
const showManual = ref(false)
const store = useResearchStore()
const hasOpenPaper = computed(() => !!store.openPaper)
const hasAnyPapers = computed(() => store.papers.length > 0)
const libraryNames = computed(() => store.libraries || [])
const activeLibrary = computed(() => store.activeLibraryName || 'default')

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

async function copyBibtexTop() {
  if (!store.papers.length) return
  try {
    const bibtex = store.exportAllPapersAsBibtex()
    if (!bibtex) return
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(bibtex)
    } else {
      console.log(bibtex)
    }
    const blob = new Blob([bibtex], { type: 'text/x-bibtex' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'voix-research.bib'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Failed to copy BibTeX', e)
  }
}

function saveLibraryFile() {
  const payload = {
    library: activeLibrary.value,
    papers: store.papers,
    connections: store.connections,
    exportedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = String(activeLibrary.value || 'library').replace(/[^A-Za-z0-9_\-]/g, '_')
  a.download = `${safeName}.vrl`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function openLibraryFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.vrl,application/json'
  input.onchange = (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result || '')
        const parsed = JSON.parse(text)
        if (parsed && (parsed.papers || parsed.connections)) {
          store.loadFromRawState({
            papers: parsed.papers || [],
            connections: parsed.connections || []
          })
        }
      } catch (err) {
        console.error('Failed to load library file', err)
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

function handleLibraryChange(event) {
  const value = event.target.value
  if (value === '__new__') {
    const name = window.prompt('New library name:')
    if (name && name.trim()) {
      store.createLibrary(name.trim())
    }
    return
  }
  if (value && value !== activeLibrary.value) {
    store.switchLibrary(value)
  }
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    openSearch()
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    saveLibraryFile()
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
    e.preventDefault()
    openLibraryFile()
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
        title="Help (shortcuts & features)"
      >
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="1.6" />
          <path d="M12 16v-1.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          <path d="M9.8 9.2a2.2 2.2 0 0 1 4.4 0c0 1.1-.7 1.6-1.4 2.1-.6.4-1 .7-1 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" />
        </svg>
      </button>
      <button
        type="button"
        class="add-button"
        @click="openManual"
        aria-label="Add paper manually"
        title="Add paper manually"
      >
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="1.6" />
          <path d="M12 8v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          <path d="M8 12h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </button>
      <button
        type="button"
        class="bibtex-button"
        @click="copyBibtexTop"
        :disabled="!hasAnyPapers"
        aria-label="Download BibTeX for all papers"
        title="Download BibTeX for all papers"
      >
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="6" y="4" width="12" height="16" rx="2" ry="2" stroke="currentColor" fill="none" stroke-width="1.6" />
          <path d="M9 9h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          <path d="M9 12h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          <path d="M9 15h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
      </button>

      <div class="library-switcher">
        <select :value="activeLibrary" @change="handleLibraryChange">
          <option v-for="name in libraryNames" :key="name" :value="name">
            {{ name }}
          </option>
          <option value="__new__">+ New library…</option>
        </select>
      </div>
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
  width: 32px;
  height: 32px;
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
  width: 32px;
  height: 32px;
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

.bibtex-button {
  position: absolute;
  top: 16px;
  left: 96px;
  z-index: 20;
  width: 32px;
  height: 32px;
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

.bibtex-button:disabled {
  opacity: 0.4;
  cursor: default;
  box-shadow: none;
}

.bibtex-button:not(:disabled):hover {
  background: #f8fafc;
}

.help-button .icon,
.add-button .icon,
.bibtex-button .icon {
  width: 20px;
  height: 20px;
}

.library-switcher {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 20;
}

.library-switcher select {
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 9999px;
  border: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
}
</style>
