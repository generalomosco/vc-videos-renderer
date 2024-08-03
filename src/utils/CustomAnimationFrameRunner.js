//The reason for this is that will also need to run our renderer from foreground.
export default class CustomAnimationFrameRunner {
    #defaultFPS = 30;
    #runnerWorker = null;
    #renderCB = null;
    constructor() {
        this.#init();
    }
    start(render, fps = this.#defaultFPS) {
        this.#renderCB = render;
        this.#runnerWorker.postMessage({ start: true, fps });
    }
    stop() {
        this.#runnerWorker.postMessage({ start: false });
        this.#renderCB = null;
    }
    #init() {
        const workerScriptHolder = () => {
            let _animating = false;
            let _aniInterval = null;
            let _lastRenderTime = 0;
            const _StartRunner = () => {
                if (_animating) return;
                _animating = true;
                const render = () => {
                    if (!_animating) return;
                    const currentTime = performance.now();
                    const elapsedTime = currentTime - _lastRenderTime;
                    if (elapsedTime >= _aniInterval) {
                        _lastRenderTime = currentTime;
                        // Perform rendering.
                        self.postMessage({ currentTime })
                        // Request the next frame after rendering.
                        requestAnimationFrame(render);
                    } else {
                        // Not enough time has elapsed.
                        requestAnimationFrame(render);
                    }
                }
                render();
            }
            self.onmessage = function ({ data: { start, fps = 30 } }) {
                if (start) {
                    _aniInterval = 1000 / fps;
                    _lastRenderTime = 0;
                    _StartRunner();
                } else {
                    _animating = false;
                }
            };
        };

        let workerScriptStr = workerScriptHolder.toString();
        workerScriptStr = workerScriptStr.substring(workerScriptStr.indexOf("{") + 1, workerScriptStr.lastIndexOf("}"));
        const workerScriptBlob = URL.createObjectURL(new Blob([workerScriptStr], { type: "application/javascript" }));
        this.#runnerWorker = new Worker(workerScriptBlob);

        this.#runnerWorker.onmessage = ({ data: { currentTime } }) => {
            try {
                this.#renderCB(currentTime);
            } catch (er) {
                this.stop();
                throw er;
            }
        };
    }
}