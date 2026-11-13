import sinon from 'sinon';
import type {Mutable, PartialDeep} from 'type-fest';
import type {Plugins} from '../../main/plugins';

export const plugins: PartialDeep<Mutable<Plugins>> = {
  recordingPlugins: [],
  sharePlugins: [],
  editPlugins: [],
};
