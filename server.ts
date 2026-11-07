/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { OPENROUTER_MODELS, PIPELINE_CONFIG } from './src/config/models.ts';
import { GroundingSource, LessonData, QCReport } from './src/types/lesson.ts';

const Type = {
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
} as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localEnv = dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
const hasLocalOpenRouterApiKey = Boolean(
  localEnv.parsed && Object.prototype.hasOwnProperty.call(localEnv.parsed, 'OPENROUTER_API_KEY')
);
const localOpenRouterApiKey = localEnv.parsed?.OPENROUTER_API_KEY?.trim();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const RESEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const researchCache = new Map<string, {
  expiresAt: number;
  result: {
    success: true;
    researchText: string;
    sources: GroundingSource[];
    searchQueries: string[];
    isGrounded: boolean;
  };
}>();

app.use(express.json({ limit: '10mb' }));

function getApiKey(): string | undefined {
  if (hasLocalOpenRouterApiKey) return localOpenRouterApiKey || undefined;
  return process.env.OPENROUTER_API_KEY?.trim() || undefined;
}

const startupApiKey = getApiKey();
console.info(
  startupApiKey
    ? `OpenRouter API key loaded (ending in ${startupApiKey.slice(-4)}).`
    : 'OpenRouter API key is not configured.'
);

function getOpenRouterApiKey(): string {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key is missing. Set OPENROUTER_API_KEY in .env.local and restart the server.');
  }
  return apiKey;
}

interface OpenRouterCitation {
  url?: string;
  title?: string;
  content?: string;
}

interface OpenRouterResponse {
  text: string;
  citations: OpenRouterCitation[];
}

function toOpenRouterJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toOpenRouterJsonSchema);
  if (!isRecord(schema)) return schema;
  return Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [
      key,
      key === 'type' && typeof value === 'string'
        ? value.toLowerCase()
        : toOpenRouterJsonSchema(value),
    ])
  );
}

async function openRouterGenerateContent(params: {
  model: string;
  contents: string;
  jsonSchema?: unknown;
  search?: boolean;
}): Promise<OpenRouterResponse> {
  const prompt = params.jsonSchema
    ? `${params.contents}\n\nReturn only a valid JSON object matching this JSON Schema exactly:\n${JSON.stringify(toOpenRouterJsonSchema(params.jsonSchema))}`
    : params.contents;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-OpenRouter-Title': 'AI Lesson Creation Tool',
    },
    body: JSON.stringify({
      model: params.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 12000,
      ...(params.search
        ? {
            tools: [{
              type: 'openrouter:web_search',
              parameters: {
                engine: 'exa',
                mode: 'instant',
                max_results: 5,
                max_total_results: 5,
                max_uses: 1,
                search_context_size: 'low',
              },
            }],
          }
        : {}),
    }),
    signal: AbortSignal.timeout(PIPELINE_CONFIG.API_TIMEOUT_MS),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const apiMessage =
      isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string'
        ? body.error.message
        : `OpenRouter request failed with HTTP ${response.status}.`;
    const error = new Error(apiMessage) as Error & { status: number; details?: unknown };
    error.status = response.status;
    error.details = {
      body,
      retryAfter: response.headers.get('retry-after'),
    };
    throw error;
  }

  if (!isRecord(body) || !Array.isArray(body.choices)) {
    throw new Error('OpenRouter returned an invalid chat completion response.');
  }
  const choice = body.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    throw new Error('OpenRouter returned an empty chat completion.');
  }
  const message = choice.message;
  const text = typeof message.content === 'string'
    ? message.content
    : Array.isArray(message.content)
      ? message.content
          .filter((part): part is Record<string, unknown> => isRecord(part) && typeof part.text === 'string')
          .map((part) => part.text as string)
          .join('\n')
      : '';
  const citationValues = [
    ...(Array.isArray(message.annotations) ? message.annotations : []),
    ...(Array.isArray(message.citations) ? message.citations : []),
  ];
  const citations = citationValues.flatMap((citation): OpenRouterCitation[] => {
    if (typeof citation === 'string') return [{ url: citation }];
    if (!isRecord(citation)) return [];
    const details = isRecord(citation.url_citation) ? citation.url_citation : citation;
    return [{
      url: typeof details.url === 'string' ? details.url : undefined,
      title: typeof details.title === 'string' ? details.title : undefined,
      content: typeof details.content === 'string' ? details.content : undefined,
    }];
  });
  return { text: text.trim(), citations };
}

