import { motion } from 'motion/react';
import { TopBar } from './TopBar';
import { useState } from 'react';
import {
  User as UserIcon,
  Mail,
  Send,
  LogOut,
  Camera,
  ChevronRight,
} from 'lucide-react';

// --- THÊM MỚI: Import Firebase ---
import { auth } from '../firebaseConfig';
import { updateProfile, sendPasswordResetEmail, signOut } from 'firebase/auth';

// 👇 1. IMPORT TỪ CONFIG CHUNG
import { API_BASE } from '../config';

// 👇 2. IMPORT ĐỂ TỐI ƯU UI MOBILE
import { Capacitor } from '@capacitor/core';

interface UserProfileScreenProps {
  onNavigate: (screen: string) => void;
  userData: {
    name: string;
    email: string;
  };
  onLogout: () => void;
  onUpdateProfile: (name: string) => void;
}

export function UserProfileScreen({
  onNavigate,
  userData,
  onLogout,
  onUpdateProfile,
}: UserProfileScreenProps) {
  const [name, setName] = useState(userData.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  // Check nền tảng để tối ưu UI
  const isMobile = Capacitor.isNativePlatform();

  // --- HÀM 1: LƯU TÊN (Đã sửa URL API) ---
  const handleSave = async () => {
    if (name.trim() && name !== userData.name) {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // 1. Cập nhật trên Firebase Auth (để hiện ngay)
          await updateProfile(currentUser, { displayName: name.trim() });

          // 2. Gọi API Python (Dùng API_BASE thay vì localhost cứng)
          await fetch(`${API_BASE}/api/nutrition/profile`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               uid: currentUser.uid,
               data: { name: name.trim() } 
             })
          });

          // 3. Cập nhật UI App cha
          onUpdateProfile(name.trim());
        }
      } catch (error) {
        console.error("Lỗi cập nhật tên:", error);
        alert("Có lỗi khi lưu tên, vui lòng thử lại.");
      }
    }
    setIsEditing(false);
  };

  // --- HÀM 2: GỬI MAIL ĐỔI MẬT KHẨU (Giữ nguyên) ---
  const handlePasswordReset = async () => {
    if (!userData.email) return;
    
    setIsSendingPasswordReset(true);
    try {
      await sendPasswordResetEmail(auth, userData.email);
      
      setIsSendingPasswordReset(false);
      setPasswordResetSent(true);
      setTimeout(() => setPasswordResetSent(false), 5000); 
    } catch (error: any) {
      console.error("Lỗi gửi mail:", error);
      setIsSendingPasswordReset(false);
      alert("Lỗi: " + error.message);
    }
  };

  // --- HÀM 3: ĐĂNG XUẤT (Giữ nguyên) ---
  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      try {
        await signOut(auth); 
        onLogout(); 
      } catch (error) {
        console.error("Lỗi đăng xuất:", error);
      }
    }
  };

  // Get avatar initials
  const getInitials = (name: string) => {
    return (name || "U")
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen px-6 pt-24 pb-12">
      <TopBar title="Hồ sơ" onNavigate={onNavigate} />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Card - Avatar & Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-8 relative overflow-hidden"
          // 👇 TỐI ƯU FPS: Mobile dùng nền trắng đục, PC dùng blur
          style={{
            backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: isMobile ? 'none' : 'blur(20px)',
            border: '2px solid rgba(0, 123, 255, 0.2)',
            boxShadow: isMobile ? '0 4px 12px rgba(0, 123, 255, 0.1)' : '0 8px 32px rgba(0, 123, 255, 0.15)',
          }}
        >
          {/* Background decoration */}
          <div
            className="absolute top-0 left-0 right-0 h-32 opacity-30"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 123, 255, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
            }}
          />

          {/* Avatar Section */}
          <div className="relative text-center mb-6">
            <div className="relative inline-block">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-32 h-32 rounded-full mx-auto flex items-center justify-center text-4xl relative"
                style={{
                  background: 'linear-gradient(135deg, #007BFF 0%, #3B82F6 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 12px 40px rgba(0, 123, 255, 0.4)',
                }}
              >
                {getInitials(userData.name)}
                
                {/* Online indicator */}
                <div
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center"
                  style={{ backgroundColor: '#10B981' }}
                >
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>
              </motion.div>

              {/* Camera button overlay */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#007BFF',
                  boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
                }}
              >
                <Camera size={20} style={{ color: '#FFFFFF' }} />
              </motion.button>
            </div>

            {/* Name & Email */}
            <h2 className="mt-6 mb-2" style={{ color: '#1F3B4D' }}>
              {userData.name}
            </h2>
            <p className="text-sm opacity-70" style={{ color: '#1F3B4D' }}>
              {userData.email}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div
                className="rounded-xl p-3"
                style={{
                  backgroundColor: 'rgba(0, 123, 255, 0.1)',
                }}
              >
                <p className="text-2xl mb-1" style={{ color: '#007BFF' }}>
                  47
                </p>
                <p className="text-xs opacity-70" style={{ color: '#1F3B4D' }}>
                  Tin nhắn
                </p>
              </div>
              <div
                className="rounded-xl p-3"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                }}
              >
                <p className="text-2xl mb-1" style={{ color: '#10B981' }}>
                  12
                </p>
                <p className="text-xs opacity-70" style={{ color: '#1F3B4D' }}>
                  Lời nhắc
                </p>
              </div>
              <div
                className="rounded-xl p-3"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                }}
              >
                <p className="text-2xl mb-1" style={{ color: '#F59E0B' }}>
                  8
                </p>
                <p className="text-xs opacity-70" style={{ color: '#1F3B4D' }}>
                  Ngày
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl p-6"
          // 👇 TỐI ƯU FPS
          style={{
            backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: isMobile ? 'none' : 'blur(20px)',
            border: '2px solid rgba(0, 123, 255, 0.2)',
            boxShadow: isMobile ? '0 4px 12px rgba(0, 123, 255, 0.1)' : '0 8px 32px rgba(0, 123, 255, 0.15)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ color: '#1F3B4D' }}>📝 Thông tin cá nhân</h3>
            {!isEditing ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl text-sm"
                style={{
                  backgroundColor: 'rgba(0, 123, 255, 0.1)',
                  color: '#007BFF',
                }}
              >
                Chỉnh sửa
              </motion.button>
            ) : (
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setName(userData.name);
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#EF4444',
                  }}
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{
                    backgroundColor: '#007BFF',
                    color: '#FFFFFF',
                  }}
                >
                  Lưu
                </motion.button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="text-sm mb-2 block opacity-70" style={{ color: '#1F3B4D' }}>
                Họ và tên
              </label>
              <div className="relative">
                <UserIcon
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-8"
                  style={{ color: '#007BFF', opacity: 0.5 }}
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm"
                  style={{
                    backgroundColor: isEditing ? 'rgba(230, 247, 255, 0.5)' : 'rgba(230, 247, 255, 0.3)',
                    border: '2px solid rgba(0, 123, 255, 0.2)',
                    color: '#1F3B4D',
                    cursor: isEditing ? 'text' : 'not-allowed',
                    opacity: isEditing ? 1 : 0.7,
                  }}
                />
              </div>
            </div>

            {/* Email Field (Read-only) */}
            <div>
              <label className="text-sm mb-2 block opacity-70" style={{ color: '#1F3B4D' }}>
                Email
              </label>
              <div className="relative">
                <Mail
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#007BFF', opacity: 0.5 }}
                />
                <input
                  type="email"
                  value={userData.email}
                  readOnly
                  className="w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm cursor-not-allowed"
                  style={{
                    backgroundColor: 'rgba(230, 247, 255, 0.3)',
                    border: '2px solid rgba(0, 123, 255, 0.15)',
                    color: '#1F3B4D',
                    opacity: 0.7,
                  }}
                />
              </div>
              <p className="text-xs mt-2 opacity-60" style={{ color: '#1F3B4D' }}>
                🔒 Email không thể thay đổi
              </p>
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl p-6"
          // 👇 TỐI ƯU FPS
          style={{
            backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: isMobile ? 'none' : 'blur(20px)',
            border: '2px solid rgba(0, 123, 255, 0.2)',
            boxShadow: isMobile ? '0 4px 12px rgba(0, 123, 255, 0.1)' : '0 8px 32px rgba(0, 123, 255, 0.15)',
          }}
        >
          <h3 className="mb-5" style={{ color: '#1F3B4D' }}>
            🔐 Bảo mật
          </h3>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePasswordReset}
            disabled={isSendingPasswordReset}
            className="w-full py-4 rounded-xl flex items-center justify-between"
            style={{
              backgroundColor: passwordResetSent
                ? 'rgba(16, 185, 129, 0.15)'
                : isSendingPasswordReset
                ? 'rgba(0, 123, 255, 0.05)'
                : 'rgba(0, 123, 255, 0.1)',
              border: `2px solid ${
                passwordResetSent ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0, 123, 255, 0.3)'
              }`,
              cursor: isSendingPasswordReset ? 'not-allowed' : 'pointer',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: passwordResetSent
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(0, 123, 255, 0.2)',
                }}
              >
                {isSendingPasswordReset ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-[#007BFF] border-t-transparent rounded-full"
                  />
                ) : passwordResetSent ? (
                  <span className="text-lg">✅</span>
                ) : (
                  <Send size={18} style={{ color: '#007BFF' }} />
                )}
              </div>
              <div className="text-left">
                <p style={{ color: passwordResetSent ? '#10B981' : '#1F3B4D' }}>
                  {passwordResetSent ? 'Đã gửi email!' : 'Đổi mật khẩu'}
                </p>
                <p className="text-xs opacity-60" style={{ color: '#1F3B4D' }}>
                  {passwordResetSent
                    ? 'Kiểm tra hộp thư của bạn'
                    : 'Gửi link đặt lại qua email'}
                </p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: '#007BFF', opacity: 0.5 }} />
          </motion.button>
        </motion.div>

        {/* Danger Zone - Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }} />
            <span className="text-xs opacity-50" style={{ color: '#EF4444' }}>
              Danger Zone
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }} />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-3"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
            }}
          >
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </motion.button>
        </motion.div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs opacity-50" style={{ color: '#1F3B4D' }}>
            © 2025 Trợ lý AI • Made with ❤️
          </p>
        </div>
      </div>
    </div>
  );
}