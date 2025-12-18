# Backend/Model.py (ĐÃ NÂNG CẤP)
import sys
import os 
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
sys.path.append(project_root)

import cohere
from dotenv import load_dotenv
from utils import safe_print
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

CohereAPIKey = os.getenv("CohereAPIKey")

# Kiểm tra xem key có được nạp không
if not CohereAPIKey:
    print("❌ Lỗi: Không tìm thấy 'CohereAPIKey' trong file .env (đã kiểm tra ở thư mục gốc).")
    print("👉 Vui lòng kiểm tra lại file .env có nằm ở thư mục gốc (cùng cấp với Backend/) không.")
    exit()

# Create a Cohere client using the provided API key.
try:
    co = cohere.Client(api_key=CohereAPIKey)
    print("✅ Đã kết nối tới Cohere.")
except Exception as e:
    print(f"❌ Lỗi khởi tạo Cohere Client: {e}")
    exit()


# === 2. NÂNG CẤP: Thêm chức năng mới ===
# Define a list of recognized function keywords for task categorization (Tiếng Việt).
# Các từ khóa này PHẢI khớp với định dạng output trong preamble
funcs = [
    "thoát", "chung", "thời gian thực", "mở", "đóng", "phát",
    "tạo ảnh", "hệ thống", "nội dung", "tìm google",
    "tìm youtube", "nhắc nhở",
    "gọi zalo", "phân tích màn hình"  # <<< THÊM MỚI
]
# === Hết phần nâng cấp ===

# Initialize an empty list to store user messages (Không cần thiết nếu dùng chat_stream)
# messages = []

# === 3. NÂNG CẤP: Cập nhật Preamble ===
# Define the preamble (Tiếng Việt)
preamble = """
Bạn là một Mô hình Ra Quyết Định cực kỳ chính xác, chuyên phân loại loại truy vấn được đưa ra.
Nhiệm vụ của bạn là xác định xem truy vấn thuộc loại 'chung', 'thời gian thực', hay yêu cầu thực hiện tác vụ/tự động hóa.
*** Tuyệt đối không trả lời truy vấn, chỉ phân loại nó. ***

-> Phản hồi với định dạng 'chung ( truy vấn )' nếu truy vấn có thể được trả lời bởi một mô hình LLM (chatbot hội thoại) và không cần thông tin cập nhật. Ví dụ:
    - Nếu truy vấn là 'Hồ Chí Minh là ai?' => phản hồi 'chung Hồ Chí Minh là ai?'
    - Nếu truy vấn là 'Cảm ơn, tôi rất thích.' => phản hồi 'chung cảm ơn, tôi rất thích.'
    - Phản hồi 'chung ( truy vấn )' nếu hỏi về thời gian. Ví dụ: 'mấy giờ rồi?' => 'chung mấy giờ rồi?'

-> Phản hồi với định dạng 'thời gian thực ( truy vấn )' nếu truy vấn KHÔNG thể được trả lời bởi LLM (vì thiếu dữ liệu thời gian thực) và cần thông tin cập nhật. Ví dụ:
    - Nếu truy vấn là 'thủ tướng Việt Nam là ai?' => phản hồi 'thời gian thực thủ tướng Việt Nam là ai?'
    - Nếu hỏi về người hoặc vật cụ thể. Ví dụ: 'Sơn Tùng M-TP là ai?' => 'thời gian thực Sơn Tùng M-TP là ai?', 'tin tức hôm nay?' => 'thời gian thực tin tức hôm nay?'

-> Phản hồi với định dạng 'mở ( tên ứng dụng hoặc website )' nếu truy vấn yêu cầu mở ứng dụng. Ví dụ: 'mở facebook', 'mở telegram'.

-> Phản hồi với định dạng 'đóng ( tên ứng dụng )' nếu truy vấn yêu cầu đóng ứng dụng. Ví dụ: 'đóng notepad', 'đóng facebook'.

-> Phản hồi với định dạng 'phát ( tên bài hát )' nếu truy vấn yêu cầu phát bài hát. Ví dụ: 'phát Nấu ăn cho em'.

-> Phản hồi với định dạng 'tạo ảnh ( mô tả ảnh )' nếu truy vấn yêu cầu tạo ảnh với mô tả. Ví dụ: 'tạo ảnh con sư tử'.

-> Phản hồi với định dạng 'nhắc nhở ( thời gian nội dung )' nếu truy vấn yêu cầu đặt lời nhắc. Ví dụ: 'nhắc tôi 9h tối mai họp' => phản hồi 'nhắc nhở 9:00pm ngày mai họp'.

-> Phản hồi với định dạng 'hệ thống ( tên tác vụ )' nếu truy vấn yêu cầu tắt tiếng, bật tiếng, tăng/giảm âm lượng...

-> Phản hồi với định dạng 'nội dung ( chủ đề )' nếu truy vấn yêu cầu viết bất kỳ loại nội dung nào (đơn, code, email...) về một chủ đề.

-> Phản hồi với định dạng 'tìm google ( chủ đề )' nếu truy vấn yêu cầu tìm kiếm trên Google.

-> Phản hồi với định dạng 'tìm youtube ( chủ đề )' nếu truy vấn yêu cầu tìm kiếm trên YouTube.

*** CÁC LỆNH MỚI ***
-> Phản hồi với định dạng 'gọi zalo ( tên người liên hệ )' nếu truy vấn yêu cầu gọi Zalo.
    - Ví dụ: 'gọi cho mẹ trên zalo' => phản hồi 'gọi zalo mẹ'.
    - Ví dụ: 'gọi video cho ba bằng zalo' => phản hồi 'gọi zalo ba'. (Hàm call_engine sẽ tự xử lý audio/video, chỉ cần tên)

-> Phản hồi với định dạng 'phân tích màn hình ( câu hỏi )' nếu truy vấn yêu cầu nhìn, phân tích hoặc hỏi về nội dung trên màn hình.
    - Ví dụ: 'cái nút này dùng để làm gì?' => 'phân tích màn hình cái nút này dùng để làm gì?'.
    - Ví dụ: 'bạn thấy gì trên màn hình?' => 'phân tích màn hình bạn thấy gì trên màn hình?'.
    - Ví dụ: 'tóm tắt nội dung này giúp tôi' => 'phân tích màn hình tóm tắt nội dung trên màn hình'.

*** QUAN TRỌNG ***
-> Nếu truy vấn yêu cầu nhiều tác vụ như 'mở facebook và gọi zalo cho mẹ' => phản hồi 'mở facebook, gọi zalo mẹ'
-> Nếu người dùng nói lời tạm biệt hoặc muốn kết thúc như 'tạm biệt vist.' => phản hồi 'thoát'.
-> Phản hồi 'chung ( truy vấn )' nếu bạn không thể phân loại hoặc nếu yêu cầu một tác vụ không được liệt kê ở trên.
"""
# === Hết phần nâng cấp ===


