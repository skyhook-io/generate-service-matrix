const { buildServiceTag, buildServiceTagPrefix, trimTrailingSep, joinNonEmpty } = require('../src/matrix/build-service-tag');

describe('trimTrailingSep', () => {
  test('removes trailing -', () => {
    expect(trimTrailingSep('foo-')).toBe('foo');
  });
  test('removes trailing _', () => {
    expect(trimTrailingSep('foo_')).toBe('foo');
  });
  test('removes multiple trailing separators', () => {
    expect(trimTrailingSep('foo-_-_')).toBe('foo');
  });
  test('does not touch interior separators', () => {
    expect(trimTrailingSep('foo-bar_baz')).toBe('foo-bar_baz');
  });
  test('empty string passes through', () => {
    expect(trimTrailingSep('')).toBe('');
  });
  test('all-separator string becomes empty', () => {
    expect(trimTrailingSep('---')).toBe('');
  });
});

describe('joinNonEmpty', () => {
  test('joins non-empty parts', () => {
    expect(joinNonEmpty('_', ['a', 'b', 'c'])).toBe('a_b_c');
  });
  test('skips empty strings', () => {
    expect(joinNonEmpty('_', ['a', '', 'c'])).toBe('a_c');
  });
  test('skips null/undefined', () => {
    expect(joinNonEmpty('_', ['a', null, undefined, 'c'])).toBe('a_c');
  });
  test('all empty -> empty string', () => {
    expect(joinNonEmpty('_', ['', '', ''])).toBe('');
  });
});

