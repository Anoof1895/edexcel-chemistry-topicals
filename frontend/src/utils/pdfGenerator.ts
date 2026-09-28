import { jsPDF } from 'jspdf';
import { QuestionItem } from '../types';
import { getFullImageUrl } from './imageUrl';

export interface PDFExportOptions {
  title: string;
  questions: QuestionItem[];
  includeFormalHeader?: boolean; // false = Questions Only / Worksheet mode
  includeSourceTags?: boolean; // defaults to true
  includeHeaderFooter?: boolean; // true = show title rule & footer; false = pure questions
  onProgress?: (current: number, total: number, statusText: string) => void;
}

export type PdfExportOptions = PDFExportOptions;

/**
 * Loads an image from URL and converts it to a canvas data URL with dimensions.
 * Cleanly fetches remote HTTPS CDN image URLs via fetch() to prevent canvas CORS tainting.
 */
async function loadImageData(rawUrl: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const fullUrl = getFullImageUrl(rawUrl);
  let imageSourceUrl = fullUrl;
  let objectUrlToRevoke: string | null = null;

  try {
    const res = await fetch(fullUrl);
    if (res.ok) {
      const blob = await res.blob();
      objectUrlToRevoke = URL.createObjectURL(blob);
      imageSourceUrl = objectUrlToRevoke;
    }
  } catch (fetchErr) {
    // If fetch fails (e.g. offline or strictly relative without server), fall back to direct loading
    console.warn(`Direct fetch failed for ${fullUrl}, falling back to Image.src:`, fetchErr);
    imageSourceUrl = fullUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.naturalWidth || img.width || 800;
      const h = img.naturalHeight || img.height || 600;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        reject(new Error('Could not create 2D canvas context'));
        return;
      }
      // Fill pure white background for transparent PNGs
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve({ dataUrl, width: w, height: h });
      } catch (err) {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        reject(err);
      }
    };
    img.onerror = () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      reject(new Error(`Failed to load image from: ${fullUrl}`));
    };
    img.src = imageSourceUrl;
  });
}

/**
 * Generates and downloads a printer-friendly, ink-saving Question Paper PDF.
 * Uses pure white background, crisp 100% black text, and minimalist line borders.
 */
