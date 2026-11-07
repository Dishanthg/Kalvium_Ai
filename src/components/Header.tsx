/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, FolderOpen, PlusCircle, Sparkles, Sun, Moon } from 'lucide-react';
import { Button } from './Button';

interface HeaderProps {
  onNewLesson: () => void;
  onOpenSavedModal: () => void;
  onLoadSample: () => void;
  activeLessonTitle?: string;
  hasApiKey: boolean;
  isDark?: boolean;
  onToggleDark?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewLesson,
  onOpenSavedModal,
  onLoadSample,
  hasApiKey,
  isDark,
  onToggleDark,
}) => {
  return (
    <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Title per spec: logo square = --green bg with black icon, app title in --text color */}
        <div className="flex items-center space-x-3">
          <div
            className="w-9 h-9 rounded-[10px] bg-[var(--green)] flex items-center justify-center text-[var(--on-green)] shrink-0"
            aria-hidden="true"
          >
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[var(--text)] tracking-tight leading-none">
              AI Lesson Creation Tool
            </h1>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* API Status: small quiet pill with a green dot, no heavy border */}
          <div
            className="hidden md:flex items-center space-x-1.5 text-[12px] font-mono px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]"
            title={hasApiKey ? 'OpenRouter API configured' : 'API key missing'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                hasApiKey ? 'bg-[var(--green)]' : 'bg-[var(--amber)]'
              }`}
            />
            <span>{hasApiKey ? 'API Ready' : 'No API Key'}</span>
          </div>

          {/* Load Sample button: standard secondary button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadSample}
            icon={<Sparkles className="w-3.5 h-3.5 text-[var(--green)]" />}
            title="Load sample test case: HTTP Requests and Responses"
          >
            <span className="hidden sm:inline">Load Sample</span>
          </Button>

          {/* Lessons modal trigger */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenSavedModal}
            icon={<FolderOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
          >
            <span>Lessons</span>
          </Button>

          {/* Theme Toggle Button */}
          {onToggleDark && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleDark}
              aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="px-2.5"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[var(--amber)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--text)]" />
              )}
            </Button>
          )}

          {/* New Lesson: Primary Button with green bg + on-green text */}
          <Button
            variant="primary"
            size="sm"
            onClick={onNewLesson}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">New Lesson</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
