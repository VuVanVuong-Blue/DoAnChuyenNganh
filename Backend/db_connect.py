# File: Backend/db_connect.py
import firebase_admin
from firebase_admin import credentials, firestore
import os

# 1. Xác định đường dẫn tới file chìa khóa
current_dir = os.path.dirname(os.path.abspath(__file__))
key_path = os.path.join(current_dir, "serviceAccountKey.json")

# 2. Kiểm tra xem file chìa khóa có tồn tại không
if not os.path.exists(key_path):
    print(f"❌ LỖI: Không tìm thấy file key tại: {key_path}")
    print("👉 Hãy chắc chắn bạn đã copy file 'serviceAccountKey.json' vào thư mục Backend!")
else:
    # 3. Kết nối tới Firebase (chỉ kết nối 1 lần)
    if not firebase_admin._apps:
        try:
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            print("✅ Đã kết nối Firebase thành công!")
        except Exception as e:
            print(f"❌ Lỗi kết nối Firebase: {e}")

# 4. Tạo biến 'db' để các file khác dùng
db = firestore.client()