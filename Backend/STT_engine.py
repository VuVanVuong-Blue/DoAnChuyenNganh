# Backend/STT_engine.py - PHIÊN BẢN FULL (TỐI ƯU + TEST TOOL)
import os
import time
import threading
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# --- CẤU HÌNH & BIẾN TOÀN CỤC ---
driver = None
is_listening_active = False
last_recognized_text = ""
stt_thread = None

# Đường dẫn tuyệt đối tới file HTML (đảm bảo chạy đúng dù gọi từ đâu)
html_file_path = os.path.abspath("vist_stt_engine.html")

# --- HTML CODE (Tối ưu giao diện & Reset tự động) ---
HtmlCode = '''<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>VIST STT Engine</title></head>
<body>
  <h2 id="status" style="font-family:sans-serif; color:green;">Sẵn sàng</h2>
  <div id="output"></div>
  <script>
    // Cấu hình nhận diện giọng nói
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = new SpeechRecognition();
    
    recognition.lang = 'vi-VN'; // Bạn có thể đổi thành 'en-US' nếu muốn nghe tiếng Anh
    recognition.continuous = false; // Nghe xong 1 câu tự ngắt
    recognition.interimResults = false;

    recognition.onstart = function() { 
        document.getElementById('status').innerText = "Đang nghe...";
        document.getElementById('status').style.color = "red";
    };

    recognition.onend = function() { 
        document.getElementById('status').innerText = "Đang xử lý...";
        document.getElementById('status').style.color = "blue";
    };

    recognition.onresult = function(event) {
        var transcript = event.results[0][0].transcript;
        document.getElementById('output').innerText = transcript;
    };
    
    recognition.onerror = function(event) {
        console.error(event.error);
        document.getElementById('status').innerText = "Lỗi: " + event.error;
    };

    // Các hàm điều khiển từ Python
    function startListening() {
        try { recognition.start(); } catch (e) {}
    }
    
    function stopListening() {
        try { recognition.stop(); } catch (e) {}
    }
    
    function clearText() {
        document.getElementById('output').innerText = "";
    }
  </script>
</body>
</html>'''

# --- HÀM HỆ THỐNG (CORE) ---

def _init_stt_engine():
    """Khởi tạo Chrome Driver chạy ngầm"""
    global driver
    try:
        # Ghi file HTML
        with open(html_file_path, "w", encoding="utf-8") as f:
            f.write(HtmlCode)

        # Cấu hình Chrome Headless
        chrome_options = Options()
        chrome_options.add_argument("--use-fake-ui-for-media-stream") # Tự động cho phép Mic
        chrome_options.add_argument("--headless=new") # Chạy ẩn không hiện cửa sổ
        chrome_options.add_argument("--log-level=3") # Tắt bớt log rác
        
        # Khởi động Driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Load trang HTML
        driver.get(f"file:///{html_file_path}")
        print(">>> [STT Engine] Đã khởi động Chrome ngầm thành công.")
        
    except Exception as e:
        print(f">>> [Lỗi STT Engine] Không thể mở Chrome: {e}")

def _monitor_loop():
    """Vòng lặp chạy ngầm (Daemon) để hứng kết quả từ Chrome"""
    global driver, last_recognized_text, is_listening_active
    
    # Đảm bảo driver đã có
    if driver is None:
        _init_stt_engine()

    while True:
        # Chỉ kiểm tra khi đang ở trạng thái 'Nghe'
        if is_listening_active and driver:
            try:
                # Lấy nội dung từ thẻ div#output
                text_element = driver.find_element(By.ID, "output")
                text = text_element.text.strip()

                if text:
                    # Có kết quả -> Lưu lại
                    print(f"   (STT bắt được): {text}")
                    last_recognized_text = text
                    
                    # Reset giao diện Chrome
                    driver.execute_script("clearText();")
                    
                    # Tự động tắt mic sau khi nhận xong 1 câu
                    is_listening_active = False 
            except Exception as e:
                # Nếu mất kết nối Chrome (lỡ tay tắt), tự mở lại
                print(f"Lỗi vòng lặp: {e}")
                try: _init_stt_engine()
                except: pass
        
        time.sleep(0.1) # Check mỗi 100ms (Rất nhanh)

# --- API CHO FLASK GỌI ---

def start_listening():
    """Kích hoạt Mic ngay lập tức (qua JS Injection)"""
    global is_listening_active, last_recognized_text
    is_listening_active = True
    last_recognized_text = "" # Reset kết quả cũ
    
    if driver:
        try:
            driver.execute_script("startListening();")
            print(">>> Mic: ON")
        except:
            print(">>> Lỗi kết nối Mic, đang thử lại...")
            _init_stt_engine()

def stop_listening():
    """Tắt Mic cưỡng bức"""
    global is_listening_active
    is_listening_active = False
    if driver:
        try: driver.execute_script("stopListening();")
        except: pass

def get_last_result():
    """Lấy kết quả và xóa ngay sau khi lấy (cơ chế Queue 1 phần tử)"""
    global last_recognized_text
    if last_recognized_text:
        text = last_recognized_text
        last_recognized_text = ""
        return text
    return None

# --- TỰ ĐỘNG KHỞI CHẠY KHI IMPORT ---
# Đoạn này giúp Server Flask vừa bật lên là Chrome đã chạy sẵn
if stt_thread is None:
    stt_thread = threading.Thread(target=_monitor_loop, daemon=True)
    stt_thread.start()

# ==========================================
# PHẦN TEST (CHỈ CHẠY KHI CHẠY TRỰC TIẾP FILE NÀY)
# ==========================================
def unit_test():
    """
    Hàm kiểm tra tốc độ và độ ổn định.
    Chạy bằng lệnh: python Backend/STT_engine.py
    """
    print("\n" + "="*60)
    print("   🛠️  KIỂM TRA TỐC ĐỘ VÀ ỔN ĐỊNH (TEST TOOL)  🛠️")
    print("="*60)
    print(">> Đang chờ Chrome khởi động (lần đầu mất 2-3s)...")
    
    # Chờ 1 chút để thread _monitor_loop khởi tạo xong driver
    while driver is None:
        time.sleep(0.5)
        
    print("\n✅ ENGINE ĐÃ SẴN SÀNG! (Chrome đang chạy ẩn)")
    print("👉 Hướng dẫn: Nhấn ENTER, sau đó nói ngay. Nhấn 'q' để thoát.\n")

    while True:
        try:
            cmd = input(">> ⌨️  Nhấn ENTER để nói (hoặc 'q' để thoát): ")
            if cmd.strip().lower() == 'q':
                print("Đang đóng Engine...")
                if driver: driver.quit()
                sys.exit()

            # Bắt đầu đo thời gian
            start_ts = time.time()
            
            # Gọi hàm kích hoạt (giống hệt nút bấm trên React)
            start_listening() 
            print("🎤 Đang nghe... (Nói đi!)")
            
            # Vòng lặp chờ kết quả (Giống Frontend polling)
            got_result = False
            while time.time() - start_ts < 10: # Timeout 10s
                res = get_last_result()
                if res:
                    duration = round(time.time() - start_ts, 2)
                    print(f"\n🚀 KẾT QUẢ: '{res}'")
                    print(f"⚡ Tổng thời gian (Nghe + Xử lý): {duration} giây")
                    got_result = True
                    break
                time.sleep(0.05) # Polling cực nhanh
            
            if not got_result:
                print("\n⚠️ Hết giờ! Không nghe thấy gì.")
            
            print("-" * 50)

        except KeyboardInterrupt:
            print("\nThoát.")
            if driver: driver.quit()
            break

if __name__ == "__main__":
    unit_test()