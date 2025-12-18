# Backend/RealtimeTools.py
import os
import datetime
import requests
from dotenv import load_dotenv

# --- Nạp API Key ---
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

WEATHER_API_KEY = os.getenv("WeatherAPIKey")

# =========================================================
# PHẦN GIỮ NGUYÊN (CHO CHATBOT & SYSTEM CŨ)
# =========================================================

def LayThongTinThoiGianThuc():
    """Lấy chuỗi thông tin thời gian hiện tại."""
    now = datetime.datetime.now()
    days_vi = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]
    day_name = days_vi[now.weekday()]
    return now.strftime(f"Hôm nay là {day_name}, ngày %d tháng %m năm %Y, lúc %H:%M:%S.")

def LayThongTinThoiTiet():
    """Lấy thông tin thời tiết hiện tại dựa vào IP thiết bị (Code cũ)."""
    if not WEATHER_API_KEY:
        print("❌ Lỗi: Thiếu WeatherAPIKey trong file .env (RealtimeTools)")
        return "⚠️ Xin lỗi, tôi không thể lấy thông tin thời tiết vì thiếu API Key."

    try:
        res = requests.get("https://ipinfo.io/json", timeout=5)
        data = res.json()
        loc = data.get("loc", "")
        city = data.get("city", "Không rõ")
        if not loc: return "Không thể xác định vị trí thiết bị."
        lat, lon = loc.split(",")

        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric&lang=vi"
        weather_res = requests.get(url, timeout=5)
        weather_data = weather_res.json()

        if weather_data.get("cod") != 200:
             msg = weather_data.get("message", "Không rõ lỗi")
             return f"⚠️ Lỗi OpenWeatherMap: {msg} (thành phố: {city})"

        desc = weather_data["weather"][0]["description"]
        main = weather_data["weather"][0]["main"]
        temp = weather_data["main"]["temp"]
        feels = weather_data["main"].get("feels_like", temp)
        hum = weather_data["main"]["humidity"]

        raining = "mưa" in desc.lower() or "rain" in main.lower()
        if raining:
            rain_text = "☔ Có vẻ trời đang mưa, bạn ra ngoài nhớ mang theo ô nhé!"
        else:
            rain_text = "🌤️ Trời không mưa, thời tiết khá đẹp."

        return (
            f"Thời tiết tại {city} hiện tại: {desc}, nhiệt độ là {temp:.1f}°C "
            f"(cảm giác như {feels:.1f}°C), độ ẩm {hum}%. {rain_text}"
        )
    except Exception as e:
        print(f"❌ Lỗi nghiêm trọng khi lấy thời tiết: {e}")
        return f"❌ Xin lỗi, đã xảy ra lỗi khi lấy thông tin thời tiết: {e}"


# =========================================================
# PHẦN THÊM MỚI (CHO UI WEATHER SCREEN - DÙNG OPEN-METEO)
# =========================================================

def convert_wmo_to_owm(code, is_day=True):
    """Helper: Đổi mã Open-Meteo sang mã Icon OpenWeatherMap để UI hiển thị"""
    suffix = "d" if is_day else "n"
    if code == 0: return f"01{suffix}" # Clear sky
    if code in [1, 2]: return f"02{suffix}" # Partly cloudy
    if code == 3: return f"04{suffix}" # Overcast
    if code in [45, 48]: return f"50{suffix}" # Fog
    if code in [51, 53, 55]: return f"09{suffix}" # Drizzle
    if code in [61, 63, 65]: return f"10{suffix}" # Rain
    if code in [80, 81, 82]: return f"09{suffix}" # Rain showers
    if code in [95, 96, 99]: return f"11{suffix}" # Thunderstorm
    if code in [71, 73, 75, 77, 85, 86]: return f"13{suffix}" # Snow
    return f"02{suffix}"

