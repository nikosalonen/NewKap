import type {ValidateFunction} from 'ajv';
import Store from 'electron-store';
import type {Except} from 'type-fest';
import Ajv, {type Schema} from '../utils/ajv';
import type {Service} from './service';

export default class PluginConfig extends Store {
  servicesWithNoConfig: Service[];
  validators: Array<{
    title: string;
    description?: string;
    config: Record<string, Schema>;
    validate: ValidateFunction;
  }>;

  constructor(name: string, services: Service[]) {
    const defaults = {};

    const validators = services
      .filter(({config}) => Boolean(config))
      .map(service => {
        const config = service.config as Record<string, Schema>;
        const schema: Record<string, Except<Schema, 'required'>> = {};
        const requiredKeys = [];

        for (const [key, item] of Object.entries(config)) {
          if (!item.title) {
            throw new Error('Config schema items should have a `title`');
          }

          const {required, ...rest} = item;

          if (required) {
            requiredKeys.push(key);
          }

          schema[key] = rest;
        }

        const ajv = new Ajv({
          format: 'full',
          useDefaults: true,
          errorDataPath: 'property',
          allErrors: true,
        });

        const validator = ajv.compile({
          type: 'object',
          properties: schema,
          required: requiredKeys,
        });

        validator(defaults);
        return {
          validate: validator,
          title: service.title,
          description: service.configDescription,
          config,
        };
      });

    super({
      name,
      cwd: 'plugins',
      defaults,
    });

    this.servicesWithNoConfig = services.filter(({config}) => !config);
    this.validators = validators;
  }

  get isValid() {
    // Plugin config schemas are synchronous, so validate() returns a boolean.
    return this.validators.every(validator => validator.validate(this.store) === true);
  }

  get validServices() {
    return [
      ...this.validators.filter(validator => validator.validate(this.store) === true),
      ...this.servicesWithNoConfig,
    ].map(service => service.title);
  }
}
