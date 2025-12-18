# Backend/RealTimeSearch_engine.py
import os
import time
import requests
from dotenv import load_dotenv

# -------------------------
# Load .env
# -------------------------
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
env_path = os.path.join(project_root, ".env")
load_dotenv(env_path)

# -------------------------
# API Keys
# -------------------------
GOLD_API_KEY = os.getenv("GoldAPIKey", "").strip()
ALPHAVANTAGE_KEY = os.getenv("AlphaVantageKey", "").strip()
NEWSDATA_API_KEY = os.getenv("NewsDataApiKey", "").strip()

# -------------------------
# Optional Imports
# -------------------------
try:
    from Chatbot import ChatBot
except:
    def ChatBot(prompt: str, user_id: str = None): # Mock function
        return f"(ChatBot lỗi import) {prompt}"

try:
    from RealtimeTools import LayThongTinThoiTiet
except:
    def LayThongTinThoiTiet():
        return "Lỗi: không import được LayThongTinThoiTiet()"

try:
    from ddgs import DDGS
except:
    DDGS = None

# -------------------------
# Simple cache (Giữ nguyên)
# -------------------------
_cache = {}

def cache_set(key: str, value, ttl: int = 300):
    _cache[key] = {"value": value, "expires": time.time() + ttl}

def cache_get(key: str):
    item = _cache.get(key)
    if not item: return None
    if time.time() > item["expires"]:
        del _cache[key]
        return None
    return item["value"]

# -------------------------
# API Functions
# -------------------------

def fetch_exchange_rate(base="USD", target="VND"):
    key = f"rate:{base}:{target}"
    cached = cache_get(key)
    if cached: return cached
    url = f"https://api.exchangerate.host/latest?base={base}&symbols={target}"
    try:
        r = requests.get(url, timeout=8)
        r.raise_for_status()
        data = r.json()
        rate = data.get("rates", {}).get(target)
        if rate:
            res = {"base": base, "target": target, "rate": rate, "timestamp": data.get("date")}
            cache_set(key, res, 300)
            return res
        return {"error": "Không lấy được tỷ giá."}
    except Exception as e:
        return {"error": f"Lỗi exchangerate.host: {e}"}

def fetch_wikipedia_summary(title, sentences=3):
    key = f"wiki:{title}:{sentences}"
    cached = cache_get(key)
    if cached: return cached
    try:
        url_vi = f"https://vi.wikipedia.org/api/rest_v1/page/summary/{requests.utils.requote_uri(title)}"
        r = requests.get(url_vi, timeout=6)
        if r.status_code == 404:
            url_en = f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.requote_uri(title)}"
            r = requests.get(url_en, timeout=6)
        r.raise_for_status()
        data = r.json()
        extract = data.get("extract")
        if extract:
            short = ". ".join(extract.split(". ")[:sentences]).strip()
            cache_set(key, short, 3600)
            return short
        return {"error": "Không có dữ liệu Wikipedia."}
    except Exception as e:
        return {"error": f"Lỗi Wikipedia: {e}"}

def fetch_gold_price(currency="VND"):
    key = f"gold:{currency}"
    cached = cache_get(key)
    if cached: return cached
    if not GOLD_API_KEY: return {"error": "Thiếu GoldAPIKey trong .env"}
    url = f"https://www.goldapi.io/api/XAU/{currency}"
    headers = {"x-access-token": GOLD_API_KEY, "Content-Type": "application/json"}
    try:
        r = requests.get(url, headers=headers, timeout=8)
        r.raise_for_status()
        data = r.json()
        price = data.get("price") or data.get("ask") or data.get("bid")
        res = {"currency": currency, "price": price, "raw": data}
        cache_set(key, res, 600)
        return res
    except Exception as e:
        return {"error": f"Lỗi GoldAPI: {e}"}

def fetch_news(query, page_size=5):
    key = f"news:{query}:{page_size}"
    cached = cache_get(key)
    if cached: return cached
    if not NEWSDATA_API_KEY: return {"error": "Thiếu NewsDataApiKey trong .env"}
    url = "https://newsdata.io/api/1/news"
    params = {"apikey": NEWSDATA_API_KEY, "q": query, "language": "vi,en", "page_size": page_size}
    try:
        r = requests.get(url, params=params, timeout=8)
        r.raise_for_status()
        data = r.json()
        articles = data.get("results", [])
        summary = [{"title": a.get("title"), "description": a.get("description"), "link": a.get("link")} for a in articles]
        cache_set(key, summary, 300)
        return summary
    except Exception as e:
        return {"error": f"Lỗi NewsData.io: {e}"}

def duckduckgo_search_snippets(query, num_results=3):
    if DDGS is None: return None
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, region='vn-vi', max_results=num_results))
        snippets = [r.get("body") for r in results if r.get("body")]
        return "\n\n".join(snippets) if snippets else None
    except:
        return None

