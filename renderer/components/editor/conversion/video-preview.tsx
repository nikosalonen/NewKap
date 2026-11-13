import {CancelIcon, SpinnerIcon} from 'vectors';
import {UseConversion, type UseConversionState} from 'hooks/editor/use-conversion';
import {ExportStatus} from 'common/types';
import useEditorWindowState from 'hooks/editor/use-editor-window-state';
import useConversionIdContext from 'hooks/editor/use-conversion-id';
import {Tooltip} from 'react-tooltip';
import {useState} from 'react';
import kap from '../../../utils/kap';

const VideoPreview = ({conversion, cancel, showInFolder}: {conversion: UseConversionState; cancel: () => any; showInFolder: () => any}) => {
  const {conversionId} = useConversionIdContext();
  const {filePath} = useEditorWindowState();
  const [tooltipShowing, setTooltipShowing] = useState(!kap.flags.get('editorDragTooltip'));
  const src = `file://${filePath}`;

  const percentage = conversion?.progress ?? 0;
  const done = conversion && (conversion?.status !== ExportStatus.inProgress);

  const onDragStart = (event: any) => {
    event.preventDefault();
    kap.ipc.send('drag-export', conversionId);
  };

  const onTooltipClick = event => {
    event.stopPropagation();
    setTooltipShowing(false);
  };

  const onTooltipHide = () => {
    kap.flags.set('editorDragTooltip', true);
  };

  return (
    <div
      data-tooltip-id='drag-tooltip'
      draggable={done}
      className='video-preview'
      onDragStart={onDragStart}
      onClick={showInFolder}
    >
      {
        done && conversion?.canPreviewExport
          ? <img src={`file://${conversion?.filePath}`} alt='Exported file preview'/>
          : <video src={src}/>
      }
      <div className='overlay' style={{display: done ? 'none' : 'flex'}}>
        <div className='progress-indicator'>
          {
            percentage === 0
              ? <IndeterminateSpinner/>
              : <ProgressCircle percent={percentage}/>
          }
        </div>
        <div className='cancel' title='Cancel' onClick={cancel}>
          <CancelIcon fill='white' hoverFill='white' activeFill='white' size='100%'/>
        </div>
      </div>
      {/* A one-time hint. It shows once the export is done, until clicked.
          Fixed positioning keeps .video-preview's `overflow: hidden` from
          clipping it, and keeping it inside .video-preview keeps it out of the
          window's drag region, so it can be clicked. */}
      <Tooltip
        clickable
        isOpen={done && tooltipShowing}
        positionStrategy='fixed'
        place='bottom'
        className='tooltip'
        id='drag-tooltip'
        style={{backgroundColor: 'var(--background-color)'}}
        border='1px solid rgba(255, 255, 255, 0.4)'
        afterHide={onTooltipHide}
      >
        <div className='tooltip-content' onClick={onTooltipClick}>Drag and drop to copy the recording to your desktop or an application. Click to open its parent directory</div>
      </Tooltip>
      <style jsx>{`
        .video-preview {
          width: 100%;
          background: black;
          position: relative;
          flex: 1;
          height: 0;
          -webkit-app-region: no-drag;
          max-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        video, img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          display: block;
        }

        .overlay {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, .5);
        }

        .progress-indicator, .cancel {
          width: 48px;
          height: 48px;
          position: absolute;
          transition: opacity 0.35s ease-in-out;
        }

        .cancel {
          width: 24px;
          height: 24px;
          pointer-events: none;
          opacity: 0;
        }

        .overlay:hover .cancel {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
};

const IndeterminateSpinner = () => (
  <div className='container'>
    <SpinnerIcon stroke='#fff'/>
    <style jsx>{`
          .container {
            width: 100%;
            height: 100%;
            animation: spin 3s linear infinite;
          }

          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }

            50% {
              transform: rotate(720deg);
            }

            100% {
              transform: rotate(1080deg);
            }
          }
        `}</style>
  </div>
);

const ProgressCircle = ({percent}: {percent: number}) => {
  const circumference = 12 * 2 * Math.PI;
  const offset = circumference * (1 - percent);

  return (
    <svg viewBox='0 0 24 24'>
      <circle stroke='white' strokeWidth='2' fill='transparent' cx='12' cy='12' r='12'/>
      <style jsx>{`
          svg {
            width: 100%;
            height: 100%;
            overflow: visible;
            transform: rotate(-90deg);
          }

          circle {
            stroke-dasharray: ${circumference} ${circumference};
            stroke-dashoffset: ${offset};
            ${percent === 0 ? '' : 'transition: stroke-dashoffset 0.35s;'}
          }
        `}</style>
    </svg>
  );
};

export default VideoPreview;
