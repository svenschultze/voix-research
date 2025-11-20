<template>
  <div
    class="canvas-wrapper"
    ref="canvasWrapper"
    tabindex="0"
    @paste="handlePaste"
  >
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      @node-drag-stop="onNodeDragStop"
      @connect="handleConnect"
      @nodes-change="handleNodesChange"
      @edges-change="handleEdgesChange"
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
      @mousedown="onPaneMouseDown"
      class="basic-flow"
      :default-viewport="{ zoom: 1 }"
      :min-zoom="0.2"
      :max-zoom="4"
    >
      <Background pattern-color="#aaa" gap="8" />
      <Controls />
      <MiniMap />
    </VueFlow>

    <!-- Inline tutorial when there are no papers -->
    <div v-if="!hasPapers" class="empty-tutorial">
      <div class="empty-inner">
        <h2>Welcome to VOIX Research</h2>
        <p class="empty-subtitle">
          Paste a DOI or search Semantic Scholar to start building your canvas.
        </p>

        <div class="empty-columns">
          <div class="empty-column">
            <h3>Keyboard Shortcuts</h3>
            <ul>
              <li>
                <span class="key">Ctrl</span> + <span class="key">V</span>
                <span class="desc">Paste a DOI and import the paper at your mouse position (or center).</span>
              </li>
              <li>
                <span class="key">Ctrl</span> + <span class="key">F</span>
                <span class="desc">Open Semantic Scholar spotlight search to find and add papers.</span>
              </li>
              <li>
                <span class="key">Shift</span> + <span class="key">Drag</span>
                <span class="desc">Draw a selection box to select multiple papers.</span>
              </li>
              <li>
                <span class="key">Double‑click</span>
                <span class="desc">Open paper details for the clicked paper.</span>
              </li>
            </ul>
          </div>

          <div class="empty-column">
            <h3>Canvas & Tools</h3>
            <ul>
              <li>
                <span class="label">Resize nodes</span>
                <span class="desc">Drag the bottom‑right corner of a paper node to resize and reveal more abstract.</span>
              </li>
              <li>
                <span class="label">Open DOI</span>
                <span class="desc">Select a paper and click the ↗ icon in the toolbar to open its DOI.</span>
              </li>
              <li>
                <span class="label"><code>import_paper(doi)</code></span>
                <span class="desc">VOIX tool to import a paper by DOI.</span>
              </li>
              <li>
                <span class="label"><code>search_papers(query)</code></span>
                <span class="desc">VOIX tool to search Semantic Scholar and receive matching papers.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Drag selection rectangle -->
    <div
      v-if="isSelecting"
      class="selection-rect"
      :style="selectionRectStyle"
    />

    <!-- Selection Toolbar -->
    <SelectionToolbar 
      v-if="researchStore.selectedPapers.length > 0" 
      :position="toolbarPosition"
    />

    <!-- Connection Toolbar -->
    <ConnectionToolbar 
      v-if="researchStore.selectedEdgeIds.length > 0" 
      :position="connectionToolbarPosition"
    />

    <context name="selection_state">
      Selected Papers: {{ researchStore.selectedPaperIds.join(', ') }};
      Open Paper DOI: {{ researchStore.openPaper ? researchStore.openPaper.doi : 'None' }};
    </context>

    <tool 
      name="connect_papers" 
      description="Connect two papers with a directed edge"
      @call="handleConnectPapersTool"
    >
      <prop name="sourceId" type="string" required />
      <prop name="targetId" type="string" required />
      <prop name="label" type="string" />
    </tool>

    <tool
      name="update_paper_metadata"
      description="Update metadata (description) for any paper"
      @call="handleUpdateMetadataTool"
    >
      <prop name="paperId" type="string" required />
      <prop name="description" type="string" required />
    </tool>

    <tool
      name="import_paper"
      description="Import a research paper by its DOI and add it to the canvas at a default position"
      return="paper"
      @call="handleImportPaperTool"
    >
      <prop name="doi" type="string" required />
    </tool>

    <tool
      name="create_manual_paper"
      description="Create a paper manually without fetching external metadata; all fields are optional except DOI"
      return="paper"
      @call="handleCreateManualPaperTool"
    >
      <prop name="doi" type="string" required />
      <prop name="title" type="string" />
      <prop name="authors" type="string" />
      <prop name="year" type="string" />
      <prop name="description" type="string" />
      <prop name="notes" type="string" />
    </tool>

    <tool
      name="search_papers"
      description="Search for papers by query using Semantic Scholar and return a list of matching papers with DOIs where available"
      return="results"
      @call="handleSearchPapersTool"
    >
      <prop name="query" type="string" required />
    </tool>

  </div>
