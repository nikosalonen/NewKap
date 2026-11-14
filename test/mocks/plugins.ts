import sinon from 'sinon';
import type {PartialDeep, Writable} from 'type-fest';
import type {Plugins} from '../../main/plugins';

export const plugins: PartialDeep<Writable<Plugins>, {recurseIntoArrays: true}> = {
  recordingPlugins: [],
  sharePlugins: [],
  editPlugins: [],
};
