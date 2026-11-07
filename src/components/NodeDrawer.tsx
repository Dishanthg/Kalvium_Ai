/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Video,
  Globe,
  Award,
  HelpCircle,
  Eye,
  EyeOff,
  Download,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  LessonData,
  GroundingSource,
  KnowledgeCheckQuestion,
  YouTubeRecommendation,
  QCIssue,
} from '../types/lesson.ts';
import { MarkdownContent } from './MarkdownContent.tsx';
import { Button } from './Button.tsx';

export interface NodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  lesson: LessonData;
  mode: 'learner' | 'instructor';
  isCompleted: boolean;
  onMarkComplete: (nodeId: string) => void;
  onNavigateToNode: (nodeId: string) => void;
  onJumpToEditor?: (sectionKey: string) => void;
  onOpenExport?: () => void;
  qcIssues?: QCIssue[];
  quizAnswers: Record<string, string>;
  onSaveQuizAnswer: (questionId: string, answer: string) => void;
  activityTickedSteps: Record<string, boolean>;
  onToggleActivityStep: (stepId: string) => void;
}

export const NodeDrawer: React.FC<NodeDrawerProps> = ({
  isOpen,
  onClose,
  nodeId,
  lesson,
  mode,
  isCompleted,
  onMarkComplete,
  onNavigateToNode,
  onJumpToEditor,
  onOpenExport,
  qcIssues = [],
  quizAnswers,
  onSaveQuizAnswer,
  activityTickedSteps,
  onToggleActivityStep,
}) => {
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [revealAllAnswers, setRevealAllAnswers] = useState(false);

  // Timer state for hands-on activity
  const [timerSeconds, setTimerSeconds] = useState<number>(() => {
    return (lesson.sections.handsOnActivity?.minutes || 5) * 60;
  });
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Reset timer if duration changes
  useEffect(() => {
    if (nodeId === 'handsOnActivity') {
      setTimerSeconds((lesson.sections.handsOnActivity?.minutes || 5) * 60);
      setIsTimerRunning(false);
    }
  }, [nodeId, lesson.sections.handsOnActivity?.minutes]);

  // Timer interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval !== undefined) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  // Esc key closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Confetti burst when opening the Finish node
  useEffect(() => {
    if (isOpen && nodeId === 'finish') {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#22C55E', '#16A34A', '#FFFFFF', '#9BA9A1'],
      });
    }
  }, [isOpen, nodeId]);

  const s = lesson.sections;

  // Resolve section information based on nodeId
  let nodeTitle = '';
  let nodeMinutes = 0;
  let nodeContent = '';
  let nextNodeId: string | null = null;
  let sectionKey = '';

  switch (nodeId) {
    case 'introduction':
      nodeTitle = s.introduction?.title || 'Introduction & Learning Objective';
      nodeMinutes = s.introduction?.minutes || 5;
      nodeContent = s.introduction?.content || '';
      nextNodeId = 'coreConcepts';
      sectionKey = 'introduction';
      break;
    case 'coreConcepts':
      nodeTitle = s.coreConcepts?.title || 'Core Concept Explanations';
      nodeMinutes = s.coreConcepts?.minutes || 15;
      nodeContent = s.coreConcepts?.content || '';
      nextNodeId = 'workedExamples';
      sectionKey = 'coreConcepts';
      break;
    case 'workedExamples':
      nodeTitle = s.workedExamples?.title || 'Worked Examples';
      nodeMinutes = s.workedExamples?.minutes || 10;
      nodeContent = s.workedExamples?.content || '';
      nextNodeId = 'practicalApplications';
      sectionKey = 'workedExamples';
      break;
    case 'practicalApplications':
      nodeTitle = s.practicalApplications?.title || 'Practical Applications';
      nodeMinutes = s.practicalApplications?.minutes || 5;
      nodeContent = s.practicalApplications?.content || '';
      nextNodeId = 'handsOnActivity';
      sectionKey = 'practicalApplications';
      break;
    case 'handsOnActivity':
      nodeTitle = s.handsOnActivity?.title || 'Hands-on Activity';
      nodeMinutes = s.handsOnActivity?.minutes || 5;
      nodeContent = s.handsOnActivity?.content || '';
      nextNodeId = 'knowledgeCheck';
      sectionKey = 'handsOnActivity';
      break;
    case 'knowledgeCheck':
      nodeTitle = s.knowledgeCheck?.title || 'Knowledge Check Diagnostic';
      nodeMinutes = s.knowledgeCheck?.minutes || 3;
      nodeContent = '';
      nextNodeId = 'summary';
      sectionKey = 'knowledgeCheck';
      break;
    case 'summary':
      nodeTitle = s.summary?.title || 'Summary & Key Takeaways';
      nodeMinutes = s.summary?.minutes || 2;
      nodeContent = s.summary?.content || '';
      nextNodeId = 'references';
      sectionKey = 'summary';
      break;
    case 'references':
      nodeTitle = 'References & Specifications';
      nodeMinutes = 0;
      nodeContent = '';
      nextNodeId = 'finish';
      sectionKey = 'references';
      break;
    case 'bonus-videos':
      nodeTitle = 'Bonus: Recommended YouTube Videos';
      nodeMinutes = 0;
      nextNodeId = null;
      sectionKey = 'videos';
      break;
    case 'bonus-sources':
      nodeTitle = 'Bonus: All Research Sources';
      nodeMinutes = 0;
      nextNodeId = null;
      sectionKey = 'sources';
      break;
    case 'finish':
      nodeTitle = 'Quest Complete!';
      nodeMinutes = 0;
      nextNodeId = null;
      sectionKey = 'finish';
      break;
    default:
      nodeTitle = 'Lesson Section';
      nodeMinutes = 0;
  }

  // Find sources cited specifically in this section
  const citedSources = useMemo(() => {
    if (!nodeContent) return [];
    const matches = Array.from(nodeContent.matchAll(/\[Source\s*(\d+)\]/gi));
    const indices = new Set(matches.map((m) => parseInt(m[1], 10)));
    return (lesson.references || []).filter((s) => indices.has(s.index));
  }, [nodeContent, lesson.references]);

  // Copy Markdown
  const handleCopyMarkdown = async () => {
    const text = `# ${nodeTitle}\n\n${nodeContent}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (error) {
      console.error('Failed to copy section markdown:', error);
    }
  };

  // Copy section link
  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#section-${nodeId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Failed to copy section link:', error);
    }
  };

  // Format timer
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Activity steps parsed from content
  const activitySteps = useMemo(() => {
    if (nodeId !== 'handsOnActivity' || !nodeContent) return [];
    const lines = nodeContent.split('\n');
    const steps: { id: string; text: string }[] = [];
    lines.forEach((line, idx) => {
      const match = line.match(/^(\d+\.|\*|-)\s+(.*)/);
      if (match && match[2].trim().length > 3) {
        steps.push({ id: `step-${idx}`, text: match[2].trim() });
      }
    });
    return steps;
  }, [nodeId, nodeContent]);

  // Quiz questions
  const quizQuestions = lesson.sections.knowledgeCheck?.questions || [];
  const answeredCount = Object.keys(quizAnswers).length;
  const correctCount = quizQuestions.filter(
    (q) => quizAnswers[q.id] === q.correctAnswer
  ).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={nodeTitle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl sm:max-w-3xl h-full bg-[var(--surface)] text-[var(--text)] border-l border-[var(--border)] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {nodeMinutes > 0 && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[12px] font-mono bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                  <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                  <span>{nodeMinutes.toString().padStart(2, '0')} min</span>
                </span>
              )}

              {isCompleted ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green)]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Completed</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-mono bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                  In Progress
                </span>
              )}

              {mode === 'instructor' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium uppercase tracking-wider bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]">
                  Instructor Mode
                </span>
              )}

              {/* QC Issue Warning Badge if any */}
              {qcIssues.length > 0 && (
                <span
                  title={`${qcIssues.length} QC issue(s) flagged for this section`}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[12px] font-mono font-medium bg-[var(--amber-soft)] text-[var(--amber)] border border-[var(--amber)]"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{qcIssues.length} QC issue{qcIssues.length > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>

            <h2 className="text-[20px] font-semibold text-[var(--text)] tracking-tight leading-snug">
              {nodeTitle}
            </h2>
          </div>

          {/* Close & Action Buttons */}
          <div className="flex items-center space-x-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyMarkdown}
              title="Copy Section as Markdown"
              icon={copiedMarkdown ? <Check className="w-4 h-4 text-[var(--green)]" /> : <Copy className="w-4 h-4" />}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              title="Copy Section Link"
              icon={copiedLink ? <Check className="w-4 h-4 text-[var(--green)]" /> : <Share2 className="w-4 h-4" />}
            />

            {mode === 'instructor' && sectionKey && onJumpToEditor && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onJumpToEditor(sectionKey);
                }}
                icon={<Edit3 className="w-3.5 h-3.5" />}
                title="Edit this section in Instructor Editor"
              >
                <span>Edit</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close section drawer"
              icon={<X className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Scrollable Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* 1. Knowledge Check Quiz Mode */}
          {nodeId === 'knowledgeCheck' ? (
            <div className="space-y-6">
              {/* Quiz Header Banner */}
              <div className="p-4 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-semibold text-[var(--text)] flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4 text-[var(--green)]" />
                    <span>Interactive Knowledge Check</span>
                  </h3>
                  <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                    Test comprehension of the key concepts covered in this lesson.
                  </p>
                </div>

                <div className="text-right">
                  <span className="block text-[11px] font-mono uppercase text-[var(--text-muted)]">
                    Score
                  </span>
                  <span className="text-[18px] font-mono font-semibold text-[var(--green)]">
                    {correctCount} / {quizQuestions.length}
                  </span>
                </div>
              </div>

              {/* Instructor Mode toggle to reveal all answers */}
              {mode === 'instructor' && (
                <div className="flex items-center justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setRevealAllAnswers(!revealAllAnswers)}
                    icon={revealAllAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  >
                    <span>{revealAllAnswers ? 'Hide Instructor Answers' : 'Reveal Answers (Instructor)'}</span>
                  </Button>
                </div>
              )}

              {/* Question list */}
              <div className="space-y-6">
                {quizQuestions.map((q, qIdx) => {
                  const selectedAnswer = quizAnswers[q.id];
                  const hasAnswered = !!selectedAnswer;
                  const isCorrect = selectedAnswer === q.correctAnswer;
                  const showSolution = revealAllAnswers || hasAnswered;

                  return (
                    <div
                      key={q.id || qIdx}
                      className="p-4 sm:p-5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[15px] font-semibold text-[var(--text)] leading-snug">
                          <span className="font-mono text-[var(--text-muted)] mr-2">Q{qIdx + 1}.</span>
                          {q.question}
                        </h4>
                        {hasAnswered && (
                          <span
                            className={`shrink-0 text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                              isCorrect
                                ? 'bg-[var(--green-soft)] text-[var(--green)]'
                                : 'bg-[var(--red-soft)] text-[var(--red)]'
                            }`}
                          >
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </div>

                      {/* Options per spec: neutral cards, selected = green border, correct = green tint, wrong = red tint + label */}
                      <div className="space-y-2">
                        {(q.options || []).map((option, optIdx) => {
                          const isOptionSelected = selectedAnswer === option;
                          const isActualCorrect = option === q.correctAnswer;

                          let optionStyle =
                            'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]';
                          let statusLabel: React.ReactNode = null;

                          if (showSolution) {
                            if (isActualCorrect) {
                              optionStyle =
                                'border-[var(--green)] bg-[var(--green-soft)] text-[var(--text)]';
                              statusLabel = (
                                <span className="text-[11px] font-mono font-medium text-[var(--green)]">
                                  Correct Answer
                                </span>
                              );
                            } else if (isOptionSelected && !isCorrect) {
                              optionStyle =
                                'border-[var(--red)] bg-[var(--red-soft)] text-[var(--text)]';
                              statusLabel = (
                                <span className="text-[11px] font-mono font-medium text-[var(--red)]">
                                  Your Choice
                                </span>
                              );
                            }
                          } else if (isOptionSelected) {
                            optionStyle = 'border-[var(--green)] bg-[var(--green-soft)] text-[var(--text)]';
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => onSaveQuizAnswer(q.id, option)}
                              className={`w-full text-left p-3 rounded-[8px] border text-[14px] flex items-center justify-between transition-all cursor-pointer ${optionStyle}`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="w-5 h-5 rounded-full border border-[var(--border)] flex items-center justify-center text-[11px] font-mono font-medium shrink-0">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="leading-relaxed">{option}</span>
                              </div>
                              {statusLabel}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {showSolution && (
                        <div className="mt-3 p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] space-y-1">
                          <span className="font-semibold text-[var(--text)] block text-[11px] uppercase tracking-wider">
                            Explanation
                          </span>
                          <p className="text-[var(--text-muted)] leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : nodeId === 'handsOnActivity' ? (
            /* 2. Hands-on Activity Mode */
            <div className="space-y-6">
              {/* Activity Timer Widget */}
              <div className="p-4 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-[8px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-mono uppercase text-[var(--text-muted)] tracking-wider">
                      Activity Timer
                    </span>
                    <span className="text-[24px] font-mono font-semibold text-[var(--text)]">
                      {formatTimer(timerSeconds)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant={isTimerRunning ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    icon={isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  >
                    <span>{isTimerRunning ? 'Pause' : 'Start Timer'}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSeconds((lesson.sections.handsOnActivity?.minutes || 5) * 60);
                    }}
                    title="Reset Timer"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                  />
                </div>
              </div>

              {/* Instructions rendering */}
              <div className="space-y-3">
                <h3 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">
                  Activity Instructions
                </h3>
                <MarkdownContent content={nodeContent} sources={lesson.references} />
              </div>

              {/* Interactive Step Checklist */}
              {activitySteps.length > 0 && (
                <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-3">
                  <h4 className="text-[14px] font-semibold text-[var(--text)]">
                    Progress Checklist ({Object.values(activityTickedSteps).filter(Boolean).length} / {activitySteps.length})
                  </h4>
                  <div className="space-y-2">
                    {activitySteps.map((step) => {
                      const isTicked = !!activityTickedSteps[step.id];
                      return (
                        <label
                          key={step.id}
                          className={`flex items-start space-x-3 p-3 rounded-[8px] border transition-colors cursor-pointer select-none ${
                            isTicked
                              ? 'bg-[var(--green-soft)] border-[var(--green)] text-[var(--text)]'
                              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isTicked}
                            onChange={() => onToggleActivityStep(step.id)}
                            className="mt-1 h-4 w-4 rounded accent-[var(--green)] cursor-pointer"
                          />
                          <span className={`text-[14px] leading-relaxed ${isTicked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>
                            {step.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : nodeId === 'bonus-videos' ? (
            /* 3. Recommended YouTube Videos Vault */
            <div className="space-y-4">
              <div className="p-4 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)]">
                <h3 className="text-[16px] font-semibold text-[var(--text)] flex items-center space-x-2">
                  <Video className="w-4 h-4 text-[var(--green)]" />
                  <span>Curated Learning Videos</span>
                </h3>
                <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                  Hand-picked educational video resources to accompany this curriculum.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(lesson.recommendedVideos || []).map((vid, idx) => {
                  const match = (vid.url || '').match(/(?:v=|youtu\.be\/)([\w-]{11})/);
                  const videoId = match ? match[1] : null;
                  const ytThumb = videoId
                    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    : null;

                  return (
                    <div
                      key={vid.url || idx}
                      className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col sm:flex-row hover:border-[var(--green)] transition-all"
                    >
                      {/* Video Thumbnail */}
                      <div className="sm:w-48 h-32 bg-[var(--surface-2)] relative shrink-0">
                        {ytThumb ? (
                          <img
                            src={ytThumb}
                            alt={vid.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback if thumb fails
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                            <Video className="w-8 h-8" />
                          </div>
                        )}
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/80 text-white">
                          YouTube
                        </span>
                      </div>

                      {/* Video Info */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-medium text-[var(--green)] uppercase">
                              {vid.channel || 'Educational'}
                            </span>
                            {vid.supportedSection && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
                                Supports {vid.supportedSection}
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-[15px] text-[var(--text)] mt-1 line-clamp-2 leading-snug">
                            {vid.title}
                          </h4>
                          <p className="text-[13px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                            {vid.relevance}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[var(--border)] flex justify-end">
                          <a
                            href={vid.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[var(--green)] hover:underline"
                          >
                            <span>Watch on YouTube</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : nodeId === 'bonus-sources' || nodeId === 'references' ? (
            /* 4. References & Sources Library */
            <div className="space-y-4">
              <div className="p-4 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)]">
                <h3 className="text-[16px] font-semibold text-[var(--text)] flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-[var(--green)]" />
                  <span>Research Library & Citations</span>
                </h3>
                <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                  Full catalog of verified citations and grounded factual sources.
                </p>
              </div>

              <div className="space-y-3">
                {(lesson.references || []).map((source) => (
                  <div
                    key={source.index}
                    className="p-4 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--green)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[var(--surface-2)] text-[var(--green)] border border-[var(--border)]">
                          [Source {source.index}]
                        </span>
                        <span className="text-[11px] font-mono uppercase text-[var(--text-muted)]">
                          {source.type}
                        </span>
                      </div>

                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-[var(--green)] hover:underline"
                        >
                          <span>Visit Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <h4 className="font-semibold text-[15px] text-[var(--text)] mt-2 leading-snug">
                      {source.title}
                    </h4>

                    {source.claim && (
                      <div className="mt-2 p-2.5 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[13px]">
                        <span className="block text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider mb-0.5">
                          Claim Supported
                        </span>
                        <p className="italic text-[var(--text)] leading-relaxed">
                          "{source.claim}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : nodeId === 'finish' ? (
            /* 5. Finish Quest Complete Screen */
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-[10px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center mx-auto">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-[24px] font-semibold text-[var(--text)] tracking-tight">
                  Lesson Quest Completed!
                </h3>
                <p className="text-[14px] text-[var(--text-muted)] max-w-md mx-auto mt-1 leading-relaxed">
                  Congratulations! You have completed all 8 modules for <strong>{lesson.title}</strong>.
                </p>
              </div>

              {/* Completion Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                <div className="p-3 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] text-center">
                  <span className="block text-[11px] font-mono uppercase text-[var(--text-muted)]">Time Invested</span>
                  <span className="text-[18px] font-mono font-semibold text-[var(--text)]">
                    {lesson.totalMinutes || 45} min
                  </span>
                </div>

                <div className="p-3 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] text-center">
                  <span className="block text-[11px] font-mono uppercase text-[var(--text-muted)]">Quiz Score</span>
                  <span className="text-[18px] font-mono font-semibold text-[var(--green)]">
                    {correctCount} / {quizQuestions.length}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] text-center">
                  <span className="block text-[11px] font-mono uppercase text-[var(--text-muted)]">Verified Sources</span>
                  <span className="text-[18px] font-mono font-semibold text-[var(--text)]">
                    {lesson.references?.length || 0}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                {onOpenExport && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      onClose();
                      onOpenExport();
                    }}
                    icon={<Download className="w-4 h-4" />}
                  >
                    <span>Export Lesson Plan</span>
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                >
                  <span>Review Map</span>
                </Button>
              </div>
            </div>
          ) : (
            /* 6. Standard Section Markdown Content */
            <div className="space-y-6">
              <MarkdownContent content={nodeContent} sources={lesson.references} />

              {/* Sources used in this section */}
              {citedSources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[var(--border)]">
                  <h4 className="text-[13px] font-mono font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    Sources Cited In This Section ({citedSources.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {citedSources.map((source) => (
                      <div
                        key={source.index}
                        className="p-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)] flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-1.5 mb-1">
                            <span className="font-mono font-semibold text-[var(--green)]">
                              [Source {source.index}]
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] uppercase">
                              · {source.type}
                            </span>
                          </div>
                          <h5 className="font-semibold text-[13px] text-[var(--text)] leading-snug">
                            {source.title}
                          </h5>
                          {source.claim && (
                            <p className="mt-1 text-[12px] text-[var(--text-muted)] italic">
                              "{source.claim}"
                            </p>
                          )}
                        </div>

                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--green)]"
                            title="Visit external source"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Bottom Action Bar */}
        <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <span>Close</span>
          </Button>

          {nodeId !== 'finish' && (
            <div className="flex items-center space-x-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onMarkComplete(nodeId);
                  if (nextNodeId) {
                    onNavigateToNode(nextNodeId);
                  } else {
                    onClose();
                  }
                }}
              >
                <span>{isCompleted ? 'Next Section →' : 'Mark as Complete & Continue →'}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
