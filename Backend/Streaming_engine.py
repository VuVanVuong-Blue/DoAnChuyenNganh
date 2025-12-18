# =====================================================
# File: Backend/Streaming_engine.py
# Chức năng: Chụp màn hình + phân tích (Lưu Firebase)
# =====================================================

import pyautogui
import os
import time
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime

# Thêm import lưu history
from history import save_history

# --- 1️⃣ Nạp API Key ---
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ Lỗi: Không tìm thấy GEMINI_API_KEY trong file .env (Streaming_engine)")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")

# --- 2️⃣ Tạo folder Data ---
DATA_DIR = os.path.join(project_root, "Data")
os.makedirs(DATA_DIR, exist_ok=True)

# --- 3️⃣ Hàm chụp màn hình ---
def capture_screen():
    """Chụp ảnh màn hình và lưu vào Data/Snapshot_xxx.png"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Snapshot_{timestamp}.png"
    filepath = os.path.join(DATA_DIR, filename)

    try:
        screenshot = pyautogui.screenshot()
        screenshot.save(filepath)
        print(f"📸 Đã lưu ảnh chụp màn hình: {filepath}")
        cleanup_old_snapshots()  # Xoá bớt ảnh cũ
        return filepath
    except Exception as e:
        print(f"❌ Lỗi khi chụp ảnh màn hình: {e}")
        return None

# --- 4️⃣ Hàm dọn dẹp ảnh cũ ---
def cleanup_old_snapshots():
    """Giữ lại 5 ảnh Snapshot mới nhất"""
    try:
        files = [f for f in os.listdir(DATA_DIR) if f.startswith("Snapshot_") and f.endswith(".png")]
        files.sort(reverse=True)
        if len(files) > 5:
            for old_file in files[5:]:
                try:
                    os.remove(os.path.join(DATA_DIR, old_file))
                except: pass
    except Exception as e:
        print(f"⚠️ Lỗi dọn ảnh: {e}")

# --- 5️⃣ Phân tích ảnh màn hình (ĐÃ NÂNG CẤP FIREBASE) ---
def analyze_screen(question: str, user_id: str = None) -> str:
    """
    Chụp màn hình -> Gửi AI -> Trả lời -> Lưu vào Firebase của User.
    """
    if not GEMINI_API_KEY:
        return "Lỗi: Chưa cấu hình GEMINI_API_KEY."

    filepath = capture_screen()
    if not filepath:
        return "Xin lỗi, tôi không thể chụp ảnh màn hình lúc này."

    try:
        with Image.open(filepath) as image:
            print(f"🤖 [Streaming] Đang gửi ảnh tới AI (User: {user_id})...")
            
            response = model.generate_content(
                [question, image],
                safety_settings={
                    "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                    "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
                    "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
                    "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
                }
            )

            answer = response.text.strip() if getattr(response, "text", None) else "⚠️ Không có phản hồi từ AI."

            # In log server
            print(f"\n🟦 Q: {question}")
            print(f"📋 A: {answer[:100]}...\n")

            # --- LƯU VÀO FIREBASE ---
            if user_id:
                entry = {
                    "type": "analysis-screen", # Đánh dấu là phân tích màn hình
                    "image_path": filepath,    # Đường dẫn ảnh snapshot
                    "prompt": question,
                    "analysis": answer
                }
                save_history(entry, user_id=user_id)
            else:
                print("⚠️ [Streaming] Không có user_id, bỏ qua lưu lịch sử.")

            return answer

    except Exception as e:
        print(f"❌ Lỗi khi gửi ảnh tới AI: {e}")
        return f"Đã xảy ra lỗi khi phân tích hình ảnh: {e}"

# Test
if __name__ == "__main__":
    print("Streaming Engine Test")
    # analyze_screen("Màn hình có gì?", user_id="test_uid")