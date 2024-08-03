import VCVRDEnum from './logs/VCVRDEnum';
import VCVRDError from './logs/VCVRDError';
import EventHandler from './event-handle';
import RoundedRectBorderEntryPointSource from '!raw-loader!./shaders/rounded-rect-border-entry-point.frag';
import mutedMicImageURL from "@/../asset/vc-videos-renderer/images/muted-mic.png";
import defaultAvatarURL from "@/../asset/vc-videos-renderer/images/default-avatar.png";
import defaultReconnectingAvatarURL from "@/../asset/vc-videos-renderer/images/default-reconnecting-avatar.png";
import Env from "@/../env.json";
import CustomAnimationFrameRunner from "./utils/CustomAnimationFrameRunner";

import {
  createShader,
  createProgram,
  createBuffer,
  setBufferData,
  calculateVerticesPosition,
  createRectVertices,
  createTexture,
} from './utils/GLHelpers';
import {
  calculateHeightFromRatio,
  deleteIndex
} from './utils/Common';
import CaptureMediaStreamFromMediaElement from './utils/CaptureMediaStreamFromMediaElement';


var _vcVrd__gid = 1;
class vcVideosRendererCore {
  constructor(
    canvas,
    options
  ) {
    this.extState = {};
    this.options = options;
    this.debug = this.options.debug;
    this.frameRate = this.options.frameRate;
    this.canvas = canvas;
    this.console = this.console();
    this.appID = 'vc-videos-renderer_' + this.generateIncreamentID();
    this.session = {};
    this.Event = new EventHandler(this.appID);
    this.gl = null;
    this.itemsToMergerList = [];
    this.audioItemsToMergerList = [];
    this.isDrawing = false;
    this.AnimationFrameRunner = new CustomAnimationFrameRunner();
    this.shaders = null;

    this.ImageRenderer = null;
    this.TextRenderer = null;

    this.MediaStream = null;
    this.MediaStreamTrackVideo = null;
    this.MediaAudio = null;
    this.MediaStreamTrackAudio = null;

    this.destroyed = false;

    this._cachedTextures = {
      fetchingCaches: [],
      caches: []
    }
    this.waiting_animation_ImageRenderer = null;
    this._initDefaultEvent();
  }
  generateIncreamentID() {
    return _vcVrd__gid++;
  }
  _getMixedStream() {
    return this.MediaStream;
  }
  _initDefaultEvent() {
    this._initWebGL();

    const waitingAnimationsTextures = [];
    for (let i = 0; i < 55; i++) {
      const frameUrl = `${Env.publicPath}asset/vc-videos-renderer/images/gif/waiting/waiting-100x54-${i}.png`;
      waitingAnimationsTextures.push({
        URL: frameUrl
      });
    }
    this.waiting_animation_ImageRenderer = this.ImageRenderer.NewImageFromURLs(waitingAnimationsTextures,
      {
        gif: {
          isGif: true,
          frameRate: 30,
        },
        width: 100,
        height: 54,
        x: 200,
        y: 200,
        objectFit: "contain",
        borderSoftness: 0
      });
  }

