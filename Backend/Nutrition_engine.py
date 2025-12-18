# =====================================================
# File: Backend/Nutrition_engine.py
# (Phiên bản: Firebase Multi-User - ĐÃ FIX LỖI KEY ERROR 'meals')
# =====================================================

import os
import json
import re
from datetime import datetime
from PIL import Image
from dotenv import load_dotenv
import google.generativeai as genai

# --- 1️⃣ KẾT NỐI FIREBASE (THAY THẾ JSON) ---
from db_connect import db
from firebase_admin import firestore

# --- 2️⃣ CẤU HÌNH ---
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
env_path = os.path.join(project_root, ".env")
load_dotenv(env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

    model = genai.GenerativeModel("gemini-2.5-flash") 

# (Đã bỏ đường dẫn file JSON cục bộ vì không dùng nữa)

# --- 3️⃣ HELPERS ---
def clean_json_response(text):
    text = text.strip()
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL) 
    return match.group(1) if match else text

# --- 4️⃣ DATABASE FUNCTIONS (ĐÃ SỬA THÀNH FIREBASE) ---

def get_user_profile_engine(user_id):
    """Lấy Profile từ Firebase (Thay vì load_json)"""
    default = { "age": "", "height": "", "weight": "", "gender": "male", "goal": "maintain", "activityLevel": "moderate", "dailyCalories": "" }
    
    if not user_id: return default
    
    try:
        # Truy cập: users -> [uid]
        doc = db.collection('users').document(user_id).get()
        if doc.exists:
            return doc.to_dict()
        return default
    except Exception as e:
        print(f"❌ Lỗi lấy profile: {e}")
        return default

def save_user_profile_engine(user_id, data):
    """Lưu Profile lên Firebase (Thay vì save_json)"""
    if not user_id: return False
    
    try:
        # Dùng set với merge=True để chỉ cập nhật các trường thay đổi
        db.collection('users').document(user_id).set(data, merge=True)
        return True
    except Exception as e:
        print(f"❌ Lỗi lưu profile: {e}")
        return False

def get_today_nutrition_engine(user_id):
    """Lấy dữ liệu dinh dưỡng hôm nay"""
    default_data = { "meals": [], "total_calories": 0, "macros": {"protein": 0, "carbs": 0, "fat": 0}, "water": 0 }
    
    if not user_id: return default_data
    
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        # Truy cập: users -> [uid] -> nutrition_logs -> [YYYY-MM-DD]
        doc_ref = db.collection('users').document(user_id)\
                    .collection('nutrition_logs').document(today)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        return default_data
    except Exception as e:
        print(f"❌ Lỗi lấy log dinh dưỡng: {e}")
        return default_data

def add_meal_engine(user_id, meal_data):
    """Thêm món ăn và cộng dồn chỉ số (Logic gốc)"""
    if not user_id: return None
    
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        doc_ref = db.collection('users').document(user_id)\
                    .collection('nutrition_logs').document(today)
        
        # 1. Lấy dữ liệu cũ (hoặc tạo mới nếu chưa có)
        doc = doc_ref.get()
        if doc.exists:
            current_data = doc.to_dict()
        else:
            current_data = { "meals": [], "total_calories": 0, "macros": {"protein": 0, "carbs": 0, "fat": 0}, "water": 0 }

        # 👇👇👇 [FIX QUAN TRỌNG] KIỂM TRA VÀ KHỞI TẠO CÁC TRƯỜNG BỊ THIẾU 👇👇👇
        if "meals" not in current_data: 
            current_data["meals"] = []
        if "total_calories" not in current_data: 
            current_data["total_calories"] = 0
        if "macros" not in current_data:
            current_data["macros"] = {"protein": 0, "carbs": 0, "fat": 0}
        # 👆👆👆 HẾT PHẦN FIX 👆👆👆

        # 2. Tạo object món ăn mới (Logic gốc của bạn)
        new_meal = {
            "id": int(datetime.now().timestamp()),
            "name": meal_data.get("name", "Món lạ"),
            "calories": int(meal_data.get("calories", 0)),
            "protein": int(meal_data.get("protein", 0)),
            "carbs": int(meal_data.get("carbs", 0)),
            "fat": int(meal_data.get("fat", 0)),
            "time": meal_data.get("time") or datetime.now().strftime("%H:%M"), # Giữ nguyên time nếu có
            "icon": "🍽️"
        }

        # 3. Cộng dồn số liệu (Logic gốc)
        current_data["meals"].append(new_meal)
        current_data["total_calories"] += new_meal["calories"]
        current_data["macros"]["protein"] += new_meal["protein"]
        current_data["macros"]["carbs"] += new_meal["carbs"]
        current_data["macros"]["fat"] += new_meal["fat"]

        # 4. Lưu ngược lại Firebase
        doc_ref.set(current_data, merge=True)
        print(f"✅ Đã lưu món ăn: {new_meal['name']}")
        return new_meal
        
    except Exception as e:
        print(f"❌ Lỗi thêm món: {e}")
        return None

