export type PcmPlaybackQueue = {
  enqueue: (pcm: Int16Array) => void;
  clear: () => void;
  close: () => void;
  isPlaying: () => boolean;
  onIdle: (cb: () => void) => void;
};

export function createPcmPlaybackQueue(sampleRate = 24000): PcmPlaybackQueue {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate });
  let nextStartAt = 0;
  let activeSources: AudioBufferSourceNode[] = [];
  let idleCb: (() => void) | null = null;

  function stopAll() {
    activeSources.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    activeSources = [];
  }

  return {
    enqueue(pcm) {
      if (pcm.length === 0) return;
      const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
      const ch = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const startAt = Math.max(nextStartAt, ctx.currentTime);
      source.start(startAt);
      nextStartAt = startAt + buffer.duration;
      activeSources.push(source);
      source.onended = () => {
        activeSources = activeSources.filter((s) => s !== source);
        if (nextStartAt <= ctx.currentTime && idleCb) {
          const cb = idleCb;
          idleCb = null;
          cb();
        }
      };
    },
    clear() {
      stopAll();
      nextStartAt = ctx.currentTime;
    },
    close() {
      stopAll();
      ctx.close().catch(() => {});
    },
    isPlaying() {
      return ctx.currentTime < nextStartAt;
    },
    onIdle(cb) {
      idleCb = cb;
    },
  };
}
