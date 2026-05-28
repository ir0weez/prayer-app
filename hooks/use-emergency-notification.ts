import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Person } from "@/lib/prayercircle-data";
import { getAllActiveEmergencyPrayers } from "@/lib/prayercircle-data";

/**
 * Hook to manage persistent status bar notification for emergency prayers.
 * Shows emergency prayer count in the system status bar.
 */
export function useEmergencyNotification(people: Person[]) {
  const notificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const updateNotification = async () => {
      const emergencyPrayers = getAllActiveEmergencyPrayers(people);
      const count = emergencyPrayers.length;

      // Cancel previous notification if it exists
      if (notificationIdRef.current) {
        await Notifications.dismissNotificationAsync(notificationIdRef.current);
        notificationIdRef.current = null;
      }

      // Only show notification if there are active emergency prayers
      if (count > 0) {
        try {
          // Schedule a persistent notification that appears in the status bar
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${count} Emergency Prayer${count > 1 ? "s" : ""}`,
              body: "Tap to view",
              badge: count,
              sound: false, // Silent notification
              sticky: true, // Keep notification persistent
              priority: "high" as const, // Show in status bar
            },
            trigger: { type: "time", seconds: 0 } as any, // Show immediately
          });

          notificationIdRef.current = notificationId;
        } catch (error) {
          console.error("Failed to schedule emergency prayer notification:", error);
        }
      }
    };

    updateNotification();

    // Cleanup: dismiss notification when component unmounts or people changes
    return () => {
      if (notificationIdRef.current) {
        Notifications.dismissNotificationAsync(notificationIdRef.current).catch(
          (error) => console.error("Failed to dismiss notification:", error)
        );
        notificationIdRef.current = null;
      }
    };
  }, [people]);
}
