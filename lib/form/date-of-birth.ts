export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Formats raw input as DD/MM/YYYY, auto-inserting slashes after day (2 digits)
 * and month (4 digits). Pass previous digit string so backspace does not re-add slashes.
 */
export function formatDobInput(text: string, prevDigits = ''): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length === 0) return '';

  const isDeleting = digits.length < prevDigits.length;
  let formatted = digits.slice(0, 2);

  if (digits.length > 2) {
    formatted += `/${digits.slice(2, 4)}`;
    if (digits.length > 4) {
      formatted += `/${digits.slice(4, 8)}`;
    } else if (digits.length === 4 && !isDeleting) {
      formatted += '/';
    }
  } else if (digits.length === 2 && !isDeleting) {
    formatted += '/';
  }

  return formatted;
}

/** ISO YYYY-MM-DD → DD/MM/YYYY for display. */
export function displayDobFromIso(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return '';
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** DD/MM/YYYY → ISO YYYY-MM-DD when the date is complete and valid. */
export function isoDobFromDisplay(display: string): string | null {
  const digits = display.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (month < 1 || month > 12 || day < 1 || year < 1900) return null;
  if (day > daysInMonth(year, month)) return null;

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  return iso;
}
