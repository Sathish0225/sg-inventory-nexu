
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, AlertTriangle, Info, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "warning",
      title: "Low Stock Alert",
      message: "LED Bulb 12W stock is running low (15 remaining, minimum: 25)",
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      read: false
    },
    {
      id: "2",
      type: "info",
      title: "Service Scheduled",
      message: "New service job scheduled for Marina Bay Sands - Tower 1",
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: false
    },
    {
      id: "3",
      type: "success",
      title: "Service Completed",
      message: "HVAC maintenance completed at Raffles Hotel Singapore",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: true
    }
  ]);

  const [showPanel, setShowPanel] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success("Notification deleted");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "error": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString('en-SG');
  };

  // Simulate new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const randomNotifications = [
        {
          type: "warning" as const,
          title: "Stock Alert",
          message: "Network Cable CAT6 stock is getting low"
        },
        {
          type: "info" as const,
          title: "New Service Request",
          message: "Emergency repair requested at Changi Airport"
        },
        {
          type: "success" as const,
          title: "Inventory Updated",
          message: "New stock items have been added to warehouse"
        }
      ];

      if (Math.random() > 0.8) { // 20% chance every interval
        const randomNotif = randomNotifications[Math.floor(Math.random() * randomNotifications.length)];
        const newNotification: Notification = {
          id: Date.now().toString(),
          ...randomNotif,
          timestamp: new Date(),
          read: false
        };

        setNotifications(prev => [newNotification, ...prev]);
        toast(randomNotif.title, {
          description: randomNotif.message,
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="sm" 
        className="relative"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {showPanel && (
        <div className="absolute right-0 top-12 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setShowPanel(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    {getIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.timestamp)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;
