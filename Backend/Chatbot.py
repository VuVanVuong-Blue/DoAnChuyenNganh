# ==========================================
# File: Backend/Chatbot.py 
# (Phiên bản: Cá nhân hóa tên người dùng từ Firebase)
# ==========================================

import os
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv
from RealtimeTools import LayThongTinThoiGianThuc, LayThongTinThoiTiet

# --- 1. KẾT NỐI DATABASE ---
from db_connect import db 
from firebase_admin import firestore

# === 2. Load cấu hình ===
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# 👇 Đã XÓA dòng ten_nguoi_dung = os.getenv... vì không cần nữa
ten_tro_ly = os.getenv("Assistantname", "Vist")
GroqAPIKey2 = os.getenv("GroqAPIKey2")

if not GroqAPIKey2:
    print("❌ Lỗi: Thiếu GroqAPIKey2 trong .env")
else:
    try:
        client = Groq(api_key=GroqAPIKey2)
    except Exception as e:
        print(f"❌ Lỗi kết nối Groq: {e}")

# === 3. Hàm tiện ích ===
def SuaDinhDangTraLoi(cau_tra_loi: str) -> str:
    dong = cau_tra_loi.split("\n")
    return "\n".join([d for d in dong if d.strip()])

# === 4. HÀM LẤY TÊN NGƯỜI DÙNG TỪ FIREBASE ===
def lay_ten_nguoi_dung(user_id):
    """Vào Firestore lấy tên thật của user, nếu không thấy thì gọi là 'Bạn'"""
    try:
        if user_id:
            # Vào collection 'users', tìm document có id là user_id
            doc = db.collection('users').document(user_id).get()
            if doc.exists:
                data = doc.to_dict()
                # Lấy trường 'name' hoặc 'displayName', nếu không có thì lấy 'email'
                return data.get('name') or data.get('email') or "Bạn"
    except Exception as e:
        print(f"⚠️ Lỗi lấy tên user: {e}")
    return "Bạn"

# === 5. HÀM CHATBOT CHÍNH ===
def ChatBot(truy_van: str, user_id: str = None) -> str:
    
    # 1. Xử lý logic cứng
    if "thời tiết" in truy_van.lower():
        return LayThongTinThoiTiet()
    
    try:
        # --- BƯỚC 1: LẤY TÊN NGƯỜI DÙNG (CÁ NHÂN HÓA) ---
        ten_that_cua_user = lay_ten_nguoi_dung(user_id) # <--- Logic mới ở đây
        
        # --- BƯỚC 2: LẤY LỊCH SỬ CHAT TỪ FIREBASE ---
        lich_su_gui_ai = []
        if user_id:
            docs = db.collection('users').document(user_id)\
                     .collection('chat_logs')\
                     .order_by('timestamp', direction=firestore.Query.DESCENDING)\
                     .limit(20).stream()
            
            temp_history = [doc.to_dict() for doc in docs]
            temp_history.reverse()

            for msg in temp_history:
                if msg.get('role') and msg.get('content'):
                    lich_su_gui_ai.append({
                        "role": msg['role'],
                        "content": msg['content']
                    })

        # Thêm câu hỏi mới
        lich_su_gui_ai.append({"role": "user", "content": truy_van})

        # --- BƯỚC 3: CẤU HÌNH SYSTEM (THÊM TÊN NGƯỜI DÙNG VÀO) ---
        chi_dan = [
            {
                "role": "system", 
                # 👇 Dạy AI biết tên người dùng để xưng hô
                "content": f"Bạn là trợ lý AI tên {ten_tro_ly}. Người dùng tên là {ten_that_cua_user}. Hãy xưng hô thân mật bằng tên của họ nếu phù hợp. Trả lời ngắn gọn, súc tích."
            },
            {"role": "system", "content": LayThongTinThoiGianThuc()},
            {"role": "system", "content": LayThongTinThoiTiet()},
        ]

        # --- BƯỚC 4: GỌI AI ---
        # (Phần này giữ nguyên không đổi)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=chi_dan + lich_su_gui_ai,
            temperature=0.7,
            max_tokens=1024,
            stream=False
        )
        
        bot_response = completion.choices[0].message.content
        bot_response = SuaDinhDangTraLoi(bot_response)

        # --- BƯỚC 5: LƯU LỊCH SỬ ---
        if user_id:
            user_ref = db.collection('users').document(user_id).collection('chat_logs')
            user_ref.add({
                "role": "user", "content": truy_van,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            user_ref.add({
                "role": "assistant", "content": bot_response,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })

        return bot_response

    except Exception as e:
        print(f"❌ Lỗi Chatbot: {e}")
        return "Xin lỗi, hệ thống đang bận."

# Test (Không quan trọng lắm vì chạy server là chính)
if __name__ == "__main__":
    print("Chatbot Firebase Mode")