  _resetFrame(frameItems, updateItemsOnly) {
    const oldItemsToMergerListAsMap = {};
    for (const old_mItem of this.itemsToMergerList) {
      if (updateItemsOnly) {
        for (const itemProp of frameItems) {
          if (itemProp.id !== old_mItem.id) continue;
          oldItemsToMergerListAsMap[old_mItem.id] = old_mItem;
          break;
        }
      } else {
        oldItemsToMergerListAsMap[old_mItem.id] = old_mItem;
      }
    }
    const newItemsToMergerList = [];
    for (const i in frameItems) {
      const itemProp = frameItems[i];
      let old_mItem = oldItemsToMergerListAsMap[itemProp.id];
      if (updateItemsOnly && !old_mItem) {
        this.console.warn(`No frame item as id "${itemProp.id}" for update!`);
        continue;
      }
      if (itemProp.type === "video") {

        const mItem = {
          type: itemProp.type,
          id: itemProp.id,
          videoElement: itemProp.videoElement,
          renderVideo: itemProp.renderVideo,
          renderAudio: itemProp.renderAudio,
          cameraDisabled: itemProp.cameraDisabled,
          audioDisabled: itemProp.audioDisabled,
          displayName: itemProp.displayName,
          isWaiting: (itemProp.isWaiting ?? false),
          isReconnecting: (itemProp.isReconnecting ?? false),
          isVideoReady: false,
          reconnectingAvatarURL: itemProp.reconnectingAvatarURL ? itemProp.reconnectingAvatarURL : defaultReconnectingAvatarURL,
          avatarURL: itemProp.avatarURL ? itemProp.avatarURL : defaultAvatarURL,
          width: itemProp.width,
          height: itemProp.height,
          x: itemProp.x,
          y: itemProp.y,
          objectFit: itemProp.objectFit,
          borderRadius: itemProp.borderRadius,
          backgroundColor: itemProp.backgroundColor,
          borderColor: itemProp.borderColor,
          borderWidth: itemProp.borderWidth,
          borderSoftness: (itemProp.borderSoftness ?? 2),
          innerBorder: {
            borderColor: itemProp.innerBorder?.borderColor,
            borderWidth: itemProp.innerBorder?.borderWidth,
          },
          _mitem_state: {
            Reconnecting_ImageRenderer: null,
            DisplayName_TextRenderer: null,
            videoTexture: null,
          }
        }

        this._addEventToVideo(mItem);

        let isSameDimension = false;
        let isSamePosition = false;
        let isSameBorderRadius = false;

        if (old_mItem && old_mItem.type === "video") {
          delete oldItemsToMergerListAsMap[itemProp.id];
          this._removeEventFromVideo(old_mItem);
          if (this._compareObjectsProperties(old_mItem, mItem, [
            {
              key1: "width",
              key2: "width",
            },
            {
              key1: "height",
              key2: "height",
            },
            {
              key1: "borderWidth",
              key2: "borderWidth",
            }
          ])) {
            isSameDimension = true;
          }
          if (this._compareObjectsProperties(old_mItem, mItem, [
            {
              key1: "x",
              key2: "x",
            },
            {
              key1: "y",
              key2: "y",
            }
          ])) {
            isSamePosition = true;
          }
          if (this._compareObjectsProperties(old_mItem, mItem, [
            {
              key1: "borderRadius",
              key2: "borderRadius",
            }
          ])) {
            isSameBorderRadius = true;
          }
        } else {
          old_mItem = null;
        }

        if (old_mItem && old_mItem._mitem_state.videoTexture) {
          mItem._mitem_state.videoTexture = old_mItem._mitem_state.videoTexture;
          old_mItem._mitem_state.videoTexture = null;
        } else {
          mItem._mitem_state.videoTexture = createTexture(this.gl)/*Store video textures.*/;
        }

        if (true/*Just a block for waitingDimension*/) {
          if (!old_mItem || !old_mItem.waitingDimension || !isSameDimension || !isSamePosition) {
            mItem.waitingDimension = {
              width: 20,
              height: 0,
              x: 0,
              y: 0,
              sessionKey: this.generateIncreamentID()
            };
            if (mItem.width > 300) {
              mItem.waitingDimension.width = 30;
            }
            mItem.waitingDimension.height = calculateHeightFromRatio(mItem.waitingDimension.width, "100:54");

            mItem.waitingDimension.x = Math.abs(mItem.x + ((mItem.width / 2) - (mItem.waitingDimension.width / 2)));
            mItem.waitingDimension.y = Math.abs(mItem.y + ((mItem.height / 2) - (mItem.waitingDimension.height / 2)));
          } else {
            mItem.waitingDimension = old_mItem.waitingDimension;
          }
        }
        if (true/*Just a block for avatar*/) {
          const calcDimensions = () => {
            let avatarSize = null;
            const avatarBorderSoftness = 2;
            //We have to make avatar equal with width and height.
            if (mItem.width > mItem.height) {
              avatarSize = mItem.height - (mItem.borderWidth ?? 0) - 30;
            } else {
              avatarSize = mItem.width - (mItem.borderWidth ?? 0) - 30;
            }
            const avatarborderWidth = 2;
            if ((avatarSize + avatarborderWidth) > 300) {
              avatarSize = 300 - avatarborderWidth;
            }
            const avatarBorderRadius = avatarSize / 2;
            return {
              avatarSize,
              x: Math.abs(mItem.x + ((mItem.width / 2) - (avatarSize / 2))),
              y: Math.abs(mItem.y + ((mItem.height / 2) - (avatarSize / 2))),
              borderRadius: avatarBorderRadius,
              borderWidth: avatarborderWidth,
              borderSoftness: avatarBorderSoftness
            }
          }
          if (old_mItem && mItem.avatarURL === old_mItem.avatarURL && isSameDimension && isSamePosition) {
            mItem._mitem_state.Avatar_ImageRenderer = old_mItem._mitem_state.Avatar_ImageRenderer;
            old_mItem._mitem_state.Avatar_ImageRenderer = null;
          } else
            if (old_mItem && mItem.avatarURL === old_mItem.avatarURL && (!isSameDimension || !isSamePosition)) {
              if (old_mItem._mitem_state.Avatar_ImageRenderer) {
                const avatarDim = calcDimensions();
                old_mItem._mitem_state.Avatar_ImageRenderer.update({
                  width: avatarDim.avatarSize,
                  height: avatarDim.avatarSize,
                  x: avatarDim.x,
                  y: avatarDim.y,
                  borderWidth: avatarDim.borderWidth,
                  borderRadius: avatarDim.borderRadius,
                  borderSoftness: avatarDim.borderSoftness,
                });
                mItem._mitem_state.Avatar_ImageRenderer = old_mItem._mitem_state.Avatar_ImageRenderer;
                old_mItem._mitem_state.Avatar_ImageRenderer = null;
              }
            } else
              if (mItem.avatarURL) {
                const avatarDim = calcDimensions();
                mItem._mitem_state.Avatar_ImageRenderer = this.ImageRenderer.NewImageFromURLs([
                  {
                    URL: mItem.avatarURL,
                    cacheID: mItem.avatarURL
                  }],
                  {
                    width: avatarDim.avatarSize,
                    height: avatarDim.avatarSize,
                    x: avatarDim.x,
                    y: avatarDim.y,
                    objectFit: "cover",
                    backgroundColor: [0, 0, 0, 0],
                    borderColor: [0, 0.78, 1, 0.4],
                    borderWidth: avatarDim.borderWidth,
                    borderRadius: avatarDim.borderRadius,
                    borderSoftness: avatarDim.borderSoftness,
                  });
              }

          if (old_mItem && old_mItem._mitem_state.Avatar_ImageRenderer) {
            old_mItem._mitem_state.Avatar_ImageRenderer.destroy(old_mItem.avatarURL === defaultAvatarURL ? false : true);
            old_mItem._mitem_state.Avatar_ImageRenderer = null;
          }
        }
        if (true/*Just a block for displayName*/) {
          if (old_mItem && mItem.displayName === old_mItem.displayName && isSameDimension && isSameBorderRadius && isSamePosition) {
            mItem._mitem_state.DisplayName_TextRenderer = old_mItem._mitem_state.DisplayName_TextRenderer;
            old_mItem._mitem_state.DisplayName_TextRenderer = null;
          } else
            if (old_mItem && mItem.displayName === old_mItem.displayName && isSameDimension && isSameBorderRadius && !isSamePosition) {
              if (old_mItem._mitem_state.DisplayName_TextRenderer) {
                old_mItem._mitem_state.DisplayName_TextRenderer.update({
                  x: mItem.x + mItem.width - (mItem.borderWidth ?? 0),
                  y: mItem.y + mItem.height - (mItem.borderWidth ?? 0)
                });
                mItem._mitem_state.DisplayName_TextRenderer = old_mItem._mitem_state.DisplayName_TextRenderer;
                old_mItem._mitem_state.DisplayName_TextRenderer = null;
              }
            } else if (mItem.displayName) {
              mItem._mitem_state.DisplayName_TextRenderer = this.TextRenderer.NewText(mItem.displayName, {
                maxWidth: mItem.width - (mItem.borderWidth ?? 0 * 2) - 20,
                maxLine: 1,
                fontSize: 12,
                fontWeight: "bold",
                textColor: [0.9, 0.9, 0.9, 1],
                backgroundColor: [0, 0, 0, 0.6],
                padding: [5, 10],
                borderRadius: [0, 0, mItem.borderRadius, 0],
                xDirection: "right",
                yDirection: "bottom",
                x: mItem.x + mItem.width - (mItem.borderWidth ?? 0),
                y: mItem.y + mItem.height - (mItem.borderWidth ?? 0)
              });
            }
          if (old_mItem && old_mItem._mitem_state.DisplayName_TextRenderer) {
            old_mItem._mitem_state.DisplayName_TextRenderer.destroy();
            old_mItem._mitem_state.DisplayName_TextRenderer = null;
          }
        }
        if (true/*Just a block for displayName*/) {
          if (old_mItem && mItem.displayName === old_mItem.displayName && isSameDimension && isSameBorderRadius && isSamePosition) {
            mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer = old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer;
            old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer = null;
          } else
            if (old_mItem && mItem.displayName === old_mItem.displayName && isSameDimension && isSameBorderRadius && !isSamePosition) {
              if (old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer) {
                old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer.update({
                  x: mItem.x + mItem.width - (mItem.borderWidth ?? 0),
                  y: mItem.y + mItem.height - (mItem.borderWidth ?? 0)
                });
                mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer = old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer;
                old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer = null;
              }
            } else {
              mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer = this.TextRenderer.NewText(mItem.displayName ?? "", {
                maxWidth: mItem.width - (mItem.borderWidth ?? 0 * 2) - 20,
                maxLine: 1,
                fontSize: 12,
                fontWeight: "bold",
                textColor: [0.9, 0.9, 0.9, 1],
                backgroundColor: [0, 0, 0, 0.6],
                padding: [5, 10],
                borderRadius: [0, 0, mItem.borderRadius, 0],
                xDirection: "right",
                yDirection: "bottom",
                x: mItem.x + mItem.width - (mItem.borderWidth ?? 0),
                y: mItem.y + mItem.height - (mItem.borderWidth ?? 0),
                icon: {
                  iconURL: mutedMicImageURL,
                  iconCacheID: mutedMicImageURL,
                  placeIcon: "right",
                  fromTextToIconPadding: 10,
                  width: 15,
                  height: 20,
                }
              });
            }
          if (old_mItem && old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer) {
            old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer.destroy();
            old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer = null;
          }
        }
        this._initVideoReconnecting(mItem, { isNewUpdate: true, old_mergeItem: old_mItem });
        newItemsToMergerList.push(mItem);
      } else if (itemProp.type === "text") {

        const mItem = {
          type: itemProp.type,
          id: itemProp.id,
          text: itemProp.text,
          floatingText: itemProp.floatingText,
          maxWidth: itemProp.maxWidth,
          maxLine: itemProp.maxLine,
          fontSize: itemProp.fontSize,
          fontWeight: itemProp.fontWeight,
          textColor: itemProp.textColor,
          backgroundColor: itemProp.backgroundColor,
          padding: itemProp.padding,
          borderRadius: itemProp.borderRadius,
          xDirection: itemProp.xDirection,
          yDirection: itemProp.yDirection,
          x: itemProp.x,
          y: itemProp.y,
          hyphenateWord: itemProp.hyphenateWord,
          compactText: itemProp.compactText,
          icon: itemProp.icon,
          _mitem_state: {
            TextItemRenderer: null
          }
        }

        let isSameAsOld = false;

        if (old_mItem && old_mItem.type === "text") {
          delete oldItemsToMergerListAsMap[itemProp.id];
          if (this._compareObjectsProperties(old_mItem, mItem, [
            {
              sameKeys: [
                "text", "floatingText",
                "maxWidth", "maxLine",
                "fontSize", "fontWeight", "textColor", "backgroundColor",
                "padding", "borderRadius",
                "xDirection",
                "yDirection",
                "x", "y",
                "hyphenateWord", "compactText",
                "icon"
              ]
            },
          ])) {
            isSameAsOld = true;
          }
        } else {
          old_mItem = null;
        }

        if (isSameAsOld) {
          mItem._mitem_state.TextItemRenderer = old_mItem._mitem_state.TextItemRenderer;
          old_mItem._mitem_state.TextItemRenderer = null;
        } else {
          mItem._mitem_state.TextItemRenderer = this.TextRenderer.NewText(mItem.text, {
            floatingText: mItem.floatingText,
            maxWidth: mItem.maxWidth,
            maxLine: mItem.maxLine,
            fontSize: mItem.fontSize,
            fontWeight: mItem.fontWeight,
            textColor: mItem.textColor,
            backgroundColor: mItem.backgroundColor,
            padding: mItem.padding,
            borderRadius: mItem.borderRadius,
            xDirection: mItem.xDirection,
            yDirection: mItem.yDirection,
            x: mItem.x,
            y: mItem.y,
            hyphenateWord: mItem.hyphenateWord,
            compactText: mItem.compactText,
            icon: mItem.icon,
          });
        }
        newItemsToMergerList.push(mItem);
      }
    }
    if (updateItemsOnly) {
      const newItems = {};
      for (const newItem of newItemsToMergerList) {
        newItems[newItem.id] = newItem;
      }
      for (const index in this.itemsToMergerList) {
        const oldItem = this.itemsToMergerList[index];
        if (!newItems[oldItem.id]) continue;
        //Replace the old item with the new updated item.
        this.itemsToMergerList[index] = newItems[oldItem.id];
      }
    } else {
      this.itemsToMergerList = newItemsToMergerList;
    }
    this._resetAudioTracks(newItemsToMergerList, updateItemsOnly);
    for (const k in oldItemsToMergerListAsMap) {
      const old_mItem = oldItemsToMergerListAsMap[k];
      if (!old_mItem) continue;
      if (old_mItem.type === "video") {
        this._removeEventFromVideo(old_mItem);
        if (old_mItem._mitem_state.Avatar_ImageRenderer) {
          old_mItem._mitem_state.Avatar_ImageRenderer.destroy(old_mItem.avatarURL === defaultAvatarURL ? false : true);
        }
        if (old_mItem._mitem_state.DisplayName_TextRenderer) {
          old_mItem._mitem_state.DisplayName_TextRenderer.destroy();
        }
        if (old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer) {
          old_mItem._mitem_state.DisplayName_WithMutedMic_TextRenderer.destroy();
        }
        if (old_mItem._mitem_state.Reconnecting_ImageRenderer) {
          old_mItem._mitem_state.Reconnecting_ImageRenderer.destroy(old_mItem.reconnectingAvatarURL === defaultReconnectingAvatarURL ? false : true);
        }
      }
    }
  }
  _addEventToVideo(mItem) {
    if (mItem.type !== "video") return;
    const hasVideoTrack = () => {
      let hasVideoTrack = true;
      if (mItem.videoElement.srcObject && !mItem.videoElement.srcObject.getVideoTracks().length) {
        hasVideoTrack = false;
      }
      return hasVideoTrack;
    }
    mItem._mitem_state._VideoCanplayEventCb = () => {
      if (hasVideoTrack()) {
        mItem.isVideoReady = true;
      } else {
        mItem.isVideoReady = false;
      }
    }
    mItem.videoElement.addEventListener('canplay', mItem._mitem_state._VideoCanplayEventCb);
    if (mItem.videoElement.readyState >= 1) {
      mItem._mitem_state._VideoCanplayEventCb();
    }
  }
  _removeEventFromVideo(mItem) {
    if (mItem.type !== "video") return;
    mItem.videoElement.removeEventListener('canplay', mItem._mitem_state._VideoCanplayEventCb);
    mItem._mitem_state._VideoCanplayEventCb = null;
  }
  _updateExistingItems(frameItems) {
    this._resetFrame(frameItems, true);
  }
  _softUpdateVideoFrameItem(itemID, {
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
  }) {
    let foundTheItemIn = false;
    for (const mItem of this.itemsToMergerList) {
      if (mItem.id !== itemID) continue;
      if (mItem.type !== "video") {
        this.console.warn(`The video id "${itemID}" does not match the existing video type!`);
        return;
      }
      let canUpdateAudio = false;
      if (objectFit !== undefined) {
        mItem.objectFit = objectFit;
      }
      if (renderVideo !== undefined) {
        mItem.renderVideo = renderVideo;
      }
      if (renderAudio !== undefined) {
        canUpdateAudio = true;
        mItem.renderAudio = renderAudio;
      }
      if (cameraDisabled !== undefined) {
        mItem.cameraDisabled = cameraDisabled;
      }
      if (audioDisabled !== undefined) {
        canUpdateAudio = true;
        mItem.audioDisabled = audioDisabled;
      }
      if (isWaiting !== undefined) {
        mItem.isWaiting = isWaiting;
      }
      if (isReconnecting !== undefined) {
        mItem.isReconnecting = isReconnecting;
      }
      if (backgroundColor !== undefined) {
        mItem.backgroundColor = backgroundColor;
      }
      if (borderColor !== undefined) {
        mItem.borderColor = borderColor;
      }
      if (innerBorderColor !== undefined && mItem.innerBorder) {
        mItem.innerBorder.borderColor = innerBorderColor;
      }
      if (canUpdateAudio) {
        this._resetAudioTracks([mItem], true);
      }
      foundTheItemIn = true;
      break;
    }
    if (!foundTheItemIn) {
      this.console.warn(`No video item with id "${itemID}" matches any of the existing videos!`)
    }
  }
  _initVideoReconnecting(mergeItem, { isNewUpdate, old_mergeItem } = {}) {
    if (isNewUpdate) {
      if (!old_mergeItem || old_mergeItem.type !== "video") return;
      if (mergeItem.reconnectingAvatarURL !== old_mergeItem.reconnectingAvatarURL) {
        if (old_mergeItem._mitem_state.Reconnecting_ImageRenderer) {
          old_mergeItem._mitem_state.Reconnecting_ImageRenderer.destroy(old_mergeItem.reconnectingAvatarURL === defaultReconnectingAvatarURL ? false : true);
          old_mergeItem._mitem_state.Reconnecting_ImageRenderer = null;
        }
        if (!mergeItem.isReconnecting) return;
      }
    }
    if (!isNewUpdate) {
      if (mergeItem.type !== "video" || mergeItem._mitem_state.Reconnecting_ImageRenderer) return;
    }
    const reconnectingAvatarURL = mergeItem.reconnectingAvatarURL;
    let newLeft = mergeItem.x;
    let newTop = mergeItem.y;
    let newWidth = mergeItem.width;
    let newHeight = mergeItem.height;
    let newBorderRadius = mergeItem.borderRadius;
    if (mergeItem.borderWidth || (mergeItem.innerBorder && mergeItem.innerBorder.borderWidth)) {
      if (newBorderRadius) {
        newBorderRadius += 2;//u_edgeSoftness
      }
      if (newBorderRadius && !mergeItem.borderWidth && mergeItem.innerBorder && mergeItem.innerBorder.borderWidth) {
        const uEdgeSoftnessNoise = 2;
        newWidth -= uEdgeSoftnessNoise;
        newHeight -= uEdgeSoftnessNoise;
        newLeft += uEdgeSoftnessNoise / 2;
        newTop += uEdgeSoftnessNoise / 2;
        newBorderRadius -= uEdgeSoftnessNoise;
      }
      let borderSoftnessBoundary = 0;
      if (mergeItem.borderWidth) {
        if (mergeItem.borderSoftness) {
          borderSoftnessBoundary = (mergeItem.borderSoftness / 2);
          newWidth -= borderSoftnessBoundary;
          newHeight -= borderSoftnessBoundary;
          newLeft += borderSoftnessBoundary / 2;
          newTop += borderSoftnessBoundary / 2;
        }
        newLeft += mergeItem.borderWidth;
        newTop += mergeItem.borderWidth;
        newWidth -= mergeItem.borderWidth * 2;
        newHeight -= mergeItem.borderWidth * 2;
        if (newBorderRadius) {
          newBorderRadius -= mergeItem.borderWidth;
        }
      }
    }

    if (isNewUpdate && old_mergeItem._mitem_state.Reconnecting_ImageRenderer) {
      old_mergeItem._mitem_state.Reconnecting_ImageRenderer.update({
        width: newWidth,
        height: newHeight,
        x: newLeft,
        y: newTop,
        borderRadius: newBorderRadius
      });
      mergeItem._mitem_state.Reconnecting_ImageRenderer = old_mergeItem._mitem_state.Reconnecting_ImageRenderer;
      old_mergeItem._mitem_state.Reconnecting_ImageRenderer = null;
    } else {
      mergeItem._mitem_state.Reconnecting_ImageRenderer = this.ImageRenderer.NewImageFromURLs([
        {
          URL: reconnectingAvatarURL,
          cacheID: reconnectingAvatarURL
        }],
        {
          width: newWidth,
          height: newHeight,
          x: newLeft,
          y: newTop,
          objectFit: "cover",
          borderRadius: newBorderRadius,
          borderSoftness: 0
        });
    }
  }
  _stopDrawing() {
    this.AnimationFrameRunner.stop();
    this.isDrawing = false;
  }
  async _startDrawing() {
    if (this.destroyed) {
      throw VCVRDError.NewErrorFromEnumItem(VCVRDEnum.vcVideosRenderer_already_destroyed);
    }
    if (this.isDrawing) {
      throw VCVRDError.NewErrorFromEnumItem(VCVRDEnum.drawing_already_progress);
    }
    this._initMediaAudio();
    const fps = this.frameRate;
    this.isDrawing = true;
    this.AnimationFrameRunner.start(()=>this._render(), fps);
  }