export async function generateQuestionPaperPDF({
  title,
  questions,
  includeFormalHeader = false,
  includeSourceTags = true,
  includeHeaderFooter = true,
  onProgress,
}: PDFExportOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const marginTop = 15;
  const marginBottom = includeHeaderFooter ? 16 : 15;
  const printableWidth = pageWidth - marginX * 2; // 180mm
  const printableHeight = pageHeight - marginTop - marginBottom; // 266mm / 267mm

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const timeAllowedMins = Math.round(totalMarks * 1.2);

  let cursorY = marginTop;

  if (includeHeaderFooter) {
    if (includeFormalHeader) {
      // --- Page 1 Formal Examination Header ---
      // 1. Subject Header
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('PEARSON EDEXCEL INTERNATIONAL ADVANCED LEVEL', marginX, cursorY + 4);

      // 2. Examination Title (16pt, bold)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      const truncatedTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
      doc.text(truncatedTitle, marginX, cursorY + 12);

      // 3. Metadata Bar (Time allowed, Total marks, Date)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(
        `Time allowed: ~${timeAllowedMins} mins   |   Total Marks: ${totalMarks} marks   |   Date: ${dateStr}`,
        marginX,
        cursorY + 18
      );

      cursorY += 22;

      // 4. Candidate Info Box (Clean 1px minimalist outline)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3); // ~ 1px
      doc.rect(marginX, cursorY, printableWidth, 14);

      // Candidate Name line
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Candidate Name:', marginX + 3, cursorY + 5.5);
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.line(marginX + 28, cursorY + 6.5, marginX + 90, cursorY + 6.5);

      // Centre Number boxes
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Centre Number:', marginX + 96, cursorY + 5.5);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);
      let boxX = marginX + 118;
      for (let b = 0; b < 5; b++) {
        doc.rect(boxX + b * 5.5, cursorY + 2, 4.5, 5);
      }

      // Candidate Number boxes
      doc.text('Candidate Number:', marginX + 96, cursorY + 11.5);
      boxX = marginX + 123;
      for (let b = 0; b < 4; b++) {
        doc.rect(boxX + b * 5.5, cursorY + 8, 4.5, 5);
      }

      cursorY += 17;

      // 5. Instructions Box (White background with thin 1px border)
      doc.setDrawColor(102, 102, 102); // #666666
      doc.setLineWidth(0.25);
      doc.rect(marginX, cursorY, printableWidth, 10.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text('Instructions:', marginX + 3, cursorY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('• Answer ALL questions.   • Show all steps in calculations with formulas and units.   • Write your answers clearly.', marginX + 21, cursorY + 4.5);
      doc.text('• Scientific calculators may be used.', marginX + 21, cursorY + 8.5);

      cursorY += 14;

      // 6. Solid Black Rule Separator (1.5pt solid black line before Question 1)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.53); // ~ 1.5pt
      doc.line(marginX, cursorY, marginX + printableWidth, cursorY);

      cursorY += 6;
    } else {
      // --- "Questions Only" / Worksheet Mode ---
      // Compact 1-line top header rule: maximizes printable area, starts Q1 near top margin
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      const compactTitle = title.length > 55 ? title.substring(0, 52) + '...' : title;
      doc.text(compactTitle, marginX, cursorY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      const metaStr = `Total Marks: ${totalMarks}  |  Time: ~${timeAllowedMins} mins`;
      doc.text(metaStr, marginX + printableWidth - doc.getTextWidth(metaStr), cursorY + 4);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4); // thin crisp rule
      doc.line(marginX, cursorY + 6.5, marginX + printableWidth, cursorY + 6.5);

      cursorY += 10;
    }
  }

  // --- Questions Iteration ---
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qNumberLabel = `Question ${i + 1}`;
    const qOriginMeta = `${q.unit || ''} • ${q.series || ''} ${q.year || ''} (${q.questionNumber})`.trim();
    const marksLabel = `(${q.marks} ${q.marks === 1 ? 'mark' : 'marks'})`;

    if (onProgress) {
      onProgress(i + 1, questions.length, `Formatting Question ${i + 1} of ${questions.length}...`);
    }

    try {
      const imgData = await loadImageData(q.questionImagePath);
      const aspectRatio = imgData.height / imgData.width;
      let imgW = printableWidth;
      let imgH = imgW * aspectRatio;

      if (imgH > printableHeight - 20) {
        imgH = printableHeight - 20;
        imgW = imgH / aspectRatio;
      }

      const totalItemHeight = 9 + imgH + 8; // header + image + spacing

      // Page break check: ensure question is not sliced across bottom margin
      if (cursorY + totalItemHeight > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }

      // Draw Question Header (Pure black, crisp)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(0, 0, 0);
      doc.text(qNumberLabel, marginX, cursorY + 4);

      if (includeSourceTags) {
        const numW = doc.getTextWidth(qNumberLabel);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text(qOriginMeta, marginX + numW + 4, cursorY + 4);
      }

      // Marks on right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(marksLabel, marginX + printableWidth - doc.getTextWidth(marksLabel), cursorY + 4);

      // Subtle separator rule
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.25);
      doc.line(marginX, cursorY + 6, marginX + printableWidth, cursorY + 6);

      cursorY += 8;

      // Draw Question Image centered
      const imgX = marginX + (printableWidth - imgW) / 2;
      doc.addImage(imgData.dataUrl, 'PNG', imgX, cursorY, imgW, imgH);

      cursorY += imgH + 9;
    } catch (err) {
      console.error(`Error embedding question ${q.id}:`, err);
      if (cursorY + 20 > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`${qNumberLabel} [Image missing or could not load]`, marginX, cursorY + 4);
      cursorY += 15;
    }
  }

  // --- Add Page Number Footers ---
  if (includeHeaderFooter) {
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.25);
      doc.line(marginX, pageHeight - 11, marginX + printableWidth, pageHeight - 11);
      doc.text('Pearson Edexcel International A-Level Revision Platform', marginX, pageHeight - 7);
      const pageNumStr = `Page ${p} of ${totalPages}`;
      doc.text(pageNumStr, marginX + printableWidth - doc.getTextWidth(pageNumStr), pageHeight - 7);
    }
  }

  // Download PDF
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_qp.pdf`;
  doc.save(filename);
}

/**
 * Generates and downloads the matching Mark Scheme PDF.
 * Pure white background, crisp 100% black text, and zero ink-wasting color blocks.
 */
export async function generateMarkSchemePDF({
  title,
  questions,
  includeFormalHeader = false,
  includeSourceTags = true,
  includeHeaderFooter = true,
  onProgress,
}: PDFExportOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const marginTop = 15;
  const marginBottom = includeHeaderFooter ? 16 : 15;
  const printableWidth = pageWidth - marginX * 2;
  const printableHeight = pageHeight - marginTop - marginBottom;

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  let cursorY = marginTop;

  if (includeHeaderFooter) {
    if (includeFormalHeader) {
      // --- Page 1 Formal Exam Mark Scheme Header ---
      // 1. Subject Header
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('PEARSON EDEXCEL INTERNATIONAL ADVANCED LEVEL — MARK SCHEME', marginX, cursorY + 4);

      // 2. Exam Title (16pt, bold)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      const truncatedTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
      doc.text(`Mark Scheme: ${truncatedTitle}`, marginX, cursorY + 12);

      // 3. Metadata Bar
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(`Questions: ${questions.length}   |   Total Marks: ${totalMarks} marks   |   Date: ${dateStr}`, marginX, cursorY + 18);

      cursorY += 22;

      // 4. Examiner Guidance Box (Clean 1px border, white background)
      doc.setDrawColor(102, 102, 102); // #666666
      doc.setLineWidth(0.25);
      doc.rect(marginX, cursorY, printableWidth, 9);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text('General Marking Guidance:', marginX + 3, cursorY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('All candidates must receive the same treatment. Examiners must mark the first candidate in exactly the same way as the last.', marginX + 40, cursorY + 5.5);

      cursorY += 13;

      // 5. Solid Black Rule Separator (1.5pt solid black line before Question 1)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.53); // ~ 1.5pt
      doc.line(marginX, cursorY, marginX + printableWidth, cursorY);

      cursorY += 6;
    } else {
      // --- "Questions Only" / Worksheet Mode Mark Scheme Header ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      const compactTitle = `${title.length > 50 ? title.substring(0, 47) + '...' : title} — Mark Scheme`;
      doc.text(compactTitle, marginX, cursorY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      const metaStr = `Questions: ${questions.length}  |  Total Marks: ${totalMarks}`;
      doc.text(metaStr, marginX + printableWidth - doc.getTextWidth(metaStr), cursorY + 4);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.line(marginX, cursorY + 6.5, marginX + printableWidth, cursorY + 6.5);

      cursorY += 10;
    }
  }

  // --- Mark Scheme Questions Iteration ---
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qNumberLabel = `Question ${i + 1} Mark Scheme`;
    const qOriginMeta = `${q.unit || ''} • ${q.series || ''} ${q.year || ''} (${q.questionNumber})`.trim();
    const marksLabel = `[${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}]`;

    if (onProgress) {
      onProgress(i + 1, questions.length, `Formatting Mark Scheme for Question ${i + 1}...`);
    }

    if (!q.markSchemeImagePath) {
      if (cursorY + 20 > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`${qNumberLabel} — (Official mark scheme row not available in source)`, marginX, cursorY + 4);
      cursorY += 14;
      continue;
    }

    try {
      const imgData = await loadImageData(q.markSchemeImagePath);
      const aspectRatio = imgData.height / imgData.width;
      let imgW = printableWidth;
      let imgH = imgW * aspectRatio;

      if (imgH > printableHeight - 20) {
        imgH = printableHeight - 20;
        imgW = imgH / aspectRatio;
      }

      const totalItemHeight = 9 + imgH + 8;

      if (cursorY + totalItemHeight > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }

      // Draw MS Header (Pure black, crisp)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(0, 0, 0);
      doc.text(qNumberLabel, marginX, cursorY + 4);

      if (includeSourceTags) {
        const msNumW = doc.getTextWidth(qNumberLabel);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text(qOriginMeta, marginX + msNumW + 4, cursorY + 4);
      }

      // Marks on right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(marksLabel, marginX + printableWidth - doc.getTextWidth(marksLabel), cursorY + 4);

      // Separator rule
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.25);
      doc.line(marginX, cursorY + 6, marginX + printableWidth, cursorY + 6);

      cursorY += 8;

      const imgX = marginX + (printableWidth - imgW) / 2;
      doc.addImage(imgData.dataUrl, 'PNG', imgX, cursorY, imgW, imgH);

      cursorY += imgH + 9;
    } catch (err) {
      console.error(`Error embedding MS for ${q.id}:`, err);
      if (cursorY + 18 > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`${qNumberLabel} [Image could not be rendered]`, marginX, cursorY + 4);
      cursorY += 14;
    }
  }

  // --- Add Page Number Footers ---
  if (includeHeaderFooter) {
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.25);
      doc.line(marginX, pageHeight - 11, marginX + printableWidth, pageHeight - 11);
      doc.text('Pearson Edexcel International A-Level Revision Platform — Mark Scheme', marginX, pageHeight - 7);
      const pageNumStr = `Page ${p} of ${totalPages}`;
      doc.text(pageNumStr, marginX + printableWidth - doc.getTextWidth(pageNumStr), pageHeight - 7);
    }
  }

  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_ms.pdf`;
  doc.save(filename);
}
