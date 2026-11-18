import test from 'node:test';
import assert from 'node:assert/strict';
import { privacySafeBlocks } from '../lib/template-privacy.mjs';

test('published template blocks omit names, phones, dates, and exact costs', () => {
  const [block] = privacySafeBlocks([{
    type: 'food', title: 'Dinner with Jay Sikka on Dec 23, 2026',
    note: 'Text Jay at (202) 999-8318. Reservation was $45 on 2026-12-23.',
    place: 'New York', url: 'https://example.com/reserve?phone=2029998318', day_index: 2,
  }], ['Jay Sikka', 'Jay']);
  const publicText = JSON.stringify(block);
  assert.doesNotMatch(publicText, /Jay|2029998318|2026-12-23|Dec 23|\$45|phone=/i);
  assert.equal(block.day_index, 2);
  assert.equal(block.url, 'https://example.com/reserve');
});
