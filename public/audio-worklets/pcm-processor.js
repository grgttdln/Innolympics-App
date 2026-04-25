// Captures mono mic audio and downsamples to 16 kHz 16-bit PCM frames.
// Emits each frame as a transferable ArrayBuffer via port.postMessage.
// Gemini Live expects mimeType "audio/pcm;rate=16000".

class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._targetRate = 16000;
    this._ratio = sampleRate / this._targetRate;
    this._frameTargetSamples = Math.floor(this._targetRate * 0.08); // ~80ms frames
    this._accum = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._accum += 1;
      if (this._accum >= this._ratio) {
        this._accum -= this._ratio;
        const sample = Math.max(-1, Math.min(1, channel[i]));
        this._buffer.push(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
      }
    }

    while (this._buffer.length >= this._frameTargetSamples) {
      const frame = this._buffer.splice(0, this._frameTargetSamples);
      const out = new Int16Array(frame.length);
      for (let i = 0; i < frame.length; i++) out[i] = frame[i] | 0;
      this.port.postMessage(out.buffer, [out.buffer]);
    }

    return true;
  }
}

registerProcessor("pcm-processor", PcmProcessor);
