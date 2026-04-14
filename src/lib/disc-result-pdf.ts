import type { SharedDiscResultRecord } from "@/lib/disc-result-access";
import { buildDiscResultViewModel } from "@/lib/disc-result-insights";

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

function escapePdfText(input: string) {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text: string, limit = 95) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > limit) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function buildPdfBytes(lines: string[]) {
  const safeLines = lines.map((line) => escapePdfText(line));
  const streamLines = ["BT", "/F1 11 Tf", "72 770 Td", "14 TL"];

  for (const line of safeLines) {
    streamLines.push(`(${line}) Tj`, "T*");
  }

  streamLines.push("ET");

  const stream = streamLines.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "binary");
}

function formatDimensionValue(value: number | null) {
  if (value === null) {
    return "—";
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

export function createDiscResultPdf(shared: SharedDiscResultRecord) {
  const assessment = shared.assessment;
  const completionDate = assessment.submittedAt ?? assessment.createdAt;
  const viewModel = buildDiscResultViewModel(assessment.rawResponses);
  const candidateLabel = assessment.candidateName ?? assessment.candidateEmail ?? "Candidate";
  const companyLabel = assessment.company?.name;
  const qualityIndicatorEntries = Object.entries(viewModel.qualityIndicators);

  const lines: string[] = [
    "DISC Profile Result",
    "DISC highlights how people tend to communicate, make decisions, and collaborate at work.",
    "",
    ...(companyLabel ? [`You have been invited by ${companyLabel}.`] : []),
    `Candidate: ${candidateLabel}`,
    `Completed: ${formatDate(completionDate)}`,
    "",
    "DISC dimensions",
    `D: ${formatDimensionValue(viewModel.dimensionScores.D)}`,
    `I: ${formatDimensionValue(viewModel.dimensionScores.I)}`,
    `S: ${formatDimensionValue(viewModel.dimensionScores.S)}`,
    `C: ${formatDimensionValue(viewModel.dimensionScores.C)}`,
    "",
    "Your profile summary",
    ...(viewModel.profileSummary ? wrapLine(viewModel.profileSummary) : ["No profile summary was returned by disc-engine."]),
    "",
    `Primary dimension: ${viewModel.primaryDimension ?? "—"}`,
    `Secondary dimension: ${viewModel.secondaryDimension ?? "—"}`,
    `Lifecycle status: ${viewModel.lifecycleStatus ?? "—"}`,
  ];

  if (qualityIndicatorEntries.length > 0) {
    lines.push("", "Quality indicators");
    for (const [key, value] of qualityIndicatorEntries.slice(0, 8)) {
      lines.push(...wrapLine(`${key}: ${typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value)}`));
    }
  }

  lines.push("", "This assessment was generated using the DISC framework.");

  return {
    pdfBytes: buildPdfBytes(lines.slice(0, 220)),
    mappedViewModel: viewModel,
  };
}
