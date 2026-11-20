// The smallest editor window where every control fits. Measured in the packaged app: below
// 710px the Adjustments row (In, Out, Speed, Brightness, Contrast, Saturation) wraps, and at
// 392px high the video is still 212px tall. The export view shrinks the window below this, so
// it lowers the minimum while it shows (kap:window:set-editor-conversion-mode).
export const EDITOR_MIN_WIDTH = 720;
export const EDITOR_MIN_HEIGHT = 392;
