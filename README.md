# VOIX Research Canvas

VOIX Research Canvas is an agent‑ready, canvas‑based viewer for research papers built with Vue 3, Vite, Pinia, and Vue Flow. It is designed as a VOIX‑compatible “capability provider”: the UI is fully usable by humans, while VOIX agents can read contextual state and call high‑level tools declared in the DOM.

The app is published at:

- **GitHub Pages:** https://svenschultze.github.io/voix-research/

To learn how VOIX works in general and how to design agent‑ready web apps, start here:

- **VOIX Documentation:** https://svenschultze.github.io/VOIX/

---

## Features

- **Paper canvas**
  - Import papers by DOI (via DOI API / CrossRef).
  - Semantic Scholar enrichment for citations and references.
  - Resizable paper nodes with title, authors, year, abstract, and notes.
  - Canvas‑level selection, connection styling, and arrow markers.

- **Libraries**
  - Multiple libraries stored in `localStorage`, each with its own set of papers and connections.
  - Library switcher in the top‑right (e.g., separate projects or topics).
  - Legacy single‑library state is migrated into a default library on first run.

- **Import/export**
  - **Ctrl+V** – Paste DOI to import a paper at the mouse position (or center).
  - **Ctrl+S** – Download the current library as a `.vrl` file (JSON).
  - **Ctrl+O** – Load a `.vrl` file into the active library.
  - Top‑left `{}` button – Download all papers as a `voix-research.bib` BibTeX file.

- **Search**
  - **Ctrl+F** – Spotlight‑style Semantic Scholar search overlay.
  - Add search results directly to the canvas (DOI or arXiv‑backed).

- **Paper details**
  - Editable title, authors, year, identifier, notes, and abstract.
  - Semantic Scholar section with cited and citing papers (with “Add” buttons).
  - Per‑paper “Copy BibTeX” button.

- **Manual entry**
  - Floating “+” button opens a modal to add papers manually.
  - Identifier can be DOI/ISBN/any string; if omitted, a label is generated from author/year/title.

- **VOIX integration**
  - `<context>` elements expose canvas and per‑paper state for agents.
  - `<tool>` elements declare high‑level actions such as:
    - `import_paper(doi)` – Import a paper by DOI.
    - `create_manual_paper(...)` – Create a paper without external metadata.
    - `search_papers(query)` – Semantic Scholar search returning a result list.
    - `connect_papers(sourceId, targetId, label?)` – Create directed edges.
    - `update_paper_metadata(...)` – Modify paper metadata.
    - `export_paper_bibtex(paperId)` – Export a single paper as BibTeX.

---

## Development

### Prerequisites

- Node.js 20+ (as specified in `package.json`).

### Install & run

```bash
npm install
npm run dev
```

Then open the URL printed by Vite (typically `http://localhost:5173`).

### Build

```bash
npm run build
```

The production build is emitted into `dist/`. GitHub Actions is configured to deploy `dist/` to GitHub Pages under `/voix-research/`.

---

## VOIX Resources

If you are extending this app or designing your own agent‑ready interfaces, read the VOIX documentation for the core concepts (contexts, tools, scoping, and multimodal affordances):

- **VOIX Documentation:** https://svenschultze.github.io/VOIX/

