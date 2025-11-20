<template>
  <div class="overlay" @click.self="close">
    <div class="overlay-panel">
      <div class="overlay-header">
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          class="search-input"
          placeholder="Search Semantic Scholar (Ctrl+F)"
        />
        <button type="button" class="close-btn" @click="close">
          ✕
        </button>
      </div>

      <div class="overlay-body">
        <div v-if="error" class="status error">
          {{ error }}
        </div>
        <div v-else-if="loading" class="status">
          Searching…
        </div>
        <div v-else-if="!query.trim()" class="status">
          Type to search for papers on Semantic Scholar.
        </div>
        <div v-else-if="results.length === 0" class="status">
          No results.
        </div>

        <ul v-if="results.length > 0" class="results">
          <li v-for="paper in results" :key="paper.id" class="result-item">
            <div class="result-main">
              <div class="result-title">
                {{ paper.title || paper.doi || paper.arxivId || paper.id }}
              </div>
              <div class="result-meta">
                <span v-if="paper.authors && paper.authors.length > 0">
                  {{ paper.authors[0] }}<span v-if="paper.authors.length > 1"> et al.</span>
                </span>
                <span v-if="paper.year" class="dot">·</span>
                <span v-if="paper.year">{{ paper.year }}</span>
                <span v-if="paper.doi" class="dot">·</span>
                <span v-if="paper.doi" class="doi">{{ paper.doi }}</span>
                <span v-else-if="paper.arxivId" class="dot">·</span>
                <span v-else-if="paper.arxivId" class="doi">arXiv:{{ paper.arxivId }}</span>
              </div>
            </div>
            <button
              type="button"
              class="mini-button"
              :disabled="!canAdd(paper) || addingId === paper.id"
              @click="add(paper)"
            >
              {{ addingId === paper.id ? 'Adding…' : 'Add' }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import axios from 'axios'
import { useResearchStore } from '../stores/research'

const emit = defineEmits(['close'])

const store = useResearchStore()

const query = ref('')
const results = ref([])
const loading = ref(false)
const error = ref('')
const addingId = ref(null)
const inputRef = ref(null)

let debounceTimer = null

watch(query, (newVal) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    runSearch(newVal)
  }, 300)
})

async function runSearch(q) {
  const trimmed = q.trim()
  if (!trimmed) {
    results.value = []
    loading.value = false
    error.value = ''
    return
  }

  loading.value = true
  error.value = ''
  try {
    const papers = await searchSemantic(trimmed)
    results.value = papers
  } catch (e) {
    console.error('Semantic Scholar search failed', e)
    error.value = 'Search failed. Please try again.'
  } finally {
    loading.value = false
  }
}

async function searchSemantic(query) {
  const fn = store.searchSemanticScholar
  if (typeof fn === 'function') {
    return await fn(query)
  }

  const q = query.trim()
  if (!q) return []

  const fields = ['title', 'year', 'authors', 'externalIds'].join(',')

  const response = await axios.get(
    'https://api.semanticscholar.org/graph/v1/paper/search',
    {
      params: {
        query: q,
        limit: 10,
        fields
      }
    }
  )

  const items = response.data?.data || []

  return items.map(p => {
    const authors = Array.isArray(p.authors)
      ? p.authors.map(a => a.name).filter(Boolean)
      : []

    return {
      id: p.paperId,
      title: p.title || '',
      year: p.year || null,
      authors,
      doi: p.externalIds?.DOI || null,
      arxivId: p.externalIds?.ArXiv || p.externalIds?.ARXIV || null
    }
  })
}

function normalizeDoi(raw) {
  if (!raw) return ''
  let doi = String(raw).trim()
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  return doi
}

function doiForPaper(paper) {
  if (paper.doi) return normalizeDoi(paper.doi)
  if (paper.arxivId) return `10.48550/arXiv.${paper.arxivId}`
  return ''
}

function canAdd(paper) {
  return !!doiForPaper(paper)
}

async function add(paper) {
  const doi = doiForPaper(paper)
  if (!doi) return

  addingId.value = paper.id
  try {
    await store.addPaper(doi)
  } catch (e) {
    console.error('Failed to add paper from search', e)
  } finally {
    addingId.value = null
  }
}

function close() {
  emit('close')
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  z-index: 200;
}

.overlay-panel {
  width: 640px;
  max-width: calc(100% - 40px);
  max-height: calc(100% - 120px);
  background: #ffffff;
  color: #0f172a;
  border-radius: 12px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
  display: flex;
  flex-direction: column;
}

.overlay-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  gap: 8px;
}

.search-input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #111827;
  font-size: 0.9rem;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.7);
}

.close-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 9999px;
}

.close-btn:hover {
  background: #e5e7eb;
}

.overlay-body {
  padding: 8px 12px 12px;
  overflow-y: auto;
}

.status {
  font-size: 0.85rem;
  color: #6b7280;
  padding: 6px 2px;
}

.status.error {
  color: #b91c1c;
}

.results {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px;
  border-radius: 8px;
}

.result-item:hover {
  background: #f3f4f6;
}

.result-main {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-meta {
  font-size: 0.75rem;
  color: #6b7280;
  display: flex;
  gap: 4px;
  align-items: center;
}

.doi {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.dot {
  opacity: 0.7;
}

.mini-button {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 9999px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #111827;
  cursor: pointer;
  white-space: nowrap;
}

.mini-button:hover:not(:disabled) {
  background: #e5f0ff;
  border-color: #3b82f6;
}

.mini-button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
