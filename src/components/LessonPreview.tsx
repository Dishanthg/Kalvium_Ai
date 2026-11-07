/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Clock,
  Target,
  Video,
  Link2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react';
import { LessonData } from '../types/lesson.ts';
import { Button } from './Button.tsx';

interface LessonPreviewProps {
  lesson: LessonData;
}

export const LessonPreview: React.FC<LessonPreviewProps> = ({ lesson }) => {
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  const toggleAnswer = (qId: string) => {
    setRevealedAnswers((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const s = lesson.sections;

  const timelineItems = [
    { title: 'Introduction', mins: s.introduction?.minutes || 5 },
    { title: 'Core Concepts', mins: s.coreConcepts?.minutes || 15 },
    { title: 'Worked Examples', mins: s.workedExamples?.minutes || 10 },
    { title: 'Practical Apps', mins: s.practicalApplications?.minutes || 5 },
    { title: 'Hands-on Activity', mins: s.handsOnActivity?.minutes || 5 },
    { title: 'Knowledge Check', mins: s.knowledgeCheck?.minutes || 3 },
    { title: 'Summary', mins: s.summary?.minutes || 2 },
  ];

  return (
    <div className="bg-[var(--surface)] text-[var(--text)] rounded-[10px] border border-[var(--border)] overflow-hidden transition-colors">
      {/* Lesson Hero Header */}
      <div className="p-6 sm:p-8 bg-[var(--surface-2)] border-b border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[12px] font-mono bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green)]">
              <Clock className="w-3.5 h-3.5" />
              <span>{lesson.totalMinutes || 45}-Minute Certified Curriculum</span>
            </span>
            {lesson.language && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                {lesson.language === 'Hindi' ? 'Hindi (हिन्दी)' : 'English'}
              </span>
            )}
            {lesson.gradeLevel && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                Grade: {lesson.gradeLevel}
              </span>
            )}
          </div>

          <span className="text-[12px] font-mono text-[var(--text-muted)]">
            Total Allocated: {lesson.totalMinutes || 45} min
          </span>
        </div>

        <h1 className="text-[24px] sm:text-[28px] font-semibold text-[var(--text)] tracking-tight leading-snug">
          {lesson.title}
        </h1>

        <div className="mt-4 p-4 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] flex items-start space-x-3">
          <Target className="w-5 h-5 text-[var(--green)] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[11px] font-mono uppercase text-[var(--text-muted)] tracking-wider">
              Measurable Learning Objective
            </h4>
            <p className="text-[14px] text-[var(--text)] mt-0.5 leading-relaxed">
              {lesson.learningObjective}
            </p>
          </div>
        </div>

        {/* Dynamic Timeline Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-[12px] font-mono text-[var(--text-muted)] mb-1.5">
            <span>{lesson.totalMinutes || 45}-Minute Lesson Pacing Schedule</span>
            <span className="text-[var(--green)]">100% Comprehensive</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[var(--surface)] flex overflow-hidden border border-[var(--border)]">
            {timelineItems.map((item, idx) => (
              <div
                key={idx}
                style={{ width: `${(item.mins / (lesson.totalMinutes || 45)) * 100}%` }}
                className={`h-full border-r border-[var(--surface)] transition-all ${
                  idx % 2 === 0 ? 'bg-[var(--green)]' : 'bg-[var(--green-hover)]'
                }`}
                title={`${item.title} (${item.mins} min)`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-2">
            {timelineItems.map((item, idx) => (
              <div key={idx} className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                <span className="font-semibold text-[var(--text)]">{item.mins}m</span> {item.title}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Lesson Body */}
      <div className="p-6 sm:p-8 space-y-8 max-w-4xl mx-auto">
        {/* Section 1: Introduction */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
            <div className="w-7 h-7 rounded-[6px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center font-mono font-semibold text-xs">
              01
            </div>
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight">
              Introduction & Objective Overview
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] ml-auto border border-[var(--border)]">
              {s.introduction?.minutes || 5} min
            </span>
          </div>
          <div className="text-[15px] text-[var(--text)] leading-[1.65] whitespace-pre-wrap font-sans bg-[var(--surface-2)] p-4 rounded-[10px] border border-[var(--border)]">
            {s.introduction?.content}
          </div>
        </section>

        {/* Section 2: Core Concepts */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
            <div className="w-7 h-7 rounded-[6px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center font-mono font-semibold text-xs">
              02
            </div>
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight">
              Core Concept Explanations & Theory
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] ml-auto border border-[var(--border)]">
              {s.coreConcepts?.minutes || 15} min
            </span>
          </div>
          <div className="text-[15px] text-[var(--text)] leading-[1.65] whitespace-pre-wrap font-sans bg-[var(--surface-2)] p-4 rounded-[10px] border border-[var(--border)]">
            {s.coreConcepts?.content}
          </div>
        </section>

        {/* Section 3: Worked Examples */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
            <div className="w-7 h-7 rounded-[6px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center font-mono font-semibold text-xs">
              03
            </div>
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight">
              Worked Examples & Concrete Demonstrations
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] ml-auto border border-[var(--border)]">
              {s.workedExamples?.minutes || 10} min
            </span>
          </div>
          <div className="text-[15px] text-[var(--text)] leading-[1.65] whitespace-pre-wrap font-sans bg-[var(--surface-2)] p-4 rounded-[10px] border border-[var(--border)]">
            {s.workedExamples?.content}
          </div>
        </section>

        {/* Section 4: Practical Applications */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
            <div className="w-7 h-7 rounded-[6px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center font-mono font-semibold text-xs">
              04
            </div>
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight">
              Practical Real-World Applications
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] ml-auto border border-[var(--border)]">
              {s.practicalApplications?.minutes || 5} min
            </span>
          </div>
          <div className="text-[15px] text-[var(--text)] leading-[1.65] whitespace-pre-wrap font-sans bg-[var(--surface-2)] p-4 rounded-[10px] border border-[var(--border)]">
            {s.practicalApplications?.content}
          </div>
        </section>

        {/* Section 5: Hands-on Activity */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
            <div className="w-7 h-7 rounded-[6px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center font-mono font-semibold text-xs">
              05
            </div>
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight">
              Hands-on Activity (5-Minute Exercise)
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] ml-auto border border-[var(--border)]">
              {s.handsOnActivity?.minutes || 5} min
            </span>
          </div>
          <div className="text-[15px] text-[var(--text)] leading-[1.65] whitespace-pre-wrap font-sans bg-[var(--surface-2)] p-4 rounded-[10px] border border-[var(--border)]">
            {s.handsOnActivity?.content}
          </div>
        </section>

        {/* Section 6: Knowledge Check */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
            <div className="w-7 h-7 rounded-[6px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center font-mono font-semibold text-xs">
              06
            </div>
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight">
              Knowledge Check (Diagnostic Assessments)
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] ml-auto border border-[var(--border)]">
              {s.knowledgeCheck?.minutes || 3} min
            </span>
          </div>

          <div className="space-y-3">
            {s.knowledgeCheck?.questions.map((q, idx) => {
              const isRevealed = revealedAnswers[q.id || idx];

              return (
                <div
                  key={q.id || idx}
                  className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[14px] font-semibold text-[var(--text)] leading-snug">
                      <span className="font-mono text-[var(--text-muted)] mr-1.5">Q{idx + 1}.</span>
                      {q.question}
                    </h3>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleAnswer(q.id || idx.toString())}
                      icon={isRevealed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    >
                      <span>{isRevealed ? 'Hide Answer' : 'Reveal Answer'}</span>
                    </Button>
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="px-3 py-2 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {isRevealed && (
                    <div className="mt-3 p-3 rounded-[8px] bg-[var(--green-soft)] border border-[var(--green)] text-[13px] space-y-1">
                      <div className="font-semibold text-[var(--green)] flex items-center space-x-1.5">
                        <CheckCircle className="w-4 h-4" />
                        <span>Correct Answer: {q.correctAnswer}</span>
                      </div>
                      <p className="text-[var(--text)]">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 7: Summary */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
            <div className="w-7 h-7 rounded-[6px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center font-mono font-semibold text-xs">
              07
            </div>
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight">
              Summary & Key Takeaways
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] ml-auto border border-[var(--border)]">
              {s.summary?.minutes || 2} min
            </span>
          </div>
          <div className="text-[15px] text-[var(--text)] leading-[1.65] whitespace-pre-wrap font-sans bg-[var(--surface-2)] p-4 rounded-[10px] border border-[var(--border)]">
            {s.summary?.content}
          </div>
        </section>

        {/* Section 8: Recommended YouTube Videos */}
        <section className="space-y-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center space-x-2">
            <Video className="w-5 h-5 text-[var(--green)]" />
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight">
              Recommended YouTube Lectures & Demonstrations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(lesson.recommendedVideos || []).map((video, idx) => (
              <div
                key={idx}
                className="rounded-[10px] border border-[var(--border)] p-4 bg-[var(--surface-2)] hover:border-[var(--green)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-[14px] font-semibold text-[var(--text)] line-clamp-2">
                    {video.title}
                  </h3>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-[var(--green)] hover:underline shrink-0"
                    title="Watch video"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="mt-2 text-[12px] space-y-1">
                  <div className="text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text)]">Creator: </span>
                    {video.channel}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text)]">Supports: </span>
                    <span className="px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] font-mono text-[11px]">
                      {video.supportedSection}
                    </span>
                  </div>
                  <p className="text-[var(--text-muted)] italic mt-1.5 pt-1.5 border-t border-[var(--border)]">
                    "{video.relevance}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 9: References & Grounded Citations */}
        <section className="space-y-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center space-x-2">
            <Link2 className="w-5 h-5 text-[var(--green)]" />
            <h2 className="text-[18px] font-semibold text-[var(--text)] tracking-tight">
              References & Grounded Citations
            </h2>
          </div>
          <p className="text-[13px] text-[var(--text-muted)]">
            Verified URLs extracted from Google Search Grounding metadata.
          </p>

          <div className="space-y-2.5">
            {(lesson.references || []).map((ref) => (
              <div
                key={ref.id || ref.index}
                className="rounded-[10px] border border-[var(--border)] p-4 bg-[var(--surface-2)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--green)] border border-[var(--border)]">
                      [Source {ref.index}]
                    </span>
                    <span className="text-[11px] font-mono uppercase text-[var(--text-muted)]">
                      {ref.type}
                    </span>
                    <h3 className="text-[14px] font-semibold text-[var(--text)]">{ref.title}</h3>
                  </div>

                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[var(--green)] hover:underline flex items-center space-x-1 shrink-0 ml-2"
                  >
                    <span>Visit Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="mt-2 text-[13px] text-[var(--text)] space-y-1">
                  <div>
                    <span className="font-semibold text-[var(--text)]">Claim Supported: </span>
                    <span className="text-[var(--text-muted)]">{ref.claim}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
