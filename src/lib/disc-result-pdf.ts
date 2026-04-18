import type { SharedDiscResultRecord } from "@/lib/disc-result-access";
import { buildDiscResultViewModel, calculateDiscPosition, type DiscDimension } from "@/lib/disc-result-insights";

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

function findTopDimension(dimensionScores: Record<DiscDimension, number | null>) {
  return (["D", "I", "S", "C"] as const)
    .map((dimension) => ({ dimension, score: dimensionScores[dimension] ?? Number.NEGATIVE_INFINITY }))
    .sort((a, b) => b.score - a.score)[0]?.dimension;
}

function buildCompactSummary(dimensionScores: Record<DiscDimension, number | null>) {
  const top = findTopDimension(dimensionScores);

  if (top === "D") {
    return [
      "Din profil er primært D: handlekraftig og målrettet.",
      "Du trives med tydelige mål og hurtige beslutninger.",
      "I samarbejde tager du ofte initiativ og skaber fremdrift.",
      "Du motiveres af ansvar og synlige resultater.",
    ];
  }

  if (top === "I") {
    return [
      "Din profil er primært I: udadvendt og engagerende.",
      "Du skaber energi i relationer og kommunikerer let.",
      "I teams bidrager du med entusiasme og optimisme.",
      "Du motiveres af dialog, netværk og fælles momentum.",
    ];
  }

  if (top === "S") {
    return [
      "Din profil er primært S: stabil og samarbejdsorienteret.",
      "Du arbejder roligt, loyalt og med høj pålidelighed.",
      "I samarbejde skaber du tryghed og kontinuitet.",
      "Du motiveres af tydelige rammer og gode relationer.",
    ];
  }

  if (top === "C") {
    return [
      "Din profil er primært C: analytisk og kvalitetsbevidst.",
      "Du prioriterer præcision, struktur og faglig grundighed.",
      "I opgaver søger du klare kriterier og datadrevne valg.",
      "Du motiveres af kvalitet og velunderbyggede beslutninger.",
    ];
  }

  return [
    "Din profil viser en balanceret DISC-vægtning.",
    "Du tilpasser dig typisk situationen og teamets behov.",
    "Det giver fleksibilitet i både kommunikation og opgaveløsning.",
  ];
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
  const summaryLines = buildCompactSummary(viewModel.dimensionScores).flatMap((line) => wrapText(line, 75));

  const colors = {
    D: { r: 0.937, g: 0.267, b: 0.267 },
    I: { r: 0.980, g: 0.796, b: 0.133 },
    C: { r: 0.231, g: 0.510, b: 0.965 },
    S: { r: 0.133, g: 0.773, b: 0.369 },
  } as const;

  const square = {
    left: 170,
    bottom: 410,
    size: 250,
  };
  const half = square.size / 2;

  const markerX = square.left + ((placement.x + 1) / 2) * square.size;
  const markerY = square.bottom + ((placement.y + 1) / 2) * square.size;

  const textLines: string[] = [];
  const pushText = (font: "F1" | "F2", size: number, x: number, y: number, line: string) => {
    textLines.push("BT", `/${font} ${size} Tf`, `${x} ${y} Td`, `(${escapePdfText(line)}) Tj`, "ET");
  };

  pushText("F2", 24, 72, 785, "DISC Profil");
  pushText("F1", 10, 72, 765, `Dato: ${formatDateTime(completionDate)}`);

  pushText("F2", 12, 72, 650, "Vægtning");
  pushText("F1", 11, 72, 632, `D: ${formatDimensionValue(viewModel.dimensionScores.D)}`);
  pushText("F1", 11, 72, 615, `I: ${formatDimensionValue(viewModel.dimensionScores.I)}`);
  pushText("F1", 11, 72, 598, `S: ${formatDimensionValue(viewModel.dimensionScores.S)}`);
  pushText("F1", 11, 72, 581, `C: ${formatDimensionValue(viewModel.dimensionScores.C)}`);

  pushText("F2", 12, 72, 352, "Profile Summary");

  let y = 334;
  for (const line of summaryLines.slice(0, 5)) {
    pushText("F1", 10, 72, y, line);
    y -= 16;
  }

  const stream = [
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
    "0.20 0.20 0.20 RG",
    "1.4 w",
    `${square.left} ${square.bottom} ${square.size} ${square.size} re S`,
    `${square.left + half} ${square.bottom} m ${square.left + half} ${square.bottom + square.size} l S`,
    `${square.left} ${square.bottom + half} m ${square.left + square.size} ${square.bottom + half} l S`,

    // Quadrant labels
    ...textLines,
    "BT /F2 16 Tf 182 640 Td (D) Tj ET",
    "BT /F2 16 Tf 396 640 Td (I) Tj ET",
    "BT /F2 16 Tf 182 426 Td (C) Tj ET",
    "BT /F2 16 Tf 396 426 Td (S) Tj ET",

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
