import { TextToSpeech } from '@capacitor-community/text-to-speech';

export const speak = async (text: string, onEnd?: () => void) => {
  try {
    // Dừng giọng cũ nếu đang nói
    await TextToSpeech.stop();

    // Ra lệnh cho điện thoại đọc và CHỜ (await) cho đến khi đọc xong
    await TextToSpeech.speak({
      text: text,
      lang: 'vi-VN',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    });

    // 👇 SỬA Ở ĐÂY:
    // Vì lệnh await ở trên đã chờ đọc xong rồi, nên ta gọi onEnd luôn.
    // Không dùng setTimeout nữa.
    if (onEnd) {
        onEnd();
    }

  } catch (error) {
    console.error("Lỗi TTS Native:", error);
    
    // Fallback: Dùng web speech nếu plugin lỗi
    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        
        // Với Web Speech API thì phải dùng onend event
        utterance.onend = () => {
            if (onEnd) onEnd();
        };
        
        // Thêm xử lý lỗi cho chắc
        utterance.onerror = () => {
            if (onEnd) onEnd();
        };

        window.speechSynthesis.cancel(); // Cancel trước khi speak để tránh lỗi
        window.speechSynthesis.speak(utterance);
    } catch (webError) {
        // Nếu cả 2 đều lỗi thì force dừng animation ngay
        if (onEnd) onEnd();
    }
  }
};