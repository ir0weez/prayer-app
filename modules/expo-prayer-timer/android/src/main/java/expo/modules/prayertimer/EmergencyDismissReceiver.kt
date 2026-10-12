package expo.modules.prayertimer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Fired by the emergency prayer notification's "Dismiss" button.
 * Cancels the notification and notifies JS so it can clear the emergency.
 */
class EmergencyDismissReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ExpoPrayerTimerModule.DISMISS_EMERGENCY_ACTION) return
    try {
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
      nm.cancel(9002)
    } catch (_: Exception) {
    }
    // If the JS runtime is alive, deliver the event directly too.
    ExpoPrayerTimerModule.sendEmergencyDismissEvent()
  }
}
