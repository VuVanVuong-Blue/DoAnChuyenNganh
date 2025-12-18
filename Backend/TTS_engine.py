# Backend/TTS_engine.py (ĐÃ SỬA ĐỂ LỌC KÝ TỰ RÁC)
import threading
import pygame
import random
import os
import io
import time
import re  # <--- [QUAN TRỌNG] Thêm module này để xử lý văn bản
from gtts import gTTS
from dotenv import dotenv_values

# --- Load .env (gốc project) ---
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
env_vars = dotenv_values(env_path)

# --- Thư mục Data ---
data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Data'))
os.makedirs(data_dir, exist_ok=True)

# --- Biến dừng toàn cục ---
_stop_flag = False

# --- Danh sách câu trả lời khi text dài ---
LONG_TEXT_RESPONSES = [
    "Phần còn lại của kết quả đã được in ra màn hình chat, bạn vui lòng kiểm tra nhé.",
    "Phần còn lại của văn bản hiện có trên màn hình chat, bạn hãy kiểm tra.",
    "Bạn có thể xem phần còn lại của văn bản trên màn hình chat.",
    "Phần văn bản còn lại hiện có trên màn hình chat, bạn nhé.",
    "Bạn sẽ tìm thấy nhiều văn bản hơn trên màn hình chat để xem.",
    "Phần còn lại của câu trả lời hiện có trên màn hình chat, bạn nhé.",
    "Bạn vui lòng xem màn hình chat, phần còn lại của câu trả lời ở đó.",
    "Bạn sẽ tìm thấy câu trả lời đầy đủ trên màn hình chat.",
    "Phần tiếp theo của văn bản nằm trên màn hình chat, bạn nhé.",
    "Bạn vui lòng kiểm tra màn hình chat để biết thêm thông tin.",
    "Có thêm văn bản trên màn hình chat cho bạn.",
    "Bạn hãy xem màn hình chat để xem thêm văn bản.",
    "Bạn sẽ tìm thấy nhiều nội dung hơn để đọc trên màn hình chat.",
    "Bạn kiểm tra màn hình chat để xem phần còn lại của văn bản nhé.",
    "Màn hình chat có phần còn lại của văn bản, bạn nhé.",
    "Có nhiều nội dung hơn để xem trên màn hình chat, bạn vui lòng xem.",
    "Bạn ơi, màn hình chat chứa phần tiếp theo của văn bản.",
    "Bạn sẽ tìm thấy câu trả lời hoàn chỉnh trên màn hình chat, vui lòng kiểm tra.",
    "Vui lòng xem lại màn hình chat để biết phần còn lại của văn bản, bạn nhé.",
    "Bạn hãy nhìn vào màn hình chat để xem câu trả lời đầy đủ."
]

# =======================================================
# 🧹 HÀM MỚI: LÀM SẠCH TEXT TRƯỚC KHI ĐỌC
# =======================================================
def clean_text_for_tts(text: str) -> str:
    """Loại bỏ Markdown, ký tự đặc biệt và log tag [1] để đọc mượt hơn"""
    if not text:
        return ""
    
    # 1. Loại bỏ tag log dạng [1], [INFO], [20:00]...
    text = re.sub(r'\[.*?\]', '', text)

    # 2. Loại bỏ dấu * (in đậm/nghiêng) dùng trong Markdown
    # Thay thế ** hoặc * bằng rỗng
    text = re.sub(r'\*+', '', text)

    # 3. Loại bỏ dấu # (Heading)
    text = re.sub(r'#+', '', text)

    # 4. Loại bỏ dấu gạch đầu dòng (nếu muốn đọc liền mạch)
    # Nếu dòng bắt đầu bằng "- " hoặc "* ", bỏ nó đi
    text = re.sub(r'(^|\n)\s*[-*]\s+', ' ', text)

    # 5. Xóa khoảng trắng thừa do việc cắt bỏ để lại
    text = re.sub(r'\s+', ' ', text).strip()

    return text

# --- Tạo audio bytes bằng gTTS (tối ưu RAM) ---
def _generate_audio_bytes(text: str) -> bytes | None:
    if not text.strip():
        return None
    try:
        # Text đã sạch sẽ khi vào đây
        tts = gTTS(text=text, lang='vi', slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp.read()
    except Exception as e:
        print(f"❌ gTTS lỗi: {e}")
        return None

# --- Phát audio bằng pygame (thread-safe) ---
def _play_audio(bytes_data: bytes):
    global _stop_flag
    try:
        if not pygame.mixer.get_init():
            pygame.mixer.init(frequency=24000, size=-16, channels=1, buffer=512)
        
        audio_file = io.BytesIO(bytes_data)
        pygame.mixer.music.load(audio_file)
        pygame.mixer.music.play()
        
        while pygame.mixer.music.get_busy() and not _stop_flag:
            pygame.time.Clock().tick(30)
        
        if _stop_flag:
            pygame.mixer.music.stop()
    except Exception as e:
        print(f"❌ Pygame lỗi: {e}")
    finally:
        _stop_flag = False

# --- Hàm speak chính (dùng cho Flask + UI) ---
def speak(text: str, callback=lambda: True):
    """
    Phát text bằng tiếng Việt.
    """
    global _stop_flag
    _stop_flag = False

    # >>> BƯỚC XỬ LÝ: LÀM SẠCH TEXT NGAY ĐẦU VÀO <<<
    clean_text = clean_text_for_tts(str(text))
    
    # Cắt ngắn nếu text quá dài (> 250 ký tự và > 4 câu)
    # Lưu ý: Dùng clean_text để tính toán
    sentences = [s.strip() for s in clean_text.split('.') if s.strip()]
    
    if len(sentences) > 4 and len(clean_text) > 250:
        short_text = '. '.join(sentences[:2]) + '. ' + random.choice(LONG_TEXT_RESPONSES)
    else:
        short_text = clean_text

    audio_bytes = _generate_audio_bytes(short_text)
    if not audio_bytes:
        return False

    thread = threading.Thread(target=_play_audio, args=(audio_bytes,), daemon=True)
    thread.start()
    
    thread.join(timeout=30)
    return True

# --- Dừng TTS ---
def stop_speak():
    global _stop_flag
    _stop_flag = True
    pygame.mixer.music.stop()

# --- Hàm cũ để tương thích (nếu cần) ---
def TextToSpeech(text: str, func=lambda r=None: True):
    speak(text, func)

if __name__ == '__main__':
    print("🤖 TTS Engine (gTTS + pygame) - Test")
    speak("Xin chào, tôi là trợ lý ảo của bạn. Hệ thống đang hoạt động tốt.")
    time.sleep(3)
    speak("Đây là test dừng giữa chừng...")
    time.sleep(1)
    stop_speak()
    print("Đã dừng.")