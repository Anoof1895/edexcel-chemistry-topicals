# Pearson Edexcel IAL Topicals Platform (Chemistry • Physics • Mathematics)

An advanced revision and mock examination platform for Pearson Edexcel International Advanced Level (IAL) **Chemistry**, **Physics**, and **Mathematics**. Features an automated high-resolution PDF extraction pipeline, side-by-side mark scheme viewer, interactive reference data booklets, and a 3-stage smart auto-generate mock exam builder with print-ready PDF export.

---

## Specification Overview & Reconciled Totals

All **422 past papers (2019–2026)** across all 18 units have been 100% reconciled to official Pearson specification mark totals and audited with 100% mark scheme coverage:

| Subject | Specification Units | Papers (2019–2026) | Reconciled Questions | Total Marks | Mark Scheme Match Rate |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Chemistry** | `WCH11`–`WCH16` (Units 1–6) | 140 | 5,712 | 10,041 | 100.0% |
| **Physics** | `WPH11`–`WPH16` (Units 1–6) | 140 | 4,136 | 10,230 | 100.0% |
| **Mathematics** | `WMA11`–`WMA14` (P1–P4), `WME01` (M1), `WST01` (S1) | 142 | 1,269 | 10,650 | 100.0% |
| **Grand Total** | **All 18 Units** | **422** | **11,117** | **30,921** | **100.0%** |

---

## Core Capabilities

### 1. High-Precision Extraction Pipelines (`pipeline/`)
- **Chemistry (`pipeline/extract.py`)**: Multimodal coordinate detection and high-DPI rendering for organic mechanisms, NMR/IR spectra, and titration curves.
- **Physics (`pipeline/extract_physics.py`)**: Isolated pipeline preserving apparatus diagrams, circuit schematics, and nuclear decay tables with dedicated section separation.
- **Mathematics (`pipeline/extract_math.py`, `pipeline/ms_matcher_math.py`)**:
  - Full-width table slice rendering with dynamic horizontal bounds to eliminate margin clipping.
  - Sequential root question indexing (Q1–Q15) across multi-page schemes, multi-part sub-labels, and preamble notes.
  - 100% mark reconciliation (75/75 marks on every paper) across P1–P4, M1, and S1.
- **Cloudflare R2 Integration (`pipeline/upload_to_r2.py`)**: Multi-threaded asset uploader for global low-latency CDN delivery of question and mark scheme PNGs.
- **Auditing Suites (`pipeline/audit_dataset.py`, `pipeline/audit_dataset_math.py`)**: Verifies 100% mark sum accuracy, image integrity (> 1 KB), and official Pearson taxonomy compliance.

### 2. Modern React Web Application (`frontend/`)
- **Topical Past Paper Explorer**:
  - Filter by Unit, Official Subtopic, Year (2019–2026), Series (January, May/June, October), and Question Type.
  - Side-by-side split screen viewer with synchronized zoom, pan, and keyboard navigation (`←` / `→` to navigate, `Space` to toggle mark schemes).
- **Interactive Data Booklets (`DataBookletDrawer.tsx`)**:
  - **Chemistry**: Interactive Periodic Table with electronic configurations, molar masses, and KaTeX-typeset Standard Electrode Potentials table (official 31 Edexcel half-equations).
  - **Physics**: Interactive Appendix 7 (Quantities & Units) and Appendix 8 (Official Formulae & Relationships).
- **Smart Auto-Generate Mock Exam Builder (`TestMakerPage.tsx`)**:
  - **3-Stage Smart Generator**:
    1. *Topic & Paper Diversification*: Stratified round-robin subtopic selection with penalty weighting to avoid paper clumping.
    2. *Exact Mark Sum Solver*: Bounded backtracking search guaranteeing exact mark totals (`75/75` Maths, `80/80` AS, `90/90` IA2, `50/50` Practical).
    3. *Authentic Pearson Exam Ordering*: Section A MCQs first, grouped multi-part theory, and 6m extended/LOR questions at the end for Science; ascending mark progression (`4–6m` warm-up → `7–9m` mid-paper → `10–16m` major multi-part) for Mathematics.
  - **Unit-Aware Presets**: Automatically adapts target marks and structure when filtering by unit (e.g., auto-selects 50m Theory Only for Unit 3/6 practicals).
  - **Official Timings**: Accurate Pearson exam duration calculation.
- **Print-Ready PDF Generator (`pdfGenerator.ts`)**:
  - Exports formal Question Papers with candidate details box, instructions, metadata, and auto-paginated mark schemes.

---

## Project Structure

```
edexcel-chemistry-topicals/
├── crops_math/                    # Mathematics question & mark scheme crops (R2 hosted)
├── crops_physics/                 # Physics question & mark scheme crops (R2 hosted)
├── dataset.json                   # Chemistry dataset (5,712 questions)
├── dataset_physics.json           # Physics dataset (4,136 questions)
├── dataset_math.json              # Mathematics dataset (1,269 questions)
├── pipeline/                      # Extraction, matching, and upload pipelines
│   ├── extract.py                 # Chemistry pipeline
│   ├── extract_physics.py         # Physics pipeline
│   ├── extract_math.py            # Mathematics pipeline
│   ├── ms_matcher_math.py         # Mathematics mark scheme matcher
│   ├── syllabus_math.py           # Official Mathematics syllabus & taxonomy
│   ├── audit_dataset_math.py      # Mathematics dataset auditor
│   └── upload_to_r2.py            # Multi-threaded Cloudflare R2 uploader
└── frontend/                      # React + TypeScript + Vite + Tailwind CSS app
    ├── public/                    # Synced JSON datasets and static assets
    └── src/
        ├── components/            # Topical Explorer, SplitViewer, TestMaker, DataBooklet
        ├── constants/             # Official taxonomies & reference booklet data
        ├── context/               # Theme, Auth, and Cloud-synced Progress contexts
        └── utils/                 # Exam generator, PDF generator, CDN image resolver
```

---

## Quick Start

### 1. Run the Frontend Development Server
```powershell
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Build for Production
```powershell
cd frontend
npm run build
```

### 3. Run Pipeline Extraction or Audits
```powershell
# Run comprehensive audit across Mathematics papers
.\.venv\Scripts\python.exe -m pipeline.audit_dataset_math

# Run comprehensive audit across Chemistry / Physics papers
.\.venv\Scripts\python.exe -m pipeline.audit_dataset

# Upload crops to Cloudflare R2
.\.venv\Scripts\python.exe -m pipeline.upload_to_r2 --subject math
```
