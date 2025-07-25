
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, GoogleGenAI as GoogleGenAIType } from '@google/genai';
import { SupabaseClient } from '@supabase/supabase-js';

// --- SUPABASE CLIENT SETUP ---
const SUPABASE_URL = 'https://ophlmmpisgizpvgxndkh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9waGxtbXBpc2dpenB2Z3huZGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTcxMDIsImV4cCI6MjA2NzczMzEwMn0.c489RBMwNt_k5cHLVOJX44Ocn7hMgCA_bZkCFJVLxrM';
const supabase: SupabaseClient = (window as any).supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- GEMINI API SETUP ---
const API_KEY = process.env.API_KEY;
let ai;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
    console.warn("Gemini API key not found. AI features will be disabled.");
}

// --- UTILITY FUNCTIONS ---
const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: string }).message);
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    const stringified = String(error);
    return stringified === '[object Object]' ? 'An unknown error occurred. Check the console for details.' : stringified;
};
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
const getDayName = (dateString:string) => new Date(dateString).toLocaleDateString('ar-EG', { weekday: 'long' });
const formatTime = (timeString: string) => {
    if (!timeString || !timeString.includes(':')) return 'غير محدد';
    const [hour, minute] = timeString.split(':');
    const d = new Date();
    d.setHours(parseInt(hour, 10));
    d.setMinutes(parseInt(minute, 10));
    return d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true });
};
const uploadFile = async (bucket: string, file: File): Promise<string | null> => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) {
        console.error('Error uploading file:', error);
        return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
};

// --- TYPES AND INTERFACES ---
type Page = 'auth' | 'dashboard' | 'profile' | 'gallery' | 'teachers' | 'about' | 'trips' | 'legal' | 'admin' | 'stats' | 'schedule' | 'books' | 'exams' | 'instructions';
type AuthPage = 'login' | 'register' | 'forgot_password';
type ToastType = 'success' | 'error' | 'info';
type Theme = 'light' | 'dark' | 'pink';
type AdminSection = 'classes' | 'teachers' | 'posts' | 'students' | 'trips' | 'gallery' | 'bookings' | 'books';
type AdminModalMode = 'add' | 'edit';

interface User {
    id: string;
    student_id: string;
    full_name: string;
    email: string;
    phone: string;
    guardian_phone: string;
    school: string;
    grade: string;
    role?: 'student' | 'admin' | 'supervisor';
    created_at?: string;
    avatar_url?: string;
}

interface ClassInfo { id: number; name: string; teacher: string; grade: string; date: string; time: string; location: string; image_url?: string; description: string; is_review: boolean; is_bookable: boolean; }
interface TripInfo { id: number; name: string; place: string; date: string; time: string; description: string; image_urls: string[]; price: number; available_spots: number; }
interface Post { id: number; title: string; content: string; image_url?: string; created_at: string; }
interface Teacher { id: number; name: string; subject: string; image_url: string; phone?: string; }
interface GalleryImage { id: number; image_url: string; description: string; }
interface BookInfo { id: number; title: string; description: string; image_url: string; download_url: string; }
interface Booking {
    id: number;
    student_id: string;
    student_name: string;
    type: 'class' | 'trip';
    item_id: number;
    item_name: string;
    item_date: string;
    item_time: string;
    item_location?: string;
    profiles: { full_name: string; student_id: string };
    classes: { name: string; date: string; time: string; location: string } | null;
    trips: { name: string; date: string; time: string; place: string } | null;
}
interface ChatMessage {
    sender: 'user' | 'ai';
    text: string;
}
interface ExamQuestion {
    id: number;
    question_text: string;
    options: string[];
    correct_answer_index: number;
}
interface ExamResults {
    score: string;
    feedback: {
        question_text: string;
        your_answer: string;
        correct_answer: string;
        explanation: string;
    }[];
}
interface Notification {
  id: number;
  user_id: string;
  text: string;
  created_at: string;
  read: boolean;
  icon: string;
}

type AdminEditableItem = Teacher | TripInfo | GalleryImage | ClassInfo | Post | BookInfo;
interface AdminModalState {
    isOpen: boolean;
    mode: AdminModalMode;
    section: AdminSection | null;
    item: AdminEditableItem | null;
}

// --- REACT COMPONENTS ---

// --- Toast Notification Component ---
interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const icons = {
        success: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
        error: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
        info: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
    };

    return (
        <div className={`toast-notification ${type} show`}>
            <div className="toast-icon">{icons[type]}</div>
            <p>{message}</p>
            <button onClick={onClose} className="toast-close-btn">&times;</button>
        </div>
    );
};


