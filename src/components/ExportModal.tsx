/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Download,
  FileCode,
  FileText,
  Printer,
  Package,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { LessonData, QCReport, QuestProgress } from '../types/lesson.ts';
import {
  downloadTextFile,
  generateLessonMarkdown,
  generateLessonHtml,
  generateReferencesMarkdown,
  generateQCReportMarkdown,
  downloadAllAsZip,
} from '../utils/markdownExport.ts';
import { Button } from './Button.tsx';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LessonData;
  qc1?: QCReport;
  qc2?: QCReport;
  questProgress?: QuestProgress;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  lesson,
  qc1,
  qc2,
  questProgress,
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [includeProgress, setIncludeProgress] = useState(true);

  if (!isOpen) return null;

  const activeProgress = includeProgress ? questProgress : undefined;
  const slug = lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'lesson';

  const notifySuccess = (name: string) => {
    setDownloadError(null);
    setDownloadSuccess(name);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadLessonMd = () => {
    const content = generateLessonMarkdown(lesson, activeProgress);
    downloadTextFile(`${slug}.md`, content, 'text/markdown');
    notifySuccess('Lesson Markdown (.md)');
  };

  const handleDownloadLessonHtml = () => {
    const content = generateLessonHtml(lesson, activeProgress);
    downloadTextFile(`${slug}.html`, content, 'text/html');
    notifySuccess('Lesson HTML (.html)');
  };

  const handleDownloadLessonJson = () => {
    downloadTextFile(`${slug}.json`, JSON.stringify(lesson, null, 2), 'application/json');
    notifySuccess('Lesson JSON (.json)');
  };

  const handleDownloadReferencesMd = () => {
    const content = generateReferencesMarkdown(lesson.references || []);
    downloadTextFile(`${slug}-references.md`, content, 'text/markdown');
    notifySuccess('References (.md)');
  };

  const handleDownloadReferencesJson = () => {
    downloadTextFile(
      `${slug}-references.json`,
      JSON.stringify(lesson.references || [], null, 2),
      'application/json'
    );
    notifySuccess('References (.json)');
  };

  const handleDownloadQC1Json = () => {
    if (!qc1) return;
    downloadTextFile(
      `${slug}-qc1-factual-accuracy.json`,
      JSON.stringify(qc1, null, 2),
      'application/json'
    );
    notifySuccess('QC 1 Report (.json)');
  };

  const handleDownloadQC1Md = () => {
    if (!qc1) return;
    downloadTextFile(
      `${slug}-qc1-factual-accuracy.md`,
      generateQCReportMarkdown(qc1),
      'text/markdown'
    );
    notifySuccess('QC 1 Report (.md)');
  };

  const handleDownloadQC2Json = () => {
    if (!qc2) return;
    downloadTextFile(
      `${slug}-qc2-instructional-quality.json`,
      JSON.stringify(qc2, null, 2),
      'application/json'
    );
    notifySuccess('QC 2 Report (.json)');
  };

  const handleDownloadQC2Md = () => {
    if (!qc2) return;
    downloadTextFile(
      `${slug}-qc2-instructional-quality.md`,
      generateQCReportMarkdown(qc2),
      'text/markdown'
    );
    notifySuccess('QC 2 Report (.md)');
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      await downloadAllAsZip({ lesson, qc1, qc2, questProgress: activeProgress });
      notifySuccess('Complete ZIP Archive');
    } catch (e) {
      console.error('Failed to create ZIP:', e);
      setDownloadError(e instanceof Error ? e.message : 'Failed to create the ZIP archive.');
    } finally {
      setIsZipping(false);
    }
  };

  const handlePrint = () => {
    const html = generateLessonHtml(lesson, activeProgress);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] text-[var(--text)] rounded-[10px] max-w-2xl w-full border border-[var(--border)] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-[8px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center">
              <Download className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">
                Export Lesson & QC Reports
              </h3>
              <p className="text-[13px] text-[var(--text-muted)]">
                Download individual formats or all assets bundled in a ZIP archive.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X className="w-4 h-4" />}
          />
        </div>

        {/* Success toast */}
        {downloadSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-[8px] bg-[var(--green-soft)] border border-[var(--green)] text-[13px] font-mono font-medium text-[var(--green)] flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Downloaded: {downloadSuccess}</span>
          </div>
        )}
        {downloadError && (
          <div className="mx-6 mt-4 p-3 rounded-[8px] bg-[var(--red-soft)] border border-[var(--red)] text-[13px] text-[var(--red)]">
            {downloadError} Use the ZIP button to retry.
          </div>
        )}

        {/* Content sections */}
        <div className="p-6 space-y-6">
          {/* Quest Progress Toggle option */}
          {questProgress && (
            <label className="flex items-center space-x-2.5 p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] text-[var(--text)] cursor-pointer hover:border-[var(--green)] transition-colors select-none">
              <input
                type="checkbox"
                checked={includeProgress}
                onChange={(e) => setIncludeProgress(e.target.checked)}
                className="rounded accent-[var(--green)]"
              />
              <span className="font-medium text-[var(--text)]">
                Include Quest Map Progress & Quiz Score ({questProgress.completedNodeIds.length}/8 completed, score: {lesson.sections.knowledgeCheck.questions.length
                  ? Math.round((questProgress.quizScore / lesson.sections.knowledgeCheck.questions.length) * 100)
                  : 0}%)
              </span>
            </label>
          )}

          {/* Bundle ZIP Banner */}
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-[14px] font-semibold text-[var(--text)] flex items-center space-x-2">
                <Package className="w-4 h-4 text-[var(--green)]" />
                <span>Complete Lesson & QC Bundle (ZIP)</span>
              </h4>
              <p className="text-[13px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                Includes lesson (.md, .html, .json), references (.md, .json), and QC reports (.md, .json).
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadZip}
              disabled={isZipping}
              icon={isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            >
              <span>{isZipping ? 'Packaging ZIP...' : 'Download All as ZIP'}</span>
            </Button>
          </div>

          {/* Group 1: Lesson Plan */}
          <div>
            <h4 className="text-[11px] font-mono uppercase text-[var(--text-muted)] mb-2">
              1. Finalized Lesson Plan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadLessonMd}
                className="flex items-center space-x-2.5 p-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--green)] hover:bg-[var(--surface-2)] text-left transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[var(--green)] shrink-0" />
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">Markdown (.md)</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Curriculum format</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadLessonHtml}
                className="flex items-center space-x-2.5 p-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--green)] hover:bg-[var(--surface-2)] text-left transition-colors cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-[var(--green)] shrink-0" />
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">HTML (.html)</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Standalone document</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center space-x-2.5 p-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--green)] hover:bg-[var(--surface-2)] text-left transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[var(--green)] shrink-0" />
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">Print / PDF</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Print-friendly layout</div>
                </div>
              </button>
            </div>
          </div>

          {/* Group 2: References & Citations */}
          <div>
            <h4 className="text-[11px] font-mono uppercase text-[var(--text-muted)] mb-2">
              2. Traceable Grounded References
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadReferencesMd}
                className="flex items-center space-x-2.5 p-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--green)] hover:bg-[var(--surface-2)] text-left transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[var(--green)] shrink-0" />
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">References (.md)</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Human-readable catalog</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadReferencesJson}
                className="flex items-center space-x-2.5 p-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--green)] hover:bg-[var(--surface-2)] text-left transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[var(--green)] shrink-0" />
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">References (.json)</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Structured data catalog</div>
                </div>
              </button>
            </div>
          </div>

          {/* Group 3: QC Reports */}
          <div>
            <h4 className="text-[11px] font-mono uppercase text-[var(--text-muted)] mb-2">
              3. Independent Quality Control (QC) Reports
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-2 p-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)]">
                <div className="text-[13px] font-semibold text-[var(--text)]">QC 1: Factual Accuracy</div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownloadQC1Md}
                    disabled={!qc1}
                  >
                    <span>Download .md</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownloadQC1Json}
                    disabled={!qc1}
                  >
                    <span>Download .json</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)]">
                <div className="text-[13px] font-semibold text-[var(--text)]">QC 2: Instructional Quality</div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownloadQC2Md}
                    disabled={!qc2}
                  >
                    <span>Download .md</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownloadQC2Json}
                    disabled={!qc2}
                  >
                    <span>Download .json</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-2)] flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            <span>Close</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
