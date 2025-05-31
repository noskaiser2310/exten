// background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed and background is active.");
  });
  
  // Hàm đảm bảo Offscreen Document đã được tạo ra
  async function ensureOffscreenDocument() {
    const hasDocument = await chrome.offscreen.hasDocument();
    if (!hasDocument) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DISPLAY_MEDIA'],
        justification: 'Needed for continuous audio capture'
      });
    }
  }
  
  // Lắng nghe thông điệp từ popup và chuyển tiếp đến offscreen document (nếu cần)
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    // Nếu nhận yêu cầu khởi động capture, đảm bảo offscreen tồn tại rồi chuyển tiếp thông điệp
    if (message.action === 'startRecording' || message.action === 'stopRecording') {
      await ensureOffscreenDocument();
      // Chuyển tiếp thông điệp đến Offscreen Document
      chrome.runtime.sendMessage(message);
    }
  });
  