def update_water_engine(user_id, amount=1):
    """Cập nhật nước (Dùng Atomic Increment cho an toàn)"""
    if not user_id: return 0
    today = datetime.now().strftime("%Y-%m-%d")
    
    try:
        doc_ref = db.collection('users').document(user_id)\
                    .collection('nutrition_logs').document(today)
        
        # Tăng lượng nước
        doc_ref.set({"water": firestore.Increment(amount)}, merge=True)
        
        # Lấy lại giá trị mới để trả về UI
        updated_doc = doc_ref.get().to_dict()
        return updated_doc.get("water", 0)
    except Exception as e:
        print(f"❌ Lỗi update nước: {e}")
        return 0

def get_recent_habits_engine(user_id):
    """Lấy thói quen ăn uống gần đây"""
    if not user_id: return "Chưa có dữ liệu."
    try:
        # Lấy 3 ngày gần nhất từ sub-collection
        docs = db.collection('users').document(user_id)\
                 .collection('nutrition_logs')\
                 .order_by(firestore.FieldPath.document_id(), direction=firestore.Query.DESCENDING)\
                 .limit(3).stream()
        
        habits = []
        for doc in docs:
            d = doc.to_dict()
            date_str = doc.id
            meal_names = ', '.join([m['name'] for m in d.get('meals', [])])
            habits.append(f"- {date_str}: {meal_names}")
            
        return "\n".join(habits) if habits else "Chưa có dữ liệu."
    except: return "Chưa có dữ liệu."

# =====================================================
# PHẦN B: LOGIC AI (GIỮ NGUYÊN 100% PROMPT CŨ)
# =====================================================

# 1. GỢI Ý MÓN ĂN
def suggest_food_engine(user_profile, remaining_calories, ignore_list=None, preference=None):
    """
    preference: Ý muốn cụ thể của user (VD: "món nước", "đồ chay", "không dầu mỡ")
    """
    if ignore_list is None: ignore_list = []
    
    goal = user_profile.get('goal', 'maintain')
    ignore_text = ", ".join(ignore_list) if ignore_list else "Không có"
    
    # Xử lý text sở thích
    pref_text = ""
    if preference:
        pref_text = f"- YÊU CẦU ĐẶC BIỆT CỦA USER: Ưu tiên tuyệt đối các món '{preference}'."

    prompt = f"""
    Bạn là chuyên gia dinh dưỡng.
    - Mục tiêu: {goal}. Calo dư: {remaining_calories}.
    {pref_text}
    - CẤM GỢI Ý CÁC MÓN NÀY: {ignore_text}.
    
    Nhiệm vụ: Gợi ý 5 món ăn Việt Nam phù hợp nhất với YÊU CẦU ĐẶC BIỆT trên (nếu có).
    
    Trả về JSON List:
    [ {{ "name": "Tên", "calories": 300, "protein": 10, "carbs": 20, "fat": 5, "icon": "🍜", "desc": "Mô tả ngắn lý do chọn" }} ]
    """
    try:
        res = model.generate_content(prompt)
        data = json.loads(clean_json_response(res.text))
        return data.get("suggestions", data) if isinstance(data, dict) else data
    except: return []

# 2. TÍNH TDEE TỰ ĐỘNG (Có thêm user_id để lấy dữ liệu cũ nếu thiếu)
def calculate_recommended_calories_engine(incoming_data, user_id=None):
    try:
        saved = get_user_profile_engine(user_id) if user_id else {}
        
        def smart_get(k): return incoming_data.get(k) or saved.get(k)
        
        age, h, w = smart_get('age'), smart_get('height'), smart_get('weight')
        gender, act, goal = smart_get('gender') or 'male', smart_get('activityLevel') or 'moderate', smart_get('goal') or 'maintain'

        if not (age and h and w):
            return { "error": True, "message": "Thiếu thông tin Tuổi, Cao, Nặng." }

        prompt = f"""
        Tính TDEE và Calo mục tiêu.
        Input: {age} tuổi, {gender}, {h}cm, {w}kg, activity: {act}, goal: {goal}.
        Output JSON: {{ "calories": 2000, "reason": "Giải thích ngắn" }}
        """
        res = model.generate_content(prompt)
        return json.loads(clean_json_response(res.text))
    except: return { "calories": 2000 }

# 3. ƯỚC LƯỢNG DINH DƯỠNG TỪ TÊN
def estimate_nutrition_from_name_engine(food_name):
    """Hàm này dùng cho cả gõ tay và khi Mic nhận diện tên món ăn"""
    prompt = f"""
    Bạn là database dinh dưỡng. Hãy ước lượng chỉ số cho 1 phần ăn: "{food_name}".
    Trả về JSON duy nhất (đừng giải thích):
    {{
        "name": "{food_name}",
        "calories": 400, "protein": 15, "carbs": 50, "fat": 10,
        "time": "{datetime.now().strftime('%H:%M')}"
    }}
    """
    try:
        res = model.generate_content(prompt)
        return json.loads(clean_json_response(res.text))
    except: return { "name": food_name, "calories": 0 }