  _resetAudioTracks(list, updateItemsOnly) {
    if (!this.MediaAudio) return;

    const oldAudioItemsToMergerListAsMap = {};
    for (const old_mItem of this.audioItemsToMergerList) {
      if (updateItemsOnly) {
        for (const itemProp of list) {
          if (itemProp.id !== old_mItem.id) continue;
          oldAudioItemsToMergerListAsMap[old_mItem.id] = old_mItem;
          break;
        }
      } else {
        oldAudioItemsToMergerListAsMap[old_mItem.id] = old_mItem;
      }
    }

    const newaudioItemsToMergerList = [];

    for (const i in list) {
      const itemProp = list[i];
      let old_mItem = oldAudioItemsToMergerListAsMap[itemProp.id];
      if (updateItemsOnly && !old_mItem) {
        continue;
      }
      if (itemProp.type === "video") {
        const mItem = {
          type: itemProp.type,
          id: itemProp.id,
          videoElement: itemProp.videoElement,
          renderAudio: itemProp.renderAudio,
          audioDisabled: itemProp.audioDisabled,
          _mitem_state: {
            capturedStream: null,
            sourceProp: null,
            MixedAudioMediaStreamGainNode: null,
            MixedAudioMediaStreamSourceNode: null
          }
        }
        if (old_mItem && old_mItem.type === "video") {
          delete oldAudioItemsToMergerListAsMap[itemProp.id];
        } else {
          old_mItem = null;
        }

        let itemNewMediaStream = null;
        if (mItem.videoElement.srcObject) {
          itemNewMediaStream = mItem.videoElement.srcObject;
        } else if (old_mItem && old_mItem.videoElement === mItem.videoElement
          && old_mItem._mitem_state.sourceProp
          && old_mItem._mitem_state.capturedStream) {
          itemNewMediaStream = old_mItem._mitem_state.capturedStream;
          mItem._mitem_state.capturedStream = itemNewMediaStream;
        } else if (!old_mItem || (old_mItem && old_mItem.videoElement !== mItem.videoElement)) {
          //We have to check it if the old video element is same with current in case it failed at first entry from faulty device, so no
          //to retry again.
          try {
            itemNewMediaStream = new CaptureMediaStreamFromMediaElement(mItem.videoElement, ["audio"]);
            mItem._mitem_state.capturedStream = itemNewMediaStream;
          } catch (er) {
            this.console.warn("Error capturing MediaStream videoElement!", er)
          }
        }

        if (old_mItem && old_mItem._mitem_state.sourceProp) {
          if (itemNewMediaStream && old_mItem._mitem_state.sourceProp.fromMediaStream) {
            mItem._mitem_state.MixedAudioMediaStreamSourceNode = old_mItem._mitem_state.MixedAudioMediaStreamSourceNode;
            mItem._mitem_state.MixedAudioMediaStreamGainNode = old_mItem._mitem_state.MixedAudioMediaStreamGainNode;
            mItem._mitem_state.sourceProp = old_mItem._mitem_state.sourceProp;
            mItem._mitem_state.fromMediaStream = old_mItem._mitem_state.fromMediaStream;

            mItem._mitem_state.sourceProp.fromMediaStream.mixedAudioMediaStream.getTracks().forEach((oldTrack) => {
              let foundAudioTrackIn = false;
              for (const newTrack of itemNewMediaStream.getTracks()) {
                if (oldTrack === newTrack && newTrack.kind === 'audio') {
                  foundAudioTrackIn = true;
                  break;
                }
              }
              if (!foundAudioTrackIn) {
                mItem._mitem_state.sourceProp.fromMediaStream.mixedAudioMediaStream.removeTrack(oldTrack);
              }
            });

            mItem._mitem_state.sourceProp.fromMediaStream.hasAudioTrack = false;
            itemNewMediaStream.getTracks().forEach((newTrack) => {
              if (newTrack.kind !== 'audio') return;
              mItem._mitem_state.sourceProp.fromMediaStream.hasAudioTrack = true;
              let foundAudioTrackIn = false;
              for (const oldTrack of mItem._mitem_state.sourceProp.fromMediaStream.mixedAudioMediaStream.getTracks()) {
                if (oldTrack === newTrack) {
                  foundAudioTrackIn = true;
                  break;
                }
              }
              if (!foundAudioTrackIn) {
                mItem._mitem_state.sourceProp.fromMediaStream.mixedAudioMediaStream.addTrack(newTrack);
              }
            });
            if (old_mItem._mitem_state.capturedStream &&
              itemNewMediaStream !== old_mItem._mitem_state.capturedStream) {
              old_mItem._mitem_state.capturedStream.stop();
            }
          } else {
            this._disconnectAudio(old_mItem);
          }
        }



        if (!mItem._mitem_state.sourceProp && itemNewMediaStream) {
          mItem._mitem_state.sourceProp = {
            fromMediaStream: {
              hasAudioTrack: false,
              mixedAudioMediaStream: new MediaStream()
            }
          };
          itemNewMediaStream.getTracks().filter(function (t) {
            return t.kind === 'audio';
          }).forEach((track) => {
            mItem._mitem_state.sourceProp.fromMediaStream.hasAudioTrack = true;
            mItem._mitem_state.sourceProp.fromMediaStream.mixedAudioMediaStream.addTrack(track);
          });


          if (mItem._mitem_state.sourceProp.fromMediaStream.hasAudioTrack) {
            try {
              mItem._mitem_state.MixedAudioMediaStreamSourceNode = this.MediaAudio.audioContext.createMediaStreamSource(mItem._mitem_state.sourceProp.fromMediaStream.mixedAudioMediaStream);
              mItem._mitem_state.MixedAudioMediaStreamGainNode = this.MediaAudio.audioContext.createGain();

              mItem._mitem_state.MixedAudioMediaStreamGainNode.gain.value = 1;

              mItem._mitem_state.MixedAudioMediaStreamSourceNode.connect(mItem._mitem_state.MixedAudioMediaStreamGainNode);
              mItem._mitem_state.MixedAudioMediaStreamGainNode.connect(this.MediaAudio.mixerGain);
            } catch (er) {
              this.console.warn("Failed creating audioContext sourceNode.", er);
            }
          }

        }
        newaudioItemsToMergerList.push(mItem);
      }
    }

    if (updateItemsOnly) {
      const newItems = {};
      for (const newItem of newaudioItemsToMergerList) {
        newItems[newItem.id] = newItem;
      }
      for (const index in this.audioItemsToMergerList) {
        const oldItem = this.audioItemsToMergerList[index];
        if (!newItems[oldItem.id]) continue;
        //Replace the old item with the new updated item.
        this.audioItemsToMergerList[index] = newItems[oldItem.id];
      }
    } else {
      this.audioItemsToMergerList = newaudioItemsToMergerList;
    }

    for (const k in oldAudioItemsToMergerListAsMap) {
      const old_mItem = oldAudioItemsToMergerListAsMap[k];
      if (!old_mItem) return;
      this._disconnectAudio(old_mItem);
    }

  }
  _disconnectAudio(mItem) {
    if (!mItem || mItem.type !== "video") return;
    if (mItem._mitem_state.capturedStream) {
      this.console.log("capturedStream",mItem._mitem_state.capturedStream)
      mItem._mitem_state.capturedStream.stop();
    }
    if (mItem._mitem_state.MixedAudioMediaStreamSourceNode) {
      try {
        mItem._mitem_state.MixedAudioMediaStreamGainNode.disconnect(this.MediaAudio.mixerGain);
        mItem._mitem_state.MixedAudioMediaStreamSourceNode.disconnect(mItem._mitem_state.MixedAudioMediaStreamGainNode);
      } catch (er) {
        this.console.warn(er)
      }
    }
  }
  _initMediaAudio() {
    if (this.MediaAudio) return;
    this.MediaAudio = {
      audioContext: new AudioContext(),
      mixerGain: null,
      destination: null
    }
    // Mixer node to mix the audio tracks.
    this.MediaAudio.mixerGain = this.MediaAudio.audioContext.createGain();

    // Destination node to capture the mixed audio.
    this.MediaAudio.destination = this.MediaAudio.audioContext.createMediaStreamDestination();
    this.MediaAudio.mixerGain.connect(this.MediaAudio.destination);

    this.MediaAudio.audioContext.resume();
    this.MediaStreamTrackAudio = this.MediaAudio.destination.stream.getAudioTracks()[0];
    this.MediaStream.addTrack(this.MediaStreamTrackAudio);

    this._resetAudioTracks(this.itemsToMergerList);
  }

