# Edexcel IAL Chemistry Topical Past Paper Platform

A topical past paper web application for Edexcel International A Level (IAL) Chemistry, featuring an AI-powered extraction pipeline and a dark-themed split-screen web application.

## Overview

- **Part 1: The PDF Extraction Pipeline (`pipeline/`)**
  - Uses PyMuPDF and Google Gemini's multimodal API (`gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`) with automatic failover cascade and rate-limit handling.
  - Sends 150 DPI page previews to Gemini for coordinate detection and crops final student assets at 300 DPI for crisp visual clarity.
  - Handles Section A MCQs (1 mark each) without expecting explanatory tables.
  - Detects introductory stems (reaction schemes, titration tables, calorimeter diagrams) and persists them across pages, stitching them vertically above sub-questions.
  - Parses Mark Scheme PDFs and crops matching answer table rows.
  - Outputs a structured `dataset.json`.

- **Part 2: The Frontend Web App (`frontend/`)**
  - Built with React + Vite + TypeScript + Tailwind CSS with an Examable-inspired dark theme.
  - Dropdown filters for Unit (Unit 1, 2, 3), Subtopic (dynamically updated), and Year.
  - Left navigation drawer showing question labels, marks, stems, and bookmarking.
  - Split-screen viewer showing Question and Mark Scheme side by side, with zoom/pan controls and keyboard shortcuts (`ArrowLeft`/`ArrowRight`, `Space` to toggle).

## Quick Start

### 1. Run the Frontend Web App
```powershell
cd frontend
npm run dev
```
Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser.

### 2. Run the Extraction Pipeline
```powershell
# Extract all sample papers in ./sample_papers/
.\.venv\Scripts\python.exe -m pipeline.extract

# Or specify a unit:
.\.venv\Scripts\python.exe -m pipeline.extract --unit WCH11
```
