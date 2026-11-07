/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Search,
  BookOpen,
  ShieldCheck,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { PipelineState, StepStatus, GroundingSource, QCReport } from '../types/lesson.ts';
import { Button } from './Button.tsx';

interface PipelineProgressProps {
  pipelineState: PipelineState;
  rawSources?: GroundingSource[];
  researchGrounded?: boolean;
  qc1Report?: QCReport;
  qc2Report?: QCReport;
  onRetryStep: (stepKey: 'research' | 'generate' | 'qc1' | 'qc2') => void;
  isRunning: boolean;
}

interface StepConfig {
  key: 'research' | 'generate' | 'qc1' | 'qc2';
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: StepConfig[] = [
  {
    key: 'research',
    title: 'Grounded Research',
    subtitle: 'Search Tool Grounding',
    description: 'Researches authoritative websites, specs, books, and YouTube lectures.',
    icon: Search,
  },
  {
    key: 'generate',
    title: 'Structured Lesson',
    subtitle: 'JSON Schema Curriculum',
    description: 'Generates structured sections, timing breakdown, citations, and interactive exercises.',
    icon: BookOpen,
  },
  {
    key: 'qc1',
    title: 'QC Layer 1: Accuracy',
    subtitle: 'Independent Fact Audit',
    description: 'Audits factual claims against live technical references.',
    icon: ShieldCheck,
  },
  {
    key: 'qc2',
    title: 'QC Layer 2: Pedagogy',
    subtitle: 'Instructional Audit',
    description: 'Evaluates pacing, scaffolding clarity, and objective alignment.',
    icon: GraduationCap,
  },
];

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  pipelineState,
  rawSources,
  researchGrounded,
  qc1Report,
  qc2Report,
  onRetryStep,
  isRunning,
}) => {
  const getStatusBadge = (status: StepStatus) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--amber-soft)] text-[var(--amber)] border border-[var(--amber)]">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Running</span>
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green)]">
            <CheckCircle2 className="w-3 h-3" />
            <span>Success</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--red-soft)] text-[var(--red)] border border-[var(--red)]">
            <AlertTriangle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
            Idle
          </span>
        );
    }
  };

  return (
    <div className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] p-5 transition-colors">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">
            Pipeline Execution Progress
          </h3>
          <p className="text-[13px] text-[var(--text-muted)]">
            Search-grounded pipeline steps with dual-layer QC verification.
          </p>
        </div>

        {isRunning && (
          <div className="flex items-center space-x-2 text-[12px] font-mono text-[var(--green)] bg-[var(--green-soft)] px-3 py-1 rounded-[8px] border border-[var(--green)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Processing pipeline...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {STEPS.map((step, idx) => {
          const stepData = pipelineState[step.key];
          const Icon = step.icon;
          const status = stepData.status;

          let cardBorder = 'border-[var(--border)] bg-[var(--surface)]';
          if (status === 'running') cardBorder = 'border-[var(--amber)] bg-[var(--surface-2)]';
          else if (status === 'failed') cardBorder = 'border-[var(--red)] bg-[var(--surface-2)]';
          else if (status === 'success') cardBorder = 'border-[var(--border)] bg-[var(--surface)]';

          return (
            <div
              key={step.key}
              className={`rounded-[10px] border p-4 flex flex-col justify-between transition-all ${cardBorder}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center">
                    <Icon className="w-4 h-4 stroke-[2]" />
                  </div>
                  {getStatusBadge(status)}
                </div>

                <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase mb-0.5">
                  Step {idx + 1}
                </div>
                <h4 className="text-[14px] font-semibold text-[var(--text)] leading-snug">
                  {step.title}
                </h4>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  {step.subtitle}
                </p>
                <p className="text-[13px] text-[var(--text-muted)] mt-2 leading-relaxed">
                  {step.description}
                </p>

                {/* Step specific results preview */}
                {step.key === 'research' && status === 'success' && rawSources && (
                  <div className="mt-3 pt-2 border-t border-[var(--border)] text-[12px] font-mono">
                    <span className="text-[var(--green)] font-semibold">
                      {researchGrounded === false
                        ? `${rawSources.length} Sources (not search-grounded)`
                        : `${rawSources.length} Verified Sources`}
                    </span>
                  </div>
                )}

                {step.key === 'generate' && status === 'success' && (
                  <div className="mt-3 pt-2 border-t border-[var(--border)] text-[12px] font-mono">
                    <span className="text-[var(--green)] font-semibold">8 Modules Structured</span>
                  </div>
                )}

                {step.key === 'qc1' && status === 'success' && qc1Report && (
                  <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[12px] font-mono">
                    <span className="text-[var(--text-muted)]">Accuracy Score:</span>
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded ${
                        qc1Report.overallScore >= 80
                          ? 'bg-[var(--green-soft)] text-[var(--green)]'
                          : qc1Report.overallScore >= 60
                          ? 'bg-[var(--amber-soft)] text-[var(--amber)]'
                          : 'bg-[var(--red-soft)] text-[var(--red)]'
                      }`}
                    >
                      {qc1Report.overallScore}/100
                    </span>
                  </div>
                )}

                {step.key === 'qc2' && status === 'success' && qc2Report && (
                  <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[12px] font-mono">
                    <span className="text-[var(--text-muted)]">Pedagogy Score:</span>
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded ${
                        qc2Report.overallScore >= 80
                          ? 'bg-[var(--green-soft)] text-[var(--green)]'
                          : qc2Report.overallScore >= 60
                          ? 'bg-[var(--amber-soft)] text-[var(--amber)]'
                          : 'bg-[var(--red-soft)] text-[var(--red)]'
                      }`}
                    >
                      {qc2Report.overallScore}/100
                    </span>
                  </div>
                )}

                {/* Error message display if failed */}
                {status === 'failed' && stepData.errorMessage && (
                  <div className="mt-2.5 p-2 rounded-[6px] bg-[var(--red-soft)] border border-[var(--red)] text-[12px] text-[var(--red)] break-words font-mono">
                    {stepData.errorMessage}
                  </div>
                )}
              </div>

              {/* Action buttons (Retry) */}
              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRetryStep(step.key)}
                  disabled={isRunning}
                  className="w-full"
                  icon={<RotateCcw className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                >
                  <span>{status === 'failed' ? 'Retry Step' : 'Re-run Step'}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
