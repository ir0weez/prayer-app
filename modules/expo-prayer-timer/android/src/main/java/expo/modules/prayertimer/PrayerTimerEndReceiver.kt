package expo.modules.prayertimer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Fired by the prayer timer notification's "End prayer" button.
 * Brings the app forward and notifies JS so the session closes.
 */
class PrayerTimerEndReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ExpoPrayerTimerModule.END_PRAYER_ACTION) return
    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      putExtra(ExpoPrayerTimerModule.EXTRA_END_PRAYER, true)
    }
    try {
      context.startActivity(launchIntent)
    } catch (_: Exception) {
    }
    // If the JS runtime is alive, deliver the event directly too.
    ExpoPrayerTimerModule.sendEndEvent()
  }
}
