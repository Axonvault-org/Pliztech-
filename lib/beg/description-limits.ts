/** Matches backend BegService limits. */
export const BEG_MAX_DESCRIPTION_WORDS = 40;
export const BEG_MAX_DESCRIPTION_CHARS = 300;

export function countDescriptionWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Clamp live input: preserve trailing spaces while typing; cap words and chars. */
export function clampBegDescriptionWhileTyping(text: string): string {
  let result = text;
  if (result.length > BEG_MAX_DESCRIPTION_CHARS) {
    result = result.slice(0, BEG_MAX_DESCRIPTION_CHARS);
  }
  const words = result.trim().split(/\s+/).filter(Boolean);
  if (words.length <= BEG_MAX_DESCRIPTION_WORDS) {
    return result;
  }
  const limited = words.slice(0, BEG_MAX_DESCRIPTION_WORDS).join(' ');
  return limited.length > BEG_MAX_DESCRIPTION_CHARS
    ? limited.slice(0, BEG_MAX_DESCRIPTION_CHARS)
    : limited;
}

/** Clamp for API submit — normalizes whitespace. */
export function clampBegDescription(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  const words = trimmed.split(' ').filter(Boolean).slice(0, BEG_MAX_DESCRIPTION_WORDS);
  const joined = words.join(' ');
  return joined.length > BEG_MAX_DESCRIPTION_CHARS
    ? joined.slice(0, BEG_MAX_DESCRIPTION_CHARS)
    : joined;
}
