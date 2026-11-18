const datePattern = /\b(?:20\d{2}-\d{2}-\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+20\d{2})?)\b/gi;
const phonePattern = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g;

export function sanitizeTemplateText(value, privateNames = []) {
  let text = String(value || '');
  for (const name of privateNames.filter(Boolean).sort((a, b) => b.length - a.length)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '');
  }
  return text
    .replace(phonePattern, '')
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '')
    .replace(/\b\d{1,6}\s+[\w.'-]+(?:\s+[\w.'-]+){0,4}\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|way)\b/gi, '')
    .replace(/(?:\bcash\s?app\s*)?\$[A-Za-z0-9_.-]{2,}|@[A-Za-z0-9_.-]{2,}/gi, '')
    .replace(datePattern, '')
    .replace(/\$\s?\d[\d,]*(?:\.\d{1,2})?/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

export function sanitizeTemplateUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function privacySafeBlocks(blocks, privateNames = []) {
  return blocks.map((block) => ({
    type: String(block.type || 'activity'),
    title: sanitizeTemplateText(block.title, privateNames),
    note: sanitizeTemplateText(block.note, privateNames),
    place: sanitizeTemplateText(block.place, privateNames),
    url: sanitizeTemplateUrl(block.url),
    day_index: Math.max(1, Number(block.day_index) || 1),
    start_time: block.start_time || null,
    end_time: block.end_time || null,
    span_nights: Math.max(0, Number(block.span_nights) || 0),
    photo_id: block.photo_id || null,
  })).filter((block) => block.title);
}
