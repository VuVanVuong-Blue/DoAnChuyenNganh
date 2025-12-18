import { motion, AnimatePresence } from 'motion/react';
import { TopBar } from './TopBar';
import { useState } from 'react';
import {
  Bell,
  Moon,
  Sun,
  Globe,
  ChevronRight,
  Info,
  Shield,
  Check,
  X,
} from 'lucide-react';
import { API_BASE } from '../config';

interface SettingScreenProps {
  onNavigate: (screen: string) => void;
}

type Language = 'vi' | 'en';

export function SettingScreen({ onNavigate }: SettingScreenProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('vi');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const languages = [
    { code: 'vi' as Language, name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
  ];

  const handleLanguageSelect = (code: Language) => {
    setSelectedLanguage(code);
    setIsLanguageModalOpen(false);
  };

  const selectedLangData = languages.find((lang) => lang.code === selectedLanguage);

  return (
    <div className="min-h-screen px-6 pt-24 pb-12">
      <TopBar title="Cài đặt" onNavigate={onNavigate} />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl backdrop-blur-xl p-6"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '2px solid rgba(0, 123, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 123, 255, 0.15)',
          }}
        >
          <h3 className="mb-5" style={{ color: '#1F3B4D' }}>
            ⚙️ Tùy chỉnh
          </h3>

          <div className="space-y-3">
            {/* Notifications Toggle */}
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{
                backgroundColor: 'rgba(0, 123, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(0, 123, 255, 0.15)',
                  }}
                >
                  <Bell size={18} style={{ color: '#007BFF' }} />
                </div>
                <div>
                  <p style={{ color: '#1F3B4D' }}>Thông báo</p>
                  <p className="text-xs opacity-60" style={{ color: '#1F3B4D' }}>
                    Nhận thông báo từ ứng dụng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className="relative w-14 h-8 rounded-full transition-all"
                style={{
                  backgroundColor: notificationsEnabled ? '#007BFF' : 'rgba(0, 123, 255, 0.2)',
                }}
              >
                <motion.div
                  animate={{ x: notificationsEnabled ? 24 : 2 }}
                  className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg"
                />
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{
                backgroundColor: 'rgba(0, 123, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: darkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  }}
                >
                  {darkMode ? (
                    <Moon size={18} style={{ color: '#6366F1' }} />
                  ) : (
                    <Sun size={18} style={{ color: '#F59E0B' }} />
                  )}
                </div>
                <div>
                  <p style={{ color: '#1F3B4D' }}>Chế độ {darkMode ? 'tối' : 'sáng'}</p>
                  <p className="text-xs opacity-60" style={{ color: '#1F3B4D' }}>
                    {darkMode ? 'Đang bật chế độ tối' : 'Đang bật chế độ sáng'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="relative w-14 h-8 rounded-full transition-all"
                style={{
                  backgroundColor: darkMode ? '#6366F1' : '#F59E0B',
                }}
              >
                <motion.div
                  animate={{ x: darkMode ? 24 : 2 }}
                  className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center"
                >
                  {darkMode ? (
                    <Moon size={14} style={{ color: '#6366F1' }} />
                  ) : (
                    <Sun size={14} style={{ color: '#F59E0B' }} />
                  )}
                </motion.div>
              </button>
            </div>

            {/* Language */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsLanguageModalOpen(true)}
              className="w-full flex items-center justify-between p-4 rounded-xl"
              style={{
                backgroundColor: 'rgba(0, 123, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(0, 123, 255, 0.15)',
                  }}
                >
                  <Globe size={18} style={{ color: '#007BFF' }} />
                </div>
                <div className="text-left">
                  <p style={{ color: '#1F3B4D' }}>Ngôn ngữ</p>
                  <p className="text-xs opacity-60" style={{ color: '#1F3B4D' }}>
                    {selectedLangData?.flag} {selectedLangData?.name}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} style={{ color: '#007BFF', opacity: 0.5 }} />
            </motion.button>
          </div>
        </motion.div>

        {/* About Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl backdrop-blur-xl p-6"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '2px solid rgba(0, 123, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 123, 255, 0.15)',
          }}
        >
          <h3 className="mb-5" style={{ color: '#1F3B4D' }}>
            ℹ️ Thông tin
          </h3>

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-between p-4 rounded-xl"
              style={{
                backgroundColor: 'rgba(0, 123, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(0, 123, 255, 0.15)',
                  }}
                >
                  <Info size={18} style={{ color: '#007BFF' }} />
                </div>
                <div className="text-left">
                  <p style={{ color: '#1F3B4D' }}>Về ứng dụng</p>
                  <p className="text-xs opacity-60" style={{ color: '#1F3B4D' }}>
                    Phiên bản 1.0.0
                  </p>
                </div>
              </div>
              <ChevronRight size={20} style={{ color: '#007BFF', opacity: 0.5 }} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-between p-4 rounded-xl"
              style={{
                backgroundColor: 'rgba(0, 123, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(0, 123, 255, 0.15)',
                  }}
                >
                  <Shield size={18} style={{ color: '#007BFF' }} />
                </div>
                <div className="text-left">
                  <p style={{ color: '#1F3B4D' }}>Chính sách bảo mật</p>
                  <p className="text-xs opacity-60" style={{ color: '#1F3B4D' }}>
                    Xem chi tiết
                  </p>
                </div>
              </div>
              <ChevronRight size={20} style={{ color: '#007BFF', opacity: 0.5 }} />
            </motion.button>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs opacity-50" style={{ color: '#1F3B4D' }}>
            © 2025 Trợ lý AI • Made with ❤️
          </p>
        </div>
      </div>

      {/* Language Selection Modal */}
      <AnimatePresence>
        {isLanguageModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setIsLanguageModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[90%] max-w-md rounded-3xl backdrop-blur-xl p-6"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                border: '2px solid rgba(0, 123, 255, 0.2)',
                boxShadow: '0 20px 60px rgba(0, 123, 255, 0.3)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ color: '#1F3B4D' }}>🌐 Chọn ngôn ngữ</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsLanguageModalOpen(false)}
                >
                  <X size={24} style={{ color: '#1F3B4D' }} />
                </motion.button>
              </div>

              {/* Language Options */}
              <div className="space-y-3">
                {languages.map((lang, index) => {
                  const isSelected = selectedLanguage === lang.code;
                  return (
                    <motion.button
                      key={lang.code}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLanguageSelect(lang.code)}
                      className="w-full flex items-center justify-between p-4 rounded-xl"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(0, 123, 255, 0.15)'
                          : 'rgba(0, 123, 255, 0.05)',
                        border: `2px solid ${
                          isSelected ? 'rgba(0, 123, 255, 0.4)' : 'rgba(0, 123, 255, 0.1)'
                        }`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{lang.flag}</span>
                        <div className="text-left">
                          <p
                            style={{
                              color: isSelected ? '#007BFF' : '#1F3B4D',
                            }}
                          >
                            {lang.name}
                          </p>
                          <p className="text-xs opacity-60" style={{ color: '#1F3B4D' }}>
                            {lang.code === 'vi' ? 'Tiếng Việt' : 'English'}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: '#007BFF' }}
                        >
                          <Check size={14} style={{ color: '#FFFFFF' }} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Note */}
              <div
                className="mt-6 p-4 rounded-xl"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                <p className="text-xs opacity-70" style={{ color: '#1F3B4D' }}>
                  💡 <span style={{ color: '#F59E0B' }}>Lưu ý:</span> Thay đổi ngôn ngữ sẽ được áp
                  dụng cho toàn bộ ứng dụng
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
