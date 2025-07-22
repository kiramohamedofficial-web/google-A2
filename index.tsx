
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, GoogleGenAI as GoogleGenAIType } from '@google/genai';

// --- SUPABASE CLIENT SETUP ---
const SUPABASE_URL = 'https://ophlmmpisgizpvgxndkh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9waGxtbXBpc2dpenB2Z3huZGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTcxMDIsImV4cCI6MjA2NzczMzEwMn0.c489RBMwNt_k5cHLVOJX44Ocn7hMgCA_bZkCFJVLxrM';
const supabase = (window as any).supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
const getDayName = (dateString: string) => new Date(dateString).toLocaleDateString('ar-EG', { weekday: 'long' });
const formatTime = (timeString: string) => {
    if (!timeString || !timeString.includes(':')) return 'غير محدد';
    const [hour, minute] = timeString.split(':');
    const d = new Date();
    d.setHours(parseInt(hour, 10));
    d.setMinutes(parseInt(minute, 10));
    return d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// --- TYPES AND INTERFACES ---
type Page = 'auth' | 'dashboard' | 'profile' | 'gallery' | 'teachers' | 'about' | 'trips' | 'legal' | 'admin' | 'stats' | 'schedule' | 'books' | 'exams' | 'instructions';
type AuthPage = 'login' | 'register' | 'forgot_password';
type ToastType = 'success' | 'error' | 'info';
type Theme = 'light' | 'dark' | 'pink';
type AdminSection = 'classes' | 'teachers' | 'posts' | 'students' | 'trips' | 'gallery' | 'bookings';
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
}

interface ClassInfo { id: number; name: string; teacher: string; grade: string; date: string; time: string; location: string; image_url?: string; }
interface TripInfo { id: number; name: string; place: string; date: string; time: string; description: string; image_urls: string[]; price: number; available_spots: number; }
interface Post { id: number; title: string; content: string; image_url?: string; created_at: string; }
interface Teacher { id: number; name: string; subject: string; image_url: string; phone?: string; }
interface GalleryImage { id: number; image_url: string; description: string; }
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
  text: string;
  time: string;
  read: boolean;
  icon: string;
}

type AdminEditableItem = Teacher | TripInfo | GalleryImage | ClassInfo | Post;
interface AdminModalState {
    isOpen: boolean;
    mode: AdminModalMode;
    section: AdminSection | null;
    item: AdminEditableItem | null;
}


// --- PLACEHOLDER DATA (For Demo Mode Only) ---
const placeholderAdmin: User = { id: 'admin-id', student_id: 'GC-ADMIN-001', full_name: 'المدير العام', email: 'admin@google.com', phone: '01011111111', guardian_phone: '', school: 'الإدارة', grade: 'المدير', role: 'admin' };
const placeholderSupervisor: User = { id: 'supervisor-id', student_id: 'GC-SUPER-001', full_name: 'المشرف', email: 'supervisor@google.com', phone: '01022222222', guardian_phone: '', school: 'الإشراف', grade: 'المشرف', role: 'supervisor' };
const placeholderStudent: User = { id: 'demo-id-1', student_id: 'GC-DEMO-24015', full_name: 'عبدالرحمن محمد', email: 'demo@example.com', phone: '01012345678', guardian_phone: '01222222222', school: 'مدرسة المستقبل', grade: 'الصف الثالث الثانوي', role: 'student', created_at: '2024-01-10T10:00:00Z' };

const placeholderStudents: User[] = [
    placeholderStudent,
    { id: 'demo-id-2', student_id: 'GC-DEMO-24016', full_name: 'فاطمة الزهراء', email: 'fatima@example.com', phone: '01123456789', guardian_phone: '01234567890', school: 'مدرسة النور', grade: 'الصف الثاني الثانوي', role: 'student', created_at: '2024-02-15T11:00:00Z' },
    { id: 'demo-id-3', student_id: 'GC-DEMO-24017', full_name: 'علي حسن', email: 'ali@example.com', phone: '01555555555', guardian_phone: '01111111111', school: 'مدرسة التفوق', grade: 'الصف الأول الثانوي', role: 'student', created_at: '2024-03-20T12:00:00Z' },
    { id: 'demo-id-4', student_id: 'GC-DEMO-24018', full_name: 'مريم أحمد', email: 'mariam@example.com', phone: '01098765432', guardian_phone: '01198765432', school: 'مدرسة الأفق', grade: 'الصف الثالث الثانوي', role: 'student', created_at: '2024-04-01T09:00:00Z' },

];

