/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, ArrowRight, Wand2, Split, AlignJustify } from 'lucide-react';
import { QCIssue } from '../types/lesson.ts';
import { Button } from './Button.tsx';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (sectionKey: string, rewrittenText: string, issueId: string) => void;
  issue: QCIssue | null;
  sectionKey: string;
  originalText: string;
  rewrittenText: string;
}

export const DiffModal: React.FC<DiffModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  issue,
  sectionKey,
  originalText,
  rewrittenText,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  if (!isOpen || !issue) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[var(--surface)] text-[var(--text)] rounded-[10px] max-w-5xl w-full border border-[var(--border)] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-[8px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center">
              <Wand2 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">
                Review Section Rewrite Diff
              </h3>
              <p className="text-[12px] text-[var(--text-muted)]">
                Target Section: <span className="font-semibold text-[var(--green)] font-mono">{issue.location}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex bg-[var(--surface)] border border-[var(--border)] p-0.5 rounded-[6px] text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-[4px] transition-all cursor-pointer ${
                  viewMode === 'split' ? 'bg-[var(--surface-2)] text-[var(--text)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Side by Side</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-[4px] transition-all cursor-pointer ${
                  viewMode === 'unified' ? 'bg-[var(--surface-2)] text-[var(--text)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Unified View</span>
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={<X className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Issue Details summary banner */}
        <div className="px-6 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] text-[13px] text-[var(--text)] space-y-1">
          <p>
            <strong className="text-[var(--text)]">QC Finding: </strong>
            <span className="text-[var(--text-muted)]">{issue.description}</span>
          </p>
          <p>
            <strong className="text-[var(--green)]">Suggested Resolution: </strong>
            <span className="text-[var(--text-muted)]">{issue.suggestedFix}</span>
          </p>
        </div>

        {/* Diff Content Area */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-[13px] leading-relaxed">
          {viewMode === 'split' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* Original Content */}
              <div className="rounded-[8px] border border-[var(--red)] bg-[var(--red-soft)] p-4 flex flex-col">
                <div className="text-[11px] font-mono font-semibold uppercase text-[var(--red)] pb-2 mb-2 border-b border-[var(--red)] flex items-center justify-between">
                  <span>Current (Original)</span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--red)]">Before</span>
                </div>
                <div className="overflow-y-auto flex-1 whitespace-pre-wrap text-[var(--text)]">
                  {originalText}
                </div>
              </div>

              {/* Rewritten Content */}
              <div className="rounded-[8px] border border-[var(--green)] bg-[var(--green-soft)] p-4 flex flex-col">
                <div className="text-[11px] font-mono font-semibold uppercase text-[var(--green)] pb-2 mb-2 border-b border-[var(--green)] flex items-center justify-between">
                  <span>Proposed (AI Rewritten)</span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--green)]">After</span>
                </div>
                <div className="overflow-y-auto flex-1 whitespace-pre-wrap text-[var(--text)]">
                  {rewrittenText}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[8px] border border-[var(--red)] bg-[var(--red-soft)] p-4">
                <div className="text-[11px] font-mono font-semibold uppercase text-[var(--red)] pb-1 mb-2 border-b border-[var(--red)]">
                  Current Section Text
                </div>
                <div className="whitespace-pre-wrap text-[var(--text)]">{originalText}</div>
              </div>

              <div className="flex justify-center text-[var(--green)]">
                <ArrowRight className="w-5 h-5 rotate-90" />
              </div>

              <div className="rounded-[8px] border border-[var(--green)] bg-[var(--green-soft)] p-4">
                <div className="text-[11px] font-mono font-semibold uppercase text-[var(--green)] pb-1 mb-2 border-b border-[var(--green)]">
                  Rewritten Section Text (With QC Fix Applied)
                </div>
                <div className="whitespace-pre-wrap text-[var(--text)]">{rewrittenText}</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
          <span className="text-[12px] text-[var(--text-muted)]">
            Accepting will update the section and create an automatic version backup.
          </span>

          <div className="flex items-center space-x-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              <span>Discard Changes</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => onAccept(sectionKey, rewrittenText, issue.id)}
              icon={<Check className="w-4 h-4" />}
            >
              <span>Accept & Update Section</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
