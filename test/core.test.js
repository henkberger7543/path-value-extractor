import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractValue, parsePath } from '../src/index.js';

test('extractValue returns the value at a simple dot path', () => {
  const root = { a: { b: { c: 42 } } };
  assert.deepEqual(extractValue('a.b.c', root), { value: 42, exists: true });
});

test('extractValue reports exists:false for a missing key', () => {
  const root = { a: { b: 1 } };
  assert.deepEqual(extractValue('a.c', root), { value: undefined, exists: false });
});

test('extractValue returns the root itself for an empty path', () => {
  const root = { a: 1 };
  assert.deepEqual(extractValue('', root), { value: root, exists: true });
});

test('extractValue supports bracket access for array indices', () => {
  const root = { list: ['x', 'y', 'z'] };
  assert.deepEqual(extractValue('list[1]', root), { value: 'y', exists: true });
});

test('extractValue supports quoted bracket keys', () => {
  const root = { 'weird.key': 'gotcha' };
  assert.deepEqual(extractValue("['weird.key']", root), { value: 'gotcha', exists: true });
});

test('extractValue reports exists:false when descending into a primitive', () => {
  const root = { a: 5 };
  assert.deepEqual(extractValue('a.b', root), { value: undefined, exists: false });
});

test('extractValue reports exists:false when descending into null', () => {
  const root = { a: null };
  assert.deepEqual(extractValue('a.b', root), { value: undefined, exists: false });
});

test('extractValue returns the explicit undefined stored at a path', () => {
  const root = { a: { b: undefined } };
  assert.deepEqual(extractValue('a.b', root), { value: undefined, exists: true });
});

test('parsePath throws on unterminated bracket', () => {
  assert.throws(() => parsePath('a['), SyntaxError);
});

test('extractValue returns exists:false for a syntactically invalid path', () => {
  const root = { a: 1 };
  assert.deepEqual(extractValue('a[', root), { value: undefined, exists: false });
});

test('extractValue reports exists:false for an out-of-range array index', () => {
  const root = { list: ['x'] };
  assert.deepEqual(extractValue('list[5]', root), { value: undefined, exists: false });
});

test('extractValue navigates a mixed dot-and-bracket path', () => {
  const root = { users: [{ name: 'ada' }, { name: 'grace' }] };
  assert.deepEqual(extractValue('users[1].name', root), { value: 'grace', exists: true });
});

test('extractValue treats a trailing empty bracket as a no-op selector', () => {
  const root = { list: [1, 2, 3] };
  assert.deepEqual(extractValue('list[]', root), { value: [1, 2, 3], exists: true });
});
