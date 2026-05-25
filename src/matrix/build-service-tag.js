/**
 * Build a service-scoped image tag that fits within max_length, with the
 * service prefix and per-service counter suffix protected (never truncated).
 *
 * The opaque `tag` middle (which typically encodes branch + date + outer counter
 * from an upstream determine-image-tag run) is the elastic component. If the
 * concatenation overflows, we slice `tag` from the right and strip any trailing
 * '-' / '_' so the result never ends in a separator.
 *
 * Invariants mirror those of skyhook-io/determine-image-tag's auto-generation
 * path (see PR https://github.com/skyhook-io/determine-image-tag/pull/2):
 *   1. Service prefix and counter suffix are protected.
 *   2. The middle part is elastic.
 *   3. Trim trailing '-' / '_' after every truncation.
 *   4. Drop empty parts so the join never emits adjacent separators.
 *   5. Final length <= maxLength.
 *
 * @param {string} serviceName - Service name prefix.
 * @param {string} tag - Opaque tag middle (e.g. "<branch>_<date>_<NN>").
 * @param {string} counterStr - Two-digit (or wider) per-service counter, no leading '_'.
 * @param {number} [maxLength=63] - Maximum total length. Default matches the K8s
 *   label limit. Raise to 128 if only used in image tag / GitHub release names.
 * @returns {string}
 */
function buildServiceTag(serviceName, tag, counterStr, maxLength = 63) {
  if (typeof maxLength !== 'number' || !Number.isFinite(maxLength) || maxLength <= 0) {
    throw new Error(`buildServiceTag: maxLength must be a positive integer, got ${maxLength}`);
  }

  const svc = String(serviceName || '');
  const cnt = String(counterStr || '');
  const mid = String(tag || '');

  // Fixed parts: <svc><_><mid><_><cnt>. Separators count only when the parts they
  // join are non-empty -- we compute the budget conservatively, then build by
  // joining only non-empty parts so unused separators evaporate.
  const fixedSepCount = (svc ? 1 : 0) + (cnt ? 1 : 0);
  const fixedLen = svc.length + cnt.length + fixedSepCount;

  if (fixedLen > maxLength) {
    // Service + counter alone overflow. Best-effort: truncate service so cnt fits.
    const availSvc = Math.max(0, maxLength - cnt.length - (cnt ? 1 : 0));
    const truncatedSvc = trimTrailingSep(svc.slice(0, availSvc));
    return joinNonEmpty('_', [truncatedSvc, cnt]);
  }

  const availForTag = maxLength - fixedLen;
  let truncatedTag = mid;
  if (availForTag <= 0) {
    truncatedTag = '';
  } else if (mid.length > availForTag) {
    truncatedTag = trimTrailingSep(mid.slice(0, availForTag));
  }

  return joinNonEmpty('_', [svc, truncatedTag, cnt]);
}

/**
 * Strip trailing '-' and '_' characters.
 * @param {string} s
 * @returns {string}
 */
function trimTrailingSep(s) {
  return String(s || '').replace(/[-_]+$/, '');
}

/**
 * Join non-empty string parts with a separator. Skips empty/falsy entries so
 * the result never has adjacent separators or leading/trailing separators
 * caused by empty middle parts.
 * @param {string} sep
 * @param {Array<string>} parts
 * @returns {string}
 */
function joinNonEmpty(sep, parts) {
  return (parts || []).filter(p => p !== undefined && p !== null && p !== '').join(sep);
}

/**
 * Build the prefix of a service_tag — the portion before the final "_<counter>".
 * Used when scanning existing git tags to find prior counters: callers must
 * search using the SAME truncation rules that buildServiceTag applies when
 * minting new tags, otherwise truncated tags from prior runs are missed and
 * the counter resets, causing collisions.
 *
 * @param {string} serviceName
 * @param {string} tag
 * @param {number} [maxLength=63]
 * @param {number} [counterDigits=2] - Counter width to reserve in the budget.
 * @returns {string}
 */
function buildServiceTagPrefix(serviceName, tag, maxLength = 63, counterDigits = 2) {
  const placeholder = '0'.repeat(Math.max(1, counterDigits));
  const sample = buildServiceTag(serviceName, tag, placeholder, maxLength);
  // Strip the trailing "_<digits>" we just appended.
  return sample.replace(/_\d+$/, '');
}

module.exports = {
  buildServiceTag,
  buildServiceTagPrefix,
  trimTrailingSep,
  joinNonEmpty,
};
