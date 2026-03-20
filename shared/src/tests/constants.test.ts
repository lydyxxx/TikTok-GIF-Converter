import { describe, it, expect } from 'vitest';
import { TELEGRAM_CONSTRAINTS } from '@ttgifconv/shared';

describe('Shared Constants', () => {
  it('should have correct Telegram constraints', () => {
    expect(TELEGRAM_CONSTRAINTS.MAX_WIDTH).toBe(512);
    expect(TELEGRAM_CONSTRAINTS.MAX_HEIGHT).toBe(512);
    expect(TELEGRAM_CONSTRAINTS.MAX_DURATION).toBe(3);
    expect(TELEGRAM_CONSTRAINTS.MAX_FILE_SIZE).toBe(256 * 1024);
  });
});
