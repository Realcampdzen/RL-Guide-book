export const markdownToHtml = (md: string): string => {
  if (!md) return '';

  let html = md.replace(/\r\n?/g, '\n');

  html = html
    .replace(/^(#{1,6})\s+(.+)$/gm, (_m, hashes: string, text: string) => {
      const level = Math.min(6, Math.max(1, hashes.length));
      return `<h${level}>${text}</h${level}>`;
    })
    .replace(/^\*\s+(.*)$/gim, '<li>$1</li>')
    .replace(/^-\s+(.*)$/gim, '<li>$1</li>')
    .replace(/^\d+\.\s+(.*)$/gim, '<li>$1</li>')
    .replace(/^\s*---\s*$/gm, '<hr>')
    .replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');

  html = html
    .split('\n')
    .map((line) =>
      /<\/?(h\d|li|ul|ol|p|blockquote|pre|code|strong|em|hr)>/i.test(line) || /<\/li>/.test(line)
        ? line
        : line.trim()
          ? `<p>${line}</p>`
          : ''
    )
    .join('\n');

  html = html
    .replace(/(<p><li>)/g, '<ul><li>')
    .replace(/<\/li><\/p>(\n?<p><li>)/g, '</li>$1')
    .replace(/<\/li><\/p>/g, '</li></ul>');

  return html;
};

export const cleanHtmlContent = (html: string): string => {
  return html
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/(<br\s*\/?>)\s*(<br\s*\/?>)/g, '<br>')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * Processes introduction HTML to remove specific sections:
 * - Removes only the "Философия категории" heading (h2), but keeps its paragraph content
 * - Removes "Ключевые принципы" heading (h2) and all its subsections (1 and 2)
 * - Removes horizontal rule and footer text at the bottom
 */
export const processIntroductionHtml = (html: string): string => {
  let processed = html;

  const removeH2HeadingByPhrase = (source: string, phrase: string): string => {
    const lower = source.toLowerCase();
    const phraseIndex = lower.indexOf(phrase.toLowerCase());
    if (phraseIndex === -1) return source;
    const start = lower.lastIndexOf('<h2', phraseIndex);
    if (start === -1) return source;
    const endClose = lower.indexOf('</h2>', phraseIndex);
    if (endClose === -1) return source;
    const end = endClose + '</h2>'.length;
    return source.slice(0, start) + source.slice(end);
  };

  // Remove only the "Философия категории" heading (h2), but keep its content.
  processed = removeH2HeadingByPhrase(processed, 'Философия категории');

  // Remove "Ключевые принципы" section (heading + its subsections) until the next H2 (or end).
  // We find the <h2> that actually contains the phrase, instead of using a cross-tag regex.
  (() => {
    const lower = processed.toLowerCase();
    const phrase = 'ключевые принципы';
    const phraseIndex = lower.indexOf(phrase);
    if (phraseIndex === -1) return;
    const h2Start = lower.lastIndexOf('<h2', phraseIndex);
    if (h2Start === -1) return;
    const h2EndClose = lower.indexOf('</h2>', phraseIndex);
    if (h2EndClose === -1) return;
    const h2End = h2EndClose + '</h2>'.length;

    const nextH2 = lower.indexOf('<h2', h2End);
    const sectionEnd = nextH2 === -1 ? processed.length : nextH2;
    processed = processed.slice(0, h2Start) + processed.slice(sectionEnd);
  })();

  // Remove horizontal rule at the bottom
  processed = processed.replace(/<hr[^>]*>/gi, '');

  // Remove the footer text (italic text about "Этот файл содержит...").
  // IMPORTANT: keep the regex within a single <em>...</em> to avoid deleting content
  // from other <em> blocks (e.g. the quote).
  processed = processed.replace(/<p>\s*<em>[^<]*Этот файл содержит[^<]*<\/em>\s*<\/p>/gi, '');
  processed = processed.replace(/<em>[^<]*Этот файл содержит[^<]*<\/em>/gi, '');

  // Clean up extra whitespace
  processed = cleanHtmlContent(processed);

  return processed;
};
