# =====================================================
# File: Backend/history.py
# Chức năng: Lưu lịch sử hoạt động (Vision, Image Gen...) lên Firebase
# =====================================================

import os
from datetime import datetime
from db_connect import db  # Import kết nối Firebase
from firebase_admin import firestore

def save_history(entry: dict, user_id: str = None):
    """
    Lưu một mục lịch sử vào Firestore của người dùng cụ thể.
    
    Args:
        entry (dict): Dữ liệu cần lưu (VD: prompt, kết quả, loại hoạt động)
        user_id (str): ID người dùng (UID từ Firebase Auth)
    """
    
    # Nếu không có user_id, chúng ta không biết lưu vào ngăn tủ nào
    if not user_id:
        print("⚠️ [History] Cảnh báo: Không có user_id, bỏ qua việc lưu lịch sử.")
        return False

    try:
        # 1. Thêm các trường thời gian chuẩn
        # Dùng server_timestamp để sắp xếp chính xác trên Cloud
        entry["timestamp"] = firestore.SERVER_TIMESTAMP
        # Dùng string để hiển thị đẹp trên UI nếu cần
        entry["created_at_str"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 2. Ghi vào sub-collection 'history' của user đó
        # Đường dẫn: users -> [UID] -> history -> [Auto ID]
        db.collection('users').document(user_id)\
          .collection('history').add(entry)

        print(f"✅ [History] Đã lưu hoạt động '{entry.get('type', 'unknown')}' cho user {user_id}")
        return True
        
    except Exception as e:
        print(f"❌ [History] Lỗi khi lưu lên Firebase: {e}")
        return False

# Hàm load_history cũ không cần thiết nữa vì ta sẽ query trực tiếp từ Firebase khi cần hiển thị