import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { collaborationService } from '../services/collaboration'

export const useResearchStore = defineStore('research', () => {
  const papers = ref([])
  const connections = ref([])
  const selectedPaperIds = ref([]) // Multi-selection
  const selectedEdgeIds = ref([]) // Selected connections
  const openPaperId = ref(null) // For details view
  const SEMANTIC_MIN_INTERVAL_MS = 1500
  let lastSemanticRequestTime = 0

  // Collaboration state
  const isRemoteUpdate = ref(false)
  const isCollaborating = ref(false)
  const collaborationRoomId = ref(null)
  const onlineUsers = ref(0)

  // Persistence
  const LEGACY_STORAGE_KEY = 'voix-research-state'
  const LIB_PREFIX = 'voix-research-lib:'
  const LIB_LIST_KEY = 'voix-research-libraries'
  const ACTIVE_LIB_KEY = 'voix-research-active-library'

  const activeLibraryName = ref('default')
  const libraries = ref([])

  function normalizeState(parsed) {
    let loadedPapers = parsed?.papers || []
    let loadedConnections = parsed?.connections || []

    // Migrate paper ids to use DOI directly
    const idMap = new Map()
    loadedPapers.forEach(p => {
      if (p && p.doi) {
        const desiredId = p.doi
        if (!p.id || p.id !== desiredId) {
          idMap.set(p.id, desiredId)
        }
      }
    })

    if (idMap.size > 0) {
      loadedPapers = loadedPapers.map(p => {
        if (!p) return p
        const currentId = p.id
        const mappedId = idMap.get(currentId)
        if (mappedId) {
          return { ...p, id: mappedId }
        }
        if (!currentId && p.doi) {
          return { ...p, id: p.doi }
        }
        return p
      })

      loadedConnections = loadedConnections.map(c => {
        if (!c) return c
        let source = c.source
        let target = c.target

        if (idMap.has(source)) {
          source = idMap.get(source)
        }
        if (idMap.has(target)) {
          target = idMap.get(target)
        }

        const sourceHandle = c.sourceHandle || 'right'
        const targetHandle = c.targetHandle || 'left'

        const id = `e-${source}-${target}-${sourceHandle || ''}-${targetHandle || ''}`

        return {
          ...c,
          id,
          source,
          target,
          sourceHandle,
          targetHandle
        }
      })
    }

    // Normalize connections to ensure they have all required properties
    loadedConnections = loadedConnections.map(c => {
      if (!c) return c
      const sourceHandle = c.sourceHandle || 'right'
      const targetHandle = c.targetHandle || 'left'

      return {
        ...c,
        sourceHandle,
        targetHandle,
        style: c.style || {
          stroke: '#94a3b8',
          strokeWidth: 2,
          strokeDasharray: '0'
        },
        markerEnd: c.markerEnd,
        markerStart: c.markerStart
      }
    })

    return { papers: loadedPapers, connections: loadedConnections }
  }

  function loadLibrary(name) {
    const libName = name || 'default'
    activeLibraryName.value = libName

    // Load known libraries
    let list = []
    const storedList = localStorage.getItem(LIB_LIST_KEY)
    if (storedList) {
      try {
        list = JSON.parse(storedList)
      } catch {
        list = []
      }
    }

    // Migration from legacy single-library storage
    if (!storedList) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy)
          const norm = normalizeState(parsed)
          localStorage.setItem(
            `${LIB_PREFIX}${libName}`,
            JSON.stringify({ papers: norm.papers, connections: norm.connections })
          )
          list = [libName]
          localStorage.setItem(LIB_LIST_KEY, JSON.stringify(list))
          localStorage.removeItem(LEGACY_STORAGE_KEY)
        } catch (e) {
          console.error('Failed to migrate legacy state', e)
        }
      }
    }

    if (!list.includes(libName)) {
      list.push(libName)
      localStorage.setItem(LIB_LIST_KEY, JSON.stringify(list))
    }

    libraries.value = list

    const raw = localStorage.getItem(`${LIB_PREFIX}${libName}`)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        const norm = normalizeState(parsed)
        papers.value = norm.papers
        connections.value = norm.connections
      } catch (e) {
        console.error('Failed to load library', e)
        papers.value = []
        connections.value = []
      }
    } else {
      papers.value = []
      connections.value = []
    }

    localStorage.setItem(ACTIVE_LIB_KEY, libName)
  }

  function saveState() {
    // If collaborating, we rely on Yjs persistence, but we can still save to local storage as backup/cache
    // However, Yjs persistence (IndexedDB) is separate.
    // We'll continue to save to localStorage for now to maintain existing behavior for non-collab mode.

    const libName = activeLibraryName.value || 'default'
    const payload = {
      papers: papers.value,
      connections: connections.value
    }

    localStorage.setItem(`${LIB_PREFIX}${libName}`, JSON.stringify(payload))

    let list = libraries.value.slice()
    if (!list.includes(libName)) {
      list.push(libName)
    }
    libraries.value = list
    localStorage.setItem(LIB_LIST_KEY, JSON.stringify(list))
    localStorage.setItem(ACTIVE_LIB_KEY, libName)
  }

  // Initial Load
  const initialActive = localStorage.getItem(ACTIVE_LIB_KEY) || 'default'
  loadLibrary(initialActive)

  // Watch for changes
  watch([papers, connections], () => {
    if (isRemoteUpdate.value) return

    saveState()

    if (isCollaborating.value) {
      collaborationService.updateLocalState(papers.value, connections.value)
    }
  }, { deep: true })

  function initCollaboration(roomId) {
    if (!roomId) return

    collaborationRoomId.value = roomId
    isCollaborating.value = true

    // Initialize service
    // We pass 'this' (the store instance) implicitly via the bindState method or just pass the store object if needed
    // But here we are inside the store definition.
    // We can pass an object with the methods we want the service to call.

    collaborationService.init(roomId, {
      loadFromCollaboration: (p, c) => loadFromCollaboration(p, c)
    })

    // If we have local data and it's a fresh room, we might want to push it?
    // collaborationService handles initial sync.
    // If we want to force push local state:
    collaborationService.updateLocalState(papers.value, connections.value)

    // Setup awareness listener if needed
    collaborationService.awareness.on('change', () => {
      const states = collaborationService.awareness.getStates()
      onlineUsers.value = states.size
    })
  }

  function loadFromCollaboration(remotePapers, remoteConnections) {
    isRemoteUpdate.value = true

    // We need to be careful not to lose selection state if possible, 
    // but replacing arrays might reset it if we rely on object references.
    // However, our selection uses IDs, so it should be fine.

    papers.value = remotePapers
    connections.value = remoteConnections

    // Wait for next tick to reset flag? 
    // Watchers fire synchronously for ref mutations usually.
    // But deep watch might be tricky.
    // Let's reset it immediately after.
    // Actually, since we are inside the action, the watch might trigger *after* this function finishes?
    // No, Vue reactivity is synchronous.

    // To be safe, we use a timeout or nextTick, OR just rely on the fact that we set it to true before mutation.
    // The watch callback checks the flag.

    // We need to ensure the watch callback sees true.
    // It should work.

    setTimeout(() => {
      isRemoteUpdate.value = false
    }, 0)
  }

  function stopCollaboration() {
    collaborationService.destroy()
    isCollaborating.value = false
    collaborationRoomId.value = null
    onlineUsers.value = 0
  }


  // Getters
  const getPaperById = computed(() => (id) => papers.value.find(p => p.id === id))
  const selectedPapers = computed(() => papers.value.filter(p => selectedPaperIds.value.includes(p.id)))
  const openPaper = computed(() => papers.value.find(p => p.id === openPaperId.value))

  async function fetchSemanticScholarData(doi) {
    try {
      const fields = [
        'citationCount',
        'referenceCount',
        'references.title',
        'references.year',
        'references.authors',
        'references.externalIds',
        'citations.title',
        'citations.year',
        'citations.authors',
        'citations.externalIds'
      ].join(',')

      // Handle arXiv DOIs specially by querying via ARXIV: identifier
      let paperIdPath
      const arxivMatch = /^10\.48550\/arXiv\.(\d+\.\d+)(v\d+)?$/i.exec(doi)
      if (arxivMatch) {
        const arxivId = arxivMatch[1]
        paperIdPath = `ARXIV:${arxivId}`
      } else {
        paperIdPath = `DOI:${encodeURIComponent(doi)}`
      }

      const now = Date.now()
      const waitMs = SEMANTIC_MIN_INTERVAL_MS - (now - lastSemanticRequestTime)
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      }

      let response
      try {
        response = await axios.get(
          `https://api.semanticscholar.org/graph/v1/paper/${paperIdPath}`,
          { params: { fields } }
        )
      } finally {
        lastSemanticRequestTime = Date.now()
      }

      const data = response.data || {}

      const simplifyPaper = (p) => {
        if (!p) return null
        const doiId = p.externalIds?.DOI || null
        const authors = Array.isArray(p.authors)
          ? p.authors.map(a => a.name).filter(Boolean)
          : []

        return {
          doi: doiId,
          title: p.title || '',
          year: p.year || null,
          authors
        }
      }

      const references = Array.isArray(data.references)
        ? data.references.map(simplifyPaper).filter(p => p && p.doi)
        : []

      const citations = Array.isArray(data.citations)
        ? data.citations.map(simplifyPaper).filter(p => p && p.doi)
        : []

      return {
        lastUpdated: Date.now(),
        citationCount: data.citationCount ?? null,
        referenceCount: data.referenceCount ?? null,
        references,
        citations
      }
    } catch (e) {
      console.warn('Semantic Scholar fetch failed', e)
      return null
    }
  }

  // Actions
  async function addPaper(doi, options = {}) {
    try {
      // Basic cleanup of DOI
      const cleanDoi = doi.trim()

      // Check if already exists
      const existing = papers.value.find(p => p.doi === cleanDoi)
      if (existing) {
        console.warn('Paper already exists')
        return existing
      }

      const position =
        options.position && typeof options.position.x === 'number' && typeof options.position.y === 'number'
          ? options.position
          : { x: Math.random() * 400, y: Math.random() * 400 }

      let data = null
      let source = ''

      // Strategy 1: Official DOI API (citation.doi.org)
      try {
        console.log(`Fetching from DOI API: ${cleanDoi}`)
        const response = await axios.get(`https://citation.doi.org/metadata?doi=${cleanDoi}`)
        data = response.data
        source = 'doi-api'
      } catch (e) {
        console.warn('DOI API failed, trying CrossRef...', e)
      }

      // Strategy 2: CrossRef Fallback
      if (!data) {
        try {
          console.log(`Fetching from CrossRef: ${cleanDoi}`)
          const response = await axios.get(`https://api.crossref.org/works/${cleanDoi}`)
          data = response.data.message
          source = 'crossref'
        } catch (e) {
          console.error('CrossRef also failed', e)
          throw new Error('Could not fetch metadata from any source')
        }
      }

      // Normalize Data
      const title = data.title ? (Array.isArray(data.title) ? data.title[0] : data.title) : 'Unknown Title'

      const authors = data.author
        ? data.author.map(a => `${a.given || ''} ${a.family || ''}`.trim()).join(', ')
        : 'Unknown Author'

      const year = data.issued?.['date-parts']?.[0]?.[0]
        || data.created?.['date-parts']?.[0]?.[0]
        || 'N/A'

      // Use abstract if available
      const description = data.abstract || ''

      const newPaper = {
        id: cleanDoi,
        doi: cleanDoi,
        title,
        authors,
        year,
        description,
        notes: '',
        position,
        style: {
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: '1px',
          color: '#1e293b'
        },
        data: { ...data },
        source,
        semanticScholar: null
      }

      // Enrich with Semantic Scholar (citations / references)
      try {
        const semanticData = await fetchSemanticScholarData(cleanDoi)
        if (semanticData) {
          newPaper.semanticScholar = semanticData
        }
      } catch (e) {
        // Already logged inside fetchSemanticScholarData
      }

      papers.value.push(newPaper)
      return newPaper
    } catch (error) {
      console.error('Failed to fetch DOI metadata:', error)
      throw error
    }
  }

  async function loadSemanticScholarForPaper(idOrDoi) {
    const paper = papers.value.find(p => p.id === idOrDoi || p.doi === idOrDoi)
    if (!paper || !paper.doi) return

    const semanticData = await fetchSemanticScholarData(paper.doi)
    if (semanticData) {
      paper.semanticScholar = semanticData
    }
  }

  async function createManualPaper(payload) {
    const cleanId = String(payload.doi || '').trim()

    if (cleanId) {
      const existing = papers.value.find(p => p.doi === cleanId || p.id === cleanId)
      if (existing) {
        const updates = {}
        if (payload.title) updates.title = payload.title
        if (payload.authors) updates.authors = payload.authors
        if (payload.year) updates.year = payload.year
        if (payload.description) updates.description = payload.description
        if (payload.notes) updates.notes = payload.notes
        Object.assign(existing, updates)
        return existing
      }
    }

    let identifier = cleanId

    if (!identifier) {
      const authorsStr = String(payload.authors || '').trim()
      const firstAuthorPart = authorsStr ? authorsStr.split(',')[0].trim() : 'Anon'
      const lastName = firstAuthorPart.split(' ').slice(-1)[0] || 'Anon'
      const yearPart = String(payload.year || 'xxxx').trim() || 'xxxx'
      const titleFirstWord = String(payload.title || 'Untitled').trim().split(/\s+/)[0] || 'Untitled'

      const safe = (s) => s.replace(/[^A-Za-z0-9]/g, '')
      const base = `${safe(lastName)}${safe(yearPart)}_${safe(titleFirstWord)}` || `Paper_${Math.random().toString(36).slice(2, 6)}`

      let candidate = base
      while (papers.value.some(p => p.id === candidate || p.doi === candidate)) {
        candidate = `${base}_${Math.random().toString(36).slice(2, 6)}`
      }

      identifier = candidate
    }

    const position = {
      x: Math.random() * 400,
      y: Math.random() * 400
    }

    const newPaper = {
      id: identifier,
      doi: identifier,
      title: payload.title || identifier,
      authors: payload.authors || '',
      year: payload.year || '',
      description: payload.description || '',
      notes: payload.notes || '',
      position,
      style: {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: '1px',
        color: '#1e293b'
      },
      data: null,
      source: 'manual',
      semanticScholar: null
    }

    papers.value.push(newPaper)
    return newPaper
  }

  function buildBibtexEntry(paper) {
    if (!paper) return ''

    const raw = paper.data || {}
    const type = raw.type || 'article'

    const authorsStr = paper.authors || ''
    const firstAuthorPart = authorsStr.split(',')[0] || 'key'
    const lastName = firstAuthorPart.trim().split(' ').slice(-1)[0] || 'key'
    const year = paper.year || 'xxxx'
    const key = `${lastName}${year}`.replace(/[^A-Za-z0-9]/g, '') || 'key'

    const fields = {}

    if (paper.title) fields.title = paper.title
    if (paper.authors) fields.author = paper.authors
    if (year && year !== 'N/A') fields.year = year
    if (paper.doi) fields.doi = paper.doi

    const container = raw['container-title']
    if (container) {
      fields.journal = Array.isArray(container) ? container[0] : container
    }
    if (raw.volume) fields.volume = raw.volume
    if (raw.issue) fields.number = raw.issue
    if (raw.page) fields.pages = raw.page
    if (raw.publisher) fields.publisher = raw.publisher

    const lines = [`@${type}{${key},`]
    const entries = Object.entries(fields)
    entries.forEach(([k, v], index) => {
      const isLast = index === entries.length - 1
      const value = String(v).trim()
      lines.push(`  ${k} = {${value}}${isLast ? '' : ','}`)
    })
    lines.push('}')

    return lines.join('\n')
  }

  function exportPaperAsBibtex(idOrDoi) {
    const p = papers.value.find(p => p.id === idOrDoi || p.doi === idOrDoi)
    if (!p) return ''
    return buildBibtexEntry(p)
  }

  function exportAllPapersAsBibtex() {
    if (!papers.value.length) return ''
    return papers.value
      .map(buildBibtexEntry)
      .filter(Boolean)
      .join('\n\n')
  }

  function createLibrary(name) {
    const trimmed = String(name || '').trim()
    if (!trimmed) return

    if (!libraries.value.includes(trimmed)) {
      libraries.value = [...libraries.value, trimmed]
      localStorage.setItem(LIB_LIST_KEY, JSON.stringify(libraries.value))
    }

    loadLibrary(trimmed)
  }

  function switchLibrary(name) {
    const trimmed = String(name || '').trim()
    if (!trimmed || trimmed === activeLibraryName.value) return
    loadLibrary(trimmed)
  }

  function loadFromRawState(rawState) {
    const norm = normalizeState(rawState || {})
    papers.value = norm.papers
    connections.value = norm.connections
    saveState()
  }

  async function searchSemanticScholar(query, limit = 10) {
    const q = query.trim()
    if (!q) return []

    const fields = ['title', 'year', 'authors', 'externalIds'].join(',')

    const now = Date.now()
    const waitMs = SEMANTIC_MIN_INTERVAL_MS - (now - lastSemanticRequestTime)
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }

    let response
    try {
      response = await axios.get(
        'https://api.semanticscholar.org/graph/v1/paper/search',
        {
          params: {
            query: q,
            limit,
            fields
          }
        }
      )
    } finally {
      lastSemanticRequestTime = Date.now()
    }

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

  function updatePaperPosition(id, position) {
    const paper = papers.value.find(p => p.id === id)
    if (paper) {
      paper.position = position
    }
  }

  function updatePaperMetadata(id, updates) {
    const paper = papers.value.find(p => p.id === id)
    if (paper) {
      Object.assign(paper, updates)
    }
  }

  function updatePaperStyle(id, styleUpdates) {
    const paper = papers.value.find(p => p.id === id)
    if (paper) {
      if (!paper.style) paper.style = {}
      Object.assign(paper.style, styleUpdates)
    }
  }

  function removePaper(id) {
    papers.value = papers.value.filter(p => p.id !== id)
    // Also remove connections associated with this paper
    connections.value = connections.value.filter(c => c.source !== id && c.target !== id)
    // Remove from selection if selected
    if (selectedPaperIds.value.includes(id)) {
      selectedPaperIds.value = selectedPaperIds.value.filter(pid => pid !== id)
    }
    // Clear open paper if it was this one
    if (openPaperId.value === id) {
      openPaperId.value = null
    }
  }

  function removeConnection(id) {
    connections.value = connections.value.filter(c => c.id !== id)
  }

  function connectPapers(source, target, label = '', sourceHandle = null, targetHandle = null) {
    // If handles are not provided, calculate them based on paper positions
    if (!sourceHandle || !targetHandle) {
      const sourcePaper = papers.value.find(p => p.id === source)
      const targetPaper = papers.value.find(p => p.id === target)

      if (sourcePaper && targetPaper) {
        // Calculate relative position
        const dx = targetPaper.position.x - sourcePaper.position.x
        const dy = targetPaper.position.y - sourcePaper.position.y

        // Determine best handles based on relative position
        // Use angle to determine which side to connect from
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)

        // Source handle (where the connection starts)
        if (angle >= -45 && angle < 45) {
          sourceHandle = 'right'
        } else if (angle >= 45 && angle < 135) {
          sourceHandle = 'bottom'
        } else if (angle >= 135 || angle < -135) {
          sourceHandle = 'left'
        } else {
          sourceHandle = 'top'
        }

        // Target handle (where the connection ends) - opposite direction
        if (angle >= -45 && angle < 45) {
          targetHandle = 'left'
        } else if (angle >= 45 && angle < 135) {
          targetHandle = 'top'
        } else if (angle >= 135 || angle < -135) {
          targetHandle = 'right'
        } else {
          targetHandle = 'bottom'
        }
      }
    }

    const id = `e-${source}-${target}-${sourceHandle || ''}-${targetHandle || ''}`
    if (!connections.value.some(c => c.id === id)) {
      connections.value.push({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
        label,
        type: 'smoothstep',
        style: {
          stroke: '#94a3b8',
          strokeWidth: 2,
          strokeDasharray: '0'
        },
        markerEnd: undefined,
        markerStart: undefined
      })
    }
  }

  function selectPaper(id, multi = false) {
    if (multi) {
      if (selectedPaperIds.value.includes(id)) {
        selectedPaperIds.value = selectedPaperIds.value.filter(pid => pid !== id)
      } else {
        selectedPaperIds.value.push(id)
      }
    } else {
      selectedPaperIds.value = [id]
    }
  }

  function clearSelection() {
    selectedPaperIds.value = []
  }

  function setOpenPaper(id) {
    openPaperId.value = id
  }

  function selectEdge(id, multi = false) {
    if (multi) {
      if (selectedEdgeIds.value.includes(id)) {
        selectedEdgeIds.value = selectedEdgeIds.value.filter(eid => eid !== id)
      } else {
        selectedEdgeIds.value.push(id)
      }
    } else {
      selectedEdgeIds.value = [id]
    }
  }

  function clearEdgeSelection() {
    selectedEdgeIds.value = []
  }

  function updateConnectionStyle(id, styleUpdates) {
    const connection = connections.value.find(c => c.id === id)
    if (connection) {
      if (!connection.style) connection.style = {}
      Object.assign(connection.style, styleUpdates)
    }
  }

  function updateConnectionLabel(id, label) {
    const connection = connections.value.find(c => c.id === id)
    if (connection) {
      connection.label = label
    }
  }

  return {
    papers,
    connections,
    selectedPaperIds,
    selectedEdgeIds,
    openPaperId,
    getPaperById,
    selectedPapers,
    openPaper,
    activeLibraryName,
    libraries,
    addPaper,
    loadSemanticScholarForPaper,
    searchSemanticScholar,
    createManualPaper,
    exportPaperAsBibtex,
    exportAllPapersAsBibtex,
    createLibrary,
    switchLibrary,
    loadFromRawState,
    removePaper,
    updatePaperPosition,
    updatePaperMetadata,
    updatePaperStyle,
    connectPapers,
    removeConnection,
    updateConnectionStyle,
    updateConnectionLabel,
    selectPaper,
    clearSelection,
    selectEdge,
    clearEdgeSelection,
    setOpenPaper,
    isCollaborating,
    collaborationRoomId,
    onlineUsers,
    initCollaboration,
    stopCollaboration
  }
})
