import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile, ConsultationMessage } from '../types';

export function generateHealthRecordPDF(
  profile: UserProfile,
  messages: ConsultationMessage[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 16;

  // Primary Palette
  const tealDark = [15, 118, 110]; // #0F766E
  const navyDark = [15, 59, 76]; // #0F3B4C
  const emeraldPrimary = [5, 150, 105]; // #059669
  const textDark = [30, 41, 59]; // #1E293B
  const textMuted = [100, 116, 139]; // #64748B
  const borderLight = [226, 232, 240]; // #E2E8F0

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentY = 18;
      drawPageHeaderMini();
    }
  };

  const drawPageHeaderMini = () => {
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('MEDTRACK HEALTHCARE • PATIENT RECORD & CONSULTATION LOG', margin, 10);
    doc.text(`Patient: ${profile.name} (ID: ${profile.id.slice(0, 8)})`, pageWidth - margin, 10, {
      align: 'right',
    });
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  // ================= PAGE 1 HEADER =================
  // Header Banner Background
  doc.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 3, 3, 'F');

  // Medtrack Branding on Top
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Medtrack', margin + 8, currentY + 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald accent
  doc.text('TRACK • AWARE • STAY HEALTHY', margin + 8, currentY + 17);

  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprehensive Clinical Record & Consultation Log', margin + 8, currentY + 23);

  // Document metadata on right
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${dateStr} at ${timeStr}`, pageWidth - margin - 8, currentY + 10, {
    align: 'right',
  });
  doc.text(`Report Ref: MED-${Date.now().toString().slice(-8)}`, pageWidth - margin - 8, currentY + 16, {
    align: 'right',
  });
  doc.text('Status: Verified Patient Baseline', pageWidth - margin - 8, currentY + 22, {
    align: 'right',
  });

  currentY += 34;

  // ================= PATIENT PROFILE CARD =================
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(204, 251, 241);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 38, 2.5, 2.5, 'FD');

  // Profile Header Pill
  doc.setFillColor(tealDark[0], tealDark[1], tealDark[2]);
  doc.roundedRect(margin + 6, currentY + 5, 45, 6, 1.5, 1.5, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('PATIENT DEMOGRAPHICS', margin + 9, currentY + 9.2);

  // Patient Core Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(profile.name, margin + 6, currentY + 18);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    `Age: ${profile.demographics.age} years  |  Gender: ${profile.demographics.gender}  |  Profession: ${profile.demographics.profession}`,
    margin + 6,
    currentY + 24
  );

  // Vitals & Metrics Highlights
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const metricsLine = `Height: ${profile.metrics.heightCm} cm   Weight: ${profile.metrics.weightKg} kg   BMI: ${profile.metrics.bmi.toFixed(1)} (${profile.metrics.bmiCategory})   Est. TDEE: ${profile.metrics.tdeeKcal} kcal/day`;
  doc.text(metricsLine, margin + 6, currentY + 31);

  currentY += 44;

  // ================= MEDICAL HISTORY & LIFESTYLE TABLE =================
  const healthData = [
    [
      'Known Diagnoses',
      profile.healthHistory.knownConditions.length > 0
        ? profile.healthHistory.knownConditions.join(', ')
        : 'None recorded (Reported Healthy)',
    ],
    [
      'Allergies & Sensitivities',
      profile.healthHistory.allergies.length > 0
        ? profile.healthHistory.allergies.join(', ')
        : 'No known drug or environmental allergies (NKDA)',
    ],
    [
      'Active Medications',
      profile.healthHistory.currentMedications.length > 0
        ? profile.healthHistory.currentMedications.join(', ')
        : 'None currently reported',
    ],
    [
      'Family History',
      profile.healthHistory.familyHistory.length > 0
        ? profile.healthHistory.familyHistory.join(', ')
        : 'Non-contributory',
    ],
    [
      'Lifestyle & Habits',
      `Exercise: ${profile.lifestyle.exerciseFrequency} | Sleep: ${profile.lifestyle.dailySleepDurationHours} hrs/night | Hydration: ${profile.lifestyle.waterIntakeLiters} L/day | Stress: ${profile.lifestyle.stressLevel} | Fast Food: ${profile.lifestyle.junkFoodIntake}`,
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Clinical Category', 'Patient Health Baseline & Lifestyle Status']],
    body: healthData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error autoTable adds lastAutoTable on doc
  currentY = doc.lastAutoTable.finalY + 10;

  // ================= CONSULTATION HISTORY SECTION =================
  checkPageBreak(30);

  doc.setFillColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 7, 1.5, 1.5, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(
    `CLINICAL CONSULTATION SESSIONS & TRIAGE TRANSCRIPT (${messages.length} Entries)`,
    margin + 4,
    currentY + 4.8
  );

  currentY += 12;

  if (messages.length === 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('No interactive consultations logged yet.', margin + 4, currentY);
    currentY += 10;
  } else {
    messages.forEach((msg, idx) => {
      checkPageBreak(36);

      const isUser = msg.role === 'user';
      const roleName = isUser ? `Patient Inquiry (${profile.name})` : 'Medtrack Clinical Assistant';
      const roleColor = isUser ? [2, 132, 199] : [15, 118, 110];

      // Message container box
      doc.setFillColor(isUser ? 240 : 248, isUser ? 249 : 250, isUser ? 255 : 252);
      doc.setDrawColor(isUser ? 186 : 204, isUser ? 230 : 251, isUser ? 253 : 241);
      doc.setLineWidth(0.4);

      // Estimate text height
      const cleanContent = msg.content
        .replace(/[*_#`[\]()]/g, '')
        .replace(/\n\n+/g, '\n')
        .trim();
      const splitText = doc.splitTextToSize(cleanContent, pageWidth - margin * 2 - 12);
      const textHeight = Math.min(splitText.length * 4 + 14, 60);

      doc.roundedRect(margin, currentY, pageWidth - margin * 2, textHeight, 2, 2, 'FD');

      // Title & Timestamp
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(roleColor[0], roleColor[1], roleColor[2]);
      doc.text(`${idx + 1}. ${roleName}`, margin + 5, currentY + 5.5);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(msg.timestamp, pageWidth - margin - 5, currentY + 5.5, { align: 'right' });

      // Triage Badge if available
      if (msg.triageLevel) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(225, 29, 72);
        doc.text(`[Triage: ${msg.triageLevel}]`, margin + 5, currentY + 10);
      }

      // Body text
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(splitText.slice(0, 10), margin + 5, currentY + (msg.triageLevel ? 14 : 10));

      currentY += textHeight + 4;

      // If biomarker analysis exists, render mini subtable
      if (msg.biomarkerAnalysis && msg.biomarkerAnalysis.biomarkers.length > 0) {
        checkPageBreak(35);
        const bioRows = msg.biomarkerAnalysis.biomarkers.map((b) => [
          b.name,
          `${b.value} ${b.unit}`,
          b.referenceRange,
          b.status,
          b.plainLanguageMeaning,
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Biomarker Analyzed', 'Observed Value', 'Ref. Range', 'Status', 'Clinical Interpretation']],
          body: bioRows,
          theme: 'grid',
          headStyles: {
            fillColor: [15, 59, 76],
            textColor: [255, 255, 255],
            fontSize: 7.5,
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 1.8,
          },
          columnStyles: {
            3: { fontStyle: 'bold' },
          },
          margin: { left: margin + 4, right: margin + 4 },
        });

        // @ts-expect-error autoTable adds lastAutoTable on doc
        currentY = doc.lastAutoTable.finalY + 6;
      }
    });
  }

  // ================= CLINICAL SIGN-OFF & DISCLAIMER =================
  checkPageBreak(38);

  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 205, 211);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 24, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(159, 18, 57);
  doc.text('CLINICAL ADVISORY & REGULATORY NOTICE', margin + 4, currentY + 5.5);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const disclaimer =
    'This document is generated by Medtrack for educational and clinical consultation preparation. It does not constitute a formal diagnosis or prescriptive treatment plan. Patients should share this record with their licensed primary care physician or specialist for diagnostic evaluation.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - margin * 2 - 8);
  doc.text(disclaimerLines, margin + 4, currentY + 10.5);

  currentY += 28;

  // Signatures Area
  checkPageBreak(25);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin + 10, currentY + 14, margin + 70, currentY + 14);
  doc.line(pageWidth - margin - 70, currentY + 14, pageWidth - margin - 10, currentY + 14);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Patient / Guardian Signature', margin + 20, currentY + 18);
  doc.text('Reviewing Physician / Clinician Signature', pageWidth - margin - 65, currentY + 18);

  // Footer Page numbers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(
      `Medtrack Healthcare System • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Save the PDF file
  const cleanName = profile.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Medtrack_Health_Record_${cleanName}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
