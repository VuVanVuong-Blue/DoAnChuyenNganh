import { motion } from 'motion/react';
import { MapPin, Wind, Droplets, Eye, Gauge, ChevronDown, Loader2, Navigation } from 'lucide-react';
import { TopBar } from './TopBar';
import { useState, useEffect } from 'react';

// 👇 1. IMPORT TỪ CONFIG CHUNG
import { API_BASE } from '../config';

// 👇 2. IMPORT ĐỂ CHECK NỀN TẢNG (Tối ưu FPS)
import { Capacitor } from '@capacitor/core';

// --- LOGIC GIỮ NGUYÊN ---
const getWeatherIcon = (code: string) => {
  const map: Record<string, string> = {
    '01d': '☀️', '01n': '🌙', '02d': '🌤️', '02n': '🌤️',
    '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌦️',
    '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
  };
  return map[code] || '🌡️';
};

const cities = [
  'Vị trí hiện tại', 'Thành phố Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng',
  'Cần Thơ', 'Hải Phòng', 'Nha Trang', 'Đà Lạt', 'Vũng Tàu',
];

interface HourlyItem {
  time: string;
  temp: number;
  icon_code: string;
}

interface WeatherData {
  city: string;
  temp: number;
  desc: string;
  temp_max: number;
  temp_min: number;
  humidity: string;
  wind_speed: string;
  visibility: string;
  pressure: string;
  icon_code: string;
  hourly: HourlyItem[];
}

interface WeatherScreenProps {
  onNavigate?: (screen: string) => void;
}