function getRetryDelayMs(error: unknown): number | undefined {
  const values: unknown[] = [error];
  if (error && typeof error === 'object' && 'details' in error) {
    values.push(error.details);
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    try {
      values.push(JSON.parse(error.message));
    } catch {
      // The SDK may expose a non-JSON message; inspect its other error fields instead.
    }
  }

  const visited = new Set<object>();
  const findDelay = (value: unknown): number | undefined => {
    if (typeof value !== 'object' || value === null || visited.has(value)) return undefined;
    visited.add(value);
    if (Array.isArray(value)) {
      for (const entry of value) {
        const delay = findDelay(entry);
        if (delay !== undefined) return delay;
      }
      return undefined;
    }

    for (const [key, nested] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
      if (normalizedKey === 'retrydelayms' && typeof nested === 'number') return nested;
      if (normalizedKey.includes('retrydelay') || normalizedKey === 'retryafter') {
        if (typeof nested === 'number') return normalizedKey.endsWith('ms') ? nested : nested * 1000;
        if (typeof nested === 'string') {
          const match = nested.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s)?$/i);
          if (match) return Number(match[1]) * (match[2]?.toLowerCase() === 'ms' ? 1 : 1000);
        }
      }
      const delay = findDelay(nested);
      if (delay !== undefined) return delay;
    }
    return undefined;
  };

  for (const value of values) {
    const delay = findDelay(value);
    if (delay !== undefined && Number.isFinite(delay) && delay >= 0) return delay;
  }
  return undefined;
}

