/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from './Button.tsx';

interface ConfirmOverwriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionName: string;
}

export const ConfirmOverwriteModal: React.FC<ConfirmOverwriteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] text-[var(--text)] rounded-[10px] max-w-md w-full border border-[var(--border)] overflow-hidden shadow-2xl">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-[8px] bg-[var(--amber-soft)] text-[var(--amber)] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">
                Instructor Edits Detected
              </h3>
              <p className="text-[12px] font-mono text-[var(--text-muted)]">
                Action: {actionName}
              </p>
            </div>
          </div>

          <p className="text-[14px] text-[var(--text)] leading-relaxed">
            You have made manual instructor edits to this lesson plan. Re-running generation will generate fresh AI content.
          </p>

          <div className="mt-3 p-3 rounded-[8px] bg-[var(--surface-2)] border border-[var(--border)] text-[13px] text-[var(--text-muted)]">
            We will automatically preserve your current draft in <strong>Version History</strong> so you can restore it anytime.
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-end space-x-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            <span>Cancel</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
          >
            <span>Backup & Proceed</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