  _initWebGL() {
    this.gl = this.canvas.getContext('webgl2', { alpha: false });
    if (!this.gl) {
      throw VCVRDError.NewErrorFromEnumItem(VCVRDEnum.unsupported_webgl);
    }

    this.MediaStream = this.canvas.captureStream();
    this.MediaStreamTrackVideo = this.MediaStream.getVideoTracks()[0];

    this.ImageRenderer = this.GetExtension("ImageRenderer").New();
    this.TextRenderer = this.GetExtension("TextRenderer").New();
    this.shaders = {
      kinds: {}
    };
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Create and compile shaders for image:
    const imageShaderProgram = vcVideosRendererCore.createImageShaderProgram(this.gl);

    // Set viewport:
    const dprX = Math.floor((this.canvas.width - this.canvas.width * window.devicePixelRatio) / 2);
    const dprY = Math.floor((this.canvas.height - this.canvas.height * window.devicePixelRatio) / 2);
    this.gl.viewport(dprX, dprY, this.canvas.width * window.devicePixelRatio, this.canvas.height * window.devicePixelRatio);

    // Initialize vertex buffer for screen quad:
    const img_positionVertices = new Float32Array([-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0]);
    const img_uvVertices = new Float32Array([0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0]);

    const img_aVertexPositionLocation = this.gl.getAttribLocation(imageShaderProgram, 'aVertexPosition');
    const img_aUvLocation = this.gl.getAttribLocation(imageShaderProgram, 'aUv');
    const img_positionBuffer = createBuffer(this.gl, img_positionVertices, this.gl.ARRAY_BUFFER);
    const img_uvBuffer = createBuffer(this.gl, img_uvVertices, this.gl.ARRAY_BUFFER);
    setBufferData(this.gl, img_aVertexPositionLocation, img_positionBuffer);
    setBufferData(this.gl, img_aUvLocation, img_uvBuffer);
    const img_uSamplerLocation = this.gl.getUniformLocation(imageShaderProgram, 'uSampler');
    this.gl.uniform1i(img_uSamplerLocation, 0);
    // Scale factor uniform:
    const img_uScaleLocation = this.gl.getUniformLocation(imageShaderProgram, 'uScale');
    this.gl.uniform4fv(img_uScaleLocation, [1 / window.devicePixelRatio, 1 / window.devicePixelRatio, 0.0, 1.0]);
    const img_u_resolutionLocation = this.gl.getUniformLocation(imageShaderProgram, 'u_resolution');
    const img_rect_u_sizeLocation = this.gl.getUniformLocation(imageShaderProgram, 'rect_u_size');
    const img_rect_u_borderWidthLocation = this.gl.getUniformLocation(imageShaderProgram, 'rect_u_borderWidth');
    const img_rect_u_borderSoftnessLocation = this.gl.getUniformLocation(imageShaderProgram, 'rect_u_borderSoftness');
    const img_rect_u_borderRadiusLocation = this.gl.getUniformLocation(imageShaderProgram, 'rect_u_borderRadius');
    const img_rect_u_borderColorLocation = this.gl.getUniformLocation(imageShaderProgram, 'rect_u_borderColor');
    const img_rect_u_locationLocation = this.gl.getUniformLocation(imageShaderProgram, 'rect_u_location');


    this.shaders.kinds["image"] =
    {
      program: imageShaderProgram,
      attributes: {
        rectVertexPosition: img_aVertexPositionLocation,
      },
      uniforms: {
        u_resolution: img_u_resolutionLocation,
        rect_u_size: img_rect_u_sizeLocation,
        rect_u_borderWidth: img_rect_u_borderWidthLocation,
        rect_u_borderSoftness: img_rect_u_borderSoftnessLocation,
        rect_u_borderRadius: img_rect_u_borderRadiusLocation,
        rect_u_borderColor: img_rect_u_borderColorLocation,
        rect_u_location: img_rect_u_locationLocation,
      }
    };

    this.shaders.kinds["video"] =
    {
      program: imageShaderProgram,
      attributes: {
        rectVertexPosition: img_aVertexPositionLocation,
      },
      uniforms: {
        u_resolution: img_u_resolutionLocation,
        rect_u_size: img_rect_u_sizeLocation,
        rect_u_borderWidth: img_rect_u_borderWidthLocation,
        rect_u_borderSoftness: img_rect_u_borderSoftnessLocation,
        rect_u_borderRadius: img_rect_u_borderRadiusLocation,
        rect_u_borderColor: img_rect_u_borderColorLocation,
        rect_u_location: img_rect_u_locationLocation,
      }
    };

    // Create and compile separate shader program for backgrounds/borders:
    const borderProgram = vcVideosRendererCore.createBorderShaderProgram(this.gl);
    const border_rect_uScaleLocation = this.gl.getUniformLocation(borderProgram, 'uScale');
    this.gl.uniform4fv(border_rect_uScaleLocation, [1 / window.devicePixelRatio, 1 / window.devicePixelRatio, 0.0, 1.0]);
    const border_rect_rectVertexPositionLocation = this.gl.getAttribLocation(borderProgram, 'rectVertexPosition');
    const border_u_resolutionLocation = this.gl.getUniformLocation(borderProgram, 'u_resolution');
    const border_rect_u_sizeLocation = this.gl.getUniformLocation(borderProgram, 'rect_u_size');
    const border_rect_u_borderWidthLocation = this.gl.getUniformLocation(borderProgram, 'rect_u_borderWidth');
    const border_rect_u_borderSoftnessLocation = this.gl.getUniformLocation(borderProgram, 'rect_u_borderSoftness');
    const border_rect_u_borderRadiusLocation = this.gl.getUniformLocation(borderProgram, 'rect_u_borderRadius');
    const border_rect_u_backgroundColorLocation = this.gl.getUniformLocation(borderProgram, 'rect_u_backgroundColor');
    const border_rect_u_borderColorLocation = this.gl.getUniformLocation(borderProgram, 'rect_u_borderColor');
    const border_rect_u_locationLocation = this.gl.getUniformLocation(borderProgram, 'rect_u_location');
    this.shaders.kinds["border"] = {
      program: borderProgram,
      attributes: {
        rectVertexPosition: border_rect_rectVertexPositionLocation,
      },
      uniforms: {
        u_resolution: border_u_resolutionLocation,
        rect_u_size: border_rect_u_sizeLocation,
        rect_u_borderWidth: border_rect_u_borderWidthLocation,
        rect_u_borderSoftness: border_rect_u_borderSoftnessLocation,
        rect_u_borderRadius: border_rect_u_borderRadiusLocation,
        rect_u_backgroundColor: border_rect_u_backgroundColorLocation,
        rect_u_borderColor: border_rect_u_borderColorLocation,
        rect_u_location: border_rect_u_locationLocation,
      }
    };
  }

