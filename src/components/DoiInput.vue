<template>
  <div class="doi-input-container">
    <input 
      v-model="doi" 
      @keyup.enter="importDoi"
      placeholder="Paste DOI here (e.g., 10.1038/nature12345)"
      :disabled="loading"
    />
    <button @click="importDoi" :disabled="loading">
      {{ loading ? 'Loading...' : 'Import' }}
    </button>

    <!-- VOIX Integration -->
    <tool 
      name="import_doi" 
      description="Import a research paper by its DOI"
      @call="handleImportTool"
    >
      <prop name="doi" type="string" required />
    </tool>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useResearchStore } from '../stores/research'

const store = useResearchStore()
const doi = ref('')
const loading = ref(false)

async function importDoi() {
  if (!doi.value) return
  
  loading.value = true
  try {
    await store.addPaper(doi.value)
    doi.value = ''
  } catch (e) {
    alert('Failed to import DOI')
  } finally {
    loading.value = false
  }
}

async function handleImportTool(e) {
  const { doi: inputDoi } = e.detail
  try {
    await store.addPaper(inputDoi)
    e.detail.success = true
    e.detail.message = `Successfully imported ${inputDoi}`
  } catch (err) {
    e.detail.success = false
    e.detail.error = err.message
  }
}
</script>

<style scoped>
.doi-input-container {
  display: flex;
  gap: 8px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  pointer-events: auto;
}

input {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  width: 300px;
  font-size: 0.9rem;
}

button {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}
</style>
