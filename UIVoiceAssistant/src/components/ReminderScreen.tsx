import { motion, AnimatePresence } from 'motion/react';
import { Plus, Clock, Calendar, MoreVertical, Trash2, Edit, X, RefreshCw } from 'lucide-react';
import { TopBar } from './TopBar';
import { useState, useEffect, useRef } from 'react'; // Thêm useRef
import axios from 'axios';

// 👇 1. IMPORT TỪ CONFIG & TTS
import { API_BASE } from '../config';
import { speak } from '../utils/tts'; // Hàm đọc của điện thoại

import { Capacitor } from '@capacitor/core';

interface Reminder {
  id: number;
  title: string;
  time: string;
  date: string;
  category: 'work' | 'personal' | 'health';
  color: string;
  is_notified?: boolean;
}

interface ReminderScreenProps {
  onNavigate?: (screen: string) => void;
  user: { uid: string };
}

export function ReminderScreen({ onNavigate, user }: ReminderScreenProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'work' | 'personal' | 'health'>('all');

  // State để quản lý việc đã thông báo chưa (tránh nói lặp lại liên tục trong 1 phút)
  const [notifiedIds, setNotifiedIds] = useState<number[]>([]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const isMobile = Capacitor.isNativePlatform();

  const activeReminders = reminders.filter(r => !r.is_notified);
  const [formData, setFormData] = useState({
    title: '',
    time: '',
    date: '',
    category: 'work' as 'work' | 'personal' | 'health',
  });

  const API_URL = `${API_BASE}/api/reminders`;

  // --- 1. HÀM GỌI API ---
  const fetchReminders = async () => {
    if (!user || !user.uid) return;
    try {
      const response = await axios.get(`${API_URL}?uid=${user.uid}`);
      // Sắp xếp lại để cái nào sắp đến giờ thì lên đầu (nếu muốn)
      setReminders(response.data.reverse());
    } catch (error) {
      console.error("Lỗi khi tải nhắc nhở:", error);
    }
  };

  // --- 2. POLLING DATA (Giữ nguyên) ---
  useEffect(() => {
    if (user?.uid) {
      fetchReminders();
      const interval = setInterval(fetchReminders, 2000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // --- 3. HỆ THỐNG BÁO THỨC TẠI CHỖ (CLIENT-SIDE ALARM) ---
  useEffect(() => {
    const alarmInterval = setInterval(() => {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const currentDate = now.toLocaleDateString('vi-VN');

      reminders.forEach(async (r) => { // Thêm async để gọi API
        // Logic: Đúng giờ + Đúng ngày + Chưa báo
        if (r.time === currentTime && r.date === currentDate && !r.is_notified && !notifiedIds.includes(r.id)) {

          console.log(`📱 APP BÁO THỨC: ${r.title}`);

          // 1. Điện thoại tự nói
          speak(`Đến giờ rồi! ${r.title}`);

          // 2. Đánh dấu tạm ở Client để không lặp lại trong giây tiếp theo
          setNotifiedIds(prev => [...prev, r.id]);

          // 3. 👇 QUAN TRỌNG: Gửi lệnh lên Server để đánh dấu là "Đã xong" vĩnh viễn
          try {
            await axios.put(`${API_URL}/${r.id}`, {
              ...r,
              is_notified: true, // Đánh dấu đã báo
              uid: user.uid
            });
            // Refresh lại list để đồng bộ giao diện
            fetchReminders();
          } catch (e) {
            console.error("Lỗi cập nhật trạng thái:", e);
          }
        }
      });

    }, 1000);

    return () => clearInterval(alarmInterval);
  }, [reminders, notifiedIds]);


  // --- CÁC HÀM XỬ LÝ KHÁC (GIỮ NGUYÊN) ---
  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      work: '#007BFF',
      personal: '#FF6B9D',
      health: '#10B981',
    };
    return colorMap[category] || '#007BFF';
  };

  const filteredReminders = selectedCategory === 'all'
    ? activeReminders
    : activeReminders.filter(r => r.category === selectedCategory);

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/${id}?uid=${user.uid}`);
      fetchReminders();
      setOpenDropdownId(null);
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      time: reminder.time,
      date: reminder.date,
      category: reminder.category,
    });
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleAdd = async () => {
    if (!formData.title) return;
    try {
      const newReminder = {
        title: formData.title,
        time: formData.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        date: formData.date || new Date().toLocaleDateString('vi-VN'),
        category: formData.category,
        color: getCategoryColor(formData.category),
        uid: user.uid
      };

      await axios.post(API_URL, newReminder);

      fetchReminders();
      setIsAddModalOpen(false);
      setFormData({ title: '', time: '', date: '', category: 'work' });
    } catch (error) {
      console.error("Lỗi khi thêm:", error);
    }
  };

  const handleUpdate = async () => {
    if (!editingReminder) return;
    try {
      const updatedData = {
        title: formData.title,
        time: formData.time,
        date: formData.date,
        category: formData.category,
        color: getCategoryColor(formData.category),
        uid: user.uid
      };

      await axios.put(`${API_URL}/${editingReminder.id}`, updatedData);

      fetchReminders();
      setIsEditModalOpen(false);
      setEditingReminder(null);
      setFormData({ title: '', time: '', date: '', category: 'work' });
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
    }
  };

  const categories = [
    { id: 'all', label: 'Tất cả', color: '#1F3B4D' },
    { id: 'work', label: 'Công việc', color: '#007BFF' },
    { id: 'personal', label: 'Cá nhân', color: '#FF6B9D' },
    { id: 'health', label: 'Sức khỏe', color: '#10B981' },
  ];

  return (
    <div className="min-h-screen px-6 pt-24 pb-12">
      <TopBar title="Lời nhắc" onNavigate={onNavigate} />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="opacity-70" style={{ color: '#1F3B4D' }}>
            {activeReminders.length} lời nhắc đang hoạt động
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchReminders}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            style={{
              backgroundColor: isMobile ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
              backdropFilter: isMobile ? 'none' : 'blur(10px)',
              border: '1px solid rgba(0,0,0,0.1)'
            }}
          >
            <RefreshCw size={20} style={{ color: '#1F3B4D' }} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddModalOpen(true)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            style={{
              backgroundColor: '#007BFF',
              boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
              backdropFilter: isMobile ? 'none' : 'blur(10px)'
            }}
          >
            <Plus size={24} style={{ color: '#FFFFFF' }} />
          </motion.button>
        </div>
      </div>

      {/* Categories Filter */}
      <div className="mb-6">
        <p className="text-sm mb-3 opacity-70" style={{ color: '#1F3B4D' }}>
          Lọc theo danh mục:
        </p>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category.id as any)}
              className="px-4 py-2 rounded-full transition-all"
              style={{
                backgroundColor:
                  selectedCategory === category.id
                    ? category.color
                    : (isMobile ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)'),
                backdropFilter: isMobile ? 'none' : 'blur(10px)',
                color: selectedCategory === category.id ? '#FFFFFF' : category.color,
                border: selectedCategory === category.id ? 'none' : `1px solid ${category.color}40`,
              }}
            >
              {category.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reminders List */}
      <div className={`space-y-3 ${filteredReminders.length > 5 ? 'max-h-[calc(100vh-400px)] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
        <AnimatePresence>
          {filteredReminders.map((reminder, index) => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className="px-4 py-4 rounded-2xl relative"
              style={{
                backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: isMobile ? 'none' : 'blur(10px)',
                boxShadow: isMobile ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                zIndex: openDropdownId === reminder.id ? 50 : 1
              }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                style={{ backgroundColor: reminder.color }}
              />

              <div className="flex items-start gap-3 pl-3">
                <div className="flex-1 min-w-0">
                  <h3 className="mb-2" style={{ color: '#1F3B4D' }}>
                    {reminder.title}
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock size={14} style={{ color: '#1F3B4D', opacity: 0.5 }} />
                      <span
                        className="text-sm opacity-70"
                        style={{ color: '#1F3B4D' }}
                      >
                        {reminder.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} style={{ color: '#1F3B4D', opacity: 0.5 }} />
                      <span
                        className="text-sm opacity-70"
                        style={{ color: '#1F3B4D' }}
                      >
                        {reminder.date}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setOpenDropdownId(openDropdownId === reminder.id ? null : reminder.id)}
                    className="p-1 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <MoreVertical size={18} style={{ color: '#1F3B4D', opacity: 0.6 }} />
                  </motion.button>

                  <AnimatePresence>
                    {openDropdownId === reminder.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenDropdownId(null)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-40 rounded-xl shadow-2xl z-50"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                            border: '1px solid rgba(0, 123, 255, 0.2)',
                            boxShadow: '0 8px 32px rgba(0, 123, 255, 0.15)'
                          }}
                        >
                          <motion.button
                            whileHover={{ backgroundColor: 'rgba(0, 123, 255, 0.08)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleEdit(reminder)}
                            className="w-full px-4 py-3 flex items-center gap-3 transition-all rounded-t-xl"
                            style={{ color: '#1F3B4D' }}
                          >
                            <Edit size={16} style={{ color: '#007BFF' }} />
                            <span className="text-sm">Sửa</span>
                          </motion.button>

                          <div style={{ height: '1px', backgroundColor: 'rgba(0, 123, 255, 0.1)' }} />

                          <motion.button
                            whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleDelete(reminder.id)}
                            className="w-full px-4 py-3 flex items-center gap-3 transition-all rounded-b-xl"
                            style={{ color: '#EF4444' }}
                          >
                            <Trash2 size={16} style={{ color: '#EF4444' }} />
                            <span className="text-sm">Xóa</span>
                          </motion.button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setFormData({ title: '', time: '', date: '', category: 'work' });
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-[90%] max-w-[500px] rounded-3xl p-6 shadow-2xl"
              style={{
                backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: isMobile ? 'none' : 'blur(10px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ color: '#1F3B4D' }}>
                  {isEditModalOpen ? 'Sửa lời nhắc' : 'Thêm lời nhắc mới'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    setFormData({ title: '', time: '', date: '', category: 'work' });
                  }}
                >
                  <X size={24} style={{ color: '#1F3B4D' }} />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                    Tiêu đề
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Nhập tiêu đề..."
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-sm"
                    style={{
                      backgroundColor: 'rgba(230, 247, 255, 0.5)',
                      border: '1px solid rgba(0, 123, 255, 0.2)',
                      color: '#1F3B4D'
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                      Giờ
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl backdrop-blur-sm"
                      style={{
                        backgroundColor: 'rgba(230, 247, 255, 0.5)',
                        border: '1px solid rgba(0, 123, 255, 0.2)',
                        color: '#1F3B4D'
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                      Ngày
                    </label>
                    <input
                      type="text"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      placeholder="dd/mm/yyyy"
                      className="w-full px-4 py-3 rounded-xl backdrop-blur-sm"
                      style={{
                        backgroundColor: 'rgba(230, 247, 255, 0.5)',
                        border: '1px solid rgba(0, 123, 255, 0.2)',
                        color: '#1F3B4D'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#1F3B4D' }}>
                    Danh mục
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: 'work', label: 'Công việc', color: '#007BFF' },
                      { id: 'personal', label: 'Cá nhân', color: '#FF6B9D' },
                      { id: 'health', label: 'Sức khỏe', color: '#10B981' },
                    ].map((cat) => (
                      <motion.button
                        key={cat.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFormData({ ...formData, category: cat.id as any })}
                        className="flex-1 py-2 rounded-lg transition-all"
                        style={{
                          backgroundColor: formData.category === cat.id ? cat.color : 'rgba(255, 255, 255, 0.5)',
                          color: formData.category === cat.id ? '#FFFFFF' : cat.color,
                          border: `1px solid ${cat.color}40`,
                        }}
                      >
                        <span className="text-sm">{cat.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={isEditModalOpen ? handleUpdate : handleAdd}
                  className="w-full py-3 rounded-xl mt-6"
                  style={{
                    backgroundColor: '#007BFF',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
                  }}
                >
                  {isEditModalOpen ? 'Cập nhật' : 'Thêm lời nhắc'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}