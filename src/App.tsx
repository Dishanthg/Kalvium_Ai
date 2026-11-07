/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Header,
} from './components/Header.tsx';
import {
  LessonInputForm,
  SAMPLE_LESSON,
} from './components/LessonInputForm.tsx';
import { PipelineProgress } from './components/PipelineProgress.tsx';
import { LessonEditor } from './components/LessonEditor.tsx';
import { QCReportsView } from './components/QCReportsView.tsx';
import { LessonPreview } from './components/LessonPreview.tsx';
import { DiffModal } from './components/DiffModal.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { VersionHistoryModal } from './components/VersionHistoryModal.tsx';
import { SavedLessonsModal } from './components/SavedLessonsModal.tsx';
import { ConfirmOverwriteModal } from './components/ConfirmOverwriteModal.tsx';
import {
  SavedLesson,
  LessonData,
  QCIssue,
  LessonVersion,
  PipelineState,
  KnowledgeCheckQuestion,
} from './types/lesson.ts';
import {
  loadCurrentLesson,
  saveLessonToStorage,
  getSavedLessonsIndex,
  deleteLessonFromStorage,
  createEmptySavedLesson,
  recordLessonVersion,
  loadLessonFromStorage,
  loadQuestProgress,
  LessonSummary,
} from './services/storageService.ts';
import {
  checkServerHealth,
  requestResearch,
  requestLessonGeneration,
  requestQCFactual,
  requestQCPedagogical,
  requestApplySuggestion,
} from './services/apiClient.ts';
import { QuestMap } from './components/QuestMap.tsx';
import {
  Download,
  Eye,
  Edit3,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  Compass,
} from 'lucide-react';
import { Button } from './components/Button.tsx';

