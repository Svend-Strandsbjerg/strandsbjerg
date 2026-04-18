import type { DiscReportTier } from "@/lib/disc-types";
import type { SharedDiscResultRecord } from "@/lib/disc-result-access";
import { buildDiscProfilePresentation, buildDiscResultViewModel, calculateDiscPosition, rankDiscDimensions, type DiscDimension } from "@/lib/disc-result-insights";

function escapePdfText(input: string) {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function rgb(color: { r: number; g: number; b: number }) {
  return `${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value);
}

function formatDimensionValue(value: number | null) {
  if (value === null) {
    return "—";
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function wrapText(text: string, limit = 78) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > limit && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function circlePath(x: number, y: number, radius: number) {
  const kappa = 0.552284749831;
  const c = radius * kappa;

  return [
    `${(x - radius).toFixed(2)} ${y.toFixed(2)} m`,
    `${(x - radius).toFixed(2)} ${(y + c).toFixed(2)} ${(x - c).toFixed(2)} ${(y + radius).toFixed(2)} ${x.toFixed(2)} ${(y + radius).toFixed(2)} c`,
    `${(x + c).toFixed(2)} ${(y + radius).toFixed(2)} ${(x + radius).toFixed(2)} ${(y + c).toFixed(2)} ${(x + radius).toFixed(2)} ${y.toFixed(2)} c`,
    `${(x + radius).toFixed(2)} ${(y - c).toFixed(2)} ${(x + c).toFixed(2)} ${(y - radius).toFixed(2)} ${x.toFixed(2)} ${(y - radius).toFixed(2)} c`,
    `${(x - c).toFixed(2)} ${(y - radius).toFixed(2)} ${(x - radius).toFixed(2)} ${(y - c).toFixed(2)} ${(x - radius).toFixed(2)} ${y.toFixed(2)} c`,
    "h",
  ];
}

function buildPdfBytes(pageStreams: string[]) {
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageObjectNumbers = pageStreams.map((_, index) => 3 + index * 2);
  objects.push(`<< /Type /Pages /Kids [${pageObjectNumbers.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageStreams.length} >>`);

  for (let index = 0; index < pageStreams.length; index += 1) {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const stream = pageStreams[index];

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${3 + pageStreams.length * 2} 0 R /F2 ${4 + pageStreams.length * 2} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

type PdfTheme = {
  pageBackground: { r: number; g: number; b: number };
  sectionBlock: { r: number; g: number; b: number };
  accentBlock: { r: number; g: number; b: number };
  textPrimary: { r: number; g: number; b: number };
  textMuted: { r: number; g: number; b: number };
  divider: { r: number; g: number; b: number };
  disc: Record<DiscDimension, { r: number; g: number; b: number }>;
};

const PDF_THEME: PdfTheme = {
  pageBackground: { r: 0.957, g: 0.949, b: 0.933 },
  sectionBlock: { r: 0.980, g: 0.972, b: 0.955 },
  accentBlock: { r: 0.935, g: 0.925, b: 0.895 },
  textPrimary: { r: 0.165, g: 0.184, b: 0.212 },
  textMuted: { r: 0.380, g: 0.392, b: 0.420 },
  divider: { r: 0.760, g: 0.744, b: 0.710 },
  disc: {
    D: { r: 0.824, g: 0.353, b: 0.361 },
    I: { r: 0.878, g: 0.706, b: 0.318 },
    C: { r: 0.376, g: 0.522, b: 0.780 },
    S: { r: 0.341, g: 0.655, b: 0.486 },
  },
};

class PdfPageBuilder {
  private readonly commands: string[] = [];

  constructor(private readonly theme: PdfTheme) {
    this.commands.push(`${rgb(this.theme.pageBackground)} rg`, "0 0 595 842 re f");
  }

  fillRect(x: number, y: number, width: number, height: number, color: { r: number; g: number; b: number }) {
    this.commands.push(`${rgb(color)} rg`, `${x} ${y} ${width} ${height} re f`);
  }

  strokeRect(x: number, y: number, width: number, height: number, color: { r: number; g: number; b: number }, lineWidth = 1) {
    this.commands.push(`${rgb(color)} RG`, `${lineWidth} w`, `${x} ${y} ${width} ${height} re S`);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: { r: number; g: number; b: number }, lineWidth = 1) {
    this.commands.push(`${rgb(color)} RG`, `${lineWidth} w`, `${x1} ${y1} m ${x2} ${y2} l S`);
  }

  text(font: "F1" | "F2", size: number, x: number, y: number, value: string, color = this.theme.textPrimary) {
    this.commands.push(
      "BT",
      `/${font} ${size} Tf`,
      `${rgb(color)} rg`,
      `1 0 0 1 ${x} ${y} Tm`,
      `(${escapePdfText(value)}) Tj`,
      "ET",
    );
  }

  textBlock(font: "F1" | "F2", size: number, x: number, y: number, lines: string[], lineHeight: number, color = this.theme.textPrimary) {
    lines.forEach((line, index) => {
      this.text(font, size, x, y - index * lineHeight, line, color);
    });
  }

  command(raw: string) {
    this.commands.push(raw);
  }

  build() {
    return this.commands.join("\n");
  }
}

function buildNarrative(viewModel: ReturnType<typeof buildDiscResultViewModel>, summary: string) {
  const ranked = rankDiscDimensions(viewModel.dimensionScores);
  const top = ranked[0]?.dimension ?? "D";
  const secondary = ranked[1]?.dimension ?? "I";

  const strengths: Record<DiscDimension, string> = {
    D: "Acts decisively when priorities are clear and decisions are time-sensitive.",
    I: "Builds engagement quickly through visible communication and positive energy.",
    S: "Creates dependable delivery through consistency, patience, and follow-through.",
    C: "Protects quality through structure, analysis, and careful risk awareness.",
  };

  const communicationStyles: Record<DiscDimension, string> = {
    D: "Responds best to concise updates focused on outcomes, ownership, and next steps.",
    I: "Responds best to collaborative dialogue, visible momentum, and stakeholder context.",
    S: "Responds best to calm communication, clear expectations, and reasonable pacing.",
    C: "Responds best to specific detail, rationale, and clear quality criteria.",
  };

  const interpretation =
    `The profile blend (${top}/${secondary}) indicates the strongest behavioral pattern in this assessment window. ` +
    "Use it as a practical guide for role alignment, communication planning, and team collaboration expectations.";

  const deepSummary =
    `Primary behavioral weight appears in ${top}, supported by ${secondary}. ${summary} ` +
    "This report should be interpreted as preference signals rather than fixed capability limits.";

  return {
    strengths: [strengths[top], strengths[secondary], "Delivers strongest outcomes when responsibilities and success criteria are explicit."],
    communication: `${communicationStyles[top]} ${communicationStyles[secondary]}`,
    interpretation,
    deepSummary,
  };
}

function drawDiscFigure(builder: PdfPageBuilder, input: { left: number; bottom: number; size: number; placement: { x: number; y: number } }) {
  const { left, bottom, size, placement } = input;
  const half = size / 2;

  builder.fillRect(left, bottom + half, half, half, PDF_THEME.disc.D);
  builder.fillRect(left + half, bottom + half, half, half, PDF_THEME.disc.I);
  builder.fillRect(left, bottom, half, half, PDF_THEME.disc.C);
  builder.fillRect(left + half, bottom, half, half, PDF_THEME.disc.S);
  builder.strokeRect(left, bottom, size, size, PDF_THEME.divider, 1.2);
  builder.line(left + half, bottom, left + half, bottom + size, PDF_THEME.divider, 1.1);
  builder.line(left, bottom + half, left + size, bottom + half, PDF_THEME.divider, 1.1);

  builder.text("F2", 13, left + 12, bottom + size - 18, "D", PDF_THEME.textPrimary);
  builder.text("F2", 13, left + size - 20, bottom + size - 18, "I", PDF_THEME.textPrimary);
  builder.text("F2", 13, left + 12, bottom + 10, "C", PDF_THEME.textPrimary);
  builder.text("F2", 13, left + size - 20, bottom + 10, "S", PDF_THEME.textPrimary);

  const markerX = left + ((placement.x + 1) / 2) * size;
  const markerY = bottom + ((placement.y + 1) / 2) * size;

  builder.command(`${rgb(PDF_THEME.textPrimary)} rg`);
  circlePath(markerX, markerY, 7).forEach((part) => builder.command(part));
  builder.command("f");
  builder.command("1 1 1 RG");
  builder.command("1.2 w");
  circlePath(markerX, markerY, 7).forEach((part) => builder.command(part));
  builder.command("S");
}

function drawBaseHeader(builder: PdfPageBuilder, input: { title: string; subtitle: string; generated: string; subject: string; tier: DiscReportTier }) {
  builder.fillRect(44, 742, 507, 72, PDF_THEME.sectionBlock);
  builder.strokeRect(44, 742, 507, 72, PDF_THEME.divider, 0.8);
  builder.text("F2", 22, 60, 786, input.title);
  builder.text("F1", 10, 60, 769, input.subtitle, PDF_THEME.textMuted);
  builder.text("F1", 10, 60, 752, `Generated: ${input.generated}`, PDF_THEME.textMuted);
  builder.text("F1", 10, 338, 769, `Subject: ${input.subject}`, PDF_THEME.textMuted);
  builder.text("F1", 10, 338, 752, `Report tier: ${input.tier.toUpperCase()}`, PDF_THEME.textMuted);
}

function buildFreePage(input: {
  profileTitle: string;
  profileLabel: string;
  summary: string;
  explanatoryNote: string;
  dimensionScores: Record<DiscDimension, number | null>;
  placement: { x: number; y: number };
}) {
  const page = new PdfPageBuilder(PDF_THEME);

  page.fillRect(44, 466, 328, 252, PDF_THEME.sectionBlock);
  page.strokeRect(44, 466, 328, 252, PDF_THEME.divider, 0.8);
  drawDiscFigure(page, { left: 86, bottom: 500, size: 244, placement: input.placement });

  page.fillRect(388, 520, 163, 198, PDF_THEME.sectionBlock);
  page.strokeRect(388, 520, 163, 198, PDF_THEME.divider, 0.8);
  page.text("F2", 12, 404, 694, "Weighting");
  page.text("F1", 10, 404, 674, `D  ${formatDimensionValue(input.dimensionScores.D)}`);
  page.text("F1", 10, 404, 656, `I  ${formatDimensionValue(input.dimensionScores.I)}`);
  page.text("F1", 10, 404, 638, `S  ${formatDimensionValue(input.dimensionScores.S)}`);
  page.text("F1", 10, 404, 620, `C  ${formatDimensionValue(input.dimensionScores.C)}`);

  page.fillRect(44, 236, 507, 212, PDF_THEME.sectionBlock);
  page.strokeRect(44, 236, 507, 212, PDF_THEME.divider, 0.8);
  page.text("F2", 14, 60, 418, `${input.profileTitle} (${input.profileLabel})`);
  page.textBlock("F1", 10, 60, 394, wrapText(input.summary, 92).slice(0, 6), 15);

  page.fillRect(44, 134, 507, 84, PDF_THEME.accentBlock);
  page.strokeRect(44, 134, 507, 84, PDF_THEME.divider, 0.8);
  page.text("F2", 11, 60, 194, "Use of result");
  page.textBlock("F1", 9, 60, 178, wrapText(input.explanatoryNote, 96).slice(0, 3), 13, PDF_THEME.textMuted);

  page.text("F1", 9, 44, 58, "Strandsbjerg · DISC profile report", PDF_THEME.textMuted);
  return page.build();
}

function buildStandardPageTwo(input: { strengths: string[]; communication: string; interpretation: string }) {
  const page = new PdfPageBuilder(PDF_THEME);
  page.fillRect(44, 722, 507, 80, PDF_THEME.sectionBlock);
  page.strokeRect(44, 722, 507, 80, PDF_THEME.divider, 0.8);
  page.text("F2", 18, 60, 772, "Standard report insights");
  page.text("F1", 10, 60, 754, "Structured interpretation for collaboration and day-to-day execution.", PDF_THEME.textMuted);

  page.fillRect(44, 492, 507, 206, PDF_THEME.sectionBlock);
  page.strokeRect(44, 492, 507, 206, PDF_THEME.divider, 0.8);
  page.text("F2", 13, 60, 670, "Strength profile");
  page.textBlock(
    "F1",
    10,
    60,
    648,
    input.strengths.flatMap((entry) => [`• ${entry}`]).flatMap((line) => wrapText(line, 92)),
    15,
  );

  page.fillRect(44, 302, 507, 170, PDF_THEME.sectionBlock);
  page.strokeRect(44, 302, 507, 170, PDF_THEME.divider, 0.8);
  page.text("F2", 13, 60, 446, "Communication style");
  page.textBlock("F1", 10, 60, 424, wrapText(input.communication, 92).slice(0, 7), 15);

  page.fillRect(44, 112, 507, 170, PDF_THEME.accentBlock);
  page.strokeRect(44, 112, 507, 170, PDF_THEME.divider, 0.8);
  page.text("F2", 13, 60, 256, "Practical interpretation");
  page.textBlock("F1", 10, 60, 234, wrapText(input.interpretation, 92).slice(0, 7), 15);

  return page.build();
}

function buildDeepPageTwo(input: {
  strengths: string[];
  communication: string;
  interpretation: string;
  explanatoryNote: string;
  dimensionScores: Record<DiscDimension, number | null>;
}) {
  const page = new PdfPageBuilder(PDF_THEME);
  page.fillRect(44, 722, 507, 80, PDF_THEME.sectionBlock);
  page.strokeRect(44, 722, 507, 80, PDF_THEME.divider, 0.8);
  page.text("F2", 18, 60, 772, "Deep report analysis");
  page.text("F1", 10, 60, 754, "Extended sections intended for internal team, HR, and leadership review.", PDF_THEME.textMuted);

  page.fillRect(44, 520, 507, 178, PDF_THEME.sectionBlock);
  page.strokeRect(44, 520, 507, 178, PDF_THEME.divider, 0.8);
  page.text("F2", 13, 60, 670, "Strength and collaboration signals");
  page.textBlock(
    "F1",
    10,
    60,
    648,
    input.strengths.flatMap((entry) => wrapText(`• ${entry}`, 92)).slice(0, 8),
    15,
  );

  page.fillRect(44, 332, 507, 168, PDF_THEME.sectionBlock);
  page.strokeRect(44, 332, 507, 168, PDF_THEME.divider, 0.8);
  page.text("F2", 13, 60, 474, "Communication and stakeholder alignment");
  page.textBlock("F1", 10, 60, 452, wrapText(input.communication, 92).slice(0, 7), 15);

  page.fillRect(44, 174, 247, 140, PDF_THEME.sectionBlock);
  page.strokeRect(44, 174, 247, 140, PDF_THEME.divider, 0.8);
  page.text("F2", 12, 60, 286, "Dimension detail");
  (["D", "I", "S", "C"] as const).forEach((dimension, index) => {
    page.text("F1", 10, 60, 266 - index * 18, `${dimension}  ${formatDimensionValue(input.dimensionScores[dimension])}`);
  });

  page.fillRect(304, 174, 247, 140, PDF_THEME.accentBlock);
  page.strokeRect(304, 174, 247, 140, PDF_THEME.divider, 0.8);
  page.text("F2", 12, 320, 286, "Interpretation note");
  page.textBlock("F1", 9, 320, 268, wrapText(input.explanatoryNote, 44).slice(0, 6), 13, PDF_THEME.textMuted);

  page.fillRect(44, 60, 507, 96, PDF_THEME.sectionBlock);
  page.strokeRect(44, 60, 507, 96, PDF_THEME.divider, 0.8);
  page.text("F2", 12, 60, 130, "Practical recommendation");
  page.textBlock("F1", 9, 60, 112, wrapText(input.interpretation, 92).slice(0, 3), 13);

  return page.build();
}

export function createDiscResultPdf(shared: SharedDiscResultRecord, input: { reportTier: DiscReportTier }) {
  const assessment = shared.assessment;
  const completionDate = assessment.submittedAt ?? assessment.createdAt;
  const viewModel = buildDiscResultViewModel(assessment.rawResponses);
  const placement = calculateDiscPosition(viewModel.dimensionScores);
  const profile = buildDiscProfilePresentation(viewModel);
  const narrative = buildNarrative(viewModel, profile.summary);

  const title = input.reportTier === "deep" ? "DISC Professional Report" : "DISC Profile Report";
  const subtitle =
    input.reportTier === "free"
      ? "Core behavioral profile"
      : input.reportTier === "standard"
        ? "Structured behavioral interpretation"
        : "Extended behavioral report for internal use";

  const subject = assessment.candidateName ?? assessment.candidateEmail ?? "Personal profile";

  const firstPage = new PdfPageBuilder(PDF_THEME);
  drawBaseHeader(firstPage, {
    title,
    subtitle,
    generated: formatDate(completionDate),
    subject,
    tier: input.reportTier,
  });

  firstPage.fillRect(44, 492, 328, 226, PDF_THEME.sectionBlock);
  firstPage.strokeRect(44, 492, 328, 226, PDF_THEME.divider, 0.8);
  drawDiscFigure(firstPage, { left: 86, bottom: 520, size: 220, placement });

  firstPage.fillRect(388, 492, 163, 226, PDF_THEME.sectionBlock);
  firstPage.strokeRect(388, 492, 163, 226, PDF_THEME.divider, 0.8);
  firstPage.text("F2", 12, 404, 694, "Weighting");
  firstPage.text("F1", 10, 404, 674, `D  ${formatDimensionValue(viewModel.dimensionScores.D)}`);
  firstPage.text("F1", 10, 404, 656, `I  ${formatDimensionValue(viewModel.dimensionScores.I)}`);
  firstPage.text("F1", 10, 404, 638, `S  ${formatDimensionValue(viewModel.dimensionScores.S)}`);
  firstPage.text("F1", 10, 404, 620, `C  ${formatDimensionValue(viewModel.dimensionScores.C)}`);

  firstPage.fillRect(44, 300, 507, 172, PDF_THEME.sectionBlock);
  firstPage.strokeRect(44, 300, 507, 172, PDF_THEME.divider, 0.8);
  firstPage.text("F2", 14, 60, 446, `${profile.profileTitle} (${profile.profileLabel})`);
  const summaryText = input.reportTier === "deep" ? narrative.deepSummary : profile.summary;
  firstPage.textBlock("F1", 10, 60, 422, wrapText(summaryText, 92).slice(0, input.reportTier === "free" ? 5 : 6), 15);

  firstPage.fillRect(44, 156, 507, 124, PDF_THEME.accentBlock);
  firstPage.strokeRect(44, 156, 507, 124, PDF_THEME.divider, 0.8);
  firstPage.text("F2", 12, 60, 252, "How to use this report");
  firstPage.textBlock("F1", 9, 60, 234, wrapText(profile.explanatoryNote, 92).slice(0, 4), 13, PDF_THEME.textMuted);

  firstPage.text("F1", 9, 44, 58, "Strandsbjerg · DISC profile report", PDF_THEME.textMuted);

  const pageStreams = [firstPage.build()];

  if (input.reportTier === "standard") {
    pageStreams.push(
      buildStandardPageTwo({
        strengths: narrative.strengths,
        communication: narrative.communication,
        interpretation: narrative.interpretation,
      }),
    );
  }

  if (input.reportTier === "deep") {
    pageStreams.push(
      buildDeepPageTwo({
        strengths: narrative.strengths,
        communication: narrative.communication,
        interpretation: narrative.interpretation,
        explanatoryNote: profile.explanatoryNote,
        dimensionScores: viewModel.dimensionScores,
      }),
    );
  }

  if (input.reportTier === "free") {
    pageStreams[0] = buildFreePage({
      profileTitle: profile.profileTitle,
      profileLabel: profile.profileLabel,
      summary: profile.summary,
      explanatoryNote: profile.explanatoryNote,
      dimensionScores: viewModel.dimensionScores,
      placement,
    });
  }

  return {
    pdfBytes: buildPdfBytes(pageStreams),
    mappedViewModel: viewModel,
  };
}
