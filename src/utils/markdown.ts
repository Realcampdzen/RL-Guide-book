export const markdownToHtml = (md: string): string => {
  if (!md) return '';

  let html = md.replace(/\r\n?/g, '\n');

  html = html
    .replace(/^(#{1,6})\s+(.+)$/gm, (_m, hashes: string, text: string) => {
      const level = Math.min(6, Math.max(1, hashes.length));
      return `<h${level}>${text}<\/h${level}>`;
    })
    .replace(/^\*\s+(.*)$/gim, '<li>$1<\/li>')
    .replace(/^\-\s+(.*)$/gim, '<li>$1<\/li>')
    .replace(/^\d+\.\s+(.*)$/gim, '<li>$1<\/li>')
    .replace(/^\s*---\s*$/gm, '<hr>')
    .replace(/^>\s+(.*)$/gm, '<blockquote>$1<\/blockquote>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1<\/strong>');
  html = html.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2<\/em>');

  html = html
    .split('\n')
    .map((line) =>
      /<\/?(h\d|li|ul|ol|p|blockquote|pre|code|strong|em|hr)>/i.test(line) || /<\/li>/.test(line)
        ? line
        : line.trim()
          ? `<p>${line}<\/p>`
          : ''
    )
    .join('\n');

  html = html
    .replace(/(<p><li>)/g, '<ul><li>')
    .replace(/<\/li><\/p>(\n?<p><li>)/g, '<\/li>$1')
    .replace(/<\/li><\/p>/g, '<\/li><\/ul>');

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

  // Remove only the "Философия категории" heading (h2 with 🎯 emoji), but keep its content
  processed = processed.replace(/<h2>.*?🎯.*?Философия категории.*?<\/h2>/gis, '');

  // Remove "Ключевые принципы" heading (h2 with 🌟 emoji)
  const keyPrinciplesIndex = processed.search(/<h2>.*?🌟.*?Ключевые принципы.*?<\/h2>/gis);
  if (keyPrinciplesIndex !== -1) {
    // Find the start of the next h2 section after "Ключевые принципы"
    const afterKeyPrinciples = processed.substring(keyPrinciplesIndex);
    const nextH2Index = afterKeyPrinciples.search(/<h2>/i);
    
    if (nextH2Index !== -1) {
      // Remove from "Ключевые принципы" heading to the start of the next h2
      processed = processed.substring(0, keyPrinciplesIndex) + processed.substring(keyPrinciplesIndex + nextH2Index);
    } else {
      // If no next h2, remove everything from "Ключевые принципы" heading onwards
      processed = processed.substring(0, keyPrinciplesIndex);
    }
  }

  // Remove horizontal rule at the bottom
  processed = processed.replace(/<hr[^>]*>/gi, '');

  // Remove the footer text (italic text about "Этот файл содержит...")
  processed = processed.replace(/<p>.*?<em>.*?Этот файл содержит.*?<\/em>.*?<\/p>/gis, '');
  processed = processed.replace(/<em>.*?Этот файл содержит.*?<\/em>/gis, '');

  // Clean up extra whitespace
  processed = cleanHtmlContent(processed);

  return processed;
};
