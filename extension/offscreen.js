let audioContext, processor, source;
let audioBufferData = [];
let recording = false;
let segmentInterval;

// Hàm kết hợp các buffer lại thành 1 Float32Array
function combineBuffers(buffers) {
  const length = buffers.reduce((acc, cur) => acc + cur.length, 0);
  const result = new Float32Array(length);
  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    result.set(buffers[i], offset);
    offset += buffers[i].length;
  }
  return result;
}

// Hàm chuyển đổi PCM Float32Array thành file WAV (16-bit mono)
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);
  return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    output.setInt16(offset, s, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function sendAudioBlob(blob) {
  const formData = new FormData();
  const filename = 'audio_' + Date.now() + '.wav';
  formData.append('audioFile', blob, filename);

  fetch("http://localhost:3000/upload", {
    method: "POST",
    body: formData
  })
    .then(response => response.text())
    .then(result => {
      console.log("File saved:", result);
      // (Có thể gửi lại trạng thái đến background hoặc popup nếu cần)
    })
    .catch(error => {
      console.error("Error uploading file:", error);
    });
}

function startAudioCapture() {
  // Kiểm tra tab hiện hành
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let activeTab = tabs[0];
    if (!activeTab || !activeTab.url || !activeTab.url.startsWith("https://meet.google.com/")) {
      console.error("Offscreen capture chỉ hoạt động trên Google Meet.");
      return;
    }
    chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
      if (chrome.runtime.lastError) {
        console.error("Error capturing audio:", chrome.runtime.lastError.message);
        return;
      }
      if (!stream) {
        console.error("No audio stream.");
        return;
      }
      console.log("Offscreen: Audio capture started.");

      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = function (event) {
        const inputData = event.inputBuffer.getChannelData(0);
        audioBufferData.push(new Float32Array(inputData));
      };

      recording = true;
      segmentInterval = setInterval(() => {
        if (recording && audioBufferData.length) {
          const combined = combineBuffers(audioBufferData);
          const wavBlob = encodeWAV(combined, audioContext.sampleRate);
          sendAudioBlob(wavBlob);
          audioBufferData = [];
        }
      }, 5000);
    });
  });
}

function stopAudioCapture() {
  recording = false;
  clearInterval(segmentInterval);
  if (processor) processor.disconnect();
  if (source) source.disconnect();
  if (audioContext) audioContext.close();
  console.log("Offscreen: Audio recording stopped.");
}

// Lắng nghe thông điệp từ background/popup để bắt đầu/dừng ghi âm
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startRecording') {
    startAudioCapture();
  } else if (message.action === 'stopRecording') {
    stopAudioCapture();
  }
});
