
import type PCancelable from 'p-cancelable';
import type {Format} from '../common/types';
import type {Schema} from '../utils/ajv';
import type {EditServiceContext, RecordServiceContext, ShareServiceContext} from './service-context';

export type Service<Config = any> = {
  title: string;
  configDescription?: string;
  config?: {[P in keyof Config]: Schema};
};

export type ShareService<Config = any> = {
  formats: Format[];
  action: (context: ShareServiceContext) => PromiseLike<void> | PCancelable<void>;
} & Service<Config>;

export type EditService<Config = any> = {
  action: (context: EditServiceContext) => PromiseLike<void> | PCancelable<void>;
} & Service<Config>;

export type RecordServiceHook = 'willStartRecording' | 'didStartRecording' | 'didStopRecording';

export type RecordService<Config = any> = Service<Config> & Record<RecordServiceHook, ((context: RecordServiceContext<any>) => PromiseLike<void>) | undefined> & {
  willEnable?: () => PromiseLike<boolean>;
  cleanUp?: (persistedState: Record<string, unknown>) => void;
};