// Timeout & Retry helper with exponential backoff
async function executeWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  operationName: string,
  maxRetries = PIPELINE_CONFIG.MAX_RETRIES,
  timeoutMs = PIPELINE_CONFIG.API_TIMEOUT_MS
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Operation '${operationName}' timed out after ${timeoutMs / 1000} seconds.`));
        }, timeoutMs);
      });

      return await Promise.race([operation(attempt), timeoutPromise]);
    } catch (err: unknown) {
      lastError = err;
      const error = err as { status?: number; message?: string };
      const status = error.status ?? Number(error.message?.match(/\b(400|401|403|404|408|429|5\d{2})\b/)?.[0]);
      const retryable = !status || status === 408 || status === 429 || status >= 500;
      if (retryable && attempt <= maxRetries) {
        const backoffMs = status === 429
          ? Math.min(getRetryDelayMs(err) ?? attempt * 2000, 60_000)
          : attempt * 2000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        throw err;
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  const message = lastError instanceof Error ? lastError.message : 'Unknown error occurred after retry.';
  throw new Error(`[${operationName} Failed]: ${message}`);
}

function getErrorDetails(error: unknown): { status: number; message: string } {
  const details = error as { status?: number; code?: number | string; message?: string };
  const message = details?.message || 'An unexpected server error occurred.';
  const messageLower = message.toLowerCase();
  const status = Number(details?.status || details?.code || message.match(/\b(400|401|403|404|408|429|5\d{2})\b/)?.[0]);

  if (/api key is missing/.test(messageLower)) {
    return { status: 503, message };
  }
  if (/api.?key|unauthorized|permission denied|forbidden/.test(messageLower) || status === 401 || status === 403) {
    return { status: 401, message: `OpenRouter rejected the API key or access: ${message}` };
  }
  if (status === 404 || /model.*not found|not found.*model/.test(messageLower)) {
    return { status: 404, message: `OpenRouter model or route was not found: ${message}` };
  }
  if (status === 429 || /resource_exhausted|quota|rate.?limit/.test(messageLower)) {
    return { status: 429, message: `OpenRouter model or search quota/rate limit reached: ${message}` };
  }
  if (/timed out|timeout/.test(messageLower) || status === 408) {
    return { status: 504, message: `OpenRouter request timed out: ${message}` };
  }
  if (status >= 500 && status <= 599) {
    return { status, message: `OpenRouter service error (${status}): ${message}` };
  }
  if (/fetch failed|network|econn|enotfound|socket/.test(messageLower)) {
    return { status: 503, message: `Could not connect to OpenRouter: ${message}` };
  }
  return { status: status >= 400 && status <= 599 ? status : 500, message };
}

function sendApiError(res: Response, error: unknown, fallback: string): void {
  const details = getErrorDetails(error);
  console.error(fallback, error);
  res.status(details.status).json({ error: details.message || fallback });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseModelJson<T>(
  text: string | undefined,
  responseName: string,
  isValid: (value: unknown) => value is T
): T {
  const json = (text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error(`${responseName} did not return valid JSON.`);
  }
  if (!isValid(value)) {
    throw new Error(`${responseName} returned data that does not match the expected schema.`);
  }
  return value;
}

function isLessonData(value: unknown): value is LessonData {
  if (!isRecord(value) || !isRecord(value.sections)) return false;
  const sections = value.sections;
  const textSectionKeys = [
    'introduction',
    'coreConcepts',
    'workedExamples',
    'practicalApplications',
    'handsOnActivity',
    'summary',
  ];
  if (!textSectionKeys.every((key) => {
    const section = sections[key];
    return isRecord(section) &&
      typeof section.id === 'string' &&
      typeof section.title === 'string' &&
      typeof section.minutes === 'number' &&
      typeof section.content === 'string';
  })) return false;

  const knowledgeCheck = sections.knowledgeCheck;
  if (
    !isRecord(knowledgeCheck) ||
    typeof knowledgeCheck.id !== 'string' ||
    typeof knowledgeCheck.title !== 'string' ||
    typeof knowledgeCheck.minutes !== 'number' ||
    !Array.isArray(knowledgeCheck.questions) ||
    !knowledgeCheck.questions.every((question) =>
      isRecord(question) &&
      typeof question.id === 'string' &&
      typeof question.question === 'string' &&
      typeof question.correctAnswer === 'string' &&
      typeof question.explanation === 'string' &&
      (question.options === undefined || Array.isArray(question.options))
    )
  ) return false;

  return typeof value.title === 'string' &&
    typeof value.learningObjective === 'string' &&
    typeof value.totalMinutes === 'number' &&
    Array.isArray(value.recommendedVideos) &&
    Array.isArray(value.references);
}

function isQCReport(value: unknown): value is Pick<QCReport, 'overallScore' | 'summary' | 'issues'> {
  return isRecord(value) &&
    typeof value.overallScore === 'number' &&
    Number.isInteger(value.overallScore) &&
    value.overallScore >= 0 &&
    value.overallScore <= 100 &&
    typeof value.summary === 'string' &&
    Array.isArray(value.issues) &&
    value.issues.every((issue) =>
      isRecord(issue) &&
      typeof issue.severity === 'string' &&
      typeof issue.location === 'string' &&
      typeof issue.description === 'string' &&
      typeof issue.evidence === 'string' &&
      typeof issue.suggestedFix === 'string'
    );
}

function getGroundingSourceUrl(uri: unknown): string | null {
  if (typeof uri !== 'string') return null;
  try {
    const url = new URL(uri);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

// ==========================================
// API Endpoints
// ==========================================

/**
 * Health check / API status
 */
app.get('/api/health', (req: Request, res: Response) => {
  const hasKey = Boolean(getApiKey());
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    provider: 'OpenRouter',
    models: OPENROUTER_MODELS,
  });
});

/**
 * Step A: Research with OpenRouter web search.
 * Search and structured JSON generation remain separate calls.
 */
app.post('/api/pipeline/research', async (req: Request, res: Response) => {
  try {
    const {
      title,
      learningObjective,
      language = 'English',
      gradeLevel = 'University',
      durationMinutes = 45,
    } = req.body;

    if (!title || !title.trim() || !learningObjective || !learningObjective.trim()) {
      return res.status(400).json({ error: 'Title and Learning Objective are both required.' });
    }

    const cacheKey = JSON.stringify({
      title: title.trim(),
      learningObjective: learningObjective.trim(),
      language,
      gradeLevel,
      durationMinutes,
    });
    const cachedResearch = researchCache.get(cacheKey);
    if (cachedResearch && cachedResearch.expiresAt > Date.now()) {
      res.json(cachedResearch.result);
      return;
    }
    if (cachedResearch) researchCache.delete(cacheKey);

    const isHindi = language.toLowerCase() === 'hindi';
    const langInstruction = isHindi
      ? 'CRITICAL LANGUAGE: Provide the research synthesis in Hindi (हिन्दी) in Devanagari script. Technical protocol terms and method names can remain in English.'
      : 'Provide the research synthesis in English.';

    const researchPrompt = `You are an elite educational researcher. Research the following lesson topic and learning objective thoroughly:
Topic: "${title}"
Learning Objective: "${learningObjective}"
Target Grade Level: "${gradeLevel}"
Target Lesson Duration: "${durationMinutes} minutes"
Language Requirement: ${langInstruction}

Conduct comprehensive web searches for:
1. Authoritative textbooks and academic/industry books related to this topic.
2. Standard documentation, authoritative technical websites, and educational articles.
3. High quality YouTube lectures and video tutorials covering this exact topic.

For each discovery, explain:
- The resource title
- Whether it is a book, website, or YouTube video
- What specific concepts and factual claims it establishes
- Key definitions, protocol specifications, diagrams, or best practices

