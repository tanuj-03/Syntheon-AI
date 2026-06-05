'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION = 1750; // 1.75 seconds exactly

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-amber-500',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, message, type };

      setToasts((prev) => [...prev, toast]);

      const timeout = setTimeout(() => {
        removeToast(id);
      }, TOAST_DURATION);

      timeoutsRef.current.set(id, timeout);
    },
    [removeToast]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast, index) => (
          <IslandToast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
            index={index}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface IslandToastProps {
  toast: Toast;
  onClose: () => void;
  index: number;
}

function IslandToast({ toast, onClose, index }: IslandToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const Icon = iconMap[toast.type];

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));

    // Start exit animation before removal
    const exitTimeout = setTimeout(() => {
      setIsExiting(true);
    }, TOAST_DURATION - 300);

    return () => clearTimeout(exitTimeout);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={cn(
        'pointer-events-auto transition-all duration-300 ease-out',
        'flex items-center gap-3 px-4 py-3 min-h-[44px]',
        'bg-card/95 backdrop-blur-xl border border-border/50',
        'shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
        'rounded-full',
        'max-w-[90vw] sm:max-w-[400px]',
        isVisible && !isExiting
          ? 'translate-y-0 opacity-100 scale-100'
          : '-translate-y-4 opacity-0 scale-95',
        isExiting && 'translate-y-2 opacity-0 scale-95'
      )}
      style={{
        transform: isVisible && !isExiting ? `translateY(${index * 56}px)` : undefined,
      }}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', colorMap[toast.type])} />

      <span className="text-sm font-medium text-foreground truncate">{toast.message}</span>

      <button
        onClick={handleClose}
        className="ml-1 p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0"
        aria-label="Close toast"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
