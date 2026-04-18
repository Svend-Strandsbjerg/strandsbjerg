import type { SharedDiscResultRecord } from "@/lib/disc-result-access";
import { buildDiscProfileSummary, buildDiscResultViewModel, calculateDiscPosition, type DiscDimension } from "@/lib/disc-result-insights";

function escapePdfText(input: string) {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function rgb(color: { r: number; g: number; b: number }) {
  return `${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)}`;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("da-DK", { dateStyle: "medium", timeStyle: "short" }).format(value);
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

function getTopDimension(dimensionScores: Record<DiscDimension, number | null>) {
  return (["D", "I", "S", "C"] as const)
    .map((dimension) => ({ dimension, score: dimensionScores[dimension] ?? Number.NEGATIVE_INFINITY }))
    .sort((a, b) => b.score - a.score)[0]?.dimension ?? null;
}

function buildPrimaryTraits(dimensionScores: Record<DiscDimension, number | null>) {
  const top = getTopDimension(dimensionScores);

  if (top === "D") {
    return ["Handlekraftig", "Resultatorienteret", "Beslutningsstærk"];
  }
  if (top === "I") {
    return ["Energisk", "Relationel", "Overbevisende"];
  }
  if (top === "S") {
    return ["Stabil", "Loyal", "Samarbejdsorienteret"];
  }
  if (top === "C") {
    return ["Analytisk", "Struktureret", "Kvalitetsbevidst"];
  }

  return ["Fleksibel", "Balanceret", "Tilpasningsdygtig"];
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
    'h',
  ];
}

function buildPdfBytes(contentStream: string) {
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
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

export function createDiscResultPdf(shared: SharedDiscResultRecord) {
  const assessment = shared.assessment;
  const completionDate = assessment.submittedAt ?? assessment.createdAt;
  const viewModel = buildDiscResultViewModel(assessment.rawResponses);
  const placement = calculateDiscPosition(viewModel.dimensionScores);
  const profileSummary = buildDiscProfileSummary(viewModel);
  const summaryLines = wrapText(profileSummary, 78);
  const primaryTraits = buildPrimaryTraits(viewModel.dimensionScores);

  const colors = {
    D: { r: 0.937, g: 0.267, b: 0.267 },
    I: { r: 0.980, g: 0.796, b: 0.133 },
    C: { r: 0.231, g: 0.510, b: 0.965 },
    S: { r: 0.133, g: 0.773, b: 0.369 },
  } as const;

  const square = {
    left: 72,
    bottom: 418,
    size: 280,
  };
  const half = square.size / 2;

  const markerX = square.left + ((placement.x + 1) / 2) * square.size;
  const markerY = square.bottom + ((placement.y + 1) / 2) * square.size;

  const textLines: string[] = [];
  const pushText = (font: "F1" | "F2", size: number, x: number, y: number, line: string) => {
    textLines.push("BT", `/${font} ${size} Tf`, `${x} ${y} Td`, `(${escapePdfText(line)}) Tj`, "ET");
  };

  pushText("F2", 30, 72, 785, "DISC Profil");
  pushText("F1", 10, 72, 767, "Executive summary");
  pushText("F1", 10, 72, 744, `Navn: ${assessment.candidateName ?? assessment.company?.name ?? "Kandidat"}`);
  pushText("F1", 10, 300, 744, `Dato: ${formatDateTime(completionDate)}`);

  pushText("F2", 11, 382, 678, "Vægtning");
  pushText("F1", 10, 382, 660, `D  ${formatDimensionValue(viewModel.dimensionScores.D)}`);
  pushText("F1", 10, 382, 644, `I  ${formatDimensionValue(viewModel.dimensionScores.I)}`);
  pushText("F1", 10, 382, 628, `S  ${formatDimensionValue(viewModel.dimensionScores.S)}`);
  pushText("F1", 10, 382, 612, `C  ${formatDimensionValue(viewModel.dimensionScores.C)}`);
  pushText("F1", 9, 382, 586, `Spot: x ${placement.x.toFixed(2)}, y ${placement.y.toFixed(2)}`);

  pushText("F2", 11, 382, 548, "Primære karaktertræk");
  let traitY = 531;
  for (const trait of primaryTraits) {
    pushText("F1", 10, 396, traitY, `- ${trait}`);
    traitY -= 16;
  }

  pushText("F2", 11, 72, 356, "Profile Summary");
  let y = 338;
  for (const line of summaryLines.slice(0, 5)) {
    pushText("F1", 10, 72, y, line);
    y -= 15;
  }

  pushText("F1", 9, 72, 56, "Strandsbjerg · DISC rapport");

  const stream = [
    // Header accents and section cards
    "0.96 0.97 0.99 rg",
    "72 758 451 32 re f",
    "0.95 0.96 0.98 rg",
    "372 568 151 128 re f",
    "0.95 0.96 0.98 rg",
    "72 308 451 64 re f",

    // DISC square quadrants
    `${rgb(colors.D)} rg`,
    `${square.left} ${square.bottom + half} ${half} ${half} re f`,
    `${rgb(colors.I)} rg`,
    `${square.left + half} ${square.bottom + half} ${half} ${half} re f`,
    `${rgb(colors.C)} rg`,
    `${square.left} ${square.bottom} ${half} ${half} re f`,
    `${rgb(colors.S)} rg`,
    `${square.left + half} ${square.bottom} ${half} ${half} re f`,

    // Borders / axes
    "0.25 0.28 0.34 RG",
    "1.2 w",
    `${square.left} ${square.bottom} ${square.size} ${square.size} re S`,
    `${square.left + half} ${square.bottom} m ${square.left + half} ${square.bottom + square.size} l S`,
    `${square.left} ${square.bottom + half} m ${square.left + square.size} ${square.bottom + half} l S`,

    // Quadrant labels
    ...textLines,
    "BT /F2 16 Tf 88 677 Td (D) Tj ET",
    "BT /F2 16 Tf 334 677 Td (I) Tj ET",
    "BT /F2 16 Tf 88 431 Td (C) Tj ET",
    "BT /F2 16 Tf 334 431 Td (S) Tj ET",

    // Marker
    "0.07 0.10 0.16 rg",
    ...circlePath(markerX, markerY, 7),
    "f",
    "1 1 1 RG",
    "1.3 w",
    ...circlePath(markerX, markerY, 7),
    "S",
  ].join("\n");

  return {
    pdfBytes: buildPdfBytes(stream),
    mappedViewModel: viewModel,
  };
}