</template>

<script setup>
import { ref, watch, computed, markRaw } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import PaperNode from './PaperNode.vue'
import SelectionToolbar from './SelectionToolbar.vue'
import ConnectionToolbar from './ConnectionToolbar.vue'
import { useResearchStore } from '../stores/research'

// Import CSS
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const researchStore = useResearchStore()
const { applyNodeChanges, applyEdgeChanges, viewport } = useVueFlow()

const canvasWrapper = ref(null)

const nodeTypes = {
  paper: markRaw(PaperNode)
}

const nodes = ref([])
const edges = ref([])
const hasPapers = computed(() => researchStore.papers.length > 0)

// Drag-selection state
const isSelecting = ref(false)
const selectionStart = ref({ x: 0, y: 0 })
const selectionEnd = ref({ x: 0, y: 0 })
const wrapperRect = ref({ left: 0, top: 0 })
const lastPointerPos = ref(null)

// Initialize from store
function syncFromStore() {
  nodes.value = researchStore.papers.map(p => ({
    id: p.id,
    type: 'paper',
    position: p.position,
    data: { ...p },
    selected: researchStore.selectedPaperIds.includes(p.id)
  }))
  
  edges.value = researchStore.connections.map(c => {
    const isSelected = researchStore.selectedEdgeIds.includes(c.id)
    const edgeColor = c.style?.stroke || '#94a3b8'
    
    return {
      id: c.id,
      source: c.source,
      target: c.target,
      label: c.label,
      sourceHandle: c.sourceHandle,
      targetHandle: c.targetHandle,
      type: 'smoothstep',
      markerEnd: c.markerEnd ? { type: c.markerEnd, color: edgeColor } : undefined,
      markerStart: c.markerStart ? { type: c.markerStart, color: edgeColor } : undefined,
      style: {
        stroke: edgeColor,
        strokeWidth: c.style?.strokeWidth || 2,
        strokeDasharray: c.style?.strokeDasharray || '0'
      },
      class: isSelected ? 'selected-edge' : '',
      labelStyle: {
        fill: '#1e293b',
        fontWeight: 500
      },
      labelBgStyle: {
        fill: 'white'
      }
    }
  })
}

// Initial sync
syncFromStore()

// Toolbar positioning
const toolbarPosition = computed(() => {
  if (researchStore.selectedPapers.length === 0) {
    return { x: 0, y: 0 }
  }
  
  // Find the topmost selected paper
  const selectedNodes = nodes.value.filter(n => researchStore.selectedPaperIds.includes(n.id))
  if (selectedNodes.length === 0) {
    return { x: 0, y: 0 }
  }
  
  const topNode = selectedNodes.reduce((top, node) => {
    return node.position.y < top.position.y ? node : top
  })
  
  // Apply viewport transform (pan and zoom)
  const x = topNode.position.x * viewport.value.zoom + viewport.value.x
  const y = topNode.position.y * viewport.value.zoom + viewport.value.y

  const storePaper = researchStore.papers.find(p => p.id === topNode.id)
  let width = 320
  if (storePaper?.style?.width) {
    const parsed = parseInt(storePaper.style.width, 10)
    if (!Number.isNaN(parsed)) {
      width = parsed
    }
  }
  
  // Position toolbar above the topmost node (centered horizontally)
  return {
    x: x + ((width / 2) * viewport.value.zoom),
    y: y
  }
})

