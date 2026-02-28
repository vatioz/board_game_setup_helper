# Board Game Setup Helper — Specifications

A personal tool for extracting and curating quick-reference setup guides from board-game rulebook PDFs. Single user, English-only (v1). Upload a rulebook, get an editable checklist of setup steps, save it for next game night.

---

## 1. Document Ingestion and Parsing

- **Requirement:** The system must accept a PDF file as input (max 25 MB).
- **Process:** The file is uploaded to the backend, which calls **Azure AI Document Intelligence** (prebuilt-read model) to extract text with layout awareness. Image-only pages are OCR'd automatically.
- **Scope:** English-language rulebooks only in v1.
- **Error handling:** If extraction returns no text, surface a clear message and allow retry or a different file.

## 2. Information Extraction (Initial Analysis)

- **Requirement:** Process the extracted text to identify a complete, chronologically ordered list of all discrete instructions required to set up a board game.
- **Model:** Azure OpenAI **GPT-5.2** with a focused system prompt that distinguishes setup instructions from gameplay rules, victory conditions, and flavor text.
- **Response schema:** JSON array of `{id: string, text: string}`.
- **Error handling:** If the LLM returns malformed JSON, retry once automatically; on second failure, surface the error and raw response for diagnostics.

## 3. Heuristic Filtering (Key Step Identification)

- **Requirement:** Analyze the "All Steps" list to identify a subset of "Key Steps."
- **Criteria:** Key Steps should be non-obvious, complex, or easily forgotten (e.g., specific starting resource or coin counts, starting cards) rather than intuitive actions (e.g., "put the board in the middle of the table").
- **Implementation:** A second GPT-5.2 call receives the All Steps list and returns `{id: string, text: string, isKey: boolean}[]`.

## 4. Interactive Data Manipulation

- **Requirement (Toggle):** The user must be able to move steps between the "All Steps" and "Key Steps" lists.
- **Requirement (Editing):** The user must be able to edit the text of any step; edits must propagate to that step in both lists.
- **Requirement (Ordering):** The user must be able to reorder the "Key Steps" list via drag-and-drop.
- **Implementation detail:** Unique IDs per step object keep data consistent across UI components.

## 5. Data Persistence

- **Requirement:** Allow the user to save processed and edited game setup lists under a custom name.
- **Requirement:** The user must be able to view, load, and delete previously saved sessions.
- **Storage:** Azure Cosmos DB for NoSQL (serverless). Documents keyed by game name in a single container.

## 6. Output and Diagnostics

- **Requirement (Print):** Generate a print-optimized view of the "Key Steps" list, excluding all UI chrome.
- **Requirement (Logs):** Maintain raw Document Intelligence output and raw LLM responses alongside each session for replay/debugging.
- **Implementation:** Print opens a new window/tab with a high-contrast, text-only stylesheet. Diagnostic data viewable via a collapsible panel in the UI.

## 7. Error Handling

- **Empty extraction:** User-friendly warning with option to retry or upload a different file.
- **Malformed LLM response:** Automatic single retry; on failure, show error + raw response.
- **Document Intelligence failure:** Clear error message with HTTP status detail.
- **Network failure:** Already-loaded data remains usable; save/load operations show offline warning.
- **Large documents:** If extracted text exceeds the LLM context window, chunk and merge results.

## 8. Non-Functional Requirements

- Responsive layout (desktop-first, mobile-usable).
- Initial page load < 2 s (static SPA assets).
- LLM processing < 45 s with a visible progress indicator.
- Print stylesheet produces clean, high-contrast output.

## 9. Technology Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React 18 + TypeScript, Vite | `@dnd-kit` for drag-and-drop |
| Backend | Python, FastAPI | Serves the SPA static build + REST API |
| PDF extraction | Azure AI Document Intelligence | Prebuilt-read model, server-side |
| LLM | Azure OpenAI — GPT-5.2 | Server-side calls via `openai` Python SDK |
| Database | Azure Cosmos DB for NoSQL (serverless) | Single container, keyed by game name |
| Hosting | Azure App Service (existing Linux plan) | Docker container; no cold starts |
| Secrets | `.env` file | `python-dotenv` locally; App Service Configuration in production |
| Monitoring | Azure Application Insights (optional) | Python SDK auto-instruments FastAPI |
| CI/CD | GitHub Actions | Build React → copy to `static/` → Docker build → push → deploy |

## Summary of Logical Flow

```
Upload PDF
  → Backend receives file
  → Document Intelligence extracts text + layout
  → GPT-5.2 prompt A: raw text → [{id, text}] (All Steps)
  → GPT-5.2 prompt B: All Steps → [{id, text, isKey}] (Key Steps)
  → Frontend renders two-column interactive UI
  → User edits / reorders / toggles steps
  → Save to Cosmos DB / Load / Delete
  → Print Key Steps
```

Whether an LLM can consistently distinguish a "key" step from a "common-sense" step remains uncertain ("common sense" varies by player experience). The manual editing and sorting features act as a necessary hedge against AI misclassification or hallucination.

## Future Enhancements (v1.1+)

- **Player-count input:** Ask "How many players?" and tailor extraction to that count.
- **Multi-language support:** Accept non-English rulebooks.
- **Image extraction:** Surface setup diagrams from the PDF alongside text steps.
- **Sharing:** Export a session as a standalone PDF or shareable link.