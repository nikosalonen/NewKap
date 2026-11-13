import Ajv from 'ajv';
import type {Options} from 'ajv';
import type {Schema as JSONSchema} from 'electron-store';
import type {Except} from 'type-fest';

export type Schema<T extends {required: boolean} = any> = Except<JSONSchema<T>, 'required'> & {
  required?: boolean;
  customType?: string;
};

const hexColorValidator = () => ({
  type: 'string',
  pattern: /^((0x)|#)([\dA-Fa-f]{8}|[\dA-Fa-f]{6})$/.source,
});

const keyboardShortcutValidator = () => ({
  type: 'string',
});

// eslint-disable-next-line @typescript-eslint/no-restricted-types -- matches the type of ajv's macro keyword
const validators = new Map<string, (parentSchema: object) => object>([
  ['hexColor', hexColorValidator],
  ['keyboardShortcut', keyboardShortcutValidator],
]);

export default class CustomAjv extends Ajv {
  constructor(options: Options) {
    super(options);

    this.addKeyword('customType', {
      // eslint-disable-next-line @typescript-eslint/no-restricted-types -- matches the type of ajv's macro keyword
      macro(schema: string, parentSchema: object) {
        const validator = validators.get(schema);

        if (!validator) {
          throw new Error(`No custom type found for ${schema}`);
        }

        return validator(parentSchema);
      },
      metaSchema: {
        type: 'string',
        enum: validators.keys().toArray(),
      },
    });
  }
}