// Connection toolbar positioning
const connectionToolbarPosition = computed(() => {
  if (researchStore.selectedEdgeIds.length === 0) {
    return { x: 0, y: 0 }
  }
  
  const selectedEdge = edges.value.find(e => e.id === researchStore.selectedEdgeIds[0])
  if (!selectedEdge) {
    return { x: 0, y: 0 }
  }
  
  // Find the source and target nodes
  const sourceNode = nodes.value.find(n => n.id === selectedEdge.source)
  const targetNode = nodes.value.find(n => n.id === selectedEdge.target)
  
  if (!sourceNode || !targetNode) {
    return { x: 0, y: 0 }
  }
  
  // Calculate midpoint with viewport transform
  const midX = ((sourceNode.position.x + targetNode.position.x) / 2) * viewport.value.zoom + viewport.value.x
  const midY = ((sourceNode.position.y + targetNode.position.y) / 2) * viewport.value.zoom + viewport.value.y
  
  return { x: midX, y: midY }
})

const selectionRectStyle = computed(() => {
  if (!isSelecting.value) {
    return {}
  }

  const x1 = selectionStart.value.x
  const y1 = selectionStart.value.y
  const x2 = selectionEnd.value.x
  const y2 = selectionEnd.value.y

  const left = Math.min(x1, x2)
  const top = Math.min(y1, y2)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  }
})

// Watch store for additions/removals
watch(() => [researchStore.papers, researchStore.connections], () => {
    // Rebuild nodes from store to ensure fresh reactive data
    nodes.value = researchStore.papers.map(p => ({
      id: p.id,
      type: 'paper',
      position: p.position,
      data: { ...p },
      selected: researchStore.selectedPaperIds.includes(p.id)
    }))

    // Sync connections
    edges.value = researchStore.connections.map(c => {
      const isSelected = researchStore.selectedEdgeIds.includes(c.id)
      const edgeColor = c.style?.stroke || '#94a3b8'

      return {
        id: c.id,
        source: c.source,
        target: c.target,
        label: c.label,
        sourceHandle: c.sourceHandle,
        targetHandle: c.targetHandle,
        type: 'smoothstep',
        markerEnd: c.markerEnd ? { type: c.markerEnd, color: edgeColor } : undefined,
        markerStart: c.markerStart ? { type: c.markerStart, color: edgeColor } : undefined,
        style: {
          stroke: edgeColor,
          strokeWidth: c.style?.strokeWidth || 2,
          strokeDasharray: c.style?.strokeDasharray || '0'
        },
        class: isSelected ? 'selected-edge' : '',
        labelStyle: {
          fill: '#1e293b',
          fontWeight: 500
        },
        labelBgStyle: {
          fill: 'white'
        }
      }
    })

}, { deep: true })

// Watch for edge selection changes to update visual styling
watch(() => researchStore.selectedEdgeIds, () => {
  edges.value = researchStore.connections.map(c => {
    const isSelected = researchStore.selectedEdgeIds.includes(c.id)
    const edgeColor = c.style?.stroke || '#94a3b8'
    
    return {
      id: c.id,
      source: c.source,
      target: c.target,
      label: c.label,
      sourceHandle: c.sourceHandle,
      targetHandle: c.targetHandle,
      type: 'smoothstep',
      markerEnd: c.markerEnd ? { type: c.markerEnd, color: edgeColor } : undefined,
      markerStart: c.markerStart ? { type: c.markerStart, color: edgeColor } : undefined,
      style: {
        stroke: edgeColor,
        strokeWidth: c.style?.strokeWidth || 2,
        strokeDasharray: c.style?.strokeDasharray || '0'
      },
      class: isSelected ? 'selected-edge' : '',
      labelStyle: {
        fill: '#1e293b',
        fontWeight: 500
      },
      labelBgStyle: {
        fill: 'white'
      }
    }
  })
}, { deep: true })


