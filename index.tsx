import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- DATABASE TYPES (from Supabase schema) ---
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string;
          id: number;
          item_id: number;
          student_id: string;
          type: "class" | "trip";
        };
        Insert: {
          created_at?: string;
          id?: number;
          item_id: number;
          student_id: string;
          type: "class" | "trip";
        };
        Update: {
          created_at?: string;
          id?: number;
          item_id?: number;
          student_id?: string;
          type?: "class" | "trip";
        };
        Relationships: [
          {
            foreignKeyName: "bookings_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      books: {
        Row: {
          created_at: string;
          description: string;
          download_url: string;
          id: number;
          image_url: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          download_url: string;
          id?: number;
          image_url: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          download_url?: string;
          id?: number;
          image_url?: string;
          title?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          created_at: string | null;
          date: string;
          description: string;
          grade: string;
          id: number;
          image_url: string | null;
          is_bookable: boolean;
          is_review: boolean;
          location: string;
          name: string;
          teacher: string;
          time: string;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          description: string;
          grade: string;
          id?: number;
          image_url?: string | null;
          is_bookable?: boolean;
          is_review?: boolean;
          location: string;
          name: string;
          teacher: string;
          time: string;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          description?: string;
          grade?: string;
          id?: number;
          image_url?: string | null;
          is_bookable?: boolean;
          is_review?: boolean;
          location?: string;
          name?: string;
          teacher?: string;
          time?: string;
        };
        Relationships: [];
      };
      exam_results: {
        Row: {
            created_at: string;
            duration: number;
            feedback: Json | null;
            id: number;
            score: string;
            specialization: string | null;
            student_id: string;
        };
        Insert: {
            created_at?: string;
            duration: number;
            feedback?: Json | null;
            id?: number;
            score: string;
            specialization?: string | null;
            student_id: string;
        };
        Update: {
            created_at?: string;
            duration?: number;
            feedback?: Json | null;
            id?: number;
            score?: string;
            specialization?: string | null;
            student_id?: string;
        };
        Relationships: [
            {
            foreignKeyName: "exam_results_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            }
        ];
      };
      gallery: {
        Row: {
          created_at: string | null;
          description: string;
          id: number;
          image_url: string;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          id?: number;
          image_url: string;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          id?: number;
          image_url?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string;
          icon: string;
          id: number;
          read: boolean;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          icon: string;
          id?: number;
          read?: boolean;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          icon?: string;
          id?: number;
          read?: boolean;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      posts: {
        Row: {
          content: string;
          created_at: string;
          id: number;
          image_url: string | null;
          title: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: number;
          image_url?: string | null;
          title: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: number;
          image_url?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          full_name: string;
          grade: string;
          guardian_phone: string;
          id: string;
          phone: string;
          role: string | null;
          school: string;
          student_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          full_name: string;
          grade: string;
          guardian_phone: string;
          id: string;
          phone: string;
          role?: string | null;
          school: string;
          student_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          full_name?: string;
          grade?: string;
          guardian_phone?: string;
          id?: string;
          phone?: string;
          role?: string | null;
          school?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      teachers: {
        Row: {
          created_at: string | null;
          id: number;
          image_url: string;
          name: string;
          phone: string | null;
          subject: string;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          image_url: string;
          name: string;
          phone?: string | null;
          subject: string;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          image_url?: string;
          name?: string;
          phone?: string | null;
          subject?: string;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          available_spots: number;
          created_at: string | null;
          date: string;
          description: string;
          id: number;
          image_urls: string[];
          name: string;
          place: string;
          price: number;
          time: string;
        };
        Insert: {
          available_spots: number;
          created_at?: string | null;
          date: string;
          description: string;
          id?: number;
          image_urls: string[];
          name: string;
          place: string;
          price: number;
          time: string;
        };
        Update: {
          available_spots?: number;
          created_at?: string | null;
          date?: string;
          description?: string;
          id?: number;
          image_urls?: string[];
          name?: string;
          place?: string;
          price?: number;
          time?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      bookings_details: {
        Row: {
          item_date: string | null;
          item_id: number | null;
          item_location: string | null;
          item_name: string | null;
          item_time: string | null;
          student_id: string | null;
          type: "class" | "trip" | null;
          classes: Json | null;
          id: number | null;
          profiles: Json | null;
          trips: Json | null;
        };
        Insert: {
          item_date?: string | null;
          item_id?: number | null;
          item_location?: string | null;
          item_name?: string | null;
          item_time?: string | null;
          student_id?: string | null;
          type?: "class" | "trip" | null;
          classes?: Json | null;
          id?: number | null;
          profiles?: Json | null;
          trips?: Json | null;
        };
        Update: {
          item_date?: string | null;
          item_id?: number | null;
          item_location?: string | null;
          item_name?: string | null;
          item_time?: string | null;
          student_id?: string | null;
          type?: "class" | "trip" | null;
          classes?: Json | null;
          id?: number | null;
          profiles?: Json | null;
          trips?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: {
      delete_user: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}


// --- SUPABASE CLIENT SETUP ---
const SUPABASE_URL = 'https://ophlmmpisgizpvgxndkh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9waGxtbXBpc2dpenB2Z3huZGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTcxMDIsImV4cCI6MjA2NzczMzEwMn0.c489RBMwNt_k5cHLVOJX44Ocn7hMgCA_bZkCFJVLxrM';
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- GEMINI API SETUP ---
const API_KEY = process.env.API_KEY;
let ai: GoogleGenAI | undefined;
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
const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

// --- TYPES AND INTERFACES ---
type Page = 'auth' | 'dashboard' | 'profile' | 'gallery' | 'teachers' | 'about' | 'trips' | 'legal' | 'admin' | 'stats' | 'schedule' | 'books' | 'exams' | 'instructions';
type AuthMode = 'login' | 'register' | 'forgot_password';
type ToastType = 'success' | 'error' | 'info';
type Theme = 'light' | 'dark' | 'pink';
type AdminTab = 'classes' | 'teachers' | 'posts' | 'students' | 'trips' | 'gallery' | 'bookings' | 'books';
type AdminCrudSection = 'classes' | 'teachers' | 'posts' | 'trips' | 'gallery' | 'books';
type AdminModalMode = 'add' | 'edit';
type Specialization = 'علمي علوم' | 'علمي رياضة' | 'أدبي';

type UserProfile = Database['public']['Tables']['profiles']['Row'];
interface User extends UserProfile {
    email: string;
}

type ClassInfo = Database['public']['Tables']['classes']['Row'];
type TripInfo = Database['public']['Tables']['trips']['Row'];
type Post = Database['public']['Tables']['posts']['Row'];
type Teacher = Database['public']['Tables']['teachers']['Row'];
type GalleryImage = Database['public']['Tables']['gallery']['Row'];
type BookInfo = Database['public']['Tables']['books']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];

interface Booking {
    id: number;
    student_id: string;
    type: 'class' | 'trip';
    item_id: number;
    item_name: string | null;
    item_date: string | null;
    item_time: string | null;
    item_location?: string | null;
    profiles: { full_name: string; student_id: string } | null;
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
    explanation: string;
}
interface ExamResults {
    score: string;
    duration: number;
    feedback: {
        question_text: string;
        your_answer: string;
        correct_answer: string;
        explanation: string;
    }[];
}


type AdminEditableItem = Teacher | TripInfo | GalleryImage | ClassInfo | Post | BookInfo;
interface AdminModalState {
    isOpen: boolean;
    mode: AdminModalMode;
    section: AdminCrudSection | null;
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
                    <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect x="8" y="12" width="8" height="8" rx="2"/><path d="M4 12a8 8 0 1 1 16 0Z"/></svg>
                        <span>المساعد الذكي</span>
                    </h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="chat-body" ref={messagesEndRef}>
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
                </div>
                <div className="chat-footer">
                    <form onSubmit={handleSend} className="chat-input-form">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="اسأل أي شيء..."
                            disabled={isThinking}
                        />
                        <button type="submit" disabled={isThinking || !input.trim()}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};


// --- Auth Page Component ---
const AuthPage: React.FC = () => {
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [grade, setGrade] = useState('');
    const [school, setSchool] = useState('');
    const [phone, setPhone] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authError, setAuthError] = useState('');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const showToast = (message: string, type: ToastType) => setToast({ message, type });

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setAuthError('');

        try {
            if (authMode === 'register') {
                if (!fullName || !studentId || !grade || !school || !phone || !guardianPhone) {
                    throw new Error('يرجى ملء جميع الحقول المطلوبة للتسجيل.');
                }
                const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName, student_id: studentId, phone: phone, school: school, grade: grade, guardian_phone: guardianPhone } }
                });
                if (signUpError) throw signUpError;
                if (!newUser) throw new Error("لم يتم إنشاء المستخدم، يرجى المحاولة مرة أخرى.");
                
                const newProfile: Database['public']['Tables']['profiles']['Insert'] = {
                    id: newUser.id,
                    full_name: fullName,
                    student_id: studentId,
                    grade,
                    school,
                    phone,
                    guardian_phone: guardianPhone,
                    role: 'student'
                };

                const { error: profileError } = await supabase.from('profiles').insert([newProfile]);
                if (profileError) {
                    console.error("Profile creation failed:", profileError);
                    // Attempt to delete the created auth user if profile creation fails
                    await supabase.rpc('delete_user');
                    throw new Error("فشل إنشاء ملف التعريف. تم إنشاء حسابك ولكن يرجى الاتصال بالدعم لإكمال التسجيل.");
                }

                showToast('تم التسجيل بنجاح! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.', 'success');
                setAuthMode('login');

            } else if (authMode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // successful login is handled by onAuthStateChange
                
            } else if (authMode === 'forgot_password') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                if (error) throw error;
                showToast('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.', 'success');
            }
        } catch (error) {
            setAuthError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDemoLogin = async (role: 'student' | 'admin') => {
        setIsSubmitting(true);
        setAuthError('');
        try {
            const credentials = {
                student: { email: 'student@demo.com', password: 'password' },
                admin: { email: 'admin@demo.com', password: 'password' }
            };
            const { error } = await supabase.auth.signInWithPassword(credentials[role]);
            if (error) throw error;
        } catch(error) {
            setAuthError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    const renderFormFields = () => {
        if (authMode === 'register') {
            return (
                <>
                    <div className="input-group">
                        <input type="text" placeholder="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} required />
                        <span className="input-icon">👤</span>
                    </div>
                    <div className="input-group">
                        <input type="text" placeholder="الكود" value={studentId} onChange={e => setStudentId(e.target.value)} required />
                         <span className="input-icon">🆔</span>
                    </div>
                    <div className="input-group">
                        <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required />
                        <span className="input-icon">@</span>
                    </div>
                    <div className="input-group">
                        <input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required />
                        <span className="input-icon">🔒</span>
                    </div>
                    <div className="input-group has-select">
                        <select value={grade} onChange={e => setGrade(e.target.value)} required>
                            <option value="" disabled>اختر الصف الدراسي</option>
                            <option value="الأول الإعدادي">الأول الإعدادي</option>
                            <option value="الثاني الإعدادي">الثاني الإعدادي</option>
                            <option value="الثالث الإعدادي">الثالث الإعدادي</option>
                            <option value="الأول الثانوي">الأول الثانوي</option>
                            <option value="الثاني الثانوي">الثاني الثانوي</option>
                            <option value="الثالث الثانوي">الثالث الثانوي</option>
                        </select>
                        <span className="input-icon" style={{left: '1.25rem', right: 'auto'}}>🎓</span>
                    </div>
                    <div className="input-group">
                        <input type="text" placeholder="المدرسة" value={school} onChange={e => setSchool(e.target.value)} required />
                        <span className="input-icon">🏫</span>
                    </div>
                    <div className="input-group">
                        <input type="tel" placeholder="رقم هاتف الطالب" value={phone} onChange={e => setPhone(e.target.value)} required />
                         <span className="input-icon">📱</span>
                    </div>
                    <div className="input-group">
                        <input type="tel" placeholder="رقم هاتف ولي الأمر" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} required />
                        <span className="input-icon">📞</span>
                    </div>
                </>
            );
        } else if (authMode === 'login') {
            return (
                <>
                    <div className="input-group">
                        <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required />
                        <span className="input-icon">@</span>
                    </div>
                    <div className="input-group">
                        <input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required />
                        <span className="input-icon">🔒</span>
                    </div>
                </>
            );
        } else { // forgot_password
            return (
                <>
                    <p className="auth-subtext">أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.</p>
                    <div className="input-group">
                        <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required />
                        <span className="input-icon">@</span>
                    </div>
                </>
            );
        }
    };

    const getTitle = () => {
        switch (authMode) {
            case 'login': return 'تسجيل الدخول';
            case 'register': return 'إنشاء حساب جديد';
            case 'forgot_password': return 'نسيت كلمة المرور؟';
        }
    };

    return (
        <div className="auth-container">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="auth-panel auth-art-panel">
                <div className="auth-art-content">
                    <h2>مرحباً بك في Google Center</h2>
                    <p>المنصة التعليمية الرائدة للطلاب الطموحين. ابدأ رحلتك نحو التميز اليوم.</p>
                </div>
            </div>
            <div className="auth-panel auth-form-panel">
                <div className="auth-content">
                    <div className="auth-header">
                        <h1>Google Center</h1>
                    </div>
                    <div className="auth-card">
                        <h2 className="form-title">{getTitle()}</h2>
                        <form onSubmit={handleAuth}>
                            {authError && <div className="auth-error">{authError}</div>}
                            {renderFormFields()}
                            <button type="submit" className="auth-btn" disabled={isSubmitting}>
                                {isSubmitting ? 'جاري التحميل...' : getTitle()}
                            </button>
                        </form>
                        {authMode === 'login' && (
                            <button onClick={() => setAuthMode('forgot_password')} className="auth-link">هل نسيت كلمة المرور؟</button>
                        )}
                        {authMode === 'register' ? (
                            <p className="auth-link-separator">لديك حساب بالفعل؟ <a onClick={() => setAuthMode('login')}>سجل الدخول</a></p>
                        ) : (authMode === 'forgot_password' ?
                            <p className="auth-link-separator">تذكرت كلمة المرور؟ <a onClick={() => setAuthMode('login')}>سجل الدخول</a></p>
                            : <p className="auth-link-separator">ليس لديك حساب؟ <a onClick={() => setAuthMode('register')}>أنشئ حسابًا الآن</a></p>
                        )}
                         <div className="demo-buttons">
                           <button onClick={() => handleDemoLogin('student')} className="demo-btn" disabled={isSubmitting}>دخول تجريبي (طالب)</button>
                           <button onClick={() => handleDemoLogin('admin')} className="demo-btn" disabled={isSubmitting}>دخول تجريبي (مسؤول)</button>
                        </div>
                    </div>
                    <footer className="auth-footer">
                       <a onClick={() => {}}>الشروط</a>
                       <span>&bull;</span>
                       <a onClick={() => {}}>الخصوصية</a>
                    </footer>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APPLICATION COMPONENT ---
const App: React.FC = () => {
    // --- STATE MANAGEMENT ---
    // User & Auth
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(true);

    // Page Navigation
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // UI State
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isHeaderVisible, setIsHeaderVisible] = useState(false);

    // Data
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [trips, setTrips] = useState<TripInfo[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [gallery, setGallery] = useState<GalleryImage[]>([]);
    const [books, setBooks] = useState<BookInfo[]>([]);
    const [userBookings, setUserBookings] = useState<Booking[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    // Popups & Modals
    const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [bookingConfirmation, setBookingConfirmation] = useState<{item: ClassInfo | TripInfo, type: 'class' | 'trip'} | null>(null);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

    // AI Chat
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isThinking, setIsThinking] = useState(false);

    // Admin Panel
    const [adminTab, setAdminTab] = useState<AdminTab>('classes');
    const [adminModal, setAdminModal] = useState<AdminModalState>({ isOpen: false, mode: 'add', section: null, item: null });
    const [formValues, setFormValues] = useState<any>({});
    const [file, setFile] = useState<File | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ section: AdminCrudSection; id: number } | null>(null);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [searchedStudent, setSearchedStudent] = useState<UserProfile | null>(null);
    const [searchedStudentBookings, setSearchedStudentBookings] = useState<Booking[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Exams
    const [examState, setExamState] = useState<'selection' | 'generating' | 'active' | 'results'>('selection');
    const [selectedSpecialization, setSelectedSpecialization] = useState<Specialization | null>(null);
    const [questions, setQuestions] = useState<ExamQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [examResults, setExamResults] = useState<ExamResults | null>(null);
    const [examStartTime, setExamStartTime] = useState<number>(0);
    const [examTimeLimit, setExamTimeLimit] = useState(10); // in minutes
    const [examQuestionCount, setExamQuestionCount] = useState(10);
    const [examRemainingTime, setExamRemainingTime] = useState<number | null>(null); // in seconds
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const notificationsRef = useRef<HTMLDivElement>(null);

    // --- UTILITY & HELPER FUNCTIONS ---
    const showToast = useCallback((message: string, type: ToastType) => {
        setToast({ message, type });
    }, []);

    // --- DATA FETCHING ---
    const fetchUserBookings = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('bookings_details')
            .select('*')
            .eq('student_id', userId);
        if (error) {
            showToast('فشل في تحديث الحجوزات', 'error');
        } else {
            setUserBookings((data as unknown as Booking[]) || []);
        }
    }, [showToast]);
    
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const fetchInitialData = async (userId: string) => {
            setIsLoading(true);
            try {
                const [
                    classesResult,
                    tripsResult,
                    postsResult,
                    teachersResult,
                    galleryResult,
                    booksResult,
                    bookingsResult,
                    notificationsResult,
                ] = await Promise.all([
                    supabase.from('classes').select('*').order('date', { ascending: true }),
                    supabase.from('trips').select('*').order('date', { ascending: true }),
                    supabase.from('posts').select('*').order('created_at', { ascending: false }),
                    supabase.from('teachers').select('*').order('name', { ascending: true }),
                    supabase.from('gallery').select('*').order('created_at', { ascending: false }),
                    supabase.from('books').select('*').order('title', { ascending: true }),
                    supabase.from('bookings_details').select('*').eq('student_id', userId),
                    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false })
                ]);

                if (classesResult.error) throw new Error(`Failed to fetch classes: ${classesResult.error.message}`);
                setClasses(classesResult.data || []);

                if (tripsResult.error) throw new Error(`Failed to fetch trips: ${tripsResult.error.message}`);
                setTrips(tripsResult.data || []);

                if (postsResult.error) throw new Error(`Failed to fetch posts: ${postsResult.error.message}`);
                setPosts(postsResult.data || []);

                if (teachersResult.error) throw new Error(`Failed to fetch teachers: ${teachersResult.error.message}`);
                setTeachers(teachersResult.data || []);

                if (galleryResult.error) throw new Error(`Failed to fetch gallery: ${galleryResult.error.message}`);
                setGallery(galleryResult.data || []);

                if (booksResult.error) throw new Error(`Failed to fetch books: ${booksResult.error.message}`);
                setBooks(booksResult.data || []);

                if (bookingsResult.error) throw new Error(`Failed to fetch bookings: ${bookingsResult.error.message}`);
                setUserBookings((bookingsResult.data as unknown as Booking[]) || []);
                
                if (notificationsResult.error) throw new Error(`Failed to fetch notifications: ${notificationsResult.error.message}`);
                setNotifications(notificationsResult.data || []);

            } catch (error) {
                showToast(getErrorMessage(error), 'error');
            } finally {
                setIsLoading(false);
            }
        };

        if (user?.id) {
            fetchInitialData(user.id);
        }
    }, [user, showToast]);
    
    // --- AUTHENTICATION EFFECT ---
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                if (session?.user) {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError) {
                        showToast('فشل في جلب بيانات المستخدم، قد تحتاج لتسجيل الدخول مرة أخرى.', 'error');
                        console.error("Profile fetch error:", profileError);
                        setUser(null);
                        await supabase.auth.signOut();
                    } else if (profile) {
                        setUser({ ...profile, email: session.user.email || '' });
                    }
                } else {
                    setUser(null);
                }
            } catch (e) {
                console.error("Unexpected error in onAuthStateChange callback:", e);
                showToast('حدث خطأ غير متوقع.', 'error');
            } finally {
                setIsAuthenticating(false);
                setIsLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [showToast]);
    
     // --- HEADER VISIBILITY EFFECT ---
    useEffect(() => {
        // Show header after initial load is complete
        if (!isAuthenticating) {
            const timer = setTimeout(() => setIsHeaderVisible(true), 100);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticating]);

    // --- CLICK OUTSIDE HANDLER ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isNotificationsPanelOpen && notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsPanelOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isNotificationsPanelOpen]);
    
    const handleFinishExam = useCallback(async () => {
        if (!user) return;
        
        // Stop the timer
        if (timerRef.current) clearInterval(timerRef.current);
        setExamState('results');
        setIsSubmitting(true);
        
        const results = calculateExamResults(questions, userAnswers);
        const scoreText = `${results.score}/${questions.length}`;

        try {
            const examResultData: Database['public']['Tables']['exam_results']['Insert'] = {
                student_id: user.id,
                score: scoreText,
                feedback: results.feedback as Json,
                duration: results.duration,
                specialization: selectedSpecialization
            };
            const { error } = await supabase.from('exam_results').insert([examResultData]);
            if(error) throw error;
            setExamResults(results);
        } catch (error) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [user, questions, userAnswers, examStartTime, selectedSpecialization, showToast]);

    // --- EXAM TIMER EFFECT ---
    useEffect(() => {
        if (examState === 'active' && examRemainingTime !== null) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setExamRemainingTime(prevTime => {
                    if (prevTime !== null && prevTime > 1) {
                        return prevTime - 1;
                    } else {
                        if (timerRef.current) clearInterval(timerRef.current);
                        handleFinishExam();
                        return 0;
                    }
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [examState, examRemainingTime, handleFinishExam]);

    // --- EVENT HANDLERS ---
    const handleLogout = async () => {
        setIsSidebarOpen(false);
        setCurrentPage('dashboard');
        await supabase.auth.signOut();
    };

    const handleNavigate = (page: Page) => {
        setCurrentPage(page);
        setIsSidebarOpen(false);
        window.scrollTo(0, 0);
    };

    const handleBookClassOrTrip = async (item: ClassInfo | TripInfo, type: 'class' | 'trip') => {
        if (!user) {
            showToast('يجب عليك تسجيل الدخول أولاً.', 'info');
            return;
        }
        setIsSubmitting(true);
        try {
            const { data: existingBooking, error: checkError } = await supabase
                .from('bookings')
                .select('id')
                .eq('student_id', user.id)
                .eq('item_id', item.id)
                .eq('type', type)
                .maybeSingle();

            if (checkError) throw checkError;
            if (existingBooking) {
                showToast('لقد حجزت هذا الموعد بالفعل!', 'info');
                return;
            }
            
            const newBooking: Database['public']['Tables']['bookings']['Insert'] = {
                item_id: item.id,
                student_id: user.id,
                type: type,
            };

            const { error } = await supabase.from('bookings').insert([newBooking]);

            if (error) throw error;
            
            const newNotification: Database['public']['Tables']['notifications']['Insert'] = {
                user_id: user.id,
                text: `تم تأكيد حجزك لـ "${'name' in item ? item.name : ''}".`,
                icon: type === 'class' ? '📅' : '✈️'
            };
            await supabase.from('notifications').insert([newNotification]);
            
            showToast('تم الحجز بنجاح!', 'success');
            fetchUserBookings(user.id);
            setBookingConfirmation(null);
        } catch (error) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        
        const formData = new FormData(e.currentTarget);
        const updates: Database['public']['Tables']['profiles']['Update'] = {
            full_name: formData.get('full_name') as string,
            school: formData.get('school') as string,
            phone: formData.get('phone') as string,
            guardian_phone: formData.get('guardian_phone') as string,
        };
        
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
            if (error) throw error;
            
            setUser(prev => prev ? { ...prev, ...updates } as User : null);
            showToast('تم تحديث الملف الشخصي بنجاح!', 'success');
        } catch(error) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteAccount = async () => {
        if (!user) return;
        setIsDeleteAccountModalOpen(false);
        setIsSubmitting(true);
        try {
            // This needs an RPC function on Supabase to work correctly and securely
            const { error } = await supabase.rpc('delete_user'); 
            if (error) throw new Error('فشل حذف الحساب. يرجى الاتصال بالدعم.');
            
            showToast('تم حذف حسابك بنجاح.', 'success');
            // Sign out is handled by onAuthStateChange after user deletion
        } catch(error) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSendChatMessage = async (message: string) => {
        if (!ai) {
            showToast('خدمة المساعد الذكي غير متاحة حالياً.', 'error');
            return;
        }
        
        const newMessages: ChatMessage[] = [...chatMessages, { sender: 'user', text: message }];
        setChatMessages(newMessages);
        setIsThinking(true);
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: message,
                config: {
                    systemInstruction: `You are a helpful assistant for a student learning center called "Google Center". Your name is مساعد جوجل. You answer in Arabic. You know about the center's schedule, trips, teachers, and announcements. Use the provided information to answer questions accurately.
                    Classes: ${JSON.stringify(classes)}
                    Trips: ${JSON.stringify(trips)}
                    Teachers: ${JSON.stringify(teachers)}
                    Announcements: ${JSON.stringify(posts)}`
                }
            });
            
            setChatMessages(prev => [...prev, { sender: 'ai', text: response.text }]);
        } catch(error) {
            console.error("AI Error:", error);
            setChatMessages(prev => [...prev, { sender: 'ai', text: "عذراً، حدث خطأ ما. حاول مرة أخرى." }]);
        } finally {
            setIsThinking(false);
        }
    };
    
    const markAllNotificationsAsRead = async () => {
        if (!user || notifications.every(n => n.read)) return;
        
        try {
            const { error } = await supabase.from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);
            
            if (error) throw error;
            setNotifications(prev => prev.map(n => ({...n, read: true})));
        } catch(error) {
            showToast('فشل تحديث الإشعارات', 'error');
        }
    };
    
    const unreadNotificationsCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    // Admin Panel Handlers
    const fetchAdminData = useCallback(async (tab: AdminTab) => {
        setIsLoading(true);
        try {
            if (tab === 'bookings') {
                const { data, error } = await supabase.from('bookings_details').select('*');
                if (error) throw error;
                setAllBookings((data as unknown as Booking[]) || []);
            }
             if (tab === 'students') {
                const { data, error } = await supabase.from('profiles').select('*').eq('role', 'student');
                if (error) throw error;
                setAllStudents(data || []);
            }
        } catch (error) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (currentPage === 'admin' && user?.role === 'admin') {
            fetchAdminData(adminTab);
        }
    }, [currentPage, adminTab, fetchAdminData, user?.role]);
    
    const handleAdminTabChange = (tab: AdminTab) => {
        setAdminTab(tab);
    };

    const handleOpenAdminModal = (mode: AdminModalMode, section: AdminCrudSection, item: AdminEditableItem | null = null) => {
        setAdminModal({ isOpen: true, mode, section, item });
        setFormValues(item || {});
        if (item && 'image_url' in item && item.image_url) {
            setImagePreview(item.image_url);
        }
         if (item && 'image_urls' in item && item.image_urls) {
            setImagePreviews(item.image_urls);
        }
    };
    
    const handleCloseAdminModal = () => {
        setAdminModal({ isOpen: false, mode: 'add', section: null, item: null });
        setFormValues({});
        setFile(null);
        setFiles([]);
        setImagePreview(null);
        setImagePreviews([]);
    };
    
    const handleFormValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             setFormValues({ ...formValues, [name]: (e.target as HTMLInputElement).checked });
        } else if (type === 'number') {
             setFormValues({ ...formValues, [name]: parseFloat(value) || 0 });
        } else {
             setFormValues({ ...formValues, [name]: value });
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setImagePreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(selectedFiles);
            setImagePreviews(selectedFiles.map(f => URL.createObjectURL(f)));
        }
    };

    const refreshAdminData = useCallback(async (section: AdminCrudSection) => {
        try {
            switch(section) {
                case 'classes': {
                    const { data, error } = await supabase.from('classes').select('*');
                    if (error) throw error;
                    setClasses(data || []); 
                    break;
                }
                case 'teachers': {
                    const { data, error } = await supabase.from('teachers').select('*');
                    if (error) throw error;
                    setTeachers(data || []);
                    break;
                }
                case 'posts': {
                     const { data, error } = await supabase.from('posts').select('*');
                    if (error) throw error;
                    setPosts(data || []);
                    break;
                }
                case 'trips': {
                     const { data, error } = await supabase.from('trips').select('*');
                    if (error) throw error;
                    setTrips(data || []);
                    break;
                }
                case 'gallery': {
                    const { data, error } = await supabase.from('gallery').select('*');
                    if (error) throw error;
                    setGallery(data || []);
                    break;
                }
                case 'books': {
                    const { data, error } = await supabase.from('books').select('*');
                    if (error) throw error;
                    setBooks(data || []);
                    break;
                }
            }
        } catch (error) {
             showToast(`فشل في تحديث بيانات ${section}`, 'error');
        }
    }, [showToast]);
    
    const handleSaveAdminItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const { section, mode, item } = adminModal;
        if (!section) return;
        setIsSubmitting(true);
    
        try {
            let op;
    
            if (section === 'trips') {
                let finalImageUrls = (item as TripInfo)?.image_urls || [];
                if (files.length > 0) {
                    const uploadedUrls = await Promise.all(files.map(f => uploadFile('images', f)));
                    finalImageUrls = uploadedUrls.filter((url): url is string => url !== null);
                }
                const data: Database['public']['Tables']['trips']['Insert'] = { ...formValues, image_urls: finalImageUrls };
    
                if (mode === 'add') {
                    op = supabase.from('trips').insert([data]);
                } else if (mode === 'edit' && item?.id) {
                    op = supabase.from('trips').update(data).eq('id', item.id);
                }
            } else {
                let finalImageUrl = (item as any)?.image_url || null;
                const bucket = section === 'gallery' ? 'gallery' : 'images';
                if (file) {
                    const newUrl = await uploadFile(bucket, file);
                    if (newUrl) finalImageUrl = newUrl;
                }
                const data = { ...formValues, image_url: finalImageUrl };
                
                if (mode === 'add') {
                     switch(section) {
                        case 'classes': op = supabase.from('classes').insert([data]); break;
                        case 'teachers': op = supabase.from('teachers').insert([data]); break;
                        case 'posts': op = supabase.from('posts').insert([data]); break;
                        case 'gallery': op = supabase.from('gallery').insert([data]); break;
                        case 'books': op = supabase.from('books').insert([data]); break;
                    }
                } else if (mode === 'edit' && item?.id) {
                    switch(section) {
                        case 'classes': op = supabase.from('classes').update(data).eq('id', item.id); break;
                        case 'teachers': op = supabase.from('teachers').update(data).eq('id', item.id); break;
                        case 'posts': op = supabase.from('posts').update(data).eq('id', item.id); break;
                        case 'gallery': op = supabase.from('gallery').update(data).eq('id', item.id); break;
                        case 'books': op = supabase.from('books').update(data).eq('id', item.id); break;
                    }
                }
            }
    
            if (!op) throw new Error("Invalid operation parameters");
            const { error } = await op;
            if (error) throw error;
    
            showToast(mode === 'add' ? 'تمت الإضافة بنجاح' : 'تم التعديل بنجاح', 'success');
            handleCloseAdminModal();
            refreshAdminData(section);
        } catch (error) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteAdminItem = async () => {
        if (!deleteConfirmation) return;
        const { section, id } = deleteConfirmation;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from(section).delete().eq('id', id);
            if (error) throw error;
            
            showToast('تم الحذف بنجاح', 'success');
            refreshAdminData(section);
            setDeleteConfirmation(null);
        } catch (error) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSearchStudents = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) {
            setSearchedStudent(null);
            setSearchedStudentBookings([]);
            return;
        };
        setIsLoading(true);
        setSearchedStudent(null);
        setSearchedStudentBookings([]);

        try {
            const { data: student, error: studentError } = await supabase
                .from('profiles')
                .select('*')
                .eq('student_id', trimmedQuery)
                .single();
            
            if (studentError || !student) {
                showToast('لم يتم العثور على طالب بهذا الكود', 'info');
                setIsLoading(false);
                return;
            }
            
            setSearchedStudent(student);
            
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings_details')
                .select('*')
                .eq('student_id', student.id);
            
            if (bookingsError) throw bookingsError;
            
            setSearchedStudentBookings((bookings as unknown as Booking[]) || []);
        } catch(error) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Exam Handlers
    const handleGenerateExam = async () => {
        if (!ai || !user || !selectedSpecialization) {
            showToast('يرجى اختيار التخصص أولاً.', 'info');
            return;
        }
        setExamState('generating');
        try {
            const prompt = `Generate ${examQuestionCount} multiple-choice questions in Arabic for a high school student in Egypt. The student is in grade "${user.grade}" and is in the "${selectedSpecialization}" track. For each question, provide 4 options, indicate the correct answer index (0-3), and provide a brief explanation for the correct answer.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            questions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.INTEGER },
                                        question_text: { type: Type.STRING },
                                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        correct_answer_index: { type: Type.INTEGER },
                                        explanation: { type: Type.STRING, description: "A brief explanation for the correct answer." }
                                    },
                                    required: ['id', 'question_text', 'options', 'correct_answer_index', 'explanation']
                                }
                            }
                        },
                         required: ['questions']
                    }
                }
            });

            const examData = JSON.parse(response.text);
            if (examData.questions && examData.questions.length > 0) {
                setQuestions(examData.questions);
                setCurrentQuestionIndex(0);
                setUserAnswers({});
                setExamStartTime(Date.now());
                setExamRemainingTime(examTimeLimit * 60);
                setExamState('active');
            } else {
                throw new Error('فشل في إنشاء الأسئلة. حاول مرة أخرى.');
            }
        } catch (error) {
            showToast(getErrorMessage(error), 'error');
            setExamState('selection');
        }
    };

    const handleAnswerSelect = (questionId: number, answerIndex: number) => {
        setUserAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    };
    
    const calculateExamResults = (
        questions: ExamQuestion[],
        userAnswers: Record<number, number>
    ) => {
        let score = 0;
        const feedback = questions.map(q => {
            const userAnswerIndex = userAnswers[q.id];
            const isCorrect = userAnswerIndex === q.correct_answer_index;
            if (isCorrect) score++;

            return {
                question_text: q.question_text,
                your_answer: userAnswerIndex !== undefined ? q.options[userAnswerIndex] : 'لم تجب',
                correct_answer: q.options[q.correct_answer_index],
                explanation: q.explanation 
            };
        });
        const duration = Math.round((Date.now() - examStartTime) / 1000);
        return { score: `${score}`, feedback, duration };
    };

    // --- RENDER LOGIC ---
    if (isAuthenticating) {
        return <div className="loading-screen"><div className="loading-spinner"></div></div>;
    }
    if (!user) {
        return <AuthPage />;
    }
    
    const renderPage = () => {
        if (isLoading && currentPage === 'dashboard') {
             return <div className="page-container" style={{display: 'flex', justifyContent: 'center', paddingTop: '5rem'}}><div className="loading-spinner"></div></div>;
        }
        
        switch (currentPage) {
            case 'dashboard': return <DashboardPage />;
            case 'profile': return <ProfilePage />;
            case 'gallery': return <GalleryPage />;
            case 'teachers': return <TeachersPage />;
            case 'trips': return <TripsPage />;
            case 'schedule': return <SchedulePage />;
            case 'books': return <BooksPage />;
            case 'exams': return <ExamsPage />;
            case 'admin': return user.role === 'admin' ? <AdminPanel /> : <p>Access Denied</p>;
            case 'about': return <StaticPage title="عن المركز" content={<AboutContent />} />;
            case 'instructions': return <StaticPage title="التعليمات" content={<InstructionsContent />} />;
            case 'legal': return <StaticPage title="الشروط والأحكام" content={<LegalContent />} />;
            default: return <DashboardPage />;
        }
    };

    // Sub-components for pages
    const DashboardPage = () => (
        <div className="page-container dashboard-page">
            <DailyClassTicker classes={classes} onClassClick={setSelectedClass} />
            <WeeklyScheduleGrid classes={classes} onClassClick={setSelectedClass} />
            
            <section>
                <h2 className="content-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span>أحدث الإعلانات</span>
                </h2>
                <div className="announcements-list">
                    {(posts.length > 0 ? posts.slice(0, 4) : Array(2).fill(null)).map((post, index) => (
                        post ? (
                        <div key={post.id} className="post-card">
                            {post.image_url && <img src={post.image_url} alt={post.title} className="post-card-image" />}
                            <div className="post-card-content">
                                <h3>{post.title}</h3>
                                <p>{post.content.substring(0, 100)}...</p>
                                <time className="post-card-date">{formatDate(post.created_at)}</time>
                            </div>
                        </div>
                        ) : (
                         <div key={index} className="post-card" aria-hidden="true">
                            <div className="post-card-image" style={{backgroundColor: 'var(--border-color)'}}></div>
                            <div className="post-card-content">
                                <div style={{height: '1.2rem', width: '80%', backgroundColor: 'var(--border-color)', borderRadius: '4px', marginBottom: '0.5rem'}}></div>
                                <div style={{height: '0.9rem', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '4px', marginBottom: '0.25rem'}}></div>
                                <div style={{height: '0.9rem', width: '60%', backgroundColor: 'var(--border-color)', borderRadius: '4px'}}></div>
                            </div>
                        </div>
                        )
                    ))}
                </div>
            </section>
        </div>
    );
    
    const ProfilePage = () => (
        <div className="page-container">
            <div className="content-card profile-page-card">
                <div className="profile-header-section">
                    <InitialAvatar name={user.full_name} avatarUrl={user.avatar_url} className="profile-page-avatar" />
                    <div className="profile-header-info">
                        <h2>{user.full_name}</h2>
                        <p>{user.email}</p>
                         {user.role && <span className="user-role-badge">{user.role}</span>}
                    </div>
                </div>
                
                <form className="profile-form" onSubmit={handleUpdateProfile}>
                     <h3 className="form-section-title">المعلومات الشخصية</h3>
                     <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="student_id">الكود</label>
                            <input id="student_id" type="text" value={user.student_id} disabled />
                        </div>
                        <div className="form-group">
                            <label htmlFor="grade">الصف الدراسي</label>
                            <input id="grade" type="text" value={user.grade} disabled />
                        </div>
                        <div className="form-group">
                            <label htmlFor="full_name">الاسم الكامل</label>
                            <input id="full_name" name="full_name" type="text" defaultValue={user.full_name} required />
                        </div>
                         <div className="form-group">
                            <label htmlFor="school">المدرسة</label>
                            <input id="school" name="school" type="text" defaultValue={user.school} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">رقم هاتف الطالب</label>
                            <input id="phone" name="phone" type="tel" defaultValue={user.phone} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="guardian_phone">رقم هاتف ولي الأمر</label>
                            <input id="guardian_phone" name="guardian_phone" type="tel" defaultValue={user.guardian_phone} required />
                        </div>
                     </div>
                     <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                     </div>
                </form>
                
                <div className="danger-zone">
                    <h3 className="form-section-title">منطقة الخطر</h3>
                    <div className="danger-zone-content">
                        <p>حذف حسابك هو إجراء دائم ولا يمكن التراجع عنه.</p>
                        <button className="btn btn-danger" onClick={() => setIsDeleteAccountModalOpen(true)}>حذف الحساب</button>
                    </div>
                </div>
            </div>
        </div>
    );
    
    const TeachersPage = () => (
        <div className="page-container">
            <h2 className="content-section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>أساتذتنا</span>
            </h2>
            <div className="teachers-public-grid">
                {teachers.map(teacher => (
                    <div key={teacher.id} className="teacher-public-card" onClick={() => setSelectedTeacher(teacher)}>
                        <img src={teacher.image_url} alt={teacher.name} className="teacher-public-image" />
                        <div className="teacher-public-info">
                            <h4>{teacher.name}</h4>
                            <p>{teacher.subject}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const GalleryPage = () => (
         <div className="page-container">
            <h2 className="content-section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <span>معرض الصور</span>
            </h2>
            <div className="gallery-full-grid">
                {gallery.map(item => (
                    <div key={item.id} className="gallery-full-item">
                        <img src={item.image_url} alt={item.description} loading="lazy" />
                        <div className="gallery-full-item-overlay">
                            <p>{item.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const TripsPage = () => (
        <div className="page-container">
            <h2 className="content-section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-4.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.44.25a2 2 0 0 1-2 1.73V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.28a2 2 0 0 1-2-1.73l-.44-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><path d="M18 5h-6"/><path d="M18 9h-6"/><path d="M18 13h-6"/><path d="M18 17h-6"/></svg>
                <span>الرحلات المتاحة</span>
            </h2>
             <div className="trips-public-list">
                 {trips.map(trip => (
                    <div key={trip.id} className="trip-public-card">
                        <div className="trip-public-image-container">
                             {trip.image_urls && trip.image_urls.length > 0 ? (
                                <img src={trip.image_urls[0]} alt={trip.name} className="trip-public-image" />
                            ) : (
                                <div className="trip-public-image-placeholder">✈️</div>
                            )}
                            {trip.available_spots > 0 && <div className="trip-spots-badge">{trip.available_spots} أماكن متاحة</div>}
                        </div>
                        <div className="trip-public-info">
                            <h3>{trip.name}</h3>
                            <div className="trip-public-details">
                                <span>🗓️ {formatDate(trip.date)}</span>
                                <span>🕒 {formatTime(trip.time)}</span>
                                <span>📍 {trip.place}</span>
                            </div>
                            <p className="trip-public-description">{trip.description}</p>
                            <div className="trip-public-footer">
                                <span className="trip-price-badge">{trip.price} جنيه</span>
                                <button className="btn btn-primary" onClick={() => setBookingConfirmation({item: trip, type: 'trip'})} disabled={trip.available_spots <= 0}>
                                    {trip.available_spots > 0 ? 'حجز الآن' : 'مكتمل'}
                                </button>
                            </div>
                        </div>
                    </div>
                 ))}
            </div>
        </div>
    );
    
    const SchedulePage = () => {
        const groupedClasses = useMemo(() => {
            const upcoming = classes.filter(c => new Date(c.date) >= new Date(new Date().toISOString().split('T')[0]));
            return upcoming.reduce((acc, c) => {
                const day = c.date;
                if (!acc[day]) acc[day] = [];
                acc[day].push(c);
                return acc;
            }, {} as Record<string, ClassInfo[]>);
        }, [classes]);
        
        const sortedDays = Object.keys(groupedClasses).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());

        return (
            <div className="page-container">
                <h2 className="content-section-title">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>جدول الحصص الكامل</span>
                </h2>
                <div className="full-schedule-list">
                    {sortedDays.map(date => (
                        <div key={date} className="schedule-day-group">
                            <h3 className="schedule-day-header">{getDayName(date)} - {formatDate(date)}</h3>
                            <div className="schedule-class-items">
                                {groupedClasses[date].sort((a,b) => a.time.localeCompare(b.time)).map(c => (
                                    <div key={c.id} className="schedule-class-item" onClick={() => setSelectedClass(c)}>
                                        <div className="class-time">{formatTime(c.time)}</div>
                                        <div className="class-details">
                                            <h4>{c.name}</h4>
                                            <p>{c.teacher} &bull; {c.location}</p>
                                        </div>
                                         <div className="class-chevron">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
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

    const BooksPage = () => (
        <div className="page-container">
            <h2 className="content-section-title">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                <span>المكتبة</span>
            </h2>
            <div className="books-public-grid">
                {books.map(book => (
                    <div key={book.id} className="book-public-card">
                        <div className="book-public-image-container">
                            <img src={book.image_url} alt={book.title} className="book-public-image" />
                        </div>
                        <div className="book-public-info">
                            <h3>{book.title}</h3>
                            <p className="book-public-description">{book.description}</p>
                            <div className="book-public-footer">
                                <a href={book.download_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    <span>تحميل</span>
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const ExamsPage = () => (
        <div className="page-container exams-page-container">
            <div className="exam-header">
                <h2 className="content-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>الاختبارات</span>
                </h2>
                <div className="exam-info-header">
                     <span className="exam-grade-badge">الصف: {user.grade}</span>
                     {examState === 'active' && examRemainingTime !== null && (
                         <div className="exam-timer">{formatTimer(examRemainingTime)}</div>
                     )}
                </div>
            </div>
            <div className="content-card">
                {examState === 'selection' && (
                    <div className="exam-card exam-selection-card">
                         <h3>تخصيص الاختبار التجريبي</h3>
                         <div className="form-group">
                            <label>اختر التخصص</label>
                            <div className="exam-specialization-options">
                                {(['علمي علوم', 'علمي رياضة', 'أدبي'] as Specialization[]).map(spec => (
                                    <label key={spec} className={`radio-label ${selectedSpecialization === spec ? 'selected' : ''}`}>
                                        <input 
                                            type="radio"
                                            name="specialization"
                                            value={spec}
                                            checked={selectedSpecialization === spec}
                                            onChange={() => setSelectedSpecialization(spec)}
                                        />
                                        <span>{spec}</span>
                                    </label>
                                ))}
                            </div>
                         </div>
                         <div className="exam-config-grid">
                            <div className="form-group">
                                <label htmlFor="question-count">عدد الأسئلة</label>
                                <input id="question-count" type="number" value={examQuestionCount} onChange={e => setExamQuestionCount(Math.max(1, parseInt(e.target.value) || 1))} min="1" max="50" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="time-limit">مدة الاختبار (دقائق)</label>
                                <input id="time-limit" type="number" value={examTimeLimit} onChange={e => setExamTimeLimit(Math.max(1, parseInt(e.target.value) || 1))} min="1" />
                            </div>
                         </div>
                         <button className="btn btn-primary btn-start-exam" onClick={handleGenerateExam} disabled={!user.grade || !selectedSpecialization}>
                            ابدأ الاختبار
                         </button>
                    </div>
                )}
                {examState === 'generating' && (
                    <div className="exam-card exam-loading-overlay">
                         <div className="loading-spinner"></div>
                         <p>جاري إنشاء الاختبار...</p>
                    </div>
                )}
                {examState === 'active' && questions.length > 0 && (
                    <div className="exam-card exam-in-progress-container">
                        <div className="exam-question-card">
                            <h4>{`السؤال ${currentQuestionIndex + 1}/${questions.length}: ${questions[currentQuestionIndex].question_text}`}</h4>
                            <div className="exam-options">
                                {questions[currentQuestionIndex].options.map((option, index) => (
                                    <div 
                                        key={index}
                                        className={`exam-option ${userAnswers[questions[currentQuestionIndex].id] === index ? 'selected' : ''}`}
                                        onClick={() => handleAnswerSelect(questions[currentQuestionIndex].id, index)}
                                    >
                                        <span className="option-key">{String.fromCharCode(65 + index)}</span>
                                        <span>{option}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="exam-actions">
                            {currentQuestionIndex < questions.length - 1 ? (
                                <button className="btn btn-primary" onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>السؤال التالي</button>
                            ) : (
                                <button className="btn btn-success btn-finish-exam" onClick={handleFinishExam} disabled={isSubmitting}>
                                    {isSubmitting ? 'جاري الحفظ...' : 'إنهاء الاختبار'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                 {examState === 'results' && examResults && (
                    <div className="exam-card exam-results-card">
                        <h2><span className="star-emoji">🎉</span> النتيجة النهائية <span className="star-emoji">🎉</span></h2>
                        <h3>{examResults.score}</h3>
                        <p>مدة الاختبار: {formatTimer(examResults.duration)}</p>
                        <div className="results-feedback-list">
                            <h3 style={{marginBottom: '1rem'}}>مراجعة الإجابات:</h3>
                            {examResults.feedback.map((item, index) => (
                                <div key={index} className="results-feedback-item" style={{borderLeftColor: item.your_answer === item.correct_answer ? 'var(--success-color)' : 'var(--error-color)'}}>
                                    <p className="question-text">{item.question_text}</p>
                                    <div className="answer-details">
                                        {item.your_answer !== item.correct_answer && (
                                            <p>إجابتك: <span className="user-answer">{item.your_answer}</span></p>
                                        )}
                                        <p>الإجابة الصحيحة: <span className="correct-answer">{item.correct_answer}</span></p>
                                    </div>
                                    <div className="explanation">
                                        <p><strong>الشرح:</strong> {item.explanation}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                         <button className="btn btn-secondary" onClick={() => { setExamState('selection'); setExamResults(null); setSelectedSpecialization(null); }}>إجراء اختبار آخر</button>
                    </div>
                )}
            </div>
        </div>
    );

    const StaticPage = ({title, content}: {title: string, content: React.ReactNode}) => (
        <div className="page-container">
            <h2 className="content-section-title">{title}</h2>
            <div className="content-card static-page-content">
                {content}
            </div>
        </div>
    );
    
    // --- ADMIN PANEL COMPONENTS ---
    const AdminPanel = () => (
        <div className="page-container admin-panel">
            <h2 className="content-section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <span>لوحة التحكم</span>
            </h2>
            <div className="content-card">
                 <div className="admin-tabs">
                    {(['classes', 'teachers', 'posts', 'trips', 'gallery', 'books', 'bookings', 'students'] as AdminTab[]).map(tab => (
                        <button key={tab} className={adminTab === tab ? 'active' : ''} onClick={() => handleAdminTabChange(tab)}>
                           {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="admin-content">
                    {adminTab === 'classes' && <AdminClassesSection />}
                    {adminTab === 'teachers' && <AdminTeachersSection />}
                    {adminTab === 'posts' && <AdminPostsSection />}
                    {adminTab === 'trips' && <AdminTripsSection />}
                    {adminTab === 'gallery' && <AdminGallerySection />}
                    {adminTab === 'books' && <AdminBooksSection />}
                    {adminTab === 'bookings' && <AdminBookingsSection />}
                    {adminTab === 'students' && <AdminStudentsSection />}
                </div>
            </div>
        </div>
    );

    const AdminClassesSection = () => (
        <div className="admin-section-content">
            <div className="admin-section-header">
                 <h3>إدارة الحصص</h3>
                 <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'classes')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>إضافة حصة</span>
                 </button>
            </div>
            <div className="admin-items-grid classes-grid">
                {classes.map(c => (
                    <div key={c.id} className="admin-item-card class-card">
                         {c.is_review && <div className="review-badge-admin">مراجعة</div>}
                        <div className="admin-item-info">
                            <h4>{c.name}</h4>
                            <p>{c.teacher} - {formatDate(c.date)}</p>
                            <small>{c.grade}</small>
                        </div>
                        <div className="admin-item-controls">
                            <button onClick={() => handleOpenAdminModal('edit', 'classes', c)}>✏️</button>
                            <button onClick={() => setDeleteConfirmation({ section: 'classes', id: c.id })}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const AdminTeachersSection = () => (
        <div className="admin-section-content">
            <div className="admin-section-header"><h3>إدارة المدرسين</h3> <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'teachers')}>إضافة مدرس</button></div>
            <div className="admin-items-grid teachers-grid">
                {teachers.map(t => (
                    <div key={t.id} className="admin-item-card">
                         <img src={t.image_url} alt={t.name} className="admin-item-image"/>
                         <div className="admin-item-info">
                            <h4>{t.name}</h4>
                            <p>{t.subject}</p>
                         </div>
                         <div className="admin-item-controls">
                            <button onClick={() => handleOpenAdminModal('edit', 'teachers', t)}>✏️</button>
                            <button onClick={() => setDeleteConfirmation({ section: 'teachers', id: t.id })}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const AdminPostsSection = () => (
        <div className="admin-section-content">
            <div className="admin-section-header"><h3>إدارة المنشورات</h3> <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'posts')}>إضافة منشور</button></div>
            <div className="admin-items-grid posts-grid">
                {posts.map(p => (
                    <div key={p.id} className="admin-item-card">
                        {p.image_url && <img src={p.image_url} alt={p.title} className="admin-item-image"/>}
                        <div className="admin-item-info">
                            <h4>{p.title}</h4>
                            <p>{p.content.substring(0, 100)}...</p>
                        </div>
                         <div className="admin-item-controls">
                            <button onClick={() => handleOpenAdminModal('edit', 'posts', p)}>✏️</button>
                            <button onClick={() => setDeleteConfirmation({ section: 'posts', id: p.id })}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const AdminTripsSection = () => (
        <div className="admin-section-content">
            <div className="admin-section-header"><h3>إدارة الرحلات</h3> <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'trips')}>إضافة رحلة</button></div>
            <div className="admin-items-grid trips-grid">
                {trips.map(t => (
                     <div key={t.id} className="admin-item-card">
                        <img src={t.image_urls?.[0] || ''} alt={t.name} className="admin-item-image"/>
                        <div className="admin-item-info">
                            <h4>{t.name}</h4>
                            <p>{t.place} - {formatDate(t.date)}</p>
                            <div className="trip-details-badges">
                                <span>{t.price} جنيه</span>
                                <span>{t.available_spots} أماكن</span>
                            </div>
                        </div>
                        <div className="admin-item-controls">
                            <button onClick={() => handleOpenAdminModal('edit', 'trips', t)}>✏️</button>
                            <button onClick={() => setDeleteConfirmation({ section: 'trips', id: t.id })}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const AdminGallerySection = () => (
        <div className="admin-section-content">
            <div className="admin-section-header"><h3>إدارة معرض الصور</h3> <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'gallery')}>إضافة صورة</button></div>
            <div className="admin-items-grid gallery-grid">
                {gallery.map(g => (
                     <div key={g.id} className="admin-item-card">
                        <img src={g.image_url} alt={g.description} className="admin-item-image"/>
                        <div className="admin-item-info">
                           <p>{g.description}</p>
                        </div>
                        <div className="admin-item-controls">
                            <button onClick={() => handleOpenAdminModal('edit', 'gallery', g)}>✏️</button>
                            <button onClick={() => setDeleteConfirmation({ section: 'gallery', id: g.id })}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const AdminBooksSection = () => (
         <div className="admin-section-content">
            <div className="admin-section-header"><h3>إدارة المكتبة</h3> <button className="btn btn-primary admin-add-btn" onClick={() => handleOpenAdminModal('add', 'books')}>إضافة كتاب</button></div>
            <div className="admin-items-grid books-grid">
                {books.map(b => (
                     <div key={b.id} className="admin-item-card book-card">
                        <img src={b.image_url} alt={b.title} className="admin-item-image"/>
                        <div className="admin-item-info">
                            <h4>{b.title}</h4>
                        </div>
                        <div className="admin-item-controls">
                            <button onClick={() => handleOpenAdminModal('edit', 'books', b)}>✏️</button>
                            <button onClick={() => setDeleteConfirmation({ section: 'books', id: b.id })}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const AdminBookingsSection = () => {
        const stats = useMemo(() => {
            const classBookings = allBookings.filter(b => b.type === 'class').length;
            const tripBookings = allBookings.filter(b => b.type === 'trip').length;
            return {
                total: allBookings.length,
                class: classBookings,
                trip: tripBookings,
                students: allStudents.length,
            };
        }, [allBookings, allStudents]);

        return (
            <div className="admin-section-content">
                <div className="admin-section-header"><h3>إحصائيات و حجوزات</h3></div>
                <div className="admin-stats-grid">
                    <div className="stat-card total-bookings"><div className="stat-card-icon">🎟️</div><div><span className="stat-card-value">{stats.total}</span><span className="stat-card-label">إجمالي الحجوزات</span></div></div>
                    <div className="stat-card class-bookings"><div className="stat-card-icon">📚</div><div><span className="stat-card-value">{stats.class}</span><span className="stat-card-label">حجوزات الحصص</span></div></div>
                    <div className="stat-card trip-bookings"><div className="stat-card-icon">✈️</div><div><span className="stat-card-value">{stats.trip}</span><span className="stat-card-label">حجوزات الرحلات</span></div></div>
                    <div className="stat-card student-count"><div className="stat-card-icon">🧑‍🎓</div><div><span className="stat-card-value">{stats.students}</span><span className="stat-card-label">إجمالي الطلاب</span></div></div>
                </div>
                <div className="bookings-table-container">
                    <table className="bookings-table">
                        <thead>
                            <tr><th>الطالب</th><th>الكود</th><th>الحجز</th><th>النوع</th><th>التاريخ</th></tr>
                        </thead>
                        <tbody>
                            {allBookings.map(b => (
                                <tr key={b.id}>
                                    <td>{b.profiles?.full_name || 'N/A'}</td>
                                    <td>{b.profiles?.student_id || 'N/A'}</td>
                                    <td>{b.item_name}</td>
                                    <td><span className={`booking-type-badge ${b.type}`}>{b.type === 'class' ? 'حصة' : 'رحلة'}</span></td>
                                    <td>{b.item_date ? formatDate(b.item_date) : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };
    
    const AdminStudentsSection = () => (
        <div className="admin-section-content">
            <div className="admin-section-header"><h3>بحث عن طالب</h3></div>
            <form className="admin-search-form" onSubmit={handleSearchStudents}>
                <input 
                    type="text" 
                    placeholder="أدخل كود الطالب..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={isLoading}>بحث</button>
            </form>
            {isLoading && <div className="loading-spinner"></div>}
            {searchedStudent && (
                <div className="student-search-results">
                    <div className="content-card student-details-card">
                        <h3>تفاصيل الطالب</h3>
                        <p><strong>الاسم:</strong> {searchedStudent.full_name}</p>
                        <p><strong>الكود:</strong> {searchedStudent.student_id}</p>
                        <p><strong>الصف:</strong> {searchedStudent.grade}</p>
                        <p><strong>المدرسة:</strong> {searchedStudent.school}</p>
                        <p><strong>الهاتف:</strong> {searchedStudent.phone}</p>
                    </div>
                     <div className="content-card">
                         <h3>حجوزات الطالب ({searchedStudentBookings.length})</h3>
                        <div className="student-bookings-list">
                           {searchedStudentBookings.length > 0 ? searchedStudentBookings.map(b => (
                               <div key={b.id} className="booking-card">
                                   <div className="booking-card-header">
                                       <span className={`booking-type-badge ${b.type}`}>{b.type === 'class' ? 'حصة' : 'رحلة'}</span>
                                       <h4>{b.item_name}</h4>
                                   </div>
                                   <p><strong>التاريخ:</strong> {b.item_date ? formatDate(b.item_date) : 'N/A'}</p>
                                   <p><strong>الوقت:</strong> {b.item_time ? formatTime(b.item_time) : 'N/A'}</p>
                                   <p><strong>المكان:</strong> {b.item_location}</p>
                               </div>
                           )) : <p>لا توجد حجوزات لهذا الطالب.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    
    const AdminModal = () => {
        if (!adminModal.isOpen || !adminModal.section) return null;
        
        const renderFields = () => {
            switch (adminModal.section) {
                case 'classes':
                    return (
                        <>
                            <input name="name" placeholder="اسم الحصة" value={formValues.name || ''} onChange={handleFormValueChange} required />
                            <textarea name="description" placeholder="الوصف" value={formValues.description || ''} onChange={handleFormValueChange}></textarea>
                            <div className="form-grid">
                                <input name="teacher" placeholder="المدرس" value={formValues.teacher || ''} onChange={handleFormValueChange} required />
                                <input name="location" placeholder="المكان" value={formValues.location || ''} onChange={handleFormValueChange} required />
                                <input name="grade" placeholder="الصف" value={formValues.grade || ''} onChange={handleFormValueChange} required />
                                <input name="date" type="date" value={formValues.date || ''} onChange={handleFormValueChange} required />
                                <input name="time" type="time" value={formValues.time || ''} onChange={handleFormValueChange} required />
                            </div>
                            <div className="checkbox-group">
                                <input id="is_bookable" name="is_bookable" type="checkbox" checked={formValues.is_bookable || false} onChange={handleFormValueChange} />
                                <label htmlFor="is_bookable">قابلة للحجز</label>
                            </div>
                             <div className="checkbox-group">
                                <input id="is_review" name="is_review" type="checkbox" checked={formValues.is_review || false} onChange={handleFormValueChange} />
                                <label htmlFor="is_review">حصة مراجعة</label>
                            </div>
                        </>
                    );
                case 'teachers':
                    return (
                        <>
                            <input name="name" placeholder="اسم المدرس" value={formValues.name || ''} onChange={handleFormValueChange} required />
                            <input name="subject" placeholder="المادة" value={formValues.subject || ''} onChange={handleFormValueChange} required />
                            <input name="phone" placeholder="رقم الهاتف (اختياري)" value={formValues.phone || ''} onChange={handleFormValueChange} />
                             <label>صورة المدرس</label>
                             <input type="file" accept="image/*" onChange={handleFileChange} />
                             {imagePreview && <div className="image-preview-container single-preview"><img src={imagePreview} alt="Preview" className="image-preview" /></div>}
                        </>
                    );
                case 'posts':
                     return (
                        <>
                            <input name="title" placeholder="عنوان المنشور" value={formValues.title || ''} onChange={handleFormValueChange} required />
                            <textarea name="content" placeholder="المحتوى" value={formValues.content || ''} onChange={handleFormValueChange} required rows={5}></textarea>
                            <label>صورة (اختياري)</label>
                            <input type="file" accept="image/*" onChange={handleFileChange} />
                            {imagePreview && <div className="image-preview-container single-preview"><img src={imagePreview} alt="Preview" className="image-preview" /></div>}
                        </>
                    );
                case 'trips':
                    return (
                        <>
                            <input name="name" placeholder="اسم الرحلة" value={formValues.name || ''} onChange={handleFormValueChange} required />
                            <textarea name="description" placeholder="الوصف" value={formValues.description || ''} onChange={handleFormValueChange}></textarea>
                             <div className="form-grid">
                                <input name="place" placeholder="المكان" value={formValues.place || ''} onChange={handleFormValueChange} required />
                                <input name="date" type="date" value={formValues.date || ''} onChange={handleFormValueChange} required />
                                <input name="time" type="time" value={formValues.time || ''} onChange={handleFormValueChange} required />
                                <input name="price" type="number" placeholder="السعر" value={formValues.price || 0} onChange={handleFormValueChange} required />
                                <input name="available_spots" type="number" placeholder="الأماكن المتاحة" value={formValues.available_spots || 0} onChange={handleFormValueChange} required />
                            </div>
                            <label>صور الرحلة</label>
                            <input type="file" accept="image/*" multiple onChange={handleMultipleFilesChange} />
                             {imagePreviews.length > 0 && 
                                <div className="image-preview-container">
                                    {imagePreviews.map((src, i) => <img key={i} src={src} alt="Preview" className="image-preview" />)}
                                </div>
                            }
                        </>
                    );
                case 'gallery':
                    return (
                        <>
                            <textarea name="description" placeholder="الوصف" value={formValues.description || ''} onChange={handleFormValueChange} required />
                            <label>الصورة</label>
                            <input type="file" accept="image/*" onChange={handleFileChange} required={adminModal.mode === 'add'} />
                            {imagePreview && <div className="image-preview-container single-preview"><img src={imagePreview} alt="Preview" className="image-preview" /></div>}
                        </>
                    );
                 case 'books':
                    return (
                        <>
                            <input name="title" placeholder="عنوان الكتاب" value={formValues.title || ''} onChange={handleFormValueChange} required />
                            <textarea name="description" placeholder="الوصف" value={formValues.description || ''} onChange={handleFormValueChange} required />
                            <input name="download_url" placeholder="رابط التحميل" value={formValues.download_url || ''} onChange={handleFormValueChange} required />
                            <label>صورة الغلاف</label>
                            <input type="file" accept="image/*" onChange={handleFileChange} required={adminModal.mode === 'add'} />
                            {imagePreview && <div className="image-preview-container single-preview"><img src={imagePreview} alt="Preview" className="image-preview" /></div>}
                        </>
                    );
                default:
                    return null;
            }
        };

        return (
            <div className="modal-overlay" onClick={handleCloseAdminModal}>
                <div className="modal-container admin-modal" onClick={e => e.stopPropagation()}>
                    <form onSubmit={handleSaveAdminItem}>
                        <div className="modal-header">
                            <h3>{adminModal.mode === 'add' ? 'إضافة' : 'تعديل'} {adminModal.section}</h3>
                            <button type="button" onClick={handleCloseAdminModal} className="close-btn">&times;</button>
                        </div>
                        <div className="modal-body admin-modal-body">
                            <div className="form-group">
                                {renderFields()}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" onClick={handleCloseAdminModal} className="btn btn-secondary">إلغاء</button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'جاري الحفظ...' : 'حفظ'}</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // Static page content
    const AboutContent = () => (
        <>
            <p>مرحبًا بكم في Google Center، وجهتكم الأولى للتميز التعليمي. نحن نقدم مجموعة شاملة من الحصص الدراسية والمراجعات لطلاب المرحلة الثانوية، بقيادة نخبة من أفضل المدرسين.</p>
            <h3>رؤيتنا</h3>
            <p>نسعى لنكون الرواد في تقديم تجربة تعليمية مبتكرة تجمع بين الأساليب التقليدية والتكنولوجيا الحديثة، لمساعدة الطلاب على تحقيق أقصى إمكاناتهم الأكاديمية والشخصية.</p>
            <h3>خدماتنا</h3>
            <ul>
                <li>حصص دراسية لجميع مواد المرحلة الثانوية.</li>
                <li>مراجعات نهائية مكثفة.</li>
                <li>رحلات تعليمية وترفيهية.</li>
                <li>مكتبة رقمية غنية بالموارد.</li>
                <li>اختبارات تجريبية لتقييم المستوى.</li>
            </ul>
        </>
    );

    const InstructionsContent = () => (
         <>
            <h3>كيفية حجز حصة</h3>
            <ol>
                <li>اذهب إلى لوحة التحكم أو صفحة الجدول.</li>
                <li>تصفح الحصص المتاحة واختر الحصة التي تريدها.</li>
                <li>اضغط على الحصة لعرض التفاصيل ثم اضغط على "تأكيد الحجز".</li>
                <li>سيتم إضافة الحصة إلى حجوزاتك في ملفك الشخصي.</li>
            </ol>
            <h3>كيفية حجز رحلة</h3>
            <ol>
                <li>اذهب إلى صفحة الرحلات من القائمة.</li>
                <li>اختر الرحلة التي تناسبك واضغط على "حجز الآن".</li>
                <li>تأكد من وجود أماكن متاحة قبل الحجز.</li>
            </ol>
             <h3>استخدام المساعد الذكي</h3>
            <p>اضغط على الأيقونة العائمة في أسفل الشاشة لبدء محادثة مع المساعد الذكي. يمكنك سؤاله عن مواعيد الحصص، تفاصيل الرحلات، أو أي معلومات أخرى عن المركز.</p>
        </>
    );
    
    const LegalContent = () => (
        <>
            <h3>1. قبول الشروط</h3>
            <p>باستخدامك لتطبيق Google Center، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق، يرجى عدم استخدام التطبيق.</p>
            <h3>2. سياسة الخصوصية</h3>
            <p>نحن نحترم خصوصيتك. بياناتك الشخصية التي نجمعها، مثل الاسم والبريد الإلكتروني، تستخدم فقط لأغراض إدارة حسابك وتقديم خدماتنا. لن نشارك بياناتك مع أي طرف ثالث.</p>
            <h3>3. السلوك المسؤول</h3>
            <p>يجب على المستخدمين التعامل مع التطبيق والآخرين باحترام. أي سلوك غير لائق قد يؤدي إلى تعليق الحساب.</p>
        </>
    );
    
    const NavItem = ({ page, label, icon, currentPage, onClick }: { page: Page, label: string, icon: React.ReactNode, currentPage: Page, onClick: (p:Page) => void }) => (
        <a className={`nav-item ${currentPage === page ? 'active' : ''}`} onClick={() => onClick(page)}>
            <div className="nav-item-icon">{icon}</div>
            <span>{label}</span>
        </a>
    );


    return (
        <div className="main-layout">
            <header className={`app-header ${isHeaderVisible ? 'visible' : ''}`}>
                <div className="notifications-wrapper" ref={notificationsRef}>
                    <button className="header-icon-btn" onClick={() => setIsNotificationsPanelOpen(prev => !prev)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        {unreadNotificationsCount > 0 && <span className="notification-badge">{unreadNotificationsCount}</span>}
                    </button>
                    {isNotificationsPanelOpen && (
                        <div className="notifications-panel">
                             <div className="notifications-header">
                                <h3>الإشعارات</h3>
                                <button onClick={markAllNotificationsAsRead} disabled={unreadNotificationsCount === 0}>
                                    وضع علامة "مقروء" على الكل
                                </button>
                            </div>
                            <div className="notifications-list">
                                {notifications.length > 0 ? (
                                    notifications.map(n => (
                                        <div key={n.id} className={`notification-item ${n.read ? 'read' : ''}`}>
                                            <div className="notification-icon">{n.icon}</div>
                                            <div className="notification-content">
                                                <p>{n.text}</p>
                                                <small>{new Date(n.created_at).toLocaleString('ar-EG')}</small>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-notifications">لا توجد إشعارات جديدة.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                 <h1 className="header-title" onClick={() => handleNavigate('dashboard')}>Google Center</h1>
                <button className="header-icon-btn" onClick={() => setIsSidebarOpen(true)}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
            </header>

            <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>&times;</button>
                <div className="sidebar-profile-card" onClick={() => handleNavigate('profile')}>
                    <InitialAvatar name={user.full_name} avatarUrl={user.avatar_url} className="profile-card-avatar-large" />
                    <h3>{user.full_name}</h3>
                    <p>{user.student_id}</p>
                </div>
                <nav className="sidebar-nav">
                    <NavItem page="dashboard" label="الرئيسية" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} currentPage={currentPage} onClick={handleNavigate} />
                    <NavItem page="schedule" label="الجدول" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} currentPage={currentPage} onClick={handleNavigate} />
                    <NavItem page="trips" label="الرحلات" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-4.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.44.25a2 2 0 0 1-2 1.73V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.28a2 2 0 0 1-2-1.73l-.44-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><path d="M18 5h-6"/></svg>} currentPage={currentPage} onClick={handleNavigate} />
                    <NavItem page="books" label="المكتبة" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>} currentPage={currentPage} onClick={handleNavigate} />
                    <NavItem page="exams" label="الاختبارات" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} currentPage={currentPage} onClick={handleNavigate} />
                    <NavItem page="gallery" label="معرض الصور" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>} currentPage={currentPage} onClick={handleNavigate} />
                    <NavItem page="teachers" label="المدرسون" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} currentPage={currentPage} onClick={handleNavigate} />
                     
                     <hr className="sidebar-divider" />

                    <NavItem page="instructions" label="التعليمات" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>} currentPage={currentPage} onClick={handleNavigate} />
                    <NavItem page="about" label="عن المركز" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} currentPage={currentPage} onClick={handleNavigate} />
                    <NavItem page="legal" label="الشروط والأحكام" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} currentPage={currentPage} onClick={handleNavigate} />
                     
                    {user.role === 'admin' && (
                        <>
                        <hr className="sidebar-divider" />
                        <a className={`nav-item owner-panel-link ${currentPage === 'admin' ? 'active' : ''}`} onClick={() => handleNavigate('admin')}>
                             <div className="nav-item-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                             </div>
                            <span>لوحة التحكم</span>
                        </a>
                        </>
                    )}
                </nav>
                <div className="sidebar-footer">
                    <div className="theme-switcher-container">
                        <span className="theme-switcher-label">المظهر</span>
                        <div className="theme-switcher">
                            <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')} title="Light">☀️</button>
                            <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')} title="Dark">🌙</button>
                            <button className={theme === 'pink' ? 'active' : ''} onClick={() => setTheme('pink')} title="Pink">🌸</button>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        <span>تسجيل الخروج</span>
                    </button>
                    <p className="sidebar-copyright" onClick={() => window.open('https://your-developer-website.com', '_blank')}>
                        &copy; {new Date().getFullYear()} Google Center
                    </p>
                </div>
            </aside>
            
            <main className="main-content">
                {renderPage()}
            </main>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <ClassPopup isOpen={!!selectedClass} classInfo={selectedClass} onClose={() => setSelectedClass(null)} onBook={(c) => setBookingConfirmation({item:c, type: 'class'})} />
            <TeacherPopup isOpen={!!selectedTeacher} teacherInfo={selectedTeacher} onClose={() => setSelectedTeacher(null)} />
            <ConfirmationModal 
                isOpen={!!bookingConfirmation}
                onClose={() => setBookingConfirmation(null)}
                onConfirm={() => bookingConfirmation && handleBookClassOrTrip(bookingConfirmation.item, bookingConfirmation.type)}
                title="تأكيد الحجز"
                message={<p>هل أنت متأكد من رغبتك في حجز <strong>{bookingConfirmation?.item.name}</strong>؟</p>}
                confirmText={isSubmitting ? "جاري التأكيد..." : "تأكيد"}
                confirmButtonClass="btn-primary"
            />
            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleDeleteAdminItem}
                title="تأكيد الحذف"
                message={<p>هل أنت متأكد من رغبتك في حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.</p>}
                confirmText={isSubmitting ? "جاري الحذف..." : "حذف"}
                confirmButtonClass="btn-danger"
            />
             <ConfirmationModal
                isOpen={isDeleteAccountModalOpen}
                onClose={() => setIsDeleteAccountModalOpen(false)}
                onConfirm={handleDeleteAccount}
                title="تأكيد حذف الحساب"
                message={
                    <>
                        <p>هل أنت متأكد تمامًا من رغبتك في حذف حسابك؟</p>
                        <p style={{color: 'var(--error-color)', fontWeight: 'bold'}}>سيتم حذف جميع بياناتك بشكل دائم ولا يمكن استعادتها.</p>
                    </>
                }
                confirmText={isSubmitting ? "جاري الحذف..." : "نعم، احذف حسابي"}
                confirmButtonClass="btn-danger"
            />
            
            <AdminModal />
            
            {ai && <FloatingActionButton onClick={() => setIsChatModalOpen(true)} />}
            <ChatModal 
                isOpen={isChatModalOpen}
                onClose={() => setIsChatModalOpen(false)}
                messages={chatMessages}
                onSend={handleSendChatMessage}
                isThinking={isThinking}
            />
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);