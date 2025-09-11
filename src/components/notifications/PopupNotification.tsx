import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Bell, AlertTriangle, CheckCircle, Info, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'promotion';

export interface PopupNotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actions?: {
    label: string;
    action: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  }[];
  autoClose?: boolean;
  duration?: number;
  persistent?: boolean;
}

interface PopupNotificationProps {
  notifications: PopupNotificationData[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case 'error':
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    case 'promotion':
      return <Gift className="h-5 w-5 text-purple-600" />;
    default:
      return <Info className="h-5 w-5 text-blue-600" />;
  }
};

const getNotificationColors = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'border-green-200 bg-green-50';
    case 'warning':
      return 'border-yellow-200 bg-yellow-50';
    case 'error':
      return 'border-red-200 bg-red-50';
    case 'promotion':
      return 'border-purple-200 bg-purple-50';
    default:
      return 'border-blue-200 bg-blue-50';
  }
};

const getPositionClasses = (position: string) => {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'top-center':
      return 'top-4 left-1/2 transform -translate-x-1/2';
    case 'bottom-center':
      return 'bottom-4 left-1/2 transform -translate-x-1/2';
    default: // top-right
      return 'top-4 right-4';
  }
};

export const PopupNotification: React.FC<PopupNotificationProps> = ({ 
  notifications, 
  onClose, 
  position = 'top-right' 
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<PopupNotificationData[]>([]);

  useEffect(() => {
    setVisibleNotifications(notifications);

    // Auto-close notifications
    notifications.forEach(notification => {
      if (notification.autoClose !== false && !notification.persistent) {
        const duration = notification.duration || 5000;
        setTimeout(() => {
          onClose(notification.id);
        }, duration);
      }
    });
  }, [notifications, onClose]);

  return (
    <div className={`fixed z-50 max-w-sm w-full ${getPositionClasses(position)}`}>
      <AnimatePresence>
        {visibleNotifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            transition={{ delay: index * 0.1 }}
            className="mb-4"
          >
            <Card className={`shadow-lg border-2 ${getNotificationColors(notification.type)}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    {getNotificationIcon(notification.type)}
                    {notification.title}
                  </CardTitle>
                  {!notification.persistent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onClose(notification.id)}
                      className="h-6 w-6 p-0 hover:bg-white/50"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-700 mb-3">{notification.message}</p>
                
                {notification.actions && notification.actions.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {notification.actions.map((action, actionIndex) => (
                      <Button
                        key={actionIndex}
                        variant={action.variant || 'default'}
                        size="sm"
                        onClick={() => {
                          action.action();
                          if (!notification.persistent) {
                            onClose(notification.id);
                          }
                        }}
                        className="text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook to manage popup notifications
export const usePopupNotifications = () => {
  const [notifications, setNotifications] = useState<PopupNotificationData[]>([]);

  const showNotification = (notification: Omit<PopupNotificationData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);
    
    return id;
  };

  const closeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Predefined notification types for common use cases
  const showSuccess = (title: string, message: string, actions?: PopupNotificationData['actions']) => {
    return showNotification({ type: 'success', title, message, actions });
  };

  const showError = (title: string, message: string, actions?: PopupNotificationData['actions']) => {
    return showNotification({ type: 'error', title, message, actions, persistent: true });
  };

  const showWarning = (title: string, message: string, actions?: PopupNotificationData['actions']) => {
    return showNotification({ type: 'warning', title, message, actions });
  };

  const showInfo = (title: string, message: string, actions?: PopupNotificationData['actions']) => {
    return showNotification({ type: 'info', title, message, actions });
  };

  const showPromotion = (title: string, message: string, actions?: PopupNotificationData['actions']) => {
    return showNotification({ 
      type: 'promotion', 
      title, 
      message, 
      actions, 
      persistent: true,
      autoClose: false 
    });
  };

  return {
    notifications,
    showNotification,
    closeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showPromotion,
  };
};