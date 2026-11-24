import { expect, test } from 'vitest';
import { josa } from '../../src/frontend/korean';

test('a particle follows the final sound of the word before it, digits read aloud', () => {
  expect(josa('계획', '으로')).toBe('계획으로');
  expect(josa('개발', '으로')).toBe('개발로');
  expect(josa('시험', '으로')).toBe('시험으로');
  expect(josa('비서', '은')).toBe('비서는');
  expect(josa('개발', '은')).toBe('개발은');
  expect(josa('코드 리뷰', '이')).toBe('코드 리뷰가');
  expect(josa('#1', '이')).toBe('#1이');
  expect(josa('#2', '이')).toBe('#2가');
  expect(josa('#10', '을')).toBe('#10을');
  expect(josa('WebFetch', '을')).toBe('WebFetch를');
  // A closing quote or the ellipsis of a cut title is not read aloud
  expect(josa('"검색 고치기"', '을')).toBe('"검색 고치기"를');
  expect(josa('로그인 화면 만들…', '을')).toBe('로그인 화면 만들…을');
});