def fetch_stock_price(symbol):
    key = f"stock:{symbol.upper()}"
    cached = cache_get(key)
    if cached: return cached
    if not ALPHAVANTAGE_KEY: return {"error": "Thiếu ALPHAVANTAGE_KEY trong .env"}
    url = "https://www.alphavantage.co/query"
    params = {"function": "GLOBAL_QUOTE", "symbol": symbol, "apikey": ALPHAVANTAGE_KEY}
    try:
        r = requests.get(url, params=params, timeout=8)
        r.raise_for_status()
        data = r.json().get("Global Quote", {})
        if not data: return {"error": f"Không tìm thấy thông tin cho {symbol}"}
        stock = {
            "symbol": symbol,
            "price": float(data.get("05. price", 0)),
            "change": float(data.get("09. change", 0)),
            "change_percent": data.get("10. change percent", ""),
            "volume": int(data.get("06. volume", 0))
        }
        cache_set(key, stock, 120)
        return stock
    except Exception as e:
        return {"error": f"Lỗi AlphaVantage: {e}"}

# -------------------------
# Intent Detector
# -------------------------
def detect_intent(text):
    t = text.lower()
    if any(k in t for k in ["thời tiết", "mưa", "nắng", "weather", "nhiệt độ"]): return "weather"
    if any(k in t for k in ["tỷ giá", "exchange", "usd", "vnd", "euro"]): return "exchange_rate"
    if any(k in t for k in ["giá vàng", "vàng", "xau"]): return "gold_price"
    if any(k in t for k in ["cổ phiếu", "chứng khoán", "stock", "giá", "mã"]): return "stock"
    if any(k in t for k in ["ai là", "là ai", "tiểu sử", "who is"]): return "wiki"
    if any(k in t for k in ["tin tức", "news", "breaking"]): return "news"
    return "general"

# -------------------------
# Main Engine
# -------------------------
def RealtimeSearchEngine(prompt, user_id=None):
    if not prompt: return "Vui lòng nhập câu hỏi."
    intent = detect_intent(prompt)
    print(f"[DEBUG] Search Intent: {intent} (User: {user_id})")

    try:
        if intent == "weather":
            return LayThongTinThoiTiet()

        if intent == "exchange_rate":
            base, target = "USD", "VND"
            t = prompt.lower()
            if "eur" in t: base = "EUR"
            if "usd" in t: base = "USD"
            if "vnd/usd" in t: base, target = "VND", "USD"
            data = fetch_exchange_rate(base, target)
            return data.get("error") or f"Tỷ giá {data['base']}/{data['target']} ngày {data['timestamp']}: {data['rate']}"

        if intent == "gold_price":
            currency = "VND" if "vnd" in prompt.lower() else "USD"
            data = fetch_gold_price(currency)
            return data.get("error") or f"Giá vàng (XAU/{currency}): {data['price']}"

        if intent == "stock":
            symbol = prompt.split()[-1].upper()
            data = fetch_stock_price(symbol)
            if "error" in data: return data["error"]
            return (f"Cổ phiếu {data['symbol']}: Giá hiện tại {data['price']} USD, "
                    f"Thay đổi {data['change']} ({data['change_percent']}), "
                    f"Volume: {data['volume']}")

        if intent == "wiki":
            title = prompt.replace("ai là", "").replace("là ai", "").strip() or prompt
            summary = fetch_wikipedia_summary(title, sentences=4)
            # 👇 Đã thêm user_id vào ChatBot
            return summary if not isinstance(summary, dict) else ChatBot(prompt, user_id=user_id)

        if intent == "news":
            query = prompt.replace("tin tức", "").strip() or "news"
            data = fetch_news(query)
            if isinstance(data, dict) and "error" in data:
                snip = duckduckgo_search_snippets(prompt)
                # 👇 SỬA LỖI: Thêm user_id vào cả 2 chỗ gọi ChatBot
                return ChatBot(f"Tóm tắt tin:\n{snip}", user_id=user_id) if snip else ChatBot(prompt, user_id=user_id)
            
            text = "\n".join([f"- {a['title']}. {a['description']} [{a['link']}]" for a in data[:5]])
            # 👇 SỬA LỖI: Thêm user_id vào đây nữa
            return ChatBot(f"Tóm tắt 3 câu:\n{text}", user_id=user_id)

        # fallback
        snip = duckduckgo_search_snippets(prompt)
        if snip:
            enhanced_prompt = (
                f"[THÔNG TIN TÌM KIẾM - KHÔNG HIỂN THỊ CHO NGƯỜI DÙNG]\n"
                f"{snip}\n\n"
                f"[YÊU CẦU] Trả lời NGẮN GỌN, CHỈ 1-2 câu, không nhắc đến nguồn tìm kiếm.\n"
                f"{prompt}"
            )
            # 👇 Đã thêm user_id vào ChatBot
            return ChatBot(enhanced_prompt, user_id=user_id)
        else:
            return ChatBot(prompt, user_id=user_id)
        
    except Exception as e:
        return f"Lỗi xử lý: {e}"

# -------------------------
# CLI Runner
# -------------------------
if __name__ == "__main__":
    while True:
        q = input("User: ")
        if q == "exit": break