<template>
  <g>
    <path
      :id="id"
      :style="edgeStyle"
      class="vue-flow__edge-path"
      :d="path"
      :marker-end="markerEnd"
    />
    <foreignObject
      v-if="label || isEditing"
      :x="labelX - 50"
      :y="labelY - 12"
      width="100"
      height="24"
      class="edge-label-wrapper"
    >
      <div class="edge-label-container">
        <input
          v-if="isEditing"
          ref="labelInput"
          v-model="localLabel"
          @blur="finishEditing"
          @keydown.enter="finishEditing"
          @keydown.esc="cancelEditing"
          class="edge-label-input"
        />
        <div
          v-else
          @dblclick="startEditing"
          class="edge-label"
          :class="{ 'has-label': label }"
        >
          {{ label || 'Double-click to add label' }}
        </div>
      </div>
    </foreignObject>
  </g>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { getSmoothStepPath } from '@vue-flow/core'
import { useResearchStore } from '../stores/research'

const props = defineProps({
  id: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  sourceHandle: String,
  targetHandle: String,
  data: Object,
  markerEnd: String,
  style: Object,
  selected: Boolean
})

const store = useResearchStore()
const isEditing = ref(false)
const localLabel = ref(props.data?.label || '')
const labelInput = ref(null)

const [path, labelX, labelY] = getSmoothStepPath({
  sourceX: props.sourceX,
  sourceY: props.sourceY,
  sourcePosition: props.sourcePosition,
  targetX: props.targetX,
  targetY: props.targetY,
  targetPosition: props.targetPosition,
})

const label = computed(() => props.data?.label || '')

const edgeStyle = computed(() => {
  const style = props.data?.style || {}
  return {
    stroke: props.selected ? '#3b82f6' : (style.stroke || '#94a3b8'),
    strokeWidth: props.selected ? (style.strokeWidth || 2) + 1 : (style.strokeWidth || 2),
    strokeDasharray: style.strokeDasharray || '0',
    ...props.style
  }
})

function startEditing() {
  isEditing.value = true
  localLabel.value = label.value
  nextTick(() => {
    labelInput.value?.focus()
    labelInput.value?.select()
  })
}

function finishEditing() {
  isEditing.value = false
  if (localLabel.value !== label.value) {
    store.updateConnectionLabel(props.id, localLabel.value)
  }
}

function cancelEditing() {
  isEditing.value = false
  localLabel.value = label.value
}
</script>

<style scoped>
.edge-label-wrapper {
  pointer-events: all;
}

.edge-label-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.edge-label {
  background: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #64748b;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
  transition: all 0.2s;
}

.edge-label:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.edge-label.has-label {
  color: #1e293b;
  font-weight: 500;
}

.edge-label-input {
  background: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  border: 2px solid #3b82f6;
  outline: none;
  width: 100%;
  text-align: center;
}
</style>
