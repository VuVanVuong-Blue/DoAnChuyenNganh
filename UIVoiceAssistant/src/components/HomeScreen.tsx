import { useState, useEffect, useRef } from 'react';
import { EnergyOrb } from './EnergyOrb';
import { TopBar } from './TopBar';
import { Mic, MicOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { speak } from '../utils/tts';

// 👇 1. IMPORT TỪ CONFIG CHUNG
import { API_BASE } from '../config';

// 👇 2. CHÚNG TA KHÔNG DÙNG PLUGIN NATIVE NỮA
// (Code này sẽ dùng trực tiếp window.webkitSpeechRecognition của WebView)

interface Result {
  type: string;
  content: string;
}

type OrbState = 'idle' | 'listening' | 'processing' | 'speaking';

interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
  user: { uid: string };
}

export function HomeScreen({ onNavigate, user }: HomeScreenProps) {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  // Ref để giữ instance của Web Recognition
  const recognitionRef = useRef<any>(null);

  // =========================================================
  // PHẦN 1: HÀM GỬI TEXT VỀ SERVER (GIỮ NGUYÊN LOGIC CŨ)
  // =========================================================
  const handleSendText = async (text: string) => {
      setOrbState('processing');
      await processCommand(text);
  };

  const processCommand = async (text: string) => {
    try {
      console.log(`Sending to: ${API_BASE}/api/process`);
      
      const res = await fetch(`${API_BASE}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          uid: user.uid
        }),
      });

      if (!res.ok) {
          const errText = await res.text();
          alert(`❌ Server báo lỗi ${res.status}: ${errText}`);
          setOrbState('idle');
          return;
      }

      // Xử lý Stream NDJSON (Server trả về từng dòng)
      const rawText = await res.text();
      const resultsData: Result[] = [];
      const lines = rawText.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const jsonItem = JSON.parse(line);
          resultsData.push(jsonItem);
        } catch (e) {
          console.error("Lỗi parse dòng:", line);
        }
      }
      
      // Ghép nội dung lại để đọc
      const textToSpeak = resultsData
        .filter((r: any) => r.content && typeof r.content === 'string')
        .map((r: any) => r.content)
        .join('. ');

      // Lưu sessionStorage để chuyển trang (nếu có chuyển trang)
      if (text && textToSpeak) {
        sessionStorage.setItem('pending_transfer', JSON.stringify({
          userText: text,
          aiText: textToSpeak
        }));
      }

      // Đọc to lên
      if (textToSpeak) {
        setOrbState('speaking');
        speak(textToSpeak, () => {
          setOrbState('idle');
        });
      } else {
        setOrbState('idle');
      }

    } catch (e: any) {
      console.error("Lỗi processCommand:", e);
      alert(`❌ LỖI KẾT NỐI: ${e.message}\nKiểm tra Server Python và IP Config.`);
      setOrbState('idle');
    }
  };

  // =========================================================
  // PHẦN 2: CHIẾN THUẬT WEB SPEECH API (CHẠY ĐƯỢC TRÊN MOBILE WEBVIEW)
  // =========================================================
  const startSTT = () => {
    if (!user?.uid) {
      alert("Vui lòng đăng nhập trước!");
      return;
    }

    // 👇 LẤY API CỦA TRÌNH DUYỆT (Chrome/WebView trên Android hỗ trợ cái này)
    const SpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechAPI) {
      alert("❌ Lỗi: Máy của bạn không hỗ trợ Web Speech API. Hãy cập nhật 'Android System WebView' hoặc cài Chrome làm mặc định.");
      return;
    }

    try {
      const recognition = new SpeechAPI();
      recognition.lang = 'vi-VN';
      recognition.continuous = false; // Nghe 1 câu rồi dừng (để xử lý cho nhanh)
      recognition.interimResults = false; // Chỉ lấy kết quả cuối cùng

      // --- SỰ KIỆN 1: BẮT ĐẦU ---
      recognition.onstart = () => {
        console.log("🎙️ Web Mic: Đã bật");
        setOrbState('listening');
      };

      // --- SỰ KIỆN 2: CÓ KẾT QUẢ ---
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        console.log("✅ Web Mic nghe được:", text);
        
        // Dừng nghe ngay lập tức để gửi đi
        recognition.stop();
        handleSendText(text);
      };

      // --- SỰ KIỆN 3: LỖI ---
      recognition.onerror = (event: any) => {
        console.error("🔴 Web Mic Lỗi:", event.error);
        
        if (event.error === 'not-allowed') {
            alert("⚠️ Bạn đã chặn quyền Mic của Trình duyệt/App. Hãy vào Cài đặt -> Ứng dụng -> Cấp quyền Micro.");
        } else if (event.error === 'no-speech') {
            // Không nói gì thì thôi, về idle, không cần alert phiền phức
        } else {
            alert("Lỗi Mic: " + event.error);
        }
        setOrbState('idle');
      };

      // --- SỰ KIỆN 4: KẾT THÚC ---
      recognition.onend = () => {
        // Nếu kết thúc mà chưa chuyển sang processing (do lỗi hoặc không nói gì) -> Về idle
        setOrbState(prev => prev === 'listening' ? 'idle' : prev);
      };

      // Lưu vào Ref để có thể stop thủ công
      recognitionRef.current = recognition;
      recognition.start();

    } catch (e) {
      alert("❌ Không thể khởi động Mic: " + JSON.stringify(e));
      setOrbState('idle');
    }
  };

  const stopSTT = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    // Không set idle ở đây, để logic onend tự xử lý
  };

  const handleMic = () => {
    if (orbState === 'idle') startSTT();
    else stopSTT();
  };

  // Cleanup khi thoát màn hình
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // =========================================================
  // PHẦN 3: GIAO DIỆN (UI) - ĐÃ TỐI ƯU CHO MOBILE
  // =========================================================
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-12">
      <TopBar title="Trang chủ" onNavigate={onNavigate} />
      
      <div className="mb-12">
        <EnergyOrb state={orbState} />
      </div>

      <div className="text-center mb-8 min-h-[32px]">
        <AnimatePresence mode='wait'>
          <motion.h1
            key={orbState}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            style={{ color: '#1F3B4D' }}
          >
            {orbState === 'idle' && 'Sẵn sàng'}
            {orbState === 'listening' && 'Đang nghe...'}
            {orbState === 'processing' && 'Đang xử lý...'}
            {orbState === 'speaking' && 'Đang trả lời...'}
          </motion.h1>
        </AnimatePresence>
      </div>

      <button
        onClick={handleMic}
        className="rounded-full p-6 shadow-lg transition-all hover:scale-105"
        style={{
           // Mobile dùng nền trắng đục cho mượt, Laptop dùng Blur cho đẹp
           backgroundColor: orbState === 'listening' ? '#007BFF' : 'rgba(255,255,255,0.9)',
           backdropFilter: 'blur(10px)'
        }}
      >
        {orbState === 'listening'
          ? <MicOff size={32} color="white" />
          : <Mic size={32} color="#007BFF" />}
      </button>
    </div>
  );
}