/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { GroundingSource } from '../types/lesson.ts';
import { CitationPopover } from './CitationPopover.tsx';

interface MarkdownContentProps {
  content: string;
  sources?: GroundingSource[];
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  sources = [],
  className = '',
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch (error) {
      console.error('Failed to copy code to clipboard:', error);
    }
  };

  // Helper to map [Source N] in inline text to CitationPopover
  const renderInlineTextWithCitations = (text: string) => {
    const parts = text.split(/(\[Source\s*\d+\])/gi);

    return parts.map((part, index) => {
      const match = part.match(/\[Source\s*(\d+)\]/i);
      if (match) {
        const sourceIndex = parseInt(match[1], 10);
        const sourceObj = sources.find((s) => s.index === sourceIndex);
        return (
          <CitationPopover key={index} sourceIndex={sourceIndex} source={sourceObj}>
            Source {sourceIndex}
          </CitationPopover>
        );
      }

      // Handle bold text **bold**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      if (boldParts.length > 1) {
        return (
          <React.Fragment key={index}>
            {boldParts.map((bPart, bIdx) => {
              if (bPart.startsWith('**') && bPart.endsWith('**')) {
                return (
                  <strong key={bIdx} className="font-semibold text-[var(--text)]">
                    {bPart.slice(2, -2)}
                  </strong>
                );
              }
              return renderInlineCode(bPart, `${index}-${bIdx}`);
            })}
          </React.Fragment>
        );
      }

      return renderInlineCode(part, index.toString());
    });
  };

  const renderInlineCode = (text: string, keyPrefix: string) => {
    const codeParts = text.split(/(`[^`]+`)/g);
    if (codeParts.length <= 1) {
      return <span key={keyPrefix}>{text}</span>;
    }

    return (
      <React.Fragment key={keyPrefix}>
        {codeParts.map((cPart, cIdx) => {
          if (cPart.startsWith('`') && cPart.endsWith('`')) {
            return (
              <code
                key={cIdx}
                className="px-1.5 py-0.5 rounded text-[13px] font-mono bg-[var(--surface-2)] text-[var(--green)] border border-[var(--border)]"
              >
                {cPart.slice(1, -1)}
              </code>
            );
          }
          return <span key={cIdx}>{cPart}</span>;
        })}
      </React.Fragment>
    );
  };

  // Split into blocks: code blocks, tables, headers, lists, paragraphs
  const lines = (content || '').split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockBuffer: string[] = [];
  let tableBuffer: string[] = [];

  const flushTable = (key: string) => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim())
    );

    if (rows.length >= 2) {
      const headerRow = rows[0];
      const dataRows = rows.slice(2); // Skip separator row

      elements.push(
        <div key={key} className="overflow-x-auto my-4 rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[var(--text)] font-semibold">
              <tr>
                {headerRow.map((cell, idx) => (
                  <th key={idx} className="px-4 py-2.5">
                    {renderInlineTextWithCitations(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)] text-[var(--text)]">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[var(--surface-2)] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2.5">
                      {renderInlineTextWithCitations(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block start/end
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const fullCode = codeBlockBuffer.join('\n');
        const blockId = `code-block-${elements.length}`;
        const isCopied = copiedCodeId === blockId;

        elements.push(
          <div
            key={blockId}
            className="my-4 rounded-[10px] overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-[13px] font-mono shadow-xs"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] text-[11px] text-[var(--text-muted)]">
              <span className="font-semibold uppercase font-mono tracking-wider">
                {codeBlockLang || 'code'}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(fullCode, blockId)}
                className="inline-flex items-center space-x-1 px-2 py-1 rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] transition-colors cursor-pointer"
                title="Copy code"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--green)]" />
                    <span className="text-[var(--green)] font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto leading-relaxed">
              <code>{fullCode}</code>
            </pre>
          </div>
        );

        codeBlockBuffer = [];
        inCodeBlock = false;
        codeBlockLang = '';
        continue;
      } else {
        // Start code block
        flushTable(`table-before-code-${i}`);
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, '').trim();
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Table detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      tableBuffer.push(line);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable(`table-${i}`);
    }

    // Headers per typography scale: 20px/600, 16px/600, -0.01em
    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-[16px] font-semibold text-[var(--text)] mt-5 mb-2 tracking-tight"
        >
          {renderInlineTextWithCitations(line.replace('### ', ''))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-[20px] font-semibold text-[var(--text)] mt-6 mb-2 tracking-tight border-b border-[var(--border)] pb-1"
        >
          {renderInlineTextWithCitations(line.replace('## ', ''))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-[24px] font-semibold text-[var(--text)] mt-6 mb-3 tracking-tight"
        >
          {renderInlineTextWithCitations(line.replace('# ', ''))}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-3 pl-4 border-l-2 border-[var(--green)] italic text-[var(--text-muted)] bg-[var(--surface-2)] py-2 pr-3 rounded-r-[8px] text-[14px]"
        >
          {renderInlineTextWithCitations(line.replace('> ', ''))}
        </blockquote>
      );
      continue;
    }

    // List item
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <li
          key={`li-${i}`}
          className="ml-5 list-disc text-[var(--text)] text-[15px] my-1 leading-[1.65]"
        >
          {renderInlineTextWithCitations(line.trim().replace(/^[-*]\s+/, ''))}
        </li>
      );
      continue;
    }

    // Numbered list item
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start space-x-2 my-1.5 text-[15px] text-[var(--text)] leading-[1.65]">
          <span className="font-mono font-medium text-[var(--green)] shrink-0">
            {numMatch[1]}.
          </span>
          <div className="flex-1 leading-[1.65]">
            {renderInlineTextWithCitations(numMatch[2])}
          </div>
        </div>
      );
      continue;
    }

    // Normal paragraph: body 15px/400 with line-height 1.65
    if (line.trim().length > 0) {
      elements.push(
        <p
          key={`p-${i}`}
          className="text-[15px] font-normal text-[var(--text)] my-2.5 leading-[1.65]"
        >
          {renderInlineTextWithCitations(line)}
        </p>
      );
    }
  }

  // Flush any trailing table
  flushTable('table-end');

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
