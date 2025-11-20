<template>
  <div 
    class="paper-node" 
    :class="{ selected }"
    :style="nodeStyle"
  >
    <Handle id="top" type="target" position="top" />
    <Handle id="left" type="target" position="left" />
    <Handle id="right" type="source" position="right" />
    <Handle id="bottom" type="source" position="bottom" />

    <div class="node-content">
      <div class="header">
        <span class="year">{{ data.year }}</span>
        <span class="doi">{{ data.doi }}</span>
      </div>
      <div class="title">{{ data.title }}</div>
      <div class="authors">{{ data.authors }}</div>
      <div v-if="showAbstract" class="abstract">
        {{ abstractPlain }}
      </div>
    </div>

    <context :name="contextName">
      DOI: {{ data.doi }};
      Title: {{ data.title }};
      Authors: {{ data.authors }};
      Year: {{ data.year }};
      Abstract: {{ abstractPlain || 'None' }};
      Incoming from: {{ incomingSummary }};
      Outgoing to: {{ outgoingSummary }};
      Connected to: {{ connectedSummary }};
    </context>

    <div class="resize-handle" @mousedown="onResizeMouseDown"></div>
  </div>
</template>

<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { Handle } from '@vue-flow/core'
import { useResearchStore } from '../stores/research'

const props = defineProps(['data', 'selected'])
const researchStore = useResearchStore()

const DEFAULT_WIDTH = 320
const DEFAULT_HEIGHT = 140
const minWidth = 200
const minHeight = 80

const width = ref(DEFAULT_WIDTH)
const height = ref(DEFAULT_HEIGHT)

if (props.data?.style?.width) {
  const parsed = parseInt(props.data.style.width, 10)
  if (!Number.isNaN(parsed)) {
    width.value = parsed
  }
}

if (props.data?.style?.height) {
  const parsed = parseInt(props.data.style.height, 10)
  if (!Number.isNaN(parsed)) {
    height.value = parsed
  }
}

const isResizing = ref(false)
const startX = ref(0)
const startY = ref(0)
const startWidth = ref(DEFAULT_WIDTH)
const startHeight = ref(DEFAULT_HEIGHT)