Synthesize this into a comprehensive research briefing.`;

    const result = await executeWithRetry(
      async () => openRouterGenerateContent({
        model: OPENROUTER_MODELS.RESEARCH,
        contents: researchPrompt,
        search: true,
      }),
      'OpenRouter Search-Grounded Research',
      PIPELINE_CONFIG.MAX_RETRIES,
      90000
    );

    const researchText = result.text;
    if (!researchText) throw new Error('OpenRouter returned an empty research response. Retry the research step.');

    // Extract real URLs and titles
    const verifiedSources: GroundingSource[] = [];
    const seenUrls = new Set<string>();
    let indexCounter = 1;

    if (result.citations.length > 0) {
      for (const citation of result.citations) {
        const uri = getGroundingSourceUrl(citation.url);
        const titleStr = citation.title || 'Web Reference';
        if (uri && !seenUrls.has(uri)) {
          seenUrls.add(uri);

          let type: 'book' | 'website' | 'youtube' = 'website';
          const lowerUri = uri.toLowerCase();
          const lowerTitle = titleStr.toLowerCase();

          if (lowerUri.includes('youtube.com') || lowerUri.includes('youtu.be')) {
            type = 'youtube';
          } else if (
            lowerUri.includes('books.google') ||
            lowerUri.includes('oreilly.com') ||
            lowerUri.includes('goodreads') ||
            lowerTitle.includes('book') ||
            lowerTitle.includes('handbook') ||
            lowerTitle.includes('guidebook')
          ) {
            type = 'book';
          }

          verifiedSources.push({
            id: `source-${indexCounter}`,
            index: indexCounter,
            title: titleStr,
            url: uri,
            type,
            claim: `Authoritative reference for ${title} foundational principles and standards.`,
            channelOrAuthor: type === 'youtube' ? 'YouTube Creator' : undefined,
            notes: citation.content || 'Source returned by OpenRouter web search.',
          });
          indexCounter++;
        }
      }
    }

    const researchResponse = {
      success: true as const,
      researchText,
      sources: verifiedSources,
      searchQueries: [],
      isGrounded: result.citations.length > 0,
    };
    if (researchCache.size >= 50) {
      const oldestCacheKey = researchCache.keys().next().value;
      if (oldestCacheKey) researchCache.delete(oldestCacheKey);
    }
    researchCache.set(cacheKey, {
      expiresAt: Date.now() + RESEARCH_CACHE_TTL_MS,
      result: researchResponse,
    });
    res.json(researchResponse);
  } catch (error: any) {
    sendApiError(res, error, 'Failed to complete research step.');
  }
});

/**
 * Step B: Structured Lesson Generation
 * Second separate call. Enforces JSON Schema. Designed for 45-minute lesson.
 * Traces factual claims to source indices.
 */
app.post('/api/pipeline/generate', async (req: Request, res: Response) => {
  try {
    const {
      title,
      learningObjective,
      researchText,
      sources,
      language = 'English',
      gradeLevel = 'University',
      durationMinutes = 45,
    } = req.body;

    if (!title || !learningObjective) {
      return res.status(400).json({ error: 'Title and Learning Objective are required.' });
    }

    const targetMinutes = Number(durationMinutes) > 0 ? Number(durationMinutes) : 45;

    // Time budget calculation for targetMinutes:
    let introMins = 5;
    let conceptsMins = 15;
    let examplesMins = 10;
    let practicalMins = 5;
    let activityMins = 5;
    let quizMins = 3;
    let summaryMins = 2;

    if (targetMinutes === 30) {
      introMins = 3; conceptsMins = 10; examplesMins = 7; practicalMins = 3; activityMins = 4; quizMins = 2; summaryMins = 1;
    } else if (targetMinutes === 60) {
      introMins = 6; conceptsMins = 20; examplesMins = 14; practicalMins = 6; activityMins = 8; quizMins = 4; summaryMins = 2;
    } else if (targetMinutes !== 45) {
      introMins = Math.max(2, Math.round(targetMinutes * 0.11));
      conceptsMins = Math.max(4, Math.round(targetMinutes * 0.33));
      examplesMins = Math.max(3, Math.round(targetMinutes * 0.22));
      practicalMins = Math.max(2, Math.round(targetMinutes * 0.11));
      activityMins = Math.max(2, Math.round(targetMinutes * 0.11));
      quizMins = Math.max(2, Math.round(targetMinutes * 0.07));
      summaryMins = Math.max(1, targetMinutes - (introMins + conceptsMins + examplesMins + practicalMins + activityMins + quizMins));
    }

    const isHindi = language.toLowerCase() === 'hindi';
    const langRequirement = isHindi
      ? `MANDATORY HINDI INSTRUCTION:
