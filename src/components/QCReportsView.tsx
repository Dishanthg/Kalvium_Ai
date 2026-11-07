/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Wand2,
  Edit,
  Loader2,
  Calendar,
} from 'lucide-react';
import { QCReport, QCIssue, QCSeverity } from '../types/lesson.ts';
import { Button } from './Button.tsx';

interface QCReportsViewProps {
  qc1Report?: QCReport;
  qc2Report?: QCReport;
  onApplySuggestion: (issue: QCIssue, layer: 'qc1' | 'qc2') => void;
  onDismissIssue: (issueId: string, layer: 'qc1' | 'qc2') => void;
  onEditManually: (location: string) => void;
  applyingIssueId?: string | null;
}

export const QCReportsView: React.FC<QCReportsViewProps> = ({
  qc1Report,
  qc2Report,
  onApplySuggestion,
  onDismissIssue,
  onEditManually,
  applyingIssueId,
}) => {
  const [activeLayer, setActiveLayer] = useState<'qc1' | 'qc2'>('qc1');

  const currentReport = activeLayer === 'qc1' ? qc1Report : qc2Report;

  const getSeverityBadge = (severity: QCSeverity) => {
    switch (severity) {
      case 'High':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[var(--red-soft)] text-[var(--red)] border border-[var(--red)]">
            <AlertOctagon className="w-3 h-3" />
            <span>High Severity</span>
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[var(--amber-soft)] text-[var(--amber)] border border-[var(--amber)]">
            <AlertTriangle className="w-3 h-3" />
            <span>Medium Severity</span>
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
            <Info className="w-3 h-3" />
            <span>Low Severity</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green)]">
            <CheckCircle className="w-3 h-3" />
            <span>Applied & Rewritten</span>
          </span>
        );
      case 'dismissed':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
            <XCircle className="w-3 h-3" />
            <span>Dismissed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[var(--amber-soft)] text-[var(--amber)] border border-[var(--amber)]">
            <AlertTriangle className="w-3 h-3" />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-[var(--surface)] text-[var(--text)] rounded-[10px] border border-[var(--border)] overflow-hidden transition-colors">
      {/* Top Layer Switcher Tabs */}
      <div className="bg-[var(--surface-2)] border-b border-[var(--border)] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-1 space-x-1">
          <button
            type="button"
            onClick={() => setActiveLayer('qc1')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-[6px] text-[13px] font-semibold transition-all cursor-pointer ${
              activeLayer === 'qc1'
                ? 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[var(--green)]" />
            <span>QC Layer 1: Accuracy</span>
            {qc1Report && (
              <span className="ml-1 px-1.5 py-0.2 rounded font-mono text-[11px] bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]">
                {qc1Report.issues.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveLayer('qc2')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-[6px] text-[13px] font-semibold transition-all cursor-pointer ${
              activeLayer === 'qc2'
                ? 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-[var(--green)]" />
            <span>QC Layer 2: Pedagogy</span>
            {qc2Report && (
              <span className="ml-1 px-1.5 py-0.2 rounded font-mono text-[11px] bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]">
                {qc2Report.issues.length}
              </span>
            )}
          </button>
        </div>

        <div className="text-[12px] font-mono text-[var(--text-muted)] hidden sm:block">
          Dual independent audit reports
        </div>
      </div>

      {/* Active Report Header / Score */}
      {!currentReport ? (
        <div className="p-10 text-center text-[var(--text-muted)]">
          <p className="text-[14px] font-medium">No report generated yet for this QC layer.</p>
          <p className="text-[12px] mt-1">Run the pipeline above to execute this audit.</p>
        </div>
      ) : (
        <div className="p-5 sm:p-6 space-y-6">
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">
                {activeLayer === 'qc1'
                  ? 'Factual & Source Verification Audit'
                  : 'Pedagogical & Instructional Pacing Audit'}
              </h3>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed max-w-2xl">
                {currentReport.summary}
              </p>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-[var(--text-muted)] pt-1">
                <Calendar className="w-3 h-3" />
                <span>Audited on {new Date(currentReport.evaluatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Score box */}
            <div className="flex items-center space-x-3 self-start md:self-auto shrink-0 bg-[var(--surface)] px-4 py-3 rounded-[8px] border border-[var(--border)]">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                  Audit Score
                </div>
                <div
                  className={`text-[24px] font-mono font-semibold ${
                    currentReport.overallScore >= 80
                      ? 'text-[var(--green)]'
                      : currentReport.overallScore >= 65
                      ? 'text-[var(--amber)]'
                      : 'text-[var(--red)]'
                  }`}
                >
                  {currentReport.overallScore}
                  <span className="text-[12px] font-mono text-[var(--text-muted)]">/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h4 className="text-[14px] font-semibold text-[var(--text)]">
                Identified Findings & Suggestions ({currentReport.issues.length})
              </h4>
              <span className="text-[12px] text-[var(--text-muted)]">
                Apply fixes with before/after diff review or dismiss.
              </span>
            </div>

            {currentReport.issues.length === 0 ? (
              <div className="p-6 text-center text-[var(--text-muted)] bg-[var(--surface-2)] rounded-[10px] border border-[var(--border)]">
                <CheckCircle className="w-8 h-8 text-[var(--green)] mx-auto mb-2" />
                <p className="text-[14px] font-semibold text-[var(--text)]">No issues flagged</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  The lesson successfully satisfied all audit criteria for this layer.
                </p>
              </div>
            ) : (
              currentReport.issues.map((issue) => {
                const isApplying = applyingIssueId === issue.id;

                return (
                  <div
                    key={issue.id}
                    className={`rounded-[10px] border p-4 sm:p-5 transition-all bg-[var(--surface)] border-[var(--border)] ${
                      issue.status === 'applied'
                        ? 'opacity-80'
                        : issue.status === 'dismissed'
                        ? 'opacity-50'
                        : ''
                    }`}
                  >
                    {/* Issue Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--border)]">
                      <div className="flex items-center space-x-2">
                        {getSeverityBadge(issue.severity)}
                        <span className="text-[11px] font-mono text-[var(--text)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border)]">
                          Location: {issue.location}
                        </span>
                      </div>
                      <div>{getStatusBadge(issue.status)}</div>
                    </div>

                    {/* Issue Body */}
                    <div className="space-y-2.5 text-[14px]">
                      <div>
                        <span className="font-semibold text-[var(--text)]">Issue: </span>
                        <span className="text-[var(--text)]">{issue.description}</span>
                      </div>

                      <div className="bg-[var(--surface-2)] p-3 rounded-[8px] border border-[var(--border)] space-y-1 text-[13px]">
                        <div>
                          <strong className="text-[var(--text)]">Evidence / Verified Fact: </strong>
                          <span className="text-[var(--text-muted)]">{issue.evidence}</span>
                        </div>
                        <div>
                          <strong className="text-[var(--green)]">Suggested Action: </strong>
                          <span className="text-[var(--text-muted)]">{issue.suggestedFix}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEditManually(issue.location)}
                        icon={<Edit className="w-3.5 h-3.5" />}
                      >
                        <span>Edit Manually</span>
                      </Button>

                      {issue.status !== 'dismissed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDismissIssue(issue.id, activeLayer)}
                          icon={<XCircle className="w-3.5 h-3.5" />}
                        >
                          <span>Dismiss</span>
                        </Button>
                      )}

                      {issue.status !== 'applied' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onApplySuggestion(issue, activeLayer)}
                          disabled={isApplying}
                          icon={isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                        >
                          <span>{isApplying ? 'Rewriting Section...' : 'Apply Suggestion (Diff Preview)'}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
