# ====================================================
# UIVoiceAssistant/api/server.py
# (Phiên bản: FULL TÍNH NĂNG + HYBRID MOBILE SUPPORT)
# ====================================================
import sys
import os
import time
import asyncio
import threading
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask import Response, stream_with_context

# ====================================================
# FIX ĐƯỜNG DẪN (Giữ nguyên)
# ====================================================
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
sys.path.append(project_root)

from utils import safe_print

backend_path = os.path.join(project_root, 'Backend')
sys.path.append(backend_path)

# --- THÊM: KẾT NỐI FIREBASE ---
from db_connect import db
from firebase_admin import firestore

# ====================================================
# IMPORT MODULES BACKEND (Giữ nguyên)
# ====================================================
try:
    from Model import FirstLayerLLM
    from Chatbot import ChatBot
    from Automation import Automation
    from RealTimeSearch_engine import RealtimeSearchEngine
    from ImageGeneration import (
        GenerateImages,
        RegenerateLastImage,
        GenerateVariant,
        get_latest_image_path
    )
    from Call_engine import ZaloCaller
    from Streaming_engine import analyze_screen
    from Vision_engine import analyze_uploaded_image
    from RealtimeTools import GetWeatherJson
    from Reminder_engine import reminder_engine  
    from STT_engine import start_listening, stop_listening, get_last_result
    from TTS_engine import speak
    from Nutrition_engine import (
        analyze_food_image_engine,
        parse_voice_command_engine,
        suggest_food_engine,
        get_today_nutrition_engine,
        add_meal_engine,
        update_water_engine,
        save_user_profile_engine,
        get_user_profile_engine,
        estimate_nutrition_from_name_engine
    )
    safe_print("✅ BACKEND + FIREBASE → KẾT NỐI THÀNH CÔNG")
except Exception as e:
    safe_print("❌ IMPORT LỖI:", e)
    sys.exit(1)

# ====================================================
# KHỞI TẠO FLASK APP
# ====================================================
app = Flask(__name__)
CORS(app)

CURRENT_USER_ID = None
@app.route('/api/set_current_user', methods=['POST'])
def api_set_current_user():
    global CURRENT_USER_ID
    data = request.json
    uid = data.get('uid')
    if uid:
        CURRENT_USER_ID = uid
        safe_print(f"👤 Đã đồng bộ User ID: {CURRENT_USER_ID}")
        return jsonify({"status": "updated", "uid": CURRENT_USER_ID})
    return jsonify({"error": "No UID provided"}), 400

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../..", "Data"))
os.makedirs(DATA_DIR, exist_ok=True)

# ====================================================
# TTS STATUS
# ====================================================
is_tts_playing = False
tts_lock = threading.Lock()

def speak_with_status(text: str):
    """
    Hàm này giờ chỉ đóng vai trò Log trên Server.
    Việc đọc (TTS) sẽ do App Frontend (Mobile/Web) thực hiện khi nhận được JSON.
    """
    safe_print(f"🔇 [Server Log] Nội dung trả về cho App đọc: {text}") 
    pass

@app.route('/api/tts_status', methods=['GET'])
def api_tts_status():
    with tts_lock:
        return jsonify({'speaking': is_tts_playing})

