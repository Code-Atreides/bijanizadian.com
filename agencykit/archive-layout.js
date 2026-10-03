/** Pure viewport layout and pagination helpers for the archive. */
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const ASPECT = 16 / 9;
const CAPTION_HEIGHT = 36;
const RESULT_CAPTION_HEIGHT = 74;

function seededRandom(seed) {
  let state = 2166136261;
  for (const character of String(seed)) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function homeLayout(width, height, seed) {
  const random = seededRandom(seed);
  const mobile = width < 850;
  const edge = 8;
  const gap = mobile ? 14 : 24;
  const innerWidth = Math.max(0, width - edge * 2);
  const innerHeight = Math.max(0, height - edge * 2);
  const preferredColumns = mobile ? 3 : width >= 1650 ? 8 : width >= 1350 ? 7 : width >= 1000 ? 6 : 4;
  const columns = Math.min(preferredColumns, Math.floor((innerWidth + gap) / (80 + gap)));
  const empty = () => ({ width, height, slots: [], capacity: 0, columns: Math.max(0, columns), rows: 0, captionHeight: CAPTION_HEIGHT });
  if (columns < 1) return empty();
  const cellWidth = (innerWidth - gap * (columns - 1)) / columns;
  const minWidth = Math.min(cellWidth, mobile ? 95 : 140);
  const minHeight = minWidth / ASPECT + CAPTION_HEIGHT;
  const fittingRows = Math.floor((innerHeight + gap) / (minHeight + gap));
  if (fittingRows < 1) return empty();
  const targetStep = mobile ? 145 : 180;
  const rows = Math.min(fittingRows, mobile ? 6 : Infinity, Math.max(1, Math.round(height / targetStep)));
  const rowWidthLimit = ((innerHeight - gap * (rows - 1)) / rows - CAPTION_HEIGHT) * ASPECT;
  const maxWidth = Math.min(cellWidth, rowWidthLimit, mobile ? 125 : 200);
  const slots = [];
  for (let column = 0; column < columns; column += 1) {
    const sizes = Array.from({ length: rows }, () => {
      const tileWidth = minWidth + random() * Math.max(0, maxWidth - minWidth);
      return { width: tileWidth, visualHeight: tileWidth / ASPECT, height: tileWidth / ASPECT + CAPTION_HEIGHT };
    });
    const remaining = Math.max(0, innerHeight - sizes.reduce((sum, tile) => sum + tile.height, 0) - gap * (rows - 1));
    // Give every column a different vertical phase, rather than keeping the
    // first row pinned to a shared baseline. Leave some slack between tiles.
    const edgeBudget = Math.min(120, remaining * (0.72 + random() * 0.18));
    const phase = (column * 0.61803398875 + random() * 0.4) % 1;
    const topSpace = rows === 1 ? remaining / 2 : edgeBudget * phase;
    const bottomSpace = rows === 1 ? remaining / 2 : edgeBudget - topSpace;
    const gapSpace = Math.max(0, remaining - topSpace - bottomSpace);
    const weights = Array.from({ length: rows - 1 }, () => 0.45 + random() * 1.1);
    const weightTotal = weights.reduce((sum, value) => sum + value, 0);
    let y = edge + topSpace;
    sizes.forEach((tile, row) => {
      slots.push({
        x: edge + column * (cellWidth + gap) + random() * Math.max(0, cellWidth - tile.width),
        y,
        ...tile,
        captionHeight: CAPTION_HEIGHT,
      });
      y += tile.height + gap + (weights[row] ? gapSpace * weights[row] / weightTotal : 0);
    });
  }
  slots.sort((a, b) => a.y - b.y || a.x - b.x);
  return { width, height, slots, capacity: slots.length, columns, rows, captionHeight: CAPTION_HEIGHT };
}

/**
 * Coordinates are relative to the actual archive canvas, not the viewport.
 * Home fills an overscanned canvas and deliberately continues behind fixed UI.
 * Results use bounded grid placement, with an optional protected exclusion.
 * Results reserve two readable title lines and a metadata line. Home keeps
 * its existing decorative spacing because those tiles have no visible labels.
 */
export function generateArchiveLayout({ width = 0, height = 0, home = true, exclusion = null, seed = 0 } = {}) {
  width = Math.max(0, finite(width));
  height = Math.max(0, finite(height));
  if (home) return homeLayout(width, height, seed);
  const captionHeight = RESULT_CAPTION_HEIGHT;
  const mobile = width < 600;
  const tablet = width < 1000;
  const edge = 8;
  const gap = mobile ? 14 : 22;
  const minWidth = mobile ? 80 : tablet ? 100 : 130;
  const maxWidth = 280;
  const columns = mobile ? 2 : tablet ? 3 : 4;
  const maxRows = 3;
  const maxCapacity = mobile ? 6 : tablet ? 9 : 12;
  const inner = { x: edge, y: edge, width: Math.max(0, width - edge * 2), height: Math.max(0, height - edge * 2) };
  const empty = () => ({ width, height, slots: [], capacity: 0, columns, rows: 0, captionHeight });
  if (inner.width < minWidth || inner.height < minWidth / ASPECT + captionHeight) return empty();

  let regions = [inner];
  if (exclusion && finite(exclusion.width) > 0 && finite(exclusion.height) > 0) {
    const left = clamp(finite(exclusion.x), inner.x, inner.x + inner.width);
    const top = clamp(finite(exclusion.y), inner.y, inner.y + inner.height);
    const right = clamp(finite(exclusion.x) + finite(exclusion.width), inner.x, inner.x + inner.width);
    const bottom = clamp(finite(exclusion.y) + finite(exclusion.height), inner.y, inner.y + inner.height);
    if (right > left && bottom > top) {
      // Exclusion already includes the caller's breathing room. Adding another
      // gap here would unnecessarily discard the last mobile row.
      const clearance = 0;
      // Four disjoint rectangles leave the protected search region untouched.
      regions = [
        { x: inner.x, y: inner.y, width: inner.width, height: Math.max(0, top - inner.y - clearance) },
        { x: inner.x, y: top, width: Math.max(0, left - inner.x - clearance), height: bottom - top },
        { x: right + clearance, y: top, width: Math.max(0, inner.x + inner.width - right - clearance), height: bottom - top },
        { x: inner.x, y: bottom + clearance, width: inner.width, height: Math.max(0, inner.y + inner.height - bottom - clearance) },
      ];
    }
  }

  const candidates = [];
  let mostRows = 0;
  for (const [regionIndex, region] of regions.entries()) {
    const fittingColumns = Math.floor((region.width + gap) / (minWidth + gap));
    const regionColumns = Math.min(columns, fittingColumns);
    const regionRows = Math.min(maxRows, Math.floor((region.height + gap) / (minWidth / ASPECT + captionHeight + gap)));
    if (regionColumns < 1 || regionRows < 1) continue;
    mostRows = Math.max(mostRows, regionRows);
    const cellWidth = (region.width - (regionColumns - 1) * gap) / regionColumns;
    const cellHeight = (region.height - (regionRows - 1) * gap) / regionRows;
    for (let row = 0; row < regionRows; row += 1) {
      for (let column = 0; column < regionColumns; column += 1) {
        const ordinal = row * regionColumns + column + regionIndex * 3;
        const variation = home ? [0.88, 1, 0.82, 0.95, 0.9, 0.84][ordinal % 6] : 1;
        const availableWidth = Math.min(cellWidth, (cellHeight - captionHeight) * ASPECT, maxWidth);
        const tileWidth = Math.max(minWidth, availableWidth * variation);
        const visualHeight = tileWidth / ASPECT;
        const tileHeight = visualHeight + captionHeight;
        const freeX = Math.max(0, cellWidth - tileWidth);
        const freeY = Math.max(0, cellHeight - tileHeight);
        const horizontalBias = home ? [0.32, 0.68, 0.48][ordinal % 3] : 0.5;
        const verticalBias = home ? [0.3, 0.65, 0.45][ordinal % 3] : 0.5;
        candidates.push({
          x: region.x + column * (cellWidth + gap) + freeX * horizontalBias,
          y: region.y + row * (cellHeight + gap) + freeY * verticalBias,
          width: tileWidth,
          height: tileHeight,
          visualHeight,
          captionHeight,
        });
      }
    }
  }
  candidates.sort((a, b) => a.y - b.y || a.x - b.x);
  // Sample across the entire available field if a very large viewport has room
  // for more tiles than the intended visual density.
  const capacity = Math.min(maxCapacity, candidates.length);
  const slots = capacity === candidates.length ? candidates : Array.from({ length: capacity }, (_, i) => candidates[Math.floor((i + 0.5) * candidates.length / capacity)]);
  return { width, height, slots, capacity, columns, rows: mostRows, captionHeight };
}

/** Fisher–Yates on a copy. The optional RNG makes deliberate shuffles testable. */
export function shuffleItems(items, random = Math.random) {
  const result = Array.isArray(items) ? [...items] : [];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const unit = clamp(finite(random()), 0, 1 - Number.EPSILON);
    const j = Math.floor(unit * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Zero-based, clamped pagination; zero capacity yields no unusable pages. */
export function paginateItems(items, page = 0, capacity = 0) {
  const source = Array.isArray(items) ? items : [];
  capacity = Math.max(0, Math.floor(finite(capacity)));
  const total = source.length;
  const pageCount = capacity ? Math.ceil(total / capacity) : 0;
  page = pageCount ? clamp(Math.floor(finite(page)), 0, pageCount - 1) : 0;
  return {
    items: capacity ? source.slice(page * capacity, (page + 1) * capacity) : [],
    page,
    pageCount,
    total,
    capacity,
    hasPrevious: pageCount > 0 && page > 0,
    hasNext: pageCount > 0 && page < pageCount - 1,
  };
}
