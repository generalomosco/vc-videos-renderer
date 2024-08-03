const defaultTextStyle = {
    //maxWidth: 200,
    //maxLine: 3,
    hyphenateWord: true,
    compactText: false,
    fontSize: 12,
    lineHeight: 4,
    fontWeight: "normal",
    textColor: [1, 0, 0, 1],
    backgroundColor: [0, 1, 0, 1],
    borderRadius: [0, 0, 0, 0],
    padding: [5, 5],
    xDirection: "left",
    yDirection: "top",
    x: 10,
    y: 10,
    icon: {
        iconURL: null,
        iconCacheID: null,
        width: 10,
        height: 10,
        placeIcon: "left",
        fromTextToIconPadding: 10,
    },
    floatingText: {
        float: false,
        speed: 20
    },
};

export default class Text {
    constructor(
        textRenderer,
        text,
        textStyle,
        willUpdateStyleAfterGettingSizeCb
    ) {
        this.textRenderer = textRenderer;
        this.text = text;
        this.textStyle = Object.assign({}, defaultTextStyle, textStyle);
        this.textStyle.icon = Object.assign({}, defaultTextStyle.icon, textStyle.icon ?? {});
        this.textStyle.floatingText = Object.assign({}, defaultTextStyle.floatingText, textStyle.floatingText ?? {});
        this.TheImageRenderer = null;
        this.iconTexture = null;
        this._isReady = false;
        this.floatableItems = null;
        this.nonFloatableTextProp = null;
        this._createTextTexture(willUpdateStyleAfterGettingSizeCb);
    }
    _createTextTexture(willUpdateStyleAfterGettingSizeCb) {
        if (this.textStyle.icon.iconURL) {
            this.textRenderer.app.loadTextureAsset({
                URL: this.textStyle.icon.iconURL,
                cacheID: this.textStyle.icon.iconCacheID
            },
                (texture, err) => {
                    if (err) {
                        this.textRenderer.app.console.error(`Error loading image from URL "${this.textStyle.icon.iconURL}"`, err);
                        this._createText(null, willUpdateStyleAfterGettingSizeCb);
                        return;
                    }
                    this._createText(texture.image, willUpdateStyleAfterGettingSizeCb);
                });
        } else {
            this._createText(null, willUpdateStyleAfterGettingSizeCb);
        }
    }
    _createText(iconImage, willUpdateStyleAfterGettingSizeCb) {
        const context = document.createElement("canvas").getContext("2d");
        context.canvas.width = 1;
        context.canvas.height = 1;

        if (this.textStyle.floatingText.float) {
            this.floatableItems = {
                frame: {
                    width: this.textRenderer.app.canvas.width,
                    height: this.textRenderer.app.canvas.height,
                },
                height: 0,
                items: []
            }
            this.textStyle.hyphenateWord = false;
            this.textStyle.compactText = true;
            this.textStyle.maxLine = null;
            this.textStyle.icon.iconURL = null;
        }

        const applyCanvasTextWriteAtrritubes = (ctx) => {
            ctx.fillStyle = Text.normalizeRGB_RGBA_Array_To_255_String(this.textStyle.textColor);
            ctx.font = `${this.textStyle.fontWeight} ${this.textStyle.fontSize}px Arial`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
        }

        applyCanvasTextWriteAtrritubes(context);


        let textMaxWidth = this.textStyle.maxWidth - (this.textStyle.padding[1] * 2);
        if (this.textStyle.icon.iconURL) {
            textMaxWidth -= this.textStyle.icon.width + this.textStyle.icon.fromTextToIconPadding;
        }

        const calculatedText = Text.calculateTextViewInCanvas(
            context,
            this.text,
            0,
            0,
            {
                maxWidth: textMaxWidth,
                maxLine: this.textStyle.maxLine,
                lineHeight: this.textStyle.lineHeight,
                compactText: this.textStyle.compactText,
                hyphenateWord: this.textStyle.hyphenateWord
            }
        );

        if (this.textStyle.floatingText.float) {
            calculatedText.width = calculatedText.highest_line_width;
            calculatedText.height = calculatedText.highest_line_height;
        }


        let textWriteStartX = this.textStyle.padding[1];
        let textWriteStartY = this.textStyle.padding[0];

        let placeIconX = this.textStyle.padding[1];
        let placeIconY = this.textStyle.padding[0];

        if (this.textStyle.icon.iconURL) {
            context.canvas.width = calculatedText.width + (this.textStyle.padding[1] * 2) + this.textStyle.icon.width + this.textStyle.icon.fromTextToIconPadding;

            let heightToUse = null;
            if (calculatedText.height > this.textStyle.icon.height) {
                heightToUse = calculatedText.height;
                placeIconY += (calculatedText.height - this.textStyle.icon.height) / 2;
            } else {
                heightToUse = this.textStyle.icon.height;
                textWriteStartY += (this.textStyle.icon.height - calculatedText.height) / 2;
            }

            context.canvas.height = heightToUse + (this.textStyle.padding[0] * 2);
            if (this.textStyle.icon.placeIcon === "right") {
                placeIconX += calculatedText.width + this.textStyle.icon.fromTextToIconPadding;
            } else {
                //place icon left
                textWriteStartX += this.textStyle.icon.width + this.textStyle.icon.fromTextToIconPadding;
            }
        } else {
            context.canvas.width = calculatedText.width + (this.textStyle.padding[1] * 2);
            context.canvas.height = calculatedText.height + (this.textStyle.padding[0] * 2);
        }

        if (willUpdateStyleAfterGettingSizeCb) {
            willUpdateStyleAfterGettingSizeCb({
                width: context.canvas.width,
                height: context.canvas.height,
                textStyle: this.textStyle,
            });
        }


        const applyCanvasBackgroundAtrritubes = (ctx) => {
            ctx.beginPath();
            ctx.roundRect(0, 0, ctx.canvas.width, ctx.canvas.height, this.textStyle.borderRadius);
            ctx.fillStyle = Text.normalizeRGB_RGBA_Array_To_255_String(this.textStyle.backgroundColor);
            ctx.fill();
        }
        applyCanvasBackgroundAtrritubes(context);

        if (iconImage) {
            context.drawImage(iconImage, placeIconX, placeIconY, this.textStyle.icon.width, this.textStyle.icon.height);
        }

        applyCanvasTextWriteAtrritubes(context);

        let lineItem = calculatedText.lines.shift();
        let itemID = -1;
        let floatableItems = {
            firstItem: null,
            items: []
        };

        if (this.textStyle.floatingText.float) {
            //Start float
            const subCtx = document.createElement("canvas").getContext("2d");
            subCtx.canvas.width = this.floatableItems.frame.width;
            subCtx.canvas.height = context.canvas.height;
            applyCanvasBackgroundAtrritubes(subCtx);
            floatableItems.items.push({
                id: itemID,
                canvas: subCtx.canvas,
            });
            this.floatableItems.items.push({
                id: itemID,
                width: subCtx.canvas.width,
                height: subCtx.canvas.height
            });
        }
        while (lineItem !== undefined) {
            itemID++;
            if (this.textStyle.floatingText.float) {
                if (itemID === 0) {
                    this.floatableItems.height = context.canvas.height;
                    floatableItems.firstItem = lineItem;
                    floatableItems.items.push({
                        id: itemID,
                        canvas: context.canvas,
                    });
                    this.floatableItems.items.push({
                        id: itemID,
                        width: context.canvas.width,
                        height: context.canvas.height
                    });
                    context.fillText(lineItem.line, lineItem.x + textWriteStartX, lineItem.y + textWriteStartY);
                } else {
                    const subCtx = document.createElement("canvas").getContext("2d");
                    subCtx.canvas.width = lineItem.width;
                    subCtx.canvas.height = context.canvas.height;
                    applyCanvasBackgroundAtrritubes(subCtx);
                    applyCanvasTextWriteAtrritubes(subCtx);
                    subCtx.fillText(lineItem.line, 0, floatableItems.firstItem.y + textWriteStartY);
                    floatableItems.items.push({
                        id: itemID,
                        canvas: subCtx.canvas,
                    });
                    this.floatableItems.items.push({
                        id: itemID,
                        width: subCtx.canvas.width,
                        height: subCtx.canvas.height
                    });
                }
            } else {
                context.fillText(lineItem.line, lineItem.x + textWriteStartX, lineItem.y + textWriteStartY);
            }
            lineItem = calculatedText.lines.shift();
        }
        if (floatableItems.items.length > 1) {
            //To end float.
            itemID++;
            const subCtx = document.createElement("canvas").getContext("2d");
            subCtx.canvas.width = this.floatableItems.frame.width;
            subCtx.canvas.height = context.canvas.height;
            applyCanvasBackgroundAtrritubes(subCtx);
            floatableItems.items.push({
                id: itemID,
                canvas: subCtx.canvas,
            });
            this.floatableItems.items.push({
                id: itemID,
                width: subCtx.canvas.width,
                height: subCtx.canvas.height
            });
        }
        if (this.textStyle.floatingText.float) {

            this._loadURLsFromCanvases(floatableItems.items)
                .then(url_sources => {

                    let newAxisX = this.textStyle.x;
                    if (this.textStyle.xDirection === "right") {
                        newAxisX -= context.canvas.width;
                    }
                    let newAxisY = this.textStyle.y;
                    if (this.textStyle.yDirection === "bottom") {
                        newAxisY -= context.canvas.height;
                    }
                    this.TheImageRenderer = this.textRenderer.app.ImageRenderer.NewImageFromURLs(url_sources, {
                        width: context.canvas.width,
                        height: context.canvas.height,
                        x: newAxisX,
                        y: newAxisY
                    }, () => {
                        this._isReady = true;
                    });
                })
                .catch(err => {
                    this.textRenderer.app.console.error(`Failed to create text `, err);
                });

        } else {
            this.nonFloatableTextProp = {
                width: context.canvas.width,
                height: context.canvas.height
            }
            //I think it is faster to render static Image than canvas directly into webgl. 
            Text.canvasToStringUrl(context.canvas).then(imgUrl => {
                this.textRenderer.app.loadTextureAsset({ URL: imgUrl }, (texture, err) => {
                    if (err) {
                        throw err;
                    }
                    let newAxisX = this.textStyle.x;
                    if (this.textStyle.xDirection === "right") {
                        newAxisX -= context.canvas.width;
                    }
                    let newAxisY = this.textStyle.y;
                    if (this.textStyle.yDirection === "bottom") {
                        newAxisY -= context.canvas.height;
                    }
                    this.TheImageRenderer = this.textRenderer.app.ImageRenderer.NewImageFromTextures([{ id: 1, texture }], {
                        width: context.canvas.width,
                        height: context.canvas.height,
                        x: newAxisX,
                        y: newAxisY
                    }, () => {
                        this._isReady = true;
                    });
                });
            }).catch(er => {
                this.textRenderer.app.console.error(er);
            });
        }
    }
    _loadURLsFromCanvases(items) {
        return new Promise((resolve, reject) => {
            const promises = [];
            for (const i in items) {
                const item = items[i];
                promises.push(new Promise((resolveEach, rejectEach) => {
                    Text.canvasToStringUrl(item.canvas).then(imgUrl => {
                        resolveEach({ item, URL: imgUrl });
                    }).catch(er => {
                        rejectEach({
                            item,
                            error: er
                        });
                    })
                }));
            }
            if (!promises.length) {
                return reject("Empty text canvas!")
            }
            Promise.all(promises).then(resolves => {
                const URLs = [];
                for (const r of resolves) {
                    const rItem = { id: r.item.id, URL: r.URL };
                    URLs.push(rItem)
                }
                resolve(URLs);
            }).catch(er => {
                reject(er);
            });
        });
    }
    _updateNonFloatableTextXY() {
        if (this.textStyle.floatingText.float || !this.nonFloatableTextProp || !this.TheImageRenderer) return;
        let newAxisX = this.textStyle.x;
        if (this.textStyle.xDirection === "right") {
            newAxisX -= this.nonFloatableTextProp.width;
        }
        let newAxisY = this.textStyle.y;
        if (this.textStyle.yDirection === "bottom") {
            newAxisY -= this.nonFloatableTextProp.height;
        }
        this.TheImageRenderer.update({
            x: newAxisX,
            y: newAxisY
        });
    }
    update({ x, y } = {}) {
        if (!this.textStyle.floatingText.float) {
            if (x !== undefined) {
                this.textStyle.x = x;
            }
            if (y !== undefined) {
                this.textStyle.y = y;
            }
            if (x !== undefined || y !== undefined) {
                this._updateNonFloatableTextXY();
            }
        }
    }
    render() {
        if (!this.TheImageRenderer) return;
        if (this.textStyle.floatingText.float) {
            if (!this._isReady) return;

            if (!this.floatableItems._state) {
                this.floatableItems._state = {
                    total_width: 0,
                    moving_x: -(this.floatableItems.frame.width - 100),
                    speedMoveStep: null,
                    appFrameRate: this.textRenderer.app.frameRate
                }
                for (const item of this.floatableItems.items) {
                    this.floatableItems._state.total_width += item.width;
                }
            }
            const state = this.floatableItems._state;

            let newAxisY = this.textStyle.y;
            if (this.textStyle.yDirection === "bottom") {
                newAxisY -= this.floatableItems.height;
            }

            if (state.speedMoveStep === null || state.appFrameRate !== this.textRenderer.app.frameRate) {
                state.appFrameRate = this.textRenderer.app.frameRate;
                const now = window.performance.now();
                const elapsedTime = now - (now - (1000 / this.textRenderer.app.frameRate));
                const timePerSpeed = 1000 / this.textStyle.floatingText.speed;
                state.speedMoveStep = elapsedTime / timePerSpeed;
            }

            state.moving_x -= state.speedMoveStep;

            if (state.total_width + state.moving_x <= this.floatableItems.frame.width) {
                //state.moving_x = this.floatableItems.frame.width - (this.floatableItems._state.total_width);
                state.moving_x = 0;
            }

            let nextMovingX = state.moving_x;
            let widthPos = 0;
            let lastTestNextMovingX = nextMovingX;
            for (const item of this.floatableItems.items) {
                widthPos += item.width;
                const testNextMovingX = widthPos + nextMovingX;
                if (testNextMovingX > 0 &&
                    (this.floatableItems.frame.width >= testNextMovingX
                        ||
                        (lastTestNextMovingX > 0 && this.floatableItems.frame.width >= lastTestNextMovingX)
                    )
                ) {
                    this.TheImageRenderer.update({
                        toRenderID: item.id,
                        width: item.width,
                        height: item.height,
                        x: testNextMovingX - item.width,
                        y: newAxisY
                    });
                    this.TheImageRenderer.render();
                }
                lastTestNextMovingX = testNextMovingX;
            }

        } else {
            this.TheImageRenderer.render();
        }
    }
    static canvasToStringUrl(canvas) {
        return new Promise((resolve, reject) => {
            try {
                resolve(canvas.toDataURL());
            } catch (e) {
                reject(e)
            }
        });
    }

