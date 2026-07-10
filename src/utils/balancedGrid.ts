/**
 * Balanced row sizing for card grids so orphan items don't leave awkward holes.
 *
 * Examples at cols=3: 3→[3], 4→[2,2], 5→[3,2], 7→[3,2,2], 8→[3,3,2], 10→[3,3,2,2]
 * Examples at cols=4: 5→[3,2], 6→[4,2], 9→[4,3,2], 13→[4,4,3,2]
 */
export function balancedRows(count: number, cols: number): number[] {
  if (count <= 0 || cols <= 0) return [];
  if (count <= cols) return [count];

  const remainder = count % cols;
  if (remainder === 0) {
    return Array.from({ length: count / cols }, () => cols);
  }

  if (remainder === 1) {
    if (count === 1) return [1];
    const tailPair: [number, number] = cols === 3 ? [2, 2] : [3, 2];
    const leading = count - tailPair[0] - tailPair[1];
    const fullRows = Math.floor(leading / cols);
    const rows = Array.from({ length: fullRows }, () => cols);
    return [...rows, ...tailPair];
  }

  const fullRows = Math.floor(count / cols);
  const rows = Array.from({ length: fullRows }, () => cols);
  return [...rows, remainder];
}

export function chunkBalanced<T>(items: T[], cols: number): T[][] {
  const rows = balancedRows(items.length, cols);
  const chunks: T[][] = [];
  let index = 0;
  for (const rowSize of rows) {
    chunks.push(items.slice(index, index + rowSize));
    index += rowSize;
  }
  return chunks;
}

export type GridBreakpoint = 'md' | 'lg';

/** Tailwind gap-* → rem (spacing scale: n × 0.25rem). */
export function gapRemFromClass(gapClass: string): string {
  const match = gapClass.match(/gap-(\d+)/);
  if (!match) return '1rem';
  return `${Number(match[1]) * 0.25}rem`;
}

/** CSS variables for uniform tile sizing (see global.css .uniform-grid-*). */
export function uniformGridStyle(cols: number, gapClass: string): string {
  return `--uniform-cols: ${cols}; --uniform-gap: ${gapRemFromClass(gapClass)};`;
}

/**
 * Tile classes — width from CSS vars on container; same size on every row.
 */
export function uniformTileClass(breakpoint: GridBreakpoint = 'md'): string {
  return `uniform-grid-tile uniform-grid-tile--${breakpoint}`;
}

/** Flex row that centers short rows without stretching tiles. */
export function uniformRowClass(gapClass: string): string {
  return `uniform-grid-row ${gapClass}`;
}

/** Shared outer wrapper for uniform grids. */
export function uniformGridContainerClass(): string {
  return 'uniform-grid-container';
}

/** @deprecated Use uniformGridContainerClass */
export function balancedGridContainerClass(): string {
  return uniformGridContainerClass();
}

/** Breakpoint for multi-column layout — wider grids activate at lg. */
export function gridBreakpointForCols(cols: number): GridBreakpoint {
  return cols >= 4 ? 'lg' : 'md';
}
