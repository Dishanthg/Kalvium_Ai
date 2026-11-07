/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, ChevronDown, SlidersHorizontal, Clock } from 'lucide-react';
import { Button } from './Button.tsx';

interface LessonInputFormProps {
  initialTitle: string;
  initialObjective: string;
  initialLanguage?: 'English' | 'Hindi';
  initialGrade?: string;
  initialDurationMinutes?: number;
  initialClassroomSetting?: string;
  isRunning: boolean;
  hasApiKey: boolean;
  onRunPipeline: (
    title: string,
    objective: string,
    language: 'English' | 'Hindi',
    grade: string,
    durationMinutes: number
  ) => void;
  onUpdateInputs: (
    title: string,
    objective: string,
    language: 'English' | 'Hindi',
    grade: string,
    durationMinutes: number
  ) => void;
}

export const SAMPLE_LESSON = {
  title: 'HTTP Requests and Responses',
  objective:
    'Explain GET and POST methods and distinguish between 2xx, 4xx, and 5xx response status categories.',
};

export const LessonInputForm: React.FC<LessonInputFormProps> = ({
  initialTitle,
  initialObjective,
  initialLanguage = 'English',
  initialGrade = 'University',
  initialDurationMinutes = 45,
  isRunning,
  hasApiKey,
  onRunPipeline,
  onUpdateInputs,
}) => {
  // Format combined text as seen in reference screenshots
  const formatCombinedText = (t: string, o: string) => {
    if (!t && !o) return '';
    if (t && o) {
      return `Lesson Title: ${t}\nLearning Objective: ${o}`;
    }
    return t || o;
  };

  const [combinedText, setCombinedText] = useState(() =>
    formatCombinedText(initialTitle, initialObjective)
  );
  const [title, setTitle] = useState(initialTitle);
  const [objective, setObjective] = useState(initialObjective);
  const [grade, setGrade] = useState(initialGrade);
  const [durationOption, setDurationOption] = useState<'30' | '45' | '60' | 'custom'>(() => {
    if (initialDurationMinutes === 30) return '30';
    if (initialDurationMinutes === 60) return '60';
    if (initialDurationMinutes && initialDurationMinutes !== 45) return 'custom';
    return '45';
  });
  const [customMinutes, setCustomMinutes] = useState<number>(() => {
    return initialDurationMinutes && ![30, 45, 60].includes(initialDurationMinutes)
      ? initialDurationMinutes
      : 50;
  });
  const [language, setLanguage] = useState<'English' | 'Hindi'>(initialLanguage);

  const getEffectiveMinutes = (opt: '30' | '45' | '60' | 'custom', customVal: number): number => {
    if (opt === '30') return 30;
    if (opt === '45') return 45;
    if (opt === '60') return 60;
    return customVal > 0 ? customVal : 45;
  };

  const currentDurationMinutes = getEffectiveMinutes(durationOption, customMinutes);

  const [showDetailedFields, setShowDetailedFields] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setObjective(initialObjective);
    setCombinedText(formatCombinedText(initialTitle, initialObjective));
    setGrade(initialGrade);
    setLanguage(initialLanguage);
    const minutes = initialDurationMinutes || 45;
    setDurationOption(minutes === 30 ? '30' : minutes === 60 ? '60' : minutes === 45 ? '45' : 'custom');
    setCustomMinutes([30, 45, 60].includes(minutes) ? 50 : minutes);
  }, [initialTitle, initialObjective, initialLanguage, initialGrade, initialDurationMinutes]);

  // Parse combined text into title and objective
  const handleCombinedTextChange = (val: string) => {
    setCombinedText(val);
    if (errorMsg) setErrorMsg(null);

    if (!val.trim()) {
      setTitle('');
      setObjective('');
      onUpdateInputs('', '', language, grade, currentDurationMinutes);
      return;
    }

    let parsedTitle = title;
    let parsedObjective = objective;

    const titleMatch = val.match(/Lesson Title:\s*([^\n]+)/i);
    const objMatch = val.match(/Learning Objective:\s*([\s\S]+)/i);

    if (titleMatch && titleMatch[1]) {
      parsedTitle = titleMatch[1].trim();
    }
    if (objMatch && objMatch[1]) {
      parsedObjective = objMatch[1].trim();
    }

    if (!titleMatch && !objMatch) {
      const lines = val.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length === 1) {
        parsedTitle = lines[0].trim();
        parsedObjective = lines[0].trim();
      } else if (lines.length > 1) {
        parsedTitle = lines[0].trim();
        parsedObjective = lines.slice(1).join(' ').trim();
      }
    }

    setTitle(parsedTitle);
    setObjective(parsedObjective);
    onUpdateInputs(parsedTitle, parsedObjective, language, grade, currentDurationMinutes);
  };

  const handleDetailedTitleChange = (val: string) => {
    setTitle(val);
    setCombinedText(formatCombinedText(val, objective));
    onUpdateInputs(val, objective, language, grade, currentDurationMinutes);
  };

  const handleDetailedObjectiveChange = (val: string) => {
    setObjective(val);
    setCombinedText(formatCombinedText(title, val));
    onUpdateInputs(title, val, language, grade, currentDurationMinutes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    const cleanObjective = objective.trim();

    if (!cleanTitle && !cleanObjective) {
      setErrorMsg('Please describe your lesson topic or learning objective.');
      return;
    }

    const finalTitle = cleanTitle || cleanObjective.slice(0, 50);
    const finalObjective = cleanObjective || cleanTitle;

    setErrorMsg(null);
    onRunPipeline(finalTitle, finalObjective, language, grade, currentDurationMinutes);
  };

  return (
    <div className="w-full max-w-4xl mx-auto pt-4 pb-8 px-2 sm:px-0">
      {/* Centered Hero Header per Typography scale: 28px/600, -0.01em */}
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-[28px] sm:text-[32px] font-semibold text-[var(--text)] tracking-tight mb-2">
          AI Lesson Plan Generator
        </h1>
        <p className="text-[15px] font-normal text-[var(--text-muted)] max-w-2xl mx-auto leading-[1.65]">
          Welcome to our free AI Lesson Plan Generator. Choose your grade, duration, describe your topic and ready to teach!
        </p>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Text Input Box */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="combined-prompt"
              className="block text-[14px] font-semibold text-[var(--text)]"
            >
              Describe the lesson topic or the objective
            </label>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailedFields(!showDetailedFields)}
              icon={<SlidersHorizontal className="w-3.5 h-3.5 text-[var(--green)]" />}
            >
              <span>{showDetailedFields ? 'Unified Input' : 'Separate Title & Objective'}</span>
            </Button>
          </div>

          {!showDetailedFields ? (
            <textarea
              id="combined-prompt"
              rows={4}
              value={combinedText}
              onChange={(e) => handleCombinedTextChange(e.target.value)}
              disabled={isRunning}
              placeholder="Fundamentals of the water cycle and its impact on ecosystems, designed for elementary science classes"
              className="w-full px-4 py-3 text-[15px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] transition-all resize-y leading-[1.65]"
            />
          ) : (
            <div className="space-y-3 p-4 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)]">
              <div>
                <label className="block text-[11px] font-mono font-semibold uppercase text-[var(--text-muted)] mb-1">
                  Lesson Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleDetailedTitleChange(e.target.value)}
                  placeholder="e.g. HTTP Requests and Responses"
                  className="w-full px-3.5 py-2 text-[14px] rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono font-semibold uppercase text-[var(--text-muted)] mb-1">
                  Learning Objective
                </label>
                <textarea
                  rows={2}
                  value={objective}
                  onChange={(e) => handleDetailedObjectiveChange(e.target.value)}
                  placeholder="e.g. Explain GET and POST methods and distinguish between 2xx, 4xx, and 5xx response status categories."
                  className="w-full px-3.5 py-2 text-[14px] rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)] leading-relaxed"
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="mt-1.5 text-[13px] text-[var(--red)] flex items-center space-x-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}
        </div>

        {/* 3 Dropdowns matching reference */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Dropdown 1: Grade */}
          <div className="relative">
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                onUpdateInputs(title, objective, language, e.target.value, currentDurationMinutes);
              }}
              disabled={isRunning}
              className="w-full appearance-none px-4 py-2.5 text-[14px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)] cursor-pointer pr-10"
            >
              <option value="Select the grade (auto)">Select the grade (auto)</option>
              <option value="Pre-K">Pre-K</option>
              <option value="Elementary">Elementary</option>
              <option value="Middle School">Middle School</option>
              <option value="High School">High School</option>
              <option value="University">University</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dropdown 2: Duration in minutes */}
          <div className="relative">
            <select
              value={durationOption}
              onChange={(e) => {
                const opt = e.target.value as '30' | '45' | '60' | 'custom';
                setDurationOption(opt);
                const mins = getEffectiveMinutes(opt, customMinutes);
                onUpdateInputs(title, objective, language, grade, mins);
              }}
              disabled={isRunning}
              className="w-full appearance-none px-4 py-2.5 text-[14px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)] cursor-pointer pr-10"
            >
              <option value="45">45 min (auto)</option>
              <option value="30">30 min</option>
              <option value="60">60 min</option>
              <option value="custom">Custom min</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dropdown 3: Language */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => {
                const newLang = e.target.value as 'English' | 'Hindi';
                setLanguage(newLang);
                onUpdateInputs(title, objective, newLang, grade, currentDurationMinutes);
              }}
              disabled={isRunning}
              className="w-full appearance-none px-4 py-2.5 text-[14px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)] cursor-pointer pr-10"
            >
              <option value="English">Language (English)</option>
              <option value="Hindi">Language (Hindi / हिन्दी)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Custom duration minute input if Custom is selected */}
        {durationOption === 'custom' && (
          <div className="flex items-center space-x-2.5 p-3 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
            <Clock className="w-4 h-4 text-[var(--green)] shrink-0" />
            <label className="text-[13px] font-semibold text-[var(--text)]">
              Custom Duration (minutes):
            </label>
            <input
              type="number"
              min="10"
              max="180"
              step="5"
              value={customMinutes}
              onChange={(e) => {
                const val = Math.max(10, parseInt(e.target.value, 10) || 45);
                setCustomMinutes(val);
                onUpdateInputs(title, objective, language, grade, val);
              }}
              disabled={isRunning}
              className="w-20 px-3 py-1 text-[13px] font-mono font-semibold rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]"
            />
            <span className="text-[13px] font-mono text-[var(--text-muted)]">minutes</span>
          </div>
        )}

        {/* API key warning banner if missing */}
        {!hasApiKey && (
          <div className="p-3 rounded-[10px] bg-[var(--amber-soft)] border border-[var(--amber)] text-[var(--amber)] text-[13px] flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              OpenRouter API key is required. Add <code>OPENROUTER_API_KEY</code> to <code>.env.local</code>, then restart the dev server.
            </span>
          </div>
        )}

        {/* Action Row */}
        <div className="pt-3 flex items-center justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isRunning || !hasApiKey}
            icon={<Sparkles className="w-4 h-4 fill-current" />}
          >
            <span>{isRunning ? 'Generating Lesson Quest...' : 'Generate'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
