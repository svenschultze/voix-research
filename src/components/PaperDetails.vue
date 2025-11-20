<template>
  <div v-if="paper" class="paper-details">
    <div class="header">
      <div class="header-top">
        <span class="badge">Paper Details</span>
        <button @click="close" class="close-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <textarea 
        v-model="localPaper.title" 
        @change="save"
        class="title-input" 
        placeholder="Paper Title"
        rows="3"
      ></textarea>
    </div>

    <div class="content">
      <div class="section">
        <label>Authors</label>
        <input 
          v-model="localPaper.authors" 
          @change="save"
          class="input-field" 
          placeholder="Authors"
        />
      </div>

      <div class="row">
        <div class="section half">
          <label>Year</label>
          <input 
            v-model="localPaper.year" 
            @change="save"
            class="input-field" 
            placeholder="Year"
          />
        </div>
        <div class="section half">
          <label>DOI</label>
          <input 
            v-model="localPaper.doi" 
            @change="save"
            class="input-field" 
            placeholder="DOI"
          />
        </div>
      </div>

      <div class="section">
        <label>Notes</label>
        <textarea 
          v-model="localPaper.notes" 
          @change="save"
          class="textarea-field" 
          placeholder="Add your notes..."
        ></textarea>
      </div>

      <div class="section">
        <label>Abstract</label>
        <textarea 
          v-model="localPaper.description"
          @change="save"
          class="textarea-field" 
          placeholder="Add or edit the abstract..."
        ></textarea>
      </div>

      <div class="section citations-section">
        <div class="citations-header">
          <div class="pill">Semantic Scholar</div>
          <div class="counts" v-if="semanticData && hasCounts">
            <span v-if="semanticData.referenceCount != null">
              References: {{ semanticData.referenceCount }}
            </span>
            <span v-if="semanticData.citationCount != null">
              Citations: {{ semanticData.citationCount }}
            </span>
          </div>
          <button
            v-if="!semanticData"
            type="button"
            class="mini-button"
            :disabled="semanticLoading"
            @click="loadSemantic"
          >
            {{ semanticLoading ? 'Loading…' : 'Load citation data' }}
          </button>
        </div>

        <template v-if="semanticData">
          <div class="citations-columns">
            <div class="citations-column">
              <div class="column-title">Papers this paper cites</div>
              <div v-if="references.length === 0" class="empty-text">
                No referenced papers with DOIs found.
              </div>
              <ul v-else class="citation-list">
                <li v-for="ref in references" :key="ref.doi" class="citation-item">
                  <div class="citation-main">
                    <div class="citation-title">
                      {{ ref.title || ref.doi }}
                    </div>
                    <div class="citation-meta">
                      <span v-if="ref.authors && ref.authors.length > 0">
                        {{ ref.authors[0] }}<span v-if="ref.authors.length > 1"> et al.</span>
                      </span>
                      <span v-if="ref.year" class="dot">·</span>
                      <span v-if="ref.year">{{ ref.year }}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="mini-button"
                    @click="addPaper(ref.doi)"
                  >
                    Add
                  </button>
                </li>
              </ul>
            </div>

            <div class="citations-column">
              <div class="column-title">Papers citing this paper</div>
              <div v-if="citations.length === 0" class="empty-text">
                No citing papers with DOIs found.
              </div>
              <ul v-else class="citation-list">
                <li v-for="c in citations" :key="c.doi" class="citation-item">
                  <div class="citation-main">
                    <div class="citation-title">
                      {{ c.title || c.doi }}
                    </div>
                    <div class="citation-meta">
                      <span v-if="c.authors && c.authors.length > 0">
                        {{ c.authors[0] }}<span v-if="c.authors.length > 1"> et al.</span>
                      </span>
                      <span v-if="c.year" class="dot">·</span>
                      <span v-if="c.year">{{ c.year }}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="mini-button"
                    @click="addPaper(c.doi)"
                  >
                    Add
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </template>

        <div v-else class="empty-text helper-text">
          Semantic Scholar citation data has not been loaded for this paper yet.
        </div>
      </div>

      <div class="actions">
         <button @click="deletePaper" class="delete-btn">Delete Paper</button>
      </div>
    </div>

    <!-- VOIX Integration -->
    <context name="open_paper_details">
      ID: {{ paper.id }}
      Title: {{ paper.title }}
      DOI: {{ paper.doi }}
      Description: {{ paper.description }}
    </context>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useResearchStore } from '../stores/research'

