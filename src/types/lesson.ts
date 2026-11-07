/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SourceType = 'book' | 'website' | 'youtube';

export interface GroundingSource {
  id: string;
  index: number;
  title: string;
  url: string;
  type: SourceType;
  claim: string;
  channelOrAuthor?: string;
  notes?: string;
}

export interface YouTubeRecommendation {
  title: string;
  channel: string;
  url: string;
  relevance: string;
  supportedSection: string;
}

export interface KnowledgeCheckQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface LessonSection {
  id: string;
  title: string;
  minutes: number;
  content: string; // Markdown supported
}

export interface LessonData {
  title: string;
  learningObjective: string;
  totalMinutes: number;
  durationMinutes?: number;
  language?: 'English' | 'Hindi';
  gradeLevel?: string;
  classroomSetting?: string;
  sections: {
    introduction: LessonSection;
    coreConcepts: LessonSection;
    workedExamples: LessonSection;
    practicalApplications: LessonSection;
    handsOnActivity: LessonSection;
    knowledgeCheck: {
      id: string;
      title: string;
      minutes: number;
      questions: KnowledgeCheckQuestion[];
    };
    summary: LessonSection;
  };
  recommendedVideos: YouTubeRecommendation[];
  references: GroundingSource[];
}

export type QCSeverity = 'High' | 'Medium' | 'Low';
export type QCIssueStatus = 'pending' | 'applied' | 'dismissed';

export interface QCIssue {
  id: string;
  severity: QCSeverity;
  location: string;
  description: string;
  evidence: string;
  suggestedFix: string;
  status: QCIssueStatus;
  appliedDiff?: {
    originalText: string;
    rewrittenText: string;
    appliedAt: string;
  };
}

export interface QCReport {
  overallScore: number; // 0 - 100
  summary: string;
  issues: QCIssue[];
  evaluatedAt: string;
  layer: 'factual_accuracy' | 'instructional_quality';
}

export type StepStatus = 'idle' | 'running' | 'success' | 'failed';

export interface PipelineStepState {
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface PipelineState {
  research: PipelineStepState;
  generate: PipelineStepState;
  qc1: PipelineStepState;
  qc2: PipelineStepState;
}

export interface LessonVersion {
  id: string;
  timestamp: string;
  label: string;
  lesson: LessonData;
}

export interface QuestProgress {
  version: number;
  completedNodeIds: string[];
  activeNodeId?: string;
  freeExplore: boolean;
  mode: 'learner' | 'instructor';
  quizAnswers: Record<string, string>;
  quizScore: number;
  activityTickedSteps: Record<string, boolean>;
  startedAt?: string;
  finishedAt?: string;
}

export interface SavedLesson {
  schemaVersion?: number;
  id: string;
  title: string;
  learningObjective: string;
  durationMinutes?: number;
  language?: 'English' | 'Hindi';
  gradeLevel?: string;
  classroomSetting?: string;
  createdAt: string;
  updatedAt: string;
  pipelineState: PipelineState;
  researchText?: string;
  researchGrounded?: boolean;
  rawSources?: GroundingSource[];
  lesson?: LessonData;
  qcLayer1?: QCReport;
  qcLayer2?: QCReport;
  versions: LessonVersion[];
  hasInstructorEdits?: boolean;
  questProgress?: QuestProgress;
}
