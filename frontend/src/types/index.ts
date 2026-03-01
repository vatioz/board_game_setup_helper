/** Shared TypeScript types matching the backend Pydantic models. */

export interface Step {
  id: string;
  text: string;
  source?: string;  // label of the originating PDF (e.g. "Base Game")
}

export interface ExtractResponse {
  allSteps: Step[];
  keySteps: Step[];
  rawExtraction: string;                        // deprecated flat string
  rawExtractions?: Record<string, string>;       // label → extracted text per PDF
  rawLlmAllSteps: string;
  rawLlmKeySteps: string;
}

export interface SessionSummary {
  id: string;
  name: string;
}

export interface SessionData {
  id: string;
  name: string;
  allSteps: Step[];
  keySteps: Step[];
  rawExtraction: string;                        // deprecated flat string
  rawExtractions?: Record<string, string>;       // label → extracted text per PDF
  rawLlmAllSteps: string;
  rawLlmKeySteps: string;
}

export interface SaveSessionRequest {
  name: string;
  allSteps: Step[];
  keySteps: Step[];
  rawExtraction: string;                        // deprecated flat string
  rawExtractions?: Record<string, string>;       // label → extracted text per PDF
  rawLlmAllSteps: string;
  rawLlmKeySteps: string;
}