Write the ENTIRE lesson content (introduction, core concepts, worked examples, applications, activity, quiz questions, answer options, diagnostic explanations, and summary) in natural, grammatically correct Hindi (हिन्दी) using Devanagari script.
Retain technical standard protocol names, acronyms, and keywords (like HTTP, GET, POST, 2xx, 4xx, 5xx, RFC 9110, URL) in English / Latin script alongside Hindi explanations.`
      : 'Write the complete lesson in clear, professional English.';

    const verifiedSourcesList = Array.isArray(sources) && sources.length > 0 ? sources : [];
    const sourcesReferenceCatalog = verifiedSourcesList
      .map(
        (s: GroundingSource) =>
          `[Source ${s.index}] ${s.title} (${s.type.toUpperCase()}): ${s.url}\nInitial claim: ${s.claim}`
      )
      .join('\n\n');

    const generatePrompt = `You are a master curriculum designer and university instructor.
Create a complete, rigorous, production-grade ${targetMinutes}-minute lesson plan based on the provided research and verified sources.

Topic: "${title}"
Learning Objective: "${learningObjective}"
Target Audience Grade: "${gradeLevel}"
Target Lesson Duration: "${targetMinutes} minutes"
Language Requirement:
${langRequirement}

VERIFIED SOURCES CATALOG:
${sourcesReferenceCatalog || 'No external sources provided.'}

RESEARCH SYNTHESIS:
${researchText || 'Direct synthesis of topic.'}

CRITICAL PEDAGOGICAL & STRUCTURAL RULES:
1. Time Budget: The lesson is STRICTLY designed for ${targetMinutes} minutes total. The section times must sum to ${targetMinutes} minutes:
   - Introduction and Learning Objective: ${introMins} minutes
   - Core Concept Explanations: ${conceptsMins} minutes
   - Worked Examples (code/diagrammatic/real-world): ${examplesMins} minutes
   - Practical Applications: ${practicalMins} minutes
   - Hands-on Activity: ${activityMins} minutes
   - Knowledge Check (4-6 questions with answers & explanations): ${quizMins} minutes
   - Summary / Key Takeaways: ${summaryMins} minutes
   Total: ${introMins} + ${conceptsMins} + ${examplesMins} + ${practicalMins} + ${activityMins} + ${quizMins} + ${summaryMins} = ${targetMinutes} minutes.

2. Source Traceability:
   - Every factual claim, specification, definition, and worked step must cite the source using "[Source N]".
   - ONLY cite from the verified sources catalog provided above. DO NOT invent or fabricate any URLs.
   - In the "references" array, include the exact verified sources from the catalog, detailing what each was used for and the specific claim it supports.

3. Recommended YouTube Videos:
   - Identify high-impact video recommendations. If verified YouTube URLs exist in the catalog, use them. If no YouTube URL is present in the catalog, provide the authoritative YouTube search query URL format (e.g. "https://www.youtube.com/results?search_query=...") or standard publisher channels. Never fabricate fake video IDs.
   - For each video, specify the title, channel, why it is relevant, and which lesson section it supports.

4. Hands-on Activity:
   - Provide an actionable step-by-step exercise feasible within 5 minutes for learners.

