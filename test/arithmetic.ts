import test from 'ava';
import {evaluateArithmetic} from '../renderer/utils/arithmetic';

test('plain numbers', t => {
  t.is(evaluateArithmetic('640'), 640);
  t.is(evaluateArithmetic(' 640 '), 640);
  t.is(evaluateArithmetic('12.5'), 12.5);
  t.is(evaluateArithmetic('.5'), 0.5);
  t.is(evaluateArithmetic('1.5e2'), 150);
  t.is(evaluateArithmetic('0'), 0);
});

test('operators follow the usual precedence', t => {
  t.is(evaluateArithmetic('1280 / 2'), 640);
  t.is(evaluateArithmetic('2 + 3 * 4'), 14);
  t.is(evaluateArithmetic('100*2+3'), 203);
  t.is(evaluateArithmetic('10 - 4 - 3'), 3);
  t.is(evaluateArithmetic('64 / 4 / 2'), 8);
});

test('parentheses and signs', t => {
  t.is(evaluateArithmetic('(2 + 3) * 4'), 20);
  t.is(evaluateArithmetic('((1 + 1) * (2 + 2))'), 8);
  t.is(evaluateArithmetic('-5 + 10'), 5);
  t.is(evaluateArithmetic('--5'), 5);
  t.is(evaluateArithmetic('10 * -2'), -20);
});

test('a number or group right before a parenthesis multiplies', t => {
  t.is(evaluateArithmetic('2(3 + 1)'), 8);
  t.is(evaluateArithmetic('(2)(3)'), 6);
});

test('invalid input gives undefined', t => {
  for (const input of ['', ' ', 'abc', '2 +', '* 2', '(2', '2)', '()', '1e', '2 ^ 3', '1,5', '1/0', '0/0']) {
    t.is(evaluateArithmetic(input), undefined, `input: "${input}"`);
  }
});

test('long input gives undefined without deep recursion', t => {
  t.is(evaluateArithmetic('('.repeat(100_000)), undefined);
  t.is(evaluateArithmetic(`${'1+'.repeat(100_000)}1`), undefined);
});
