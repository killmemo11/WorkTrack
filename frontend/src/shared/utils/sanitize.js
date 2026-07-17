import DOMPurify from 'dompurify';

export function sanitizeHTML(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'span',
      'a', 'img', 'blockquote', 'pre', 'code', 'hr', 'sub', 'sup', 'small', 'mark',
      'style'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'colspan', 'rowspan',
      'width', 'height', 'target', 'rel', 'align', 'valign', 'border', 'cellpadding', 'cellspacing',
      'bgcolor', 'color', 'face', 'size', 'dir'],
    ALLOW_DATA_ATTR: false,
  });
}

export function isValidHttpUrl(str) {
  if (!str || typeof str !== 'string') return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
