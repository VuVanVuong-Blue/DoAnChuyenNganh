// File: UIVoiceAssistant/preload.js (EXPOSING API AN TOÀN VỚI CONTEXTBRIDGE)

const { contextBridge, ipcRenderer } = require('electron');

// API an toàn expose cho React
contextBridge.exposeInMainWorld('electronAPI', {
  // Gửi lệnh xuống main.js
  runPythonTask: (task, content = '') => ipcRenderer.send('run-python-task', task, content),

  // Lắng nghe từ main.js
  onOrbStateChange: (callback) => ipcRenderer.on('orb-state-change', (event, state) => callback(state)),
  onSttResult: (callback) => ipcRenderer.on('stt-result', (event, text) => callback(text)),
  onPythonResult: (callback) => ipcRenderer.on('python-task-result', (event, result) => callback(result)),

  // Dọn listener khi cần (optional, React useEffect cleanup)
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});