describe('buildServiceTag', () => {
  describe('happy path (no truncation)', () => {
    test('short service + short tag + counter fits', () => {
      const out = buildServiceTag('api', 'main_2026-05-25_01', '03');
      expect(out).toBe('api_main_2026-05-25_01_03');
      expect(out.length).toBeLessThanOrEqual(63);
    });

    test('user-reported case: my-service-aa + long branch fits to 63', () => {
      // service.name = "my-service-aa" (13)
      // tag = "long-branch-name-with-many-dashes-here_2026-05-25_01" (52)
      // counter = "27" (2)
      // Total = 13 + 1 + 52 + 1 + 2 = 69 -> truncate middle
      const out = buildServiceTag(
        'my-service-aa',
        'long-branch-name-with-many-dashes-here_2026-05-25_01',
        '27',
      );
      expect(out.length).toBeLessThanOrEqual(63);
      expect(out.startsWith('my-service-aa_')).toBe(true);
      expect(out.endsWith('_27')).toBe(true);
      expect(/[-_]$/.test(out)).toBe(false); // no trailing separator
      expect(/__|--/.test(out)).toBe(false); // no double separators
    });
  });

  describe('truncation', () => {
    test('truncates middle when total exceeds maxLength', () => {
      const tag = 'a'.repeat(80); // very long middle
      const out = buildServiceTag('svc', tag, '99');
      expect(out.length).toBeLessThanOrEqual(63);
      expect(out.startsWith('svc_')).toBe(true);
      expect(out.endsWith('_99')).toBe(true);
    });

    test('strips trailing - when truncation lands on -', () => {
      // Craft tag where character at the truncation point is '-'.
      // maxLength=63, svc='svc' (3), counter='99' (2)
      // fixedLen = 3 + 2 + 2 = 7. availForTag = 56.
      // Build a 60-char tag with '-' at index 55.
      const tag = 'a'.repeat(55) + '-extras';
      const out = buildServiceTag('svc', tag, '99');
      expect(out.length).toBeLessThanOrEqual(63);
      expect(/[-_]$/.test(out)).toBe(false);
      expect(out.endsWith('_99')).toBe(true);
    });

    test('strips trailing _ when truncation lands on _', () => {
      const tag = 'a'.repeat(55) + '_extras';
      const out = buildServiceTag('svc', tag, '99');
      expect(out.length).toBeLessThanOrEqual(63);
      expect(/[-_]$/.test(out)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('empty middle tag is dropped (no double underscore)', () => {
      const out = buildServiceTag('svc', '', '03');
      expect(out).toBe('svc_03');
      expect(/__/.test(out)).toBe(false);
    });

    test('empty service is dropped', () => {
      const out = buildServiceTag('', 'main_2026-05-25', '03');
      expect(out).toBe('main_2026-05-25_03');
    });

    test('empty counter is dropped', () => {
      const out = buildServiceTag('svc', 'main_2026-05-25', '');
      expect(out).toBe('svc_main_2026-05-25');
    });

    test('all empty -> empty string', () => {
      expect(buildServiceTag('', '', '')).toBe('');
    });

    test('3+ digit counter (overflow) still preserved at suffix', () => {
      const out = buildServiceTag('svc', 'a'.repeat(80), '100');
      expect(out.length).toBeLessThanOrEqual(63);
      expect(out.endsWith('_100')).toBe(true);
    });
  });

  describe('budget pathologies', () => {
    test('service + counter alone exceeds maxLength: truncate service, keep counter', () => {
      const out = buildServiceTag('very-long-service-name-indeed', 'mid', '99', 20);
      expect(out.length).toBeLessThanOrEqual(20);
      expect(out.endsWith('_99')).toBe(true);
      expect(/[-_]$/.test(out)).toBe(false);
    });

    test('maxLength forces empty middle', () => {
      // service 10 + counter 2 + 2 seps = 14. maxLength=14. middle has 0 budget.
      const out = buildServiceTag('a-service-', 'whatever', '99', 14);
      // Service trimmed: 'a-service' (trailing - stripped). Tag dropped.
      // Result: 'a-service_99' (12 chars).
      expect(out.length).toBeLessThanOrEqual(14);
      expect(out.endsWith('_99')).toBe(true);
      expect(/__/.test(out)).toBe(false);
    });

    test('throws on non-positive maxLength', () => {
      expect(() => buildServiceTag('s', 't', '1', 0)).toThrow();
      expect(() => buildServiceTag('s', 't', '1', -5)).toThrow();
      expect(() => buildServiceTag('s', 't', '1', 'oops')).toThrow();
    });

    test('custom maxLength=128 keeps long tags intact', () => {
      const out = buildServiceTag(
        'my-service-aa',
        'long-branch-name-with-many-dashes-here_2026-05-25_01',
        '27',
        128,
      );
      expect(out).toBe('my-service-aa_long-branch-name-with-many-dashes-here_2026-05-25_01_27');
    });
  });
});

describe('buildServiceTagPrefix', () => {
  test('prefix of a tag that does not truncate', () => {
    // buildServiceTag("api", "main_2026-05-25", "03") = "api_main_2026-05-25_03"
    // Prefix should be "api_main_2026-05-25"
    expect(buildServiceTagPrefix('api', 'main_2026-05-25')).toBe('api_main_2026-05-25');
  });

  test('prefix matches the truncated form when buildServiceTag would truncate', () => {
    // user case: full tag concat = 69 chars, gets truncated.
    const full = buildServiceTag(
      'my-service-aa',
      'long-branch-name-with-many-dashes-here_2026-05-25_01',
      '99',
    );
    const prefix = buildServiceTagPrefix(
      'my-service-aa',
      'long-branch-name-with-many-dashes-here_2026-05-25_01',
    );
    // The full tag must START with the prefix and the only suffix difference
    // must be the counter "_99".
    expect(full.startsWith(prefix + '_')).toBe(true);
    expect(full.slice(prefix.length + 1)).toBe('99');
  });

  test('regex built from prefix matches buildServiceTag output for 2-digit counters', () => {
    // The critical contract: prefix + "_<counter>" regex must match minted tags
    // for 2-digit counters (the common case getExistingTagCounters needs).
    // 3+ digit counters fall outside this contract — same limitation determine-image-tag
    // has when a per-day-per-branch counter overflows _99 → _100 (the middle shrinks
    // to make room, breaking prefix continuity exactly once at the transition).
    function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    const tag = 'long-branch-name-with-many-dashes-here_2026-05-25_01';
    const prefix = buildServiceTagPrefix('my-service-aa', tag);
    const pattern = new RegExp(`^${escapeRegExp(prefix)}_(\\d+)$`);

    for (const counter of ['01', '27', '99']) {
      const minted = buildServiceTag('my-service-aa', tag, counter);
      const match = minted.match(pattern);
      expect(match).not.toBeNull();
      expect(match[1]).toBe(counter);
    }
  });

  test('prefix with empty service', () => {
    expect(buildServiceTagPrefix('', 'main_2026-05-25')).toBe('main_2026-05-25');
  });

  test('prefix with empty tag', () => {
    expect(buildServiceTagPrefix('svc', '')).toBe('svc');
  });
});
