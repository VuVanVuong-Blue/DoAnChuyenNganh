# =====================================================
# File: Backend/Vision_engine.py
# Chức năng: Phân tích ảnh người dùng upload (Gemini Vision)
# =====================================================

import os
from datetime import datetime
from PIL import Image
from dotenv import load_dotenv
import google.generativeai as genai

# Import hàm history mới
from history import save_history

# --- 1️⃣ Nạp biến môi trường ---
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
env_path = os.path.join(project_root, ".env")

load_dotenv(env_path)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ [Vision_engine] Không tìm thấy GEMINI_API_KEY trong .env!")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash") # Hoặc model bạn đang dùng

# --- 2️⃣ Đảm bảo thư mục Data tồn tại (để lưu ảnh tạm) ---
DATA_DIR = os.path.join(project_root, "Data")
os.makedirs(DATA_DIR, exist_ok=True)

# --- 3️⃣ Hàm chính: phân tích ảnh upload ---
def analyze_image(image_path: str, question: str = "Mô tả chi tiết nội dung ảnh này.", user_id: str = None) -> str:
    """
    Phân tích ảnh người dùng gửi lên bằng Gemini Vision.
    Nhận thêm user_id để lưu lịch sử.
    """
    if not GEMINI_API_KEY:
        return "⚠️ Chưa cấu hình GEMINI_API_KEY."

    if not os.path.exists(image_path):
        return "⚠️ Không tìm thấy file ảnh để phân tích."

    try:
        with Image.open(image_path) as img:
            print(f"📸 [Vision_engine] Đang phân tích ảnh: {image_path}")
            
            # Gọi Google Gemini
            response = model.generate_content(
                [question, img],
                safety_settings={
                    "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                    "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
                    "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
                    "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
                }
            )

            answer = response.text.strip() if getattr(response, "text", None) else "⚠️ Không có phản hồi từ AI."

            # --- GHI LỊCH SỬ VÀO FIREBASE ---
            if user_id:
                entry = {
                    "type": "analysis-image", # Loại hoạt động
                    "image_path": image_path, # Đường dẫn ảnh (lưu ý: đây là path local, sau này nên upload Storage)
                    "prompt": question,       # Câu hỏi
                    "analysis": answer        # Câu trả lời của AI
                }
                save_history(entry, user_id=user_id)
            else:
                print("⚠️ [Vision] Không có user_id, không lưu lịch sử.")

            print(f"✅ [Vision_engine] Kết quả: {answer[:80]}...")
            return answer

    except Exception as e:
        print(f"❌ [Vision_engine] Lỗi phân tích ảnh: {e}")
        return f"❌ Đã xảy ra lỗi khi phân tích ảnh: {e}"

# --- 4️⃣ Alias: Cho phép Flask gọi trực tiếp ---
def analyze_uploaded_image(file_obj, question: str = "Mô tả ảnh này.", user_id: str = None):
    """
    Wrapper xử lý file upload từ Flask.
    """
    try:
        # Nếu là FileStorage (tức là upload từ frontend)
        if hasattr(file_obj, "save"):
            # Tạo tên file tạm
            temp_name = f"Uploaded_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            temp_path = os.path.join(DATA_DIR, temp_name)
            
            # Lưu file xuống ổ cứng server
            file_obj.save(temp_path)
            print(f"💾 [Vision_engine] Đã lưu ảnh upload tạm: {temp_path}")
            
        elif isinstance(file_obj, str):
            # Nếu là chuỗi đường dẫn thì dùng luôn
            temp_path = file_obj
        else:
            return "⚠️ Định dạng ảnh không hợp lệ."

        # Gọi hàm phân tích chính (truyền user_id vào)
        result = analyze_image(temp_path, question, user_id=user_id)
        return result

    except Exception as e:
        print(f"❌ [Vision_engine] Lỗi khi xử lý ảnh upload: {e}")
        return f"❌ Không thể xử lý ảnh: {e}"

# Test thủ công
if __name__ == "__main__":
    print("🎬 [Vision_engine] Test thủ công:")
    # test_id = "test_user_123" # Bỏ comment để test lưu Firebase
    # ...