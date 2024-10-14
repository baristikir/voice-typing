/**
 * References:
 * - https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor#processing_audio
 */

/**
 * @typedef ProcessorOptions
 * @property {number} reportSize Report data every time this number of
 * samples are accumulated. Must be >= 128 and recommended to be the
 * multiple of 128 for zero latency.
 */

/**
 * @typedef Options
 * @property {ProcessorOptions} processorOptions
 */

/**
 * @class RecorderProcessor
 * @extends AudioWorkletProcessor
 *
 * A recorder that exposes raw audio data (PCM, f32) via message events.
 */
class RecorderProcessor extends AudioWorkletProcessor {
  /**
   * @param {Options} options
   */
  constructor(options) {
    super();

    this.enable = true;

    const reportSize = options.processorOptions &&
      options.processorOptions.reportSize;
    this.reportSize = (!reportSize || reportSize < 128) ? 128 : reportSize;

    // Only Mono-Channel Support for Whisper Model
    this.recordChannelCount = 1;

    this.buffer = [];
    for (let i = 0; i < this.recordChannelCount; i++) {
      this.buffer[i] = [];
    }

    this.port.onmessage = (e) => {
      if (e.data === "pause") this.enable = false;
      else if (e.data === "resume") this.enable = true;
    };
  }

  process(inputs, outputs) {
    if (!this.enable) {
      this.buffer = this.buffer.map((_) => []);
      return true;
    }

    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length) {
      return true;
    }

    for (
      let channel = 0;
      channel < Math.min(input.length, this.recordChannelCount);
      channel++
    ) {
      let inputChannel;
      try {
        inputChannel = input[channel];
        this.buffer[channel].push(...inputChannel.slice());
      } catch (e) {
        console.error("[ AudioWorkeltProcessor ]: ", e, {
          channel,
          inputs,
          outputs,
          input,
          output,
        });
      }
    }

    if (this.buffer[0].length >= this.reportSize) {
      const recordBuffer = [];
      for (let channel = 0; channel < this.buffer.length; channel++) {
        const floats = this.buffer[channel].slice(0, this.reportSize);
        recordBuffer[channel] = new Float32Array(floats);
        this.buffer[channel].splice(0, this.reportSize);
      }

      this.port.postMessage({ currentFrame, sampleRate, recordBuffer });
    }
    return true;
  }
}
// Doc: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope/registerProcessor
// Register processor via AudioWorkletGlobalScope.registerProcessor
registerProcessor("recorder-processor", RecorderProcessor);