# 4. PHÂN TÍCH ẢNH
def analyze_food_image_engine(image_path: str):
    if not os.path.exists(image_path): return { "error": "Lỗi file ảnh" }
    prompt = """
    Nhìn ảnh này.
    - Nếu là thức ăn, hãy ước lượng dinh dưỡng.
    - Trả về JSON để điền vào form nhập liệu:
    { "is_food": true, "name": "Tên món chuẩn", "calories": 500, "protein": 20, "carbs": 60, "fat": 15 }
    - Nếu không phải thức ăn: { "is_food": false, "error": "Không phải đồ ăn" }
    """
    try:
        with Image.open(image_path) as img:
            res = model.generate_content([prompt, img])
            data = json.loads(clean_json_response(res.text))
            
            if not data.get("is_food", True): return { "error": data.get("error") }
            
            # Chuẩn hóa dữ liệu trả về cho Modal nhập tay
            return {
                "name": data.get("name", "Món lạ"),
                "calories": data.get("calories", 0),
                "protein": data.get("protein", 0),
                "carbs": data.get("carbs", 0),
                "fat": data.get("fat", 0),
                "time": datetime.now().strftime("%H:%M")
            }
    except: return { "error": "Lỗi AI Vision" }

# 5. XỬ LÝ GIỌNG NÓI ĐA NĂNG (Thêm user_id để lấy Context)
def parse_voice_command_engine(text: str, user_id: str = None):
    """
    Xử lý giọng nói: Tự động tính toán TDEE khi nhận thông tin Profile
    """
    # Lấy dữ liệu từ Firebase
    profile = get_user_profile_engine(user_id) if user_id else {}
    today_data = get_today_nutrition_engine(user_id) if user_id else {'total_calories': 0}
    
    # Lấy dữ liệu hiện tại (để AI biết ngữ cảnh cũ)
    goal_cal = int(profile.get('dailyCalories') or 2000) if str(profile.get('dailyCalories')).isdigit() else 2000
    current_cal = today_data.get('total_calories', 0)
    
    prompt = f"""
    Bạn là trợ lý dinh dưỡng thông minh (AI Coach).
    
    NGỮ CẢNH HIỆN TẠI (OLD DATA):
    - Mục tiêu cũ trong máy: {goal_cal} kcal.
    - User input: "{text}"

    NHIỆM VỤ CỐT LÕI: Phân tích Input và trả về JSON để App thực hiện hành động.

    QUY TẮC XỬ LÝ "PROFILE" & "MỤC TIÊU" (QUAN TRỌNG NHẤT):
    1. Nếu người dùng cung cấp thông tin cơ thể (Tuổi, Cao, Nặng, Vận động...):
       - BƯỚC 1: Tự tính TDEE (Mifflin-St Jeor) ngay lập tức.
       - BƯỚC 2: Điều chỉnh theo mục tiêu (Giảm cân: TDEE - 300~500, Tăng cân: TDEE + 300~500).
       - BƯỚC 3: Trả về intent "fill_profile".
       - BƯỚC 4: BẮT BUỘC điền con số vừa tính được vào trường "dailyCalories" trong "data".
       
       (Ví dụ: User nói "Tôi nặng 60kg muốn giảm cân" -> Tính ra 1800 -> Trả về data: {{ "weight": 60, "goal": "lose", "dailyCalories": 1800 }})

    OUTPUT JSON FORMATS:

    TYPE 1: Cập nhật Profile / Hỏi mục tiêu (fill_profile)
    {{
        "intent": "fill_profile",
        "data": {{ 
            "age": 21, "height": 165, "weight": 60, "gender": "male", 
            "activityLevel": "low", "goal": "lose", 
            "dailyCalories": 1800  <-- SỐ AI TỰ TÍNH TOÁN
        }},
        "message": "Dựa trên chỉ số của bạn, mình đã tính toán lại: Bạn nên nạp khoảng 1800 kcal/ngày để giảm cân hiệu quả. Mình đã cập nhật giúp bạn rồi nhé!"
    }}

    TYPE 2: Nhập món ăn (fill_manual_input)
    {{
        "intent": "fill_manual_input",
        "data": {{ 
            "name": "...", 
            "calories": 400, 
            "protein": 20, 
            "carbs": 50, 
            "fat": 10,
            "time": "{datetime.now().strftime('%H:%M')}" 
        }},
        "message": "Đã tìm thấy món..."
    }}

    TYPE 3: User hỏi "Ăn gì?", "Gợi ý món"  (suggestion)
    QUAN TRỌNG: Nếu user kèm điều kiện (VD: "Gợi ý món nước", "Món gì không béo", "Ăn chay"), hãy trích xuất vào trường 'preference'.
    Output: 
       {{ 
           "intent": "suggestion", 
           "preference": "món nước / món chay / ít calo / ... (hoặc null nếu không có)", 
           "message": "Okie, để mình tìm vài món [preference] cho bạn." 
       }}
    TYPE 4: Mở camera (ca)
    """
    
    try:
        print(f"🗣️ [AI Calculating] Input: {text}")
        response = model.generate_content(prompt)
        return json.loads(clean_json_response(response.text))
    except Exception as e:
        print(f"❌ Lỗi Voice AI: {e}")
        return { "error": "Lỗi xử lý", "message": "Tôi chưa nghe rõ thông tin." }