import test from 'ava';
import PluginConfig from '../main/plugins/config';
import type {Service} from '../main/plugins/service';

let storeCount = 0;

// Each test gets its own config file, so values set in one test don't leak into another.
const createConfig = (services: Service[]) => {
  storeCount++;
  return new PluginConfig(`kap-test-plugin-${storeCount}`, services);
};

const uploadService: Service = {
  title: 'Upload',
  config: {
    token: {
      title: 'Token',
      type: 'string',
      minLength: 4,
      required: true,
    },
    color: {
      title: 'Color',
      type: 'string',
      customType: 'hexColor',
      default: '#ffffff',
    },
    quality: {
      title: 'Quality',
      type: 'string',
      enum: ['low', 'high'],
      default: 'high',
    },
  },
};

const plainService: Service = {title: 'Plain'};

test('schema defaults are stored', t => {
  const config = createConfig([uploadService]);

  t.is(config.get('color'), '#ffffff');
  t.is(config.get('quality'), 'high');
});

test('a missing required value makes the service invalid', t => {
  const config = createConfig([uploadService, plainService]);

  t.false(config.isValid);
  t.deepEqual(config.validServices, ['Plain']);
});

test('valid values make the service valid', t => {
  const config = createConfig([uploadService, plainService]);
  config.set('token', 'abcd');

  t.true(config.isValid);
  t.deepEqual(config.validServices, ['Upload', 'Plain']);
});

test('schema keywords and custom types are checked', t => {
  const config = createConfig([uploadService]);
  config.set('token', 'abcd');

  config.set('color', 'red');
  t.false(config.isValid);

  config.set('color', '#ff000080');
  t.true(config.isValid);

  config.set('quality', 'medium');
  t.false(config.isValid);

  config.set('quality', 'low');
  config.set('token', 'abc');
  t.false(config.isValid);
});

test('the error for a missing value points at that field', t => {
  const config = createConfig([uploadService]);
  const [{validate}] = config.validators;

  validate(config.store);

  t.true(validate.errors?.some(error => error.dataPath.endsWith('token')));
});

test('schema items need a title', t => {
  t.throws(() => createConfig([{title: 'Broken', config: {token: {type: 'string'}}}]), {
    message: 'Config schema items should have a `title`',
  });
});