function handleNodesChange(changes) {
  // Apply changes to local state
  applyNodeChanges(changes, nodes.value)

  changes.forEach(change => {
    if (change.type === 'select') {
      if (change.selected) {
         if (!researchStore.selectedPaperIds.includes(change.id)) {
             researchStore.selectPaper(change.id, true)
         }
      } else {
         if (researchStore.selectedPaperIds.includes(change.id)) {
             researchStore.selectPaper(change.id, true)
         }
      }
    }
    
    // Sync position to store immediately (this triggers toolbar update)
    if (change.type === 'position' && change.position) {
        researchStore.updatePaperPosition(change.id, change.position)
        // Also update local node position for immediate toolbar repositioning
        const localNode = nodes.value.find(n => n.id === change.id)
        if (localNode) {
          localNode.position = change.position
        }
    }

    // Handle removal
    if (change.type === 'remove') {
        researchStore.removePaper(change.id)
    }
  })
}

function handleEdgesChange(changes) {
    applyEdgeChanges(changes, edges.value)
    
    changes.forEach(change => {
        if (change.type === 'remove') {
            researchStore.removeConnection(change.id)
        }
        if (change.type === 'select') {
            if (change.selected) {
                if (!researchStore.selectedEdgeIds.includes(change.id)) {
                    researchStore.selectEdge(change.id, false)
                }
            } else {
                if (researchStore.selectedEdgeIds.includes(change.id)) {
                    researchStore.clearEdgeSelection()
                }
            }
        }
    })
}

function onNodeDragStop(event) {
    const node = event.node
    researchStore.updatePaperPosition(node.id, node.position)
}

function onNodeClick(event) {
    // Only open paper details on double-click
    if (event?.event?.detail === 2) {
        researchStore.setOpenPaper(event.node.id)
    }
    // Clear edge selection when clicking a node
    researchStore.clearEdgeSelection()
}

function onEdgeClick(event) {
    researchStore.selectEdge(event.edge.id, false)
    // Clear paper selection when clicking an edge
    researchStore.clearSelection()
}

function handleConnect(params) {
    researchStore.connectPapers(params.source, params.target, '', params.sourceHandle, params.targetHandle)
}

function getPastePosition() {
    if (!canvasWrapper.value) return null

    const rect = canvasWrapper.value.getBoundingClientRect()

    let canvasX
    let canvasY

    if (lastPointerPos.value) {
        canvasX = lastPointerPos.value.x
        canvasY = lastPointerPos.value.y
    } else {
        canvasX = rect.width / 2
        canvasY = rect.height / 2
    }

    const zoom = viewport.value.zoom || 1
    const offsetX = viewport.value.x || 0
    const offsetY = viewport.value.y || 0

    const flowX = (canvasX - offsetX) / zoom
    const flowY = (canvasY - offsetY) / zoom

    return { x: flowX, y: flowY }
}

async function handlePaste(event) {
    const clipboard = event.clipboardData || window.clipboardData
    if (!clipboard) return

    const text = String(clipboard.getData('text') || '').trim()
    if (!text) return

    event.preventDefault()

    const position = getPastePosition()

    // Temporary placeholder node for immediate feedback
    const tempId = `temp-${Date.now()}`
    const tempData = {
      id: tempId,
      doi: text,
      title: text,
      authors: 'Loading...',
      year: 'Loading...',
      description: '',
      position,
      style: {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: '1px',
        color: '#1e293b'
      },
      data: null,
      source: 'placeholder'
    }

    nodes.value.push({
      id: tempId,
      type: 'paper',
      position,
      data: tempData,
      selected: false
    })

    try {
        await researchStore.addPaper(text, { position })
    } catch (err) {
        console.error('Failed to import DOI from paste', err)
        // Remove placeholder on failure
        nodes.value = nodes.value.filter(n => n.id !== tempId)
    }
}

