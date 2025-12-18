import pyautogui
import time
import os
import subprocess
import pygetwindow as gw
from PIL import Image
from unidecode import unidecode  # ✅ Thêm: bỏ dấu tiếng Việt

class ZaloCaller:
    def __init__(self):
        # Đường dẫn tới Zalo Desktop
        self.app_path = rf"C:\Users\{os.getlogin()}\AppData\Local\Programs\Zalo\Zalo.exe"

        # Ảnh mẫu cho nút gọi
        base_dir = os.path.join(os.path.dirname(__file__), "Assets")
        self.icon_audio_path = os.path.join(base_dir, "goi_thoai.png")
        self.icon_video_path = os.path.join(base_dir, "goi_video.png")

    def open_zalo(self):
        """Mở ứng dụng Zalo Desktop"""
        if not os.path.exists(self.app_path):
            print(f"❌ Không tìm thấy Zalo tại: {self.app_path}")
            return False

        print("🚀 Đang mở Zalo Desktop...")
        subprocess.Popen([self.app_path])
        time.sleep(4)

        zalo_windows = [w for w in gw.getWindowsWithTitle("Zalo")]
        if zalo_windows:
            zalo_windows[0].activate()
            zalo_windows[0].maximize()
            print("✅ Zalo đã mở và sẵn sàng.")
            time.sleep(1)
            return True
        else:
            print("⚠️ Không tìm thấy cửa sổ Zalo.")
            return False

    def auto_scale_image(self, img_path: str):
        """Tự động scale ảnh mẫu theo độ phân giải"""
        if not os.path.exists(img_path):
            print("⚠️ Không tìm thấy ảnh mẫu:", img_path)
            return None

        screen_w, screen_h = pyautogui.size()
        base_w, base_h = (1920, 1080)
        scale_factor = screen_w / base_w
        print(f"🔧 Phát hiện màn hình {screen_w}x{screen_h}, scale ≈ {scale_factor:.2f}x")

        img = Image.open(img_path)
        new_size = (int(img.width * scale_factor), int(img.height * scale_factor))
        scaled_img_path = os.path.join(os.path.dirname(img_path), "_scaled_tmp.png")
        img.resize(new_size).save(scaled_img_path)

        return scaled_img_path

    def find_and_call(self, contact_name: str, mode: str = "audio"):
        """Tìm liên hệ và nhấn nút gọi thoại hoặc video"""
        try:
            print(f"🔍 Đang tìm liên hệ: {contact_name}")

            # ✅ Tự động bỏ dấu để tương thích tìm kiếm Zalo
            name_no_diacritic = unidecode(contact_name)
            print(f"🔎 Đang tìm (không dấu): {name_no_diacritic}")

            # Mở khung tìm kiếm
            pyautogui.hotkey("ctrl", "f")
            time.sleep(0.5)

            # Nhập tên (không dấu)
            pyautogui.typewrite(name_no_diacritic, interval=0.05)
            pyautogui.press("enter")
            time.sleep(3)

            # Xác định loại gọi
            icon_path = self.icon_audio_path if mode == "audio" else self.icon_video_path
            scaled_icon = self.auto_scale_image(icon_path)
            if not scaled_icon:
                return False

            print(f"📸 Đang tìm nút gọi {'thoại' if mode == 'audio' else 'video'}...")
            button_pos = pyautogui.locateOnScreen(scaled_icon, confidence=0.8)

            if button_pos:
                center = pyautogui.center(button_pos)
                pyautogui.moveTo(center.x, center.y, duration=0.3)
                pyautogui.click()
                print(f"✅ Đã click vào nút gọi {'thoại' if mode == 'audio' else 'video'}!")
                return True
            else:
                print("❌ Không phát hiện được nút gọi (ảnh mẫu có thể không khớp).")
                return False

        except Exception as e:
            import traceback
            print("❌ Lỗi khi thao tác trong Zalo:")
            traceback.print_exc()
            return False

    def call(self, contact_name: str, mode: str = "audio"):
        """Thực hiện quy trình gọi đầy đủ"""
        if not self.open_zalo():
            return
        self.find_and_call(contact_name, mode=mode)


# --- Test (chạy độc lập) ---
if __name__ == "__main__":
    caller = ZaloCaller()
    ten_nguoi = input("Nhập tên người cần gọi: ").strip()
    loai_goi = input("Chọn kiểu gọi (audio/video): ").strip().lower()

    if ten_nguoi:
        if loai_goi not in ["audio", "video"]:
            loai_goi = "audio"
        caller.call(ten_nguoi, mode=loai_goi)
    else:
        print("⚠️ Bạn chưa nhập tên liên hệ.")
