import { motion, AnimatePresence } from 'motion/react';
import { Plus, Droplet, Camera, Edit3, X, Upload, Mic, Lightbulb, User, RefreshCw } from 'lucide-react';
import { TopBar } from './TopBar';
import { useState, useEffect, useRef } from 'react';
import { speak } from '../utils/tts';

// 👇 1. IMPORT TỪ CONFIG CHUNG
import { API_BASE } from '../config';

// 👇 2. CHỈ CẦN IMPORT CAPACITOR ĐỂ CHECK NỀN TẢNG (KHÔNG DÙNG PLUGIN VOICE NỮA)
import { Capacitor } from '@capacitor/core';

interface Meal {
  id: number;
  name: string;
  time: string;
  calories: number;
  icon: string;
}

interface SuggestionItem {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  icon: string;
  desc: string;
}

interface NutritionScreenProps {
  onNavigate?: (screen: string) => void;
  user: { uid: string };
}

export function NutritionScreen({ onNavigate, user }: NutritionScreenProps) {
  // --- STATE DỮ LIỆU ---
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [animatedCalories, setAnimatedCalories] = useState(0);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [userGoal, setUserGoal] = useState(2000);

  const [macros, setMacros] = useState({
    protein: { current: 0, goal: 120, color: '#007BFF' },
    carbs: { current: 0, goal: 250, color: '#F59E0B' },
    fat: { current: 0, goal: 65, color: '#FF6B9D' }
  });

  // --- UI STATES ---
  const [isFABOpen, setIsFABOpen] = useState(false);
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Ref cho Camera thật
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // State Mic (Web API)
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const webRecognition = useRef<any>(null); // Chỉ dùng Web Ref

  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [suggestionsList, setSuggestionsList] = useState<SuggestionItem[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPreference, setCurrentPreference] = useState<string | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Form nhập tay
  const [manualForm, setManualForm] = useState({
    name: '', calories: '', protein: '', carbs: '', fat: '', time: ''
  });

  // Form Profile
  const [profileForm, setProfileForm] = useState({
    gender: 'male',
    age: '',
    height: '',
    weight: '',
    activityLevel: 'medium',
    goal: 'maintain',
    dailyCalories: '2000',
  });

  // --- TÍNH TOÁN CALO TỰ ĐỘNG (Auto-Calc) ---
  useEffect(() => {
    if (isProfileOpen) {
      const w = parseFloat(profileForm.weight);
      const h = parseFloat(profileForm.height);
      const a = parseFloat(profileForm.age);

      if (w > 0 && h > 0 && a > 0) {
        // 1. Tính BMR (Mifflin-St Jeor)
        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr += (profileForm.gender === 'male' ? 5 : -161);

        // 2. Nhân hệ số hoạt động (TDEE)
        let activityMult = 1.2; // default low
        if (profileForm.activityLevel === 'medium') activityMult = 1.55;
        if (profileForm.activityLevel === 'high') activityMult = 1.9;

        let tdee = bmr * activityMult;

        // 3. Điều chỉnh theo mục tiêu
        if (profileForm.goal === 'lose') tdee -= 500;
        if (profileForm.goal === 'gain') tdee += 500;

        // Cập nhật ô dailyCalories tự động
        setProfileForm(prev => ({
          ...prev,
          dailyCalories: Math.round(tdee).toString()
        }));
      }
    }
  }, [profileForm.age, profileForm.height, profileForm.weight, profileForm.gender, profileForm.activityLevel, profileForm.goal, isProfileOpen]);


  // --- 1. LOAD DATA ---
  const fetchData = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/today?uid=${user.uid}`);
      const data = await res.json();
      setCaloriesConsumed(data.total_calories || 0);
      setWaterGlasses(data.water || 0);
      setMeals((data.meals || []).map((m: any) => ({
        id: m.id, name: m.name, time: m.time, calories: m.calories, icon: m.icon || '🍽️'
      })));
      if (data.macros) {
        setMacros(prev => ({
          protein: { ...prev.protein, current: data.macros.protein },
          carbs: { ...prev.carbs, current: data.macros.carbs },
          fat: { ...prev.fat, current: data.macros.fat }
        }));
      }

      const proRes = await fetch(`${API_BASE}/api/nutrition/profile?uid=${user.uid}`);
      const proData = await proRes.json();
      setProfileForm(prev => ({
        ...prev, ...proData,
        age: proData.age?.toString() || '',
        height: proData.height?.toString() || '',
        weight: proData.weight?.toString() || '',
        dailyCalories: proData.dailyCalories?.toString() || '2000'
      }));
      setUserGoal(Number(proData.dailyCalories) || 2000);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [user]);

  // --- 2. ANIMATION ---
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = caloriesConsumed / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= caloriesConsumed) {
        setAnimatedCalories(caloriesConsumed);
        clearInterval(timer);
      } else {
        setAnimatedCalories(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [caloriesConsumed]);

  const caloriesPercentage = (animatedCalories / userGoal) * 100;
  const remainingCalories = userGoal - caloriesConsumed;
  const getCaloriesColor = () => {
    if (caloriesPercentage < 60) return '#10B981';
    if (caloriesPercentage < 90) return '#F59E0B';
    return '#EF4444';
  };

  // =========================================================
  // SETUP MIC (CHIẾN THUẬT WEB SPEECH API - FIX CHO MOBILE VIVO/XIAOMI)
  // =========================================================

  const startSTT = () => {
    if (!user?.uid) return;

    // 👇 LOGIC MỚI: Dùng Web API trực tiếp (Native Browser)
    const SpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechAPI) {
      alert("❌ Máy của bạn không hỗ trợ Web Speech API. Hãy cập nhật 'Android System WebView'.");
      return;
    }

    try {
      const recognition = new SpeechAPI();
      recognition.lang = 'vi-VN';
      recognition.continuous = false; 
      recognition.interimResults = false;

      // SỰ KIỆN 1: BẮT ĐẦU
      recognition.onstart = () => {
        console.log("🎙️ Nutrition Mic: Đã bật");
        setIsListening(true);
      };

      // SỰ KIỆN 2: CÓ KẾT QUẢ
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        console.log("✅ Nutrition Mic nghe được:", text);
        
        recognition.stop();
        handleVoiceCommand(text);
      };

      // SỰ KIỆN 3: LỖI
      recognition.onerror = (event: any) => {
        console.error("🔴 Nutrition Mic Lỗi:", event.error);
        if (event.error === 'not-allowed') {
            alert("⚠️ Vui lòng cấp quyền Micro cho trình duyệt/webview!");
        }
        setIsListening(false);
      };

      // SỰ KIỆN 4: KẾT THÚC
      recognition.onend = () => {
        setIsListening(false);
      };

      webRecognition.current = recognition;
      recognition.start();

    } catch (e) {
      alert("❌ Lỗi Mic: " + JSON.stringify(e));
      setIsListening(false);
    }
  };

  const stopSTT = () => {
    if (webRecognition.current) {
      webRecognition.current.stop();
    }
    setIsListening(false);
  };

  // Cleanup Mic khi rời trang
  useEffect(() => {
    return () => {
      if (webRecognition.current) {
        webRecognition.current.stop();
      }
    };
  }, []);

  // D. Hàm Xử lý lệnh sau khi nghe xong
  const handleVoiceCommand = async (text: string) => {
    if (!text) return;
    setIsMicOpen(false); // Đóng modal mic

    try {
      // Gửi text lên API xử lý dinh dưỡng
      const aiRes = await fetch(`${API_BASE}/api/nutrition/voice_command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, uid: user.uid })
      });
      const aiData = await aiRes.json();

      if (aiData.message) {
        speak(aiData.message);
      }

      // Xử lý Intent trả về
      if (aiData.intent === 'fill_manual_input') {
        setManualForm({
          name: aiData.data.name || '',
          calories: aiData.data.calories?.toString() || '',
          protein: aiData.data.protein?.toString() || '',
          carbs: aiData.data.carbs?.toString() || '',
          fat: aiData.data.fat?.toString() || '',
          time: aiData.data.time || '',
        });
        setIsManualInputOpen(true);
      } else if (aiData.intent === 'suggestion') {
        setIsSuggestionsOpen(true);
        if (aiData.preference) {
          setSearchQuery(aiData.preference);
          handleSearchSubmit(aiData.preference);
        } else {
          handleSearchSubmit('');
        }
      } else if (aiData.intent === 'fill_profile') {
        if (aiData.data) {
          setProfileForm(prev => ({ ...prev, ...aiData.data }));
          setIsProfileOpen(true);
          alert("Đã nhận thông tin hồ sơ!");
        }
      } else if (aiData.intent === 'camera' || text.toLowerCase().includes("chụp ảnh")) {
        // Mở camera thật nếu là mobile
        if (Capacitor.isNativePlatform() && cameraInputRef.current) {
          cameraInputRef.current.click();
        } else {
          setIsCameraOpen(true);
        }
      }

    } catch (e) {
      console.error(e);
      alert("Lỗi xử lý lệnh giọng nói");
    }
  };

  // --- CÁC HÀM KHÁC (GIỮ NGUYÊN) ---
  const handleAddWater = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/water`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid })
      });
      const data = await res.json();
      setWaterGlasses(data.water);

      const target = 8;
      if (data.water >= target) {
        speak("Tuyệt vời! Bạn đã uống đủ nước cho ngày hôm nay.");
      } else {
        const remain = target - data.water;
        speak(`Đã uống ${data.water} cốc. Cố lên, bạn cần uống thêm ${remain} cốc nữa.`);
      }

    } catch (e) { console.error(e); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result as string); };
      reader.readAsDataURL(file);

      if (!isCameraOpen) setIsCameraOpen(true);
      e.target.value = '';
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageFile || !user?.uid) return;
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('uid', user.uid);

      const res = await fetch(`${API_BASE}/api/nutrition/analyze_image`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setIsAnalyzing(false);

      if (data.error) {
        speak("Không nhận diện được món ăn.");
        alert("Lỗi: " + data.error);
      } else {
        speak(`Đã nhận diện món ${data.name || 'này'}, khoảng ${data.calories} calo.`);

        setIsCameraOpen(false);
        setImagePreview(null);
        setImageFile(null);
        setManualForm({
          name: data.name || 'Món từ ảnh',
          calories: data.calories?.toString() || '0',
          protein: data.protein?.toString() || '0',
          carbs: data.carbs?.toString() || '0',
          fat: data.fat?.toString() || '0',
          time: data.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        });
        setIsManualInputOpen(true);
      }
    } catch (e) {
      setIsAnalyzing(false);
      alert("Lỗi kết nối server");
    }
  };

  const handleNameBlur = async () => {
    if (!manualForm.name) return;
    if (manualForm.calories && manualForm.calories !== '0') return;
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: manualForm.name })
      });
      const data = await res.json();
      if (data.calories) {
        setManualForm(prev => ({
          ...prev,
          calories: data.calories.toString(),
          protein: data.protein?.toString(),
          carbs: data.carbs?.toString(),
          fat: data.fat?.toString(),
          time: prev.time || data.time
        }));
      }
    } catch (e) { console.error("Auto-fill error:", e); }
  };

  const handleManualSubmit = async () => {
    if (!user?.uid) return;
    try {
      const newCalories = parseInt(manualForm.calories || '0');
      const isOverLimit = (caloriesConsumed + newCalories) > userGoal;
      const overAmount = (caloriesConsumed + newCalories) - userGoal;

      const res = await fetch(`${API_BASE}/api/nutrition/add_meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          meal: {
            name: manualForm.name,
            calories: newCalories,
            protein: parseInt(manualForm.protein || '0'),
            carbs: parseInt(manualForm.carbs || '0'),
            fat: parseInt(manualForm.fat || '0'),
            time: manualForm.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }
        })
      });

      if (res.ok) {
        if (isOverLimit) {
          speak(`Cảnh báo! Món này khiến bạn vượt quá mục tiêu ${overAmount} ca lo. Hãy chú ý nhé!`);
        } else {
          speak(`Đã thêm món ${manualForm.name}. Bạn vẫn đang giữ đúng lộ trình.`);
        }

        alert(`✅ Đã thêm món: ${manualForm.name}`);
        setIsManualInputOpen(false);
        setManualForm({ name: '', calories: '', protein: '', carbs: '', fat: '', time: '' });
        fetchData();
      }
    } catch (e) { alert("Lỗi lưu món ăn"); }
  };

  const handleSearchSubmit = async (overrideQuery?: string) => {
    const query = typeof overrideQuery === 'string' ? overrideQuery : searchQuery;
    setIsLoadingSuggestions(true);
    setHasSearched(true);
    setCurrentPreference(query);
    try {
      const ignoreList = meals.map(m => m.name);
      const res = await fetch(`${API_BASE}/api/nutrition/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile: profileForm,
          remainingCalories: remainingCalories,
          ignoreList: ignoreList,
          preference: query || null
        })
      });
      const data = await res.json();
      const rawList = Array.isArray(data.suggestion) ? data.suggestion : [];
      if (rawList.length > 0) {
        speak(`Tìm thấy ${rawList.length} món ăn phù hợp với bạn.`);
      } else {
        speak("Không tìm thấy món nào phù hợp.");
      }
      const mappedList = rawList.map((item: any, idx: number) => ({
        id: idx,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        icon: item.icon || '🍲',
        desc: item.desc || 'Gợi ý từ AI'
      }));
      setSuggestionsList(mappedList);
    } catch (e) {
      console.error(e);
      alert("Không lấy được gợi ý.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleRefreshSuggestions = () => {
    handleSearchSubmit(currentPreference || '');
  };

  const handleSelectSuggestion = async (mealName: string, cal: number, macros?: any) => {
    if (!user?.uid) return;
    try {
      await fetch(`${API_BASE}/api/nutrition/add_meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          meal: {
            name: mealName,
            calories: cal,
            protein: macros?.protein || 0,
            carbs: macros?.carbs || 0,
            fat: macros?.fat || 0
          }
        })
      });
      speak(`Đã thêm món ${mealName} thành công.`);
      alert(`✅ Đã thêm: ${mealName}`);
      setIsSuggestionsOpen(false);
      fetchData();
    } catch (e) { alert("Lỗi thêm món"); }
  };

  const handleProfileSubmit = async () => {
    if (!user?.uid) return;
    try {
      await fetch(`${API_BASE}/api/nutrition/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          data: profileForm
        })
      });
      speak("Đã lưu hồ sơ sức khỏe của bạn.");
      alert('✅ Đã lưu hồ sơ sức khỏe!');
      setIsProfileOpen(false);
      fetchData();
    } catch (e) { alert("Lỗi lưu profile"); }
  };

  const quickSuggestions = [
    '🥬 Món chay', '🍲 Món nước', '🥗 Ít béo', '🥩 Nhiều đạm', '⚡ Ít carb', '🌿 Giảm cân',
  ];

  return (
    <div className="min-h-screen px-6 pt-24 pb-32">
      <TopBar title="Dinh Dưỡng" onNavigate={onNavigate} />

      {/* Profile Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsProfileOpen(true)}
        className="fixed top-24 right-6 w-12 h-12 rounded-full backdrop-blur-xl flex items-center justify-center shadow-xl z-40"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '2px solid rgba(0, 123, 255, 0.3)',
        }}
      >
        <User size={20} style={{ color: '#007BFF' }} />
      </motion.button>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-8 mb-6"
      >
        <div className="relative w-56 h-56">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="112" cy="112" r="100" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="12" fill="none" />
            <motion.circle
              cx="112"
              cy="112"
              r="100"
              stroke={getCaloriesColor()}
              strokeWidth={12}
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDasharray: 628, strokeDashoffset: 628 }}
              animate={{
                strokeDashoffset: 628 - (628 * caloriesPercentage) / 100,
              }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 8px ${getCaloriesColor()}80)` }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.p
              className="text-5xl mb-2"
              style={{ color: getCaloriesColor() }}
              key={animatedCalories}
            >
              {animatedCalories}
            </motion.p>
            <p className="text-sm opacity-70" style={{ color: '#1F3B4D' }}>
              / {userGoal} kcal
            </p>
            <p className="text-xs mt-1 opacity-50" style={{ color: '#1F3B4D' }}>
              {remainingCalories > 0 ? `Còn ${remainingCalories} kcal` : `Vượt ${Math.abs(remainingCalories)} kcal`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Macros Section */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[macros.protein, macros.carbs, macros.fat].map((macro, index) => {
          const labels = ['Đạm', 'Tinh bột', 'Béo'];
          const percentage = (macro.current / macro.goal) * 100;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="backdrop-blur-lg rounded-2xl p-4 flex flex-col items-center"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: `${macro.color}20` }}
              >
                <span className="text-xl">{['💪', '⚡', '🥑'][index]}</span>
              </div>
              <p className="mb-1" style={{ color: macro.color }}>{macro.current}g</p>
              <p className="text-xs opacity-60 mb-3" style={{ color: '#1F3B4D' }}>{labels[index]}</p>
              <div className="w-full h-1.5 rounded-full bg-white/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percentage, 100)}%` }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: macro.color }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Water Tracker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="backdrop-blur-lg rounded-2xl p-5 mb-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(16, 185, 129, 0.3) 100%)',
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>
              <Droplet size={24} style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <p className="mb-1" style={{ color: '#1F3B4D' }}>{waterGlasses * 250}ml / 2000ml</p>
              <p className="text-sm opacity-70" style={{ color: '#1F3B4D' }}>{waterGlasses} cốc nước</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddWater}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#3B82F6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
          >
            <Plus size={20} style={{ color: '#FFFFFF' }} />
          </motion.button>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/40 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(waterGlasses * 250 / 2000) * 100}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #3B82F6 0%, #10B981 100%)' }}
          />
        </div>
      </motion.div>

      {/* Meal Log Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ color: '#1F3B4D' }}>Món ăn hôm nay</h3>
        <p className="text-sm opacity-60" style={{ color: '#1F3B4D' }}>{meals.length} món</p>
      </div>

      {/* Meal List */}
      <div className="space-y-3 mb-24">
        {meals.length === 0 && <p className="text-center opacity-50 py-4">Chưa có món nào. Thêm ngay!</p>}
        {meals.map((meal, index) => (
          <motion.div
            key={meal.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="backdrop-blur-lg rounded-2xl p-4 flex items-center gap-4"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: 'rgba(0, 123, 255, 0.1)' }}>
              {meal.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="mb-1" style={{ color: '#1F3B4D' }}>{meal.name}</p>
              <p className="text-sm opacity-60" style={{ color: '#1F3B4D' }}>{meal.time}</p>
            </div>
            <div className="text-right">
              <p className="text-lg" style={{ color: '#007BFF' }}>{meal.calories}</p>
              <p className="text-xs opacity-60" style={{ color: '#1F3B4D' }}>kcal</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 right-6 z-50">
        <AnimatePresence>
          {isFABOpen && (
            <>
              {/* Mic Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0, y: 30 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
                onClick={() => { setIsMicOpen(true); setIsFABOpen(false); }}
                className="absolute bottom-[304px] right-0 w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center shadow-2xl"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid rgba(139, 92, 246, 0.3)' }}
              >
                <Mic size={22} style={{ color: '#8B5CF6' }} />
              </motion.button>
              {/* Suggestions Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0, y: 30 }}
                transition={{ duration: 0.3, delay: 0.05, type: 'spring', stiffness: 260, damping: 20 }}
                onClick={() => {
                  setIsSuggestionsOpen(true);
                  setIsFABOpen(false);
                  setHasSearched(false);
                  setSearchQuery('');
                  setSuggestionsList([]);
                }}
                className="absolute bottom-[232px] right-0 w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center shadow-2xl"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid rgba(245, 158, 11, 0.3)' }}
              >
                <Lightbulb size={22} style={{ color: '#F59E0B' }} />
              </motion.button>

              {/* Camera Button (HYBRID) */}
              <motion.button
                initial={{ opacity: 0, scale: 0, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0, y: 30 }}
                transition={{ duration: 0.3, delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                onClick={() => {
                  // Nếu là Mobile thì mở camera thật
                  if (Capacitor.isNativePlatform() && cameraInputRef.current) {
                    cameraInputRef.current.click();
                    setIsFABOpen(false);
                  } else {
                    setIsCameraOpen(true);
                    setIsFABOpen(false);
                  }
                }}
                className="absolute bottom-[160px] right-0 w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center shadow-2xl"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid rgba(0, 123, 255, 0.3)' }}
              >
                <Camera size={22} style={{ color: '#007BFF' }} />
              </motion.button>

              {/* Input Camera Thật (Hidden) */}
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                hidden
                onChange={handleImageUpload}
              />

              {/* Manual Input Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0, y: 30 }}
                transition={{ duration: 0.3, delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
                onClick={() => { setIsManualInputOpen(true); setIsFABOpen(false); }}
                className="absolute bottom-[88px] right-0 w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center shadow-2xl"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid rgba(16, 185, 129, 0.3)' }}
              >
                <Edit3 size={22} style={{ color: '#10B981' }} />
              </motion.button>
            </>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsFABOpen(!isFABOpen)}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl relative"
          style={{ backgroundColor: '#007BFF', boxShadow: '0 8px 32px rgba(0, 123, 255, 0.5)' }}
        >
          <motion.div animate={{ rotate: isFABOpen ? 45 : 0 }} transition={{ duration: 0.3 }}>
            <Plus size={28} style={{ color: '#FFFFFF' }} />
          </motion.div>
        </motion.button>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Modal Mic (ĐÃ NÂNG CẤP WEB API) */}
      <AnimatePresence>
        {isMicOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => !isListening && setIsMicOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[90%] max-w-md rounded-3xl backdrop-blur-xl p-8"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
            >
              <div className="text-center">
                <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 relative" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                  {isListening && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{ backgroundColor: 'rgba(139, 92, 246, 0.3)' }}
                    />
                  )}
                  <Mic size={48} style={{ color: '#8B5CF6' }} />
                </div>
                <h2 className="mb-2" style={{ color: '#1F3B4D' }}>{isListening ? '🎤 Đang nghe...' : '🎙️ Giọng nói'}</h2>
                <p className="text-sm opacity-60 mb-6" style={{ color: '#1F3B4D' }}>
                  {isListening ? 'Hãy nói: "Tôi vừa ăn một bát phở"...' : 'Nhấn để bắt đầu ghi âm'}
                </p>
                {!isListening ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={startSTT} // Gọi hàm Web STT
                    className="w-full py-3 rounded-xl"
                    style={{ backgroundColor: '#8B5CF6', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}
                  >
                    🎤 Bắt đầu
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={stopSTT}
                    className="w-full py-3 rounded-xl bg-red-500 text-white"
                  >
                    ⏹️ Dừng
                  </motion.button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 2. Modal Gợi ý (GIỮ NGUYÊN) */}
      <AnimatePresence>
        {isSuggestionsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setIsSuggestionsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[90%] max-w-md rounded-3xl backdrop-blur-xl p-6"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 style={{ color: '#1F3B4D' }}>💡 Gợi ý món ăn</h2>
                  <p className="text-sm opacity-60 mt-1" style={{ color: '#1F3B4D' }}>AI đề xuất dựa trên sở thích</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsSuggestionsOpen(false)}>
                  <X size={24} style={{ color: '#1F3B4D' }} />
                </motion.button>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                    placeholder="VD: Món chay, món nước..."
                    className="flex-1 min-w-0 px-4 py-3 rounded-xl backdrop-blur-sm"
                    style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)', color: '#1F3B4D' }}
                    autoFocus={!hasSearched}
                    disabled={isLoadingSuggestions}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleSearchSubmit()}
                    disabled={isLoadingSuggestions}
                    className="shrink-0 px-5 py-3 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: isLoadingSuggestions ? '#ccc' : '#F59E0B',
                      color: '#FFFFFF',
                      boxShadow: isLoadingSuggestions ? 'none' : '0 4px 12px rgba(245, 158, 11, 0.3)',
                      cursor: isLoadingSuggestions ? 'not-allowed' : 'pointer',
                      minWidth: '60px',
                    }}
                  >
                    🔍
                  </motion.button>
                </div>
              </div>

              {/* Content Area */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                {!hasSearched ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm mb-3 opacity-70" style={{ color: '#1F3B4D' }}>Gợi ý nhanh:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {quickSuggestions.map((suggestion, index) => (
                          <motion.button
                            key={index}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => { setSearchQuery(suggestion); handleSearchSubmit(suggestion); }}
                            className="py-2.5 px-3 rounded-xl text-sm text-left"
                            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#1F3B4D' }}
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : isLoadingSuggestions ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <motion.div
                      animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 border-4 border-[#F59E0B] border-t-transparent rounded-full mb-4"
                    />
                    <h3 className="text-lg mb-2" style={{ color: '#F59E0B' }}>🔍 Đang tìm món...</h3>
                  </div>
                ) : (
                  <>
                    {suggestionsList.length === 0 && <p className="text-center text-sm py-4">Không tìm thấy món nào.</p>}
                    {suggestionsList.map((item) => (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectSuggestion(item.name, item.calories)}
                        className="w-full p-4 rounded-2xl text-left backdrop-blur-sm"
                        style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)' }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl">{item.icon}</span>
                          <div className="flex-1">
                            <p style={{ color: '#1F3B4D' }}>{item.name}</p>
                            <p className="text-xs opacity-60" style={{ color: '#1F3B4D' }}>{item.desc}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg" style={{ color: '#007BFF' }}>{item.calories}</p>
                            <p className="text-xs opacity-60" style={{ color: '#1F3B4D' }}>kcal</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <span style={{ color: '#007BFF' }}>💪 {item.protein}g</span>
                          <span style={{ color: '#F59E0B' }}>⚡ {item.carbs}g</span>
                          <span style={{ color: '#FF6B9D' }}>🥑 {item.fat}g</span>
                        </div>
                      </motion.button>
                    ))}
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleRefreshSuggestions}
                      className="w-full py-3 rounded-xl mt-4 flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#F59E0B', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
                    >
                      <RefreshCw size={20} style={{ color: '#FFFFFF' }} />
                      <span>🔄 Đổi món khác</span>
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. Modal Profile (GIỮ NGUYÊN) */}
      <AnimatePresence>
        {isProfileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setIsProfileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[90%] max-w-md rounded-3xl backdrop-blur-xl p-6"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: '1px solid rgba(0, 123, 255, 0.2)', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 style={{ color: '#1F3B4D' }}>👤 Hồ sơ sức khỏe</h2>
                  <p className="text-sm opacity-60 mt-1" style={{ color: '#1F3B4D' }}>Cập nhật thông tin của bạn</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsProfileOpen(false)}>
                  <X size={24} style={{ color: '#1F3B4D' }} />
                </motion.button>
              </div>

              <div className="space-y-4">
                {/* Giới tính */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>Giới tính</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setProfileForm({ ...profileForm, gender: 'male' })} className="py-2.5 rounded-xl" style={{ backgroundColor: profileForm.gender === 'male' ? 'rgba(0, 123, 255, 0.2)' : 'rgba(230, 247, 255, 0.5)', border: `2px solid ${profileForm.gender === 'male' ? '#007BFF' : 'rgba(0, 123, 255, 0.2)'}`, color: '#1F3B4D' }}>👨 Nam</button>
                    <button onClick={() => setProfileForm({ ...profileForm, gender: 'female' })} className="py-2.5 rounded-xl" style={{ backgroundColor: profileForm.gender === 'female' ? 'rgba(255, 107, 157, 0.2)' : 'rgba(230, 247, 255, 0.5)', border: `2px solid ${profileForm.gender === 'female' ? '#FF6B9D' : 'rgba(0, 123, 255, 0.2)'}`, color: '#1F3B4D' }}>👩 Nữ</button>
                  </div>
                </div>
                {/* Tuổi & Chiều cao */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>Tuổi</label>
                    <input type="number" value={profileForm.age} onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })} className="w-full px-4 py-2.5 rounded-xl backdrop-blur-sm text-sm" style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)', color: '#1F3B4D' }} />
                  </div>
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>Chiều cao (cm)</label>
                    <input type="number" value={profileForm.height} onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })} className="w-full px-4 py-2.5 rounded-xl backdrop-blur-sm text-sm" style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)', color: '#1F3B4D' }} />
                  </div>
                </div>
                {/* Cân nặng */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>Cân nặng (kg)</label>
                  <input type="number" value={profileForm.weight} onChange={(e) => setProfileForm({ ...profileForm, weight: e.target.value })} className="w-full px-4 py-2.5 rounded-xl backdrop-blur-sm text-sm" style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)', color: '#1F3B4D' }} />
                </div>

                {/* Hoạt động */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>Mức độ hoạt động</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'medium', 'high'].map((level) => (
                      <button key={level} onClick={() => setProfileForm({ ...profileForm, activityLevel: level })} className="py-2.5 px-2 rounded-xl text-sm" style={{ backgroundColor: profileForm.activityLevel === level ? 'rgba(0, 123, 255, 0.2)' : 'rgba(230, 247, 255, 0.5)', border: `2px solid ${profileForm.activityLevel === level ? '#007BFF' : 'rgba(0, 123, 255, 0.2)'}`, color: '#1F3B4D' }}>
                        {level === 'low' && '🛋️ Ít'}
                        {level === 'medium' && '🚶 Vừa'}
                        {level === 'high' && '🏃 Nhiều'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mục tiêu */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>Mục tiêu</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['lose', 'maintain', 'gain'].map((goal) => (
                      <button key={goal} onClick={() => setProfileForm({ ...profileForm, goal })} className="py-2.5 px-2 rounded-xl text-sm" style={{ backgroundColor: profileForm.goal === goal ? 'rgba(0, 123, 255, 0.2)' : 'rgba(230, 247, 255, 0.5)', border: `2px solid ${profileForm.goal === goal ? '#007BFF' : 'rgba(0, 123, 255, 0.2)'}`, color: '#1F3B4D' }}>
                        {goal === 'lose' && '📉 Giảm'}
                        {goal === 'maintain' && '➡️ Giữ'}
                        {goal === 'gain' && '📈 Tăng'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calo mục tiêu */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>Mục tiêu calo/ngày (Tự động tính)</label>
                  <input type="number" value={profileForm.dailyCalories} onChange={(e) => setProfileForm({ ...profileForm, dailyCalories: e.target.value })} className="w-full px-4 py-2.5 rounded-xl backdrop-blur-sm text-sm font-bold text-[#007BFF]" style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)' }} />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleProfileSubmit}
                className="w-full py-3 rounded-xl mt-5"
                style={{ backgroundColor: '#007BFF', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' }}
              >
                💾 Lưu hồ sơ
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. Modal Camera (GIỮ NGUYÊN) */}
      <AnimatePresence>
        {isCameraOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => { if (!isAnalyzing) { setIsCameraOpen(false); setImagePreview(null); } }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[90%] max-w-md rounded-3xl backdrop-blur-xl p-6"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: '1px solid rgba(0, 123, 255, 0.2)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 style={{ color: '#1F3B4D' }}>📷 Chụp ảnh món ăn</h2>
                  <p className="text-sm opacity-60 mt-1" style={{ color: '#1F3B4D' }}>AI sẽ phân tích món ăn từ ảnh</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { if (!isAnalyzing) { setIsCameraOpen(false); setImagePreview(null); } }}
                  disabled={isAnalyzing}
                >
                  <X size={24} style={{ color: isAnalyzing ? '#ccc' : '#1F3B4D' }} />
                </motion.button>
              </div>

              <div className="space-y-4">
                {!imagePreview ? (
                  <label className="w-full h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.02]" style={{ borderColor: 'rgba(0, 123, 255, 0.3)', backgroundColor: 'rgba(230, 247, 255, 0.3)' }}>
                    <Upload size={48} style={{ color: '#007BFF', opacity: 0.5 }} />
                    <p className="mt-4" style={{ color: '#007BFF' }}>Nhấn để chọn ảnh</p>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                ) : (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover rounded-2xl" />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                        <div className="text-center">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-3" />
                          <p style={{ color: '#FFFFFF' }}>Đang phân tích...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {imagePreview && !isAnalyzing && (
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button onClick={() => setImagePreview(null)} className="py-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Chọn lại</motion.button>
                    <motion.button onClick={handleAnalyzeImage} className="py-3 rounded-xl" style={{ backgroundColor: '#007BFF', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)' }}>🔍 Phân tích</motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. Modal Nhập tay (GIỮ NGUYÊN) */}
      <AnimatePresence>
        {isManualInputOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setIsManualInputOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[90%] max-w-md rounded-3xl backdrop-blur-xl p-6"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: '1px solid rgba(0, 123, 255, 0.2)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 style={{ color: '#1F3B4D' }}>✏️ Nhập tay món ăn</h2>
                  <p className="text-sm opacity-60 mt-1" style={{ color: '#1F3B4D' }}>Nhập tên, AI sẽ giúp điền phần còn lại</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsManualInputOpen(false)}>
                  <X size={24} style={{ color: '#1F3B4D' }} />
                </motion.button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>Tên món ăn *</label>
                  <input
                    type="text"
                    value={manualForm.name}
                    onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                    onBlur={handleNameBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
                    placeholder="VD: Cơm sườn (Nhập xong nhấn Enter)"
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-sm text-sm font-semibold"
                    style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)', color: '#1F3B4D' }}
                  />
                </div>

                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>Calories (kcal) *</label>
                  <input
                    type="number"
                    value={manualForm.calories}
                    onChange={(e) => setManualForm({ ...manualForm, calories: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-sm text-sm"
                    style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)', color: '#1F3B4D' }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: '#007BFF' }}>💪 Đạm (g)</label>
                    <input type="number" value={manualForm.protein} onChange={(e) => setManualForm({ ...manualForm, protein: e.target.value })} className="w-full px-3 py-2 rounded-xl backdrop-blur-sm text-sm" style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)', color: '#1F3B4D' }} />
                  </div>
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: '#F59E0B' }}>⚡ T.bột (g)</label>
                    <input type="number" value={manualForm.carbs} onChange={(e) => setManualForm({ ...manualForm, carbs: e.target.value })} className="w-full px-3 py-2 rounded-xl backdrop-blur-sm text-sm" style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)', color: '#1F3B4D' }} />
                  </div>
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: '#FF6B9D' }}>🥑 Béo (g)</label>
                    <input type="number" value={manualForm.fat} onChange={(e) => setManualForm({ ...manualForm, fat: e.target.value })} className="w-full px-3 py-2 rounded-xl backdrop-blur-sm text-sm" style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)', color: '#1F3B4D' }} />
                  </div>
                </div>

                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>Thời gian ăn</label>
                  <input
                    type="text"
                    value={manualForm.time}
                    onChange={(e) => setManualForm({ ...manualForm, time: e.target.value })}
                    placeholder="VD: 12:30 - Trưa"
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-sm text-sm"
                    style={{ backgroundColor: 'rgba(230, 247, 255, 0.5)', border: '1px solid rgba(0, 123, 255, 0.2)', color: '#1F3B4D' }}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleManualSubmit}
                className="w-full py-3 rounded-xl mt-6"
                style={{ backgroundColor: '#10B981', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
              >
                ✅ Thêm món ăn
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}