function onPaneMouseDown(event) {
    if (canvasWrapper.value) {
        const rect = canvasWrapper.value.getBoundingClientRect()
        lastPointerPos.value = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        }
    }

    const target = event.target
    if (!(target instanceof HTMLElement)) return

    // Only start drag selection when clicking on the background pane
    if (!target.classList.contains('vue-flow__pane')) return

    // Optional: require Shift key to avoid conflicting with pan
    if (!event.shiftKey) return

    if (!canvasWrapper.value) return
    const rect = canvasWrapper.value.getBoundingClientRect()
    wrapperRect.value = { left: rect.left, top: rect.top }

    isSelecting.value = true
    const startX = event.clientX - rect.left
    const startY = event.clientY - rect.top
    selectionStart.value = { x: startX, y: startY }
    selectionEnd.value = { x: startX, y: startY }

    window.addEventListener('mousemove', onSelectionMouseMove)
    window.addEventListener('mouseup', onSelectionMouseUp)
}

function onSelectionMouseMove(event) {
    if (!isSelecting.value || !canvasWrapper.value) return

    const rect = wrapperRect.value
    const currentX = event.clientX - rect.left
    const currentY = event.clientY - rect.top
    selectionEnd.value = { x: currentX, y: currentY }

    updateDragSelection()
}

function onSelectionMouseUp() {
    if (!isSelecting.value) return

    isSelecting.value = false
    window.removeEventListener('mousemove', onSelectionMouseMove)
    window.removeEventListener('mouseup', onSelectionMouseUp)

    updateDragSelection()
}

function updateDragSelection() {
    const x1 = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const y1 = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const x2 = Math.max(selectionStart.value.x, selectionEnd.value.x)
    const y2 = Math.max(selectionStart.value.y, selectionEnd.value.y)

    const zoom = viewport.value.zoom
    const offsetX = viewport.value.x
    const offsetY = viewport.value.y

    const selectedIds = new Set()

    nodes.value.forEach(node => {
        const paper = researchStore.papers.find(p => p.id === node.id)
        let width = 320
        let height = 140

        if (paper?.style?.width) {
            const parsed = parseInt(paper.style.width, 10)
            if (!Number.isNaN(parsed)) width = parsed
        }
        if (paper?.style?.height) {
            const parsed = parseInt(paper.style.height, 10)
            if (!Number.isNaN(parsed)) height = parsed
        }

        const nodeLeft = offsetX + node.position.x * zoom
        const nodeTop = offsetY + node.position.y * zoom
        const nodeWidth = width * zoom
        const nodeHeight = height * zoom

        const centerX = nodeLeft + nodeWidth / 2
        const centerY = nodeTop + nodeHeight / 2

        if (centerX >= x1 && centerX <= x2 && centerY >= y1 && centerY <= y2) {
            selectedIds.add(node.id)
        }
    })

    // Update node selection flags
    nodes.value.forEach(node => {
        node.selected = selectedIds.has(node.id)
    })

    // Sync to store selection
    researchStore.clearSelection()
    researchStore.clearEdgeSelection()
    selectedIds.forEach(id => {
        researchStore.selectPaper(id, true)
    })
}

// --- VOIX Tool Handlers ---

function handleConnectPapersTool(e) {
    try {
        const { sourceId, targetId, label } = e.detail
        researchStore.connectPapers(sourceId, targetId, label)
        const result = {
            success: true,
            message: `Connected ${sourceId} to ${targetId}`
        }
        Object.assign(e.detail, result)
        e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
    } catch (err) {
        const result = {
            success: false,
            error: err.message
        }
        Object.assign(e.detail, result)
        e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
    }
}

async function handleImportPaperTool(e) {
    try {
        const doiRaw = e.detail.doi
        let doi = typeof doiRaw === 'string' ? doiRaw.trim() : ''
        if (!doi) {
            const result = {
                success: false,
                error: 'DOI must not be empty',
                paper: null
            }
            Object.assign(e.detail, result)
            e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
            return
        }

        // Normalize common DOI URL formats
        doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')

        const paper = await researchStore.addPaper(doi)

        const result = {
            success: true,
            message: `Imported paper ${doi}`,
            paper: paper || null
        }
        Object.assign(e.detail, result)
        e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
    } catch (err) {
        const result = {
            success: false,
            error: err.message,
            paper: null
        }
        Object.assign(e.detail, result)
        e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
    }
}

