<template>
  <div class="help-overlay" @click.self="close">
    <div class="panel">
      <div class="panel-header">
        <h2>VOIX Research – Shortcuts & Features</h2>
        <button type="button" class="close-btn" @click="close">✕</button>
      </div>

      <div class="panel-body">
        <section>
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li>
              <span class="key">Ctrl</span> + <span class="key">V</span>
              <span class="desc">Paste a DOI and import the paper at the mouse position (or center).</span>
            </li>
            <li>
              <span class="key">Ctrl</span> + <span class="key">F</span>
              <span class="desc">Open Semantic Scholar spotlight search to find and add papers.</span>
            </li>
            <li>
              <span class="key">Shift</span> + <span class="key">Drag</span>
              <span class="desc">Draw a selection box on the canvas to select multiple papers.</span>
            </li>
            <li>
              <span class="key">Double‑click</span> paper
              <span class="desc">Open the paper details panel.</span>
            </li>
            <li>
              <span class="key">Esc</span>
              <span class="desc">Close spotlight search or this help panel.</span>
            </li>
          </ul>
        </section>

        <section>
          <h3>Canvas & Papers</h3>
          <ul>
            <li>
              <span class="label">Resize papers</span>
              <span class="desc">Drag the bottom‑right corner of a paper node to adjust width and height; abstracts expand as you resize.</span>
            </li>
            <li>
              <span class="label">Open DOI</span>
              <span class="desc">Select a paper and click the ↗ icon in the floating toolbar to open its DOI in a new tab.</span>
            </li>
            <li>
              <span class="label">Connections</span>
              <span class="desc">Use the connection toolbar (when an edge is selected) to change line style and arrowheads.</span>
            </li>
            <li>
              <span class="label">Directional context</span>
              <span class="desc">Each paper exposes a VOIX context (<code>paper_&lt;doi&gt;</code>) with incoming, outgoing, and undirected connections.</span>
            </li>
          </ul>
        </section>

        <section>
          <h3>Paper Details</h3>
          <ul>
            <li>
              <span class="label">Notes</span>
              <span class="desc">Free‑form notes stored separately from the abstract.</span>
            </li>
            <li>
              <span class="label">Abstract</span>
              <span class="desc">Editable abstract initially filled from DOI metadata; changes are persisted.</span>
            </li>
            <li>
              <span class="label">Semantic Scholar</span>
              <span class="desc">Load citation data and use “Add” to pull cited/citing papers onto the canvas.</span>
            </li>
          </ul>
        </section>

        <section>
          <h3>VOIX Tools</h3>
          <ul>
            <li>
              <span class="label"><code>import_paper(doi)</code></span>
              <span class="desc">Import a paper by DOI and add it to the canvas.</span>
            </li>
            <li>
              <span class="label"><code>search_papers(query)</code></span>
              <span class="desc">Search Semantic Scholar and receive a list of matching papers with DOIs.</span>
            </li>
            <li>
              <span class="label"><code>connect_papers(sourceId, targetId)</code></span>
              <span class="desc">Create directed connections between papers; arrowheads control how they appear in contexts.</span>
            </li>
            <li>
              <span class="label"><code>update_paper_metadata</code></span>
              <span class="desc">Update title, notes, and other metadata for any paper.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['close'])

function close() {
  emit('close')
}
</script>

<style scoped>
.help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 60px;
  z-index: 210;
}

.panel {
  width: 720px;
  max-width: calc(100% - 40px);
  max-height: calc(100% - 80px);
  background: #ffffff;
  color: #0f172a;
  border-radius: 12px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.3);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h2 {
  margin: 0;
  font-size: 1rem;
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
  padding: 12px 16px 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

section h3 {
  margin: 0 0 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #111827;
}

section ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

section li {
  display: flex;
  flex-wrap: wrap;
  column-gap: 8px;
  row-gap: 2px;
  font-size: 0.8rem;
  color: #4b5563;
}

.key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 0.72rem;
  font-weight: 500;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.label {
  font-weight: 500;
}

.desc {
  color: #6b7280;
}

.desc::before {
  content: '— ';
}
</style>
