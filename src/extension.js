import VcVideosRenderer from './VcVideosRenderer';

const extensionsBased = {};


const mergeExtension = (name, extension) => {
  extension.prototype.name = name;
  return function(...args) {
    const instance = new extension(...[this, ...args]);
    return instance;
  };
};
class Extension {
  constructor(app) {
    if (this.constructor === Extension) {
      throw new Error('Invalid Extension!');
    }
    this.app = app;
  }
  
  static addExtension(extension, name) {
    if (typeof name !== 'string') {
      throw new Error(`Extension name must be a type string "${name}"!`);
    }

    if(!name){
      throw new Error(`Extension must have a name!`);
    }

    if (extensionsBased[name] || VcVideosRenderer.prototype.hasOwnProperty(name)) {
      throw new Error(`Found existing extension same name with "${name}"!`);
    }

    if (typeof extension !== 'function') {
      throw new Error(`"${name}" must be a type function!`);
    }
    extensionsBased[name] = extension;
    VcVideosRenderer.prototype._extensions[name] = mergeExtension(name, extension);

    return extension;
  }

}

Extension.addExtension(Extension, 'extension');

export default Extension;