export default function App() {
  // Main Lesson State
  const [currentLesson, setCurrentLesson] = useState<SavedLesson>(() => loadCurrentLesson());
  const [savedLessonsList, setSavedLessonsList] = useState<LessonSummary[]>(() => getSavedLessonsIndex());

  // Dark Mode Theme State (Default: Dark theme)
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('app-theme-dark');
      if (saved !== null) return saved === 'true';
      return true; // Default Dark theme
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      return true;
    }
  });

  // Sync dark class on document element
  useEffect(() => {
    try {
      localStorage.setItem('app-theme-dark', isDark ? 'true' : 'false');
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, [isDark]);

  // Workspace View Tab (Default: Quest Map)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'quest' | 'preview' | 'editor' | 'qc'>('quest');

  // Modals
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isSavedLessonsOpen, setIsSavedLessonsOpen] = useState(false);
  const [isConfirmOverwriteOpen, setIsConfirmOverwriteOpen] = useState(false);
  const [pendingOverwriteAction, setPendingOverwriteAction] = useState<(() => void) | null>(null);

  // Diff Modal State
  const [diffModalState, setDiffModalState] = useState<{
    isOpen: boolean;
    issue: QCIssue | null;
    sectionKey: string;
    originalText: string;
    rewrittenText: string;
    layer: 'qc1' | 'qc2';
  }>({
    isOpen: false,
    issue: null,
    sectionKey: '',
    originalText: '',
    rewrittenText: '',
    layer: 'qc1',
  });

  // UI Processing States
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const pipelineRunRef = useRef(false);
  const [applyingIssueId, setApplyingIssueId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const getStepErrorMessage = (stepName: string, error: unknown): string => {
    const message = error instanceof Error ? error.message : String(error);
    if (/hit OpenRouter's quota or rate limit/i.test(message)) return message;
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? Number(error.status)
        : undefined;
    if (status === 429 || /429|resource_exhausted|quota|rate.?limit/i.test(message)) {
      return `${stepName} hit OpenRouter's quota or rate limit. Wait, then press Retry. Your saved lesson and completed work are preserved. Details: ${message}`;
    }
    return message;
  };
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const handleStorageError = (event: Event) => {
      const { detail } = event as CustomEvent<string>;
      setGlobalError(detail);
    };
    window.addEventListener('ailc-storage-error', handleStorageError);
    return () => window.removeEventListener('ailc-storage-error', handleStorageError);
  }, []);

  // Sync index list
  const refreshLessonsList = useCallback(() => {
    setSavedLessonsList(getSavedLessonsIndex());
  }, []);

  // Check server health and API key on mount
  useEffect(() => {
    checkServerHealth()
      .then((health) => {
        setHasApiKey(health.hasApiKey);
      })
      .catch((err) => {
        console.error('Server health check failed:', err);
        setHasApiKey(false);
      });
  }, []);

  // Helper to update & persist current lesson
  const updateCurrentLesson = (
    patch: Omit<Partial<SavedLesson>, 'pipelineState'> & { pipelineState?: Partial<PipelineState> },
    recordHistoryLabel?: string
  ) => {
    setCurrentLesson((prev) => {
      let updated: SavedLesson = {
        ...prev,
        ...patch,
        pipelineState: patch.pipelineState
          ? { ...prev.pipelineState, ...patch.pipelineState }
          : prev.pipelineState,
      };

      if (recordHistoryLabel && updated.lesson) {
        updated = recordLessonVersion(updated, recordHistoryLabel, updated.lesson);
      } else {
        updated = saveLessonToStorage(updated);
      }
      refreshLessonsList();
      return updated;
    });
  };

  // Helper to map issue location to section key
  const mapLocationToSectionKey = (location: string): keyof LessonData['sections'] => {
    const loc = (location || '').toLowerCase();
    if (loc.includes('intro')) return 'introduction';
    if (loc.includes('concept') || loc.includes('theory')) return 'coreConcepts';
    if (loc.includes('example') || loc.includes('worked')) return 'workedExamples';
    if (loc.includes('app') || loc.includes('practical')) return 'practicalApplications';
    if (loc.includes('activity') || loc.includes('hand')) return 'handsOnActivity';
    if (loc.includes('check') || loc.includes('quiz') || loc.includes('question')) return 'knowledgeCheck';
    return 'summary';
  };

  const isTextSectionKey = (
    key: string
  ): key is Exclude<keyof LessonData['sections'], 'knowledgeCheck'> =>
    ['introduction', 'coreConcepts', 'workedExamples', 'practicalApplications', 'handsOnActivity', 'summary'].includes(key);

  const isKnowledgeCheckQuestion = (value: unknown): value is KnowledgeCheckQuestion =>
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'question' in value &&
    typeof value.question === 'string' &&
    'correctAnswer' in value &&
    typeof value.correctAnswer === 'string' &&
    'explanation' in value &&
    typeof value.explanation === 'string' &&
    (!('options' in value) ||
      value.options === undefined ||
      (Array.isArray(value.options) && value.options.every((option) => typeof option === 'string')));

  // Handle inputs modification
  const handleUpdateInputs = (
    title: string,
    objective: string,
    language: 'English' | 'Hindi',
    grade: string,
    durationMinutes: number
  ) => {
    updateCurrentLesson({
      title,
      learningObjective: objective,
      language,
      gradeLevel: grade,
      durationMinutes,
    });
  };

  // Switch to or create new lesson
  const handleCreateNewLesson = () => {
    const fresh = createEmptySavedLesson();
    saveLessonToStorage(fresh);
    setCurrentLesson(fresh);
    refreshLessonsList();
    setActiveWorkspaceTab('editor');
  };

  const handleOpenSavedLesson = (id: string) => {
    const loaded = loadLessonFromStorage(id);
    if (loaded) {
      setCurrentLesson(loaded);
      setActiveWorkspaceTab(loaded.lesson ? 'preview' : 'editor');
    }
  };

  const handleDeleteSavedLesson = (id: string) => {
    const nextLesson = deleteLessonFromStorage(id);
    setCurrentLesson(nextLesson);
    refreshLessonsList();
  };

  const handleLoadSample = () => {
    updateCurrentLesson({
      title: SAMPLE_LESSON.title,
      learningObjective: SAMPLE_LESSON.objective,
    });
  };

  // Save manual instructor edits
  const handleSaveLessonEdits = (updatedLesson: LessonData) => {
    updateCurrentLesson(
      {
        lesson: updatedLesson,
        hasInstructorEdits: true,
      },
      'Manual Instructor Edit'
    );
  };

  // Restore snapshot version
  const handleRestoreVersion = (version: LessonVersion) => {
    updateCurrentLesson(
      {
        lesson: JSON.parse(JSON.stringify(version.lesson)),
      },
      `Restored: ${version.label}`
    );
    setIsVersionsOpen(false);
  };

  // Dismiss a QC issue
  const handleDismissQCIssue = (issueId: string, layer: 'qc1' | 'qc2') => {
    const reportKey = layer === 'qc1' ? 'qcLayer1' : 'qcLayer2';
    const report = currentLesson[reportKey];
    if (!report) return;

    const updatedIssues = report.issues.map((i) =>
      i.id === issueId ? { ...i, status: 'dismissed' as const } : i
    );

    updateCurrentLesson({
      [reportKey]: {
        ...report,
        issues: updatedIssues,
      },
    });
  };

  // Manual Edit button from QC
  const handleEditManually = (location: string) => {
    setActiveWorkspaceTab('editor');
    const secKey = mapLocationToSectionKey(location);
    setTimeout(() => {
      const el = document.getElementById(`editor-section-${secKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-indigo-400');
        setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-400'), 2500);
      }
    }, 150);
  };

  // Apply QC Suggestion: calls fast rewrite API & triggers Diff Modal
  const handleApplySuggestion = async (issue: QCIssue, layer: 'qc1' | 'qc2') => {
    if (!currentLesson.lesson) return;
    const secKey = mapLocationToSectionKey(issue.location);
    let contentToRewrite = '';
    let sectionTitle = issue.location;

    if (secKey === 'knowledgeCheck') {
      contentToRewrite = JSON.stringify(currentLesson.lesson.sections.knowledgeCheck.questions, null, 2);
    } else {
      const section = currentLesson.lesson.sections[secKey];
      contentToRewrite = section.content;
      sectionTitle = section.title || issue.location;
    }

    try {
      setApplyingIssueId(issue.id);
      setGlobalError(null);

      const rewriteResult = await requestApplySuggestion({
        sectionTitle,
        currentContent: contentToRewrite,
        issueDescription: issue.description,
        suggestedFix: issue.suggestedFix,
        learningObjective: currentLesson.learningObjective,
      });

      setDiffModalState({
        isOpen: true,
        issue,
        sectionKey: secKey,
        originalText: rewriteResult.originalText,
        rewrittenText: rewriteResult.rewrittenText,
        layer,
      });
    } catch (err: any) {
      console.error('Failed to rewrite section:', err);
      setGlobalError(`Section rewrite failed: ${err.message}`);
    } finally {
      setApplyingIssueId(null);
    }
  };

  // Accept rewrite from Diff Modal
  const handleAcceptDiffRewrite = (sectionKey: string, rewrittenText: string, issueId: string) => {
    if (!currentLesson.lesson) return;

    const updatedLesson = JSON.parse(JSON.stringify(currentLesson.lesson)) as LessonData;

    if (sectionKey === 'knowledgeCheck') {
      try {
        const parsedQuestions: unknown = JSON.parse(rewrittenText);
        if (!Array.isArray(parsedQuestions) || !parsedQuestions.every(isKnowledgeCheckQuestion)) {
          throw new Error('The rewritten questions do not match the lesson question format.');
        }
        updatedLesson.sections.knowledgeCheck.questions = parsedQuestions;
      } catch (error) {
        console.error('Could not apply knowledge check rewrite:', error);
        setGlobalError('The rewritten knowledge check was invalid and has not been applied. Retry the suggestion.');
        return;
      }
    } else if (isTextSectionKey(sectionKey)) {
      updatedLesson.sections[sectionKey].content = rewrittenText;
    } else {
      setGlobalError('The selected lesson section is invalid; the suggestion was not applied.');
      return;
    }

    // Mark issue as applied
    const reportKey = diffModalState.layer === 'qc1' ? 'qcLayer1' : 'qcLayer2';
    const report = currentLesson[reportKey];
    const updatedReport = report
      ? {
          ...report,
          issues: report.issues.map((i) =>
            i.id === issueId
              ? {
                  ...i,
                  status: 'applied' as const,
                  appliedDiff: {
                    originalText: diffModalState.originalText,
                    rewrittenText,
                    appliedAt: new Date().toISOString(),
                  },
                }
              : i
          ),
        }
      : undefined;

    updateCurrentLesson(
      {
        lesson: updatedLesson,
        [reportKey]: updatedReport,
        hasInstructorEdits: true,
      },
      `QC Suggestion Applied: ${diffModalState.issue?.location}`
    );

    setDiffModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // ==========================================
  // Pipeline Step Executions (Individual & Full)
  // ==========================================

  // Step A: Research
  const executeResearchStep = async (
    title: string,
    objective: string,
    language = 'English',
    gradeLevel = 'University',
    durationMinutes = 45
  ): Promise<any> => {
    updateCurrentLesson({
      pipelineState: { research: { status: 'running', startedAt: new Date().toISOString() } },
    });

    try {
      const result = await requestResearch(title, objective, language, gradeLevel, durationMinutes);
      updateCurrentLesson({
        researchText: result.researchText,
        researchGrounded: result.isGrounded,
        rawSources: result.sources,
        pipelineState: { research: { status: 'success', completedAt: new Date().toISOString() } },
      });
      return result;
    } catch (err: any) {
      const errorMessage = getStepErrorMessage('Research', err);
      updateCurrentLesson({
        pipelineState: {
          research: {
            status: 'failed',
            completedAt: new Date().toISOString(),
            errorMessage,
          },
        },
      });
      throw new Error(errorMessage);
    }
  };

  // Step B: Generate Lesson
  const executeGenerateStep = async (
    title: string,
    objective: string,
    researchText: string,
    sources: any[],
    language = 'English',
    gradeLevel = 'University',
    durationMinutes = 45
  ): Promise<any> => {
    updateCurrentLesson({
      pipelineState: { generate: { status: 'running', startedAt: new Date().toISOString() } },
    });

    try {
      const result = await requestLessonGeneration(
        title,
        objective,
        researchText,
        sources,
        language,
        gradeLevel,
        durationMinutes
      );
      updateCurrentLesson(
        {
          lesson: result.lesson,
          hasInstructorEdits: false,
          pipelineState: { generate: { status: 'success', completedAt: new Date().toISOString() } },
        },
        'Initial AI Generation'
      );
      return result;
    } catch (err: any) {
      const errorMessage = getStepErrorMessage('Lesson generation', err);
      updateCurrentLesson({
        pipelineState: {
          generate: {
            status: 'failed',
            completedAt: new Date().toISOString(),
            errorMessage,
          },
        },
      });
      throw new Error(errorMessage);
    }
  };

  // Step C: QC Layer 1 (Factual Accuracy)
  const executeQC1Step = async (lessonData: LessonData, language = 'English'): Promise<any> => {
    updateCurrentLesson({
      pipelineState: { qc1: { status: 'running', startedAt: new Date().toISOString() } },
    });

    try {
      const result = await requestQCFactual(lessonData, language);
      updateCurrentLesson({
        qcLayer1: result.report,
        pipelineState: { qc1: { status: 'success', completedAt: new Date().toISOString() } },
      });
      return result;
    } catch (err: any) {
      const errorMessage = getStepErrorMessage('QC Layer 1 (Accuracy)', err);
      updateCurrentLesson({
        pipelineState: {
          qc1: {
            status: 'failed',
            completedAt: new Date().toISOString(),
            errorMessage,
          },
        },
      });
      throw new Error(errorMessage);
    }
  };

  // Step D: QC Layer 2 (Instructional Quality)
  const executeQC2Step = async (lessonData: LessonData, language = 'English'): Promise<any> => {
    updateCurrentLesson({
      pipelineState: { qc2: { status: 'running', startedAt: new Date().toISOString() } },
    });

    try {
      const result = await requestQCPedagogical(lessonData, language);
      updateCurrentLesson({
        qcLayer2: result.report,
        pipelineState: { qc2: { status: 'success', completedAt: new Date().toISOString() } },
      });
      return result;
    } catch (err: any) {
      const errorMessage = getStepErrorMessage('QC Layer 2 (Pedagogy)', err);
      updateCurrentLesson({
        pipelineState: {
          qc2: {
            status: 'failed',
            completedAt: new Date().toISOString(),
            errorMessage,
          },
        },
      });
      throw new Error(errorMessage);
    }
  };

  const waitBetweenPipelineSteps = () =>
    new Promise((resolve) => setTimeout(resolve, 1000));

  // Full Pipeline Execution
  const runFullPipeline = async (
    title: string,
    objective: string,
    language: 'English' | 'Hindi' = 'English',
    grade: string = 'University',
    durationMinutes: number = 45
  ) => {
    setGlobalError(null);
    setIsRunningPipeline(true);

    try {
      // 1. Step A: Research
      const researchRes = await executeResearchStep(title, objective, language, grade, durationMinutes);
      await waitBetweenPipelineSteps();

      // 2. Step B: Generate
      const genRes = await executeGenerateStep(
        title,
        objective,
        researchRes.researchText,
        researchRes.sources,
        language,
        grade,
        durationMinutes
      );
      await waitBetweenPipelineSteps();

      // 3. Run QC layers sequentially to limit concurrent API requests.
      await executeQC1Step(genRes.lesson, language);
      await waitBetweenPipelineSteps();
      await executeQC2Step(genRes.lesson, language);

      setActiveWorkspaceTab('quest');
    } catch (err: any) {
      console.error('Pipeline execution stopped:', err);
      setGlobalError(err.message || 'Pipeline failed during execution.');
    } finally {
      setIsRunningPipeline(false);
      pipelineRunRef.current = false;
    }
  };

  // Wrapper check for instructor edits before overwriting
  const initiateFullPipeline = (
    title: string,
    objective: string,
    language: 'English' | 'Hindi' = 'English',
    grade: string = 'University',
    durationMinutes: number = 45
  ) => {
    if (pipelineRunRef.current) return;
    pipelineRunRef.current = true;
    if (currentLesson.hasInstructorEdits && currentLesson.lesson) {
      setPendingOverwriteAction(() => () => runFullPipeline(title, objective, language, grade, durationMinutes));
      setIsConfirmOverwriteOpen(true);
    } else {
      runFullPipeline(title, objective, language, grade, durationMinutes);
    }
  };

  // Individual Step Retry
  const handleRetryStep = async (stepKey: 'research' | 'generate' | 'qc1' | 'qc2') => {
    if (pipelineRunRef.current) return;
    pipelineRunRef.current = true;
    setGlobalError(null);
    setIsRunningPipeline(true);

    const lang = currentLesson.language || 'English';
    const grade = currentLesson.gradeLevel || 'University';
    const duration = currentLesson.durationMinutes || currentLesson.lesson?.totalMinutes || 45;

    try {
      if (stepKey === 'research') {
        await executeResearchStep(currentLesson.title, currentLesson.learningObjective, lang, grade, duration);
      } else if (stepKey === 'generate') {
        const researchText = currentLesson.researchText || '';
        const sources = currentLesson.rawSources || [];
        await executeGenerateStep(
          currentLesson.title,
          currentLesson.learningObjective,
          researchText,
          sources,
          lang,
          grade,
          duration
        );
      } else if (stepKey === 'qc1') {
        if (!currentLesson.lesson) {
          throw new Error('Please generate the lesson before running QC 1.');
        }
        await executeQC1Step(currentLesson.lesson, lang);
      } else if (stepKey === 'qc2') {
        if (!currentLesson.lesson) {
          throw new Error('Please generate the lesson before running QC 2.');
        }
        await executeQC2Step(currentLesson.lesson, lang);
      }
    } catch (err: any) {
      console.error(`Retry step ${stepKey} failed:`, err);
      setGlobalError(getStepErrorMessage(stepKey, err));
    } finally {
      setIsRunningPipeline(false);
      pipelineRunRef.current = false;
    }
  };

  // Compute live section minutes sum
  const sumSectionMinutes = currentLesson.lesson
    ? (currentLesson.lesson.sections.introduction?.minutes || 0) +
      (currentLesson.lesson.sections.coreConcepts?.minutes || 0) +
      (currentLesson.lesson.sections.workedExamples?.minutes || 0) +
      (currentLesson.lesson.sections.practicalApplications?.minutes || 0) +
      (currentLesson.lesson.sections.handsOnActivity?.minutes || 0) +
      (currentLesson.lesson.sections.knowledgeCheck?.minutes || 0) +
      (currentLesson.lesson.sections.summary?.minutes || 0)
    : 0;

  const plannedDurationMinutes =
    currentLesson.durationMinutes || currentLesson.lesson?.totalMinutes || 45;
  const hasTimeBudgetMismatch =
    !!currentLesson.lesson && sumSectionMinutes !== plannedDurationMinutes;

  // Retrieve quest progress for export if present
  const currentQuestProgress = loadQuestProgress(currentLesson.id);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans transition-colors duration-150">
      {/* Top Header */}
      <Header
        onNewLesson={handleCreateNewLesson}
        onOpenSavedModal={() => setIsSavedLessonsOpen(true)}
        onLoadSample={handleLoadSample}
        activeLessonTitle={currentLesson.title}
        hasApiKey={hasApiKey}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6 w-full">
        {/* Global Error Notice if any */}
        {globalError && (
          <div className="p-4 rounded-[10px] bg-[var(--red-soft)] border border-[var(--red)] text-[var(--red)] text-[13px] flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Execution Warning</p>
              <p className="mt-0.5">{globalError}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setGlobalError(null)}
            >
              <span>Dismiss</span>
            </Button>
          </div>
        )}

        {/* Input Specifications Form */}
        <LessonInputForm
          initialTitle={currentLesson.title}
          initialObjective={currentLesson.learningObjective}
          initialLanguage={currentLesson.language || 'English'}
          initialGrade={currentLesson.gradeLevel || 'University'}
          initialDurationMinutes={currentLesson.durationMinutes || currentLesson.lesson?.totalMinutes || 45}
          isRunning={isRunningPipeline}
          hasApiKey={hasApiKey}
          onRunPipeline={initiateFullPipeline}
          onUpdateInputs={handleUpdateInputs}
        />

        {/* Visible Pipeline Progress UI */}
        <PipelineProgress
          pipelineState={currentLesson.pipelineState}
          rawSources={currentLesson.rawSources}
          researchGrounded={currentLesson.researchGrounded}
          qc1Report={currentLesson.qcLayer1}
          qc2Report={currentLesson.qcLayer2}
          onRetryStep={handleRetryStep}
          isRunning={isRunningPipeline}
        />

        {/* Main Work Area (Only visible when lesson exists or generated) */}
        {currentLesson.lesson ? (
          <div className="space-y-4">
            {/* View Selection & Action Bar with underline style tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-0">
              <div className="flex items-center space-x-6 overflow-x-auto">
                {/* 1. Quest Map Tab (Underline Style per spec) */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('quest')}
                  className={`inline-flex items-center space-x-2 py-3 text-[14px] font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeWorkspaceTab === 'quest'
                      ? 'border-[var(--green)] text-[var(--text)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Compass className="w-4 h-4 text-[var(--green)]" />
                  <span>Quest Map</span>
                </button>

                {/* 2. Linear Preview Tab */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('preview')}
                  className={`inline-flex items-center space-x-2 py-3 text-[14px] font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeWorkspaceTab === 'preview'
                      ? 'border-[var(--green)] text-[var(--text)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Linear Preview</span>
                </button>

                {/* 3. Instructor Editor Tab */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('editor')}
                  className={`inline-flex items-center space-x-2 py-3 text-[14px] font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeWorkspaceTab === 'editor'
                      ? 'border-[var(--green)] text-[var(--text)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Instructor Editor</span>
                  {currentLesson.hasInstructorEdits && (
                    <span className="w-2 h-2 rounded-full bg-[var(--amber)]"></span>
                  )}
                </button>

                {/* 4. QC Audits Tab */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('qc')}
                  className={`inline-flex items-center space-x-2 py-3 text-[14px] font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeWorkspaceTab === 'qc'
                      ? 'border-[var(--green)] text-[var(--text)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>QC Audits</span>
                  {(currentLesson.qcLayer1 || currentLesson.qcLayer2) && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
                      {(currentLesson.qcLayer1?.issues.length || 0) +
                        (currentLesson.qcLayer2?.issues.length || 0)}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center space-x-3 pb-2 sm:pb-0">
                {/* Time Budget Mismatch Warning Chip if any */}
                {hasTimeBudgetMismatch && (
                  <span
                    title={`Section minutes sum to ${sumSectionMinutes}m, which differs from planned ${plannedDurationMinutes}m`}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[6px] text-[12px] font-mono font-medium bg-[var(--amber-soft)] text-[var(--amber)] border border-[var(--amber)]"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Time Mismatch: {sumSectionMinutes}m / {plannedDurationMinutes}m</span>
                  </span>
                )}

                {/* Inverse Button per spec: dark = white bg + black text; light = black bg + white text */}
                <Button
                  variant="inverse"
                  size="sm"
                  onClick={() => setIsExportOpen(true)}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  <span>Export & Download</span>
                </Button>
              </div>
            </div>

            {/* Active Workspace View */}
            {activeWorkspaceTab === 'quest' && (
              <QuestMap
                key={currentLesson.id}
                lesson={currentLesson.lesson}
                lessonId={currentLesson.id}
                qc1Report={currentLesson.qcLayer1}
                qc2Report={currentLesson.qcLayer2}
                onJumpToEditor={handleEditManually}
                onOpenExport={() => setIsExportOpen(true)}
                onOpenQCReport={() => setActiveWorkspaceTab('qc')}
              />
            )}

            {activeWorkspaceTab === 'preview' && (
              <LessonPreview lesson={currentLesson.lesson} />
            )}

            {activeWorkspaceTab === 'editor' && (
              <LessonEditor
                lesson={currentLesson.lesson}
                onSaveLesson={handleSaveLessonEdits}
                onOpenVersionHistory={() => setIsVersionsOpen(true)}
                hasUnsavedChanges={currentLesson.hasInstructorEdits}
              />
            )}

            {activeWorkspaceTab === 'qc' && (
              <QCReportsView
                qc1Report={currentLesson.qcLayer1}
                qc2Report={currentLesson.qcLayer2}
                onApplySuggestion={handleApplySuggestion}
                onDismissIssue={handleDismissQCIssue}
                onEditManually={handleEditManually}
                applyingIssueId={applyingIssueId}
              />
            )}
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] p-12 text-center transition-colors">
            <div className="w-14 h-14 rounded-[10px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center mx-auto mb-4">
              <Compass className="w-7 h-7" />
            </div>
            <h3 className="text-[20px] font-semibold text-[var(--text)] tracking-tight">
              Ready to Formulate Your Lesson Quest
            </h3>
            <p className="text-[14px] text-[var(--text-muted)] max-w-md mx-auto mt-1 leading-[1.65]">
              Describe your topic or learning objective above, select your grade and duration, then click <strong className="text-[var(--text)]">Generate</strong> to build your search-grounded curriculum and interactive Quest Map.
            </p>

            {/* Friendly Skeleton preview lines */}
            <div className="mt-8 max-w-md mx-auto space-y-2 pt-6 border-t border-[var(--border)] opacity-30">
              <div className="h-2.5 bg-[var(--surface-2)] rounded-full w-3/4 mx-auto animate-pulse" />
              <div className="h-2.5 bg-[var(--surface-2)] rounded-full w-1/2 mx-auto animate-pulse" />
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        lesson={currentLesson.lesson!}
        qc1={currentLesson.qcLayer1}
        qc2={currentLesson.qcLayer2}
        questProgress={currentQuestProgress}
      />

      <VersionHistoryModal
        isOpen={isVersionsOpen}
        onClose={() => setIsVersionsOpen(false)}
        versions={currentLesson.versions || []}
        onRestoreVersion={handleRestoreVersion}
      />

      <SavedLessonsModal
        isOpen={isSavedLessonsOpen}
        onClose={() => setIsSavedLessonsOpen(false)}
        lessons={savedLessonsList}
        currentLessonId={currentLesson.id}
        onOpenLesson={handleOpenSavedLesson}
        onDeleteLesson={handleDeleteSavedLesson}
        onCreateNew={handleCreateNewLesson}
      />

      <ConfirmOverwriteModal
        isOpen={isConfirmOverwriteOpen}
        onClose={() => {
          setIsConfirmOverwriteOpen(false);
          setPendingOverwriteAction(null);
          pipelineRunRef.current = false;
        }}
        onConfirm={() => {
          if (pendingOverwriteAction) {
            // Save backup snapshot before overwriting
            if (currentLesson.lesson) {
              recordLessonVersion(currentLesson, 'Backup Before AI Regeneration');
            }
            pendingOverwriteAction();
            setPendingOverwriteAction(null);
          }
          setIsConfirmOverwriteOpen(false);
        }}
        actionName="Full Pipeline AI Generation"
      />

      <DiffModal
        isOpen={diffModalState.isOpen}
        onClose={() => setDiffModalState((prev) => ({ ...prev, isOpen: false }))}
        onAccept={handleAcceptDiffRewrite}
        issue={diffModalState.issue}
        sectionKey={diffModalState.sectionKey}
        originalText={diffModalState.originalText}
        rewrittenText={diffModalState.rewrittenText}
      />
    </div>
  );
}
