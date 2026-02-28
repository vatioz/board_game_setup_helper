/** Shared TypeScript types matching the backend Pydantic models. */

export interface Step {
  id: string;
  text: string;
}

export interface ExtractResponse {
  allSteps: Step[];
  keySteps: Step[];
  rawExtraction: string;
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
  rawExtraction: string;
  rawLlmAllSteps: string;
  rawLlmKeySteps: string;
}

export interface SaveSessionRequest {
  name: string;
  allSteps: Step[];
  keySteps: Step[];
  rawExtraction: string;
  rawLlmAllSteps: string;
  rawLlmKeySteps: string;
}
