## ONNX Runtime Web Evaluation

Decision: keep `onnxruntime-web` as the preferred browser runtime path for future custom multi-pitch models, but only behind an experimental provider flag. Do not promote it to the default live detection backend yet.

Why:
- The official web docs support both `wasm` and `webgpu` execution providers in browsers.
- `wasm` is broadly supported and gives the safest compatibility baseline.
- `webgpu` can provide better performance, but the official docs still classify it as experimental.
- The npm package is heavy (`onnxruntime-web` currently publishes a large browser package), so it must stay lazy-loaded.
- The upstream issue tracker still shows active WebGPU stability/operator/performance issues, which is a poor fit for a default real-time music verification path today.

What it is good for in this app:
- future experimental custom multi-pitch models
- side-by-side quality experiments against the current `spectrum` and `Essentia` providers
- optional high-end browser path where `WebGPU` is available and verified

What it is not good for yet:
- a universal default provider across all browsers/devices
- a zero-risk replacement for the current browser-safe `spectrum` baseline
- an implementation to ship without telemetry, fallback, and model-size budgeting

Implementation guidance:
- keep the current provider interface and add `onnx_experimental` only as a lazy optional adapter
- always support `wasm` fallback; use `webgpu` only when explicitly available and healthy
- require model/operator validation before runtime integration
- measure cold-start cost, steady-state latency, memory use, and fallback frequency before enabling outside experimental settings

Sources:
- https://onnxruntime.ai/docs/get-started/with-javascript/web.html
- https://onnxruntime.ai/docs/tutorials/web/
- https://www.npmjs.com/package/onnxruntime-web
- https://github.com/microsoft/onnxruntime/issues/15796
- https://github.com/microsoft/onnxruntime/issues/24442
- https://github.com/microsoft/onnxruntime/issues/24475
- https://github.com/microsoft/onnxruntime/issues/22176
