import test from 'ava';
import tildify from '../renderer/utils/tildify';

const home = '/Users/kap';

test('paths inside the home folder start with ~', t => {
  t.is(tildify('/Users/kap/Movies/Kaptures', home), '~/Movies/Kaptures');
  t.is(tildify('/Users/kap', home), '~');
  t.is(tildify('/Users/kap/Movies/Kaptures', `${home}/`), '~/Movies/Kaptures');
});

test('other paths stay as they are', t => {
  t.is(tildify('/Volumes/Media/Kaptures', home), '/Volumes/Media/Kaptures');
  t.is(tildify('/Users/kapture/Movies', home), '/Users/kapture/Movies');
  t.is(tildify('/Users', home), '/Users');
});

test('an unknown or root home folder changes nothing', t => {
  t.is(tildify('/Users/kap/Movies', ''), '/Users/kap/Movies');
  t.is(tildify('/Users/kap/Movies', '/'), '/Users/kap/Movies');
});