5. Knowledge Check:
   - Provide 4 to 6 diagnostic questions with multiple choice options, the unambiguous correct answer, and a clear pedagogical explanation.`;

    const lessonSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        learningObjective: { type: Type.STRING },
        totalMinutes: { type: Type.INTEGER },
        sections: {
          type: Type.OBJECT,
          properties: {
            introduction: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                minutes: { type: Type.INTEGER },
                content: { type: Type.STRING },
              },
              required: ['id', 'title', 'minutes', 'content'],
            },
            coreConcepts: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                minutes: { type: Type.INTEGER },
                content: { type: Type.STRING },
              },
              required: ['id', 'title', 'minutes', 'content'],
            },
            workedExamples: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                minutes: { type: Type.INTEGER },
                content: { type: Type.STRING },
              },
              required: ['id', 'title', 'minutes', 'content'],
            },
            practicalApplications: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                minutes: { type: Type.INTEGER },
                content: { type: Type.STRING },
              },
              required: ['id', 'title', 'minutes', 'content'],
            },
            handsOnActivity: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                minutes: { type: Type.INTEGER },
                content: { type: Type.STRING },
              },
              required: ['id', 'title', 'minutes', 'content'],
            },
            knowledgeCheck: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                minutes: { type: Type.INTEGER },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctAnswer: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                    },
                    required: ['id', 'question', 'correctAnswer', 'explanation'],
                  },
                },
              },
              required: ['id', 'title', 'minutes', 'questions'],
            },
            summary: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                minutes: { type: Type.INTEGER },
                content: { type: Type.STRING },
              },
              required: ['id', 'title', 'minutes', 'content'],
            },
          },
          required: [
            'introduction',
            'coreConcepts',
            'workedExamples',
            'practicalApplications',
            'handsOnActivity',
            'knowledgeCheck',
            'summary',
          ],
        },
        recommendedVideos: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              channel: { type: Type.STRING },
              url: { type: Type.STRING },
              relevance: { type: Type.STRING },
              supportedSection: { type: Type.STRING },
            },
            required: ['title', 'channel', 'url', 'relevance', 'supportedSection'],
          },
        },
        references: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              index: { type: Type.INTEGER },
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              type: { type: Type.STRING },
              claim: { type: Type.STRING },
              channelOrAuthor: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
            required: ['id', 'index', 'title', 'url', 'type', 'claim'],
          },
        },
      },
      required: ['title', 'learningObjective', 'totalMinutes', 'sections', 'recommendedVideos', 'references'],
    };

    const response = await executeWithRetry(
      async () => {
        return await openRouterGenerateContent({
          model: OPENROUTER_MODELS.GENERATION,
          contents: generatePrompt,
          jsonSchema: lessonSchema,
        });
      },
      'Structured Lesson Generation'
    );

    const parsedLesson = parseModelJson(response.text, 'Lesson generation', isLessonData);

    // Ensure totalMinutes calculates correctly
    let calculatedMinutes =
      (parsedLesson.sections?.introduction?.minutes || introMins) +
      (parsedLesson.sections?.coreConcepts?.minutes || conceptsMins) +
      (parsedLesson.sections?.workedExamples?.minutes || examplesMins) +
      (parsedLesson.sections?.practicalApplications?.minutes || practicalMins) +
      (parsedLesson.sections?.handsOnActivity?.minutes || activityMins) +
      (parsedLesson.sections?.knowledgeCheck?.minutes || quizMins) +
      (parsedLesson.sections?.summary?.minutes || summaryMins);

    parsedLesson.totalMinutes = calculatedMinutes;
    parsedLesson.durationMinutes = targetMinutes;
    parsedLesson.language = language;
    parsedLesson.gradeLevel = gradeLevel;

    res.json({
      success: true,
      lesson: parsedLesson,
    });
  } catch (error: any) {
    sendApiError(res, error, 'Failed to generate structured lesson.');
  }
});

/**
 * Common QC Report Schema for JSON enforcement
 */
const qcReportSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.INTEGER,
      description: 'Overall quality score from 0 to 100',
    },
    summary: {
      type: Type.STRING,
      description: 'Concise summary of findings and overall evaluation',
    },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          severity: { type: Type.STRING }, // High | Medium | Low
          location: { type: Type.STRING },
          description: { type: Type.STRING },
          evidence: { type: Type.STRING },
          suggestedFix: { type: Type.STRING },
        },
        required: ['id', 'severity', 'location', 'description', 'evidence', 'suggestedFix'],
      },
    },
  },
  required: ['overallScore', 'summary', 'issues'],
};

/**
 * QC Layer 1: Research and Factual Accuracy
 * Independent check using OpenRouter web search to re-verify claims independently.
 * Does not see QC Layer 2 output.
 */
app.post('/api/pipeline/qc-factual', async (req: Request, res: Response) => {
  try {
    const { lesson } = req.body;
    if (!lesson || !lesson.title) {
      return res.status(400).json({ error: 'Valid lesson data is required for QC Layer 1.' });
    }

    // Step 1: Perform search-grounded factual re-verification
    const factCheckSearchPrompt = `You are a Senior Technical Auditor and Fact Checker.
Audit the factual accuracy and technical claims in the following lesson.
Do NOT trust the lesson at face value. Independently search for official specifications, RFCs, documentation, and academic consensus.

Lesson Title: ${lesson.title}
Learning Objective: ${lesson.learningObjective}

Lesson Content to Audit:
--- Introduction ---
${lesson.sections?.introduction?.content || ''}

--- Core Concepts ---
${lesson.sections?.coreConcepts?.content || ''}

--- Worked Examples ---
${lesson.sections?.workedExamples?.content || ''}

--- Practical Applications ---
${lesson.sections?.practicalApplications?.content || ''}

--- Hands-on Activity ---
${lesson.sections?.handsOnActivity?.content || ''}

--- Knowledge Check ---
${JSON.stringify(lesson.sections?.knowledgeCheck?.questions || [])}

--- Summary ---
${lesson.sections?.summary?.content || ''}

Audit Requirements:
1. Verify factual correctness of all protocol rules, code examples, terminology, and status codes/categories.
2. Flag any unsupported, ambiguous, or misleading claims.
3. Rate source reliability, relevance, and citation accuracy.
4. Identify any technical gaps, edge cases missed, or inconsistencies.

