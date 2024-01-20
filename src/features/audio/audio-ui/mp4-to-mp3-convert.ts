declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
/**
 * Convert MP4 to MP3
 * @param videoFileData mp4 file
 * @returns
 * https://github.com/suvro404/video-to-audio/blob/main/index.js
 */
export const convertMp4ToMp3 = (videoFileData: File) => {
  try {
    const targetAudioFormat = "mp3";
    let reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = function (event) {
        let contentType = "audio/" + targetAudioFormat;
        let audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        let myBuffer;
        const sampleRate = 16000;
        const numberOfChannels = 1;
        let videoFileAsBuffer = reader.result;
        if (
          videoFileAsBuffer === null ||
          typeof videoFileAsBuffer === "string"
        ) {
          resolve(null);
          return;
        }
        audioContext
          .decodeAudioData(videoFileAsBuffer)
          .then(function (decodedAudioData) {
            let duration = decodedAudioData.duration;
            let offlineAudioContext = new OfflineAudioContext(
              numberOfChannels,
              sampleRate * duration,
              sampleRate
            );
            let soundSource = offlineAudioContext.createBufferSource();
            myBuffer = decodedAudioData;
            soundSource.buffer = myBuffer;
            soundSource.connect(offlineAudioContext.destination);
            soundSource.start();
            offlineAudioContext
              .startRendering()
              .then(function (renderedBuffer) {
                let UintWave = createWaveFileData(renderedBuffer);
                let b64Data = btoa(uint8ToString(UintWave));
                console.log("DEBUG6");
                let blob = getBlobFromBase64Data(b64Data, contentType);
                console.log("DEBUG7");
                let blobUrl = URL.createObjectURL(blob);
                console.log("DEBUG8");

                let convertedAudio = {
                  name: videoFileData.name.substring(
                    0,
                    videoFileData.name.lastIndexOf(".")
                  ),
                  format: targetAudioFormat,
                  data: blobUrl,
                  blob: blob,
                };
                resolve(convertedAudio);
              })
              .catch(function (err) {
                console.log("Rendering failed: " + err);
              });
          });
      };
      reader.readAsArrayBuffer(videoFileData);
    });
  } catch (e) {
    console.log("Error occurred while converting : ", e);
  }
};

const getBlobFromBase64Data = (
  b64Data: any,
  contentType: any,
  sliceSize = 512
) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
};

const createWaveFileData = (audioBuffer: any) => {
  let frameLength = audioBuffer.length;
  let numberOfChannels = audioBuffer.numberOfChannels;
  let sampleRate = audioBuffer.sampleRate;
  let bitsPerSample = 16;
  let byteRate = (sampleRate * numberOfChannels * bitsPerSample) / 8;
  let blockAlign = (numberOfChannels * bitsPerSample) / 8;
  let wavDataByteLength = frameLength * numberOfChannels * 2;
  let headerByteLength = 44;
  let totalLength = headerByteLength + wavDataByteLength;

  let waveFileData = new Uint8Array(totalLength);

  let subChunk1Size = 16;
  let subChunk2Size = wavDataByteLength;
  let chunkSize = 4 + (8 + subChunk1Size) + (8 + subChunk2Size);

  writeString("RIFF", waveFileData, 0);
  writeInt32(chunkSize, waveFileData, 4);
  writeString("WAVE", waveFileData, 8);
  writeString("fmt ", waveFileData, 12);

  writeInt32(subChunk1Size, waveFileData, 16);
  writeInt16(1, waveFileData, 20);
  writeInt16(numberOfChannels, waveFileData, 22);
  writeInt32(sampleRate, waveFileData, 24);
  writeInt32(byteRate, waveFileData, 28);
  writeInt16(blockAlign, waveFileData, 32);
  writeInt32(bitsPerSample, waveFileData, 34);

  writeString("data", waveFileData, 36);
  writeInt32(subChunk2Size, waveFileData, 40);

  writeAudioBuffer(audioBuffer, waveFileData, 44);

  return waveFileData;
};

const writeString = (str: string, array: Uint8Array, offset: number) => {
  array.set(new TextEncoder().encode(str), offset);
};

const writeInt16 = (num: number, array: Uint8Array, offset: number) => {
  num = Math.floor(num);
  array[offset + 0] = num & 255;
  array[offset + 1] = (num >> 8) & 255;
};

const writeInt32 = (num: number, array: Uint8Array, offset: number) => {
  num = Math.floor(num);
  array[offset + 0] = num & 255;
  array[offset + 1] = (num >> 8) & 255;
  array[offset + 2] = (num >> 16) & 255;
  array[offset + 3] = (num >> 24) & 255;
};

const writeAudioBuffer = (
  audioBuffer: any,
  array: Uint8Array,
  offset: number
) => {
  let num = audioBuffer.length;
  let channels = audioBuffer.numberOfChannels;

  for (let i = 0; i < num; ++i) {
    for (let k = 0; k < channels; ++k) {
      let buffer = audioBuffer.getChannelData(k);
      let sample = buffer[i] * 32768.0;

      if (sample < -32768) sample = -32768;
      if (sample > 32767) sample = 32767;

      writeInt16(sample, array, offset);
      offset += 2;
    }
  }
};

const uint8ToString = (buf: Uint8Array) =>
  buf.reduce((a, b) => a + String.fromCharCode(b), "");
