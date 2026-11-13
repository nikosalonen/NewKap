import useWindowState from 'hooks/window-state';
import type {EditorWindowState} from 'common/types';

const useEditorWindowState = () => useWindowState<EditorWindowState>();
export default useEditorWindowState;
