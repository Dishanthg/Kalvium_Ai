/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, History, RotateCcw, Clock } from 'lucide-react';
import { LessonVersion } from '../types/lesson.ts';
import { Button } from './Button.tsx';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: LessonVersion[];
  onRestoreVersion: (version: LessonVersion) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  onRestoreVersion,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] text-[var(--text)] rounded-[10px] max-w-lg w-full border border-[var(--border)] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-[8px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center">
              <History className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">Version History</h3>
              <p className="text-[13px] text-[var(--text-muted)]">Automated and manual snapshots</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X className="w-4 h-4" />}
          />
        </div>

        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-[13px]">
              No previous versions recorded yet. Edits and rewrites will create automated snapshots.
            </div>
          ) : (
            versions.map((ver, idx) => (
              <div
                key={ver.id || idx}
                className="p-3.5 rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--green)] transition-all flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[12px] font-mono font-semibold text-[var(--green)]">
                      v{versions.length - idx}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]">
                      {ver.label || 'Saved Snapshot'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[var(--text-muted)] mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(ver.timestamp).toLocaleString()}</span>
                    <span>• {ver.lesson.totalMinutes} min</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRestoreVersion(ver)}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  <span>Restore</span>
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-2)] flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            <span>Done</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
