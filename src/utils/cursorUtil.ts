export const CursorUtil = {
  decode: (cursor?: string): any[] | undefined => {
    if (!cursor) return undefined;
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    } catch {
      return undefined;
    }
  },
  encode: (sortValues: any[]): string => {
    return Buffer.from(JSON.stringify(sortValues)).toString('base64');
  }
};
