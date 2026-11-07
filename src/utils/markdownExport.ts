/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { LessonData, QCReport, GroundingSource, QuestProgress } from '../types/lesson.ts';

export function generateLessonMarkdown(lesson: LessonData, questProgress?: QuestProgress): string {
  const s = lesson.sections;
  const questionsMd = s.knowledgeCheck.questions
    .map(
      (q, idx) => `### Question ${idx + 1}: ${q.question}
${q.options && q.options.length > 0 ? q.options.map((opt) => `- ${opt}`).join('\n') : ''}

**Correct Answer:** ${q.correctAnswer}  
**Explanation:** ${q.explanation}
`
    )
    .join('\n\n');

  const videosMd = (lesson.recommendedVideos || [])
    .map(
      (v, idx) => `### ${idx + 1}. ${v.title}
- **Channel / Creator:** ${v.channel}
- **URL:** [Watch Video](${v.url})
- **Supported Lesson Section:** ${v.supportedSection}
- **Pedagogical Relevance:** ${v.relevance}
`
    )
    .join('\n');

  const referencesMd = (lesson.references || [])
    .map(
      (r) => `[Source ${r.index}] **${r.title}** (${r.type.toUpperCase()})  
Link: ${r.url}  
*Claim supported:* ${r.claim}  
${r.notes ? `*Notes:* ${r.notes}` : ''}`
    )
    .join('\n\n');

  const progressMd = questProgress
    ? `
---

## 10. Quest Map Learning Progress
- **Completed Modules:** ${questProgress.completedNodeIds.length} of 8
- **Diagnostic Quiz Score:** ${lesson.sections.knowledgeCheck.questions.length
      ? `${Math.round((questProgress.quizScore / lesson.sections.knowledgeCheck.questions.length) * 100)}% (${questProgress.quizScore}/${lesson.sections.knowledgeCheck.questions.length})`
      : 'Not available'}
- **Mode:** ${questProgress.mode === 'instructor' ? 'Instructor Review' : 'Learner Self-Paced'}
- **Started At:** ${questProgress.startedAt ? new Date(questProgress.startedAt).toLocaleString() : 'N/A'}
`
    : '';

  return `# ${lesson.title}

> **Target Duration:** ${lesson.totalMinutes} Minutes  
> **Learning Objective:** ${lesson.learningObjective}

---

## 1. Introduction & Learning Objective (${s.introduction.minutes} min)
${s.introduction.content}

---

## 2. Core Concept Explanations (${s.coreConcepts.minutes} min)
${s.coreConcepts.content}

---

## 3. Worked Examples (${s.workedExamples.minutes} min)
${s.workedExamples.content}

---

## 4. Practical Applications (${s.practicalApplications.minutes} min)
${s.practicalApplications.content}

---

## 5. Hands-on Activity (${s.handsOnActivity.minutes} min)
${s.handsOnActivity.content}

---

## 6. Knowledge Check (${s.knowledgeCheck.minutes} min)
${questionsMd}

---

## 7. Summary & Key Takeaways (${s.summary.minutes} min)
${s.summary.content}

---

## 8. Recommended YouTube Videos
${videosMd || '_No video recommendations available._'}

---

## 9. References & Grounded Citations
${referencesMd || '_No references cited._'}
${progressMd}
`;
}

export function generateReferencesMarkdown(references: GroundingSource[]): string {
  return `# References & Grounded Source Catalog

Total Sources: ${references.length}

${references
  .map(
    (r) => `### [Source ${r.index}] ${r.title}
- **Type:** ${r.type.toUpperCase()}
- **URL:** [${r.url}](${r.url})
- **Claim Supported:** ${r.claim}
${r.channelOrAuthor ? `- **Creator/Author:** ${r.channelOrAuthor}` : ''}
${r.notes ? `- **Notes:** ${r.notes}` : ''}
`
  )
  .join('\n')}
`;
}

