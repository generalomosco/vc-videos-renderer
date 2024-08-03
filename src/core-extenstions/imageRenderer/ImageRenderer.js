import Extension from '../../extension';
import Img from './Img';
class ImageRenderer extends Extension {
  constructor(
    app,
  ) {
    super(app);
  }
  NewImageFromTextures(textures, style, onReadyCb) {
    return new Img(this, "texture", textures, style, onReadyCb);
  }
  NewImageFromURLs(URLs, style, onReadyCb) {
    return new Img(this, "url", URLs, style, onReadyCb);
  }
}
export default ImageRenderer;