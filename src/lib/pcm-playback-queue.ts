export type PcmPlaybackQueue = {
  enqueue: (pcm: Int16Array) => void;
  clear: () => void;
  close: () => void;
  isPlaying: () => boolean;
  onIdle: (cb: () => void) => void;
  // 0..1 — how far through the currently queued audio we are. Resets
  // whenever the queue is fully idle (nothing queued to play).
  playedFraction: () => number;
  // seconds of audio queued since the last idle point.
  totalQueuedSec: () => number;
  // seconds of audio already played since the last idle point.
  playedSec: () => number;
};

export function createPcmPlaybackQueue(sampleRate = 24000): PcmPlaybackQueue {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate });
  let nextStartAt = 0;
  let segmentStartAt = 0; // ctx.currentTime when current audio segment began
  let totalQueued = 0; // seconds enqueued in the current segment
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

  function resetSegmentIfIdle() {
    if (nextStartAt <= ctx.currentTime) {
      segmentStartAt = 0;
      totalQueued = 0;
      nextStartAt = ctx.currentTime;
    }
  }

  return {
    enqueue(pcm) {
      if (pcm.length === 0) return;
      // If the queue has drained, start a new segment at the current clock.
      if (nextStartAt <= ctx.currentTime) {
        segmentStartAt = ctx.currentTime;
        totalQueued = 0;
        nextStartAt = ctx.currentTime;
      }

      const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
      const ch = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const startAt = Math.max(nextStartAt, ctx.currentTime);
      source.start(startAt);
      nextStartAt = startAt + buffer.duration;
      totalQueued += buffer.duration;
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
      resetSegmentIfIdle();
      segmentStartAt = 0;
      totalQueued = 0;
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
    playedFraction() {
      if (totalQueued <= 0) return 0;
      const elapsed = Math.max(0, ctx.currentTime - segmentStartAt);
      return Math.min(1, elapsed / totalQueued);
    },
    totalQueuedSec() {
      return totalQueued;
    },
    playedSec() {
      if (segmentStartAt <= 0) return 0;
      return Math.max(0, Math.min(totalQueued, ctx.currentTime - segmentStartAt));
    },
  };
}
