// File: MessageScreen.tsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Send, Camera, ImageIcon, X } from 'lucide-react';
import { TopBar } from './TopBar';
import { speak } from '../utils/tts';

// 👇 1. IMPORT TỪ CONFIG CHUNG
import { API_BASE } from '../config';

// 👇 2. KHÔNG CẦN IMPORT PLUGIN NATIVE NỮA (Dùng Web API trực tiếp)
import { Capacitor } from '@capacitor/core';

import {
  UserTextBubble,
  AITextStaticBubble,
  AITextStreamingBubble,
  AIImageLoadingBubble,
  AIImageResultBubble,
  UserImageWithTextBubble,
  AIAnalyzingImageBubble,
} from './ChatBubbles';

// ========================
// CẤU HÌNH & KHỞI TẠO
// ========================
const STORAGE_KEY = 'uv_messages_v1';

// ========================
// TYPE
// ========================
type MessageType =
  | { id: string; type: 'user'; content: string; time: string }
  | { id: string; type: 'user-image'; imageUrl: string; content: string; time: string }
  | { id: string; type: 'ai-static'; content: string; time: string }
  | { id: string; type: 'ai-streaming'; content: string; time: string; fullContent?: string }
  | { id: string; type: 'ai-image-loading'; time: string }
  | { id: string; type: 'ai-analyzing-image'; time: string }
  | { id: string; type: 'ai-image'; imageUrl: string; time: string };

interface MessageScreenProps {
  onNavigate?: (screen: string) => void;
  user: { uid: string; displayName?: string; email?: string };
}

