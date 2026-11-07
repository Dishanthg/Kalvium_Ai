/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SavedLesson,
  LessonData,
  LessonVersion,
  PipelineState,
  QuestProgress,
  QCReport,
  QCIssue,
} from '../types/lesson.ts';
import { PIPELINE_CONFIG } from '../config/models.ts';

const STORAGE_KEYS = {
  CURRENT_ID: 'ailc_current_lesson_id',
  LESSONS_INDEX: 'ailc_lessons_index',
  LESSON_PREFIX: 'ailc_lesson_',
};
const STORAGE_SCHEMA_VERSION = 1;
const QUEST_PROGRESS_PREFIX = 'lesson-quest-progress-';

export interface LessonSummary {
  id: string;
  title: string;
  learningObjective: string;
  updatedAt: string;
  createdAt: string;
  hasLessonData: boolean;
}

const defaultPipelineState: PipelineState = {
  research: { status: 'idle' },
  generate: { status: 'idle' },
  qc1: { status: 'idle' },
  qc2: { status: 'idle' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function reportStorageError(message: string, error: unknown): void {
  console.error(message, error);
  if (typeof window !== 'undefined') {
    window.setTimeout(
      () => window.dispatchEvent(new CustomEvent('ailc-storage-error', { detail: message })),
      0
    );
  }
}

function isLessonData(value: unknown): value is LessonData {
  if (!isRecord(value) || !isRecord(value.sections)) return false;
  const sections = value.sections;
  const contentSections = [
    sections.introduction,
    sections.coreConcepts,
    sections.workedExamples,
    sections.practicalApplications,
    sections.handsOnActivity,
    sections.summary,
  ];
  const sectionsValid = contentSections.every((section) =>
    isRecord(section) &&
    typeof section.id === 'string' &&
    typeof section.title === 'string' &&
    typeof section.minutes === 'number' &&
    typeof section.content === 'string'
  ) &&
    isRecord(sections.knowledgeCheck) &&
    typeof sections.knowledgeCheck.id === 'string' &&
    typeof sections.knowledgeCheck.title === 'string' &&
    typeof sections.knowledgeCheck.minutes === 'number' &&
    Array.isArray(sections.knowledgeCheck.questions) &&
    sections.knowledgeCheck.questions.every((question) =>
      isRecord(question) &&
      typeof question.id === 'string' &&
      typeof question.question === 'string' &&
      typeof question.correctAnswer === 'string' &&
      typeof question.explanation === 'string' &&
      (question.options === undefined ||
        (Array.isArray(question.options) && question.options.every((option) => typeof option === 'string')))
    );
  const videosValid = Array.isArray(value.recommendedVideos) &&
    value.recommendedVideos.every((video) =>
      isRecord(video) &&
      typeof video.title === 'string' &&
      typeof video.channel === 'string' &&
      typeof video.url === 'string' &&
      typeof video.relevance === 'string' &&
      typeof video.supportedSection === 'string'
    );
  const referencesValid = Array.isArray(value.references) &&
    value.references.every((source) =>
      isRecord(source) &&
      typeof source.id === 'string' &&
      typeof source.index === 'number' &&
      typeof source.title === 'string' &&
      typeof source.url === 'string' &&
      ['book', 'website', 'youtube'].includes(String(source.type)) &&
      typeof source.claim === 'string' &&
      (source.notes === undefined || typeof source.notes === 'string') &&
      (source.channelOrAuthor === undefined || typeof source.channelOrAuthor === 'string')
    );
  return sectionsValid &&
    typeof value.title === 'string' &&
    typeof value.learningObjective === 'string' &&
    typeof value.totalMinutes === 'number' &&
    videosValid &&
    referencesValid;
}

function isLessonVersion(value: unknown): value is LessonVersion {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.label === 'string' &&
    isLessonData(value.lesson);
}

function isStepStatus(value: unknown): value is PipelineState['research']['status'] {
  return value === 'idle' || value === 'running' || value === 'success' || value === 'failed';
}

function normalizePipelineState(value: unknown): PipelineState {
  if (!isRecord(value)) return defaultPipelineState;
  const normalized = { ...defaultPipelineState };
  for (const key of ['research', 'generate', 'qc1', 'qc2'] as const) {
    const step = value[key];
    if (!isRecord(step) || !isStepStatus(step.status)) continue;
    normalized[key] = {
      status: step.status,
      ...(typeof step.startedAt === 'string' ? { startedAt: step.startedAt } : {}),
      ...(typeof step.completedAt === 'string' ? { completedAt: step.completedAt } : {}),
      ...(typeof step.errorMessage === 'string' ? { errorMessage: step.errorMessage } : {}),
    };
  }
  return normalized;
}

function normalizeQCReport(value: unknown, layer: QCReport['layer']): QCReport | undefined {
  if (
    !isRecord(value) ||
    typeof value.overallScore !== 'number' ||
    !Number.isFinite(value.overallScore) ||
    typeof value.summary !== 'string' ||
    !Array.isArray(value.issues) ||
    typeof value.evaluatedAt !== 'string'
  ) return undefined;

  const issues: QCIssue[] = value.issues.flatMap((issue, index) => {
    if (
      !isRecord(issue) ||
      typeof issue.location !== 'string' ||
      typeof issue.description !== 'string' ||
      typeof issue.evidence !== 'string' ||
      typeof issue.suggestedFix !== 'string'
    ) return [];
    const severity = issue.severity === 'High' || issue.severity === 'Medium' || issue.severity === 'Low'
      ? issue.severity
      : 'Low';
    const status = issue.status === 'applied' || issue.status === 'dismissed' ? issue.status : 'pending';
    const appliedDiff = isRecord(issue.appliedDiff) &&
      typeof issue.appliedDiff.originalText === 'string' &&
      typeof issue.appliedDiff.rewrittenText === 'string' &&
      typeof issue.appliedDiff.appliedAt === 'string'
      ? {
          originalText: issue.appliedDiff.originalText,
          rewrittenText: issue.appliedDiff.rewrittenText,
          appliedAt: issue.appliedDiff.appliedAt,
        }
      : undefined;
    return [{
      id: typeof issue.id === 'string' ? issue.id : `stored-${layer}-${index + 1}`,
      severity,
      location: issue.location,
      description: issue.description,
      evidence: issue.evidence,
      suggestedFix: issue.suggestedFix,
      status,
      ...(appliedDiff ? { appliedDiff } : {}),
    }];
  });

  return {
    overallScore: Math.max(0, Math.min(100, Math.round(value.overallScore))),
    summary: value.summary,
    issues,
    evaluatedAt: value.evaluatedAt,
    layer,
  };
}

export function createDefaultQuestProgress(): QuestProgress {
  return {
    version: 1,
    completedNodeIds: [],
    activeNodeId: 'introduction',
    freeExplore: true,
    mode: 'learner',
    quizAnswers: {},
    quizScore: 0,
    activityTickedSteps: {},
    startedAt: new Date().toISOString(),
  };
}

export function loadQuestProgress(lessonId: string): QuestProgress {
  try {
    const raw = localStorage.getItem(`${QUEST_PROGRESS_PREFIX}${lessonId}`);
    if (!raw) return createDefaultQuestProgress();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || (parsed.version !== undefined && parsed.version !== 1)) {
      console.warn('Unsupported or invalid Quest progress; starting fresh.');
      return createDefaultQuestProgress();
    }

    return {
      version: 1,
      completedNodeIds: Array.isArray(parsed.completedNodeIds)
        ? parsed.completedNodeIds.filter((id): id is string => typeof id === 'string')
        : [],
      activeNodeId: typeof parsed.activeNodeId === 'string' ? parsed.activeNodeId : 'introduction',
      freeExplore: typeof parsed.freeExplore === 'boolean' ? parsed.freeExplore : true,
      mode: parsed.mode === 'instructor' ? 'instructor' : 'learner',
      quizAnswers: isRecord(parsed.quizAnswers)
        ? Object.fromEntries(Object.entries(parsed.quizAnswers).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
        : {},
      quizScore: typeof parsed.quizScore === 'number' && Number.isFinite(parsed.quizScore) ? parsed.quizScore : 0,
      activityTickedSteps: isRecord(parsed.activityTickedSteps)
        ? Object.fromEntries(Object.entries(parsed.activityTickedSteps).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'))
        : {},
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : new Date().toISOString(),
      ...(typeof parsed.finishedAt === 'string' ? { finishedAt: parsed.finishedAt } : {}),
    };
  } catch (error) {
    reportStorageError('Could not load Quest progress from localStorage.', error);
    return createDefaultQuestProgress();
  }
}

export function saveQuestProgress(lessonId: string, progress: QuestProgress): void {
  try {
    localStorage.setItem(
      `${QUEST_PROGRESS_PREFIX}${lessonId}`,
      JSON.stringify({ ...progress, version: 1 })
    );
  } catch (error) {
    reportStorageError('Could not save Quest progress to localStorage.', error);
  }
}

export function createEmptySavedLesson(title = '', learningObjective = ''): SavedLesson {
  const now = new Date().toISOString();
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    id: `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    learningObjective,
    createdAt: now,
    updatedAt: now,
    pipelineState: defaultPipelineState,
    versions: [],
    hasInstructorEdits: false,
  };
}

export function getSavedLessonsIndex(): LessonSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LESSONS_INDEX);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Saved lessons index must be an array.');
    return parsed.filter((item): item is LessonSummary =>
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.learningObjective === 'string' &&
      typeof item.updatedAt === 'string' &&
      typeof item.createdAt === 'string' &&
      typeof item.hasLessonData === 'boolean'
    );
  } catch (error) {
    reportStorageError('Failed to load saved lessons index from localStorage.', error);
    return [];
  }
}

function updateLessonsIndex(lesson: SavedLesson): void {
  const list = getSavedLessonsIndex();
  const summary: LessonSummary = {
    id: lesson.id,
    title: lesson.title || 'Untitled Lesson',
    learningObjective: lesson.learningObjective || 'No objective specified',
    updatedAt: lesson.updatedAt,
    createdAt: lesson.createdAt,
    hasLessonData: Boolean(lesson.lesson),
  };

  const existingIdx = list.findIndex((item) => item.id === lesson.id);
  if (existingIdx >= 0) {
    list[existingIdx] = summary;
  } else {
    list.unshift(summary);
  }

  localStorage.setItem(STORAGE_KEYS.LESSONS_INDEX, JSON.stringify(list));
}

export function saveLessonToStorage(lesson: SavedLesson): SavedLesson {
  try {
    const updatedLesson = {
      ...lesson,
      schemaVersion: STORAGE_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.LESSON_PREFIX + lesson.id, JSON.stringify(updatedLesson));
    updateLessonsIndex(updatedLesson);
    localStorage.setItem(STORAGE_KEYS.CURRENT_ID, lesson.id);
    return updatedLesson;
  } catch (error) {
    reportStorageError('Failed to save lesson to localStorage.', error);
    return lesson;
  }
}

export function loadLessonFromStorage(id: string): SavedLesson | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LESSON_PREFIX + id);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.id !== id ||
      typeof parsed.title !== 'string' ||
      typeof parsed.learningObjective !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.updatedAt !== 'string' ||
      (parsed.schemaVersion !== undefined && parsed.schemaVersion !== STORAGE_SCHEMA_VERSION) ||
      (parsed.lesson !== undefined && !isLessonData(parsed.lesson))
    ) {
      throw new Error(`Saved lesson ${id} has an unsupported or invalid structure.`);
    }
    const migrated: SavedLesson = {
      ...parsed,
      schemaVersion: STORAGE_SCHEMA_VERSION,
      pipelineState: normalizePipelineState(parsed.pipelineState),
      versions: Array.isArray(parsed.versions) ? parsed.versions.filter(isLessonVersion) : [],
      hasInstructorEdits: Boolean(parsed.hasInstructorEdits),
      qcLayer1: normalizeQCReport(parsed.qcLayer1, 'factual_accuracy'),
      qcLayer2: normalizeQCReport(parsed.qcLayer2, 'instructional_quality'),
    } as SavedLesson;
    if (parsed.schemaVersion !== STORAGE_SCHEMA_VERSION) {
      try {
        localStorage.setItem(STORAGE_KEYS.LESSON_PREFIX + id, JSON.stringify(migrated));
      } catch (error) {
        reportStorageError(`Could not migrate lesson ${id} in localStorage.`, error);
      }
    }
    return migrated;
  } catch (error) {
    reportStorageError(`Failed to load lesson ${id} from localStorage.`, error);
    return null;
  }
}

export function loadCurrentLesson(): SavedLesson {
  let currentId: string | null = null;
  try {
    currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_ID);
  } catch (error) {
    reportStorageError('Could not read the current lesson ID from localStorage.', error);
  }
  if (currentId) {
    const existing = loadLessonFromStorage(currentId);
    if (existing) return existing;
  }

  // Check if any lessons exist in index
  const index = getSavedLessonsIndex();
  if (index.length > 0) {
    const first = loadLessonFromStorage(index[0].id);
    if (first) return first;
  }

  // Create default new lesson
  const fresh = createEmptySavedLesson();
  saveLessonToStorage(fresh);
  return fresh;
}

export function deleteLessonFromStorage(id: string): SavedLesson {
  try {
    localStorage.removeItem(STORAGE_KEYS.LESSON_PREFIX + id);
    const index = getSavedLessonsIndex().filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.LESSONS_INDEX, JSON.stringify(index));

    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_ID);
    if (currentId === id) {
      if (index.length > 0) {
        const next = loadLessonFromStorage(index[0].id);
        if (next) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_ID, next.id);
          return next;
        }
      }
      const fresh = createEmptySavedLesson();
      saveLessonToStorage(fresh);
      return fresh;
    }
    return loadCurrentLesson();
  } catch (error) {
    reportStorageError('Failed to delete lesson from localStorage.', error);
    return loadCurrentLesson();
  }
}

/**
 * Push snapshot of current lesson data to version history (keeping max 5)
 */
export function recordLessonVersion(
  lessonRecord: SavedLesson,
  label: string,
  lessonDataToSnapshot?: LessonData
): SavedLesson {
  const data = lessonDataToSnapshot || lessonRecord.lesson;
  if (!data) return lessonRecord;

  const version: LessonVersion = {
    id: `ver_${Date.now()}`,
    timestamp: new Date().toISOString(),
    label,
    lesson: JSON.parse(JSON.stringify(data)),
  };

  const updatedVersions = [version, ...(lessonRecord.versions || [])].slice(
    0,
    PIPELINE_CONFIG.MAX_VERSIONS_STORED
  );

  const updatedRecord: SavedLesson = {
    ...lessonRecord,
    versions: updatedVersions,
  };

  saveLessonToStorage(updatedRecord);
  return updatedRecord;
}
