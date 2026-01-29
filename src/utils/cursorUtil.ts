export const CursorUtil = {
  decode: <T = unknown>(cursor?: string): T | undefined => {
    if (!cursor) return undefined;
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as T;
    } catch {
      return undefined;
    }
  },
  encode: <T = unknown>(value: T): string => {
    try {
      return Buffer.from(JSON.stringify(value)).toString('base64');
    } catch {
      return '';
    }
  }
};
