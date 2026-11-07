/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GroundingSource, LessonData, QCReport } from '../types/lesson.ts';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: globalThis.Response): Promise<T> {
  const body = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    const message = res.ok
      ? 'The server returned an invalid response.'
      : body || `HTTP ${res.status}: ${res.statusText}`;
    throw new ApiError(message, res.status);
  }
  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `HTTP ${res.status}: ${res.statusText}`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export async function checkServerHealth(): Promise<{ status: string; hasApiKey: boolean }> {
  const res = await fetch('/api/health');
  return handleResponse(res);
}

export async function requestResearch(
  title: string,
  learningObjective: string,
  language = 'English',
  gradeLevel = 'University',
  durationMinutes = 45
): Promise<{ researchText: string; sources: GroundingSource[]; searchQueries: string[]; isGrounded: boolean }> {
  const res = await fetch('/api/pipeline/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, learningObjective, language, gradeLevel, durationMinutes }),
  });
  return handleResponse(res);
}

export async function requestLessonGeneration(
  title: string,
  learningObjective: string,
  researchText: string,
  sources: GroundingSource[],
  language = 'English',
  gradeLevel = 'University',
  durationMinutes = 45
): Promise<{ lesson: LessonData }> {
  const res = await fetch('/api/pipeline/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, learningObjective, researchText, sources, language, gradeLevel, durationMinutes }),
  });
  return handleResponse(res);
}

export async function requestQCFactual(
  lesson: LessonData,
  language = 'English'
): Promise<{ report: QCReport }> {
  const res = await fetch('/api/pipeline/qc-factual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson, language }),
  });
  return handleResponse(res);
}

export async function requestQCPedagogical(
  lesson: LessonData,
  language = 'English'
): Promise<{ report: QCReport }> {
  const res = await fetch('/api/pipeline/qc-pedagogical', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson, language }),
  });
  return handleResponse(res);
}

export async function requestApplySuggestion(params: {
  sectionTitle: string;
  currentContent: string;
  issueDescription: string;
  suggestedFix: string;
  learningObjective: string;
}): Promise<{ originalText: string; rewrittenText: string }> {
  const res = await fetch('/api/pipeline/apply-suggestion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleResponse(res);
}