async function handleCreateManualPaperTool(e) {
    try {
        const doiRaw = e.detail.doi
        let doi = typeof doiRaw === 'string' ? doiRaw.trim() : ''
        if (!doi) {
            const result = {
                success: false,
                error: 'DOI must not be empty',
                paper: null
            }
            Object.assign(e.detail, result)
            e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
            return
        }

        doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')

        const payload = {
            doi,
            title: typeof e.detail.title === 'string' ? e.detail.title : '',
            authors: typeof e.detail.authors === 'string' ? e.detail.authors : '',
            year: typeof e.detail.year === 'string' ? e.detail.year : '',
            description: typeof e.detail.description === 'string' ? e.detail.description : '',
            notes: typeof e.detail.notes === 'string' ? e.detail.notes : ''
        }

        const paper = await researchStore.createManualPaper(payload)

        const result = {
            success: true,
            message: `Created manual paper ${doi}`,
            paper: paper || null
        }
        Object.assign(e.detail, result)
        e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
    } catch (err) {
        const result = {
            success: false,
            error: err.message,
            paper: null
        }
        Object.assign(e.detail, result)
        e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
    }
}

function handleUpdateMetadataTool(e) {
    try {
        const { paperId, description } = e.detail
        researchStore.updatePaperMetadata(paperId, { description })
        const result = {
            success: true,
            message: `Updated metadata for ${paperId}`
        }
        Object.assign(e.detail, result)
        e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
    } catch (err) {
        const result = {
            success: false,
            error: err.message
        }
        Object.assign(e.detail, result)
        e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
    }
}

async function handleSearchPapersTool(e) {
    try {
        const query = String(e.detail.query || '').trim()
        if (!query) {
            const result = {
                success: false,
                error: 'Query must not be empty',
                results: []
            }
            Object.assign(e.detail, result)
            e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
            return
        }

        const found = await researchStore.searchSemanticScholar(query, 10)

        const mapped = found.map(p => {
            const doi = p.doi || (p.arxivId ? `10.48550/arXiv.${p.arxivId}` : null)
            return {
                doi,
                title: p.title,
                year: p.year,
                authors: p.authors,
                arxivId: p.arxivId
            }
        })

        const result = {
            success: true,
            message: `Found ${mapped.length} papers for query "${query}"`,
            results: mapped
        }
        Object.assign(e.detail, result)
        e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
    } catch (err) {
        const result = {
            success: false,
            error: err.message,
            results: []
        }
        Object.assign(e.detail, result)
        e.target.dispatchEvent(new CustomEvent('return', { detail: result }))
    }
}
</script>

<style scoped>
.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: #f8fafc;
}

.empty-tutorial {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.empty-inner {
  max-width: 720px;
  width: 100%;
  margin: 0 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  padding: 16px 18px 14px;
  pointer-events: auto;
}

.empty-inner h2 {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.empty-subtitle {
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: #6b7280;
}

.empty-columns {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}

.empty-column {
  flex: 1 1 260px;
}

.empty-column h3 {
  margin: 0 0 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #111827;
}

.empty-column ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-column li {
  display: flex;
  flex-wrap: wrap;
  column-gap: 6px;
  row-gap: 2px;
  font-size: 0.78rem;
  color: #4b5563;
}

.empty-column .label {
  font-weight: 500;
}

.empty-column .desc {
  color: #6b7280;
}

.empty-column .desc::before {
  content: '— ';
}

.key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 0.7rem;
  font-weight: 500;
}

.selection-rect {
  position: absolute;
  border: 1px solid rgba(59, 130, 246, 0.9);
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  z-index: 100;
}

/* Selected edge outline effect - Miro style */
:deep(.selected-edge .vue-flow__edge-path) {
  filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.6)) 
          drop-shadow(0 0 6px rgba(59, 130, 246, 0.4));
}

:deep(.selected-edge) {
  z-index: 1000 !important;
}
</style>
