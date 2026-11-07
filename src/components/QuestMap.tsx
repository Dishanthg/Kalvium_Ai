/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen,
  Code2,
  Briefcase,
  PlaySquare,
  HelpCircle,
  BookmarkCheck,
  Link2,
  Video,
  Globe,
  Award,
  Lock,
  Check,
  Clock,
  Compass,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  UserCheck,
  GraduationCap,
  Flag,
} from 'lucide-react';
import { LessonData, QCReport, QCIssue, QuestProgress } from '../types/lesson.ts';
import { createDefaultQuestProgress, loadQuestProgress, saveQuestProgress } from '../services/storageService.ts';
import { NodeDrawer } from './NodeDrawer.tsx';
import { Button } from './Button.tsx';

interface QuestMapProps {
  lesson: LessonData;
  lessonId: string;
  qc1Report?: QCReport;
  qc2Report?: QCReport;
  onJumpToEditor?: (sectionKey: string) => void;
  onOpenExport?: () => void;
  onOpenQCReport?: () => void;
}

interface MapNodeDef {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  minutes: number;
  icon: React.ElementType;
  sectionKey?: string;
}

export const QuestMap: React.FC<QuestMapProps> = ({
  lesson,
  lessonId,
  qc1Report,
  qc2Report,
  onJumpToEditor,
  onOpenExport,
  onOpenQCReport,
}) => {
  const s = lesson.sections;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(960);
  const [viewportWidth, setViewportWidth] = useState<number>(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ResizeObserver to dynamically update node and SVG coordinates
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isMobile = containerWidth < 768;
  const useCompactBonusLayout = viewportWidth < 1100;

  // Local state for quest progress
  const [progress, setProgress] = useState<QuestProgress>(() => loadQuestProgress(lessonId));

  // Persist progress to localStorage whenever it changes
  useEffect(() => {
    saveQuestProgress(lessonId, progress);
  }, [progress, lessonId]);

  // Drawer modal state
  const [activeDrawerNodeId, setActiveDrawerNodeId] = useState<string | null>(null);
  const [focusedNodeIdx, setFocusedNodeIdx] = useState<number>(0);

  // Main Nodes definition
  const mainNodes: MapNodeDef[] = useMemo(
    () => [
      {
        id: 'introduction',
        title: s.introduction?.title || 'Introduction & Learning Objective',
        shortTitle: 'Introduction',
        subtitle: 'Foundations & Objectives',
        minutes: s.introduction?.minutes || 5,
        icon: BookOpen,
        sectionKey: 'introduction',
      },
      {
        id: 'coreConcepts',
        title: s.coreConcepts?.title || 'Core Concept Explanations',
        shortTitle: 'Core Concepts',
        subtitle: 'Theoretical Deep Dive',
        minutes: s.coreConcepts?.minutes || 15,
        icon: GraduationCap,
        sectionKey: 'coreConcepts',
      },
      {
        id: 'workedExamples',
        title: s.workedExamples?.title || 'Worked Examples',
        shortTitle: 'Worked Examples',
        subtitle: 'Code & Architecture walkthrough',
        minutes: s.workedExamples?.minutes || 10,
        icon: Code2,
        sectionKey: 'workedExamples',
      },
      {
        id: 'practicalApplications',
        title: s.practicalApplications?.title || 'Practical Applications',
        shortTitle: 'Applications',
        subtitle: 'Real-world production patterns',
        minutes: s.practicalApplications?.minutes || 5,
        icon: Briefcase,
        sectionKey: 'practicalApplications',
      },
      {
        id: 'handsOnActivity',
        title: s.handsOnActivity?.title || 'Hands-on Activity',
        shortTitle: 'Hands-on Activity',
        subtitle: 'Guided interactive exercise',
        minutes: s.handsOnActivity?.minutes || 5,
        icon: PlaySquare,
        sectionKey: 'handsOnActivity',
      },
      {
        id: 'knowledgeCheck',
        title: s.knowledgeCheck?.title || 'Knowledge Check Diagnostic',
        shortTitle: 'Knowledge Check',
        subtitle: 'Formative quiz evaluation',
        minutes: s.knowledgeCheck?.minutes || 3,
        icon: HelpCircle,
        sectionKey: 'knowledgeCheck',
      },
      {
        id: 'summary',
        title: s.summary?.title || 'Summary & Key Takeaways',
        shortTitle: 'Summary',
        subtitle: 'Essential takeaways & review',
        minutes: s.summary?.minutes || 2,
        icon: BookmarkCheck,
        sectionKey: 'summary',
      },
      {
        id: 'references',
        title: 'References & Specifications',
        shortTitle: 'References',
        subtitle: 'Grounded citation index',
        minutes: 0,
        icon: Link2,
        sectionKey: 'references',
      },
    ],
    [s]
  );

  // Check if a node is unlocked
  const isNodeUnlocked = (nodeId: string, nodeIdx: number): boolean => {
    if (progress.mode === 'instructor' || progress.freeExplore) return true;
    if (nodeIdx === 0) return true;
    const prevNodeId = mainNodes[nodeIdx - 1]?.id;
    return progress.completedNodeIds.includes(prevNodeId);
  };

  // Mark node completed
  const handleMarkComplete = (nodeId: string) => {
    setProgress((prev) => {
      const nextCompleted = prev.completedNodeIds.includes(nodeId)
        ? prev.completedNodeIds
        : [...prev.completedNodeIds, nodeId];

      const currentIdx = mainNodes.findIndex((n) => n.id === nodeId);
      const nextNode = mainNodes[currentIdx + 1];

      return {
        ...prev,
        completedNodeIds: nextCompleted,
        activeNodeId: nextNode ? nextNode.id : prev.activeNodeId,
      };
    });
  };

  // Toggle Learner vs Instructor mode
  const handleToggleMode = () => {
    setProgress((prev) => ({
      ...prev,
      mode: prev.mode === 'learner' ? 'instructor' : 'learner',
      freeExplore: prev.mode === 'learner' ? true : prev.freeExplore,
    }));
  };

  // Toggle Free Explore
  const handleToggleFreeExplore = () => {
    setProgress((prev) => ({
      ...prev,
      freeExplore: !prev.freeExplore,
    }));
  };

  // Reset progress
  const handleResetProgress = () => {
    if (window.confirm('Reset your Quest progress for this lesson?')) {
      const fresh: QuestProgress = {
        ...createDefaultQuestProgress(),
        freeExplore: progress.mode === 'instructor',
        mode: progress.mode,
      };
      setProgress(fresh);
      saveQuestProgress(lessonId, fresh);
    }
  };

  // Quiz Answer saving
  const handleSaveQuizAnswer = (qId: string, answer: string) => {
    setProgress((prev) => {
      const updatedAnswers = { ...prev.quizAnswers, [qId]: answer };
      const questions = lesson.sections.knowledgeCheck?.questions || [];
      const score = questions.filter((q) => updatedAnswers[q.id] === q.correctAnswer).length;

      return {
        ...prev,
        quizAnswers: updatedAnswers,
        quizScore: score,
      };
    });
  };

  // Activity step toggle
  const handleToggleActivityStep = (stepId: string) => {
    setProgress((prev) => ({
      ...prev,
      activityTickedSteps: {
        ...prev.activityTickedSteps,
        [stepId]: !prev.activityTickedSteps[stepId],
      },
    }));
  };

  // Gather QC issues for a section
  const getQCIssuesForNode = (sectionKey?: string): QCIssue[] => {
    if (!sectionKey) return [];
    const issues: QCIssue[] = [];
    (qc1Report?.issues || []).forEach((issue) => {
      if (issue.location.toLowerCase().includes(sectionKey.toLowerCase())) {
        issues.push(issue);
      }
    });
    (qc2Report?.issues || []).forEach((issue) => {
      if (issue.location.toLowerCase().includes(sectionKey.toLowerCase())) {
        issues.push(issue);
      }
    });
    return issues;
  };

  // Keyboard navigation across nodes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeDrawerNodeId) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedNodeIdx((prev) => Math.min(mainNodes.length, prev + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedNodeIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedNodeIdx < mainNodes.length) {
          const targetNode = mainNodes[focusedNodeIdx];
          if (isNodeUnlocked(targetNode.id, focusedNodeIdx)) {
            setActiveDrawerNodeId(targetNode.id);
          }
        } else {
          setActiveDrawerNodeId('finish');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawerNodeId, focusedNodeIdx, mainNodes, progress.completedNodeIds, progress.freeExplore]);

  // Calculations for progress bar
  const totalSteps = mainNodes.length;
  const completedCount = mainNodes.filter((n) =>
    progress.completedNodeIds.includes(n.id)
  ).length;

  const completedMinutes = mainNodes
    .filter((n) => progress.completedNodeIds.includes(n.id))
    .reduce((acc, curr) => acc + curr.minutes, 0);

  const totalLessonMinutes = lesson.totalMinutes || 45;

  // Grade badge text: if "Select the grade (auto)" or empty, hide
  const rawGrade = lesson.gradeLevel || '';
  const displayGrade =
    rawGrade && !rawGrade.toLowerCase().includes('select') && !rawGrade.toLowerCase().includes('auto')
      ? rawGrade
      : null;

  // -------------------------------------------------------------
  // EXACT GEOMETRY COMPUTATION PER SPEC:
  // Node width = 320, height = 88.
  // Node i has y = i * 150 + 50.
  // Alternates: left = center - 170, right = center + 170
  // -------------------------------------------------------------
  const NODE_WIDTH = isMobile ? Math.min(320, containerWidth - 32) : 320;
  const NODE_HEIGHT = 88;
  const START_Y = 50;
  const ROW_PITCH = 150;
  const center = containerWidth / 2;

  // Compute (x, y) center and top-left for each main node
  const nodeLayouts = useMemo(() => {
    return mainNodes.map((_, i) => {
      let nodeCenterX = center;
      if (!isMobile) {
        nodeCenterX = i % 2 === 0 ? center - 170 : center + 170;
      }
      const nodeCenterY = START_Y + i * ROW_PITCH + NODE_HEIGHT / 2;
      const left = nodeCenterX - NODE_WIDTH / 2;
      const top = START_Y + i * ROW_PITCH;
      return { nodeCenterX, nodeCenterY, left, top };
    });
  }, [mainNodes, center, isMobile, NODE_WIDTH]);

  // Finish node layout
  const finishNodeTop = START_Y + mainNodes.length * ROW_PITCH;
  const finishNodeCenterX = center;
  const finishNodeLeft = center - NODE_WIDTH / 2;

  // Total canvas height with ample bottom padding
  const totalCanvasHeight = finishNodeTop + NODE_HEIGHT + 60;

  // Bonus nodes layout (desktop side gutters)
  // Left bonus at center - 440px, right bonus at center + 440px
  const BONUS_WIDTH = 200;
  const BONUS_HEIGHT = 72;
  const bonusLeftX = center - 440;
  const bonusRightX = center + 440;
  // Position bonus nodes vertically aligned near the middle of lesson (nodes 2 & 3)
  const bonusVideosY = START_Y + 1 * ROW_PITCH + 10;
  const bonusSourcesY = START_Y + 3 * ROW_PITCH + 10;

  return (
    <div
      role="region"
      aria-label="Lesson Quest Map"
      className="space-y-6 w-full max-w-5xl mx-auto select-none"
    >
      {/* 1. Quest Top Header & Status Bar */}
      <div className="bg-[var(--surface)] rounded-[10px] border border-[var(--border)] p-5 sm:p-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[12px] font-mono bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green)]">
                <Compass className="w-3.5 h-3.5" />
                <span>Lesson Quest Map</span>
              </span>

              {lesson.language && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
                  {lesson.language === 'Hindi' ? 'Hindi (हिन्दी)' : 'English'}
                </span>
              )}

              {displayGrade && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
                  Grade: {displayGrade}
                </span>
              )}

              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-mono bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]">
                <Clock className="w-3 h-3 mr-1 text-[var(--text-muted)]" />
                <span>
                  {completedMinutes} of {totalLessonMinutes} min completed
                </span>
              </span>
            </div>

            <h2 className="text-[20px] font-semibold text-[var(--text)] tracking-tight leading-snug">
              {lesson.title}
            </h2>

            <p className="text-[14px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
              {lesson.learningObjective}
            </p>
          </div>

          {/* Mode & Exploration Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <Button
              variant={progress.mode === 'instructor' ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleToggleMode}
              icon={progress.mode === 'instructor' ? <UserCheck className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
              title="Toggle Learner or Instructor view"
            >
              <span>{progress.mode === 'instructor' ? 'Instructor Mode' : 'Learner Mode'}</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleFreeExplore}
              title="Toggle sequential locking"
            >
              <span>Free Explore: {progress.freeExplore ? 'ON' : 'OFF'}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetProgress}
              title="Reset Quest Progress"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            />
          </div>
        </div>

        {/* Segmented Progress Tracker */}
        <div className="mt-5 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between text-[13px] font-mono mb-2">
            <span className="text-[var(--text-muted)]">Progress</span>
            <span className="text-[var(--green)] font-semibold">
              {completedCount} / {totalSteps} sections ({Math.round((completedCount / totalSteps) * 100)}%)
            </span>
          </div>

          {/* Segmented Blocks */}
          <div className="grid grid-cols-8 gap-1.5 h-2 w-full">
            {mainNodes.map((node, idx) => {
              const isDone = progress.completedNodeIds.includes(node.id);
              const isCurr = !isDone && isNodeUnlocked(node.id, idx);
              return (
                <div
                  key={node.id}
                  className={`rounded-full transition-all duration-300 ${
                    isDone
                      ? 'bg-[var(--green)]'
                      : isCurr
                      ? 'bg-[var(--green)] ring-2 ring-[var(--green-soft)] animate-pulse'
                      : 'bg-[var(--border)]'
                  }`}
                  title={`${node.shortTitle}: ${isDone ? 'Completed' : isCurr ? 'Next up' : 'Locked'}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Compact bonus controls when the side gutters do not fit */}
      {useCompactBonusLayout && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveDrawerNodeId('bonus-videos')}
            icon={<Video className="w-3.5 h-3.5 text-[var(--green)]" />}
          >
            <span>Videos ({lesson.recommendedVideos?.length || 0})</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveDrawerNodeId('bonus-sources')}
            icon={<Globe className="w-3.5 h-3.5 text-[var(--green)]" />}
          >
            <span>All Sources ({lesson.references?.length || 0})</span>
          </Button>
        </div>
      )}

      {/* 2. THE GEOMETRIC QUEST MAP CONTAINER */}
      <div
        ref={containerRef}
        style={{ height: totalCanvasHeight }}
        className="relative w-full max-w-[960px] mx-auto overflow-visible"
      >
        {/* SVG CONNECTOR LAYER (z-0, BEHIND NODES) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ width: containerWidth, height: totalCanvasHeight }}
        >
          {/* Start vertical connector to first node */}
          {nodeLayouts[0] && (
            <line
              x1={nodeLayouts[0].nodeCenterX}
              y1={28}
              x2={nodeLayouts[0].nodeCenterX}
              y2={nodeLayouts[0].top}
              stroke="var(--border)"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
          )}

          {/* Smooth cubic Bezier curves between successive nodes */}
          {nodeLayouts.slice(0, -1).map((currentLayout, idx) => {
            const nextLayout = nodeLayouts[idx + 1];
            const startX = currentLayout.nodeCenterX;
            const startY = currentLayout.top + NODE_HEIGHT;
            const endX = nextLayout.nodeCenterX;
            const endY = nextLayout.top;
            const midY = (startY + endY) / 2;

            const isSegmentCompleted = progress.completedNodeIds.includes(mainNodes[idx].id);

            const pathD = isMobile
              ? `M ${startX} ${startY} L ${endX} ${endY}`
              : `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

            return (
              <g key={`connector-${idx}`}>
                {/* Background dashed guideline */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
                {/* Completed solid green overlay with smooth transition */}
                {isSegmentCompleted && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--green)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                )}
              </g>
            );
          })}

          {/* Finish connector from last node to Finish card */}
          {nodeLayouts[mainNodes.length - 1] && (
            <path
              d={
                isMobile
                  ? `M ${center} ${nodeLayouts[mainNodes.length - 1].top + NODE_HEIGHT} L ${center} ${finishNodeTop}`
                  : `M ${nodeLayouts[mainNodes.length - 1].nodeCenterX} ${nodeLayouts[mainNodes.length - 1].top + NODE_HEIGHT} C ${nodeLayouts[mainNodes.length - 1].nodeCenterX} ${(nodeLayouts[mainNodes.length - 1].top + NODE_HEIGHT + finishNodeTop) / 2}, ${finishNodeCenterX} ${(nodeLayouts[mainNodes.length - 1].top + NODE_HEIGHT + finishNodeTop) / 2}, ${finishNodeCenterX} ${finishNodeTop}`
              }
              fill="none"
              stroke={
                progress.completedNodeIds.includes(mainNodes[mainNodes.length - 1]?.id)
                  ? 'var(--green)'
                  : 'var(--border)'
              }
              strokeWidth="2.5"
              strokeDasharray={
                progress.completedNodeIds.includes(mainNodes[mainNodes.length - 1]?.id)
                  ? undefined
                  : '6 4'
              }
              strokeLinecap="round"
            />
          )}

          {/* Desktop Bonus Node Connectors */}
          {!useCompactBonusLayout && (
            <>
              {/* Connector to Bonus Videos (near node 1) */}
              <line
                x1={bonusLeftX + BONUS_WIDTH / 2}
                y1={bonusVideosY + BONUS_HEIGHT / 2}
                x2={nodeLayouts[1].left}
                y2={bonusVideosY + BONUS_HEIGHT / 2}
                stroke="var(--border)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
              {/* Connector to Bonus Sources (near node 3) */}
              <line
                x1={nodeLayouts[3].left + NODE_WIDTH}
                y1={bonusSourcesY + BONUS_HEIGHT / 2}
                x2={bonusRightX - BONUS_WIDTH / 2}
                y2={bonusSourcesY + BONUS_HEIGHT / 2}
                stroke="var(--border)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>

        {/* START PILL at top */}
        {nodeLayouts[0] && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: nodeLayouts[0].nodeCenterX - 40,
              width: 80,
            }}
            className="z-10 text-center"
          >
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
              Start
            </span>
          </div>
        )}

        {/* DESKTOP BONUS NODES IN SIDE GUTTERS */}
        {!useCompactBonusLayout && (
          <>
            {/* Left Gutter: Bonus Videos */}
            <div
              style={{
                position: 'absolute',
                top: bonusVideosY,
                left: bonusLeftX - BONUS_WIDTH / 2,
                width: BONUS_WIDTH,
                height: BONUS_HEIGHT,
              }}
              className="z-10"
            >
              <button
                type="button"
                onClick={() => setActiveDrawerNodeId('bonus-videos')}
                className="w-full h-full p-2.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--green)] hover:-translate-y-0.5 transition-all text-left flex items-center gap-3 cursor-pointer group shadow-xs"
              >
                <div className="w-10 h-10 rounded-[8px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-mono text-[var(--text-muted)] uppercase">
                    Bonus Vault
                  </span>
                  <span className="block text-[13px] font-semibold text-[var(--text)] truncate">
                    Videos ({lesson.recommendedVideos?.length || 0})
                  </span>
                </div>
              </button>
            </div>

            {/* Right Gutter: Bonus Sources */}
            <div
              style={{
                position: 'absolute',
                top: bonusSourcesY,
                left: bonusRightX - BONUS_WIDTH / 2,
                width: BONUS_WIDTH,
                height: BONUS_HEIGHT,
              }}
              className="z-10"
            >
              <button
                type="button"
                onClick={() => setActiveDrawerNodeId('bonus-sources')}
                className="w-full h-full p-2.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--green)] hover:-translate-y-0.5 transition-all text-left flex items-center gap-3 cursor-pointer group shadow-xs"
              >
                <div className="w-10 h-10 rounded-[8px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-mono text-[var(--text-muted)] uppercase">
                    Bonus Library
                  </span>
                  <span className="block text-[13px] font-semibold text-[var(--text)] truncate">
                    All Sources ({lesson.references?.length || 0})
                  </span>
                </div>
              </button>
            </div>
          </>
        )}

        {/* MAIN NODES LAYER (z-10) */}
        {mainNodes.map((node, idx) => {
          const layout = nodeLayouts[idx];
          if (!layout) return null;

          const isCompleted = progress.completedNodeIds.includes(node.id);
          const isUnlocked = isNodeUnlocked(node.id, idx);
          const isCurrent = !isCompleted && isUnlocked;
          const isFocused = focusedNodeIdx === idx;
          const Icon = node.icon;
          const qcIssues = getQCIssuesForNode(node.sectionKey);

          // Card state styling strictly adhering to palette rules:
          // - Normal: --surface bg + 1px --border
          // - Hover: translateY(-2px) + border becomes --green
          // - Current: 1px --green border + soft green bg + small pulsing dot
          // - Completed: green check badge
          // - Locked: reduced opacity + lock icon (readable text)
          let cardClasses = 'bg-[var(--surface)] border-[var(--border)]';
          if (isCurrent) {
            cardClasses = 'bg-[var(--green-soft)] border-[var(--green)]';
          } else if (isCompleted) {
            cardClasses = 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--green)]';
          } else if (!isUnlocked) {
            cardClasses = 'bg-[var(--surface)] border-[var(--border)] opacity-60';
          } else {
            cardClasses = 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--green)]';
          }

          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                top: layout.top,
                left: layout.left,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
              }}
              className="z-10 transition-transform duration-150"
            >
              <button
                type="button"
                onClick={() => {
                  if (isUnlocked) {
                    setActiveDrawerNodeId(node.id);
                    setFocusedNodeIdx(idx);
                  }
                }}
                disabled={!isUnlocked}
                aria-label={`${node.title}, ${node.minutes > 0 ? `${node.minutes} minutes` : ''}, ${
                  isCompleted ? 'Completed' : isCurrent ? 'Current' : isUnlocked ? 'Unlocked' : 'Locked'
                }`}
                className={`w-full h-full p-3 rounded-[10px] border flex items-center gap-3 text-left transition-all duration-150 relative cursor-pointer hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 ${cardClasses} ${
                  isFocused ? 'ring-2 ring-[var(--green)]' : ''
                }`}
              >
                {/* QC Badge INSIDE top-right corner of card per spec */}
                {qcIssues.length > 0 && (
                  <span
                    title={`${qcIssues.length} QC issue(s) flagged`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenQCReport) onOpenQCReport();
                    }}
                    className="absolute top-2 right-2 flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--amber-soft)] text-[var(--amber)] border border-[var(--amber)] cursor-pointer"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>{qcIssues.length}</span>
                  </span>
                )}

                {/* Left: 44px Icon Square with unified style per spec */}
                <div
                  className="w-11 h-11 rounded-[10px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center shrink-0 relative"
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                  {/* Status indicator badge */}
                  {isCompleted ? (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--green)] text-[var(--on-green)] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : !isUnlocked ? (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)] flex items-center justify-center">
                      <Lock className="w-2.5 h-2.5" />
                    </span>
                  ) : isCurrent ? (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--green)] animate-ping" />
                  ) : null}
                </div>

                {/* Middle: Number + Time above Title (2 lines max) + Subtitle */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-[var(--text-muted)] mb-0.5">
                    <span>{String(idx + 1).padStart(2, '0')}</span>
                    <span>·</span>
                    <span>{node.minutes > 0 ? `${String(node.minutes).padStart(2, '0')} min` : 'Reference'}</span>
                  </div>

                  <h3 className="text-[14px] font-semibold text-[var(--text)] line-clamp-2 leading-snug">
                    {node.title}
                  </h3>

                  <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                    {node.subtitle}
                  </p>
                </div>

                {/* Right: Chevron */}
                <div className="shrink-0 text-[var(--text-muted)]">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          );
        })}

        {/* FINISH NODE UNDER THE LAST NODE */}
        <div
          style={{
            position: 'absolute',
            top: finishNodeTop,
            left: finishNodeLeft,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          }}
          className="z-10"
        >
          <button
            type="button"
            onClick={() => setActiveDrawerNodeId('finish')}
            className={`w-full h-full p-3 rounded-[10px] border flex items-center gap-3 text-left transition-all duration-150 cursor-pointer hover:-translate-y-0.5 bg-[var(--surface)] border-[var(--border)] hover:border-[var(--green)] ${
              completedCount === totalSteps
                ? 'bg-[var(--green-soft)] border-[var(--green)]'
                : ''
            }`}
          >
            <div className="w-11 h-11 rounded-[10px] bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5 stroke-[2]" />
            </div>

            <div className="flex-1 min-w-0">
              <span className="block text-[11px] font-mono uppercase text-[var(--text-muted)]">
                Final Step
              </span>
              <h3 className="text-[14px] font-semibold text-[var(--text)]">
                Quest Completion & Certificate
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {completedCount === totalSteps
                  ? 'Ready to certify and export'
                  : `${totalSteps - completedCount} modules remaining`}
              </p>
            </div>

            <div className="shrink-0 text-[var(--text-muted)]">
              <Award className="w-4 h-4 text-[var(--green)]" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Node Detail Drawer */}
      <NodeDrawer
        isOpen={activeDrawerNodeId !== null}
        onClose={() => setActiveDrawerNodeId(null)}
        nodeId={activeDrawerNodeId || ''}
        lesson={lesson}
        mode={progress.mode}
        isCompleted={activeDrawerNodeId ? progress.completedNodeIds.includes(activeDrawerNodeId) : false}
        onMarkComplete={handleMarkComplete}
        onNavigateToNode={(nextId) => setActiveDrawerNodeId(nextId)}
        onJumpToEditor={onJumpToEditor}
        onOpenExport={onOpenExport}
        qcIssues={getQCIssuesForNode(
          mainNodes.find((n) => n.id === activeDrawerNodeId)?.sectionKey
        )}
        quizAnswers={progress.quizAnswers}
        onSaveQuizAnswer={handleSaveQuizAnswer}
        activityTickedSteps={progress.activityTickedSteps}
        onToggleActivityStep={handleToggleActivityStep}
      />
    </div>
  );
};
