export const normalizeForSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2019']/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[+/]/g, ' ')
    .replace(/[_]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