function onResizeMouseDown(event) {
  event.stopPropagation()
  event.preventDefault()

  isResizing.value = true
  startX.value = event.clientX
  startY.value = event.clientY
  startWidth.value = width.value
  startHeight.value = height.value

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(event) {
  if (!isResizing.value) return

  const dx = event.clientX - startX.value
  const dy = event.clientY - startY.value
  const newWidth = Math.max(minWidth, startWidth.value + dx)
  const newHeight = Math.max(minHeight, startHeight.value + dy)

  width.value = newWidth
  height.value = newHeight

  if (props.data) {
    if (!props.data.style) props.data.style = {}
    props.data.style.width = `${newWidth}px`
    props.data.style.height = `${newHeight}px`
    if (props.data.id) {
      researchStore.updatePaperStyle(props.data.id, { width: `${newWidth}px`, height: `${newHeight}px` })
    }
  }
}

function onMouseUp() {
  if (!isResizing.value) return

  isResizing.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

const abstractPlain = computed(() => {
  const source = props.data?.description || ''
  if (!source) return ''

  return String(source)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
})

const showAbstract = computed(() => {
  return abstractPlain.value.length > 0
})

const contextName = computed(() => {
  const doi = props.data?.doi || ''
  return `paper_${doi}`
})

function computeDirectionalNeighbors(id) {
  const incomingIds = new Set()
  const outgoingIds = new Set()
  const connectedIds = new Set()

  const hasArrow = (marker) => marker === 'arrow' || marker === 'arrowclosed'

  researchStore.connections.forEach(c => {
    if (c.source !== id && c.target !== id) return

    const startHasArrow = hasArrow(c.markerStart)
    const endHasArrow = hasArrow(c.markerEnd)

    const otherId = c.source === id ? c.target : c.source
    if (!otherId) return

    // No markers or markers on both ends -> undirected "connected to"
    if ((!startHasArrow && !endHasArrow) || (startHasArrow && endHasArrow)) {
      connectedIds.add(otherId)
      return
    }

    let arrowFromOtherToThis = false
    let arrowFromThisToOther = false

    // Marker semantics (matching canvas_state symbols):
    // - start only  => target -> source   ("<-")
    // - end only    => source -> target   ("->")

    if (startHasArrow && !endHasArrow) {
      // target -> source
      if (c.source === id) {
        // other (target) -> this (source)
        arrowFromOtherToThis = true
      } else if (c.target === id) {
        // this (target) -> other (source)
        arrowFromThisToOther = true
      }
    } else if (!startHasArrow && endHasArrow) {
      // source -> target
      if (c.source === id) {
        // this (source) -> other (target)
        arrowFromThisToOther = true
      } else if (c.target === id) {
        // other (source) -> this (target)
        arrowFromOtherToThis = true
      }
    }

    if (arrowFromOtherToThis) incomingIds.add(otherId)
    if (arrowFromThisToOther) outgoingIds.add(otherId)
  })

  const toPapers = (idSet) => Array.from(idSet)
    .map(otherId => researchStore.papers.find(p => p.id === otherId))
    .filter(p => !!p)

  return {
    incoming: toPapers(incomingIds),
    outgoing: toPapers(outgoingIds),
    connected: toPapers(connectedIds)
  }
}

const incomingPapers = computed(() => {
  const id = props.data?.id || props.data?.doi
  if (!id) return []
  return computeDirectionalNeighbors(id).incoming
})

const outgoingPapers = computed(() => {
  const id = props.data?.id || props.data?.doi
  if (!id) return []
  return computeDirectionalNeighbors(id).outgoing
})

const connectedPapers = computed(() => {
  const id = props.data?.id || props.data?.doi
  if (!id) return []
  return computeDirectionalNeighbors(id).connected
})

const incomingSummary = computed(() => {
  if (incomingPapers.value.length === 0) return 'None'
  return incomingPapers.value.map(p => `${p.id} (${p.title})`).join(', ')
})

const outgoingSummary = computed(() => {
  if (outgoingPapers.value.length === 0) return 'None'
  return outgoingPapers.value.map(p => `${p.id} (${p.title})`).join(', ')
})

const connectedSummary = computed(() => {
  if (connectedPapers.value.length === 0) return 'None'
  return connectedPapers.value.map(p => `${p.id} (${p.title})`).join(', ')
})

const nodeStyle = computed(() => {
  const style = props.data.style || {}
  return {
    width: `${width.value}px`,
    height: `${height.value}px`,
    backgroundColor: style.backgroundColor || '#ffffff',
    borderColor: props.selected ? '#3b82f6' : (style.borderColor || '#e2e8f0'),
    borderWidth: style.borderWidth || '1px',
    color: style.color || '#1e293b',
    borderStyle: 'solid'
  }
})
</script>

<style scoped>
.paper-node {
  position: relative;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  text-align: left;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s, border-color 0.2s;
}

.paper-node.selected {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 4px;
}

.year {
  font-weight: 600;
}

.doi {
  font-size: 0.7rem;
  opacity: 0.7;
}

.title {
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 4px;
}

.authors {
  font-size: 0.8rem;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.abstract {
  margin-top: 6px;
  font-size: 0.75rem;
  color: #475569;
}

.vue-flow__handle {
  width: 10px;
  height: 10px;
  background: #94a3b8;
  border: 2px solid white;
}

.vue-flow__handle:hover {
  background: #3b82f6;
  width: 12px;
  height: 12px;
}

.resize-handle {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 10px;
  height: 10px;
  border-right: 2px solid #cbd5f5;
  border-bottom: 2px solid #cbd5f5;
  cursor: nwse-resize;
}
</style>
