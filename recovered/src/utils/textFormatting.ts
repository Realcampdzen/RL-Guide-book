// Text formatting utilities (Cyrillic-safe) used across views

export const fixDescriptionFormatting = (text: string): string => {
  if (!text) return text;
  return text
    // Add paragraph breaks before clear section headers like "Цель:", "Примеры:", etc.
    .replace(/([.!?])\s*([А-ЯЁ][а-яё]+:)/g, '$1\n\n$2')
    // Handle two-word headers like "Как получить:" etc.
    .replace(/([.!?])\s*([А-ЯЁ][а-яё]{2,} [А-ЯЁ][а-яё]+:)/g, '$1\n\n$2')
    // Break before new topics that start with Capitalized words
    .replace(/([.!?])\s*([А-ЯЁ][а-яё]{3,} [А-ЯЁ][а-яё]+)/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const fixCriteriaFormatting = (text: string): string => {
  if (!text) return text;
  return text
    // Ensure proper spacing for bullet points
    .replace(/([.!?])\s*•/g, '$1\n\n•')
    // Add breaks before typical headers within criteria
    .replace(/([.!?])\s*([А-ЯЁ][а-яё]+:)/g, '$1\n\n$2')
    .replace(/([.!?])\s*Например:/g, '$1\n\nНапример:')
    .replace(/([.!?])\s*Это может быть:/g, '$1\n\nЭто может быть:')
    // Normalize excessive line breaks between bullet items
    .replace(/(•[^•]*?)\n{2,}(•)/g, '$1\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const extractEvidenceSection = (
  text: string
): { mainText: string; evidenceText: string | null } => {
  if (!text) return { mainText: text, evidenceText: null };
  const evidenceMatch = text.match(/(Чем подтверждается:.*?)(?=\n\n|$)/s);
  if (evidenceMatch) {
    const evidenceText = evidenceMatch[1].trim();
    const mainText = text.replace(evidenceMatch[0], '').trim();
    return { mainText, evidenceText };
  }
  return { mainText: text, evidenceText: null };
};

export const shouldApplyFormatting = (badgeId: string): boolean => {
  const skipFormattingFor: string[] = [];
  return !skipFormattingFor.includes(badgeId);
};

// Russian pluralization helper
// Usage: pluralizeRu(3, ['уровень', 'уровня', 'уровней']) => 'уровня'
export const pluralizeRu = (count: number, forms: [string, string, string]): string => {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
};

// Helper to normalize string or list-of-strings into a clean display string
export const normalizeTextField = (v: unknown): string => {
  if (Array.isArray(v)) {
    return v.map((s) => String(s).trim()).filter(Boolean).map((s) => `• ${s}`).join('\n');
  }
  return typeof v === 'string' ? v : '';
};