// --- Confirmation Modal Component ---
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText: string;
  confirmButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmButtonClass = '' }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container confirmation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <div className="modal-body">
          <div className="confirmation-message">{message}</div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
          <button onClick={onConfirm} className={`btn ${confirmButtonClass}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};


// --- Daily Class Ticker Component ---
interface DailyClassTickerProps {
    classes: ClassInfo[];
    onClassClick: (classInfo: ClassInfo) => void;
}
const DailyClassTicker: React.FC<DailyClassTickerProps> = ({ classes, onClassClick }) => {
    const tickerRef = useRef<HTMLDivElement>(null);
    const todayISO = new Date().toISOString().split('T')[0];
    const todayClasses = useMemo(() => classes.filter(c => c.date === todayISO).sort((a,b) => a.time.localeCompare(b.time)), [classes, todayISO]);

    useEffect(() => {
        const ticker = tickerRef.current;
        if (!ticker || todayClasses.length <= 1) return;

        const clone = ticker.cloneNode(true);
        (clone as HTMLElement).setAttribute('aria-hidden', 'true');
        if (ticker.parentElement) {
           ticker.parentElement.appendChild(clone);
        }
        return () => {
            if (clone.parentElement) {
                clone.parentElement.removeChild(clone);
            }
        };
    }, [todayClasses]);

    if (todayClasses.length === 0) {
        return (
            <div className="daily-ticker-bar">
                <div className="ticker-icon">🗓️</div>
                <span>لا توجد حصص اليوم.</span>
            </div>
        );
    }
    
    return (
        <div className="daily-ticker-bar">
             <div className="ticker-icon">✨</div>
            <div className="ticker-wrapper-vertical">
                <div ref={tickerRef} className="ticker-content-vertical" style={{animationDuration: `${todayClasses.length * 10}s`}}>
                    {todayClasses.map(c => (
                        <div key={c.id} className="ticker-item-vertical" onClick={() => onClassClick(c)}>
                            <span><strong>{c.name}</strong> - {c.teacher}</span>
                            <span>{formatTime(c.time)} - {c.location}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Weekly Schedule Grid Component ---
interface WeeklyScheduleGridProps {
    classes: ClassInfo[];
    onClassClick: (classInfo: ClassInfo) => void;
}
const WeeklyScheduleGrid: React.FC<WeeklyScheduleGridProps> = ({ classes, onClassClick }) => {
    const weeklyClasses = useMemo(() => {
        const todayISO = new Date().toISOString().split('T')[0];
        const upcoming = classes.filter(c => new Date(c.date) >= new Date(todayISO));
        const groupedByDay = upcoming.reduce((acc, curr) => {
            if (curr.date === todayISO) return acc; 
            const day = curr.date;
            if (!acc[day]) acc[day] = [];
            acc[day].push(curr);
            return acc;
        }, {} as Record<string, ClassInfo[]>);

        return Object.entries(groupedByDay).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()).slice(0, 7);
    }, [classes]);

    if (weeklyClasses.length === 0) {
        return <div className="no-classes-text">لا توجد حصص قادمة هذا الأسبوع.</div>;
    }

    return (
        <div className="weekly-schedule-wrapper">
             <h2 className="content-section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>الحصص الأسبوعية</span>
            </h2>
            <div className="horizontal-scroll-area">
                {weeklyClasses.map(([date, dayClasses]) => (
                    <div key={date} className="day-card">
                        <h3 className="day-card-header">{getDayName(date)} - {formatDate(date)}</h3>
                        <div className="day-card-classes-list">
                            {dayClasses.sort((a,b) => a.time.localeCompare(b.time)).map(c => (
                                <div key={c.id} className="class-list-item" onClick={() => onClassClick(c)}>
                                    <div className="class-list-item-details">
                                        <h4>{c.name}</h4>
                                        <p>{formatTime(c.time)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Class Popup Component ---
interface ClassPopupProps {
    isOpen: boolean;
    classInfo: ClassInfo | null;
    onClose: () => void;
    onBook: (classInfo: ClassInfo) => void;
}
const ClassPopup: React.FC<ClassPopupProps> = ({ isOpen, classInfo, onClose, onBook }) => {
    if (!isOpen || !classInfo) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container class-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>تفاصيل الحصة</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    {classInfo.is_review && <div className="review-badge-popup">مراجعة</div>}
                    <h2>{classInfo.name}</h2>
                    <p><strong>المدرس:</strong> {classInfo.teacher}</p>
                    <p><strong>الصف:</strong> {classInfo.grade}</p>
                    <p><strong>الموعد:</strong> {formatDate(classInfo.date)} الساعة {formatTime(classInfo.time)}</p>
                    <p><strong>المكان:</strong> {classInfo.location}</p>
                    <p><strong>الوصف:</strong> {classInfo.description || 'لا يوجد وصف متاح.'}</p>
                </div>
                {classInfo.is_bookable && (
                    <div className="modal-footer">
                        <button onClick={onClose} className="btn btn-secondary">إغلاق</button>
                        <button onClick={() => onBook(classInfo)} className="btn btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            <span>تأكيد الحجز</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Teacher Popup Component ---
interface TeacherPopupProps {
    isOpen: boolean;
    teacherInfo: Teacher | null;
    onClose: () => void;
}
const TeacherPopup: React.FC<TeacherPopupProps> = ({ isOpen, teacherInfo, onClose }) => {
    if (!isOpen || !teacherInfo) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container teacher-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>تفاصيل المدرس</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <img src={teacherInfo.image_url} alt={teacherInfo.name} className="teacher-detail-image" />
                    <h2>{teacherInfo.name}</h2>
                    <p className="teacher-detail-subject">{teacherInfo.subject}</p>
                    {teacherInfo.phone && (
                        <p className="teacher-detail-phone">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            <span>{teacherInfo.phone}</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Initial Avatar Component ---
interface InitialAvatarProps { name: string; avatarUrl?: string | null; className?: string; }
const InitialAvatar: React.FC<InitialAvatarProps> = ({ name, avatarUrl, className = '' }) => {
    if (avatarUrl) {
        return <img src={avatarUrl} alt={name} className={`profile-initial-avatar ${className}`} style={{objectFit: 'cover'}} />;
    }
    const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
    return <div className={`profile-initial-avatar ${className}`}>{initial}</div>;
};

// --- Floating Action Button Component ---
const FloatingActionButton = ({ onClick }: { onClick: () => void }) => (
    <button className="fab" onClick={onClick} title="المساعد الذكي">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect x="8" y="12" width="8" height="8" rx="2"/><path d="M4 12a8 8 0 1 1 16 0Z"/></svg>
    </button>
);

// --- Chat Modal Component ---
interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSend: (message: string) => void;
    isThinking: boolean;
}
const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, messages, onSend, isThinking }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSend(input.trim());
            setInput('');
        }
    };
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container chat-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>المساعد الذكي</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body chat-body">
                    {messages.map((msg, index) => (
                        <div key={index} className={`chat-bubble ${msg.sender}`}>
                            {msg.text}
                        </div>
                    ))}
                    {isThinking && (
                        <div className="chat-bubble ai">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="modal-footer chat-footer">
                    <form onSubmit={handleSend} className="chat-input-form">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="اسأل عن أي شيء..."
                            disabled={isThinking}
                        />
                        <button type="submit" disabled={!input.trim() || isThinking}>
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Notifications Panel Component ---
interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAllRead: () => void;
  onMarkOneRead: (id: number) => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, notifications, onMarkAllRead, onMarkOneRead }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.header-icon-btn[title="الإشعارات"]')) {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notifications-panel" ref={panelRef}>
      <div className="notifications-header">
        <h3>الإشعارات {unreadCount > 0 && `(${unreadCount})`}</h3>
        <button onClick={onMarkAllRead} disabled={unreadCount === 0}>
          تحديد الكل كمقروء
        </button>
      </div>
      <div className="notifications-list">
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div key={n.id} className={`notification-item ${n.read ? 'read' : ''}`} onClick={() => onMarkOneRead(n.id)}>
              <div className="notification-icon">{n.icon}</div>
              <div className="notification-content">
                <p>{n.text}</p>
                <small>{new Date(n.created_at).toLocaleString('ar-EG')}</small>
              </div>
            </div>
          ))
        ) : (
          <div className="no-notifications">
            <p>لا توجد إشعارات حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};


// --- Main App Component ---
const App = () => {
    // --- STATE MANAGEMENT ---
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState<Page>('auth');
    const [user, setUser] = useState<User | null>(null);
    const [theme, setTheme] = useState<Theme>('light');
    
    // Data states
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [trips, setTrips] = useState<TripInfo[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [gallery, setGallery] = useState<GalleryImage[]>([]);
    const [books, setBooks] = useState<BookInfo[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // UI states
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isNotificationsOpen, setNotificationsOpen] = useState(false);
    const [classPopup, setClassPopup] = useState<{ isOpen: boolean; classInfo: ClassInfo | null }>({ isOpen: false, classInfo: null });
    const [teacherPopup, setTeacherPopup] = useState<{ isOpen: boolean; teacherInfo: Teacher | null }>({ isOpen: false, teacherInfo: null });
    const [adminSection, setAdminSection] = useState<AdminSection>('students');
    const [toast, setToast] = useState<{ message: string; type: ToastType; id: number } | null>(null);
    const [adminModalState, setAdminModalState] = useState<AdminModalState>({ isOpen: false, mode: 'add', section: null, item: null });
    const [confirmationModal, setConfirmationModal] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        confirmText: string;
        confirmButtonClass: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        confirmText: 'تأكيد',
        confirmButtonClass: ''
    });

    // Chat states
    const [isChatOpen, setChatOpen] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { sender: 'ai', text: 'مرحباً! أنا مساعدك الذكي في مركز جوجل. كيف يمكنني مساعدتك اليوم؟ يمكنك أن تسألني عن مواعيد الحصص، الرحلات، أو أي معلومات أخرى تخص المركز.' }
    ]);

    // --- EFFECTS ---
    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        setToast({ message, type, id: Date.now() });
    }, []);

    const fetchAllData = useCallback(async (currentUser: User) => {
      setIsLoading(true);
      try {
          const tableFetch = (tableName: string) => supabase.from(tableName).select('*').order('created_at', { ascending: false });
          
          let classQuery = supabase.from('classes').select('*');
          if (currentUser.role === 'student') {
              classQuery = classQuery.eq('grade', currentUser.grade);
          }

          const [
              classRes, tripRes, teacherRes, postRes, galleryRes, bookRes, 
              bookingRes, studentRes, notificationRes
          ] = await Promise.all([
              classQuery.order('date', { ascending: true }).order('time', { ascending: true }),
              tableFetch('trips'),
              tableFetch('teachers'),
              tableFetch('posts'),
              tableFetch('gallery'),
              tableFetch('books'),
              supabase.from('bookings_details').select('*').order('item_date', { ascending: false }), // Using the view for details
              supabase.from('profiles').select('*').neq('role', 'admin'),
              supabase.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false })
          ]);
  
          if (classRes.data) setClasses(classRes.data);
          if (tripRes.data) setTrips(tripRes.data);
          if (teacherRes.data) setTeachers(teacherRes.data);
          if (postRes.data) setPosts(postRes.data);
          if (galleryRes.data) setGallery(galleryRes.data);
          if (bookRes.data) setBooks(bookRes.data);
          if (bookingRes.data) setBookings(bookingRes.data as any);
          if (studentRes.data) setStudents(studentRes.data);
          if (notificationRes.data) setNotifications(notificationRes.data);

      } catch (error) {
          showToast(`خطأ في تحميل البيانات: ${getErrorMessage(error)}`, 'error');
      } finally {
        setIsLoading(false);
      }
  }, [showToast]);


    useEffect(() => {
        const savedTheme = localStorage.getItem('gc-theme') as Theme | null;
        if (savedTheme) setTheme(savedTheme);

        const fetchInitialSession = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;

                if (session?.user) {
                    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                    if (profileError) throw profileError;

                    if (profile) {
                        const userData: User = { ...profile, email: session.user.email! };
                        setUser(userData);
                        setPage('dashboard');
                        fetchAllData(userData); // Don't await, let UI render first
                    } else {
                        // Profile doesn't exist for a logged-in user, sign them out.
                        await supabase.auth.signOut();
                        setUser(null);
                        setPage('auth');
                    }
                } else {
                    setPage('auth');
                }
            } catch (error) {
                console.error("Error during initial session fetch:", getErrorMessage(error));
                showToast(`حدث خطأ أثناء تحميل الجلسة: ${getErrorMessage(error)}`, 'error');
                setPage('auth'); // Fallback to login page
            } finally {
                setIsLoading(false); // Crucial part: always remove the main loader
            }
        };
        
        fetchInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                 const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                 if (profile) {
                    const userData: User = { ...profile, email: session.user.email! };
                    setUser(userData);
                    setPage('dashboard');
                    if (_event === 'SIGNED_IN') {
                      fetchAllData(userData); // Don't await here either
                    }
                } else {
                   await supabase.auth.signOut();
                }
            } else {
                setUser(null);
                setPage('auth');
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchAllData, showToast]);

    // Real-time notifications subscription
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                const newNotification = payload.new as Notification;
                setNotifications(prev => [newNotification, ...prev]);
                showToast(newNotification.text, 'info');
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, showToast]);


    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('gc-theme', theme);
    }, [theme]);

    useEffect(() => {
        if (!user && page !== 'auth') {
            setPage('auth');
        }
        if (user && page === 'auth') {
            setPage('dashboard');
        }
    }, [page, user]);


    // --- EVENT HANDLERS & HELPERS ---
    const handleLogout = async () => {
        closeConfirmationModal();
        const { error } = await supabase.auth.signOut();
        if (error) {
            showToast(getErrorMessage(error), 'error');
        }
        // onAuthStateChange will handle state reset
        setSidebarOpen(false);
        setNotificationsOpen(false);
    };
    
    const handleUpdateUser = async (updatedProfileData: Partial<User>, avatarFile?: File) => {
        if (!user) return;
        setIsLoading(true);
        try {
            let avatar_url = user.avatar_url;

            if (avatarFile) {
                // Path must match RLS policy: {user_id}/{file_name}
                const fileName = `${user.id}/${Date.now()}-${avatarFile.name}`;

                // Remove old avatar to prevent orphans, if it exists
                if (user.avatar_url) {
                    try {
                        const oldPath = new URL(user.avatar_url).pathname.split('/avatars/')[1];
                        if (oldPath) {
                            await supabase.storage.from('avatars').remove([oldPath]);
                        }
                    } catch (e) {
                        console.error("Could not remove old avatar:", e);
                    }
                }

                const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, {
                    cacheControl: '3600',
                    upsert: true // Use upsert to handle replacement gracefully
                });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                if (urlData.publicUrl) {
                    avatar_url = urlData.publicUrl;
                } else {
                    throw new Error("فشل الحصول على رابط الصورة بعد الرفع.");
                }
            }
            
            const dataToUpdate = {
                full_name: updatedProfileData.full_name,
                phone: updatedProfileData.phone,
                guardian_phone: updatedProfileData.guardian_phone,
                school: updatedProfileData.school,
                avatar_url: avatar_url
            };

            const { data, error } = await supabase
                .from('profiles')
                .update(dataToUpdate)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;

            setUser(prev => prev ? { ...prev, ...data } : null);
            showToast('تم تحديث بياناتك بنجاح!', 'success');

        } catch (error) {
            showToast(`خطأ في تحديث البيانات: ${getErrorMessage(error)}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };


    const handleBooking = async (item: ClassInfo | TripInfo, type: 'class' | 'trip') => {
        if (!user) {
            showToast('يجب تسجيل الدخول أولاً للقيام بالحجز', 'error');
            return;
        }

        try {
            // Check if already booked
            const { data: existingBooking, error: checkError } = await supabase.from('bookings')
                .select('id')
                .eq('student_id', user.id)
                .eq('item_id', item.id)
                .eq('type', type)
                .maybeSingle();

            if (checkError) throw checkError;
            if (existingBooking) {
                showToast('لقد قمت بحجز هذا بالفعل!', 'info');
                return;
            }

            const { error: bookingError } = await supabase.from('bookings').insert({
                student_id: user.id,
                item_id: item.id,
                type: type,
            });

            if (bookingError) throw bookingError;
            
            // Create a notification
            const notifText = `تم تأكيد حجزك في ${type === 'class' ? 'حصة' : 'رحلة'} "${item.name}".`;
            const { error: notifError } = await supabase.from('notifications').insert({
                user_id: user.id,
                text: notifText,
                icon: '✅'
            });

            if (notifError) {
                console.error("Could not create notification:", getErrorMessage(notifError));
            }

            showToast(`تم حجز "${item.name}" بنجاح!`, 'success');
            if (user) await fetchAllData(user);
        
        } catch(error) {
            showToast(`فشل الحجز: ${getErrorMessage(error)}`, 'error');
        } finally {
            setClassPopup({isOpen: false, classInfo: null});
        }
    };
    
    const navigate = (targetPage: Page) => {
        setPage(targetPage);
        setSidebarOpen(false);
        setNotificationsOpen(false);
    };

    const handleClassClick = (classInfo: ClassInfo) => setClassPopup({ isOpen: true, classInfo });
    const handleTeacherClick = (teacherInfo: Teacher) => setTeacherPopup({ isOpen: true, teacherInfo });
    
    // --- CONFIRMATION MODAL HANDLERS ---
    const closeConfirmationModal = () => setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    const openSaveConfirmation = (updatedUser: Partial<User>, avatarFile?: File) => {
        setConfirmationModal({
            isOpen: true,
            title: 'تأكيد حفظ التغييرات',
            message: 'هل أنت متأكد أنك تريد حفظ المعلومات الجديدة؟',
            onConfirm: () => {
                handleUpdateUser(updatedUser, avatarFile);
                closeConfirmationModal();
            },
            confirmText: 'حفظ',
            confirmButtonClass: 'btn-primary'
        });
    };
    const openDeleteConfirmation = (item: AdminEditableItem, section: AdminSection) => {
        let itemName = 'name' in item ? item.name : 'title' in item ? item.title : `عنصر ${item.id}`;
        setConfirmationModal({
            isOpen: true,
            title: `تأكيد حذف`,
            message: `هل أنت متأكد أنك تريد حذف "${itemName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
            onConfirm: () => {
                handleDeleteItem(item, section);
                closeConfirmationModal();
            },
            confirmText: 'نعم، قم بالحذف',
            confirmButtonClass: 'btn-danger'
        });
    };
    const openLogoutConfirmation = () => {
        setConfirmationModal({ isOpen: true, title: 'تأكيد تسجيل الخروج', message: 'هل أنت متأكد أنك تريد تسجيل الخروج؟', onConfirm: handleLogout, confirmText: 'تسجيل الخروج', confirmButtonClass: 'btn-danger' });
    };

    // --- ADMIN CRUD HANDLERS ---
    const handleOpenAdminModal = (mode: AdminModalMode, section: AdminSection, item: AdminEditableItem | null = null) => setAdminModalState({ isOpen: true, mode, section, item });
    const handleCloseAdminModal = () => setAdminModalState({ isOpen: false, mode: 'add', section: null, item: null });

    const handleSaveAdminItem = async (itemData: any, section: AdminSection) => {
      setIsLoading(true);
      const { filesToUpload, ...formData } = itemData;
      
      try {
          // Handle file uploads first
          if (filesToUpload) {
              if (filesToUpload.image_url instanceof File) {
                  const url = await uploadFile(section, filesToUpload.image_url);
                  if (url) formData.image_url = url;
              }
              if (Array.isArray(filesToUpload.image_urls)) {
                  const urls = await Promise.all(filesToUpload.image_urls.map((file: File) => uploadFile(section, file)));
                  formData.image_urls = urls.filter(Boolean);
              }
              if (filesToUpload.download_url instanceof File) {
                  const url = await uploadFile('book-files', filesToUpload.download_url);
                  if (url) formData.download_url = url;
              }
          }
  
          let error;
          if (adminModalState.mode === 'add') {
              ({ error } = await supabase.from(section).insert(formData));
          } else {
              ({ error } = await supabase.from(section).update(formData).eq('id', formData.id));
          }
          
          if (error) throw error;
  
          showToast(`تم ${adminModalState.mode === 'add' ? 'إضافة' : 'تحديث'} العنصر بنجاح!`, 'success');
          handleCloseAdminModal();
          if(user) await fetchAllData(user);
      } catch (err) {
          showToast(`فشل حفظ العنصر: ${getErrorMessage(err)}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    const handleDeleteItem = async (item: AdminEditableItem, section: AdminSection) => {
        setIsLoading(true);
        try {
            // First, delete the database record
            const { error } = await supabase.from(section).delete().eq('id', item.id);
            if (error) throw error;
    
            // Next, collect all associated file URLs to delete from storage
            const urlsToDelete = new Set<string>();
            if ('image_url' in item && item.image_url) urlsToDelete.add(item.image_url);
            if ('download_url' in item && item.download_url) urlsToDelete.add(item.download_url);
            if ('image_urls' in item && Array.isArray(item.image_urls)) {
                item.image_urls.forEach(url => url && urlsToDelete.add(url));
            }
    
            if (urlsToDelete.size > 0) {
                const filesByBucket: Record<string, string[]> = {};
    
                const getBucketAndPath = (url: string): { bucket: string, path: string } | null => {
                    try {
                        const pathParts = new URL(url).pathname.split('/');
                        // Standard Supabase URL path: /storage/v1/object/public/BUCKET_NAME/FILE_PATH
                        const publicIndex = pathParts.indexOf('public');
                        if (publicIndex > -1 && publicIndex + 1 < pathParts.length) {
                            const bucket = pathParts[publicIndex + 1];
                            const path = pathParts.slice(publicIndex + 2).join('/');
                            return { bucket, path };
                        }
                    } catch (e) {
                        console.error("Could not parse file URL:", url, e);
                    }
                    return null;
                };
    
                for (const url of urlsToDelete) {
                    const fileInfo = getBucketAndPath(url);
                    if (fileInfo && fileInfo.path) {
                        if (!filesByBucket[fileInfo.bucket]) {
                            filesByBucket[fileInfo.bucket] = [];
                        }
                        filesByBucket[fileInfo.bucket].push(fileInfo.path);
                    }
                }
    
                // Perform batch deletions for each bucket
                for (const bucket in filesByBucket) {
                    if (filesByBucket[bucket].length > 0) {
                        const { error: storageError } = await supabase.storage.from(bucket).remove(filesByBucket[bucket]);
                        if (storageError) {
                            // Log error but don't throw, as the DB record was deleted.
                            console.error(`Failed to delete files from bucket ${bucket}:`, storageError);
                            showToast(`تم حذف العنصر ولكن فشل حذف بعض الملفات المرتبطة.`, 'info');
                        }
                    }
                }
            }
    
            showToast('تم الحذف بنجاح.', 'success');
            if(user) await fetchAllData(user);
        } catch (err) {
            showToast(`فشل الحذف: ${getErrorMessage(err)}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- NOTIFICATION HANDLERS ---
    const handleMarkOneAsRead = async (id: number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        await supabase.from('notifications').update({ read: true }).eq('id', id);
    };
    const handleMarkAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        if(user) await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    };

    const handleSendChatMessage = async (message: string) => {
        setChatMessages(prev => [...prev, { sender: 'user', text: message }]);
        setIsAiThinking(true);
        if (!ai) {
             setTimeout(() => {
                 setChatMessages(prev => [...prev, { sender: 'ai', text: "عذراً, خدمة المساعد الذكي غير متاحة حالياً." }]);
                 setIsAiThinking(false);
             }, 1000);
            return;
        }
        try {
            const systemInstruction = `You are Neo, an AI assistant for the "Google Center" educational platform.
Your persona is: Friendly 💙, Respectful ✨, Optimistic 🔥, Smart and fast 🚀.
Always respond in Arabic.
Your responses must be friendly, respectful, and use light, professional emojis (like 💪, ✨, 😊, 🚀, 📚, 📌).
After answering a question, always add a short, encouraging message.

Example 1:
User: متى حصة الرياضيات القادمة؟
Your response: 📌 حصة الرياضيات القادمة يوم الإثنين الساعة 10 صباحًا في القاعة 3. بالتوفيق يا بطل 💪✨!

Example 2:
User: أين الأستاذ أحمد؟
Your response: 🔍 الأستاذ أحمد متواجد في قاعة الإعدادي بالدور الثاني. هل تحتاج مساعدة أخرى؟ 😊

Example encouragements to add at the end of a response:
- "إجابة رائعة! استمر على هذا المنوال! 💙🔥"
- "أحسنت يا بطل! 👏✨"
- "لا تقلق من الخطأ، فالتعلم رحلة يا صديقي 🚀📚"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: message,
                 config: {
                    systemInstruction: systemInstruction,
                },
            });
            const aiResponseText = response.text;
            setChatMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
        } catch (error) {
            console.error("Gemini API Error:", error);
            setChatMessages(prev => [...prev, { sender: 'ai', text: `عذراً، حدث خطأ أثناء التواصل مع المساعد الذكي. ${getErrorMessage(error)}` }]);
        } finally {
            setIsAiThinking(false);
        }
    };
    
    // --- RENDER LOGIC ---
    if (isLoading && !user) { // Only show full screen loader on initial load
        return <div className="loading-screen"><div className="loading-spinner"></div></div>;
    }

    interface MainLayoutProps { children: React.ReactNode; }
    const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
        const NavItem = ({ p, icon, label }: { p: Page; icon: React.ReactNode; label: string }) => (
            <a className={`nav-item ${page === p ? 'active' : ''}`} onClick={() => navigate(p)}>
                 <span>{label}</span>
                 {icon}
            </a>
        );
        const unreadCount = notifications.filter(n => !n.read).length;

        return (
            <div className={`main-layout ${!user ? 'is-public-view' : ''}`}>
                {user && (
                    <>
                        <header className={`app-header ${user ? 'visible' : ''}`}>
                            <button className="header-icon-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu" title="القائمة">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                            </button>
                            <h1 className="header-title" onClick={() => navigate('dashboard')}>Google Center</h1>
                             <div className="notifications-wrapper">
                                <button className="header-icon-btn" onClick={() => setNotificationsOpen(prev => !prev)} aria-label="View notifications" title="الإشعارات">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                    {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                                </button>
                                <NotificationsPanel 
                                    isOpen={isNotificationsOpen} 
                                    onClose={() => setNotificationsOpen(false)} 
                                    notifications={notifications}
                                    onMarkAllRead={handleMarkAllAsRead}
                                    onMarkOneRead={handleMarkOneAsRead}
                                />
                            </div>
                        </header>
                        <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
                        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                            <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
                                &times;
                            </button>
                            <div className="sidebar-profile-card" onClick={() => navigate('profile')}>
                                <InitialAvatar name={user?.full_name || ''} avatarUrl={user?.avatar_url} className="profile-card-avatar-large" />
                                <h3>{user?.full_name}</h3>
                                <p>{user?.role === 'student' ? user.student_id : (user?.role === 'admin' ? 'المدير العام ✨' : 'المشرف 🔥')}</p>
                            </div>

                            <nav className="sidebar-nav">
                                <NavItem p="dashboard" label="الرئيسية" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} />
                                <NavItem p="schedule" label="جدول الحصص" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
                                <NavItem p="exams" label="الاختبارات" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14.5 2-8.5 8.5 5 5L19.5 7Z" /><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg>} />
                                <NavItem p="teachers" label="المدرسون" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
                                <NavItem p="gallery" label="الصور" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>} />
                                <NavItem p="trips" label="الرحلات" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 19.88a2.89 2.89 0 0 0 4.1 0l1.42-1.42a2.89 2.89 0 0 0 0-4.1l-6.5-6.5a2.89 2.89 0 0 0-4.1 0l-1.42 1.42a2.89 2.89 0 0 0 0 4.1l6.5 6.5Z" /><path d="m11 12.5 2 2" /><path d="m15.5 7.5-2-2" /><path d="m19 12-7-7" /><path d="m5 12 7 7" /></svg>} />
                                <NavItem p="books" label="الكتب والمذكرات" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>} />
                                <NavItem p="about" label="من نحن" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>} />
                                <NavItem p="instructions" label="تعليمات الاستخدام" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>} />
                               
                                {(user?.role === 'admin' || user?.role === 'supervisor') && (
                                    <>
                                       <hr className="sidebar-divider"/>
                                       <a className={`nav-item owner-panel-link ${page === 'admin' ? 'active' : ''}`} onClick={() => navigate('admin')}>
                                            <span>لوحة التحكم</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-4.44a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.84a2 2 0 0 0-.59-1.41l-4.44-4.44a2 2 0 0 0-1.41-.59z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                       </a>
                                       {user?.role === 'admin' && (
                                       <a className={`nav-item owner-panel-link ${page === 'stats' ? 'active' : ''}`} onClick={() => navigate('stats')}>
                                            <span>إحصائيات</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20V16"></path></svg>
                                       </a>
                                       )}
                                    </>
                                )}
                            </nav>
                            <div className="sidebar-footer">
                                 <div className="theme-switcher-container">
                                     <span className="theme-switcher-label">المظهر</span>
                                    <div className="theme-switcher">
                                        <button onClick={() => setTheme('light')} className={theme === 'light' ? 'active' : ''} title="فاتح">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                                        </button>
                                        <button onClick={() => setTheme('dark')} className={theme === 'dark' ? 'active' : ''} title="ليلي">
                                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                                        </button>
                                        <button onClick={() => setTheme('pink')} className={theme === 'pink' ? 'active' : ''} title="وردي">
                                             <span>🌸</span>
                                        </button>
                                    </div>
                                </div>
                                <button className="logout-btn" onClick={openLogoutConfirmation}>
                                    <span>تسجيل الخروج</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10,17 15,12 10,7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                                </button>
                                 <div className="sidebar-copyright" onClick={() => navigate('legal')}>
                                    © 2025 Google Center – جميع الحقوق محفوظة
                                 </div>
                            </div>
                        </aside>
                    </>
                )}
                <main className="main-content" style={!user ? {paddingTop: '2rem'} : {}}>
                    {isLoading && <div className="loading-screen" style={{position: 'absolute', zIndex: 5000}}><div className="loading-spinner"></div></div>}
                    <div className="content-area">
                        {children}
                    </div>
                </main>
                {user && <FloatingActionButton onClick={() => setChatOpen(true)} />}
            </div>
        );
    }
    
    const Announcements = ({ posts }: { posts: Post[] }) => (
        <div className="announcements-section">
            <h2 className="content-section-title">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M14 2v4h4"></path><path d="M6 18h6"></path><path d="M6 14h8"></path></svg>
                <span>آخر الإعلانات</span>
            </h2>
            <div className="announcements-list">
                {posts.slice(0, 2).map(post => (
                    <div key={post.id} className="post-card">
                        {post.image_url && <img src={post.image_url} alt={post.title} className="post-card-image" />}
                        <div className="post-card-content">
                            <h3>{post.title}</h3>
                            <p>{post.content}</p>
                            <span className="post-card-date">{formatDate(post.created_at)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const GalleryPreview = ({ images }: { images: GalleryImage[] }) => (
        <div className="gallery-preview-section">
            <h2 className="content-section-title">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                <span>لمحات من المركز</span>
            </h2>
            <div className="gallery-preview-grid">
                {images.slice(0, 4).map(image => (
                    <div key={image.id} className="gallery-preview-item" style={{ backgroundImage: `url(${image.image_url})` }}>
                        <div className="gallery-item-overlay">
                            <p>{image.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const DashboardPage = () => {
        return (
            <div className="dashboard-page">
                <div className="page-container">
                    <DailyClassTicker classes={classes} onClassClick={handleClassClick} />
                    <Announcements posts={posts} />
                    <WeeklyScheduleGrid classes={classes} onClassClick={handleClassClick} />
                    <GalleryPreview images={gallery} />
                </div>
            </div>
        );
    };

    const AdminPage = () => {
        const [studentSearchId, setStudentSearchId] = useState('');
        const [foundStudent, setFoundStudent] = useState<User | null>(null);
        const [studentBookings, setStudentBookings] = useState<Booking[]>([]);
        const [searchError, setSearchError] = useState('');

        const handleStudentSearch = async (e: React.FormEvent) => {
            e.preventDefault();
            setFoundStudent(null);
            setStudentBookings([]);
            setSearchError('');
            if (!studentSearchId.trim()) {
                setSearchError('الرجاء إدخال كود الطالب للبحث.');
                return;
            }
            const { data: student, error } = await supabase.from('profiles').select('*').eq('student_id', studentSearchId.trim().toUpperCase()).maybeSingle();
            if (error) {
                setSearchError(`حدث خطأ: ${error.message}`);
                return;
            }

            if (student) {
                setFoundStudent(student);
                const { data: bookingsForStudent, error: bookingError } = await supabase.from('bookings_details').select('*').eq('student_id', student.id).order('item_date', { ascending: false });
                if (bookingError) {
                   setSearchError(`خطأ في جلب حجوزات الطالب: ${bookingError.message}`);
                } else if (bookingsForStudent) {
                    setStudentBookings(bookingsForStudent as any);
                }
            } else {
                setSearchError('لم يتم العثور على طالب بهذا الكود.');
            }
        };

        const renderAdminContent = () => {
            switch(adminSection) {
                case 'students':
                    return <div className="admin-section-content">
                        <form className="admin-search-form" onSubmit={handleStudentSearch}>
                            <input
                                type="text"
                                placeholder="أدخل كود الطالب هنا..."
                                value={studentSearchId}
                                onChange={(e) => setStudentSearchId(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary">بحث</button>
                        </form>
                        {searchError && <p className="auth-error" style={{textAlign: 'center'}}>{searchError}</p>}
                        {foundStudent && (
                            <div className="student-search-results">
                                <div className="content-card student-details-card">
                                    <h3 className="form-section-title">بيانات الطالب</h3>
                                    <p><strong>الاسم:</strong> {foundStudent.full_name}</p>
                                    <p><strong>الكود:</strong> {foundStudent.student_id}</p>
                                    <p><strong>الهاتف:</strong> {foundStudent.phone}</p>
                                    <p><strong>هاتف ولي الأمر:</strong> {foundStudent.guardian_phone}</p>
                                    <p><strong>المدرسة:</strong> {foundStudent.school}</p>
                                    <p><strong>الصف:</strong> {foundStudent.grade}</p>
                                </div>
                                <div className="student-bookings-section">
                                    <h3 className="form-section-title">الحجوزات الخاصة بالطالب ({studentBookings.length})</h3>
                                    {studentBookings.length > 0 ? (
                                        <div className="student-bookings-list">
                                            {studentBookings.map(booking => (
                                                <div key={booking.id} className="booking-card">
                                                    <div className="booking-card-header">
                                                        <span className={`booking-type-badge ${booking.type}`}>{booking.type === 'class' ? 'حصة' : 'رحلة'}</span>
                                                        <h4>{booking.item_name}</h4>
                                                    </div>
                                                    <p><strong>التاريخ:</strong> {formatDate(booking.item_date)}</p>
                                                    <p><strong>الوقت:</strong> {formatTime(booking.item_time)}</p>
                                                    <p><strong>المكان:</strong> {booking.item_location}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p>لا توجد حجوزات حالية لهذا الطالب.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>;
                case 'classes':
                     return <div className="admin-section-content">
                        <div className="admin-section-header">
                            <h3>قائمة الحصص ({classes.length})</h3>
                            <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'classes')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                إضافة حصة
                            </button>
                        </div>
                         <div className="admin-items-grid classes-grid">
                            {[...classes].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.time.localeCompare(a.time)).map(c => (
                                <div key={c.id} className="admin-item-card class-card">
                                    {c.is_review && <div className="review-badge-admin">مراجعة</div>}
                                    <div className="admin-item-info">
                                        <h4>{c.name}</h4>
                                        <p>{c.teacher} • {c.location}</p>
                                        <small>{formatDate(c.date)} - {formatTime(c.time)}</small>
                                    </div>
                                    <div className="admin-item-controls">
                                        <button onClick={() => handleOpenAdminModal('edit', 'classes', c)} title="تعديل">✏️</button>
                                        <button onClick={() => openDeleteConfirmation(c, 'classes')} title="حذف">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>;
                case 'posts':
                    return <div className="admin-section-content">
                        <div className="admin-section-header">
                            <h3>إدارة المنشورات ({posts.length})</h3>
                            <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'posts')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                إضافة منشور
                            </button>
                        </div>
                        <div className="admin-items-grid posts-grid">
                            {posts.map(post => (
                                <div key={post.id} className="admin-item-card">
                                    {post.image_url && <img src={post.image_url} alt={post.title} className="admin-item-image"/>}
                                    <div className="admin-item-info">
                                        <h4>{post.title}</h4>
                                        <p>{post.content.substring(0, 100)}...</p>
                                        <small>{formatDate(post.created_at)}</small>
                                    </div>
                                    <div className="admin-item-controls">
                                        <button onClick={() => handleOpenAdminModal('edit', 'posts', post)} title="تعديل">✏️</button>
                                        <button onClick={() => openDeleteConfirmation(post, 'posts')} title="حذف">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>;
                case 'bookings':
                    return <div className="admin-section-content">
                        <div className="admin-section-header">
                            <h3>الحجوزات الحالية ({bookings.length})</h3>
                        </div>
                        <div className="bookings-table-container">
                        <table className="bookings-table">
                            <thead>
                                <tr><th>اسم الطالب</th><th>نوع الحجز</th><th>اسم الحصة/الرحلة</th><th>التاريخ</th></tr>
                            </thead>
                            <tbody>
                                {bookings.map(b => (
                                    <tr key={b.id}>
                                        <td>{b.profiles?.full_name} ({b.profiles?.student_id})</td>
                                        <td><span className={`booking-type-badge ${b.type}`}>{b.type === 'class' ? 'حصة' : 'رحلة'}</span></td>
                                        <td>{b.item_name}</td>
                                        <td>{formatDate(b.item_date)} {formatTime(b.item_time)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                    </div>;
                case 'teachers':
                    return <div className="admin-section-content">
                        <div className="admin-section-header">
                            <h3>قائمة المدرسين ({teachers.length})</h3>
                            <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'teachers')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                إضافة مدرس
                            </button>
                        </div>
                        <div className="admin-items-grid teachers-grid">
                            {teachers.map(teacher => (
                                <div key={teacher.id} className="admin-item-card">
                                    <img src={teacher.image_url} alt={teacher.name} className="admin-item-image"/>
                                    <div className="admin-item-info">
                                        <h4>{teacher.name}</h4>
                                        <p>{teacher.subject}</p>
                                        {teacher.phone && <small>{teacher.phone}</small>}
                                    </div>
                                    <div className="admin-item-controls">
                                        <button onClick={() => handleOpenAdminModal('edit', 'teachers', teacher)} title="تعديل">✏️</button>
                                        <button onClick={() => openDeleteConfirmation(teacher, 'teachers')} title="حذف">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>;
                case 'trips':
                     return <div className="admin-section-content">
                        <div className="admin-section-header">
                            <h3>قائمة الرحلات ({trips.length})</h3>
                            <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'trips')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                إضافة رحلة
                            </button>
                        </div>
                        <div className="admin-items-grid trips-grid">
                             {trips.map(trip => (
                                <div key={trip.id} className="admin-item-card trip-card">
                                    <img src={trip.image_urls?.[0]} alt={trip.name} className="admin-item-image"/>
                                    <div className="admin-item-info">
                                        <h4>{trip.name}</h4>
                                        <p>{trip.place} - {formatDate(trip.date)}</p>
                                        <div className="trip-details-badges">
                                            <span>{trip.price} ج.م</span>
                                            <span>{trip.available_spots} مكان</span>
                                        </div>
                                    </div>
                                    <div className="admin-item-controls">
                                        <button onClick={() => handleOpenAdminModal('edit', 'trips', trip)} title="تعديل">✏️</button>
                                        <button onClick={() => openDeleteConfirmation(trip, 'trips')} title="حذف">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>;
                case 'gallery':
                    return <div className="admin-section-content">
                        <div className="admin-section-header">
                            <h3>صور المعرض ({gallery.length})</h3>
                            <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'gallery')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                إضافة صورة
                            </button>
                        </div>
                        <div className="admin-items-grid gallery-grid">
                            {gallery.map(image => (
                                <div key={image.id} className="admin-item-card gallery-item-card">
                                    <img src={image.image_url} alt={image.description} className="admin-item-image"/>
                                    <div className="admin-item-info">
                                        <p>{image.description}</p>
                                    </div>
                                    <div className="admin-item-controls">
                                        <button onClick={() => handleOpenAdminModal('edit', 'gallery', image)} title="تعديل">✏️</button>
                                        <button onClick={() => openDeleteConfirmation(image, 'gallery')} title="حذف">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>;
                case 'books':
                    return <div className="admin-section-content">
                        <div className="admin-section-header">
                            <h3>قائمة الكتب والمذكرات ({books.length})</h3>
                            <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'books')}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
                                إضافة كتاب
                            </button>
                        </div>
                        <div className="admin-items-grid books-grid">
                            {books.map(book => (
                                <div key={book.id} className="admin-item-card book-card">
                                    <img src={book.image_url} alt={book.title} className="admin-item-image"/>
                                    <div className="admin-item-info">
                                        <h4>{book.title}</h4>
                                        <p>{book.description.substring(0, 80)}...</p>
                                    </div>
                                    <div className="admin-item-controls">
                                        <button onClick={() => handleOpenAdminModal('edit', 'books', book)} title="تعديل">✏️</button>
                                        <button onClick={() => openDeleteConfirmation(book, 'books')} title="حذف">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>;
                default:
                    return <div style={{padding: '2rem', textAlign: 'center'}}>محتوى قسم "{adminSection}" تحت الإنشاء.</div>
            }
        };

        return (
            <div className="page-container">
                <div className="content-card admin-panel">
                    <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-4.44a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.84a2 2 0 0 0-.59-1.41l-4.44-4.44a2 2 0 0 0-1.41-.59z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        لوحة التحكم
                    </h2>
                    <div className="admin-tabs">
                        {(['students', 'classes', 'teachers', 'trips', 'books', 'gallery', 'bookings', 'posts'] as AdminSection[]).map(s => {
                             if(s === 'bookings' && user?.role !== 'supervisor' && user?.role !== 'admin') return null;
                             const labels: Record<AdminSection, string> = {
                                 students: 'بحث عن طالب',
                                 classes: 'ادارة الحصص',
                                 teachers: 'ادارة المدرسين', 
                                 trips: 'ادارة الرحلات', 
                                 books: 'ادارة الكتب',
                                 gallery: 'ادارة الصور',
                                 posts: 'ادارة المنشورات', 
                                 bookings: 'الحجوزات الحالية'
                             };
                             return (
                             <button key={s} className={adminSection === s ? 'active' : ''} onClick={() => setAdminSection(s)}>
                                {labels[s]}
                             </button>
                             )
                        })}
                    </div>
                    <div className="admin-content">
                       {renderAdminContent()}
                    </div>
                </div>
            </div>
        );
    };

    const StatsPage = () => {
        const stats = useMemo(() => {
            const totalBookings = bookings.length;
            const classBookings = bookings.filter(b => b.type === 'class').length;
            const tripBookings = bookings.filter(b => b.type === 'trip').length;
            const studentCount = new Set(bookings.map(b => b.student_id)).size;
            return { totalBookings, classBookings, tripBookings, studentCount };
        }, [bookings]);

        const studentBookingStats = useMemo(() => {
            const studentMap = new Map<string, {name: string, id: string, student_code: string, classCount: number, tripCount: number, lastBooking: string}>();
            bookings.forEach(booking => {
                if(!studentMap.has(booking.student_id)){
                    studentMap.set(booking.student_id, { name: booking.profiles.full_name, id: booking.student_id, student_code: booking.profiles.student_id, classCount: 0, tripCount: 0, lastBooking: booking.item_date });
                }
                const studentData = studentMap.get(booking.student_id)!;
                if(booking.type === 'class') studentData.classCount++; else studentData.tripCount++;
                if(new Date(booking.item_date) > new Date(studentData.lastBooking)) studentData.lastBooking = booking.item_date;
            });
            return Array.from(studentMap.values());
        }, [bookings]);

        return (
            <div className="page-container">
                <div className="content-card">
                     <h2 className="content-section-title">📊 إحصائيات الحجوزات</h2>
                     <div className="admin-stats-grid">
                        <div className="stat-card total-bookings"><div className="stat-card-icon">📈</div><div><span className="stat-card-value">{stats.totalBookings}</span><span className="stat-card-label">إجمالي الحجوزات</span></div></div>
                        <div className="stat-card class-bookings"><div className="stat-card-icon">🎓</div><div><span className="stat-card-value">{stats.classBookings}</span><span className="stat-card-label">حجوزات الحصص</span></div></div>
                        <div className="stat-card trip-bookings"><div className="stat-card-icon">🚌</div><div><span className="stat-card-value">{stats.tripBookings}</span><span className="stat-card-label">حجوزات الرحلات</span></div></div>
                        <div className="stat-card student-count"><div className="stat-card-icon">👥</div><div><span className="stat-card-value">{stats.studentCount}</span><span className="stat-card-label">عدد الطلاب الحاجزين</span></div></div>
                     </div>
                     <div className="bookings-table-container" style={{marginTop: '2rem'}}>
                        <table className="bookings-table">
                            <thead>
                                <tr><th>كود الطالب</th><th>اسم الطالب</th><th>حصص محجوزة</th><th>رحلات محجوزة</th><th>آخر حجز</th></tr>
                            </thead>
                            <tbody>
                                {studentBookingStats.map(s => (
                                    <tr key={s.id}><td>{s.student_code}</td><td>{s.name}</td><td>{s.classCount}</td><td>{s.tripCount}</td><td>{formatDate(s.lastBooking)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
            </div>
        );
    };

    const AuthPage = () => {
        const [authPage, setAuthPage] = useState<AuthPage>('login');
        const [form, setForm] = useState({
            email: '', password: '', confirmPassword: '', full_name: '',
            phone: '', guardian_phone: '', school: '', grade: 'الصف الأول الثانوي',
        });
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
      
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
          setForm({ ...form, [e.target.name]: e.target.value });
        };

        const handleSwitchAuthPage = (page: AuthPage) => {
            setAuthPage(page);
            setError('');
            setForm({
                email: '', password: '', confirmPassword: '', full_name: '',
                phone: '', guardian_phone: '', school: '', grade: 'الصف الأول الثانوي',
            });
        };
      
        const handleLoginSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setLoading(true);
            setError('');
        
            const { error } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password,
            });
        
            setLoading(false);
            if (error) {
                if (error.message === 'Email not confirmed') {
                    setError('البريد الإلكتروني لم يتم تفعيله. يرجى التحقق من بريدك لتفعيل الحساب.');
                } else if (error.message.includes('Invalid login credentials')) {
                    setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
                } else {
                    setError(getErrorMessage(error));
                }
            }
            // onAuthStateChange will handle navigation on success
        };

        const handleRegisterSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setError('');
        
            if (form.password !== form.confirmPassword) {
                setError('كلمتا المرور غير متطابقتين.');
                return;
            }
        
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[\S]{8,}$/;
            if (!passwordRegex.test(form.password)) {
                setError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل وتحتوي على أرقام وحروف.');
                return;
            }
        
            setLoading(true);
            const { data, error } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: {
                        full_name: form.full_name,
                        phone: form.phone,
                        guardian_phone: form.guardian_phone,
                        school: form.school,
                        grade: form.grade,
                    },
                    emailRedirectTo: window.location.origin
                }
            });
        
            setLoading(false);
            if (error) {
                if(error.message.includes("unique constraint")) {
                    setError("هذا البريد الإلكتروني مسجل بالفعل.");
                } else {
                    setError(getErrorMessage(error));
                }
            } else if (data.user && !data.session) {
                showToast('تم تسجيل حسابك! لقد أرسلنا رابط تحقق إلى بريدك الإلكتروني.', 'success');
                handleSwitchAuthPage('login');
            } else if (data.user && data.session) {
                // This happens if auto-confirm is on.
                showToast('تم تسجيل حسابك بنجاح!', 'success');
            }
        };
    
        const handleForgotSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!form.email) {
                setError('الرجاء إدخال البريد الإلكتروني.');
                return;
            }
            setLoading(true);
            setError('');
            const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
                redirectTo: `${window.location.origin}`,
            });
        
            setLoading(false);
            if (error) {
                setError(getErrorMessage(error));
            } else {
                showToast(`تم إرسال رابط استعادة كلمة المرور إلى ${form.email}.`, 'info');
                handleSwitchAuthPage('login');
            }
        };

        const renderContent = () => {
            switch(authPage) {
                case 'register':
                    return (
                        <>
                            <h2 className="form-title">إنشاء حساب جديد</h2>
                            <form onSubmit={handleRegisterSubmit}>
                                {error && <p className="auth-error">{error}</p>}
                                <div className="input-group">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    <input type="text" name="full_name" placeholder="الاسم بالكامل" required onChange={handleInputChange} value={form.full_name}/>
                                </div>
                                <div className="input-group">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                   <input type="email" name="email" placeholder="البريد الإلكتروني" required onChange={handleInputChange} value={form.email} />
                                </div>
                                <div className="input-group">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    <input type="tel" name="phone" placeholder="رقم الهاتف" required onChange={handleInputChange} value={form.phone} />
                                </div>
                                 <div className="input-group">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    <input type="tel" name="guardian_phone" placeholder="رقم هاتف ولي الأمر" onChange={handleInputChange} value={form.guardian_phone} />
                                </div>
                                <div className="input-group">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                    <input type="text" name="school" placeholder="المدرسة" required onChange={handleInputChange} value={form.school} />
                                </div>
                                <div className="input-group has-select">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
                                    <select name="grade" required onChange={handleInputChange} value={form.grade}>
                                        <optgroup label="المرحلة الإعدادية">
                                            <option>الصف الأول الإعدادي</option>
                                            <option>الصف الثاني الإعدادي</option>
                                            <option>الصف الثالث الإعدادي</option>
                                        </optgroup>
                                        <optgroup label="المرحلة الثانوية">
                                            <option>الصف الأول الثانوي</option>
                                            <option>الصف الثاني الثانوي</option>
                                            <option>الصف الثالث الثانوي</option>
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="input-group">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                   <input type="password" name="password" placeholder="كلمة المرور" required onChange={handleInputChange} value={form.password}/>
                                </div>
                                <div className="input-group">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                   <input type="password" name="confirmPassword" placeholder="تأكيد كلمة المرور" required onChange={handleInputChange} value={form.confirmPassword}/>
                                </div>
                                <button type="submit" className="auth-btn" disabled={loading}>
                                    {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
                                </button>
                            </form>
                            <p className="auth-link-separator">
                                لديك حساب بالفعل؟ <a onClick={() => handleSwitchAuthPage('login')}>سجل الدخول</a>
                            </p>
                        </>
                    );
                case 'forgot_password':
                    return (
                        <>
                            <h2 className="form-title">استعادة كلمة المرور</h2>
                            <form onSubmit={handleForgotSubmit}>
                                {error && <p className="auth-error">{error}</p>}
                                <p className="auth-subtext">أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.</p>
                                <div className="input-group">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                   <input type="email" name="email" placeholder="البريد الإلكتروني" required onChange={handleInputChange} value={form.email} />
                                </div>
                                <button type="submit" className="auth-btn" disabled={loading}>
                                    {loading ? 'جاري الإرسال...' : 'إرسال الرابط'}
                                </button>
                            </form>
                             <p className="auth-link-separator">
                                تذكرت كلمة المرور؟ <a onClick={() => handleSwitchAuthPage('login')}>سجل الدخول</a>
                            </p>
                        </>
                    );
                case 'login':
                default:
                    return (
                        <>
                            <h2 className="form-title">أهلاً بك مجدداً!</h2>
                            <form onSubmit={handleLoginSubmit}>
                                {error && <p className="auth-error">{error}</p>}
                                <div className="input-group">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                   <input type="email" name="email" placeholder="البريد الإلكتروني" required onChange={handleInputChange} value={form.email} />
                                </div>
                                <div className="input-group">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                   <input type="password" name="password" placeholder="كلمة المرور" required onChange={handleInputChange} value={form.password}/>
                                </div>
                                <a onClick={() => handleSwitchAuthPage('forgot_password')} className="auth-link">نسيت كلمة المرور؟</a>
                                <button type="submit" className="auth-btn" disabled={loading}>
                                    {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                                </button>
                            </form>
                            <p className="auth-link-separator">
                                ليس لديك حساب؟ <a onClick={() => handleSwitchAuthPage('register')}>سجل الآن</a>
                            </p>
                        </>
                    );
            }
        }

        return (
            <div className="auth-container">
                <div className="auth-bg-art"></div>
                <div className="auth-content">
                    <header className="auth-header">
                        <h1>سنتر جوجل التعليمي</h1>
                        <p>بوابتك نحو التفوق الدراسي</p>
                    </header>
                    <div className="auth-card">
                        {loading && <div className="loading-spinner" style={{margin: '2rem auto'}}></div>}
                        {!loading && renderContent()}
                    </div>
                     <footer className="auth-footer">
                        <a onClick={() => navigate('about')}>من نحن</a>
                        <span>•</span>
                        <a onClick={() => navigate('legal')}>سياسة الخصوصية</a>
                    </footer>
                </div>
            </div>
        )
    };
    
    const ProfilePage = () => {
        const [isEditing, setIsEditing] = useState(false);
        const [profileForm, setProfileForm] = useState<User | null>(user);
        const [avatarFile, setAvatarFile] = useState<File | undefined>();
        const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);

        useEffect(() => {
            setProfileForm(user);
            setAvatarPreview(user?.avatar_url || null);
        }, [user]);

        if (!profileForm) return null;

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setProfileForm(prev => prev ? { ...prev, [name]: value } : null);
        };
        
        const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                setAvatarFile(file);
                setAvatarPreview(URL.createObjectURL(file));
            }
        };

        const handleSaveChanges = () => {
            if (user && profileForm) {
                const updatedData: Partial<User> = {};
                let hasChanges = false;
                if (profileForm.full_name !== user.full_name) { updatedData.full_name = profileForm.full_name; hasChanges = true; }
                if (profileForm.phone !== user.phone) { updatedData.phone = profileForm.phone; hasChanges = true; }
                if (profileForm.guardian_phone !== user.guardian_phone) { updatedData.guardian_phone = profileForm.guardian_phone; hasChanges = true; }
                if (profileForm.school !== user.school) { updatedData.school = profileForm.school; hasChanges = true; }
                
                if(hasChanges || avatarFile) {
                    openSaveConfirmation(updatedData, avatarFile);
                }
                setIsEditing(false);
            }
        };

        const handleCancel = () => {
            setProfileForm(user);
            setAvatarPreview(user?.avatar_url || null);
            setAvatarFile(undefined);
            setIsEditing(false);
        };
        
        const openProfileDeleteConfirmation = () => {
             // Deleting a user should be a secure, server-side operation.
             // For now, we just log them out.
            setConfirmationModal({ isOpen: true, title: 'تأكيد حذف الحساب', message: (<> <p style={{ fontWeight: 'bold', color: 'var(--error-color)' }}> تحذير! هذا الإجراء لا يمكن التراجع عنه. </p> <p>سيتم حذف جميع بياناتك نهائياً. هل أنت متأكد؟</p> </>), onConfirm: () => { handleLogout(); showToast('تم حذف الحساب بنجاح.', 'success'); }, confirmText: 'نعم، قم بالحذف', confirmButtonClass: 'btn-danger'});
        };

        return (
            <div className="page-container">
                <div className="content-card profile-page-card">
                    <div className="profile-header-section">
                         <div style={{position: 'relative'}}>
                            <InitialAvatar name={profileForm.full_name} avatarUrl={avatarPreview} className="profile-page-avatar" />
                            {isEditing && (
                                <label htmlFor="avatar-upload" style={{
                                    position: 'absolute', bottom: 0, right: 0, background: 'var(--accent-color)', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', border: '2px solid var(--bg-secondary-color)'
                                }}>
                                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h.01"/><path d="M2 8.5A4.5 4.5 0 0 1 6.5 4h1.05a2.5 2.5 0 0 1 2.22 1.5L11 8.5M7 15l2.09-2.09a2 2 0 0 1 2.82 0L17 15m-4.5-4.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/><path d="M14.5 4H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1.5"/></svg>
                                   <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} style={{display: 'none'}} />
                                </label>
                            )}
                        </div>
                        <div className="profile-header-info">
                            <h2>{profileForm.full_name}</h2>
                            <p>{profileForm.student_id}</p>
                            {profileForm.role && <span className="user-role-badge">{profileForm.role}</span>}
                        </div>
                    </div>

                    <div className="profile-form">
                        <h3 className="form-section-title">المعلومات الشخصية</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="full_name">الاسم بالكامل</label>
                                <input type="text" id="full_name" name="full_name" value={profileForm.full_name} onChange={handleInputChange} disabled={!isEditing} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">البريد الإلكتروني</label>
                                <input type="email" id="email" name="email" value={profileForm.email} onChange={handleInputChange} disabled />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">رقم الهاتف</label>
                                <input type="tel" id="phone" name="phone" value={profileForm.phone} onChange={handleInputChange} disabled={!isEditing} />
                            </div>
                             <div className="form-group">
                                <label htmlFor="guardian_phone">رقم هاتف ولي الأمر</label>
                                <input type="tel" id="guardian_phone" name="guardian_phone" value={profileForm.guardian_phone} onChange={handleInputChange} disabled={!isEditing} />
                            </div>
                             <div className="form-group">
                                <label htmlFor="school">المدرسة</label>
                                <input type="text" id="school" name="school" value={profileForm.school} onChange={handleInputChange} disabled={!isEditing} />
                            </div>
                             <div className="form-group">
                                <label htmlFor="grade">الصف الدراسي</label>
                                <input type="text" id="grade" name="grade" value={profileForm.grade} disabled />
                            </div>
                        </div>
                        <div className="form-actions">
                            {isEditing ? (
                                <>
                                    <button onClick={handleCancel} className="btn btn-secondary" style={{marginLeft: '1rem'}}>إلغاء</button>
                                    <button onClick={handleSaveChanges} className="btn btn-primary">حفظ التغييرات</button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="btn btn-primary">تعديل البيانات</button>
                            )}
                        </div>
                    </div>

                    <div className="danger-zone">
                        <h3 className="form-section-title">منطقة الخطر</h3>
                        <div className="danger-zone-content">
                            <p>حذف حسابك إجراء دائم ولا يمكن التراجع عنه.</p>
                            <button className="btn btn-danger" onClick={openProfileDeleteConfirmation}>حذف الحساب</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const TeachersPage = ({ teachers, onTeacherClick }: { teachers: Teacher[]; onTeacherClick: (teacher: Teacher) => void }) => (
        <div className="page-container">
            <div className="content-card">
                <h2 className="content-section-title">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span>كادر المدرسين</span>
                </h2>
                <div className="teachers-public-grid">
                    {teachers.map(teacher => (
                        <div key={teacher.id} className="teacher-public-card" onClick={() => onTeacherClick(teacher)}>
                            <img src={teacher.image_url} alt={teacher.name} className="teacher-public-image"/>
                            <div className="teacher-public-info">
                                <h4>{teacher.name}</h4>
                                <p>{teacher.subject}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
    
    const GalleryPage = ({ images }: { images: GalleryImage[] }) => (
        <div className="page-container">
            <div className="content-card">
                 <h2 className="content-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <span>معرض الصور</span>
                </h2>
                 <div className="gallery-full-grid">
                    {images.map(image => (
                        <div key={image.id} className="gallery-full-item" onClick={() => alert(`عرض مكبر للصورة: ${image.description}`)}>
                            <img src={image.image_url} alt={image.description} />
                            <div className="gallery-full-item-overlay">
                                <p>{image.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
    
    const TripsPage = ({ trips }: { trips: TripInfo[] }) => (
        <div className="page-container">
            <div className="content-card">
                 <h2 className="content-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 19.88a2.89 2.89 0 0 0 4.1 0l1.42-1.42a2.89 2.89 0 0 0 0-4.1l-6.5-6.5a2.89 2.89 0 0 0-4.1 0l-1.42 1.42a2.89 2.89 0 0 0 0 4.1l6.5 6.5Z" /><path d="m11 12.5 2 2" /><path d="m15.5 7.5-2-2" /><path d="m19 12-7-7" /><path d="m5 12 7 7" /></svg>
                    <span>الرحلات والأنشطة</span>
                </h2>
                 <div className="trips-public-list">
                    {trips.length > 0 ? trips.map(trip => (
                        <div key={trip.id} className="trip-public-card">
                            <div className="trip-public-image-container">
                                {trip.image_urls && trip.image_urls.length > 0 ? (
                                    <img src={trip.image_urls[0]} alt={trip.name} className="trip-public-image"/>
                                ) : (
                                    <div className="trip-public-image-placeholder">
                                        <span>🚌</span>
                                    </div>
                                )}
                                 <div className="trip-spots-badge">{trip.available_spots} مكان متاح</div>
                            </div>
                            <div className="trip-public-info">
                                <h3>{trip.name}</h3>
                                <div className="trip-public-details">
                                   <span>📍 {trip.place}</span>
                                   <span>🗓️ {formatDate(trip.date)}</span>
                                   <span>🕒 {formatTime(trip.time)}</span>
                                </div>
                                <p className="trip-public-description">{trip.description}</p>
                                <div className="trip-public-footer">
                                    <div className="trip-price-badge">{trip.price} ج.م</div>
                                    <button className="btn btn-primary" onClick={() => handleBooking(trip, 'trip')}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                        <span>حجز مكان</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p>لا توجد رحلات متاحة حالياً. تابعنا لمعرفة الجديد!</p>
                    )}
                 </div>
            </div>
        </div>
    );
    
    const SchedulePage = ({ classes }: { classes: ClassInfo[] }) => {
        const groupedClasses = useMemo(() => {
            const sorted = [...classes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time));
            return sorted.reduce((acc, currentClass) => {
                const dateKey = currentClass.date;
                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }
                acc[dateKey].push(currentClass);
                return acc;
            }, {} as Record<string, ClassInfo[]>);
        }, [classes]);
    
        const sortedDateKeys = Object.keys(groupedClasses);
    
        return (
            <div className="page-container">
                <div className="content-card">
                     <h2 className="content-section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>جدول الحصص الكامل</span>
                    </h2>
                     <div className="full-schedule-list">
                        {sortedDateKeys.length > 0 ? sortedDateKeys.map(dateKey => (
                            <div key={dateKey} className="schedule-day-group">
                                <h3 className="schedule-day-header">{getDayName(dateKey)} - {formatDate(dateKey)}</h3>
                                <div className="schedule-class-items">
                                    {groupedClasses[dateKey].map(c => (
                                        <div key={c.id} className="schedule-class-item" onClick={() => handleClassClick(c)}>
                                            <div className="class-time">{formatTime(c.time)}</div>
                                            <div className="class-details">
                                                <h4>{c.name}</h4>
                                                <p>{c.teacher} • {c.location}</p>
                                            </div>
                                            <div className="class-chevron">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )) : (
                           <p>لا توجد حصص مجدولة حالياً.</p>
                        )}
                     </div>
                </div>
            </div>
        );
    };

    const BooksPage = ({ books }: { books: BookInfo[] }) => (
        <div className="page-container">
            <div className="content-card">
                 <h2 className="content-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                    <span>الكتب والمذكرات</span>
                </h2>
                 <div className="books-public-grid">
                    {books.length > 0 ? books.map(book => (
                        <div key={book.id} className="book-public-card">
                            <div className="book-public-image-container">
                                 <img src={book.image_url} alt={book.title} className="book-public-image"/>
                            </div>
                            <div className="book-public-info">
                                <h3>{book.title}</h3>
                                <p className="book-public-description">{book.description}</p>
                                <div className="book-public-footer">
                                    <a href={book.download_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        <span>تحميل</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p style={{ textAlign: 'center', padding: '2rem' }}>لا توجد كتب أو مذكرات متاحة حالياً.</p>
                    )}
                 </div>
            </div>
        </div>
    );
    
    interface ExamsPageProps {
        user: User | null;
        ai: GoogleGenAIType | undefined;
        showToast: (message: string, type: ToastType) => void;
    }

    const ExamsPage: React.FC<ExamsPageProps> = ({ user, ai, showToast }) => {
        const [examState, setExamState] = useState<'selection' | 'in_progress' | 'results'>('selection');
        const [duration, setDuration] = useState<number>(15);
        const [specialization, setSpecialization] = useState<string>('');
        const [questions, setQuestions] = useState<ExamQuestion[]>([]);
        const [userAnswers, setUserAnswers] = useState<Map<number, number>>(new Map());
        const [results, setResults] = useState<ExamResults | null>(null);
        const [isLoading, setIsLoading] = useState(false);
        const [loadingMessage, setLoadingMessage] = useState('');

        const resetExam = () => {
            setExamState('selection');
            setQuestions([]);
            setUserAnswers(new Map());
            setResults(null);
            setIsLoading(false);
            setSpecialization('');
        };

        const handleStartExam = async () => {
            if (!ai || !user) {
                showToast("خدمة الاختبارات الذكية غير متاحة حالياً.", "error");
                return;
            }
            const grade = user.grade;
            if ((grade === 'الصف الثاني الثانوي' || grade === 'الصف الثالث الثانوي') && !specialization) {
                showToast('الرجاء اختيار التخصص أولاً لبدء الاختبار.', 'error');
                return;
            }

            setIsLoading(true);
            setLoadingMessage('يقوم الذكاء الاصطناعي بإعداد أسئلتك...');
            try {
                let numberOfQuestions = 10;
                if (duration === 30) {
                    numberOfQuestions = 15;
                } else if (duration === 45) {
                    numberOfQuestions = 22;
                }

                const prompt = specialization
                    ? `Generate ${numberOfQuestions} multiple-choice questions in various subjects for a student in '${user.grade}' specializing in '${specialization}' in Egypt.`
                    : `Generate ${numberOfQuestions} multiple-choice questions in various subjects for a student in '${user.grade}' in Egypt.`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.NUMBER },
                                    question_text: { type: Type.STRING, description: "The question text in Arabic." },
                                    options: {
                                        type: Type.ARRAY,
                                        description: "An array of 4 possible answer strings in Arabic.",
                                        items: { type: Type.STRING }
                                    },
                                    correct_answer_index: { type: Type.INTEGER, description: "The 0-based index of the correct answer in the options array." }
                                }
                            }
                        }
                    }
                });

                const generatedQuestions = JSON.parse(response.text) as ExamQuestion[];
                if (generatedQuestions && generatedQuestions.length > 0) {
                    setQuestions(generatedQuestions.map((q, i) => ({ ...q, id: i }))); // Ensure unique IDs
                    setExamState('in_progress');
                } else {
                    throw new Error("لم يتمكن الذكاء الاصطناعي من إنشاء الأسئلة.");
                }
            } catch (error) {
                console.error("Error generating exam questions:", error);
                showToast(`حدث خطأ أثناء إعداد الاختبار: ${getErrorMessage(error)}`, 'error');
                resetExam();
            } finally {
                setIsLoading(false);
            }
        };

        const handleFinishExam = async () => {
            if (!ai || !user) {
                showToast("خدمة التصحيح الذكي غير متاحة حالياً.", "error");
                return;
            }
            if (userAnswers.size !== questions.length) {
                showToast("الرجاء الإجابة على جميع الأسئلة قبل الإنهاء.", "info");
                return;
            }
            setIsLoading(true);
            setLoadingMessage('يقوم مساعدك الذكي بتصحيح إجاباتك...');
            setExamState('results'); // Move to results view to show loading indicator there

            try {
                const answersToEvaluate = questions.map(q => ({
                    question: q.question_text,
                    options: q.options,
                    correct_answer: q.options[q.correct_answer_index],
                    student_answer: q.options[userAnswers.get(q.id)!]
                }));
                
                const totalQuestions = questions.length;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `A student has completed a quiz. Here are their answers: ${JSON.stringify(answersToEvaluate)}. Please evaluate them.`,
                    config: {
                        systemInstruction: `You are a helpful and encouraging teacher's assistant speaking Arabic. Evaluate the student's answers. Calculate the score as a string 'X/${totalQuestions}' and provide a simple, clear explanation in Arabic for each *incorrect* answer only. Your response must be in JSON.`,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                score: { type: Type.STRING, description: `The score as a fraction, e.g., '8/${totalQuestions}'` },
                                feedback: {
                                    type: Type.ARRAY,
                                    description: "Feedback for incorrectly answered questions only.",
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            question_text: { type: Type.STRING },
                                            your_answer: { type: Type.STRING },
                                            correct_answer: { type: Type.STRING },
                                            explanation: { type: Type.STRING, description: "A simple explanation in Arabic why the correct answer is right." }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                const evaluation = JSON.parse(response.text) as ExamResults;
                setResults(evaluation);
                
                // Save results to Supabase
                const { error: saveError } = await supabase.from('exam_results').insert({
                    student_id: user.id,
                    score: evaluation.score,
                    feedback: evaluation.feedback,
                    duration: duration,
                    specialization: specialization
                });
                if (saveError) {
                    console.error("Error saving exam results:", saveError);
                    showToast('تم تصحيح اختبارك ولكن فشل حفظ النتيجة.', 'error');
                }

            } catch (error) {
                console.error("Error evaluating answers:", error);
                showToast(`حدث خطأ أثناء تصحيح الاختبار: ${getErrorMessage(error)}`, 'error');
                resetExam();
            } finally {
                setIsLoading(false);
            }
        };

        const handleAnswerSelect = (questionId: number, answerIndex: number) => {
            setUserAnswers(prev => new Map(prev).set(questionId, answerIndex));
        };

        const renderContent = () => {
            if (isLoading && examState !== 'results') {
                return (
                     <div className="exam-card exam-loading-overlay">
                        <div className="loading-spinner"></div>
                        <p>{loadingMessage}</p>
                    </div>
                );
            }

            switch (examState) {
                case 'selection':
                    const grade = user?.grade;
                    const isSecondary2 = grade === 'الصف الثاني الثانوي';
                    const isSecondary3 = grade === 'الصف الثالث الثانوي';
                    const requiresSpecialization = isSecondary2 || isSecondary3;

                    return (
                        <div className="exam-card exam-selection-card">
                            <h3>اختبر معلوماتك مع المساعد الذكي</h3>
                             <div className="form-group">
                                <label htmlFor="grade-display">صفك الدراسي</label>
                                <input type="text" id="grade-display" value={user?.grade || ''} disabled />
                            </div>

                            {requiresSpecialization && (
                                <div className="form-group">
                                    <label>اختر التخصص</label>
                                    <div className="specialization-options">
                                        {isSecondary2 && (
                                            <>
                                                <button onClick={() => setSpecialization('علمي')} className={specialization === 'علمي' ? 'active' : ''}>علمي</button>
                                                <button onClick={() => setSpecialization('أدبي')} className={specialization === 'أدبي' ? 'active' : ''}>أدبي</button>
                                            </>
                                        )}
                                        {isSecondary3 && (
                                            <>
                                                <button onClick={() => setSpecialization('علمي علوم')} className={specialization === 'علمي علوم' ? 'active' : ''}>علمي علوم</button>
                                                <button onClick={() => setSpecialization('علمي رياضة')} className={specialization === 'علمي رياضة' ? 'active' : ''}>علمي رياضة</button>
                                                <button onClick={() => setSpecialization('أدبي')} className={specialization === 'أدبي' ? 'active' : ''}>أدبي</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="exam-duration">اختر مدة الاختبار</label>
                                <select id="exam-duration" value={duration} onChange={e => setDuration(Number(e.target.value))}>
                                    <option value="15">15 دقيقة (10 أسئلة)</option>
                                    <option value="30">30 دقيقة (15 سؤال)</option>
                                    <option value="45">45 دقيقة (22 سؤال)</option>
                                </select>
                            </div>
                            <button className="btn btn-primary btn-start-exam" onClick={handleStartExam} disabled={isLoading || (requiresSpecialization && !specialization)}>
                                ابدأ الاختبار الآن
                            </button>
                        </div>
                    );
                
                case 'in_progress':
                    return (
                        <div className="exam-in-progress-container">
                            {questions.map((q, index) => (
                                <div key={q.id} className="exam-question-card">
                                    <h4>{index + 1}. {q.question_text}</h4>
                                    <div className="exam-options">
                                        {q.options.map((option, i) => (
                                            <div
                                                key={i}
                                                className={`exam-option ${userAnswers.get(q.id) === i ? 'selected' : ''}`}
                                                onClick={() => handleAnswerSelect(q.id, i)}
                                            >
                                                <span className="option-key">{String.fromCharCode(65 + i)}</span>
                                                <span>{option}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                             <div className="exam-actions">
                                <button className="btn btn-success btn-finish-exam" onClick={handleFinishExam} disabled={userAnswers.size !== questions.length}>
                                    إنهاء الاختبار والتصحيح
                                </button>
                            </div>
                        </div>
                    );

                case 'results':
                    if (isLoading) {
                         return (
                            <div className="exam-card exam-loading-overlay">
                                <div className="loading-spinner"></div>
                                <p>{loadingMessage}</p>
                            </div>
                        );
                    }
                    if (!results) return <div>لا توجد نتائج لعرضها.</div>;

                    return (
                        <div className="exam-card exam-results-card">
                            <h2>نتيجتك: {results.score} <span className="star-emoji">⭐</span></h2>
                            <p>أداء رائع! استمر في التعلم والمثابرة.</p>

                            {results.feedback && results.feedback.length > 0 && (
                                <div className="results-feedback-list">
                                    <h3 className="form-section-title">مراجعة الأخطاء</h3>
                                    {results.feedback.map((item, index) => (
                                        <div key={index} className="results-feedback-item">
                                            <p className="question-text">{item.question_text}</p>
                                            <p className="answer-details">
                                                <strong>إجابتك: </strong> <span className="user-answer">{item.your_answer}</span>
                                            </p>
                                             <p className="answer-details">
                                                <strong>الإجابة الصحيحة: </strong> <span className="correct-answer">{item.correct_answer}</span>
                                            </p>
                                            <div className="explanation">
                                                <strong>التوضيح:</strong> {item.explanation}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                             <div className="exam-actions">
                                <button className="btn btn-primary" onClick={resetExam}>
                                    إجراء اختبار آخر
                                </button>
                            </div>
                        </div>
                    );
            }
        };

        return (
            <div className="page-container exams-page-container">
                <div className="content-card">
                     <h2 className="content-section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14.5 2-8.5 8.5 5 5L19.5 7Z" /><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg>
                        <span>الاختبارات</span>
                    </h2>
                    {renderContent()}
                </div>
            </div>
        );
    };

    const AboutPage = () => (
      <div className="page-container">
        <div className="content-card static-page-content">
          <h2 className="content-section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            <span>من نحن</span>
          </h2>
          <p>مركز جوجل التعليمي ليس مجرد مكان لتلقي الدروس، بل هو بيئة تعليمية متكاملة مصممة لإطلاق العنان لإمكانيات كل طالب. نؤمن بأن التعليم هو رحلة شيقة من الاستكشاف والنمو، ونسعى جاهدين لنكون الشريك الأمثل لكم في هذه الرحلة نحو التفوق.</p>

          <h3>رؤيتنا ✨</h3>
          <p>أن نكون المنصة التعليمية الرائدة في مصر، والمزودة بأحدث التقنيات التعليمية التي تمكن جيلاً جديداً من المبدعين والمفكرين القادرين على مواجهة تحديات المستقبل.</p>

          <h3>رسالتنا 🚀</h3>
          <p>تتمحور رسالتنا حول عدة ركائز أساسية:</p>
          <ul>
            <li>توفير تعليم عالي الجودة يقدمه نخبة من أكفأ المعلمين.</li>
            <li>استخدام أساليب تعليمية مبتكرة وتفاعلية تجعل التعلم ممتعاً وفعالاً.</li>
            <li>بناء شخصية الطالب وتنمية مهاراته الحياتية إلى جانب التحصيل الأكاديمي.</li>
            <li>خلق مجتمع تعليمي داعم ومحفز يشعر فيه الطالب بالانتماء والأمان.</li>
          </ul>

          <h3>مدرسونا 👨‍🏫👩‍🏫</h3>
          <p>نفخر بفريقنا من المعلمين الخبراء الذين يتمتعون بشغف حقيقي للتعليم. يتم اختيارهم بعناية فائقة ليس فقط لخبرتهم الأكاديمية، بل لقدرتهم على إلهام الطلاب وتوجيههم وبناء علاقة ثقة معهم.</p>

          <h3>ماذا نقدم؟ 📦</h3>
          <p>نوفر مجموعة متكاملة من الخدمات التعليمية لدعم طلابنا في كل خطوة:</p>
          <ul>
            <li>مجموعات تقوية لجميع المراحل الدراسية (إعدادي - ثانوي).</li>
            <li>منصة رقمية متكاملة لمتابعة الدروس، الحجوزات، والوصول للمواد التعليمية.</li>
            <li>مساعد ذكي قائم على الذكاء الاصطناعي للإجابة على استفسارات الطلاب على مدار الساعة.</li>
            <li>اختبارات دورية وتجريبية لقياس مستوى التقدم وتقديم ملاحظات بناءة.</li>
            <li>أنشطة ورحلات تعليمية وترفيهية لتوسيع آفاق الطلاب وتعزيز مهاراتهم الاجتماعية.</li>
          </ul>
        </div>
      </div>
    );

     const LegalPage = () => (
      <div className="page-container">
        <div className="content-card static-page-content">
          <h2 className="content-section-title">📜 الشروط والأحكام وسياسة الخصوصية</h2>
          
          <h3>مقدمة</h3>
          <p>مرحباً بك في مركز جوجل التعليمي. باستخدامك لتطبيقنا، فإنك توافق على الالتزام بالشروط والأحكام التالية، بالإضافة إلى سياسة الخصوصية. يرجى قراءتها بعناية.</p>

          <hr className="sidebar-divider"/>

          <h3>أولاً: الشروط والأحكام</h3>
          <ol>
            <li><strong>الحسابات والمسؤولية:</strong>
              <ul>
                <li>أنت مسؤول عن الحفاظ على سرية معلومات حسابك (اسم المستخدم وكلمة المرور).</li>
                <li>يجب أن تكون جميع المعلومات المقدمة عند التسجيل دقيقة وكاملة وحديثة.</li>
                <li>أنت مسؤول عن جميع الأنشطة التي تحدث تحت حسابك.</li>
              </ul>
            </li>
            <li><strong>الاستخدام المقبول:</strong>
              <ul>
                <li>يوافق المستخدمون على عدم استخدام التطبيق لأي غرض غير قانوني أو محظور بموجب هذه الشروط.</li>
                <li>يُمنع منعاً باتاً نشر أي محتوى مسيء، تشهيري، أو ضار، أو أي محتوى ينتهك حقوق الآخرين.</li>
              </ul>
            </li>
            <li><strong>الملكية الفكرية:</strong>
              <ul>
                <li>جميع المحتويات الموجودة على التطبيق، بما في ذلك النصوص، الرسومات، الشعارات، والمواد التعليمية، هي ملك حصري لـ "مركز جوجل التعليمي" ومحمية بموجب قوانين حقوق النشر والعلامات التجارية.</li>
                <li>لا يجوز لك نسخ أو تعديل أو توزيع أو بيع أي جزء من محتوانا دون إذن كتابي صريح منا.</li>
              </ul>
            </li>
            <li><strong>إنهاء الخدمة:</strong>
              <ul>
                <li>نحتفظ بالحق في تعليق أو إنهاء حساب أي مستخدم يخالف هذه الشروط دون سابق إنذار أو إشعار.</li>
              </ul>
            </li>
          </ol>

          <hr className="sidebar-divider"/>

          <h3>ثانياً: سياسة الخصوصية</h3>
          <ol>
            <li><strong>جمع المعلومات:</strong>
              <ul>
                <li>نقوم بجمع معلومات شخصية تقدمها أنت مباشرةً مثل الاسم، البريد الإلكتروني، رقم الهاتف، والمرحلة الدراسية عند التسجيل.</li>
                <li>قد نقوم بجمع بيانات حول كيفية استخدامك للتطبيق (مثل الصفحات التي تزورها، الاختبارات التي تجريها) وذلك لتحسين خدماتنا.</li>
              </ul>
            </li>
            <li><strong>استخدام المعلومات:</strong>
              <ul>
                <li>تُستخدم معلوماتك لتوفير وإدارة حسابك وتخصيص تجربتك التعليمية.</li>
                <li>للتواصل معك بشأن التحديثات، والإعلانات الهامة، وجداول الحصص.</li>
                <li>لتحليل بيانات الاستخدام بهدف تحسين وتطوير التطبيق وخدماتنا.</li>
              </ul>
            </li>
            <li><strong>مشاركة المعلومات:</strong>
              <ul>
                <li>نحن لا نبيع أو نؤجر أو نشارك معلوماتك الشخصية مع أطراف ثالثة لأغراض تسويقية.</li>
                <li>قد نشارك البيانات مع مزودي الخدمات الموثوقين الذين يساعدوننا في تشغيل التطبيق (مثل موفري البنية التحتية السحابية)، مع إلزامهم قانونياً بالحفاظ على سرية وأمان بياناتك.</li>
              </ul>
            </li>
             <li><strong>أمان البيانات:</strong>
              <ul>
                <li>نتخذ تدابير أمنية تقنية وإدارية معقولة لحماية معلوماتك الشخصية من الفقدان أو السرقة أو الوصول غير المصرح به.</li>
              </ul>
            </li>
             <li><strong>حقوقك:</strong>
              <ul>
                <li>لديك الحق في الوصول إلى معلوماتك الشخصية التي نحتفظ بها، وطلب تصحيحها أو تحديثها.</li>
                <li>يمكنك طلب حذف حسابك وبياناتك المرتبطة به وفقاً للشروط الموضحة.</li>
              </ul>
            </li>
            <li><strong>التغييرات على السياسة:</strong>
              <ul>
                <li>قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنقوم بإعلامك بأي تغييرات جوهرية عبر التطبيق أو البريد الإلكتروني.</li>
              </ul>
            </li>
          </ol>
          <p>آخر تحديث: يوليو 2024</p>
        </div>
      </div>
    );
    
    const InstructionsPage = () => (
      <div className="page-container">
        <div className="content-card static-page-content">
          <h2 className="content-section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
            <span>تعليمات الاستخدام</span>
          </h2>
          <p>مرحباً بك في دليل استخدام تطبيق سنتر جوجل! هذا الدليل سيساعدك على استكشاف جميع ميزات التطبيق والاستفادة منها بشكل كامل.</p>
    
          <h3>1. الصفحة الرئيسية (Dashboard)</h3>
          <ul>
            <li><strong>شريط الحصص اليومية:</strong> في أعلى الشاشة، ستجد شريطاً متحركاً يعرض الحصص المجدولة لليوم الحالي. يمكنك الضغط على أي حصة لمعرفة تفاصيلها.</li>
            <li><strong>الإعلانات:</strong> يعرض هذا القسم آخر الأخبار والإعلانات الهامة من إدارة السنتر.</li>
            <li><strong>الحصص الأسبوعية:</strong> يمكنك تصفح جدول الحصص للأيام القادمة. اضغط على أي حصة لحجزها أو عرض تفاصيلها مثل المدرس والمكان والموعد.</li>
            <li><strong>لمحات من المركز:</strong> استعرض أحدث الصور من فعاليات وأنشطة السنتر.</li>
          </ul>
    
          <h3>2. المساعد الذكي (Neo) 💡</h3>
           <ul>
            <li>اضغط على الزر العائم (الدائرة الزرقاء) في أسفل الشاشة لفتح نافذة الدردشة مع مساعدنا الذكي.</li>
            <li>يمكنك سؤاله عن أي شيء يخص السنتر: مواعيد الحصص، تفاصيل الرحلات، معلومات عن المدرسين، أو حتى طلب المساعدة في حل مسألة!</li>
          </ul>
    
          <h3>3. نظام الاختبارات الذكية 📝</h3>
          <ul>
            <li>من القائمة الجانبية، اذهب إلى قسم "الاختبارات".</li>
            <li>اختر تخصصك (إذا كنت في الصف الثاني أو الثالث الثانوي) ومدة الاختبار.</li>
            <li>سيقوم الذكاء الاصطناعي بإنشاء اختبار مخصص لك في مختلف المواد.</li>
            <li>بعد الإجابة على الأسئلة، اضغط على "إنهاء" ليتم تصحيح اختبارك فورياً وعرض نتيجتك مع شرح للأخطاء.</li>
          </ul>
          
          <h3>4. الحجوزات والمتابعة 📌</h3>
          <ul>
            <li><strong>حجز الحصص والرحلات:</strong> من خلال الأقسام المخصصة، عند الضغط على حصة أو رحلة، ستظهر لك نافذة بالتفاصيل مع زر لتأكيد الحجز.</li>
            <li><strong>الإشعارات:</strong> أي عملية حجز أو إعلان هام سيصلك به إشعار فوري. تفقد جرس الإشعارات في الأعلى لتبقى على اطلاع.</li>
          </ul>
          
          <h3>5. الملف الشخصي والبيانات 👤</h3>
           <ul>
            <li>يمكنك الوصول لملفك الشخصي من خلال الضغط على صورتك واسمك في أعلى القائمة الجانبية.</li>
            <li>في هذه الصفحة، يمكنك تعديل بياناتك الشخصية مثل رقم الهاتف والبريد الإلكتروني.</li>
          </ul>
        </div>
      </div>
    );

    const renderPage = () => {
        if (page === 'auth' && !user) {
            return <AuthPage />;
        }
        
        const pageContent = () => {
            switch(page) {
                case 'dashboard': return <DashboardPage />;
                case 'profile': return <ProfilePage />;
                case 'admin': return <AdminPage />;
                case 'stats': return <StatsPage />;
                case 'teachers': return <TeachersPage teachers={teachers} onTeacherClick={handleTeacherClick} />;
                case 'gallery': return <GalleryPage images={gallery} />;
                case 'trips': return <TripsPage trips={trips} />;
                case 'schedule': return <SchedulePage classes={classes} />;
                case 'books': return <BooksPage books={books} />;
                case 'exams': return <ExamsPage user={user} ai={ai} showToast={showToast}/>;
                case 'about': return <AboutPage />;
                case 'legal': return <LegalPage />;
                case 'instructions': return <InstructionsPage />;
                default: return <DashboardPage />;
            }
        };

        return <MainLayout>{pageContent()}</MainLayout>;
    };

    return (
        <>
            {renderPage()}
            {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <ClassPopup isOpen={classPopup.isOpen} classInfo={classPopup.classInfo} onClose={() => setClassPopup({ isOpen: false, classInfo: null })} onBook={(item) => handleBooking(item, 'class')} />
            <TeacherPopup isOpen={teacherPopup.isOpen} teacherInfo={teacherPopup.teacherInfo} onClose={() => setTeacherPopup({ isOpen: false, teacherInfo: null })} />
            {user && <ChatModal isOpen={isChatOpen} onClose={() => setChatOpen(false)} messages={chatMessages} onSend={handleSendChatMessage} isThinking={isAiThinking} />}
            <AdminModal state={adminModalState} onClose={handleCloseAdminModal} onSave={handleSaveAdminItem} />
            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                onClose={closeConfirmationModal}
                onConfirm={confirmationModal.onConfirm}
                title={confirmationModal.title}
                message={confirmationModal.message}
                confirmText={confirmationModal.confirmText}
                confirmButtonClass={confirmationModal.confirmButtonClass}
            />
        </>
    );
};

// --- Admin Modal Component ---
interface AdminModalProps {
    state: AdminModalState;
    onClose: () => void;
    onSave: (item: any, section: AdminSection) => void;
}
const AdminModal: React.FC<AdminModalProps> = ({ state, onClose, onSave }) => {
    const [formData, setFormData] = useState<any>({});
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [filesToUpload, setFilesToUpload] = useState<Record<string, File | File[]>>({});

    useEffect(() => {
        if (state.isOpen) {
            setFilesToUpload({}); // Reset files on open
            if (state.mode === 'edit' && state.item) {
                setFormData(state.item);
                // Set initial previews for edit mode
                if ('image_url' in state.item && state.item.image_url) {
                    setImagePreviews([state.item.image_url]);
                } else if ('image_urls' in state.item && state.item.image_urls) {
                    setImagePreviews(state.item.image_urls);
                } else {
                    setImagePreviews([]);
                }
            } else {
                // Reset for add mode
                let initialFormState = {};
                switch(state.section) {
                    case 'teachers': initialFormState = { name: '', subject: '', image_url: '', phone: '' }; break;
                    case 'trips': initialFormState = { name: '', place: '', date: '', time: '', price: 0, available_spots: 0, description: '', image_urls: [] }; break;
                    case 'gallery': initialFormState = { image_url: '', description: '' }; break;
                    case 'classes': initialFormState = { name: '', teacher: '', grade: 'الصف الثالث الثانوي', date: '', time: '', location: '', description: '', is_review: false, is_bookable: true }; break;
                    case 'books': initialFormState = { title: '', description: '', image_url: '', download_url: '' }; break;
                    case 'posts': initialFormState = { title: '', content: '', image_url: '' }; break;
                    default: initialFormState = {};
                }
                setFormData(initialFormState);
                setImagePreviews([]);
            }
        }
    }, [state]);
    
    if (!state.isOpen || !state.section) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
         if (type === 'checkbox') {
            setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
        } else if (type === 'number') {
             setFormData({ ...formData, [name]: parseFloat(value) || 0 });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const { name, files, multiple } = e.target;

        if (multiple) {
            const fileList = Array.from(files);
            const newImageUrls = fileList.map(file => URL.createObjectURL(file));
            setImagePreviews(newImageUrls);
            setFilesToUpload(prev => ({ ...prev, [name]: fileList }));
        } else {
            if (files.length > 0) {
                 const file = files[0];
                 const newImageUrl = URL.createObjectURL(file);
                 setImagePreviews([newImageUrl]);
                 setFilesToUpload(prev => ({...prev, [name]: file}));
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, filesToUpload }, state.section!);
    };
    
    const titles: Record<AdminSection, string> = {
         teachers: 'المدرس', trips: 'الرحلة', gallery: 'الصورة',
         classes: 'الحصة', posts: 'المنشور', students: 'الطالب', bookings: 'الحجز', books: 'الكتاب'
    };
    const title = `${state.mode === 'add' ? 'إضافة' : 'تعديل'} ${titles[state.section] || ''}`;

    const renderForm = () => {
        switch(state.section) {
            case 'teachers':
                return <>
                    <div className="form-group"><label>اسم المدرس</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>المادة</label><input type="text" name="subject" value={formData.subject || ''} onChange={handleChange} required /></div>
                    <div className="form-group">
                        <label>صورة المدرس</label>
                        <input type="file" name="image_url" accept="image/*" onChange={handleFileChange} className="file-input" />
                        {imagePreviews.length > 0 && (
                            <div className="image-preview-container single-preview">
                                <img src={imagePreviews[0]} alt="Preview" className="image-preview" />
                            </div>
                         )}
                    </div>
                    <div className="form-group"><label>رقم الهاتف (اختياري)</label><input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} /></div>
                </>;
            case 'classes':
                return <>
                    <div className="form-group"><label>اسم الحصة</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} required /></div>
                    <div className="form-grid">
                        <div className="form-group"><label>المدرس</label><input type="text" name="teacher" value={formData.teacher || ''} onChange={handleChange} required /></div>
                        <div className="form-group"><label>القاعة/المكان</label><input type="text" name="location" value={formData.location || ''} onChange={handleChange} required /></div>
                    </div>
                     <div className="form-grid">
                        <div className="form-group"><label>التاريخ</label><input type="date" name="date" value={formData.date || ''} onChange={handleChange} required /></div>
                        <div className="form-group"><label>الوقت</label><input type="time" name="time" value={formData.time || ''} onChange={handleChange} required /></div>
                    </div>
                    <div className="form-group"><label>الصف الدراسي</label>
                        <select name="grade" value={formData.grade || ''} onChange={handleChange} required>
                            <option>الصف الأول الثانوي</option>
                            <option>الصف الثاني الثانوي</option>
                            <option>الصف الثالث الثانوي</option>
                        </select>
                    </div>
                    <div className="form-group"><label>وصف الحصة</label><textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} /></div>
                    <div className="form-group checkbox-group">
                        <input type="checkbox" id="is_review" name="is_review" checked={!!formData.is_review} onChange={handleChange} />
                        <label htmlFor="is_review">هذه حصة مراجعة</label>
                    </div>
                    <div className="form-group checkbox-group">
                        <input type="checkbox" id="is_bookable" name="is_bookable" checked={!!formData.is_bookable} onChange={handleChange} />
                        <label htmlFor="is_bookable">السماح للطلاب بالحجز</label>
                    </div>
                </>;
            case 'trips':
                return <>
                    <div className="form-group"><label>اسم الرحلة</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} required /></div>
                    <div className="form-grid"><div className="form-group"><label>المكان</label><input type="text" name="place" value={formData.place || ''} onChange={handleChange} required /></div><div className="form-group"><label>السعر (ج.م)</label><input type="number" name="price" value={formData.price || 0} onChange={handleChange} required /></div></div>
                    <div className="form-grid"><div className="form-group"><label>التاريخ</label><input type="date" name="date" value={formData.date || ''} onChange={handleChange} required /></div><div className="form-group"><label>الوقت</label><input type="time" name="time" value={formData.time || ''} onChange={handleChange} required /></div></div>
                    <div className="form-group"><label>الأماكن المتاحة</label><input type="number" name="available_spots" value={formData.available_spots || 0} onChange={handleChange} required /></div>
                    <div className="form-group"><label>الوصف</label><textarea name="description" value={formData.description || ''} onChange={handleChange} rows={4} required /></div>
                     <div className="form-group">
                        <label>صور الرحلة (1-5 صور)</label>
                        <input type="file" name="image_urls" multiple accept="image/*" onChange={handleFileChange} className="file-input" />
                        {imagePreviews.length > 0 && (
                            <div className="image-preview-container">
                                {imagePreviews.map((url: string, i: number) => <img key={i} src={url} alt={`Preview ${i + 1}`} className="image-preview" />)}
                            </div>
                        )}
                    </div>
                </>;
            case 'gallery':
                return <>
                     <div className="form-group">
                        <label>صورة للمعرض</label>
                         <input type="file" name="image_url" accept="image/*" onChange={handleFileChange} className="file-input" />
                         {imagePreviews.length > 0 && (
                            <div className="image-preview-container single-preview">
                                <img src={imagePreviews[0]} alt="Preview" className="image-preview" />
                            </div>
                         )}
                    </div>
                    <div className="form-group"><label>وصف بسيط (سطر واحد)</label><input type="text" name="description" value={formData.description || ''} onChange={handleChange} required /></div>
                </>;
            case 'books':
                return <>
                    <div className="form-group"><label>عنوان الكتاب/المذكرة</label><input type="text" name="title" value={formData.title || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>الوصف</label><textarea name="description" value={formData.description || ''} onChange={handleChange} rows={4} required /></div>
                    <div className="form-group">
                        <label>صورة الغلاف</label>
                        <input type="file" name="image_url" accept="image/*" onChange={handleFileChange} className="file-input" />
                        {imagePreviews.length > 0 && (
                            <div className="image-preview-container single-preview">
                                <img src={imagePreviews[0]} alt="Preview" className="image-preview" />
                            </div>
                         )}
                    </div>
                    <div className="form-group"><label>ملف الكتاب (PDF)</label><input type="file" name="download_url" accept=".pdf" onChange={handleFileChange} className="file-input" /></div>
                </>;
            case 'posts':
                return <>
                    <div className="form-group"><label>عنوان المنشور</label><input type="text" name="title" value={formData.title || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>محتوى المنشور</label><textarea name="content" value={formData.content || ''} onChange={handleChange} rows={5} required /></div>
                    <div className="form-group">
                        <label>صورة المنشور (اختياري)</label>
                        <input type="file" name="image_url" accept="image/*" onChange={handleFileChange} className="file-input" />
                        {imagePreviews.length > 0 && (
                            <div className="image-preview-container single-preview">
                                <img src={imagePreviews[0]} alt="Preview" className="image-preview" />
                            </div>
                         )}
                    </div>
                </>;
            default: return <p>لا يوجد نموذج متاح لهذا القسم.</p>
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container admin-modal" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h3>{title}</h3>
                        <button type="button" onClick={onClose} className="close-btn">&times;</button>
                    </div>
                    <div className="modal-body admin-modal-body">
                       {renderForm()}
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary">إلغاء</button>
                        <button type="submit" className="btn btn-primary">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- RENDER APP ---
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<React.StrictMode><App /></React.StrictMode>);
