import Ajv, {type Options} from 'ajv';
import type {JSONSchema} from 'json-schema-typed/draft-07';
import type {Except} from 'type-fest';

// Plugin config schemas are JSON Schema draft-07, the draft Ajv 6 checks.
// `required` is a flag on each field here; PluginConfig turns it into the object's list.
export type Schema = Except<Exclude<JSONSchema, boolean>, 'required'> & {
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
