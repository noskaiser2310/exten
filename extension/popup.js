document.getElementById("startBtn").addEventListener("click", async () => {
    // Gửi thông điệp startRecording; background.js sẽ đảm bảo offscreen document tồn tại
    chrome.runtime.sendMessage({ action: 'startRecording' });
  });
  
  document.getElementById("stopBtn").addEventListener("click", async () => {
    chrome.runtime.sendMessage({ action: 'stopRecording' });
  });
  
  // (Nếu cần, bạn có thể lắng nghe thông điệp phản hồi từ offscreen document để cập nhật trạng thái)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.status) {
      document.getElementById("status").textContent = message.status;
    }
  });
  