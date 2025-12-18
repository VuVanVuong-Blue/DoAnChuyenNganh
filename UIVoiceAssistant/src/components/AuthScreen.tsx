import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
// --- 1. Import Firebase SDK ---
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail,
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

// 👇 2. IMPORT TỪ CONFIG CHUNG (Để sửa lỗi kết nối Server)
import { API_BASE } from '../config';

// 👇 3. IMPORT ĐỂ TỐI ƯU UI MOBILE
import { Capacitor } from '@capacitor/core';

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [serverError, setServerError] = useState(''); // Biến lưu lỗi từ Firebase/Server

  // Check nền tảng để tối ưu UI
  const isMobile = Capacitor.isNativePlatform();

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [forgotForm, setForgotForm] = useState({ email: '' });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- 2. HÀM KẾT NỐI SERVER PYTHON (ĐÃ SỬA URL) ---
  const saveUserProfileToBackend = async (uid: string, email: string, name: string) => {
    try {
      // Gọi API Python qua API_BASE (IP LAN) thay vì localhost
      await fetch(`${API_BASE}/api/nutrition/profile`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: uid,
          data: { 
            email: email, 
            name: name, 
            role: 'user', 
            joinedAt: new Date().toISOString() 
          }
        })
      });
      console.log("✅ Đã đồng bộ hồ sơ lên Backend");
    } catch (err) {
      console.error("❌ Lỗi lưu backend:", err);
      // Không chặn luồng chính nếu lỗi backend, vẫn cho user vào app
    }
  };

  // Password strength logic
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { level: 0, text: '', color: '' };
    if (password.length < 6) return { level: 1, text: 'Yếu', color: '#EF4444' };
    if (password.length < 10) return { level: 2, text: 'Trung bình', color: '#F59E0B' };
    return { level: 3, text: 'Mạnh', color: '#10B981' };
  };

  const passwordStrength = getPasswordStrength(registerForm.password);

  // Validate email
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // --- 3. XỬ LÝ ĐĂNG NHẬP (LOGIC THẬT) ---
  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setServerError('');
    const newErrors: Record<string, string> = {};

    if (!loginForm.email) newErrors.email = 'Vui lòng nhập email';
    else if (!validateEmail(loginForm.email)) newErrors.email = 'Email không hợp lệ';
    
    if (!loginForm.password) newErrors.password = 'Vui lòng nhập mật khẩu';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      // Gọi Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      // Thành công -> Chuyển vào App chính
      onLoginSuccess(userCredential.user);
    } catch (err: any) {
      // Xử lý thông báo lỗi thân thiện
      if (err.message.includes('invalid-credential') || err.message.includes('wrong-password')) {
        setServerError('Sai email hoặc mật khẩu');
      } else if (err.message.includes('user-not-found')) {
        setServerError('Tài khoản không tồn tại');
      } else if (err.message.includes('too-many-requests')) {
        setServerError('Quá nhiều lần thử sai. Vui lòng đợi lát nữa.');
      } else {
        setServerError('Lỗi đăng nhập: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. XỬ LÝ ĐĂNG KÝ (LOGIC THẬT) ---
  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setServerError('');
    const newErrors: Record<string, string> = {};

    if (!registerForm.name) newErrors.name = 'Vui lòng nhập họ tên';
    if (!registerForm.email) newErrors.email = 'Vui lòng nhập email';
    else if (!validateEmail(registerForm.email)) newErrors.email = 'Email không hợp lệ';
    
    if (!registerForm.password) newErrors.password = 'Vui lòng nhập mật khẩu';
    else if (registerForm.password.length < 6) newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    
    if (!registerForm.confirmPassword) newErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu';
    else if (registerForm.password !== registerForm.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      // 1. Tạo tài khoản Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, registerForm.email, registerForm.password);
      const user = userCredential.user;

      // 2. Cập nhật Tên hiển thị (DisplayName)
      await updateProfile(user, { displayName: registerForm.name });

      // 3. Đồng bộ xuống Backend Python (để tạo Document trong Firestore)
      await saveUserProfileToBackend(user.uid, registerForm.email, registerForm.name);

      onLoginSuccess(user);
    } catch (err: any) {
      if (err.message.includes('email-already-in-use')) {
        setServerError('Email này đã được sử dụng');
      } else {
        setServerError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- 5. XỬ LÝ QUÊN MẬT KHẨU (LOGIC THẬT) ---
  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setServerError('');
    const newErrors: Record<string, string> = {};

    if (!forgotForm.email) newErrors.email = 'Vui lòng nhập email';
    else if (!validateEmail(forgotForm.email)) newErrors.email = 'Email không hợp lệ';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      // Gửi email reset password của Firebase
      await sendPasswordResetEmail(auth, forgotForm.email);
      setForgotEmailSent(true);
    } catch (err: any) {
      // Bảo mật: Thường không nên báo cụ thể email có tồn tại không
      // Nhưng để test thì cứ báo lỗi ra
      if (err.message.includes('user-not-found')) {
        setServerError('Không tìm thấy tài khoản với email này');
      } else {
        setServerError('Lỗi gửi email: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- 6. XỬ LÝ ĐĂNG NHẬP GOOGLE (LOGIC THẬT) ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Lưu ý: Trên Mobile Capacitor, signInWithPopup có thể hoạt động nhưng trải nghiệm
      // tốt nhất là dùng plugin native. Ở đây ta giữ nguyên để đơn giản hóa code.
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Đồng bộ user Google xuống Backend luôn
      await saveUserProfileToBackend(user.uid, user.email || '', user.displayName || 'Google User');
      
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      setServerError('Lỗi đăng nhập Google: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background: 'linear-gradient(135deg, #E6F7FF 0%, #B3E0FF 100%)',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md rounded-3xl p-8 relative"
          // 👇 TỐI ƯU UI MOBILE: Nền trắng đục, không Blur để tăng FPS
          style={{
            backgroundColor: isMobile ? '#FFFFFF' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: isMobile ? 'none' : 'blur(20px)',
            border: '2px solid rgba(0, 123, 255, 0.2)',
            boxShadow: '0 20px 60px rgba(0, 123, 255, 0.3)',
          }}
        >
          {/* Back Button for Forgot Password */}
          {mode === 'forgot' && !forgotEmailSent && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setMode('login');
                setForgotForm({ email: '' });
                setErrors({});
                setServerError('');
              }}
              className="absolute top-6 left-6 w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
              }}
            >
              <ArrowLeft size={20} style={{ color: '#007BFF' }} />
            </motion.button>
          )}
          
          {/* HIỂN THỊ LỖI SERVER (NẾU CÓ) */}
          {serverError && (
             <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 text-red-500 rounded-xl text-sm text-center border border-red-100"
             >
                ⚠️ {serverError}
             </motion.div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="text-center mb-2" style={{ color: '#1F3B4D' }}>
                Chào mừng trở lại
              </h1>
              <p className="text-center text-sm opacity-60 mb-8" style={{ color: '#1F3B4D' }}>
                Đăng nhập để tiếp tục
              </p>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                      style={{ color: '#007BFF', opacity: 0.5 }}
                    />
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => {
                        setLoginForm({ ...loginForm, email: e.target.value });
                        setErrors({ ...errors, email: '' });
                      }}
                      placeholder="email@example.com"
                      className="w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm"
                      style={{
                        backgroundColor: 'rgba(230, 247, 255, 0.5)',
                        border: `2px solid ${errors.email ? '#EF4444' : 'rgba(0, 123, 255, 0.2)'}`,
                        color: '#1F3B4D',
                      }}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                      style={{ color: '#007BFF', opacity: 0.5 }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={(e) => {
                        setLoginForm({ ...loginForm, password: e.target.value });
                        setErrors({ ...errors, password: '' });
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 rounded-xl backdrop-blur-sm"
                      style={{
                        backgroundColor: 'rgba(230, 247, 255, 0.5)',
                        border: `2px solid ${errors.password ? '#EF4444' : 'rgba(0, 123, 255, 0.2)'}`,
                        color: '#1F3B4D',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff size={20} style={{ color: '#007BFF', opacity: 0.5 }} />
                      ) : (
                        <Eye size={20} style={{ color: '#007BFF', opacity: 0.5 }} />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#007BFF]"
                    />
                    <span className="text-sm" style={{ color: '#1F3B4D' }}>
                      Ghi nhớ đăng nhập
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setServerError(''); setErrors({}); }}
                    className="text-sm"
                    style={{ color: '#007BFF' }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: isLoading ? '#ccc' : '#1F3B4D',
                    color: '#FFFFFF',
                    boxShadow: isLoading ? 'none' : '0 4px 16px rgba(31, 59, 77, 0.3)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Đang đăng nhập...</span>
                    </>
                  ) : (
                    'Đăng nhập'
                  )}
                </motion.button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(0, 123, 255, 0.2)' }} />
                <span className="text-sm opacity-60" style={{ color: '#1F3B4D' }}>
                  Hoặc đăng nhập bằng
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(0, 123, 255, 0.2)' }} />
              </div>

              {/* Google Login */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-3"
                style={{
                  backgroundColor: 'rgba(66, 133, 244, 0.1)',
                  border: '2px solid rgba(66, 133, 244, 0.3)',
                  color: '#4285F4',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Đăng nhập bằng Google
              </motion.button>

              {/* Switch to Register */}
              <p className="text-center text-sm mt-6" style={{ color: '#1F3B4D' }}>
                Chưa có tài khoản?{' '}
                <button
                  onClick={() => {
                    setMode('register');
                    setErrors({});
                    setServerError('');
                  }}
                  className="underline"
                  style={{ color: '#007BFF' }}
                >
                  Đăng ký ngay
                </button>
              </p>
            </motion.div>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="text-center mb-2" style={{ color: '#1F3B4D' }}>
                Tạo tài khoản mới
              </h1>
              <p className="text-center text-sm opacity-60 mb-8" style={{ color: '#1F3B4D' }}>
                Điền thông tin để bắt đầu
              </p>

              <form onSubmit={handleRegister} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                    Họ và tên
                  </label>
                  <div className="relative">
                    <UserIcon
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                      style={{ color: '#007BFF', opacity: 0.5 }}
                    />
                    <input
                      type="text"
                      value={registerForm.name}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, name: e.target.value });
                        setErrors({ ...errors, name: '' });
                      }}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm"
                      style={{
                        backgroundColor: 'rgba(230, 247, 255, 0.5)',
                        border: `2px solid ${errors.name ? '#EF4444' : 'rgba(0, 123, 255, 0.2)'}`,
                        color: '#1F3B4D',
                      }}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                      style={{ color: '#007BFF', opacity: 0.5 }}
                    />
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, email: e.target.value });
                        setErrors({ ...errors, email: '' });
                      }}
                      placeholder="email@example.com"
                      className="w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm"
                      style={{
                        backgroundColor: 'rgba(230, 247, 255, 0.5)',
                        border: `2px solid ${errors.email ? '#EF4444' : 'rgba(0, 123, 255, 0.2)'}`,
                        color: '#1F3B4D',
                      }}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                      style={{ color: '#007BFF', opacity: 0.5 }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerForm.password}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, password: e.target.value });
                        setErrors({ ...errors, password: '' });
                      }}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 rounded-xl backdrop-blur-sm"
                      style={{
                        backgroundColor: 'rgba(230, 247, 255, 0.5)',
                        border: `2px solid ${errors.password ? '#EF4444' : 'rgba(0, 123, 255, 0.2)'}`,
                        color: '#1F3B4D',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff size={20} style={{ color: '#007BFF', opacity: 0.5 }} />
                      ) : (
                        <Eye size={20} style={{ color: '#007BFF', opacity: 0.5 }} />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                      {errors.password}
                    </p>
                  )}
                  {/* Password Strength */}
                  {registerForm.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 rounded-full bg-white/50 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(passwordStrength.level / 3) * 100}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: passwordStrength.color }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: passwordStrength.color }}>
                          {passwordStrength.text}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                    Nhập lại mật khẩu
                  </label>
                  <div className="relative">
                    <Lock
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                      style={{ color: '#007BFF', opacity: 0.5 }}
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={registerForm.confirmPassword}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, confirmPassword: e.target.value });
                        setErrors({ ...errors, confirmPassword: '' });
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 rounded-xl backdrop-blur-sm"
                      style={{
                        backgroundColor: 'rgba(230, 247, 255, 0.5)',
                        border: `2px solid ${errors.confirmPassword ? '#EF4444' : 'rgba(0, 123, 255, 0.2)'}`,
                        color: '#1F3B4D',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} style={{ color: '#007BFF', opacity: 0.5 }} />
                      ) : (
                        <Eye size={20} style={{ color: '#007BFF', opacity: 0.5 }} />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: isLoading ? '#ccc' : '#1F3B4D',
                    color: '#FFFFFF',
                    boxShadow: isLoading ? 'none' : '0 4px 16px rgba(31, 59, 77, 0.3)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Đang tạo tài khoản...</span>
                    </>
                  ) : (
                    'Tạo tài khoản'
                  )}
                </motion.button>
              </form>

              {/* Switch to Login */}
              <p className="text-center text-sm mt-6" style={{ color: '#1F3B4D' }}>
                Đã có tài khoản?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setErrors({});
                    setServerError('');
                  }}
                  className="underline"
                  style={{ color: '#007BFF' }}
                >
                  Đăng nhập
                </button>
              </p>
            </motion.div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {!forgotEmailSent ? (
                <>
                  <h1 className="text-center mb-2 mt-6" style={{ color: '#1F3B4D' }}>
                    Khôi phục mật khẩu
                  </h1>
                  <p className="text-center text-sm opacity-60 mb-8" style={{ color: '#1F3B4D' }}>
                    Nhập email của bạn, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu
                  </p>

                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    {/* Email */}
                    <div>
                      <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                        Email
                      </label>
                      <div className="relative">
                        <Mail
                          size={20}
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                          style={{ color: '#007BFF', opacity: 0.5 }}
                        />
                        <input
                          type="email"
                          value={forgotForm.email}
                          onChange={(e) => {
                            setForgotForm({ email: e.target.value });
                            setErrors({ ...errors, email: '' });
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                          placeholder="email@example.com"
                          className="w-full pl-12 pr-4 py-3 rounded-xl backdrop-blur-sm"
                          style={{
                            backgroundColor: 'rgba(230, 247, 255, 0.5)',
                            border: `2px solid ${errors.email ? '#EF4444' : 'rgba(0, 123, 255, 0.2)'}`,
                            color: '#1F3B4D',
                          }}
                          autoFocus
                        />
                      </div>
                      {errors.email && (
                        <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <motion.button
                      type="submit"
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: isLoading ? '#ccc' : '#007BFF',
                        color: '#FFFFFF',
                        boxShadow: isLoading ? 'none' : '0 4px 16px rgba(0, 123, 255, 0.3)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isLoading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span>Đang gửi...</span>
                        </>
                      ) : (
                        'Gửi link khôi phục'
                      )}
                    </motion.button>
                  </form>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
                  >
                    <span className="text-4xl">✉️</span>
                  </div>
                  <h2 className="mb-3" style={{ color: '#1F3B4D' }}>
                    Email đã được gửi!
                  </h2>
                  <p className="text-sm opacity-60 mb-6 px-4" style={{ color: '#1F3B4D' }}>
                    Vui lòng kiểm tra hộp thư của bạn để đặt lại mật khẩu
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setMode('login');
                      setForgotEmailSent(false);
                      setForgotForm({ email: '' });
                    }}
                    className="w-full py-3 rounded-xl"
                    style={{
                      backgroundColor: '#007BFF',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 16px rgba(0, 123, 255, 0.3)',
                    }}
                  >
                    Quay lại đăng nhập
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}