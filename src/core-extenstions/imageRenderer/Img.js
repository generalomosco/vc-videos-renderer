import {
    createBuffer,
    setBufferData,
    calculateVerticesPosition,
} from '../../utils/GLHelpers';
const defaultStyle = {
    //width: 500,
    //height: 300,
    x: 0,
    y: 0,
    objectFit: "contain",
    borderRadius: 0,
    backgroundColor: [0, 0, 0, 0],
    borderColor: [0, 0, 0, 0],
    borderWidth: 0,
    borderSoftness: 1,
    innerBorder: {
        borderColor: [0, 0, 0, 0],
        borderWidth: 0,
    },
    gif: {
        isGif: false,
        frameRate: 30,
    }
};

export default class Img {
    constructor(
        imageRenderer,
        sourceType, sources,
        style,
        onReadyCb
    ) {
        this.imageRenderer = imageRenderer;
        this.sourceType = sourceType;
        this.sources = sources;
        this.style = Object.assign({}, defaultStyle, style);
        this.style.innerBorder = Object.assign({}, defaultStyle.innerBorder, style.innerBorder ?? {});
        this.style.gif = Object.assign({}, defaultStyle.gif, style.gif ?? {});

        this.gifState = {
            groups: {}
        }

        this.texturesObj = {
            toRenderID: null,
            textures: []
        };
        this._isReady = false;
        this._onReadyCb = onReadyCb;
        this._setupTexture();
    }
    _setupTexture() {
        if (this.sourceType === "texture") {
            this._setupRendering(this.sources);
        } else if (this.sourceType === "url") {
            this._loadTexturesFromURLs(this.sources)
                .then(textures => {
                    this._setupRendering(textures);
                })
                .catch(err => {
                    if (err.source && err.source.URL) {
                        this.imageRenderer.app.console.error(`Error loading image from URL "${err.source.URL}"`, err.error);
                    } else {
                        this.imageRenderer.app.console.error(err);
                    }
                });
        } else {
            this.imageRenderer.app.console.error(`Invalid image source type "${this.sourceType}"!`);
        }
    }
    _loadTexturesFromURLs(urls_sources) {
        return new Promise((resolve, reject) => {
            const promises = [];
            for (const i in urls_sources) {
                const source = urls_sources[i];
                if (this.style.gif.isGif) {
                    source.gifIndex = Number(i);
                }
                promises.push(new Promise((resolveEach, rejectEach) => {

                    this.imageRenderer.app.loadTextureAsset({
                        URL: source.URL,
                        cacheID: source.cacheID
                    },
                        (texture, err) => {
                            if (err) {
                                return rejectEach({
                                    source,
                                    error: err
                                });
                            }
                            resolveEach({ source, texture });
                        });

                }));
            }
            if (!promises.length) {
                return reject("Empty image source!")
            }
            Promise.all(promises).then(resolves => {
                const textures = [];
                for (const r of resolves) {
                    const rItem = { id: r.source.id, texture: r.texture };
                    if (r.source.hasOwnProperty("gifIndex")) {
                        rItem.gifIndex = r.source.gifIndex;
                    }
                    textures.push(rItem)
                }
                resolve(textures);
            }).catch(er => {
                reject(er);
            });
        });
    }
    _setupRendering(textures) {
        const finalTextures = [];
        for (const i in textures) {
            const texItem = textures[i];
            if (!texItem.texture || !["image"].includes(texItem.texture.type) || !texItem.texture.image) {
                this.imageRenderer.app.console.error("Invalid texture!");
                return;
            }
            if (!texItem.id && texItem.id !== 0) {
                texItem.id = "-auto-gen-texture-id--" + this.imageRenderer.app.generateIncreamentID();
            }
            if (this.style.gif.isGif) {
                if (!texItem.gifIndex && texItem.gifIndex !== 0) {
                    texItem.gifIndex = Number(i);
                }
            }
            finalTextures.push(texItem);
        }
        if (this.style.gif.isGif) {
            finalTextures.sort(function (a, b) {
                return a.gifIndex - b.gifIndex;
            });
        }
        let toRenderID = null;
        if (finalTextures.length === 1) {
            toRenderID = finalTextures[0].id;
        }
        this.texturesObj = {
            toRenderID: toRenderID,
            textures: finalTextures
        };
        this._isReady = true;
        if(this._onReadyCb){
            this._onReadyCb();
            this._onReadyCb = null;
        }
    }
    isItReady(){
        return this._isReady;
    }
    update({ width, height, x, y, borderWidth, borderRadius, borderSoftness, toRenderID } = {}) {
        if (width !== undefined) {
            this.style.width = width;
        }
        if (height !== undefined) {
            this.style.height = height;
        }
        if (x !== undefined) {
            this.style.x = x;
        }
        if (y !== undefined) {
            this.style.y = y;
        }
        if (borderWidth !== undefined) {
            this.style.borderWidth = borderWidth;
        }
        if (borderRadius !== undefined) {
            this.style.borderRadius = borderRadius;
        }
        if (borderSoftness !== undefined) {
            this.style.borderSoftness = borderSoftness;
        }
        if (toRenderID !== undefined) {
            this.texturesObj.toRenderID = toRenderID;
        }
    }
    render({ gifGroupName, gifSessionKey, gifRandomizeInitialization = false } = {}) {
        const texturesLength = this.texturesObj.textures.length;
        if (!texturesLength) return;

        if (this.style.gif.isGif) {
            if (!gifGroupName && gifGroupName !== 0) {
                gifGroupName = "default";
            }
            let groupState = this.gifState.groups[gifGroupName];
            if (!groupState) {
                groupState = {
                    startTime: window.performance.now(),
                    nextRenderIndex: 0,
                    gifSessionKey: null,
                }
                this.gifState.groups[gifGroupName] = groupState;
            }
            if (groupState.gifSessionKey !== gifSessionKey) {
                groupState.gifSessionKey = gifSessionKey;
                if (gifRandomizeInitialization) {
                    groupState.nextRenderIndex = Img.generateRandomInt(0, texturesLength - 1);
                }else{
                    groupState.nextRenderIndex = 0;
                }
            }
            const now = window.performance.now();
            const elapsedTime = now - groupState.startTime;
            const timePerFrame = 1000 / this.style.gif.frameRate;
            const framesToAdvance = Math.floor(elapsedTime / timePerFrame);
            groupState.nextRenderIndex = (groupState.nextRenderIndex + framesToAdvance) % texturesLength;
            this._render(groupState.nextRenderIndex);
            groupState.startTime += framesToAdvance * timePerFrame;
        } else {
            for (const i in this.texturesObj.textures) {
                const textureItem = this.texturesObj.textures[i]
                if (textureItem.id !== this.texturesObj.toRenderID) continue;
                this._render(i);
                break;
            }
        }
    }
    _render(textureIndex) {
        const textureItem = this.texturesObj.textures[textureIndex];
        if (!textureItem) {
            return;
        }
        const app = this.imageRenderer.app;
        if (this.style.borderWidth || this.style.backgroundColor[3] !== 0) {
            app.drawRectBackgroundsAndBorders({
                width: this.style.width, height: this.style.height, x: this.style.x, y: this.style.y,
                borderWidth: this.style.borderWidth,
                borderColor: this.style.borderColor,
                backgroundColor: this.style.backgroundColor,
                borderRadius: this.style.borderRadius,
                borderSoftness: this.style.borderSoftness
            }, false);
        }

        const image = textureItem.texture.image;
        const imageTexture = textureItem.texture.texture;
        app.gl.useProgram(app.shaders.kinds.image.program);

        app.gl.bindTexture(app.gl.TEXTURE_2D, imageTexture);
        app.gl.pixelStorei(app.gl.UNPACK_FLIP_Y_WEBGL, 1);
        app.gl.texImage2D(app.gl.TEXTURE_2D, 0, app.gl.RGBA, app.gl.RGBA, app.gl.UNSIGNED_BYTE, image);

        const positionBuffer = createBuffer(
            app.gl,
            calculateVerticesPosition(app.canvas, {
                x: this.style.x,
                y: this.style.y,
                objectFit: this.style.objectFit,
                width: this.style.width,
                height: this.style.height,
                borderWidth: this.style.borderWidth,
                imageWidth: image.width,
                imageHeight: image.height
            }),
            app.gl.ARRAY_BUFFER);

        setBufferData(app.gl, app.shaders.kinds.image.attributes.rectVertexPosition, positionBuffer);

        app.gl.uniform2fv(app.shaders.kinds.image.uniforms.u_resolution, [app.canvas.width, app.canvas.height]);

        if (this.style.borderWidth || this.style.innerBorder.borderWidth) {
            let newLeft = this.style.x;
            let newTop = this.style.y;
            let newWidth = this.style.width;
            let newHeight = this.style.height;
            let newBorderRadius = this.style.borderRadius;
            let borderSoftnessBoundary = 0;
            if (newBorderRadius) {
                newBorderRadius += 2;//u_edgeSoftness
            }
            if (newBorderRadius && !this.style.borderWidth && this.style.innerBorder.borderWidth) {
                const uEdgeSoftnessNoise = 2;
                newWidth -= uEdgeSoftnessNoise;
                newHeight -= uEdgeSoftnessNoise;
                newLeft += uEdgeSoftnessNoise / 2;
                newTop += uEdgeSoftnessNoise / 2;
                newBorderRadius -= uEdgeSoftnessNoise;
            }
            if (this.style.borderWidth) {
                if (this.style.borderSoftness) {
                    borderSoftnessBoundary = (this.style.borderSoftness / 2);
                    newWidth -= borderSoftnessBoundary;
                    newHeight -= borderSoftnessBoundary;
                    newLeft += borderSoftnessBoundary / 2;
                    newTop += borderSoftnessBoundary / 2;
                }
                newLeft += this.style.borderWidth;
                newTop += this.style.borderWidth;
                newWidth -= this.style.borderWidth * 2;
                newHeight -= this.style.borderWidth * 2;
                if (newBorderRadius) {
                    newBorderRadius -= this.style.borderWidth;
                }
            }
            app.gl.uniform2fv(app.shaders.kinds.image.uniforms.rect_u_size, [newWidth, newHeight]);
            app.gl.uniform2fv(app.shaders.kinds.image.uniforms.rect_u_location, [newLeft, newTop]);
            app.gl.uniform1f(app.shaders.kinds.image.uniforms.rect_u_borderWidth, 0);
            app.gl.uniform1f(app.shaders.kinds.image.uniforms.rect_u_borderSoftness, 0);
            app.gl.uniform4fv(app.shaders.kinds.image.uniforms.rect_u_borderColor, [0.0, 0.0, 0.0, 0.0]);
            app.gl.uniform4fv(app.shaders.kinds.image.uniforms.rect_u_borderRadius, [newBorderRadius, newBorderRadius, newBorderRadius, newBorderRadius]);
        } else {
            app.gl.uniform2fv(app.shaders.kinds.image.uniforms.rect_u_size, [this.style.width, this.style.height]);
            app.gl.uniform2fv(app.shaders.kinds.image.uniforms.rect_u_location, [this.style.x, this.style.y]);
            app.gl.uniform1f(app.shaders.kinds.image.uniforms.rect_u_borderWidth, 0);
            app.gl.uniform1f(app.shaders.kinds.image.uniforms.rect_u_borderSoftness, this.style.borderSoftness);
            app.gl.uniform4fv(app.shaders.kinds.image.uniforms.rect_u_borderColor, [0.0, 0.0, 0.0, 0.0]);
            app.gl.uniform4fv(app.shaders.kinds.image.uniforms.rect_u_borderRadius, [this.style.borderRadius, this.style.borderRadius, this.style.borderRadius, this.style.borderRadius]);
        }
        app.gl.drawArrays(app.gl.TRIANGLE_STRIP, 0, 4);

        if (this.style.innerBorder.borderWidth && this.style.innerBorder.borderColor) {
            app.drawRectBackgroundsAndBorders({
                width: this.style.width, height: this.style.height, x: this.style.x, y: this.style.y,
                parentBorderWidth: this.style.borderWidth,
                borderWidth: this.style.innerBorder.borderWidth,
                borderColor: this.style.innerBorder.borderColor,
                backgroundColor: [0.0, 0.0, 0.0, 0.0],
                borderRadius: this.style.borderRadius,
                borderSoftness: this.style.borderSoftness
            }, true);
        }
    }
    destroy(unlinkCache = false) {
        if(unlinkCache){
            for(const textureObj of this.texturesObj.textures){
                this.imageRenderer.app.unlinkTextureCache(textureObj.texture);
            }
        }
    }
    static generateRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

}