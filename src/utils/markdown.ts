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