export function WeatherScreen({ onNavigate }: WeatherScreenProps) {
  const [selectedOption, setSelectedOption] = useState('Vị trí hiện tại');
  const [displayCityName, setDisplayCityName] = useState('Đang định vị...');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  // Check xem có phải Mobile không để tắt Blur
  const isMobile = Capacitor.isNativePlatform();

  const fetchWeather = async (option: string) => {
    setLoading(true);
    if (option === 'Vị trí hiện tại') {
      setDisplayCityName('Đang định vị...');
    } else {
      setDisplayCityName(option);
    }

    try {
      const queryCity = option === 'Vị trí hiện tại' ? '' : option;
      // 👇 SỬA URL: Dùng API_BASE thay vì localhost cứng
      const response = await fetch(`${API_BASE}/api/weather_data?city=${encodeURIComponent(queryCity)}`);
      const data = await response.json();

      if (!data.error) {
        setWeather(data);
        if (data.city) setDisplayCityName(data.city);
      } else {
        if (option === 'Vị trí hiện tại') setDisplayCityName("Không tìm thấy vị trí");
      }
    } catch (error) {
      console.error("Lỗi thời tiết:", error);
      setDisplayCityName("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(selectedOption);
  }, [selectedOption]);

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="min-h-screen px-6 pt-24 pb-12 bg-slate-50">
      <TopBar title="Thời tiết" onNavigate={onNavigate} />

      {/* --- PHẦN HEADER & DROPDOWN --- */}
      <div className="mb-8 relative z-10">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 mb-2 px-4 py-3 bg-white"
          style={{
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.03)'
          }}
        >
          {selectedOption === 'Vị trí hiện tại' ? (
            <Navigation size={20} className="text-blue-600 animate-pulse" />
          ) : (
            <MapPin size={20} className="text-blue-500" />
          )}
          <h2 className="text-slate-800 font-bold text-lg truncate max-w-[200px]">
            {displayCityName}
          </h2>
          <motion.div animate={{ rotate: isDropdownOpen ? 180 : 0 }}>
            <ChevronDown size={20} className="text-blue-500" />
          </motion.div>
        </motion.button>

        {isDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute top-full left-0 mt-2 w-80 max-h-[60vh] overflow-y-auto z-40 p-2"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              }}
            >
              <div className="flex flex-col gap-1">
                {cities.map((city) => {
                  const isSelected = selectedOption === city;
                  return (
                    <motion.button
                      key={city}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setSelectedOption(city);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3"
                      style={{
                        borderRadius: '16px',
                        backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div style={{ color: isSelected ? '#2563EB' : '#94A3B8' }}> 
                          {city === 'Vị trí hiện tại' ? <Navigation size={18} /> : <MapPin size={18} />}
                        </div>
                        <span style={{ color: isSelected ? '#1D4ED8' : '#334155', fontWeight: isSelected ? 600 : 500 }}>
                          {city}
                        </span>
                      </div>
                      {isSelected && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
        <p className="mt-2 opacity-70 px-1 text-slate-600 text-sm font-medium capitalize">{currentDate}</p>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <p className="text-slate-500 text-sm">Đang cập nhật dữ liệu...</p>
        </div>
      ) : weather ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* --- 1. THẺ CHÍNH (Main Card) --- */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 px-6 py-10 rounded-[32px] text-center flex flex-col items-center justify-center"
            // 👇 TỐI ƯU FPS: Nếu là Mobile thì dùng nền đục, không blur. Nếu PC thì blur.
            style={{ 
              backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)', 
              backdropFilter: isMobile ? 'none' : 'blur(10px)',
              boxShadow: '0 15px 40px rgba(0,0,0,0.03)',
              minHeight: '340px'
            }}
          >
            {/* Logic kiểm tra thời tiết để đổi màu Glow */}
            {(() => {
                const isSunny = weather.icon_code.includes('01') || weather.icon_code.includes('02');
                // Màu nắng (Vàng/Cam)
                const sunGlow = 'radial-gradient(circle, rgba(253, 184, 19, 0.4) 0%, rgba(255, 165, 0, 0.2) 50%, transparent 70%)';
                const sunBg = 'linear-gradient(135deg, rgba(253, 184, 19, 0.15), rgba(255, 165, 0, 0.1))';
                const sunShadow = '0 8px 32px rgba(253, 184, 19, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.5)';
                
                // Màu mưa/mây (Xanh/Tím)
                const rainGlow = 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(59, 130, 246, 0.2) 50%, transparent 70%)';
                const rainBg = 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.1))';
                const rainShadow = '0 8px 32px rgba(99, 102, 241, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.5)';

                return (
                  <motion.div 
                    className="relative inline-block mb-6"
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* Glow effect */}
                    <div 
                      className="absolute inset-0 rounded-full blur-3xl"
                      style={{ 
                        background: isSunny ? sunGlow : rainGlow,
                        transform: 'scale(1.8)',
                        zIndex: 0,
                        opacity: isMobile ? 0.5 : 1 // Giảm độ sáng glow trên mobile cho đỡ chói
                      }}
                    />
                    {/* Icon background circle */}
                    <div 
                      className="relative rounded-full p-8 flex items-center justify-center"
                      style={{ 
                        width: '140px',
                        height: '140px',
                        background: isSunny ? sunBg : rainBg,
                        boxShadow: isSunny ? sunShadow : rainShadow,
                        backdropFilter: isMobile ? 'none' : 'blur(4px)' // Tắt blur trong icon luôn
                      }}
                    >
                      {/* ICON DỮ LIỆU THẬT */}
                      <div className="text-7xl leading-none filter drop-shadow-sm">
                          {getWeatherIcon(weather.icon_code)}
                      </div>
                    </div>
                  </motion.div>
                );
            })()}

            <div className="mb-2">
              <span className="text-7xl font-semibold tracking-tighter" style={{ color: '#1F3B4D' }}>
                {weather.temp}°
              </span>
            </div>
            <p className="text-xl mb-2 font-medium capitalize" style={{ color: '#1F3B4D' }}>
              {weather.desc}
            </p>
            <p className="opacity-60 font-medium" style={{ color: '#1F3B4D' }}>
              Cao: {weather.temp_max}° • Thấp: {weather.temp_min}°
            </p>
          </motion.div>

          {/* 2. DỰ BÁO TỪNG GIỜ (Hourly) */}
          <div>
            <h3 className="mb-4 px-2 font-bold text-slate-700 text-lg">Dự báo theo giờ</h3>
            <div 
                className="px-2 py-4 overflow-x-auto no-scrollbar" 
                style={{ 
                   backgroundColor: '#FFFFFF',
                   borderRadius: '24px',
                   boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                   padding: '24px' 
                }}
            >
              <div style={{ display: 'flex', gap: '24px' }}> 
                {weather.hourly && weather.hourly.length > 0 ? (
                  weather.hourly.map((hour, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex flex-col items-center justify-between"
                      style={{ minWidth: '70px', height: '110px' }} 
                    >
                      <p className="text-sm text-slate-500 font-medium mb-2">{hour.time}</p>
                      <div 
                        style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            backgroundColor: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            marginBottom: '8px'
                        }}
                      >
                          {getWeatherIcon(hour.icon_code)}
                      </div>
                      <p className="font-bold text-slate-800 text-lg">{hour.temp}°</p>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-sm opacity-50 w-full text-center">Chưa có dữ liệu</p>
                )}
              </div>
            </div>
          </div>

          {/* 3. LƯỚI CHI TIẾT (Details) */}
          <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px' 
          }}>
            {[
              { icon: Wind, label: 'Gió', value: weather.wind_speed, color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: Droplets, label: 'Độ ẩm', value: weather.humidity, color: 'text-cyan-500', bg: 'bg-cyan-50' },
              { icon: Eye, label: 'Tầm nhìn', value: weather.visibility, color: 'text-purple-500', bg: 'bg-purple-50' },
              { icon: Gauge, label: 'Áp suất', value: weather.pressure, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                style={{ 
                   backgroundColor: '#FFFFFF',
                   borderRadius: '24px',
                   padding: '20px', 
                   boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                   height: '140px', 
                   display: 'flex',
                   flexDirection: 'column',
                   justifyContent: 'space-between' 
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full ${item.bg} ${item.color}`}>
                    <item.icon size={18} />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{item.label}</p>
                </div>
                <p className="text-2xl font-bold text-slate-800 ml-1">
                    {item.value}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center p-10 mt-10 rounded-3xl bg-white shadow-sm">
          <p className="text-red-500 font-medium mb-4">Lỗi tải dữ liệu.</p>
          <button 
            onClick={() => fetchWeather(selectedOption)} 
            className="px-6 py-2 bg-blue-100 text-blue-600 font-bold rounded-lg hover:bg-blue-200"
          >
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}