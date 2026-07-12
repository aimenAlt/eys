import assert from 'node:assert/strict';
import {
  balancedRows,
  chunkBalanced,
  gapRemFromClass,
  gridBreakpointForCols,
  uniformGridStyle,
  uniformRowClass,
  uniformTileClass,
} from './balancedGrid.ts';

const cases3: Array<[number, number[]]> = [
  [1, [1]],
  [2, [2]],
  [3, [3]],
  [4, [3, 1]],
  [5, [3, 2]],
  [6, [3, 3]],
  [7, [3, 3, 1]],
  [8, [3, 3, 2]],
  [9, [3, 3, 3]],
  [10, [3, 3, 3, 1]],
  [11, [3, 3, 3, 2]],
  [12, [3, 3, 3, 3]],
  [13, [3, 3, 3, 3, 1]],
];

for (const [count, expected] of cases3) {
  assert.deepEqual(balancedRows(count, 3), expected, `balancedRows(${count}, 3)`);
}

const cases4: Array<[number, number[]]> = [
  [5, [4, 1]],
  [6, [4, 2]],
  [7, [4, 3]],
  [9, [4, 4, 1]],
  [10, [4, 4, 2]],
  [13, [4, 4, 4, 1]],
];

for (const [count, expected] of cases4) {
  assert.deepEqual(balancedRows(count, 4), expected, `balancedRows(${count}, 4)`);
}

const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
assert.deepEqual(
  chunkBalanced(items, 3).map((row) => row.length),
  [3, 3, 1],
);

assert.equal(gapRemFromClass('gap-6'), '1.5rem');
assert.equal(gapRemFromClass('gap-4'), '1rem');
assert.equal(gapRemFromClass('gap-3'), '0.75rem');

assert.equal(uniformGridStyle(3, 'gap-6'), '--uniform-cols: 3; --uniform-gap: 1.5rem;');
assert.equal(uniformTileClass('md'), 'uniform-grid-tile uniform-grid-tile--md');
assert.equal(uniformTileClass('lg'), 'uniform-grid-tile uniform-grid-tile--lg');

const rowClass = uniformRowClass('gap-6');
assert.ok(rowClass.includes('uniform-grid-row'), 'rows use uniform-grid-row');
assert.ok(rowClass.includes('gap-6'), 'row must include gap class');

assert.equal(gridBreakpointForCols(3), 'md');
assert.equal(gridBreakpointForCols(4), 'lg');

console.log('balancedGrid tests passed');
