import test from 'ava';
import {isSafeExternalUrl} from '../main/common/external-url';

test('web and email links may open', t => {
  t.true(isSafeExternalUrl('https://github.com/wulkano/kap'));
  t.true(isSafeExternalUrl('http://example.org'));
  t.true(isSafeExternalUrl('mailto:someone@example.org'));
});

test('links that open files or other apps are refused', t => {
  t.false(isSafeExternalUrl('file:///Applications/Calculator.app'));
  t.false(isSafeExternalUrl('x-apple.systempreferences:com.apple.preference.security'));
  t.false(isSafeExternalUrl('smb://server/share'));
  // eslint-disable-next-line no-script-url -- the test checks that script URLs are refused
  t.false(isSafeExternalUrl('javascript:alert(1)'));
});

test('text that is not a URL is refused', t => {
  t.false(isSafeExternalUrl('not a url'));
  t.false(isSafeExternalUrl(''));
});
