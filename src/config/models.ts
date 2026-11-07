/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OpenRouter routes each pipeline step to an available free model.
 */
export const OPENROUTER_MODELS = {
  RESEARCH: 'openrouter/free',
  
  GENERATION: 'openrouter/free',
  
  QC_FACTUAL: 'openrouter/free',
  
  QC_PEDAGOGICAL: 'openrouter/free',
  
  SECTION_REWRITE: 'openrouter/free',
} as const;

export const PIPELINE_CONFIG = {
  TARGET_LESSON_MINUTES: 45,
  MAX_VERSIONS_STORED: 5,
  API_TIMEOUT_MS: 90000, // 90 seconds timeout for search and deep reasoning
  MAX_RETRIES: 2, // At most two automatic retries with exponential backoff
};