Provide an exhaustive factual audit summary with concrete evidence for any detected issues.`;

    const factAuditGrounded = await executeWithRetry(
      async () => openRouterGenerateContent({
        model: OPENROUTER_MODELS.QC_FACTUAL,
        contents: factCheckSearchPrompt,
        search: true,
      }),
      'QC Layer 1 Search-Grounded Verification',
      PIPELINE_CONFIG.MAX_RETRIES,
      90000
    );
    const factAuditAnalysis = factAuditGrounded.text;

    // Step 2: Format factual audit into JSON schema (separate call without search tool)
    const formatPrompt = `Convert the following independent factual audit analysis into a structured QC Report adhering to the JSON schema.

Audit Analysis:
${factAuditAnalysis}

Instructions for output:
- overallScore: integer from 0 to 100 based on factual accuracy (100 = flawless, <70 = significant factual errors).
- summary: high-level executive summary of factual accuracy and source reliability.
- issues: list each issue with:
  - id: unique string e.g. "qc1-issue-1"
  - severity: "High" (major factual inaccuracy or misleading claim), "Medium" (missing nuance, inaccurate detail, or questionable claim), "Low" (minor terminology or clarification needed)
  - location: specific section name (e.g. "Core Concept Explanations", "Worked Examples", "Knowledge Check", etc.)
  - description: clear explanation of the inaccuracy or gap
  - evidence: verified factual truth or standard specification
  - suggestedFix: precise, actionable rewrite instructions or replacement text`;

    const formattedReport = await executeWithRetry(
      async () => {
        return await openRouterGenerateContent({
          model: OPENROUTER_MODELS.QC_FACTUAL,
          contents: formatPrompt,
          jsonSchema: qcReportSchema,
        });
      },
      'QC Layer 1 Format Report'
    );

    const parsedReport = parseModelJson(formattedReport.text, 'QC Layer 1', isQCReport);
    const issues = (parsedReport.issues || []).map((issue: any, idx: number) => ({
      ...issue,
      id: issue.id || `qc1-issue-${idx + 1}`,
      status: 'pending',
    }));

    res.json({
      success: true,
      report: {
        overallScore: typeof parsedReport.overallScore === 'number' ? parsedReport.overallScore : 88,
        summary: parsedReport.summary || 'Factual audit completed with verified search grounding.',
        issues,
        evaluatedAt: new Date().toISOString(),
        layer: 'factual_accuracy',
      },
    });
  } catch (error: any) {
    sendApiError(res, error, 'Failed to complete QC Layer 1 (Factual Accuracy).');
  }
});

/**
 * QC Layer 2: Instructional Quality
 * Independent check. Evaluates objective alignment, 45-minute timing feasibility,
 * clarity, pacing, and pedagogical completeness. Does not see QC Layer 1 output.
 */
app.post('/api/pipeline/qc-pedagogical', async (req: Request, res: Response) => {
  try {
    const { lesson } = req.body;
    if (!lesson || !lesson.title) {
      return res.status(400).json({ error: 'Valid lesson data is required for QC Layer 2.' });
    }

    const lessonMinutes = lesson.totalMinutes || lesson.durationMinutes || 45;

    const pedagogicalPrompt = `You are a Principal Curriculum Quality Specialist and Pedagogical Evaluator.
Conduct an independent instructional quality audit of this ${lessonMinutes}-minute lesson.
Do NOT focus on external search fact-checking; focus exclusively on pedagogical excellence, learner experience, and instructional alignment.

Lesson Title: ${lesson.title}
Target Learning Objective: ${lesson.learningObjective}
Target Lesson Duration: ${lessonMinutes} Minutes

Lesson Content:
--- Introduction (${lesson.sections?.introduction?.minutes || 5} min) ---
${lesson.sections?.introduction?.content || ''}

--- Core Concepts (${lesson.sections?.coreConcepts?.minutes || 15} min) ---
${lesson.sections?.coreConcepts?.content || ''}

--- Worked Examples (${lesson.sections?.workedExamples?.minutes || 10} min) ---
${lesson.sections?.workedExamples?.content || ''}

--- Practical Applications (${lesson.sections?.practicalApplications?.minutes || 5} min) ---
${lesson.sections?.practicalApplications?.content || ''}

--- Hands-on Activity (${lesson.sections?.handsOnActivity?.minutes || 5} min) ---
${lesson.sections?.handsOnActivity?.content || ''}

--- Knowledge Check (${lesson.sections?.knowledgeCheck?.minutes || 3} min) ---
${JSON.stringify(lesson.sections?.knowledgeCheck?.questions || [])}

