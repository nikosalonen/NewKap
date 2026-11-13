import kap from '../utils/kap';
import {Container} from './container';

const barWidth = 496;
const barHeight = 64;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default class ActionBarContainer extends Container {
  constructor() {
    super();

    this.settings = kap.settings;
    this.state = {
      cropperWidth: '',
      cropperHeight: '',
    };
  }

  setInputValues = ({width, height}) => {
    this.setState({
      cropperWidth: width ? width.toString() : '',
      cropperHeight: height ? height.toString() : '',
    });
  };
  setWidth = cropperWidth => {
    this.setState({cropperWidth});
  };
  setHeight = cropperHeight => {
    this.setState({cropperHeight});
  };
  setDisplay = display => {
    const {width, height, cropper} = display;
    const {x, y, ratioLocked} = cropper ? this.settings.get('actionBar') : {};
    const fallbackX = (width - barWidth) / 2;
    const fallbackY = Math.ceil(height * 0.8);
    const parsedX = Number.isFinite(x) ? x : fallbackX;
    const parsedY = Number.isFinite(y) ? y : fallbackY;

    this.setState({
      screenWidth: width,
      screenHeight: height,
      x: clamp(parsedX, 0, Math.max(0, width - barWidth)),
      y: clamp(parsedY, 0, Math.max(0, height - barHeight)),
      width: barWidth,
      height: barHeight,
      ratioLocked,
    });
  };
  resetPosition = () => {
    const {screenWidth, screenHeight} = this.state;

    this.setState({
      x: (screenWidth - barWidth) / 2,
      y: Math.ceil(screenHeight * 0.8),
      width: barWidth,
      height: barHeight,
    });
  };
  bindCursor = cursorContainer => {
    this.cursorContainer = cursorContainer;
  };
  bindCropper = cropperContainer => {
    this.cropperContainer = cropperContainer;
  };
  updateSettings = updates => {
    const {x, y, ratioLocked} = this.state;

    this.settings.set('actionBar', {
      x,
      y,
      ratioLocked,
      ...updates,
    });
    this.setState(updates);
  };
  toggleRatioLock = ratioLocked => {
    const {ratioLocked: isLocked} = this.state;
    if (ratioLocked) {
      this.updateSettings({ratioLocked});
    } else {
      this.updateSettings({ratioLocked: !isLocked});
    }

    this.cropperContainer.setOriginal();
  };
  toggleAdvanced = () => {
    if (this.cropperContainer.state.isFullscreen) {
      return;
    }

    const {advanced, screenWidth} = this.state;
    this.updateSettings({advanced: !advanced});

    if (advanced) {
      return;
    }

    const width = screenWidth * 0.2;
    const height = width * 0.75; // 4:3
    this.cropperContainer.setSize({
      width,
      height,
    });
  };
  startMoving = ({pageX, pageY}) => {
    this.setState({isMoving: true, offsetX: pageX, offsetY: pageY});
    this.cursorContainer.addCursorObserver(this.move);
    addEventListener('mouseup', this.stopMoving, {once: true});
  };
  stopMoving = () => {
    if (!this.state.isMoving) {
      return;
    }

    const {x, y} = this.state;
    this.updateSettings({x, y});
    this.setState({isMoving: false});
    this.cursorContainer.removeCursorObserver(this.move);
    removeEventListener('mouseup', this.stopMoving);
  };
  move = ({pageX, pageY}) => {
    const {x, y, offsetX, offsetY, height, width, screenWidth, screenHeight} = this.state;

    const newX = x + pageX - offsetX;
    const newY = y + pageY - offsetY;
    const updates = {
      offsetX: pageX,
      offsetY: pageY,
      ...((newY + height <= screenHeight && newY >= 0) && {y: newY}),
      ...((newX + width <= screenWidth && newX >= 0) && {x: newX}),
    };

    this.setState(updates);
  };
}
