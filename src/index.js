import VcVideosRenderer from './VcVideosRenderer';
import Extension from './extension';
import ImageRenderer from './core-extenstions/imageRenderer/ImageRenderer';
import TextRenderer from './core-extenstions/textRenderer/TextRenderer';
VcVideosRenderer.Extension = Extension;
Extension.addExtension(ImageRenderer, 'ImageRenderer');
Extension.addExtension(TextRenderer, 'TextRenderer');
window.VcVideosRenderer = VcVideosRenderer;
export default VcVideosRenderer;