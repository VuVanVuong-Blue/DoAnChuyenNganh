import { useState, useEffect } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { MessageScreen } from "./components/MessageScreen";
import { WeatherScreen } from "./components/WeatherScreen";
import { ReminderScreen } from "./components/ReminderScreen";
import { NutritionScreen } from "./components/NutritionScreen";
import { AuthScreen } from "./components/AuthScreen";
import { UserProfileScreen } from "./components/UserProfileScreen";
import { SettingScreen } from "./components/SettingScreen";
import { auth } from "./firebaseConfig"; // Nhớ import auth
import { onAuthStateChanged } from "firebase/auth";
// 👇 IMPORT CONFIG CHUẨN
import { API_BASE } from './config';


type Screen = "home" | "message" | "weather" | "reminder" | "nutrition" | "profile" | "settings";

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Thêm uid vào kiểu dữ liệu
  const [userData, setUserData] = useState<any>(null);

  // Giữ đăng nhập khi F5
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserData({
          uid: user.uid,
          name: user.displayName || "Người dùng",
          email: user.email || ""
        });
        setIsAuthenticated(true);

        // 👇 [THÊM MỚI] Báo cho Server Python biết ai đang dùng
        fetch(`${API_BASE}/api/set_current_user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid })
        }).catch(err => console.error("Lỗi đồng bộ user:", err));

      } else {
        setUserData(null);
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleNavigate = (screen: string) => setActiveScreen(screen as Screen);

  const handleLoginSuccess = (user: any) => {
    setUserData({
      uid: user.uid,
      name: user.displayName || "Người dùng",
      email: user.email || ""
    });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUserData(null);
    setIsAuthenticated(false);
    setActiveScreen("home");
  };

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Tạo biến user chuẩn để truyền xuống dưới
  const currentUser = userData ? {
    uid: userData.uid,
    displayName: userData.name,
    email: userData.email
  } : { uid: "" };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: "#E6F7FF" }}>
      {activeScreen === "home" && <HomeScreen onNavigate={handleNavigate} user={currentUser}/>}

      {activeScreen === "message" && (
        <MessageScreen onNavigate={handleNavigate} user={currentUser} />
      )}

      {activeScreen === "weather" && <WeatherScreen onNavigate={handleNavigate} />}

      {/* 👇 ĐÃ SỬA: Truyền user vào ReminderScreen */}
      {activeScreen === "reminder" && (
        <ReminderScreen onNavigate={handleNavigate} user={currentUser} />
      )}

      {activeScreen === "nutrition" && (
        <NutritionScreen onNavigate={handleNavigate} user={currentUser} />
      )}

      {activeScreen === "profile" && userData && (
        <UserProfileScreen
          onNavigate={handleNavigate}
          userData={userData}
          onLogout={handleLogout}
          onUpdateProfile={(name) => setUserData({ ...userData, name })}
        />
      )}

      {activeScreen === "settings" && <SettingScreen onNavigate={handleNavigate} />}
    </div>
  );
}