  _render() {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Draw each video using separate textures:
    for (const mergeItem of this.itemsToMergerList) {
      if (mergeItem.type === "video") {
        if (!mergeItem.renderVideo) continue;
        this._drawVideoBackgroundsAndBorders(mergeItem, false);
        if (mergeItem.cameraDisabled) {
          //Render avatar instead if camera disabled.
          if (mergeItem._mitem_state.Avatar_ImageRenderer) {
            mergeItem._mitem_state.Avatar_ImageRenderer.render();
          }
        } else if (mergeItem.isVideoReady && (!mergeItem.isReconnecting || !mergeItem._mitem_state.Reconnecting_ImageRenderer || !mergeItem._mitem_state.Reconnecting_ImageRenderer.isItReady())) {
          const videoElement = mergeItem.videoElement;
          const videoTexture = mergeItem._mitem_state.videoTexture;
          this.gl.useProgram(this.shaders.kinds.video.program);
          // Update texture with video frame:
          this.gl.bindTexture(this.gl.TEXTURE_2D, videoTexture);
          this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1);
          this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, videoElement);

          // Bind video-specific vertex buffer:
          const positionBuffer = createBuffer(
            this.gl,
            calculateVerticesPosition(this.canvas, {
              x: mergeItem.x,
              y: mergeItem.y,
              objectFit: mergeItem.objectFit,
              width: mergeItem.width,
              height: mergeItem.height,
              borderWidth: mergeItem.borderWidth,
              imageWidth: mergeItem.videoElement.videoWidth,
              imageHeight: mergeItem.videoElement.videoHeight
            }),
            this.gl.ARRAY_BUFFER);
          setBufferData(this.gl, this.shaders.kinds.video.attributes.rectVertexPosition, positionBuffer);

          this.gl.uniform2fv(this.shaders.kinds.video.uniforms.u_resolution, [this.canvas.width, this.canvas.height]);

          if (mergeItem.borderWidth || (mergeItem.innerBorder && mergeItem.innerBorder.borderWidth)) {
            let newLeft = mergeItem.x;
            let newTop = mergeItem.y;
            let newWidth = mergeItem.width;
            let newHeight = mergeItem.height;
            let newBorderRadius = mergeItem.borderRadius;
            if (newBorderRadius) {
              newBorderRadius += 2;//u_edgeSoftness
            }
            if (newBorderRadius && !mergeItem.borderWidth && mergeItem.innerBorder && mergeItem.innerBorder.borderWidth) {
              const uEdgeSoftnessNoise = 2;
              newWidth -= uEdgeSoftnessNoise;
              newHeight -= uEdgeSoftnessNoise;
              newLeft += uEdgeSoftnessNoise / 2;
              newTop += uEdgeSoftnessNoise / 2;
              newBorderRadius -= uEdgeSoftnessNoise;
            }
            let borderSoftnessBoundary = 0;
            if (mergeItem.borderWidth) {
              if (mergeItem.borderSoftness) {
                borderSoftnessBoundary = (mergeItem.borderSoftness / 2);
                newWidth -= borderSoftnessBoundary;
                newHeight -= borderSoftnessBoundary;
                newLeft += borderSoftnessBoundary / 2;
                newTop += borderSoftnessBoundary / 2;
              }
              newLeft += mergeItem.borderWidth;
              newTop += mergeItem.borderWidth;
              newWidth -= mergeItem.borderWidth * 2;
              newHeight -= mergeItem.borderWidth * 2;
              if (newBorderRadius) {
                newBorderRadius -= mergeItem.borderWidth;
              }
            }
            this.gl.uniform2fv(this.shaders.kinds.video.uniforms.rect_u_size, [newWidth, newHeight]);
            this.gl.uniform2fv(this.shaders.kinds.video.uniforms.rect_u_location, [newLeft, newTop]);
            this.gl.uniform1f(this.shaders.kinds.video.uniforms.rect_u_borderWidth, 0);
            this.gl.uniform1f(this.shaders.kinds.video.uniforms.rect_u_borderSoftness, 0);
            this.gl.uniform4fv(this.shaders.kinds.video.uniforms.rect_u_borderColor, [0.0, 0.0, 0.0, 0.0]);
            this.gl.uniform4fv(this.shaders.kinds.video.uniforms.rect_u_borderRadius, [newBorderRadius, newBorderRadius, newBorderRadius, newBorderRadius]);
          } else {
            this.gl.uniform2fv(this.shaders.kinds.video.uniforms.rect_u_size, [mergeItem.width, mergeItem.height]);
            this.gl.uniform2fv(this.shaders.kinds.video.uniforms.rect_u_location, [mergeItem.x, mergeItem.y]);
            this.gl.uniform1f(this.shaders.kinds.video.uniforms.rect_u_borderWidth, 0);
            this.gl.uniform1f(this.shaders.kinds.video.uniforms.rect_u_borderSoftness, mergeItem.borderSoftness);
            this.gl.uniform4fv(this.shaders.kinds.video.uniforms.rect_u_borderColor, [0.0, 0.0, 0.0, 0.0]);
            this.gl.uniform4fv(this.shaders.kinds.video.uniforms.rect_u_borderRadius, [mergeItem.borderRadius, mergeItem.borderRadius, mergeItem.borderRadius, mergeItem.borderRadius]);
          }

          // Apply overflow hidden using scissor to prevent scaling outside the specified width and height, 
          // when the image is scale to cover:
          //this.gl.enable(this.gl.SCISSOR_TEST);
          //this.gl.scissor(mergeItem.x, canvas.height - mergeItem.y - mergeItem.height, mergeItem.width, mergeItem.height);
          // Draw the video quad:
          this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
          //this.gl.disable(this.gl.SCISSOR_TEST);

        }


        if (mergeItem.isReconnecting && !mergeItem._mitem_state.Reconnecting_ImageRenderer) {
          this._initVideoReconnecting(mergeItem);
        }

        if (!mergeItem.cameraDisabled && mergeItem.isReconnecting && mergeItem._mitem_state.Reconnecting_ImageRenderer) {
          mergeItem._mitem_state.Reconnecting_ImageRenderer.render();
        }

        if (mergeItem.audioDisabled) {
          if (mergeItem._mitem_state.DisplayName_WithMutedMic_TextRenderer) {
            //Render video display name with muted mic icon.
            mergeItem._mitem_state.DisplayName_WithMutedMic_TextRenderer.render();
          }
        } else {
          if (mergeItem._mitem_state.DisplayName_TextRenderer) {
            //Render video display name.
            mergeItem._mitem_state.DisplayName_TextRenderer.render();
          }
        }

        if (mergeItem.isWaiting || mergeItem.isReconnecting) {
          this.waiting_animation_ImageRenderer.update({
            width: mergeItem.waitingDimension.width,
            height: mergeItem.waitingDimension.height,
            x: mergeItem.waitingDimension.x,
            y: mergeItem.waitingDimension.y,
          });
          this.waiting_animation_ImageRenderer.render({
            gifGroupName: mergeItem.id,
            gifSessionKey: mergeItem.waitingDimension.sessionKey,
            gifRandomizeInitialization: true
          });
        }

        this._drawVideoBackgroundsAndBorders(mergeItem, true);
      } else if (mergeItem.type === "text") {
        if (mergeItem._mitem_state.TextItemRenderer) {
          mergeItem._mitem_state.TextItemRenderer.render();
        }
      }
    }
  }
  _drawVideoBackgroundsAndBorders(videoInfo, isInner) {
    if (isInner) {
      if (!videoInfo.innerBorder || !videoInfo.innerBorder.borderWidth || !videoInfo.innerBorder.borderColor) return;
      this.drawRectBackgroundsAndBorders({
        width: videoInfo.width, height: videoInfo.height, x: videoInfo.x, y: videoInfo.y,
        parentBorderWidth: videoInfo.borderWidth,
        borderWidth: videoInfo.innerBorder.borderWidth,
        borderColor: videoInfo.innerBorder.borderColor,
        backgroundColor: [0.0, 0.0, 0.0, 0.0],
        borderRadius: videoInfo.borderRadius,
        borderSoftness: videoInfo.borderSoftness
      }, true);
    } else {
      this.drawRectBackgroundsAndBorders({
        width: videoInfo.width, height: videoInfo.height, x: videoInfo.x, y: videoInfo.y,
        borderWidth: videoInfo.borderWidth,
        borderColor: videoInfo.borderColor,
        backgroundColor: videoInfo.backgroundColor,
        borderRadius: videoInfo.borderRadius,
        borderSoftness: videoInfo.borderSoftness
      }, false);
    }
  }


  drawRectBackgroundsAndBorders({
    width, height, x, y, parentBorderWidth, borderWidth, borderColor, backgroundColor, borderRadius, borderSoftness
  }, isInner) {

    if (isInner) {
      let newLeft = x;
      let newTop = y;
      let newWidth = width;
      let newHeight = height;
      let newBorderRadius = borderRadius;


      let borderSoftnessBoundary = 0;
      if (parentBorderWidth) {
        if (borderSoftness) {
          borderSoftnessBoundary = (borderSoftness / 2);
          newWidth += borderSoftnessBoundary;
          newHeight += borderSoftnessBoundary;
          newLeft -= borderSoftnessBoundary / 2;
          newTop -= borderSoftnessBoundary / 2;
        }
        newLeft += parentBorderWidth;
        newTop += parentBorderWidth;
        newWidth -= parentBorderWidth * 2;
        newHeight -= parentBorderWidth * 2;
        if (newBorderRadius) {
          newBorderRadius -= parentBorderWidth;
        }
      }

      const rectVertices = createRectVertices(this.canvas, {
        x: newLeft, y: newTop,
        width: newWidth,
        height: newHeight,
        borderWidth: parentBorderWidth
      });

      const rectBuffer = createBuffer(this.gl, rectVertices, this.gl.ARRAY_BUFFER);
      setBufferData(this.gl, this.shaders.kinds.border.attributes.rectVertexPosition, rectBuffer);


      this.gl.useProgram(this.shaders.kinds.border.program);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, rectBuffer);
      this.gl.uniform2fv(this.shaders.kinds.border.uniforms.u_resolution, [this.canvas.width, this.canvas.height]);
      this.gl.uniform2fv(this.shaders.kinds.border.uniforms.rect_u_size, [newWidth, newHeight]);
      this.gl.uniform1f(this.shaders.kinds.border.uniforms.rect_u_borderWidth, borderWidth);
      this.gl.uniform1f(this.shaders.kinds.border.uniforms.rect_u_borderSoftness, borderSoftness);
      this.gl.uniform4fv(this.shaders.kinds.border.uniforms.rect_u_borderRadius, [newBorderRadius, newBorderRadius, newBorderRadius, newBorderRadius]);
      this.gl.uniform4fv(this.shaders.kinds.border.uniforms.rect_u_backgroundColor, [0.0, 0.0, 0.0, 0.0]);
      this.gl.uniform4fv(this.shaders.kinds.border.uniforms.rect_u_borderColor, borderColor);
      this.gl.uniform2fv(this.shaders.kinds.border.uniforms.rect_u_location, [newLeft, newTop]);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, rectVertices.length / 2);
    } else {
      const rectVertices = createRectVertices(this.canvas, {
        x: x, y: y,
        width: width,
        height: height,
        borderWidth: borderWidth
      });

      const rectBuffer = createBuffer(this.gl, rectVertices, this.gl.ARRAY_BUFFER);
      setBufferData(this.gl, this.shaders.kinds.border.attributes.rectVertexPosition, rectBuffer);

      this.gl.useProgram(this.shaders.kinds.border.program);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, rectBuffer);
      this.gl.uniform2fv(this.shaders.kinds.border.uniforms.u_resolution, [this.canvas.width, this.canvas.height]);
      this.gl.uniform2fv(this.shaders.kinds.border.uniforms.rect_u_size, [width, height]);
      this.gl.uniform1f(this.shaders.kinds.border.uniforms.rect_u_borderWidth, borderWidth);
      this.gl.uniform1f(this.shaders.kinds.border.uniforms.rect_u_borderSoftness, borderSoftness);
      this.gl.uniform4fv(this.shaders.kinds.border.uniforms.rect_u_borderRadius, [borderRadius, borderRadius, borderRadius, borderRadius]);
      this.gl.uniform4fv(this.shaders.kinds.border.uniforms.rect_u_backgroundColor, backgroundColor);
      this.gl.uniform4fv(this.shaders.kinds.border.uniforms.rect_u_borderColor, borderColor);
      this.gl.uniform2fv(this.shaders.kinds.border.uniforms.rect_u_location, [x, y]);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, rectVertices.length / 2);
    }
  }

  loadTextureAsset({ cacheID, URL }, callBack/*(texture, err)*/) {
    if (cacheID || cacheID === 0) {
      for (const fetching of this._cachedTextures.fetchingCaches) {
        if (fetching.cacheID === cacheID) {
          fetching.awaitings.push({ cacheID, URL, callBack });
          return;
        }
      }
    }

    if (cacheID || cacheID === 0) {
      for (const cached of this._cachedTextures.caches) {
        if (cached.cacheID !== cacheID) continue;
        const textureObject = this.newTextureObject({
          cacheID, linkedID: this.generateIncreamentID(), texture: cached.texture.texture, type: cached.texture.type, image: cached.texture.image
        });
        callBack(textureObject);
        return;
      }
    }

    this._cachedTextures.fetchingCaches.push({
      cacheID,
      awaitings: []
    });
    const callAwaitingCallBacks = (newCached, texture, err) => {
      for (const fIndex in this._cachedTextures.fetchingCaches) {
        const fetching = this._cachedTextures.fetchingCaches[fIndex];
        if (fetching.cacheID !== cacheID) continue;
        for (const cbObj of fetching.awaitings) {
          if (err) {
            cbObj.callBack(null, err);
          } else {
            const textureObject = this.newTextureObject({
              cacheID, linkedID: this.generateIncreamentID(), texture: texture.texture, type: texture.type, image: texture.image
            });
            newCached.linkedIDs[textureObject.linkedID] = {};
            cbObj.callBack(textureObject);
          }
        }
        deleteIndex(this._cachedTextures.fetchingCaches, fIndex);
        break;
      }
    };
    const image = new Image();
    image.onload = () => {
      const texture = { type: "image", image, texture: createTexture(this.gl) };
      if (cacheID || cacheID === 0) {
        const newCached = {
          cacheID,
          linkedIDs: {},
          texture
        }
        const textureObject = this.newTextureObject({
          cacheID, linkedID: this.generateIncreamentID(), texture: texture.texture, type: texture.type, image: texture.image
        });
        newCached.linkedIDs[textureObject.linkedID] = {};
        callBack(textureObject);
        callAwaitingCallBacks(newCached, texture);
        this._cachedTextures.caches.push(newCached);
      } else {
        const textureObject = this.newTextureObject({
          texture: texture.texture, type: texture.type, image: texture.image
        });
        callBack(textureObject);
      }
    }
    image.onerror = (err) => {
      callBack(null, err);
      callAwaitingCallBacks(null, null, err);
    }
    image.src = URL;
  }
  unlinkTextureCache(texture) {
    if (!texture) return;
    if (!texture.cacheID && texture.cacheID !== 0) return;
    for (const index in this._cachedTextures.caches) {
      const cached = this._cachedTextures.caches[index];
      if (cached.cacheID !== texture.cacheID) continue;
      if (!cached.linkedIDs.hasOwnProperty(texture.linkedID)) return;
      delete cached.linkedIDs[texture.linkedID];
      if (Object.keys(cached.linkedIDs).length) return;
      //Remove the texture cache if not linked by others anymore.
      deleteIndex(this._cachedTextures.caches, index);
      break;
    }

  }
  newTextureObject({
    cacheID, linkedID, texture, type, image
  }) {
    return new TextureObject({
      cacheID, linkedID, texture, type, image
    });
  }
  console() {
    const debug = this.debug;
    return {
      throwError(err) {
        throw new Error(err);
      },
      log(...args) {
        if (debug) {
          return console.log.apply(this, args);
        }
      },
      warn(...args) {
        if (debug) {
          return console.warn.apply(this, args);
        }
      },
      error(...args) {
        if (debug) {
          return console.error.apply(this, args);
        }
      },
    }
  }

  static createImageShaderProgram(gl) {
    // Vertex shader for drawing image:
    const vertexShaderSource = `
    attribute vec2 aVertexPosition;
    attribute vec2 aUv;
    varying vec2 vUv;
    uniform vec4 uScale;

    void main () {
      vUv = aUv;
      gl_Position = vec4(aVertexPosition, 0, 1) * uScale;
    }
  `;
    // Fragment shader for drawing image:
    const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vUv;

    uniform vec2 u_resolution;
    uniform vec2 rect_u_location;
    uniform vec2 rect_u_size;
    uniform vec4 rect_u_borderRadius;
    uniform vec4 rect_u_borderColor;
    uniform float rect_u_borderWidth;
    uniform float rect_u_borderSoftness;

    void roundedRectBorderEntryPoint(out vec4 fragColor, in vec2 fragCoord, vec2 u_resolution, vec2 u_location, vec2 u_rectSize, float u_borderWidth, vec4 u_colorRect, vec4 u_colorBorder, vec4 u_borderRadius, float u_borderSoftness);
    void main () {
      
      vec4 imgColor = texture2D(uSampler, vUv);
      vec2 fragCoord = gl_FragCoord.xy;

      roundedRectBorderEntryPoint(gl_FragColor, fragCoord, u_resolution, rect_u_location, rect_u_size, rect_u_borderWidth, imgColor, rect_u_borderColor, rect_u_borderRadius, rect_u_borderSoftness);
    }
    ${RoundedRectBorderEntryPointSource}
  `;
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);
    return shaderProgram;
  }
  static createBorderShaderProgram(gl) {
    // Vertex shader for drawing backgrounds/borders:
    const vertexShaderSource = `
      attribute vec2 rectVertexPosition;
      varying vec2 rectVertexPositionVarying;
      uniform vec4 uScale;
      void main() {
        rectVertexPositionVarying = rectVertexPosition; 
        gl_Position = vec4(rectVertexPosition, 0, 1) * uScale;
      }
    `;
    // Fragment shader for drawing backgrounds/borders (solid color):
    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform vec2 rect_u_location;
      uniform vec2 rect_u_size;
      uniform vec4 rect_u_borderRadius;
      uniform vec4 rect_u_backgroundColor;
      uniform vec4 rect_u_borderColor;
      uniform float rect_u_borderWidth;
      uniform float rect_u_borderSoftness;
      varying vec2 rectVertexPositionVarying;
      
      void roundedRectBorderEntryPoint(out vec4 fragColor, in vec2 fragCoord, vec2 u_resolution, vec2 u_location, vec2 u_rectSize, float u_borderWidth, vec4 u_colorRect, vec4 u_colorBorder, vec4 u_borderRadius, float u_borderSoftness);
      void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        roundedRectBorderEntryPoint(gl_FragColor, fragCoord, u_resolution, rect_u_location, rect_u_size, rect_u_borderWidth, rect_u_backgroundColor, rect_u_borderColor, rect_u_borderRadius, rect_u_borderSoftness);
      }
      
      ${RoundedRectBorderEntryPointSource}
    `;
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);
    return shaderProgram;
  }

  _compareObjectsProperties(obj1, obj2, matches) {
    if (obj1 === obj2) return true;
    if (!obj1 || !obj2) return false;
    const doCompareObjectsProperties = (item1, item2, key1, key2, isRoot) => {
      if (item1 === item2) return true;
      if (!item1 || !item2) return false;

      if (isRoot && (!vcVideosRendererCore.valIsObject(item1) || !vcVideosRendererCore.valIsObject(item2))) return false;

      if (vcVideosRendererCore.valIsObject(item1) && vcVideosRendererCore.valIsObject(item2)) {
        if (item1[key1] === item2[key2]) {
          return true;
        } else {
          if (vcVideosRendererCore.valIsObject(item1[key1]) && vcVideosRendererCore.valIsObject(item2[key2])) {
            return doCheckObjectsTree(item1[key1], item2[key2]);
          } else
            if (vcVideosRendererCore.valIsArray(item1[key1]) && vcVideosRendererCore.valIsArray(item2[key2])) {
              return doCompareObjectsProperties(item1[key1], item2[key2], null, null);
            } else {
              return false;
            }
        }
      } else if (vcVideosRendererCore.valIsArray(item1) && vcVideosRendererCore.valIsArray(item2)) {
        if (item1.length !== item2.length) {
          return false;
        }
        for (const i in item1) {
          if (item1[i] === item2[i]) {
            continue;
          } else if (vcVideosRendererCore.valIsArray(item1[i]) && vcVideosRendererCore.valIsArray(item2[i])) {
            if (!doCompareObjectsProperties(item1[i], item2[i], null, null)) return false;
          } else if (vcVideosRendererCore.valIsObject(item1[i]) && vcVideosRendererCore.valIsObject(item2[i])) {
            if (!doCheckObjectsTree(item1[i], item2[i])) return false;
          } else {
            return false;
          }
        }
        return true;
      } else if (item1 === item2) {
        return true;
      }
      return false;
    }
    const doCheckObjectsTree = (item1, item2) => {
      if (item1 === item2) return true;
      if (!item1 || !item2) return false;
      if (!vcVideosRendererCore.valIsObject(item1) || !vcVideosRendererCore.valIsObject(item2)) return false;
      const keys = [...new Set([...Object.keys(item1), ...Object.keys(item2)])];

      for (const key of keys) {
        if (!doCompareObjectsProperties(item1, item2, key, key)) return false;
      }
      return true;
    }

    for (const match of matches) {
      if (match.sameKeys) {
        for (const key of match.sameKeys) {
          if (!doCompareObjectsProperties(obj1, obj2, key, key, true)) {
            return false;
          }
        }
      } else if (match.key1 && match.key2) {
        if (!doCompareObjectsProperties(obj1, obj2, match.key1, match.key2, true)) {
          return false;
        }
      }
    }
    return true;
  }
  static valIsObject(val) {
    if (val && val instanceof Object && val.constructor.name === "Object") return true;
    return false;
  }
  static valIsArray(val) {
    if (val && Array.isArray(val)) return true;
    return false;
  }
  _destroy() {
    this._resetFrame([]);
    this._stopDrawing();
    if (this.MediaAudio) {
      this.MediaAudio.audioContext.close();
    }
    this.destroyed = true;
    this.Event.fire('destroy');
  }
}
class TextureObject {
  constructor({
    cacheID, linkedID, texture, type, image
  }) {
    this.cacheID = cacheID;
    this.linkedID = linkedID;
    this.texture = texture;
    this.type = type;
    this.image = image;
  }
}

//_extensions hold vcVideosRenderer extensions,
//and notto be set or get directly from _extensions, 
//except by Extension and GetExtension.
vcVideosRendererCore.prototype._extensions = {}
vcVideosRendererCore.prototype.GetExtension = function (extensionName) {
  const extension = vcVideosRendererCore.prototype._extensions[extensionName];
  if (!extension) {
    throw new VCVRDError(`No extension with name "${extensionName}" found!`, { code: no_such_extension_found });
  }
  const self = this;
  return {
    New: function () {
      return extension.call(self, [...arguments])
    }
  };
}

vcVideosRendererCore.prototype.Logs = {
  VCVRDEnum: VCVRDEnum,
  VCVRDError: VCVRDError
}
export default vcVideosRendererCore;