/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Save,
  Clock,
  History,
  Check,
  Video,
  ExternalLink,
  Edit3,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';
import { LessonData, KnowledgeCheckQuestion, YouTubeRecommendation } from '../types/lesson.ts';
import { Button } from './Button.tsx';

interface LessonEditorProps {
  lesson: LessonData;
  onSaveLesson: (updated: LessonData) => void;
  onOpenVersionHistory: () => void;
  hasUnsavedChanges?: boolean;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({
  lesson,
  onSaveLesson,
  onOpenVersionHistory,
}) => {
  const [draft, setDraft] = useState<LessonData>(() => JSON.parse(JSON.stringify(lesson)));
  const [activeTab, setActiveTab] = useState<'content' | 'quiz' | 'media' | 'references'>('content');
  const [previewMode, setPreviewMode] = useState<Record<string, boolean>>({});
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(lesson)));
  }, [lesson]);

  // Calculate live total minutes across all sections
  const totalMinutes =
    (draft.sections.introduction?.minutes || 0) +
    (draft.sections.coreConcepts?.minutes || 0) +
    (draft.sections.workedExamples?.minutes || 0) +
    (draft.sections.practicalApplications?.minutes || 0) +
    (draft.sections.handsOnActivity?.minutes || 0) +
    (draft.sections.knowledgeCheck?.minutes || 0) +
    (draft.sections.summary?.minutes || 0);

  const handleSectionTextChange = (sectionKey: keyof typeof draft.sections, newContent: string) => {
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          ...prev.sections[sectionKey],
          content: newContent,
        },
      },
    }));
  };

  const handleSectionMinutesChange = (sectionKey: keyof typeof draft.sections, minutesVal: number) => {
    const mins = Math.max(1, isNaN(minutesVal) ? 1 : minutesVal);
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          ...prev.sections[sectionKey],
          minutes: mins,
        },
      },
    }));
  };

  const handleSave = () => {
    const updated = {
      ...draft,
      totalMinutes,
    };
    onSaveLesson(updated);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const togglePreview = (id: string) => {
    setPreviewMode((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to edit quiz question
  const updateQuizQuestion = (idx: number, patch: Partial<KnowledgeCheckQuestion>) => {
    setDraft((prev) => {
      const questions = [...prev.sections.knowledgeCheck.questions];
      questions[idx] = { ...questions[idx], ...patch };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          knowledgeCheck: {
            ...prev.sections.knowledgeCheck,
            questions,
          },
        },
      };
    });
  };

  const addQuizQuestion = () => {
    const newQ: KnowledgeCheckQuestion = {
      id: `q-${Date.now()}`,
      question: 'New diagnostic question',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: 'Detailed explanation for the correct answer.',
    };
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        knowledgeCheck: {
          ...prev.sections.knowledgeCheck,
          questions: [...prev.sections.knowledgeCheck.questions, newQ],
        },
      },
    }));
  };

  const deleteQuizQuestion = (idx: number) => {
    setDraft((prev) => {
      const questions = prev.sections.knowledgeCheck.questions.filter((_, i) => i !== idx);
      return {
        ...prev,
        sections: {
          ...prev.sections,
          knowledgeCheck: {
            ...prev.sections.knowledgeCheck,
            questions,
          },
        },
      };
    });
  };

  const sectionsToRender = [
    {
      key: 'introduction' as const,
      label: '1. Introduction & Learning Objective',
      placeholder: 'Introduce topic context and state the clear learning objective.',
    },
    {
      key: 'coreConcepts' as const,
      label: '2. Core Concept Explanations',
      placeholder: 'Detailed technical explanations, specifications, definitions, and principles.',
    },
    {
      key: 'workedExamples' as const,
      label: '3. Worked Examples (Code / Real-world)',
      placeholder: 'Step-by-step worked demonstrations with concrete code or scenarios.',
    },
    {
      key: 'practicalApplications' as const,
      label: '4. Practical Applications',
      placeholder: 'Industry applications, architectures, and real-world implementation.',
    },
    {
      key: 'handsOnActivity' as const,
      label: '5. Hands-on Activity (5-min Exercise)',
      placeholder: 'Actionable learner task, coding exercise, or interactive analysis.',
    },
    {
      key: 'summary' as const,
      label: '7. Summary & Key Takeaways',
      placeholder: 'High-level synthesis and review of essential points.',
    },
  ];

  return (
    <div className="bg-[var(--surface)] text-[var(--text)] rounded-[10px] border border-[var(--border)] overflow-hidden transition-colors">
      {/* Top Header / Timing Banner */}
      <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--surface-2)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-[8px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center font-bold">
            <Edit3 className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">
              Instructor Lesson Editor
            </h3>
            <p className="text-[13px] text-[var(--text-muted)]">
              Customize section texts, calibrate time allocations, and update diagnostic questions.
            </p>
          </div>
        </div>

        {/* Live Timing Indicator */}
        <div className="flex items-center space-x-2.5">
          <div
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[8px] border text-[12px] font-mono font-medium ${
              totalMinutes === 45
                ? 'bg-[var(--green-soft)] text-[var(--green)] border-[var(--green)]'
                : 'bg-[var(--amber-soft)] text-[var(--amber)] border-[var(--amber)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              Total: {totalMinutes}m / 45m Target
            </span>
            {totalMinutes !== 45 && (
              <span className="opacity-80 ml-1">
                ({totalMinutes > 45 ? `+${totalMinutes - 45}m over` : `${45 - totalMinutes}m under`})
              </span>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenVersionHistory}
            icon={<History className="w-3.5 h-3.5" />}
          >
            <span>Versions</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            icon={saveSuccessNotice ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          >
            <span>{saveSuccessNotice ? 'Saved!' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs (Underline Style per spec) */}
      <div className="border-b border-[var(--border)] px-5 flex space-x-6 text-[14px]">
        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`py-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'content'
              ? 'border-[var(--green)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          Core Sections (6)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('quiz')}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'quiz'
              ? 'border-[var(--green)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <span>6. Knowledge Check</span>
          <span className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
            {draft.sections.knowledgeCheck.questions.length} Qs
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'media'
              ? 'border-[var(--green)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <span>Videos</span>
          <span className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
            {draft.recommendedVideos?.length || 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('references')}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'references'
              ? 'border-[var(--green)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <span>References</span>
          <span className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
            {draft.references?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab 1: Core Content Sections */}
      {activeTab === 'content' && (
        <div className="p-5 sm:p-6 space-y-6">
          {sectionsToRender.map((sec) => {
            const sectionData = draft.sections[sec.key];
            const isPreview = previewMode[sec.key] || false;

            return (
              <div
                key={sec.key}
                id={`editor-section-${sec.key}`}
                className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 transition-colors"
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-[var(--border)] gap-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-[14px] font-semibold text-[var(--text)]">{sec.label}</h4>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    {/* Time budget input */}
                    <div className="flex items-center space-x-1.5 text-[12px] font-mono bg-[var(--surface-2)] px-2.5 py-1 rounded-[6px] border border-[var(--border)]">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span className="text-[var(--text-muted)]">Budget:</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={sectionData.minutes}
                        onChange={(e) => handleSectionMinutesChange(sec.key, parseInt(e.target.value, 10))}
                        className="w-12 text-center text-[12px] font-mono font-semibold bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded px-1 py-0.5"
                      />
                      <span className="text-[var(--text-muted)]">min</span>
                    </div>

                    {/* Preview / Edit toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePreview(sec.key)}
                      icon={isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    >
                      <span>{isPreview ? 'Edit' : 'Preview'}</span>
                    </Button>
                  </div>
                </div>

                {/* Section Content */}
                {isPreview ? (
                  <div className="p-4 rounded-[8px] bg-[var(--surface-2)] text-[14px] text-[var(--text)] whitespace-pre-wrap leading-relaxed border border-[var(--border)]">
                    {sectionData.content}
                  </div>
                ) : (
                  <textarea
                    rows={6}
                    value={sectionData.content}
                    onChange={(e) => handleSectionTextChange(sec.key, e.target.value)}
                    placeholder={sec.placeholder}
                    className="w-full p-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] font-mono"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Knowledge Check Diagnostic */}
      {activeTab === 'quiz' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div>
              <h4 className="text-[15px] font-semibold text-[var(--text)]">Diagnostic Questions</h4>
              <p className="text-[13px] text-[var(--text-muted)]">
                Manage interactive quiz questions and explanations.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={addQuizQuestion}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              <span>Add Question</span>
            </Button>
          </div>

          <div className="space-y-4">
            {draft.sections.knowledgeCheck.questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-mono uppercase text-[var(--text-muted)] mb-1">
                      Question #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuizQuestion(idx, { question: e.target.value })}
                      className="w-full text-[14px] px-3 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteQuizQuestion(idx)}
                    icon={<Trash2 className="w-3.5 h-3.5 text-[var(--red)]" />}
                    title="Delete question"
                  />
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[var(--text-muted)] mb-1">
                      Options (One per line)
                    </label>
                    <textarea
                      rows={2}
                      value={(q.options || []).join('\n')}
                      onChange={(e) =>
                        updateQuizQuestion(idx, {
                          options: e.target.value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full text-[13px] px-3 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[var(--text-muted)] mb-1">
                        Correct Answer
                      </label>
                      <input
                        type="text"
                        value={q.correctAnswer}
                        onChange={(e) => updateQuizQuestion(idx, { correctAnswer: e.target.value })}
                        className="w-full text-[13px] px-3 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--green)] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[var(--text-muted)] mb-1">
                        Diagnostic Explanation
                      </label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => updateQuizQuestion(idx, { explanation: e.target.value })}
                        className="w-full text-[13px] px-3 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Recommended YouTube Videos */}
      {activeTab === 'media' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-[var(--border)]">
            <h4 className="text-[15px] font-semibold text-[var(--text)]">
              Recommended YouTube Lectures & Demonstrations
            </h4>
            <p className="text-[13px] text-[var(--text-muted)]">
              Curated multimedia to support specific lesson sections.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(draft.recommendedVideos || []).map((video, idx) => (
              <div key={idx} className="rounded-[10px] border border-[var(--border)] p-4 bg-[var(--surface-2)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Video className="w-4 h-4 text-[var(--green)] shrink-0" />
                    <h5 className="text-[14px] font-semibold text-[var(--text)] line-clamp-1">{video.title}</h5>
                  </div>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[var(--green)] hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Watch</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="mt-2 text-[12px] space-y-1 text-[var(--text-muted)]">
                  <div>
                    <span className="font-semibold text-[var(--text)]">Channel: </span>
                    <span>{video.channel}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text)]">Supports: </span>
                    <span className="px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] font-mono text-[11px]">
                      {video.supportedSection}
                    </span>
                  </div>
                  <p className="mt-1 italic">"{video.relevance}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: References */}
      {activeTab === 'references' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-[var(--border)]">
            <h4 className="text-[15px] font-semibold text-[var(--text)]">
              Grounded References & Source Traceability
            </h4>
            <p className="text-[13px] text-[var(--text-muted)]">
              Every factual claim in the lesson is traceable to these verified search citations.
            </p>
          </div>

          <div className="space-y-3">
            {(draft.references || []).map((ref) => (
              <div key={ref.id || ref.index} className="rounded-[10px] border border-[var(--border)] p-4 bg-[var(--surface-2)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[var(--surface)] text-[var(--green)] border border-[var(--border)]">
                      [Source {ref.index}]
                    </span>
                    <span className="text-[11px] font-mono uppercase text-[var(--text-muted)]">
                      {ref.type}
                    </span>
                    <h5 className="text-[14px] font-semibold text-[var(--text)]">{ref.title}</h5>
                  </div>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[var(--green)] hover:underline flex items-center space-x-1 shrink-0 ml-2"
                  >
                    <span>Open URL</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="mt-2 text-[12px] text-[var(--text)] space-y-1 bg-[var(--surface)] p-2.5 rounded-[6px] border border-[var(--border)]">
                  <div>
                    <strong className="text-[var(--text)]">Claim Supported: </strong>
                    <span className="text-[var(--text-muted)]">{ref.claim}</span>
                  </div>
                  {ref.notes && (
                    <div className="text-[var(--text-muted)]">
                      <strong>Audit Notes: </strong>
                      <span>{ref.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
