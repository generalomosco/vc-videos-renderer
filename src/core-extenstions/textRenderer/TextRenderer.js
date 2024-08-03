import Extension from '../../extension';
import Text from './Text';
class TextRenderer extends Extension {
  constructor(
    app,
  ) {
    super(app);
  }
  NewText(text, textStyle, willUpdateStyleAfterGettingSizeCb){
    return new Text(this, text, textStyle, willUpdateStyleAfterGettingSizeCb);
  }
}
export default TextRenderer;