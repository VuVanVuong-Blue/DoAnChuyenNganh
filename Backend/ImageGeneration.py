# File: Backend/ImageGeneration.py
# (Phiên bản chuẩn hóa - tạo 1 ảnh duy nhất + 3 hàm nâng cao)
import asyncio
from random import randint
from PIL import Image
import requests
from dotenv import get_key
import os
import time
from deep_translator import GoogleTranslator

# Thêm import save_history
from history import save_history

# --- 1. Lấy API Key ---
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
HUGGINGFACE_API_KEY = get_key(env_path, 'HUGGINGFACE_API_KEY')

if not HUGGINGFACE_API_KEY:
    print("❌ Không tìm thấy HUGGINGFACE_API_KEY trong .env")
    headers = {}
else:
    API_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    print("✅ Đã kết nối tới Hugging Face - Realistic Vision XL")

# --- 2. Thư mục lưu ảnh ---
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Data")
os.makedirs(DATA_DIR, exist_ok=True)

# --- 3. Hàm gọi API ---
async def query(payload):
    if not headers:
        return b"error: Missing API key"
    try:
        response = await asyncio.to_thread(requests.post, API_URL, headers=headers, json=payload)
        return response.content
    except Exception as e:
        return f"error: {e}".encode("utf-8")

# --- 4. Hàm dịch prompt ---
def translate_prompt(prompt: str) -> str:
    try:
        return GoogleTranslator(source='vi', target='en').translate(prompt)
    except:
        return prompt

# --- 5. Hàm tạo ảnh chính ---
async def generate_image(prompt: str):
    prompt_en = translate_prompt(prompt)
    full_prompt = (
        f"{prompt_en}, ultra realistic, detailed, professional lighting, "
        f"4K resolution, cinematic tone, seed={randint(0, 1000000)}"
    )

    payload = {"inputs": full_prompt}
    image_bytes = await query(payload)

    safe_name = ''.join(c for c in prompt if c.isalnum() or c in ' _-').strip().replace(" ", "_")
    save_path = os.path.join(DATA_DIR, f"{safe_name}.jpg")

    if image_bytes.startswith(b"error:"):
        print(f"❌ Lỗi tạo ảnh: {image_bytes.decode('utf-8')}")
        return None

    # Ghi file ảnh xuống ổ đĩa
    with open(save_path, "wb") as f:
        f.write(image_bytes)
        f.flush()
        os.fsync(f.fileno())

    # ✅ Đợi file thực sự được ghi xong (tránh UI load quá sớm)
    for _ in range(10):  # tối đa 10 lần (3s)
        if os.path.exists(save_path) and os.path.getsize(save_path) > 1000:
            break
        time.sleep(0.3)

    print(f"💾 Đã lưu ảnh: {save_path}")
    return save_path

# --- 6. Gọi hàm đồng bộ ---
def GenerateImages(prompt: str):
    """Tạo 1 ảnh duy nhất từ prompt gốc."""
    try:
        path = asyncio.run(generate_image(prompt))
        if path:
            # Hiển thị ảnh (giữ như cũ)
            try:
                img = Image.open(path)
                img.show()
            except Exception:
                pass

            # --- GHI LỊCH SỬ TẠO ẢNH VÀO CHAT HISTORY ---
            try:
                save_history({
                    "id": f"gen-{time.time()}",
                    "type": "ai-image",
                    "prompt": prompt,
                    "image_path": path
                })
            except Exception as e:
                print(f"⚠️ [ImageGeneration] Lỗi khi gọi save_history: {e}")

        return path
    except Exception as e:
        print(f"❌ Lỗi khi tạo ảnh: {e}")
        return None

# --- 7. Tạo lại ảnh cùng nội dung ---
def RegenerateLastImage(prompt: str):
    """Tạo lại ảnh cùng prompt cũ với seed mới."""
    print("🔁 Đang tái tạo lại ảnh cùng nội dung...")
    return GenerateImages(prompt)

# --- 8. Tạo ảnh biến thể nhẹ ---
def GenerateVariant(prompt: str, variation: str):
    """Tạo ảnh cùng chủ đề nhưng có chỉnh nhẹ (ví dụ: thêm vật thể, đổi màu...)."""
    print(f"🎨 Đang tạo ảnh biến thể: {variation}")
    new_prompt = f"{prompt}, {variation}"
    return GenerateImages(new_prompt)

# --- 9. Lấy ảnh mới nhất ---
def get_latest_image_path():
    """Trả về đường dẫn ảnh gần nhất trong thư mục Data."""
    files = [os.path.join(DATA_DIR, f) for f in os.listdir(DATA_DIR) if f.lower().endswith(".jpg")]
    if not files:
        return None
    return max(files, key=os.path.getctime)

# --- 10. Test ---
if __name__ == "__main__":
    test = input("🧠 Nhập mô tả ảnh: ")
    GenerateImages(test)
