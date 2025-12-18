// File: UIVoiceAssistant/main.js (ĐÃ VIẾT LẠI HOÀN TOẢNG - LOGIC RÕ RÀNG, ỔN ĐỊNH, KHÔNG LỖI MÀN HÌNH TRẮNG)

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// --- 1. ĐƯỜNG DẪN CHUẨN (KHÔNG SAI DÙ DEV HAY BUILD) ---
const isDev = !app.isPackaged;  // Dev mode: true, Production: false
const projectRoot = isDev ? __dirname : path.dirname(process.execPath);  // Build: exe folder
const venvPythonPath = path.join(projectRoot, 'venv', 'Scripts', 'python.exe');
const bridgeScriptPath = path.join(projectRoot, 'electron_bridge.py');
const sttScriptPath = path.join(projectRoot, 'Backend', 'STT_engine.py');
const ttsScriptPath = path.join(projectRoot, 'Backend', 'TTS_engine.py');

// Biến toàn cục cho processes (dễ quản lý, tránh leak)
let mainWindow = null;
let sttProcess = null;
let ttsProcess = null;

// --- 2. Gửi tin nhắn về React (tất cả windows) ---
function sendToReact(channel, data) {
  mainWindow?.webContents.send(channel, data);
}

// --- 3. Tạo cửa sổ chính ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 800,
    resizable: false,
    frame: false,  // No title bar (nếu UI có TopBar)
    transparent: true,  // Nếu UI có background trong suốt
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')  // Luôn đúng
    }
  });

  // Load UI
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');  // Vite dev server
    mainWindow.webContents.openDevTools({ mode: 'detach' });  // Debug dễ
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));  // Production
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopAllProcesses();  // Dọn dẹp khi đóng app
  });
}

// --- 4. Dọn dẹp processes ---
function stopAllProcesses() {
  [sttProcess, ttsProcess].forEach(p => {
    if (p) {
      p.kill();
      p = null;
    }
  });
  sendToReact('orb-state-change', 'idle');
}

// --- 5. IPC: Nhận lệnh từ React ---
ipcMain.on('run-python-task', (event, task, content = '') => {
  console.log(`[Electron] Lệnh: ${task} | Nội dung: ${content}`);

  // --- A. XỬ LÝ TEXT (BRIDGE) ---
  if (task === 'process_text_no_tts') {
    sendToReact('orb-state-change', 'processing');
    const proc = spawn(venvPythonPath, [bridgeScriptPath, 'process_text_no_tts', content]);

    let output = '';
    proc.stdout.on('data', (data) => output += data.toString());
    proc.stderr.on('data', (data) => console.error(`[Bridge Lỗi]: ${data}`));

    proc.on('close', (code) => {
      if (code !== 0) {
        sendToReact('python-task-result', { type: 'error', result: 'Backend lỗi' });
        sendToReact('orb-state-change', 'idle');
        return;
      }
      try {
        const parsed = JSON.parse(output);
        if (parsed.results) {
          parsed.results.forEach(res => sendToReact('python-task-result', res));
        }
      } catch (e) {
        console.error(`[Parse JSON Lỗi]: ${e}`);
      }
      sendToReact('orb-state-change', 'idle');
    });

  // --- B. TTS (RIÊNG BIỆT) ---
  } else if (task === 'run_tts') {
    if (ttsProcess) ttsProcess.kill();
    sendToReact('orb-state-change', 'speaking');
    ttsProcess = spawn(venvPythonPath, [ttsScriptPath]);
    ttsProcess.stdin.write(content + '\n');  // Gửi text qua stdin
    ttsProcess.stdin.end();

    ttsProcess.on('close', () => {
      sendToReact('orb-state-change', 'idle');
      ttsProcess = null;
    });

  // --- C. STT (BẮT ĐẦU NGHE) ---
  } else if (task === 'start_stt') {
    if (sttProcess) return;
    sendToReact('orb-state-change', 'listening');
    sttProcess = spawn(venvPythonPath, [sttScriptPath]);

    sttProcess.stdout.on('data', (data) => {
      const line = data.toString().trim();
      if (line.includes("🎤 VIST (Hands-Free) đang nghe...")) {
        sendToReact('orb-state-change', 'listening');
      }
      if (line.startsWith('CALLBACK NHẬN ĐƯỢC:')) {
        const text = line.split(':')[1].trim();
        sendToReact('stt-result', text);
      }
    });
    sttProcess.stderr.on('data', (data) => console.error(`[STT Lỗi]: ${data}`));

  // --- D. DỪNG STT ---
  } else if (task === 'stop_stt') {
    if (sttProcess) {
      sttProcess.kill();
      sttProcess = null;
      sendToReact('orb-state-change', 'idle');
    }
  }
});

// --- 6. App lifecycle ---
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

app.on('quit', stopAllProcesses);