    static calculateTextViewInCanvas(context, text, x, y, {
        maxWidth, maxLine, lineHeight, compactText, hyphenateWord }) {
        const initialY = y;
        const calculatedText = {
            width: 0,
            height: 0,
            highest_line_width: 0,
            highest_line_height: 0,
            lines: []
        };
        let noMoreBreakAll = false;
        let ellipseNextLine = false;

        let itStillHaveMoreBeforeEllipsed = false;

        if (maxLine === 1) {
            ellipseNextLine = true;
        }

        let lineCountsNow = 0;
        let keepLineForFinalEllipse = null;
        const pasteCalculatedLine = (line, isUserNewLine, isCalledFromFinal) => {
            if (ellipseNextLine && !isCalledFromFinal) {
                lineCountsNow++;
                keepLineForFinalEllipse = { line, isUserNewLine };
                noMoreBreakAll = true;
                return;
            } else if (isCalledFromFinal && !ellipseNextLine) {
                return;
            } else if (isCalledFromFinal && keepLineForFinalEllipse === null) {
                return
            } else if (isCalledFromFinal) {
                line = keepLineForFinalEllipse.line;
                isUserNewLine = keepLineForFinalEllipse.isUserNewLine;
                if (itStillHaveMoreBeforeEllipsed) {
                    line.line = line.line.trimEnd();
                    line.line += "...";
                }
            } else {
                lineCountsNow++;
            }

            if (!isUserNewLine) {
                line.line = line.line.trimStart();
            }

            line.line = line.line.trimEnd();

            const metrics = context.measureText(line.line);
            const lineItem = {
                x, y, line: line.line, isWordBreakAtEnd: line.isWordBreakAtEnd,
                height: 0,
                width: 0,
            };
            const mLineHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            lineItem.width = metrics.width;
            lineItem.height = mLineHeight;
            if (calculatedText.width > calculatedText.highest_line_height) {
                calculatedText.highest_line_height = mLineHeight;
            }
            y += mLineHeight;
            //Add the given lineHeight to the characters metric line height.
            if (lineHeight) y += lineHeight;
            if (metrics.width > maxWidth) {
                calculatedText.width = maxWidth;
            } else if (metrics.width > calculatedText.width) {
                calculatedText.width = metrics.width;
            }
            if (calculatedText.width > calculatedText.highest_line_width) {
                calculatedText.highest_line_width = calculatedText.width;
            }
            calculatedText.height = Math.abs(initialY - y);
            if (maxLine) {
                if (maxLine === (lineCountsNow + 1)) {
                    ellipseNextLine = true;
                }
            }
            calculatedText.lines.push(lineItem);
        }

        const chars = text.split("\n");
        let wordsStr = chars.shift();
        let isUserNewLine = null;
        while (wordsStr !== undefined) {
            if (noMoreBreakAll) {
                itStillHaveMoreBeforeEllipsed = true;
                break;
            }
            let line = null;
            const words = wordsStr.split(" ");
            let word = words.shift();
            isUserNewLine = true;
            while (word !== undefined) {
                if (noMoreBreakAll) {
                    word = undefined;
                    line = null;
                    itStillHaveMoreBeforeEllipsed = true;
                    break
                };
                let testLine = "";
                if (line === null) {
                    testLine = word;
                } else {
                    testLine = line + " " + word;
                }
                let measureTestLine = testLine;
                if (ellipseNextLine) {
                    measureTestLine += "...";
                }

                const metrics = context.measureText(measureTestLine);
                const testWidth = metrics.width;

                if (testWidth > maxWidth) {
                    let jumpToMainWrite = true;
                    let testHyphenatedLine = (line ?? word);
                    if (compactText) {
                        testHyphenatedLine = testLine;
                    }
                    if (compactText || testHyphenatedLine.split(" ").length === 1) {

                        let testWidth2 = testWidth;
                        if (!compactText) {
                            let testHyphenatedLineMeasureSuffix = "";
                            if (ellipseNextLine) {
                                testHyphenatedLineMeasureSuffix = "...";
                            }
                            const metrics = context.measureText(testHyphenatedLine + testHyphenatedLineMeasureSuffix);
                            testWidth2 = metrics.width;
                        }


                        if (testWidth2 > maxWidth) {
                            jumpToMainWrite = false;
                            if (compactText) {
                                //Hyphenate the last word in current line and postpone the current word. 
                                line = null;
                            } else {
                                if (line !== null) {
                                    //Hyphenate the last word in current line and postpone the current word. 
                                    words.unshift(word);
                                    line = null;
                                }
                            }
                            //The line is a single word which is longer than the maximum width so we have to hyphenated it.
                            const wordChars = [...testHyphenatedLine];

                            let hyphenateLongWord = "";
                            let hyphenateLongWordAddedCounts = 0;
                            let wordChar = wordChars.shift();
                            let lastCharIsAlphabet = false;
                            while (wordChar !== undefined) {
                                const charIsAlphabet = Text.charsContainAlphabet(wordChar);
                                if (hyphenateLongWordAddedCounts) {

                                    let continuousWordSuffix = "";
                                    if (ellipseNextLine) {
                                        continuousWordSuffix = "...";
                                    } else
                                        if (!hyphenateWord) {
                                            continuousWordSuffix = "";
                                        } else
                                            if (charIsAlphabet && lastCharIsAlphabet) {
                                                continuousWordSuffix = "-";
                                            }
                                    const metrics = context.measureText(hyphenateLongWord + wordChar + continuousWordSuffix);
                                    const testWidth = metrics.width;
                                    if (testWidth > maxWidth) {
                                        if (ellipseNextLine) {
                                            continuousWordSuffix = "";
                                        }
                                        pasteCalculatedLine({ isWordBreakAtEnd: true, line: hyphenateLongWord + continuousWordSuffix }, isUserNewLine);
                                        isUserNewLine = false;
                                        hyphenateLongWord = null;
                                        wordChars.unshift(wordChar);
                                        words.unshift(wordChars.join(''));
                                        break;
                                    }
                                }
                                hyphenateLongWord += wordChar;
                                hyphenateLongWordAddedCounts++;
                                lastCharIsAlphabet = charIsAlphabet;
                                wordChar = wordChars.shift();
                            }
                        } else {
                            jumpToMainWrite = true;
                        }

                    }
                    if (jumpToMainWrite) {
                        let toWrite = "";
                        if (line === null) {
                            toWrite = word;
                        } else {
                            toWrite = line;
                            line = word;
                        }
                        pasteCalculatedLine({ line: toWrite }, isUserNewLine);
                        isUserNewLine = false;
                    }
                }
                else {
                    line = testLine;
                }


                word = words.shift();
                if (!compactText) {
                    if (word === undefined && line !== null) {
                        const metrics = context.measureText(line);
                        const testWidth = metrics.width;
                        if (testWidth > maxWidth) {
                            word = line;
                            line = null;
                        }
                    }
                }


            }
            if (line !== null) {
                pasteCalculatedLine({ line }, isUserNewLine);
            }

            wordsStr = chars.shift();
        }
        pasteCalculatedLine(null, null, true);

        //Subtract the given lineHeight from the last characters metric line height.
        if (lineHeight && calculatedText.height) {
            calculatedText.height -= lineHeight;
        }

        return calculatedText;
    }

    static charsContainAlphabet(str) {
        if (typeof str !== 'string') return false;
        const matches = str.match(/\p{L}/gu); // Match any Unicode letter character
        return matches !== null;
    }
    static normalizeRGB_RGBA_Array_To_255_String(rgb) {
        if (!rgb || !rgb.length) {
            return "rgb(0, 0, 0)";
        } else if (rgb <= 3) {
            const r = rgb[0];
            const g = rgb[1] ?? 0;
            const b = rgb[2] ?? 0;
            return `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
        } else {
            const r = rgb[0];
            const g = rgb[1];
            const b = rgb[2];
            const a = rgb[3];
            return `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
        }
    }
    destroy(unlinkCache = false) {
        if(this.TheImageRenderer){
            this.TheImageRenderer.destroy(unlinkCache);
        }
    }
}