const today = new Date();
const todayISO = today.toISOString().split('T')[0];
const getFutureDateISO = (days: number) => {
    const d = new Date();
    d.setDate(today.getDate() + days);
    return d.toISOString().split('T')[0];
};

const placeholderClasses: ClassInfo[] = [
    { id: 1, name: 'الفيزياء الحديثة', teacher: 'أ. أحمد المصري', grade: 'الصف الثالث الثانوي', date: todayISO, time: '14:00', location: 'قاعة 1', image_url: 'https://images.unsplash.com/photo-1532187643623-8f6a72070348?q=80&w=800' },
    { id: 2, name: 'الكيمياء العضوية', teacher: 'أ. سارة عبدالحميد', grade: 'الصف الثالث الثانوي', date: todayISO, time: '16:00', location: 'قاعة 2', image_url: 'https://images.unsplash.com/photo-1554475901-4538ddfbccc2?q=80&w=800' },
    { id: 3, name: 'اللغة الإنجليزية (متقدم)', teacher: 'أ. مارك جونسون', grade: 'الصف الثاني الثانوي', date: todayISO, time: '18:00', location: 'المعمل اللغوي', image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800' },
    { id: 4, name: 'الرياضيات (جبر)', teacher: 'أ. هند إبراهيم', grade: 'الصف الأول الثانوي', date: getFutureDateISO(1), time: '15:00', location: 'قاعة 3' },
    { id: 5, name: 'الأحياء (وراثة)', teacher: 'أ. خالد السيد', grade: 'الصف الثالث الثانوي', date: getFutureDateISO(1), time: '17:00', location: 'المعمل' },
    { id: 6, name: 'اللغة العربية (بلاغة)', teacher: 'أ. شيماء قاسم', grade: 'الصف الثاني الثانوي', date: getFutureDateISO(2), time: '16:00', location: 'قاعة 4' },
    { id: 7, name: 'التاريخ الحديث', teacher: 'أ. محمد فتحي', grade: 'الصف الأول الثانوي', date: getFutureDateISO(2), time: '14:00', location: 'قاعة 1' },
    { id: 8, name: 'الجغرافيا السياسية', teacher: 'أ. محمد فتحي', grade: 'الصف الثالث الثانوي', date: getFutureDateISO(3), time: '14:00', location: 'قاعة 1' },
    { id: 9, name: 'الفلسفة والمنطق', teacher: 'أ. شيماء قاسم', grade: 'الصف الثالث الثانوي', date: getFutureDateISO(4), time: '16:00', location: 'قاعة 4' },
];
const placeholderTrips: TripInfo[] = [ { id: 1, name: 'رحلة إلى مكتبة الإسكندرية', place: 'الإسكندرية', date: getFutureDateISO(7), time: '08:00', description: 'رحلة تعليمية وثقافية لاستكشاف صرح من أعظم صروح المعرفة في العالم.', image_urls: ['https://images.unsplash.com/photo-1596773328403-9512341498b3?q=80&w=800'], price: 250, available_spots: 50 }, { id: 2, name: 'زيارة المتحف المصري الكبير', place: 'الجيزة', date: getFutureDateISO(14), time: '09:00', description: 'شاهد كنوز الحضارة المصرية القديمة في أكبر متحف في العالم.', image_urls: ['https://images.unsplash.com/photo-1582374558066-6b15a15b3996?q=80&w=800', 'https://images.unsplash.com/photo-16142DE219468594229353651147?q=80&w=800'], price: 300, available_spots: 40 }, ];
const placeholderPosts: Post[] = [ { id: 1, title: 'فتح باب الحجز لمجموعات التقوية', content: 'تم فتح باب الحجز لمجموعات التقوية الجديدة للصفوف الأول والثاني والثالث الثانوي. سارع بالحجز فالأماكن محدودة.', created_at: new Date().toISOString(), image_url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=800' }, { id: 2, title: 'جدول الامتحانات التجريبية', content: 'يرجى العلم بأن الامتحانات التجريبية ستبدأ الأسبوع القادم. يمكنكم الاطلاع على الجدول من قسم "الكتب والمذكرات".', created_at: new Date(Date.now() - 86400000 * 2).toISOString() }, ];
const placeholderTeachers: Teacher[] = [ { id: 1, name: 'أ. أحمد المصري', subject: 'الفيزياء', image_url: 'https://randomuser.me/api/portraits/men/32.jpg', phone: '01010101010' }, { id: 2, name: 'أ. سارة عبدالحميد', subject: 'الكيمياء', image_url: 'https://randomuser.me/api/portraits/women/44.jpg' }, { id: 3, name: 'أ. مارك جونسون', subject: 'اللغة الإنجليزية', image_url: 'https://randomuser.me/api/portraits/men/34.jpg', phone: '01212121212' }, { id: 4, name: 'أ. هند إبراهيم', subject: 'الرياضيات', image_url: 'https://randomuser.me/api/portraits/women/45.jpg' }, { id: 5, name: 'أ. خالد السيد', subject: 'الأحياء', image_url: 'https://randomuser.me/api/portraits/men/36.jpg' }, { id: 6, name: 'أ. شيماء قاسم', subject: 'اللغة العربية والفلسفة', image_url: 'https://randomuser.me/api/portraits/women/46.jpg' }, { id: 7, name: 'أ. محمد فتحي', subject: 'التاريخ والجغرافيا', image_url: 'https://randomuser.me/api/portraits/men/37.jpg', phone: '01515151515' }, ];
const placeholderGallery: GalleryImage[] = [ { id: 1, image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800', description: 'يوم التكريم للطلاب المتفوقين' }, { id: 2, image_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800', description: 'أثناء أحد الأنشطة العملية' }, { id: 3, image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800', description: 'مجموعة من الطلاب في محاضرة' }, { id: 4, image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800', description: 'مناقشة علمية بين الطلاب والمدرس' }, { id: 5, image_url: 'https://images.unsplash.com/photo-1571260899204-42aed4c202e0?q=80&w=800', description: 'صورة جماعية في نهاية العام الدراسي' }, { id: 6, image_url: 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?q=80&w=800', description: 'مكتبة المركز' }, ];
const placeholderBookings: Booking[] = [ {id: 1, student_id: 'GC-DEMO-24015', student_name: 'عبدالرحمن محمد', type: 'class', item_id: 1, item_name: 'الفيزياء الحديثة', item_date: todayISO, item_time: '14:00', item_location: 'قاعة 1'}, {id: 2, student_id: 'GC-DEMO-24015', student_name: 'عبدالرحمن محمد', type: 'class', item_id: 5, item_name: 'الأحياء (وراثة)', item_date: getFutureDateISO(1), item_time: '17:00', item_location: 'المعمل'}, {id: 3, student_id: 'GC-DEMO-24016', student_name: 'فاطمة الزهراء', type: 'class', item_id: 2, item_name: 'الكيمياء العضوية', item_date: todayISO, item_time: '16:00', item_location: 'قاعة 2'}, {id: 4, student_id: 'GC-DEMO-24016', student_name: 'فاطمة الزهراء', type: 'trip', item_id: 1, item_name: 'رحلة إلى مكتبة الإسكندرية', item_date: getFutureDateISO(7), item_time: '08:00', item_location: 'الإسكندرية'}, {id: 5, student_id: 'GC-DEMO-24017', student_name: 'علي حسن', type: 'class', item_id: 4, item_name: 'الرياضيات (جبر)', item_date: getFutureDateISO(1), item_time: '15:00', item_location: 'قاعة 3'}, {id: 6, student_id: 'GC-DEMO-24015', student_name: 'عبدالرحمن محمد', type: 'trip', item_id: 2, item_name: 'زيارة المتحف المصري الكبير', item_date: getFutureDateISO(14), item_time: '09:00', item_location: 'الجيزة'}, {id: 7, student_id: 'GC-DEMO-24018', student_name: 'مريم أحمد', type: 'class', item_id: 1, item_name: 'الفيزياء الحديثة', item_date: todayISO, item_time: '14:00', item_location: 'قاعة 1'}, {id: 8, student_id: 'GC-DEMO-24018', student_name: 'مريم أحمد', type: 'class', item_id: 9, item_name: 'الفلسفة والمنطق', item_date: getFutureDateISO(4), item_time: '16:00', item_location: 'قاعة 4'}, ];
const placeholderNotifications: Notification[] = [
    { id: 1, text: 'تم تأكيد حجزك في حصة الفيزياء الحديثة.', time: 'منذ 5 دقائق', read: false, icon: '✅' },
    { id: 2, text: 'لا تنسَ امتحان الكيمياء التجريبي غداً الساعة 3 عصراً.', time: 'منذ ساعة', read: false, icon: '🧪' },
    { id: 3, text: 'تم إضافة مذكرة جديدة في مادة الأحياء.', time: 'منذ 3 ساعات', read: true, icon: '📚' },
    { id: 4, text: 'رسالة من أ. أحمد المصري: "الرجاء مراجعة الفصل الثالث جيداً."', time: 'أمس', read: true, icon: '💬' },
];

// --- REACT COMPONENTS ---

// --- Toast Notification Component ---
interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
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

    useEffect(() => {
        const ticker = tickerRef.current;
        if (!ticker || ticker.children.length <= 1) return;

        const clone = ticker.cloneNode(true);
        (clone as HTMLElement).setAttribute('aria-hidden', 'true');
        ticker.parentElement?.appendChild(clone);
    }, [classes]);

    if (classes.length === 0) {
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
                <div ref={tickerRef} className="ticker-content-vertical">
                    {classes.map(c => (
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
        const upcoming = classes.filter(c => new Date(c.date) >= new Date(todayISO));
        const groupedByDay = upcoming.reduce((acc, curr) => {
            if (curr.date === todayISO) return acc; 
            const day = curr.date;
            if (!acc[day]) acc[day] = [];
            acc[day].push(curr);
            return acc;
        }, {} as Record<string, ClassInfo[]>);

        return Object.entries(groupedByDay).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
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
}
const ClassPopup: React.FC<ClassPopupProps> = ({ isOpen, classInfo, onClose }) => {
    if (!isOpen || !classInfo) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container class-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>تفاصيل الحصة</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <h2>{classInfo.name}</h2>
                    <p><strong>المدرس:</strong> {classInfo.teacher}</p>
                    <p><strong>الصف:</strong> {classInfo.grade}</p>
                    <p><strong>الموعد:</strong> {formatDate(classInfo.date)} الساعة {formatTime(classInfo.time)}</p>
                    <p><strong>المكان:</strong> {classInfo.location}</p>
                </div>
            </div>
        </div>
    );
};

// --- Initial Avatar Component ---
interface InitialAvatarProps { name: string; className?: string; }
const InitialAvatar: React.FC<InitialAvatarProps> = ({ name, className = '' }) => {
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
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, notifications, setNotifications }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkOneAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

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
        <button onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
          تحديد الكل كمقروء
        </button>
      </div>
      <div className="notifications-list">
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div key={n.id} className={`notification-item ${n.read ? 'read' : ''}`} onClick={() => handleMarkOneAsRead(n.id)}>
              <div className="notification-icon">{n.icon}</div>
              <div className="notification-content">
                <p>{n.text}</p>
                <small>{n.time}</small>
              </div>
            </div>
          ))
        ) : (
          <div className="no-notifications">
            <p>لا توجد إشعارات حالياً</p>
          </div>
        )}
      </div>
      <div className="notifications-footer">
        <a href="#" onClick={(e) => { e.preventDefault(); alert('صفحة جميع الإشعارات قيد التطوير.'); }}>
          عرض جميع الإشعارات
        </a>
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
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);


    // UI states
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isNotificationsOpen, setNotificationsOpen] = useState(false);
    const [classPopup, setClassPopup] = useState<{ isOpen: boolean; classInfo: ClassInfo | null }>({ isOpen: false, classInfo: null });
    const [adminSection, setAdminSection] = useState<AdminSection>('teachers');
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
    useEffect(() => {
        // Load theme from storage
        const savedTheme = localStorage.getItem('gc-theme') as Theme | null;
        if (savedTheme) setTheme(savedTheme);

        // Load placeholder data
        setClasses(placeholderClasses);
        setTrips(placeholderTrips);
        setTeachers(placeholderTeachers);
        setPosts(placeholderPosts);
        setGallery(placeholderGallery);
        setBookings(placeholderBookings);
        setStudents(placeholderStudents);
        setNotifications(placeholderNotifications);
        
        // Check for user session
        let loadingTime = 1500;
        const savedUserJSON = localStorage.getItem('gc-user');
        if (savedUserJSON) {
            try {
                const user_from_storage = JSON.parse(savedUserJSON);
                setUser(user_from_storage);
                setPage('dashboard');
                loadingTime = 500; // Shorter loading time if session is found
            } catch (error) {
                console.error("Failed to parse user from storage", error);
                localStorage.removeItem('gc-user');
            }
        }
        
        const timer = setTimeout(() => setIsLoading(false), loadingTime);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('gc-theme', theme);
    }, [theme]);

    // Routing effect
    useEffect(() => {
        const privatePages: Page[] = ['dashboard', 'profile', 'admin', 'stats', 'teachers', 'gallery', 'trips', 'schedule', 'books', 'exams'];
        // If not logged in and trying to access a private page, redirect to auth
        if (!user && privatePages.includes(page)) {
            setPage('auth');
        }
        // If logged in and on auth page, redirect to dashboard
        if (user && page === 'auth') {
            setPage('dashboard');
        }
    }, [page, user]);


    // --- EVENT HANDLERS & HELPERS ---
    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type, id: Date.now() });
    };

    const handleLogin = (loggedInUser: User) => {
        setUser(loggedInUser);
        setPage('dashboard');
        localStorage.setItem('gc-user', JSON.stringify(loggedInUser));
    };

    const handleLogout = () => {
        localStorage.removeItem('gc-user');
        setUser(null);
        setPage('auth');
        setSidebarOpen(false);
        setNotificationsOpen(false);
        closeConfirmationModal();
    };
    
    const handleUpdateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('gc-user', JSON.stringify(updatedUser)); // Update session storage as well
        showToast('تم تحديث بياناتك بنجاح!', 'success');
        // In a real app, this would be where you call Supabase to update the database
    };

    const navigate = (targetPage: Page) => {
        setPage(targetPage);
        setSidebarOpen(false);
        setNotificationsOpen(false);
    };

    const handleClassClick = (classInfo: ClassInfo) => {
        setClassPopup({ isOpen: true, classInfo });
    };
    
    // --- CONFIRMATION MODAL HANDLERS ---
    const closeConfirmationModal = () => {
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    };

    const openSaveConfirmation = (updatedUser: User) => {
        setConfirmationModal({
            isOpen: true,
            title: 'تأكيد حفظ التغييرات',
            message: 'هل أنت متأكد أنك تريد حفظ المعلومات الجديدة؟',
            onConfirm: () => {
                handleUpdateUser(updatedUser);
                closeConfirmationModal();
            },
            confirmText: 'حفظ',
            confirmButtonClass: 'btn-primary'
        });
    };
    
    const openDeleteConfirmation = (item: AdminEditableItem, section: AdminSection) => {
        let itemName = '';
        if ('name' in item) itemName = item.name;
        if ('title' in item) itemName = item.title;
        if (section === 'gallery') itemName = `صورة (${item.id})`;

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
        setConfirmationModal({
            isOpen: true,
            title: 'تأكيد تسجيل الخروج',
            message: 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
            onConfirm: handleLogout,
            confirmText: 'تسجيل الخروج',
            confirmButtonClass: 'btn-danger'
        });
    };

    // --- ADMIN CRUD HANDLERS ---
    const handleOpenAdminModal = (mode: AdminModalMode, section: AdminSection, item: AdminEditableItem | null = null) => {
        setAdminModalState({ isOpen: true, mode, section, item });
    };

    const handleCloseAdminModal = () => {
        setAdminModalState({ isOpen: false, mode: 'add', section: null, item: null });
    };

    const handleSaveAdminItem = (item: AdminEditableItem, section: AdminSection) => {
        const mode = adminModalState.mode;
        const itemType = section.slice(0, -1); // 'teachers' -> 'teacher'

        if (mode === 'add') {
            const newItem = { ...item, id: Date.now() }; // Use timestamp for unique ID in demo
            switch(section) {
                case 'teachers': setTeachers(prev => [newItem as Teacher, ...prev]); break;
                case 'trips': setTrips(prev => [newItem as TripInfo, ...prev]); break;
                case 'gallery': setGallery(prev => [newItem as GalleryImage, ...prev]); break;
                // Add other cases here
            }
             showToast(`تمت إضافة ${itemType} جديد بنجاح!`, 'success');
        } else { // 'edit'
            switch(section) {
                case 'teachers': setTeachers(prev => prev.map(t => t.id === item.id ? item as Teacher : t)); break;
                case 'trips': setTrips(prev => prev.map(t => t.id === item.id ? item as TripInfo : t)); break;
                case 'gallery': setGallery(prev => prev.map(g => g.id === item.id ? item as GalleryImage : g)); break;
                // Add other cases here
            }
             showToast(`تم تحديث بيانات الـ ${itemType} بنجاح!`, 'success');
        }
        handleCloseAdminModal();
    };

    const handleDeleteItem = (item: AdminEditableItem, section: AdminSection) => {
        switch(section) {
            case 'teachers': setTeachers(prev => prev.filter(t => t.id !== item.id)); break;
            case 'trips': setTrips(prev => prev.filter(t => t.id !== item.id)); break;
            case 'gallery': setGallery(prev => prev.filter(g => g.id !== item.id)); break;
            // Add other cases
        }
        showToast('تم الحذف بنجاح.', 'success');
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

Example encouragements to add at the end of responses:
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
    if (isLoading) {
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
                                    setNotifications={setNotifications}
                                />
                            </div>
                        </header>
                        <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
                        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                            <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
                                &times;
                            </button>
                            <div className="sidebar-profile-card" onClick={() => navigate('profile')}>
                                <InitialAvatar name={user?.full_name || ''} className="profile-card-avatar-large" />
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
        const todayClasses = useMemo(() => classes.filter(c => c.date === todayISO).sort((a,b) => a.time.localeCompare(b.time)), [classes]);
        return (
            <div className="dashboard-page">
                <div className="page-container">
                    <DailyClassTicker classes={todayClasses} onClassClick={handleClassClick} />
                    <Announcements posts={posts} />
                    <WeeklyScheduleGrid classes={classes} onClassClick={handleClassClick} />
                    <GalleryPreview images={gallery} />
                </div>
            </div>
        );
    };

    const AdminPage = () => {
        const renderAdminContent = () => {
            switch(adminSection) {
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
                                    <img src={trip.image_urls[0]} alt={trip.name} className="admin-item-image"/>
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
                        {(['teachers', 'trips', 'gallery', 'classes', 'posts', 'students', 'bookings'] as AdminSection[]).map(s => {
                             if(s === 'bookings' && user?.role !== 'supervisor' && user?.role !== 'admin') return null;
                             const labels: Record<AdminSection, string> = {
                                 teachers: 'ادارة المدرسين', trips: 'ادارة الرحلات', gallery: 'ادارة الصور',
                                 classes: 'ادارة الحصص', posts: 'ادارة المنشورات', students: 'بحث عن طالب',
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
            const studentMap = new Map<string, {name: string, classCount: number, tripCount: number, lastBooking: string}>();
            bookings.forEach(booking => {
                if(!studentMap.has(booking.student_id)){
                    studentMap.set(booking.student_id, { name: booking.student_name, classCount: 0, tripCount: 0, lastBooking: booking.item_date });
                }
                const studentData = studentMap.get(booking.student_id)!;
                if(booking.type === 'class') studentData.classCount++; else studentData.tripCount++;
                if(new Date(booking.item_date) > new Date(studentData.lastBooking)) studentData.lastBooking = booking.item_date;
            });
            return Array.from(studentMap.entries()).map(([id, data]) => ({id, ...data}));
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
                                <tr><th>ID الطالب</th><th>اسم الطالب</th><th>حصص محجوزة</th><th>رحلات محجوزة</th><th>آخر حجز</th></tr>
                            </thead>
                            <tbody>
                                {studentBookingStats.map(s => (
                                    <tr key={s.id}><td>{s.id}</td><td>{s.name}</td><td>{s.classCount}</td><td>{s.tripCount}</td><td>{formatDate(s.lastBooking)}</td></tr>
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
            phone: '', guardian_phone: '', school: '', grade: 'الصف الأول الإعدادي',
        });
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
      
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
          setForm({ ...form, [e.target.name]: e.target.value });
        };

        const handleSwitchAuthPage = (page: AuthPage) => {
            setAuthPage(page);
            setError('');
            setForm({ // Reset form on switch
                email: '', password: '', confirmPassword: '', full_name: '',
                phone: '', guardian_phone: '', school: '', grade: 'الصف الأول الإعدادي',
            });
        };
      
        const handleLoginSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            setLoading(true);
            setError('');
            setTimeout(() => {
                if (form.email.toLowerCase() === 'admin@google.com' || form.email.toLowerCase() === 'admin') {
                    handleLogin(placeholderAdmin);
                } else if (form.email.toLowerCase() === 'supervisor@google.com') {
                    handleLogin(placeholderSupervisor);
                } else if (form.email || form.password) {
                    handleLogin(placeholderStudent);
                } else {
                    setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
                    setLoading(false);
                }
            }, 1000);
        };

        const handleRegisterSubmit = (e: React.FormEvent) => {
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
            setTimeout(() => {
                console.log("Simulating user registration:", form);
                setLoading(false);
                showToast('تم تسجيل حسابك! لقد أرسلنا رابط تحقق إلى بريدك الإلكتروني.', 'success');
                handleSwitchAuthPage('login');
            }, 1500);
        };
    
        const handleForgotSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!form.email) {
                setError('الرجاء إدخال البريد الإلكتروني.');
                return;
            }
            setLoading(true);
            setError('');
            setTimeout(() => {
                setLoading(false);
                showToast(`تم إرسال رابط استعادة كلمة المرور إلى ${form.email}.`, 'info');
                handleSwitchAuthPage('login');
            }, 1500);
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
                                   <input type="text" name="email" placeholder="البريد الإلكتروني أو كود الطالب" required onChange={handleInputChange} value={form.email} />
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
                            
                            <div className="demo-buttons">
                                <button className="demo-btn" onClick={() => handleLogin(placeholderStudent)}>الدخول كطالب تجريبي</button>
                                <button className="demo-btn" onClick={() => handleLogin(placeholderAdmin)}>الدخول كمدير</button>
                            </div>
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
                        {renderContent()}
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
        const [profileForm, setProfileForm] = useState(user);

        if (!profileForm) return null;

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setProfileForm(prev => prev ? { ...prev, [name]: value } : null);
        };

        const handleSaveChanges = () => {
            if (user) {
                openSaveConfirmation(profileForm);
                setIsEditing(false);
            }
        };

        const handleCancel = () => {
            setProfileForm(user);
            setIsEditing(false);
        };
        
        const openProfileDeleteConfirmation = () => {
            setConfirmationModal({
                isOpen: true,
                title: 'تأكيد حذف الحساب',
                message: (
                    <>
                        <p style={{ fontWeight: 'bold', color: 'var(--error-color)' }}>
                            تحذير! هذا الإجراء لا يمكن التراجع عنه.
                        </p>
                        <p>سيتم حذف جميع بياناتك نهائياً. هل أنت متأكد؟</p>
                    </>
                ),
                onConfirm: () => {
                    handleLogout(); // Simulate deletion by logging out
                    alert('تم حذف الحساب بنجاح.');
                },
                confirmText: 'نعم، قم بالحذف',
                confirmButtonClass: 'btn-danger'
            });
        };

        return (
            <div className="page-container">
                <div className="content-card profile-page-card">
                    <div className="profile-header-section">
                        <InitialAvatar name={profileForm.full_name} className="profile-page-avatar" />
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
                                <input type="email" id="email" name="email" value={profileForm.email} onChange={handleInputChange} disabled={!isEditing} />
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

    const TeachersPage = () => (
        <div className="page-container">
            <div className="content-card">
                <h2 className="content-section-title">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span>المدرسون</span>
                </h2>
                <div style={{textAlign: 'center', padding: '2rem'}}>هذه الصفحة قيد التطوير.</div>
            </div>
        </div>
    );
    
    const GalleryPage = () => (
        <div className="page-container">
            <div className="content-card">
                 <h2 className="content-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <span>الصور</span>
                </h2>
                 <div style={{textAlign: 'center', padding: '2rem'}}>هذه الصفحة قيد التطوير.</div>
            </div>
        </div>
    );
    
    const TripsPage = () => (
        <div className="page-container">
            <div className="content-card">
                 <h2 className="content-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 19.88a2.89 2.89 0 0 0 4.1 0l1.42-1.42a2.89 2.89 0 0 0 0-4.1l-6.5-6.5a2.89 2.89 0 0 0-4.1 0l-1.42 1.42a2.89 2.89 0 0 0 0 4.1l6.5 6.5Z" /><path d="m11 12.5 2 2" /><path d="m15.5 7.5-2-2" /><path d="m19 12-7-7" /><path d="m5 12 7 7" /></svg>
                    <span>الرحلات</span>
                </h2>
                 <div style={{textAlign: 'center', padding: '2rem'}}>هذه الصفحة قيد التطوير.</div>
            </div>
        </div>
    );
    
    const SchedulePage = () => (
        <div className="page-container">
            <div className="content-card">
                 <h2 className="content-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>جدول الحصص</span>
                </h2>
                 <div style={{textAlign: 'center', padding: '2rem'}}>هذه الصفحة قيد التطوير.</div>
            </div>
        </div>
    );

    const BooksPage = () => (
        <div className="page-container">
            <div className="content-card">
                 <h2 className="content-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                    <span>الكتب والمذكرات</span>
                </h2>
                 <div style={{textAlign: 'center', padding: '2rem'}}>هذه الصفحة قيد التطوير.</div>
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
            if (!ai) {
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
                case 'teachers': return <TeachersPage />;
                case 'gallery': return <GalleryPage />;
                case 'trips': return <TripsPage />;
                case 'schedule': return <SchedulePage />;
                case 'books': return <BooksPage />;
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
            <ClassPopup isOpen={classPopup.isOpen} classInfo={classPopup.classInfo} onClose={() => setClassPopup({ isOpen: false, classInfo: null })} />
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

    useEffect(() => {
        if (state.isOpen) {
            if (state.mode === 'edit' && state.item) {
                setFormData(state.item);
            } else {
                // Set default form structure for 'add' mode
                switch(state.section) {
                    case 'teachers': setFormData({ name: '', subject: '', image_url: '', phone: '' }); break;
                    case 'trips': setFormData({ name: '', place: '', date: '', time: '', price: 0, available_spots: 0, description: '', image_urls: Array(5).fill('') }); break;
                    case 'gallery': setFormData({ image_url: '', description: '' }); break;
                    default: setFormData({});
                }
            }
        }
    }, [state]);

    if (!state.isOpen || !state.section) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'number') {
             setFormData({ ...formData, [name]: parseFloat(value) || 0 });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };
    
    const handleImageUrlsChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const newUrls = [...formData.image_urls];
        newUrls[index] = e.target.value;
        setFormData({...formData, image_urls: newUrls});
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation could be added here
        if (state.section === 'trips') {
            onSave({ ...formData, image_urls: formData.image_urls.filter((url:string) => url.trim() !== '') }, state.section);
        } else {
            onSave(formData, state.section);
        }
    };
    
    const titles: Record<AdminSection, string> = {
         teachers: 'المدرس', trips: 'الرحلة', gallery: 'الصورة',
         classes: 'الحصة', posts: 'المنشور', students: 'الطالب', bookings: 'الحجز'
    };
    const title = `${state.mode === 'add' ? 'إضافة' : 'تعديل'} ${titles[state.section] || ''}`;

    const renderForm = () => {
        switch(state.section) {
            case 'teachers':
                return <>
                    <div className="form-group"><label>اسم المدرس</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>المادة</label><input type="text" name="subject" value={formData.subject || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>رابط الصورة</label><input type="url" name="image_url" value={formData.image_url || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>رقم الهاتف (اختياري)</label><input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} /></div>
                </>
            case 'trips':
                return <>
                    <div className="form-group"><label>اسم الرحلة</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} required /></div>
                    <div className="form-grid"><div className="form-group"><label>المكان</label><input type="text" name="place" value={formData.place || ''} onChange={handleChange} required /></div><div className="form-group"><label>السعر (ج.م)</label><input type="number" name="price" value={formData.price || 0} onChange={handleChange} required /></div></div>
                    <div className="form-grid"><div className="form-group"><label>التاريخ</label><input type="date" name="date" value={formData.date || ''} onChange={handleChange} required /></div><div className="form-group"><label>الوقت</label><input type="time" name="time" value={formData.time || ''} onChange={handleChange} required /></div></div>
                    <div className="form-group"><label>الأماكن المتاحة</label><input type="number" name="available_spots" value={formData.available_spots || 0} onChange={handleChange} required /></div>
                    <div className="form-group"><label>الوصف</label><textarea name="description" value={formData.description || ''} onChange={handleChange} rows={4} required /></div>
                    <div className="form-group"><label>روابط الصور (5 كحد أقصى)</label>
                        { (formData.image_urls || []).map((url:string, i:number) => <input key={i} type="url" placeholder={`رابط الصورة ${i+1}${i===0 ? ' (رئيسية)' : ''}`} value={url} onChange={e => handleImageUrlsChange(e, i)} />) }
                    </div>
                </>
            case 'gallery':
                return <>
                    <div className="form-group"><label>رابط الصورة</label><input type="url" name="image_url" value={formData.image_url || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>وصف بسيط (سطر واحد)</label><input type="text" name="description" value={formData.description || ''} onChange={handleChange} required /></div>
                </>
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