# ====================================================
# API STT (GIỮ NGUYÊN ĐỂ TƯƠNG THÍCH CODE CŨ)
# Nhưng Mobile App sẽ không gọi vào đây nữa.
# ====================================================
@app.route('/api/start_listening', methods=['POST'])
def api_start_listening():
    try:
        # Chỉ bật mic laptop nếu cần test local, mobile không dùng cái này
        start_listening()
        return jsonify({'status': 'listening'})
    except Exception as e:
        safe_print("❌ start_listening error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/stop_listening', methods=['POST'])
def api_stop_listening():
    try:
        stop_listening()
        return jsonify({'status': 'stopped'})
    except Exception as e:
        safe_print("❌ stop_listening error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_stt_result', methods=['GET'])
def api_get_stt_result():
    try:
        text = get_last_result()
        if text:
            try: stop_listening()
            except: pass
            return jsonify({'text': text})
        return jsonify({'text': None})
    except Exception as e:
        safe_print("❌ get_stt_result error:", e)
        return jsonify({'error': str(e)}), 500

# ====================================================
# API PHÂN TÍCH ẢNH (ĐÃ SỬA: LẤY UID)
# ====================================================
@app.route('/api/analyze_image', methods=['POST'])
def api_analyze_image():
    try:
        # 👇 LẤY UID TỪ FORM DATA
        user_id = request.form.get('uid')

        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        image_file = request.files['image']

        user_prompt = request.form.get('prompt', '').strip()
        if not user_prompt:
            user_prompt = "Mô tả chi tiết nội dung ảnh này."

        filename = image_file.filename or f"upload_{int(threading.get_ident())}.jpg"
        safe_name = "".join(c for c in filename if c.isalnum() or c in '._-').rstrip()
        save_path = os.path.join(DATA_DIR, f"{int(threading.get_ident())}_{safe_name}")
        image_file.save(save_path)
        safe_print(f"📥 Received image upload -> saved to: {save_path}")

        result_text = ""
        try:
            # 👇 TRUYỀN UID VÀO ENGINE
            result_text = analyze_uploaded_image(save_path, user_prompt, user_id=user_id)
        except TypeError:
            image_file.stream.seek(0)
            result_text = analyze_uploaded_image(image_file, user_prompt, user_id=user_id)
        except Exception as e2:
            safe_print("❌ Vision_engine call failed:", e2)
            return jsonify({'error': str(e2)}), 500

        # Frontend sẽ tự đọc kết quả trả về, Server không cần speak
        return jsonify({'description': result_text})

    except Exception as e:
        safe_print("❌ /api/analyze_image error:", e)
        return jsonify({'error': str(e)}), 500

# ====================================================
# API CHÍNH /api/process (QUAN TRỌNG NHẤT)
# Đây là nơi nhận Text từ Mobile/Web gửi về
# ====================================================
@app.route('/api/process', methods=['POST'])
def api_process():
    try:
        # Nhận JSON từ Frontend (Mobile đã STT xong và gửi text lên đây)
        data = request.get_json(force=True)
        text = data.get('text', '').strip()
        
        # 👇 LẤY UID TỪ JSON FRONTEND GỬI LÊN
        user_id = data.get('uid') or CURRENT_USER_ID

        if not text: return jsonify({'error': 'No text provided'}), 400

        safe_print(f"📩 NHẬN TỪ MOBILE ({user_id}): {text}")

        def generate():
            # Đưa text vào bộ não (LLM) để phân tích ý định
            tasks = FirstLayerLLM(text)
            
            for task in tasks:
                try:
                    response_item = None
                    
                    # 1. Chat thường
                    if task.startswith('chung '):
                        # 👇 TRUYỀN UID VÀO CHATBOT ĐỂ LƯU LỊCH SỬ ĐÚNG NGƯỜI
                        res = ChatBot(task[6:], user_id=user_id)
                        response_item = {'type': 'chat', 'content': res}
                        # Server log lại, không phát âm thanh
                        speak_with_status(res)

                    # 2. Search thời gian thực
                    elif task.startswith('thời gian thực '):
                        res = RealtimeSearchEngine(task[15:], user_id=user_id)
                        response_item = {'type': 'realtime', 'content': res}
                        speak_with_status(res)

                    # 3. TẠO ẢNH
                    elif task.startswith('tạo ảnh '):
                        prompt = task[8:]
                        safe_print(f"🎨 Tạo ảnh prompt: {prompt}")
                        yield json.dumps({'type': 'image-start', 'content': prompt}) + "\n"
                        try:
                            path = GenerateImages(prompt)
                            # Đợi ảnh được tạo xong
                            for _ in range(20):
                                if os.path.exists(path) and os.path.getsize(path) > 1500: break
                                time.sleep(0.25)
                            filename = os.path.basename(path)
                            # Trả về URL ảnh cho App hiển thị
                            # LƯU Ý: Frontend dùng API_BASE từ config nên URL này chỉ cần đúng path
                            # Nhưng ở đây ta trả full url cho chắc, client sẽ xử lý
                            # Để tương thích Mobile, ta dùng path relative hoặc để client tự ghép
                            image_url = f"http://127.0.0.1:5000/data/{filename}" 
                            msg = f'Đã tạo ảnh cho: {prompt}'
                            safe_print(msg)
                            response_item = {'type': 'image', 'content': image_url}
                        except Exception as e:
                             safe_print("❌ GenerateImages error:", e)
                             response_item = {'type': 'error', 'content': str(e)}

                    # 4. Phân tích màn hình
                    elif task.startswith('phân tích màn hình '):
                        try:
                            res = analyze_screen(task[18:], user_id=user_id)
                        except TypeError:
                            res = analyze_screen(task[18:]) 
                        except Exception as e:
                            res = f"Lỗi khi phân tích màn hình: {str(e)}"

                        response_item = {'type': 'screen', 'content': res}
                        speak_with_status(str(res))

                    # 5. Phân tích ảnh upload (qua voice)
                    elif task.startswith('phân tích ảnh upload '):
                        prompt = task[21:]
                        try:
                            res = analyze_uploaded_image(None, prompt, user_id=user_id)
                            response_item = {'type': 'vision', 'content': res}
                            speak_with_status(str(res))
                        except Exception as e:
                            error_msg = f"Lỗi xử lý ảnh: {str(e)}"
                            safe_print("❌", error_msg)
                            response_item = {'type': 'error', 'content': error_msg}
                        
                    # 6. Gọi Zalo
                    elif task.startswith('gọi zalo '):
                        target = task[9:]
                        try:
                            ZaloCaller().call(target, 'audio')
                            msg = f'Đang gọi Zalo: {target}'
                        except Exception as e:
                            msg = f'Lỗi gọi Zalo: {e}'
                        response_item = {'type': 'call', 'content': msg}
                        speak_with_status(msg)

                    # 7. Nhắc nhở
                    elif task.startswith('nhắc nhở '):
                        reminder_text = task.removeprefix('nhắc nhở ')
                        try:
                            res_msg = reminder_engine.add_reminder_voice(user_id, reminder_text)
                            response_item = {'type': 'action', 'content': res_msg}
                            speak_with_status(res_msg)
                        except Exception as e:
                            err_msg = f"Lỗi tạo lịch: {str(e)}"
                            safe_print("❌", err_msg)
                            response_item = {'type': 'error', 'content': err_msg}
                            
                    # 8. Mở ứng dụng (Chỉ hoạt động trên Laptop Server)
                    elif task.startswith('mở '):
                        param = task
                        # Automation chạy trên máy Server (Laptop)
                        threading.Thread(target=lambda: asyncio.run(Automation([param]))).start()
                        response_item = {'type': 'action', 'content': f'Đang mở trên Laptop: {task[3:]}'}

                    # 9. Default action
                    else:
                        param = task
                        threading.Thread(target=lambda: asyncio.run(Automation([param]))).start()
                        response_item = {'type': 'action', 'content': f'Đã gửi lệnh: {task}'}

                    # Gửi kết quả về cho Frontend
                    if response_item:
                        yield json.dumps(response_item) + "\n"

                except Exception as e_task:
                    safe_print("❌ Lỗi task:", e_task)
                    yield json.dumps({'type': 'error', 'content': str(e_task)}) + "\n"

        return Response(stream_with_context(generate()), mimetype='application/x-ndjson')

    except Exception as e:
        safe_print("❌ /api/process error:", e)
        return jsonify({'error': str(e)}), 500

# ====================================================
# STATIC SERVE ẢNH (GIỮ NGUYÊN)
# ====================================================
@app.route('/data/<path:filename>', methods=['GET'])
def serve_data_file(filename):
    try:
        data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../..", "Data"))
        return send_from_directory(data_dir, filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ====================================================
# API LẤY ẢNH MỚI NHẤT (GIỮ NGUYÊN)
# ====================================================
@app.route('/api/get_latest_image', methods=['GET'])
def get_latest_image():
    path = get_latest_image_path()
    if not path: return jsonify({'image': None})
    
    # Chờ ảnh ghi xong
    for _ in range(20):
        if os.path.exists(path) and os.path.getsize(path) > 1500: break
        time.sleep(0.25)

    if not os.path.exists(path) or os.path.getsize(path) < 1500:
        return jsonify({'image': None})

    filename = os.path.basename(path)
    # Frontend tự ghép IP, ở đây trả full url local cũng được
    url = f"http://127.0.0.1:5000/data/{filename}"
    return jsonify({'image': url})

# ====================================================
# API LẤY LỊCH SỬ CHAT (ĐÃ SỬA: ĐỌC TỪ FIREBASE)
# ====================================================
@app.route('/api/chat_history', methods=['GET'])
def api_chat_history():
    try:
        user_id = request.args.get('uid')
        if not user_id:
            return jsonify({"history": []})

        history = []
        # 1. Lấy Chat Logs
        try:
            chat_docs = db.collection('users').document(user_id)\
                          .collection('chat_logs')\
                          .order_by('timestamp', direction=firestore.Query.DESCENDING)\
                          .limit(50).stream()
            
            for doc in chat_docs:
                d = doc.to_dict()
                history.append({
                    "type": "text",
                    "role": d.get("role"),
                    "content": d.get("content"),
                    "time": d.get("created_at") or str(d.get("timestamp"))
                })
        except Exception as e:
            print("⚠️ Lỗi đọc Chat Logs:", e)

        # 2. Lấy History (Vision/Image)
        try:
            hist_docs = db.collection('users').document(user_id)\
                          .collection('history')\
                          .order_by('timestamp', direction=firestore.Query.DESCENDING)\
                          .limit(20).stream()

            for doc in hist_docs:
                d = doc.to_dict()
                history.append({
                    "type": d.get("type", "unknown"),
                    "role": "assistant",
                    "prompt": d.get("prompt"),
                    "analysis": d.get("analysis"),
                    "image_path": d.get("image_path"),
                    "time": d.get("created_at_str")
                })
        except Exception as e:
            print("⚠️ Lỗi đọc History:", e)

        def parse_time(item):
            t_str = str(item.get("time", ""))
            try: return datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S")
            except: return datetime.min
        
        history.sort(key=parse_time)
        return jsonify({"history": history})

    except Exception as e:
        print("❌ /api/chat_history error:", e)
        return jsonify({"error": str(e)}), 500
    
# ====================================================
# API THỜI TIẾT
# ====================================================
@app.route('/api/weather_data', methods=['GET'])
def api_weather_data():
    try:
        city = request.args.get('city', default=None, type=str)
        data = GetWeatherJson(city)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ====================================================
# API REMINDERS
# ====================================================
@app.route('/api/reminders', methods=['GET'])
def get_reminders():
    user_id = request.args.get('uid')
    return jsonify(reminder_engine.get_all(user_id))

@app.route('/api/reminders', methods=['POST'])
def add_reminder():
    data = request.json
    user_id = data.get('uid')
    result = reminder_engine.add_reminder_ui(user_id, data)
    return jsonify(result)

@app.route('/api/reminders/<int:id>', methods=['DELETE'])
def delete_reminder(id):
    user_id = request.args.get('uid')
    if not user_id and request.json: user_id = request.json.get('uid')
    reminder_engine.delete_reminder(user_id, id)
    return jsonify({'status': 'deleted'})

@app.route('/api/reminders/<int:id>', methods=['PUT'])
def update_reminder(id):
    data = request.json
    user_id = data.get('uid')
    reminder_engine.update_reminder(user_id, id, data)
    return jsonify({'status': 'updated'})

# ====================================================
# API DINH DƯỠNG
# ====================================================

@app.route('/api/nutrition/today', methods=['GET'])
def api_nutrition_today():
    user_id = request.args.get('uid')
    return jsonify(get_today_nutrition_engine(user_id))

@app.route('/api/nutrition/add_meal', methods=['POST'])
def api_nutrition_add_meal():
    try:
        data = request.json
        user_id = data.get('uid')
        meal_data = data.get('meal', data) 
        
        new_meal = add_meal_engine(user_id, meal_data)
        if new_meal:
            msg = f"Đã thêm {new_meal['name']}."
            speak_with_status(msg)
            return jsonify(new_meal)
        return jsonify({"error": "Failed"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nutrition/water', methods=['POST'])
def api_nutrition_water():
    try:
        data = request.json
        user_id = data.get('uid')
        current_water = update_water_engine(user_id, 1)
        return jsonify({'water': current_water})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nutrition/analyze_image', methods=['POST'])
def api_nutrition_analyze_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        image_file = request.files['image']
        filename = f"food_{int(threading.get_ident())}.jpg"
        save_path = os.path.join(DATA_DIR, filename)
        image_file.save(save_path)
        
        result = analyze_food_image_engine(save_path)
        
        if 'name' in result and 'error' not in result:
            msg = f"Món {result['name']}, khoảng {result['calories']} calo."
            speak_with_status(msg)
        elif 'error' in result:
            speak_with_status(result['error'])
            
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nutrition/voice_command', methods=['POST'])
def api_nutrition_voice_command():
    try:
        data = request.json
        text = data.get('text', '')
        user_id = data.get('uid') 
        
        result = parse_voice_command_engine(text, user_id=user_id)
        
        if 'message' in result and result['message']:
            speak_with_status(result['message'])
        elif 'warning' in result and result['warning']:
            speak_with_status(result['warning'])
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nutrition/suggest', methods=['POST'])
def api_nutrition_suggest():
    try:
        data = request.json
        user_profile = data.get('userProfile', {})
        remaining = data.get('remainingCalories', 500)
        ignore_list = data.get('ignoreList', []) 
        preference = data.get('preference', None) 
        
        suggestions = suggest_food_engine(user_profile, remaining, ignore_list, preference)
        
        msg = "Gợi ý món ăn."
        speak_with_status(msg)
        
        return jsonify({'suggestion': suggestions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nutrition/estimate', methods=['POST'])
def api_nutrition_estimate():
    try:
        data = request.json
        name = data.get('name', '')
        result = estimate_nutrition_from_name_engine(name)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nutrition/profile', methods=['GET', 'POST'])
def api_nutrition_profile():
    if request.method == 'GET':
        user_id = request.args.get('uid')
        return jsonify(get_user_profile_engine(user_id))
    else:
        try:
            data = request.json
            user_id = data.get('uid')
            profile_data = data.get('data', data)
            save_user_profile_engine(user_id, profile_data)
            return jsonify({"status": "success"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# ====================================================
# CHẠY SERVER (HOST 0.0.0.0 ĐỂ MOBILE KẾT NỐI ĐƯỢC)
# ====================================================
if __name__ == '__main__':
    safe_print("🚀 Server đang chạy (Đã mở cổng cho Mobile)...")
    # 👇 QUAN TRỌNG: host='0.0.0.0' để chấp nhận kết nối từ điện thoại
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)