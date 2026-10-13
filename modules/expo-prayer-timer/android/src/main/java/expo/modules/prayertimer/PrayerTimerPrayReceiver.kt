package expo.modules.prayertimer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Fired by the prayer timer notification's "Pray" button.
 * Brings the app forward and notifies JS so the session advances to the
 * next person (awarding XP through the normal onPray flow).
 */
class PrayerTimerPrayReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ExpoPrayerTimerModule.PRAY_NEXT_ACTION) return
    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    try {
      context.startActivity(launchIntent)
    } catch (_: Exception) {
    }
    // If the JS runtime is alive, deliver the event directly too.
    ExpoPrayerTimerModule.sendPrayNextEvent()
  }
}