def GetWeatherJson(city_name=None):
    """
    Trả về JSON chi tiết cho UI (bao gồm Hourly Forecast).
    Kết hợp: Geocoding (OpenWeatherMap) + Data (Open-Meteo).
    """
    try:
        lat, lon = None, None
        display_name = ""

        # 1. Xác định vị trí
        if not city_name or city_name in ["Vị trí hiện tại", ""]:
            # Lấy theo IP (giống logic cũ)
            try:
                res = requests.get("https://ipinfo.io/json", timeout=5)
                data = res.json()
                loc = data.get("loc", "").split(",")
                if len(loc) == 2:
                    lat, lon = float(loc[0]), float(loc[1])
                    # Lấy tên thành phố từ IP Info hoặc OpenWeatherMap Reverse Geo nếu cần chuẩn xác hơn
                    # Ở đây dùng tạm IP Info city hoặc fallback
                    display_name = data.get("city", "Vị trí của bạn")
            except:
                return {"error": "Lỗi định vị IP"}
        else:
            # Tìm theo tên thành phố (Dùng Key cũ của bạn để tìm tọa độ)
            if not WEATHER_API_KEY: return {"error": "Thiếu API Key để tìm thành phố"}
            
            geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={city_name}&limit=1&appid={WEATHER_API_KEY}"
            try:
                geo_res = requests.get(geo_url, timeout=5).json()
                if geo_res:
                    lat = geo_res[0]['lat']
                    lon = geo_res[0]['lon']
                    display_name = geo_res[0]['name'] # Tên chuẩn quốc tế
                else:
                    return {"error": f"Không tìm thấy: {city_name}"}
            except:
                return {"error": "Lỗi kết nối Geocoding"}

        if lat is None or lon is None:
            return {"error": "Không xác định được tọa độ"}

        # 2. Gọi Open-Meteo (API Free xịn cho Hourly)
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&"
            f"current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure,visibility&"
            f"hourly=temperature_2m,weather_code&"
            f"timezone=auto&forecast_days=2"
        )
        
        res = requests.get(url, timeout=5).json()
        if "error" in res: return {"error": "Lỗi Open-Meteo"}

        # 3. Xử lý dữ liệu trả về
        current = res["current"]
        hourly = res["hourly"]
        
        now_hour = datetime.datetime.now().hour
        is_day = 6 <= now_hour <= 18
        icon_code_current = convert_wmo_to_owm(current["weather_code"], is_day)

        # Map code sang tiếng Việt
        weather_desc = "Có mây"
        c = current["weather_code"]
        if c == 0: weather_desc = "Trời quang"
        elif c in [1, 2, 3]: weather_desc = "Nhiều mây"
        elif c in [61, 63, 65, 80, 81, 82]: weather_desc = "Mưa"
        elif c >= 95: weather_desc = "Dông bão"

        # Xử lý Hourly (lấy 12 mốc tiếp theo)
        hourly_data = []
        current_iso = datetime.datetime.now().strftime("%Y-%m-%dT%H:00")
        try:
            start_index = 0
            for i, t in enumerate(hourly["time"]):
                if t >= current_iso:
                    start_index = i
                    break
            
            for i in range(start_index, start_index + 12):
                if i >= len(hourly["time"]): break
                raw_time = hourly["time"][i]
                time_str = raw_time.split("T")[1] # Lấy giờ "14:00"
                
                h_val = int(time_str.split(":")[0])
                h_is_day = 6 <= h_val <= 18
                
                hourly_data.append({
                    "time": time_str,
                    "temp": round(hourly["temperature_2m"][i]),
                    "icon_code": convert_wmo_to_owm(hourly["weather_code"][i], h_is_day)
                })
        except: pass

        return {
            "city": display_name,
            "temp": round(current["temperature_2m"]),
            "temp_min": round(min(hourly["temperature_2m"][:24])),
            "temp_max": round(max(hourly["temperature_2m"][:24])),
            "desc": weather_desc,
            "icon_code": icon_code_current,
            "humidity": f"{current['relative_humidity_2m']}%",
            "wind_speed": f"{current['wind_speed_10m']} km/h",
            "pressure": f"{round(current['surface_pressure'])} hPa",
            "visibility": f"{round(current['visibility'] / 1000, 1)} km",
            "hourly": hourly_data
        }

    except Exception as e:
        print(f"❌ Lỗi GetWeatherJson: {e}")
        return {"error": str(e)}