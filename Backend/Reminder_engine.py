# =====================================================
# File: Backend/Reminder_engine.py
# (Phiên bản: Firebase nhưng GIỮ NGUYÊN LOGIC CANH GIỜ)
# =====================================================

import json
import os
import time
import threading
import re  # QUAN TRỌNG: Dùng để bắt giờ chính xác
import dateparser # pip install dateparser
from datetime import datetime, timedelta

# --- 1. KẾT NỐI FIREBASE ---
from db_connect import db
from firebase_admin import firestore

# --- Import hàm nói để thông báo ---
try:
    from TTS_engine import speak
except ImportError:
    def speak(text): print(f"🔊 [GIẢ LẬP NÓI]: {text}")

class ReminderEngine:
    def __init__(self):
        # Không còn load_data() từ file nữa
        # Nhưng vẫn giữ Lock để thread-safe
        self.lock = threading.Lock()
        
        # [TÍNH NĂNG] Kiểm tra lịch bị lỡ khi vừa khởi động lại server
        # Lưu ý: Hàm này giờ sẽ quét trên Firebase
        #self.check_missed_reminders()

        # [TÍNH NĂNG] Kích hoạt chế độ canh giờ chạy ngầm
        #self.checker_thread = threading.Thread(target=self.check_loop, daemon=True)
        #self.checker_thread.start()
        
    # --- [LOGIC GỐC] Tự động phân loại ---
    def determine_category(self, text):
        text = text.lower()
        if any(k in text for k in ['thuốc', 'bác sĩ', 'khám', 'gym', 'tập', 'thể dục', 'ngủ', 'ăn', 'uống', 'đau']): return 'health'
        if any(k in text for k in ['họp', 'deadline', 'báo cáo', 'mail', 'team', 'dự án', 'code', 'nộp', 'sếp', 'học', 'bài']): return 'work'
        return 'personal'

    # --- [LOGIC GỐC] HÀM XỬ LÝ THỜI GIAN (REGEX + DATEPARSER) ---
    def parse_voice_command(self, text):
        text_lower = text.lower()
        
        # BƯỚC 1: DÙNG DATEPARSER ĐỂ BẮT NGÀY
        dt_parser = dateparser.parse(text, languages=['vi', 'en'], settings={
            'PREFER_DATES_FROM': 'future',
            'DATE_ORDER': 'DMY'
        })
        
        final_date = datetime.now() 
        if dt_parser:
            final_date = dt_parser
            
        # BƯỚC 2: DÙNG REGEX ĐỂ BẮT GIỜ
        is_pm = any(w in text_lower for w in ['chiều', 'tối', 'pm', 'đêm'])
        
        pattern_full = re.search(r'(\d{1,2})\s*(?::|h|giờ)\s*(\d{1,2})', text_lower)
        pattern_half = re.search(r'(\d{1,2})\s*(?:h|giờ)\s*rưỡi', text_lower)
        pattern_hour_only = re.search(r'(\d{1,2})\s*(?:h|giờ)', text_lower)

        hour, minute = None, None

        if pattern_full:
            hour, minute = int(pattern_full.group(1)), int(pattern_full.group(2))
        elif pattern_half:
            hour, minute = int(pattern_half.group(1)), 30
        elif pattern_hour_only:
            hour, minute = int(pattern_hour_only.group(1)), 0
            
        # BƯỚC 3: KẾT HỢP NGÀY VÀ GIỜ
        dt_obj = None
        
        if hour is not None:
            if is_pm and hour < 12: hour += 12
            try:
                dt_obj = final_date.replace(hour=hour, minute=minute, second=0)
                # Logic: Nếu giờ đã qua trong ngày -> Đẩy sang ngày mai
                now = datetime.now()
                if dt_obj.date() == now.date() and dt_obj < now:
                     future_words = ['mai', 'kia', 'tuần', 'tháng', 'sau', 'tới']
                     if not any(w in text_lower for w in future_words):
                        dt_obj = dt_obj + timedelta(days=1)
            except: pass

        elif dt_parser:
            dt_obj = dt_parser

        # BƯỚC 4: FALLBACK
        is_defaulted = False
        if not dt_obj:
            dt_obj = datetime.now() + timedelta(minutes=1)
            is_defaulted = True 
        
        title = text.capitalize()
        category = self.determine_category(text)
        color_map = {'work': '#007BFF', 'health': '#10B981', 'personal': '#FF6B9D'}

        return {
            "id": int(time.time() * 1000),
            "title": title,
            "time": dt_obj.strftime("%H:%M"),
            "date": dt_obj.strftime("%d/%m/%Y"),
            "category": category,
            "color": color_map[category],
            "is_notified": False,
            "is_defaulted": is_defaulted
        }

    # === [TÍNH NĂNG] GOM NHÓM THÔNG BÁO (Đã sửa để quét Firebase) ===
    def check_loop(self):
        print("⏰ Reminder Checker đang chạy ngầm (Chế độ Firebase)...")
        while True:
            try:
                now = datetime.now()
                current_time = now.strftime("%H:%M")
                current_date = now.strftime("%d/%m/%Y")
                
                # --- THAY ĐỔI: Quét toàn bộ nhắc nhở chưa báo trên Firebase ---
                # Lưu ý: Collection Group Query giúp tìm trong tất cả sub-collection 'reminders' của mọi user
                docs = db.collection_group('reminders')\
                         .where('is_notified', '==', False).stream()

                tasks_now = [] 
                
                for doc in docs:
                    r = doc.to_dict()
                    if r.get('date') == current_date and r.get('time') == current_time:
                        tasks_now.append(r['title'])
                        # Cập nhật ngay trên Firebase để không báo lại
                        doc.reference.update({'is_notified': True})
                
                # Nếu có việc cần báo
                if tasks_now:
                    if len(tasks_now) == 1:
                        content = f"Đến giờ rồi bạn ơi: {tasks_now[0]}"
                    else:
                        content = f"Đến giờ rồi, có {len(tasks_now)} việc cần làm: {', '.join(tasks_now)}"
                    
                    print(f"🔔 THÔNG BÁO: {content}")
                    threading.Thread(target=speak, args=(content,)).start()

            except Exception as e:
                print(f"⚠️ Lỗi Checker: {e}")
            
            time.sleep(5)

    # === [TÍNH NĂNG] CHECK LỊCH BỊ LỠ (Đã sửa cho Firebase) ===
    def check_missed_reminders(self):
        print("🔍 Đang kiểm tra lịch bị lỡ trên Firebase...")
        now = datetime.now()
        missed_tasks = []

        try:
            # Lấy tất cả nhắc nhở chưa báo
            docs = db.collection_group('reminders')\
                     .where('is_notified', '==', False).stream()

            for doc in docs:
                r = doc.to_dict()
                try:
                    r_dt = datetime.strptime(f"{r['date']} {r['time']}", "%d/%m/%Y %H:%M")
                    # Nếu lỡ trong vòng 30 phút đổ lại
                    if r_dt < now and (now - r_dt).total_seconds() < 1800:
                        missed_tasks.append(r['title'])
                        # Đánh dấu đã báo
                        doc.reference.update({'is_notified': True})
                except: pass
            
            if missed_tasks:
                txt = f"Xin chào, bạn đã lỡ các nhắc nhở sau: {', '.join(missed_tasks)}"
                threading.Thread(target=speak, args=(txt,)).start()
        except Exception as e:
            print(f"⚠️ Lỗi check missed: {e}")

    # === CÁC HÀM API (Đã thêm user_id) ===

    def add_reminder_voice(self, user_id, text):
        if not user_id: return "Lỗi: Chưa đăng nhập."
        
        new_item = self.parse_voice_command(text)
        
        try:
            doc_id = str(new_item['id'])
            # Lưu vào: users -> [uid] -> reminders -> [id]
            db.collection('users').document(user_id)\
              .collection('reminders').document(doc_id).set(new_item)
            
            cat_vn = {"work": "công việc", "health": "sức khỏe", "personal": "cá nhân"}
            base_msg = f"Đã lên lịch {cat_vn.get(new_item['category'], 'nhắc nhở')}: {new_item['title']} lúc {new_item['time']} ngày {new_item['date']}"
            
            if new_item.get('is_defaulted'):
                return f"Tôi không nghe rõ giờ, nên đặt sau 1 phút nhé. {base_msg}"
            return base_msg
        except Exception as e:
            print(f"❌ Lỗi thêm nhắc nhở: {e}")
            return "Lỗi hệ thống."

    def add_reminder_ui(self, user_id, data):
        if not user_id: return {"error": "No User ID"}
        
        data['id'] = int(time.time() * 1000)
        data['is_notified'] = False
        
        try:
            doc_id = str(data['id'])
            db.collection('users').document(user_id)\
              .collection('reminders').document(doc_id).set(data)
            return data
        except Exception as e:
            return {"error": str(e)}

    def get_all(self, user_id):
        if not user_id: return []
        try:
            # Lấy nhắc nhở của user này, sắp xếp theo ID (thời gian tạo)
            docs = db.collection('users').document(user_id)\
                     .collection('reminders').order_by('id').stream()
            return [doc.to_dict() for doc in docs]
        except: return []

    def delete_reminder(self, user_id, reminder_id):
        if not user_id: return False
        try:
            db.collection('users').document(user_id)\
              .collection('reminders').document(str(reminder_id)).delete()
            return True
        except: return False

    def update_reminder(self, user_id, reminder_id, data):
        if not user_id: return False
        try:
            data['is_notified'] = False # Reset để báo lại nếu sửa giờ
            db.collection('users').document(user_id)\
              .collection('reminders').document(str(reminder_id)).update(data)
            return True
        except: return False

reminder_engine = ReminderEngine()