const store = useResearchStore()

const paper = computed(() => store.openPaper)

const localPaper = ref({
  id: '',
  title: '',
  authors: '',
  year: '',
  doi: '',
  notes: '',
  description: ''
})

const semanticData = computed(() => paper.value?.semanticScholar || null)
const references = computed(() => semanticData.value?.references || [])
const citations = computed(() => semanticData.value?.citations || [])
const hasCounts = computed(() => {
  const d = semanticData.value
  return d && (d.citationCount != null || d.referenceCount != null)
})
const semanticLoading = ref(false)

// Watch for paper changes and update local copy
watch(paper, (newPaper) => {
  if (newPaper) {
    localPaper.value = {
      id: newPaper.id,
      title: newPaper.title,
      authors: newPaper.authors,
      year: newPaper.year,
      doi: newPaper.doi,
      notes: newPaper.notes || '',
      description: newPaper.description || ''
    }
  }
}, { immediate: true })

function save() {
  if (paper.value) {
    store.updatePaperMetadata(paper.value.id, {
      title: localPaper.value.title,
      authors: localPaper.value.authors,
      year: localPaper.value.year,
      doi: localPaper.value.doi,
      notes: localPaper.value.notes,
      description: localPaper.value.description
    })
  }
}

function close() {
  store.setOpenPaper(null)
}

function deletePaper() {
  if (paper.value && confirm('Are you sure you want to delete this paper?')) {
    store.removePaper(paper.value.id)
    close()
  }
}

function normalizeDoi(raw) {
  if (!raw) return ''
  let doi = String(raw).trim()
  // Strip common URL prefixes so we always pass bare DOIs into addPaper
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  return doi
}

async function addPaper(doi) {
  const clean = normalizeDoi(doi)
  if (!clean) return
  try {
    await store.addPaper(clean)
  } catch (e) {
    console.error('Failed to add referenced/citing paper', e)
  }
}

async function loadSemantic() {
  if (!paper.value || !paper.value.id) return
  if (semanticLoading.value) return

  semanticLoading.value = true
  try {
    await store.loadSemanticScholarForPaper(paper.value.id)
  } catch (e) {
    console.error('Failed to load Semantic Scholar data', e)
  } finally {
    semanticLoading.value = false
  }
}
</script>

<style scoped>
.paper-details {
  width: 400px;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 15px rgba(0,0,0,0.05);
  z-index: 10;
}

.header {
  padding: 24px 24px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.badge {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  background: #e2e8f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #475569;
}

.title-input {
  width: 100%;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  background: transparent;
  border: none;
  resize: none;
  outline: none;
  line-height: 1.3;
  font-family: inherit;
}

.title-input:focus {
    background: rgba(255,255,255,0.5);
}

.content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  gap: 16px;
}

.half {
  flex: 1;
}

label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.input-field, .textarea-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #334155;
  background: #f8fafc;
  transition: all 0.2s;
  font-family: inherit;
}

.textarea-field {
  resize: none;
  field-sizing: content;
  min-height: 100px;
  max-height: none;
  line-height: 1.6;
}

.input-field:focus, .textarea-field:focus {
  background: #ffffff;
  border-color: #3b82f6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.actions {
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
}

.delete-btn {
    width: 100%;
    padding: 10px;
    background: #fee2e2;
    color: #ef4444;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.delete-btn:hover {
    background: #fecaca;
}

.citations-section {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  gap: 12px;
}

.citations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pill {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  background: #e5f0ff;
  color: #1d4ed8;
}

.counts {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  color: #64748b;
}

.citations-columns {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.citations-column {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.column-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.citation-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.citation-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.citation-main {
  flex: 1;
  min-width: 0;
}

.citation-title {
  font-size: 0.8rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.citation-meta {
  font-size: 0.7rem;
  color: #64748b;
  display: flex;
  gap: 4px;
  align-items: center;
}

.dot {
  opacity: 0.7;
}

.mini-button {
  font-size: 0.7rem;
  padding: 4px 8px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #0f172a;
  cursor: pointer;
  white-space: nowrap;
}

.mini-button:hover {
  background: #e5f0ff;
}

.empty-text {
  font-size: 0.75rem;
  color: #94a3b8;
}

.helper-text {
  margin-top: 8px;
}

.readonly-field {
  background: #f1f5f9;
  cursor: default;
}
</style>
