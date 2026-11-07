/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, FolderOpen, Trash2, ArrowRight, PlusCircle, Calendar } from 'lucide-react';
import { LessonSummary } from '../services/storageService.ts';
import { Button } from './Button.tsx';

interface SavedLessonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: LessonSummary[];
  currentLessonId: string;
  onOpenLesson: (id: string) => void;
  onDeleteLesson: (id: string) => void;
  onCreateNew: () => void;
}

export const SavedLessonsModal: React.FC<SavedLessonsModalProps> = ({
  isOpen,
  onClose,
  lessons,
  currentLessonId,
  onOpenLesson,
  onDeleteLesson,
  onCreateNew,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] text-[var(--text)] rounded-[10px] max-w-xl w-full border border-[var(--border)] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-[8px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text)] tracking-tight">Saved Lessons Library</h3>
              <p className="text-[13px] text-[var(--text-muted)]">Manage and switch between your curriculum drafts</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onCreateNew();
                onClose();
              }}
              icon={<PlusCircle className="w-3.5 h-3.5" />}
            >
              <span>Create New</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={<X className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* List */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {lessons.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-[13px]">
              No saved lessons found. Click "Create New" to begin.
            </div>
          ) : (
            lessons.map((item) => {
              const isCurrent = item.id === currentLessonId;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-[8px] border transition-all flex items-start justify-between gap-3 bg-[var(--surface-2)] ${
                    isCurrent
                      ? 'border-[var(--green)] shadow-xs'
                      : 'border-[var(--border)] hover:border-[var(--green)]'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-[14px] font-semibold text-[var(--text)] truncate">
                        {item.title || 'Untitled Lesson'}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green)] shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--text-muted)] line-clamp-1">
                      {item.learningObjective}
                    </p>
                    <div className="flex items-center space-x-2 text-[11px] font-mono text-[var(--text-muted)] pt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <Button
                      variant={isCurrent ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => {
                        onOpenLesson(item.id);
                        onClose();
                      }}
                      icon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      <span>{isCurrent ? 'Viewing' : 'Open'}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteLesson(item.id)}
                      icon={<Trash2 className="w-3.5 h-3.5 text-[var(--red)]" />}
                      title="Delete lesson"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-2)] flex justify-end">
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