--- Summary (${lesson.sections?.summary?.minutes || 2} min) ---
${lesson.sections?.summary?.content || ''}

Total Allocated Minutes: ${lesson.totalMinutes || lessonMinutes} minutes.

Instructional Quality Evaluation Criteria:
1. Alignment with Learning Objective: Does every section directly build toward accomplishing the stated learning objective? Are there irrelevant tangents or missing foundational prerequisites?
2. Timing Feasibility & Pacing: Can realistic learners absorb the core concepts, study the examples, complete the hands-on activity, and answer the knowledge check within the target ${lessonMinutes}-minute time budget?
3. Clarity and Scaffolding: Are complex concepts explained with progressive disclosure and intuitive analogies?
4. Worked Examples & Practice: Are the examples practical, realistic, and accompanied by line-by-line commentary?
5. Hands-on Activity: Is the activity clear, self-contained, and doable in the allotted time?
6. Knowledge Check Quality: Are the 4-6 questions diagnostic, discriminating between superficial and deep understanding?

Output requirements:
- overallScore: integer from 0 to 100 based on instructional quality (100 = world-class pedagogy, <70 = major pedagogical gaps).
- summary: executive summary of pedagogical strengths and instructional gaps.
- issues: array of issues. Severity: High (fails objective alignment or unrealistic timing), Medium (scaffolding gap or weak activity), Low (minor phrasing or clarity enhancement).
- suggestedFix: actionable instructional recommendations.`;

    const response = await executeWithRetry(
      async () => {
        return await openRouterGenerateContent({
          model: OPENROUTER_MODELS.QC_PEDAGOGICAL,
          contents: pedagogicalPrompt,
          jsonSchema: qcReportSchema,
        });
      },
      'QC Layer 2 Pedagogical Audit'
    );

    const parsedReport = parseModelJson(response.text, 'QC Layer 2', isQCReport);
    const issues = (parsedReport.issues || []).map((issue: any, idx: number) => ({
      ...issue,
      id: issue.id || `qc2-issue-${idx + 1}`,
      status: 'pending',
    }));

    res.json({
      success: true,
      report: {
        overallScore: typeof parsedReport.overallScore === 'number' ? parsedReport.overallScore : 90,
        summary: parsedReport.summary || 'Instructional quality evaluation completed.',
        issues,
        evaluatedAt: new Date().toISOString(),
        layer: 'instructional_quality',
      },
    });
  } catch (error: any) {
    sendApiError(res, error, 'Failed to complete QC Layer 2 (Instructional Quality).');
  }
});

/**
 * Section Rewrite: Apply QC suggestion
 * Uses the configured fast model to rewrite ONLY the affected section.
 * Returns new content for before/after diff preview.
 */
app.post('/api/pipeline/apply-suggestion', async (req: Request, res: Response) => {
  try {
    const { sectionTitle, currentContent, issueDescription, suggestedFix, learningObjective, language = 'English' } = req.body;

    if (!currentContent || !suggestedFix) {
      return res.status(400).json({ error: 'currentContent and suggestedFix are required.' });
    }

    const isHindi = language.toLowerCase() === 'hindi';

    const rewritePrompt = `You are an expert instructional editor.
Rewrite ONLY the specific section text below to resolve the identified QC issue while preserving the tone, markdown formatting, and overall section scope.

Context:
Section Title: "${sectionTitle}"
Overall Learning Objective: "${learningObjective || 'Instructional mastery'}"
Target Language: ${isHindi ? 'Hindi (हिन्दी)' : 'English'}
${isHindi ? 'Return the rewritten section text in natural, clear Hindi (हिन्दी) in Devanagari script, preserving technical terms and acronyms in English.' : ''}

Issue Description:
${issueDescription}

Suggested Fix:
${suggestedFix}

Current Section Content:
"""
${currentContent}
"""

Instructions:
- Return ONLY the updated, complete section content in pristine Markdown.
- Do NOT include commentary, greetings, or explanations before or after.
- Keep the length appropriate for the section's allocated time.
- Address the QC issue completely.`;

    const response = await executeWithRetry(
      async () => {
        return await openRouterGenerateContent({
          model: OPENROUTER_MODELS.SECTION_REWRITE,
          contents: rewritePrompt,
        });
      },
      'Fast Section Rewrite'
    );

    const rewrittenContent = (response.text || '').trim();
    if (!rewrittenContent) throw new Error('OpenRouter returned an empty rewrite. Retry the suggestion.');

    res.json({
      success: true,
      originalText: currentContent,
      rewrittenText: rewrittenContent,
    });
  } catch (error: any) {
    sendApiError(res, error, 'Failed to rewrite section.');
  }
});

// ==========================================
// Vite Middleware / Static Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