export function generateQCReportMarkdown(report: QCReport): string {
  const layerTitle =
    report.layer === 'factual_accuracy'
      ? 'QC Layer 1: Research & Factual Accuracy Audit'
      : 'QC Layer 2: Instructional Quality & Pacing Audit';

  const issuesMd = report.issues
    .map(
      (issue, idx) => `### Issue ${idx + 1} [${issue.severity.toUpperCase()}] - ${issue.location}
- **Status:** ${issue.status.toUpperCase()}
- **Description:** ${issue.description}
- **Evidence / Verified Standard:** ${issue.evidence}
- **Suggested Fix:** ${issue.suggestedFix}
`
    )
    .join('\n');

  return `# ${layerTitle}

- **Overall Score:** ${report.overallScore}/100
- **Evaluated At:** ${new Date(report.evaluatedAt).toLocaleString()}
- **Issues Detected:** ${report.issues.length}

## Executive Summary
${report.summary}

## Detailed Findings
${issuesMd || '_No issues reported. Passed audit._'}
`;
}

export function generateLessonHtml(lesson: LessonData, questProgress?: QuestProgress): string {
  const md = generateLessonMarkdown(lesson, questProgress);
  // Simple clean HTML wrapper with print stylesheet
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(lesson.title)} - ${lesson.totalMinutes || 45}-Minute Lesson Plan</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 { font-size: 2.2rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 8px; }
    h2 { font-size: 1.4rem; color: #1e293b; margin-top: 32px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    h3 { font-size: 1.15rem; color: #334155; margin-top: 20px; }
    blockquote { background: #f8fafc; border-left: 4px solid #6366f1; margin: 20px 0; padding: 12px 18px; border-radius: 4px; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.9em; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.9em; }
    pre code { background: transparent; padding: 0; color: inherit; }
    a { color: #4f46e5; text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 0.85rem; font-weight: 600; background: #e0e7ff; color: #3730a3; border-radius: 9999px; }
    @media print {
      body { max-width: 100%; padding: 0; }
      h2 { page-break-before: auto; }
      pre, blockquote { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div style="margin-bottom: 24px;">
    <span class="badge">${lesson.totalMinutes || 45}-Minute Certified Lesson Plan: ${escapeHtml(lesson.title)}</span>
  </div>
  <pre style="white-space: pre-wrap; font-family: inherit; background: transparent; color: inherit; padding: 0;">${escapeHtml(md)}</pre>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function downloadTextFile(filename: string, content: string, contentType = 'text/plain'): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadAllAsZip(params: {
  lesson: LessonData;
  qc1?: QCReport;
  qc2?: QCReport;
  questProgress?: QuestProgress;
}): Promise<void> {
  const { lesson, qc1, qc2, questProgress } = params;
  const zip = new JSZip();

  const slug = lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'lesson';

  // 1. Lesson files
  zip.file('lesson.md', generateLessonMarkdown(lesson, questProgress));
  zip.file('lesson.html', generateLessonHtml(lesson, questProgress));
  zip.file('lesson.json', JSON.stringify(lesson, null, 2));

  // 2. References files
  zip.file('references.md', generateReferencesMarkdown(lesson.references || []));
  zip.file('references.json', JSON.stringify(lesson.references || [], null, 2));

  // 3. QC Reports
  if (qc1) {
    zip.file('qc_layer1_factual_accuracy.json', JSON.stringify(qc1, null, 2));
    zip.file('qc_layer1_factual_accuracy.md', generateQCReportMarkdown(qc1));
  }
  if (qc2) {
    zip.file('qc_layer2_instructional_quality.json', JSON.stringify(qc2, null, 2));
    zip.file('qc_layer2_instructional_quality.md', generateQCReportMarkdown(qc2));
  }

  // 4. Quest Progress summary if present
  if (questProgress) {
    zip.file('quest_progress.json', JSON.stringify(questProgress, null, 2));
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-package.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
