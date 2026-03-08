// Shared billing period utilities used by cron and API routes

export const FR_MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

export function buildPeriodLabel(period: string, month: number, year: number): string {
  if (period === 'ANNUAL') return `Année ${year}`;
  if (period === 'QUARTERLY') return `Q${Math.ceil(month / 3)} ${year}`;
  return `${FR_MONTHS[month - 1]} ${year}`;
}
