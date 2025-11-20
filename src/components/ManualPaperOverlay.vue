<template>
  <div class="manual-overlay" @click.self="close">
    <div class="panel">
      <div class="panel-header">
        <h2>Add Paper Manually</h2>
        <button type="button" class="close-btn" @click="close">✕</button>
      </div>

      <form class="panel-body" @submit.prevent="submit">
        <div class="row">
          <div class="field">
            <label>DOI<span class="required">*</span></label>
            <input
              v-model="form.doi"
              type="text"
              class="input"
              placeholder="e.g. 10.1145/3299869.3300081 or 10.48550/arXiv.2106.15928"
              required
            />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Title</label>
            <input
              v-model="form.title"
              type="text"
              class="input"
              placeholder="Paper title"
            />
          </div>
        </div>

        <div class="row">
          <div class="field half">
            <label>Authors</label>
            <input
              v-model="form.authors"
              type="text"
              class="input"
              placeholder="Comma‑separated authors"
            />
          </div>
          <div class="field quarter">
            <label>Year</label>
            <input
              v-model="form.year"
              type="text"
              class="input"
              placeholder="Year"
            />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Abstract</label>
            <textarea
              v-model="form.description"
              class="textarea"
              placeholder="Optional abstract text"
            ></textarea>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Notes</label>
            <textarea
              v-model="form.notes"
              class="textarea"
              placeholder="Optional notes or comments"
            ></textarea>
          </div>
        </div>

        <div class="footer">
          <span v-if="error" class="error">{{ error }}</span>
          <div class="spacer"></div>
          <button
            type="button"
            class="ghost-btn"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="primary-btn"
            :disabled="submitting"
          >
            {{ submitting ? 'Adding…' : 'Add Paper' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useResearchStore } from '../stores/research'

const emit = defineEmits(['close'])

const store = useResearchStore()

const form = ref({
  doi: '',
  title: '',
  authors: '',
  year: '',
  description: '',
  notes: ''
})

const submitting = ref(false)
const error = ref('')

function normalizeDoi(raw) {
  if (!raw) return ''
  let doi = String(raw).trim()
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  return doi
}

async function submit() {
  error.value = ''
  const cleanDoi = normalizeDoi(form.value.doi)
  if (!cleanDoi) {
    error.value = 'DOI is required.'
    return
  }

  submitting.value = true
  try {
    await store.createManualPaper({
      doi: cleanDoi,
      title: form.value.title,
      authors: form.value.authors,
      year: form.value.year,
      description: form.value.description,
      notes: form.value.notes
    })
    emit('close')
  } catch (e) {
    console.error('Failed to create manual paper', e)
    error.value = e?.message || 'Failed to create paper.'
  } finally {
    submitting.value = false
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
.manual-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  z-index: 220;
}

.panel {
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

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 9999px;
}

.close-btn:hover {
  background: #e5e7eb;
}

.panel-body {
  padding: 10px 14px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.field.half {
  flex: 1.4;
}

.field.quarter {
  flex: 0.6;
}

label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.required {
  color: #b91c1c;
  margin-left: 2px;
}

.input {
  padding: 7px 9px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  font-size: 0.85rem;
  background: #f9fafb;
  color: #111827;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
  background: #ffffff;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.45);
}

.textarea {
  padding: 7px 9px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  font-size: 0.85rem;
  background: #f9fafb;
  color: #111827;
  min-height: 70px;
  resize: vertical;
}

.textarea:focus {
  outline: none;
  border-color: #3b82f6;
  background: #ffffff;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.45);
}

.footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.error {
  font-size: 0.8rem;
  color: #b91c1c;
}

.spacer {
  flex: 1;
}

.ghost-btn,
.primary-btn {
  font-size: 0.8rem;
  padding: 6px 10px;
  border-radius: 9999px;
  cursor: pointer;
  border: 1px solid transparent;
}

.ghost-btn {
  background: transparent;
  color: #374151;
  border-color: #d1d5db;
}

.ghost-btn:hover {
  background: #f3f4f6;
}

.primary-btn {
  background: #3b82f6;
  color: #ffffff;
  border-color: #2563eb;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
