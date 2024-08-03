import CustomAnimationFrameRunner from "./CustomAnimationFrameRunner";
export default class CaptureMediaStreamFromMediaElement extends MediaStream {
    #_weakMaps = null;
    #_mediaElement = null;
    #_fps = 30;
    #_directMediaStream = null;
    #_takeKindsOnly = ["video", "audio"];
    constructor(mediaElement, takeKindsOnly) {
        super();
        if (!window._vcvrdr_CMSFME_WeakMaps) {
            window._vcvrdr_CMSFME_WeakMaps = {
                video: new WeakMap(),
                audio: new WeakMap()
            };
        }
        this.#_weakMaps = window._vcvrdr_CMSFME_WeakMaps;
        this.#_mediaElement = mediaElement;
        if (Array.isArray(takeKindsOnly)) {
            this.#_takeKindsOnly = takeKindsOnly;
        }
        this.#_captureMediaStream();
    }
    #_captureMediaStream() {
        const putTrackToOutput = (track) => {
            if (!this.#_takeKindsOnly.includes(track.kind)) return;
            super.addTrack(track);
        };
        if ('captureStream' in this.#_mediaElement) {
            this.#_directMediaStream = this.#_mediaElement.captureStream();
            this.#_directMediaStream.getTracks().forEach(track => putTrackToOutput(track));
            return;
        }
        //For cross-browser that have no support for HTMLMediaElement captureStream.
        if (this.#_takeKindsOnly.includes("video")) {
            let MediaVideo = this.#_weakMaps.video.get(this.#_mediaElement);
            if (!MediaVideo) {
                MediaVideo = {
                    canvasCtx: document.createElement('canvas').getContext('2d'),
                    references: [],
                    destroyed: false,
                    isDrawing: false,
                    _unlinkRef: null,
                    _destroy: null,
                    MediaStreamTrackVideo: null,
                    GetClonedVideoTrack: null,
                    AnimationFrameRunner: new CustomAnimationFrameRunner(),
                    ref: {
                        _canplay: null,
                        _do_render: null,
                        _startDrawing: null,
                        _pauseDrawing: null
                    }
                }

                MediaVideo.MediaStreamTrackVideo = MediaVideo.canvasCtx.canvas.captureStream().getVideoTracks()[0];


                MediaVideo._do_render = () => {
                    if (MediaVideo.destroyed) {
                        throw "The Video MediaStreamTrack has already been destroyed!";
                    }

                    MediaVideo.canvasCtx.canvas.width = this.#_mediaElement.videoWidth;
                    MediaVideo.canvasCtx.canvas.height = this.#_mediaElement.videoHeight;

                    MediaVideo.canvasCtx.drawImage(this.#_mediaElement, 0, 0, MediaVideo.canvasCtx.canvas.width, MediaVideo.canvasCtx.canvas.height);
                }
                MediaVideo._startDrawing = () => {
                    if (MediaVideo.destroyed) {
                        throw "The Video MediaStreamTrack has already been destroyed!";
                    }
                    if (MediaVideo.isDrawing) return;
                    MediaVideo.isDrawing = true;
                    MediaVideo.AnimationFrameRunner.start(()=>MediaVideo._do_render(), this.#_fps);
                }
                MediaVideo._stopDrawing = () => {
                    MediaVideo.AnimationFrameRunner.stop();
                    MediaVideo.isDrawing = false;
                }
                MediaVideo._canplay = () => {
                    if (!MediaVideo.isDrawing) {
                        //Update the frame if there's some changes, when paused.
                        MediaVideo._do_render();
                    }
                }
                if (!this.#_mediaElement.paused) {
                    MediaVideo._startDrawing();
                }
                this.#_mediaElement.addEventListener('canplay', MediaVideo._canplay);
                this.#_mediaElement.addEventListener('pause', MediaVideo._pauseDrawing);
                this.#_mediaElement.addEventListener('ended', MediaVideo._pauseDrawing);
                this.#_mediaElement.addEventListener('play', MediaVideo._startDrawing);

                if (this.#_mediaElement.readyState >= 1) {
                    MediaVideo._canplay();
                }

                MediaVideo._destroy = () => {
                    if (MediaVideo.destroyed) return;
                    this.#_mediaElement.removeEventListener('canplay', MediaVideo._canplay);
                    this.#_mediaElement.removeEventListener('pause', MediaVideo._pauseDrawing);
                    this.#_mediaElement.removeEventListener('ended', MediaVideo._pauseDrawing);
                    this.#_mediaElement.removeEventListener('play', MediaVideo._startDrawing);
                    MediaVideo._stopDrawing();
                    MediaVideo.destroyed = true;
                    this.#_weakMaps.video.delete(this.#_mediaElement);
                }

                this.#_weakMaps.video.set(this.#_mediaElement, MediaVideo);
            }

            MediaVideo._unlinkRef = (refID) => {
                for (const index in MediaVideo.references) {
                    const lpRefID = MediaVideo.references[index];
                    if (lpRefID !== refID) continue;
                    CaptureMediaStreamFromMediaElement.#deleteArrayItemIndex(MediaVideo.references, index);
                    break;
                }
                if (!MediaVideo.references.length) {
                    //We can destroy the renderer since no more references.
                    MediaVideo._destroy();
                }
            }

            MediaVideo.getClonedVideoTrack = () => {
                if (MediaVideo.destroyed) {
                    throw "The Video MediaStreamTrack has already been destroyed!";
                }
                if (!window._CMSFME_vidmst_increment_id) {
                    window._CMSFME_vidmst_increment_id = 0;
                }
                const refID = "id-" + (window._CMSFME_vidmst_increment_id++);
                MediaVideo.references.push(refID);
                const clonedVideoMediaStreamTrack = MediaVideo.MediaStreamTrackVideo.clone();
                clonedVideoMediaStreamTrack.addEventListener("ended", () => {
                    MediaVideo._unlinkRef(refID);
                });
                return clonedVideoMediaStreamTrack;
            }

            if (MediaVideo) {
                const clonedVideoTrack = MediaVideo.getClonedVideoTrack();
                putTrackToOutput(clonedVideoTrack);
            }
        }

        if (this.#_takeKindsOnly.includes("audio")) {
            let MediaAudio = this.#_weakMaps.audio.get(this.#_mediaElement);
            if (!MediaAudio) {
                MediaAudio = {
                    audioContext: new AudioContext(),
                    audioGain: null,
                    sourceNode: null,
                    destination: null,
                    MediaStreamTrackAudio: null,
                    processedAudioElement: null
                }

                MediaAudio.destination = MediaAudio.audioContext.createMediaStreamDestination();
                MediaAudio.audioGain = MediaAudio.audioContext.createGain();
                MediaAudio.audioGain.connect(MediaAudio.destination);

                MediaAudio.sourceNode = MediaAudio.audioContext.createMediaElementSource(this.#_mediaElement);
                MediaAudio.sourceNode.connect(MediaAudio.audioGain);
                MediaAudio.audioContext.resume();
                const audioTracks = MediaAudio.destination.stream.getAudioTracks();
                MediaAudio.MediaStreamTrackAudio = audioTracks[0];

                //We have to connect it back to a separate player since we already disconnect the audio from its original destination.
                MediaAudio.processedAudioElement = new Audio();
                MediaAudio.processedAudioElement.srcObject = new MediaStream(audioTracks);
                MediaAudio.processedAudioElement.play();

                this.#_weakMaps.audio.set(this.#_mediaElement, MediaAudio);
            }
            if (MediaAudio) {
                const clonedAudioTrack = MediaAudio.MediaStreamTrackAudio.clone();
                putTrackToOutput(clonedAudioTrack);
            }
        }
    }
    stop() {
        super.getTracks().forEach(track => {
            track.stop();
            track.dispatchEvent(new Event("ended"));
        });
        if (this.#_directMediaStream) {
            this.#_directMediaStream.getTracks().forEach(track => track.stop());
        }
    }
    static #deleteArrayItemIndex(array, index) {
        index = Number(index);
        if (!array.length || array.length < index + 1) return;
        array.splice(index, 1);
    }
}