# Define a chat history (Tiếng Việt)
ChatHistory = [
    {'role': 'User', 'message': "bạn khoẻ không?"},
    {'role': 'Chatbot', 'message': "chung bạn khoẻ không?"},
    {'role': 'User', 'message': "mở chrome và kể tôi nghe về Hồ Chí Minh."},
    {'role': 'Chatbot', 'message': "mở chrome, chung kể tôi nghe về Hồ Chí Minh."},
    {'role': 'User', 'message': "hôm nay ngày mấy và tiện thể nhắc tôi có buổi biểu diễn nhảy vào 11h tối ngày 5 tháng 8"},
    {'role': 'Chatbot', 'message': "chung hôm nay ngày mấy, nhắc nhở 11:00pm 5 tháng 8 buổi biểu diễn nhảy"},
    # Thêm ví dụ cho lệnh mới
    {'role': 'User', 'message': "Bạn thấy gì trên màn hình và gọi zalo cho Ba nhé."},
    {'role': 'Chatbot', 'message': "phân tích màn hình bạn thấy gì trên màn hình, gọi zalo Ba"}
]

# Define the main function for decision-making on queries.
def FirstLayerLLM(prompt: str = "test"):
    """
    Hàm này nhận prompt (text từ STT), gọi Cohere để phân loại,
    và trả về một list các nhiệm vụ đã được lọc.
    Ví dụ: ['mở facebook', 'chung thời tiết hôm nay']
    """
    
    # (Code gọi API Cohere - ĐÃ SỬA LỖI)
    try:
        # --- PHẦN SỬA LỖI ---
        # 1. Đổi co.chat_stream() thành co.chat() 
        #    (Hàm chat_stream đã bị gỡ bỏ ở thư viện Cohere v5)
        response = co.chat(
            model='command-nightly', 
            message=prompt, 
            temperature=0.7, 
            chat_history=ChatHistory, 
            prompt_truncation='OFF', 
            connectors=[], 
            preamble=preamble 
            # Bỏ stream=True vì code của bạn không cần stream
        )

        # 2. Lấy text trực tiếp từ response, không cần vòng lặp for
        Response_str = response.text
        # --- KẾT THÚC SỬA LỖI ---


        # Xử lý chuỗi trả về từ Cohere (giữ nguyên)
        Response_str = Response_str.replace("\n","").strip()
        Response_list = Response_str.split(", ") # Tách các lệnh/truy vấn
        Response_list = [i.strip() for i in Response_list if i.strip()] # Loại bỏ khoảng trắng thừa

        # Lọc lại để đảm bảo chỉ trả về các lệnh hợp lệ (giữ nguyên)
        valid_tasks = []
        for task in Response_list:
            if any(task.startswith(func + ' ') or task == func for func in funcs):
                 valid_tasks.append(task)
            elif task.startswith('chung '):
                 valid_tasks.append(task)

        if not valid_tasks and prompt: 
            valid_tasks.append(f'chung {prompt}')
            
        return valid_tasks

    except Exception as e:
        print(f"❌ Lỗi khi gọi Cohere API: {e}")
        return [f"chung Lỗi khi phân loại lệnh: {e}"]
    

# Entry point for the script (Dùng để test)
if __name__ == '__main__':
    print("🤖 Model.py (ĐÃ NÂNG CẤP) đang chạy để test...")
    print("Nhập câu lệnh của bạn (gõ 'quit' để thoát):")
    while True:
        user_input = input(">> ")
        if user_input.lower() == 'quit':
            break
        categorized_tasks = FirstLayerLLM(user_input)
        print("Phân loại:", categorized_tasks)