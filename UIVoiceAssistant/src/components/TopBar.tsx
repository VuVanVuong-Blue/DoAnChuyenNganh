import { useState } from 'react';
import { Menu, X, Home, MessageSquare, Cloud, Bell, Apple, Settings, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core'; // Import check nền tảng

interface TopBarProps {
  title: string;
  onNavigate?: (screen: string) => void;
}

export function TopBar({ title, onNavigate }: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Check xem có phải điện thoại không
  const isMobile = Capacitor.isNativePlatform();

  const menuItems = [
    { id: 'home', icon: Home, label: 'Trang chủ', color: '#007BFF' },
    { id: 'message', icon: MessageSquare, label: 'Trò chuyện', color: '#007BFF' },
    { id: 'weather', icon: Cloud, label: 'Thời tiết', color: '#007BFF' },
    { id: 'reminder', icon: Bell, label: 'Lời nhắc', color: '#007BFF' },
    { id: 'nutrition', icon: Apple, label: 'Dinh Dưỡng', color: '#10B981' },
    { id: 'settings', icon: Settings, label: 'Cài đặt', color: '#1F3B4D' },
    { id: 'profile', icon: User, label: 'Hồ sơ', color: '#1F3B4D' },
  ];

  const handleMenuItemClick = (id: string) => {
    if (onNavigate) {
      onNavigate(id);
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Top Bar - Đã tối ưu */}
      <div 
        className="fixed top-0 left-0 right-0 z-40 px-6 py-4"
        style={{ 
          // 👇 TỐI ƯU CỰC MẠNH:
          // - Mobile: Dùng nền trắng đục 98% (Không Blur) -> Cuộn mượt 60fps
          // - Laptop: Dùng nền trong suốt + Blur -> Đẹp
          backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: isMobile ? 'none' : 'blur(12px)',
          borderBottom: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none'
        }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 -ml-2 rounded-lg transition-all active:scale-95"
          >
            <Menu size={24} style={{ color: '#1F3B4D' }} />
          </button>

          <h2 className="font-bold text-lg" style={{ color: '#1F3B4D' }}>{title}</h2>

          <div className="w-10"></div>
        </div>
      </div>

      {/* Sidebar Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-80 shadow-2xl"
              // Tối ưu Sidebar cho Mobile luôn
              style={{ 
                backgroundColor: isMobile ? '#FFFFFF' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: isMobile ? 'none' : 'blur(10px)'
              }}
            >
              {/* Header */}
              <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(31, 59, 77, 0.1)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold" style={{ color: '#1F3B4D' }}>Menu</h2>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-lg active:scale-95"
                  >
                    <X size={24} style={{ color: '#1F3B4D' }} />
                  </button>
                </div>
                <p className="text-sm opacity-70" style={{ color: '#1F3B4D' }}>
                  Trợ lý AI thông minh
                </p>
              </div>

              {/* Items */}
              <nav className="px-4 py-6 overflow-y-auto max-h-[80vh]">
                <div className="space-y-2">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleMenuItemClick(item.id)}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all active:scale-95"
                        style={{ backgroundColor: 'rgba(0, 123, 255, 0.05)' }}
                      >
                        <Icon size={22} style={{ color: item.color }} />
                        <span className="font-medium" style={{ color: '#1F3B4D' }}>{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </nav>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 px-6 py-6 border-t bg-white" style={{ borderColor: 'rgba(31, 59, 77, 0.1)' }}>
                <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: '#E6F7FF' }}>
                  <p className="text-sm font-semibold" style={{ color: '#1F3B4D' }}>
                    Phiên bản 1.0.0
                  </p>
                  <p className="text-xs opacity-60 mt-1" style={{ color: '#1F3B4D' }}>
                    © 2025 Trợ lý AI
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}