export function MessageScreen({ onNavigate, user }: MessageScreenProps) {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: crypto.randomUUID(),
      type: 'ai-static',
      content: `Xin chào ${user?.displayName || "bạn"}! Tôi có thể giúp gì cho bạn hôm nay?`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs cho upload ảnh và camera
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Popup ảnh
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [pendingCapture, setPendingCapture] = useState<'file' | 'screen' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const imageLoadingRef = useRef<string | null>(null);

  // State cho Voice (Web API)
  const [isListening, setIsListening] = useState(false);
  const webRecognition = useRef<any>(null); // Chỉ dùng Web Ref

  // cleanup preview url
  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ========================
  // 1. LOAD HISTORY (GIỮ NGUYÊN)
  // ========================
  useEffect(() => {
    if (!user || !user.uid) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/chat_history?uid=${user.uid}`);
        if (!res.ok) return;

        const data = await res.json();
        const raw = data.history || [];

        const mapped: MessageType[] = [];

        for (const h of raw) {
          const time =
            h.time ||
            h.timestamp ||
            new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

          if (h.type === "text") {
            if (h.role === "user") {
              mapped.push({ id: crypto.randomUUID(), type: "user", content: h.content || "", time });
            } else {
              mapped.push({ id: crypto.randomUUID(), type: "ai-static", content: h.content || "", time });
            }
            continue;
          }

          if (h.type === "ai-image") {
            let imageUrl = "";
            if (h.image_path) {
              const filename = h.image_path.split(/[\\/]/).pop();
              if (filename) imageUrl = `${API_BASE}/data/${filename}`;
            }
            mapped.push({ id: h.id || crypto.randomUUID(), type: "ai-image", imageUrl, time });
            continue;
          }

          if (h.type === "analysis-image" || h.type === "analysis-screen") {
            let imageUrl = "";
            if (h.image_path) {
              const filename = h.image_path.split(/[\\/]/).pop();
              if (filename) imageUrl = `${API_BASE}/data/${filename}`;
            }

            if (imageUrl) {
              mapped.push({
                id: crypto.randomUUID(),
                type: "user-image",
                imageUrl: imageUrl,
                content: h.prompt || "Phân tích ảnh này",
                time: time
              });
            }

            if (h.analysis) {
              mapped.push({
                id: crypto.randomUUID(),
                type: "ai-static",
                content: h.analysis,
                time: time
              });
            }
            continue;
          }
        }
        
        mapped.sort((a, b) => {
          const timeCompare = a.time.localeCompare(b.time);
          if (timeCompare !== 0) return timeCompare;
          const isAUser = a.type.startsWith('user');
          const isBUser = b.type.startsWith('user');
          if (isAUser && !isBUser) return -1;
          if (!isAUser && isBUser) return 1;
          return 0;
        });

        if (mapped.length > 0) {
          setMessages(mapped.slice(-50));
        }
      } catch { }
    })();
  }, [user]);

  // ========================
  // 2. NHẬN DATA TỪ HOME
  // ========================
  useEffect(() => {
    const pendingData = sessionStorage.getItem('pending_transfer');
    if (pendingData) {
      try {
        const { userText, aiText } = JSON.parse(pendingData);
        const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: "2-digit", minute: "2-digit" });

        if (userText) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(), type: 'user', content: userText, time: timeNow
          }]);
        }

        if (aiText) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(), type: 'ai-static', content: aiText, time: timeNow
          }]);
        }
        sessionStorage.removeItem('pending_transfer');
      } catch (e) {
        console.error("Lỗi nhận dữ liệu từ Home:", e);
      }
    }
  }, []);

  const sanitize = (s?: string) =>
    (s || "").replace(/^[\s]*(?:User|Assistant)\s*/u, "").trim();

  const getTime = () =>
    new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  // ========================
  // 3. LOGIC MIC MỚI (DÙNG WEB SPEECH API - GIỐNG HOME)
  // ========================
  const startSTT = () => {
    // 👇 CHIẾN THUẬT: Dùng Web API (Native Browser) thay vì Plugin
    const SpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechAPI) {
      alert("❌ Máy của bạn không hỗ trợ Web Speech API. Hãy cập nhật 'Android System WebView'.");
      return;
    }

    try {
      const recognition = new SpeechAPI();
      recognition.lang = 'vi-VN';
      recognition.continuous = false; 
      recognition.interimResults = false;

      // --- SỰ KIỆN 1: BẮT ĐẦU ---
      recognition.onstart = () => {
        console.log("🎙️ Chat Mic: Đã bật");
        setIsListening(true);
      };

      // --- SỰ KIỆN 2: CÓ KẾT QUẢ ---
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        console.log("✅ Chat Mic nghe được:", text);
        
        // Dừng nghe
        recognition.stop();
        // Điền vào ô input và gửi luôn
        setInputText(text);
        handleSendText(text);
      };

      // --- SỰ KIỆN 3: LỖI ---
      recognition.onerror = (event: any) => {
        console.error("🔴 Chat Mic Lỗi:", event.error);
        if (event.error === 'not-allowed') {
            alert("⚠️ Vui lòng cấp quyền Micro cho trình duyệt/webview!");
        }
        setIsListening(false);
      };

      // --- SỰ KIỆN 4: KẾT THÚC ---
      recognition.onend = () => {
        setIsListening(false);
      };

      webRecognition.current = recognition;
      recognition.start();

    } catch (e) {
      alert("❌ Lỗi Mic: " + JSON.stringify(e));
      setIsListening(false);
    }
  };

  const stopSTT = () => {
    if (webRecognition.current) {
      webRecognition.current.stop();
    }
    setIsListening(false);
  };

  const handleMicPress = () => {
    if (isListening) stopSTT();
    else startSTT();
  };

  // Cleanup Mic khi rời trang
  useEffect(() => {
    return () => {
      if (webRecognition.current) {
        webRecognition.current.stop();
      }
    };
  }, []);

  // ========================
  // 4. SEND TEXT (GIỮ NGUYÊN)
  // ========================
  const handleSendText = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;

    if (!user) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), type: 'ai-static', content: 'Lỗi: Bạn chưa đăng nhập.', time: getTime()
      }]);
      return;
    }

    if (!textToSend.trim() || isProcessing) return;

    const userMsg: MessageType = {
      id: crypto.randomUUID(), type: 'user', content: textToSend, time: getTime()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      const res = await fetch(`${API_BASE}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          uid: user.uid
        })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const r = JSON.parse(line);

            if (r.type === "chat") {
              const cleanText = sanitize(r.content);
              speak(cleanText);
              setMessages(prev => [
                ...prev,
                { id: crypto.randomUUID(), type: "ai-static", content: cleanText, time: getTime() }
              ]);
            }
            else if (r.type === "image-start") {
              const loadingId = crypto.randomUUID();
              imageLoadingRef.current = loadingId;
              setMessages(prev => [
                ...prev,
                { id: loadingId, type: "ai-image-loading", time: getTime() }
              ]);
            }
            else if (r.type === "image") {
              if (imageLoadingRef.current) {
                const loadingId = imageLoadingRef.current;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === loadingId
                      ? { ...m, type: "ai-image", imageUrl: r.content, time: getTime() }
                      : m
                  )
                );
                imageLoadingRef.current = null;
              } else {
                setMessages(prev => [
                  ...prev,
                  { id: crypto.randomUUID(), type: "ai-image", imageUrl: r.content, time: getTime() }
                ]);
              }
            }
            else {
              let content = "";
              if (typeof r.content === 'string') content = r.content;
              else content = JSON.stringify(r.content);

              const textToSpeak = sanitize(content);
              if (textToSpeak) speak(textToSpeak);

              setMessages(prev => [
                ...prev,
                { id: crypto.randomUUID(), type: "ai-static", content: textToSpeak, time: getTime() }
              ]);
            }

          } catch (err) {
            console.error("Lỗi parse JSON stream:", err);
          }
        }
      }

    } catch (e) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), type: 'ai-static', content: 'Lỗi kết nối server', time: getTime() }
      ]);
    }

    setIsProcessing(false);
  };

  // ========================
  // 5. UPLOAD & CAMERA (GIỮ NGUYÊN)
  // ========================
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingCapture("file");
    setPromptText("");
    setShowPromptDialog(true);
    e.target.value = '';
  };

  const handleCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const sendImageWithPrompt = async () => {
    const requestText = promptText.trim() || "Phân tích ảnh này";
    if (!selectedFile && pendingCapture !== "screen") return;

    let fileToSend: File | Blob | null = selectedFile;
    let preview = previewUrl;

    const userMsg: MessageType = {
      id: crypto.randomUUID(),
      type: "user-image",
      imageUrl: preview || "",
      content: requestText,
      time: getTime()
    };

    setMessages(prev => [...prev, userMsg]);
    setShowPromptDialog(false);
    setPromptText("");
    setPendingCapture(null);
    setIsProcessing(true);

    const analyzingMsg: MessageType = {
      id: crypto.randomUUID(),
      type: "ai-analyzing-image",
      time: getTime()
    };
    setMessages(prev => [...prev, analyzingMsg]);

    try {
      const form = new FormData();
      if (fileToSend) {
        form.append("image", fileToSend, (fileToSend as File).name || "image.png");
      }
      form.append("prompt", requestText);
      form.append("uid", user.uid);

      const res = await fetch(`${API_BASE}/api/analyze_image`, {
        method: "POST",
        body: form
      });

      const data = await res.json();
      setMessages(prev => prev.filter(m => m.type !== "ai-analyzing-image"));

      const reply = sanitize(data.description) || "Không có phản hồi";
      speak(reply);

      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), type: "ai-static", content: reply, time: getTime() }
      ]);
    } catch {
      setMessages(prev => prev.filter(m => m.type !== "ai-analyzing-image"));
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), type: "ai-static", content: "Lỗi phân tích ảnh", time: getTime() }
      ]);
    }

    setIsProcessing(false);
    setSelectedFile(null);
    preview && URL.revokeObjectURL(preview);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // ========================
  // RENDER UI (GIỮ NGUYÊN)
  // ========================
  return (
    <div className="min-h-screen relative flex flex-col" style={{ backgroundColor: "#E6F7FF" }}>
      <TopBar title="Trò chuyện" onNavigate={onNavigate} />

      <div className="flex-1 px-6 pt-20 pb-24 overflow-y-auto">
        <div className="space-y-4">
          {[...messages]
            .map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {msg.type === "user" && <UserTextBubble content={msg.content} time={msg.time} />}
                {msg.type === "user-image" && (
                  <UserImageWithTextBubble imageUrl={msg.imageUrl} content={msg.content} time={msg.time} />
                )}
                {msg.type === "ai-static" && <AITextStaticBubble content={msg.content} time={msg.time} />}
                {msg.type === "ai-streaming" && <AITextStreamingBubble content={msg.content} time={msg.time} />}
                {msg.type === "ai-image-loading" && <AIImageLoadingBubble time={msg.time} />}
                {msg.type === "ai-analyzing-image" && <AIAnalyzingImageBubble time={msg.time} />}
                {msg.type === "ai-image" && <AIImageResultBubble imageUrl={msg.imageUrl} time={msg.time} />}
              </motion.div>
            ))}
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-2 py-3 md:px-6 md:py-4 backdrop-blur-lg z-20"
        style={{ backgroundColor: "rgba(255,255,255,0.85)" }}
      >
        <div className="flex items-center gap-2 md:gap-3 max-w-5xl mx-auto w-full">

          <div
            className="flex-1 px-3 py-2 md:px-4 md:py-3 rounded-full flex items-center gap-2 min-w-0"
            style={{ backgroundColor: "#E6F7FF" }}
          >
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 bg-transparent outline-none placeholder:opacity-50 text-sm md:text-base min-w-0"
              style={{ color: "#1F3B4D" }}
              disabled={isProcessing}
            />
            <button
              onClick={() => handleSendText()}
              disabled={!inputText.trim() || isProcessing}
              className="shrink-0 p-1"
            >
              <Send size={18} className="md:w-5 md:h-5" style={{ color: "#007BFF" }} />
            </button>
          </div>

          <button
            className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 hover:scale-105 shrink-0"
            style={{ backgroundColor: "#F59E0B" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon size={18} className="md:w-5 md:h-5" color="white" />
          </button>
          <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={handleImageUpload} />

          <button
            className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 hover:scale-105 shrink-0"
            style={{ backgroundColor: "#10B981" }}
            onClick={handleCamera}
            disabled={isProcessing}
          >
            <Camera size={18} className="md:w-5 md:h-5" color="white" />
          </button>
          <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" hidden onChange={handleImageUpload} />

          {/* 👇 Nút Mic đã được nâng cấp logic */}
          <button
            className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 hover:scale-105 shrink-0 relative"
            style={{ backgroundColor: isListening ? "#EF4444" : "#007BFF" }}
            onClick={handleMicPress}
            disabled={isProcessing}
          >
            {isListening && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-500"
                animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            )}
            <Mic size={18} className="md:w-5 md:h-5" color="white" />
          </button>
        </div>
      </div>

      {showPromptDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="rounded-2xl p-4 w-[90%] max-w-sm mx-4 shadow-lg max-h-[80vh] overflow-auto overflow-x-hidden" style={{ backgroundColor: '#E6F7FF' }}>
            <h3 className="text-lg font-semibold mb-3 text-center text-gray-800">
              Bạn muốn AI phân tích điều gì trong ảnh này?
            </h3>
            <div className="mb-4">
              <div className="flex items-center justify-center mb-3">
                <Camera size={34} className="text-gray-400" />
              </div>
              <textarea
                placeholder="Ví dụ: Phân tích biểu cảm khuôn mặt, mô tả phong cảnh..."
                className="w-full border border-transparent rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 h-28 resize-none bg-white"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-2">Mô tả ngắn gọn điều bạn muốn AI phân tích. Bắt buộc để tiếp tục.</p>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => { setShowPromptDialog(false); setSelectedFile(null); setPendingCapture(null); setPromptText(''); setPreviewUrl(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border"
              >
                Hủy
              </button>
              <button
                onClick={() => sendImageWithPrompt()}
                className={`px-4 py-2 rounded-lg text-white ${isProcessing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={isProcessing || !promptText.trim()}
              >
                {isProcessing ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}