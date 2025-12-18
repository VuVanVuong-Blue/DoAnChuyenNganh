# utils.py
import sys
import io

# --- Ép stdout, stderr về UTF-8 ---
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8', errors='replace')

def safe_print(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except Exception:
        try:
            # In lại bằng cách encode sang UTF-8 an toàn
            print(*[str(a).encode('utf-8', 'replace').decode('utf-8') for a in args], **kwargs)
        except Exception as e:
            # Nếu vẫn lỗi, in dạng thuần
            print("⚠️ [safe_print error]:", e)
