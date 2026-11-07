/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Book, Globe, Video, X } from 'lucide-react';
import { GroundingSource } from '../types/lesson.ts';

interface CitationPopoverProps {
  sourceIndex: number;
  source?: GroundingSource;
  children: React.ReactNode;
}

export const CitationPopover: React.FC<CitationPopoverProps> = ({
  sourceIndex,
  source,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);

  // Close on outside click or Esc
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'book':
        return <Book className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
      case 'youtube':
        return <Video className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
    }
  };

  return (
    <span ref={containerRef} className="relative inline-block align-baseline">
      {/* Neutral pill (--surface-2, --text) with a green number per spec */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={source ? `[Source ${sourceIndex}]: ${source.title}` : `Source ${sourceIndex}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 text-[12px] font-mono font-medium rounded-full bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--green)] transition-colors cursor-pointer select-none"
      >
        <span>Source</span>
        <span className="text-[var(--green)] font-semibold">{sourceIndex}</span>
      </button>

      {isOpen && (
        <span
          ref={popoverRef}
          role="dialog"
          aria-label={`Citation details for Source ${sourceIndex}`}
          onMouseLeave={() => setIsOpen(false)}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] shadow-xl text-left text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          <span className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-[var(--border)]">
            <span className="flex items-center space-x-1.5">
              {getTypeIcon(source?.type)}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
                {source?.type || 'Reference'}
              </span>
              <span className="font-mono text-[10px] text-[var(--green)] font-semibold">#{sourceIndex}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>

          <span className="block font-semibold text-[14px] text-[var(--text)] line-clamp-2 leading-snug">
            {source ? source.title : `Grounded Source Reference #${sourceIndex}`}
          </span>

          {source?.claim && (
            <span className="mt-2 p-2 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] block">
              <span className="block text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider mb-0.5">
                Claim Supported
              </span>
              <span className="block text-[12px] text-[var(--text)] leading-relaxed italic">
                "{source.claim}"
              </span>
            </span>
          )}

          {source?.notes && (
            <span className="block mt-1.5 text-[11px] text-[var(--text-muted)]">
              {source.notes}
            </span>
          )}

          {source?.url && (
            <span className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[var(--text-muted)] truncate max-w-[170px]">
                {source.url.replace(/^https?:\/\//, '')}
              </span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs font-semibold text-[var(--green)] hover:underline"
              >
                <span>Visit source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </span>
          )}

          {/* Pointer triangle */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[var(--surface)] border-r border-b border-[var(--border)] transform rotate-45" />
        </span>
      )}
    </span>
  );
};
