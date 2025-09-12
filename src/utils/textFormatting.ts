export const pluralizeRu = (count: number, forms: [string, string, string]): string => {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
};

export const fixDescriptionFormatting = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
};

export const fixCriteriaFormatting = (text: string): string => {
  return text
    .split(/\r?\n/)
    .map(line => line.trim().replace(/^\d+\.\s*/, '\u2022 '))
    .join('\n');
};

export const extractEvidenceSection = (
  text: string
): { mainText: string; evidenceText: string } => {
  const match = text.match(/(Обоснование|Доказательство|Evidence|Proof)[:\-]?/i);
  if (match && match.index !== undefined) {
    const idx = match.index;
    return {
      mainText: text.slice(0, idx).trim(),
      evidenceText: text.slice(idx + match[0].length).trim()
    };
  }
  return { mainText: text.trim(), evidenceText: '' };
};

export const shouldApplyFormatting = (_badgeId: string): boolean => {
  return true;
};
