import VcVideosRendererCore from './vcVideosRendererCore';
const defaultOptions = {
  debug: false,
  frameRate: 30
};
class VcVideosRenderer extends VcVideosRendererCore {
  constructor(
    canvas,
    options,
  ) {
    options = Object.assign({}, defaultOptions, options);
    super(canvas, options);
  }
  getMixedStream() {
    return this._getMixedStream();
  }
  stopDrawing() {
    return this._stopDrawing()
  }
  startDrawing() {
    return this._startDrawing()
  }
  resetFrame(frameItems) {
    return this._resetFrame(frameItems);
  }
  updateExistingItems(frameItems) {
    return this._updateExistingItems(frameItems);
  }
  softUpdateVideoFrameItem(itemID, { objectFit,
    renderVideo,
    renderAudio,
    cameraDisabled,
    audioDisabled,
    isWaiting,
    isReconnecting,
    backgroundColor,
    borderColor,
    innerBorderColor }) {
    return this._softUpdateVideoFrameItem(itemID, {
      objectFit,
      renderVideo,
      renderAudio,
      cameraDisabled,
      audioDisabled,
      isWaiting,
      isReconnecting,
      backgroundColor,
      borderColor,
      innerBorderColor
    });
  }
  destroy() {
    this._destroy();
  }
}
export default VcVideosRenderer;