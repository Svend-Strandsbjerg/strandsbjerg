export function buildDiscPromoShareText(params: { campaignLabel: string; promoUrl: string; creditCount?: number }) {
  const credits = params.creditCount ?? 1;
  const creditLabel = credits === 1 ? "1 gratis DISC-profil" : `${credits} gratis DISC-profiler`;

  return [
    `Jeg deler en DISC-kampagne fra Strandsbjerg: ${params.campaignLabel}.`,
    `Opret en konto (eller log ind) via linket og få ${creditLabel}.`,
    `Start her: ${params.promoUrl}`,
  ].join("\n");
}
