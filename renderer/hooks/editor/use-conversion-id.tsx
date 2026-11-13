import type {CreateExportOptions} from 'common/types';
import {
  createContext,
  use,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {ipcRenderer} from '../../utils/ipc';
import {requireConversionId} from '../../../main/common/export-start';

const ConversionIdContext = createContext<{
  conversionId: string;
  setConversionId: (id: string) => void;
  startConversion: (options: CreateExportOptions) => Promise<void>;
}>(undefined);

let savedConversionId: string;

export const ConversionIdContextProvider = (props: PropsWithChildren<Record<string, unknown>>) => {
  const [conversionId, setConversionId] = useState<string>();

  const startConversion = async (options: CreateExportOptions) => {
    const id = await ipcRenderer.callMain<CreateExportOptions, string>('create-export', options);
    setConversionId(requireConversionId(id));
  };

  const updateConversionId = (id: string) => {
    savedConversionId ||= id;
    setConversionId(id || savedConversionId);
  };

  const value = useMemo(() => ({
    conversionId,
    setConversionId: updateConversionId,
    startConversion,
  }), [conversionId, setConversionId]);

  return (
    <ConversionIdContext value={value}>
      {props.children}
    </ConversionIdContext>
  );
};

const useConversionIdContext = () => use(ConversionIdContext);

export default useConversionIdContext;
