import {useEffect, useRef} from 'react';
import kap from '../../utils/kap';

const DEFAULT_EDITOR_WIDTH = 768;
const DEFAULT_EDITOR_HEIGHT = 480;

export const useEditorWindowSizeEffect = (isConversionWindowState: boolean) => {
  const previousWindowSizeRef = useRef<{width: number; height: number}>(undefined);

  useEffect(() => {
    if (!previousWindowSizeRef.current) {
      previousWindowSizeRef.current = {
        width: DEFAULT_EDITOR_WIDTH,
        height: DEFAULT_EDITOR_HEIGHT,
      };
      return;
    }

    const updateWindowSize = async () => {
      if (isConversionWindowState) {
        const bounds = await kap.window.getEditorBounds();
        previousWindowSizeRef.current = {
          width: bounds.width,
          height: bounds.height,
        };
        await kap.window.setEditorConversionMode(true);
      } else {
        await kap.window.setEditorConversionMode(false);
      }
    };

    updateWindowSize();
  }, [isConversionWindowState]);
};
