package expo.modules.prayertimer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoPrayerTimerModule : Module() {
  companion object {
    const val END_PRAYER_ACTION = "expo.modules.prayertimer.END_PRAYER"
    const val EXTRA_END_PRAYER = "expo.modules.prayertimer.EXTRA_END_PRAYER"
    const val PRAY_NEXT_ACTION = "expo.modules.prayertimer.PRAY_NEXT"
    const val DISMISS_EMERGENCY_ACTION = "expo.modules.prayertimer.DISMISS_EMERGENCY"
    const val EXTRA_DISMISS_EMERGENCY = "expo.modules.prayertimer.EXTRA_DISMISS_EMERGENCY"
    private const val NOTIFICATION_ID = 9001
    private const val EMERGENCY_NOTIFICATION_ID = 9002
    private const val CHANNEL_ID = "prayer-timer"
    private const val EMERGENCY_CHANNEL_ID = "emergency-prayer"

    private var moduleInstance: ExpoPrayerTimerModule? = null
    // Wall-clock start of the current session, so notification updates keep
    // the chronometer counting from the original start instead of resetting.
    private var sessionStartedAt: Long = 0L

    /** Tell JS (if alive) that the user tapped "End prayer". */
    fun sendEndEvent() {
      moduleInstance?.sendEvent("onEndPrayer", emptyMap<String, Any?>())
    }

    /** Tell JS (if alive) that the user tapped "Pray" (advance to next person). */
    fun sendPrayNextEvent() {
      moduleInstance?.sendEvent("onPrayNext", emptyMap<String, Any?>())
    }

    /** Tell JS (if alive) that the user dismissed the emergency notification. */
    fun sendEmergencyDismissEvent() {
      moduleInstance?.sendEvent("onEmergencyDismiss", emptyMap<String, Any?>())
    }
  }

  private fun notificationManager(ctx: Context): NotificationManager =
    ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun ensureChannel(ctx: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Prayer Timer", NotificationManager.IMPORTANCE_LOW).apply {
        vibrationPattern = longArrayOf(0)
        setShowBadge(false)
      }
      notificationManager(ctx).createNotificationChannel(channel)
    }
  }

  private fun ensureEmergencyChannel(ctx: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(EMERGENCY_CHANNEL_ID, "Emergency Prayer", NotificationManager.IMPORTANCE_HIGH).apply {
        vibrationPattern = longArrayOf(0)
        setShowBadge(true)
      }
      notificationManager(ctx).createNotificationChannel(channel)
    }
  }

  private fun dismissEmergencyPendingIntent(ctx: Context): PendingIntent {
    val intent = Intent(DISMISS_EMERGENCY_ACTION).setPackage(ctx.packageName)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(ctx, 2, intent, flags)
  }

  private fun formatRemaining(millis: Long): String {
    val totalSeconds = (millis / 1000).toInt()
    val h = totalSeconds / 3600
    val m = (totalSeconds % 3600) / 60
    return if (h > 0) "${h}h ${m}m left" else "${m}m left"
  }

  private fun buildEmergencyNotification(ctx: Context, personName: String, remainingMillis: Long, totalMillis: Long) =
    NotificationCompat.Builder(ctx, EMERGENCY_CHANNEL_ID)
      .setSmallIcon(smallIconRes(ctx))
      .setContentTitle("\uD83D\uDEA8 Emergency prayer")
      .setContentText("Urgent prayer for $personName — ${formatRemaining(remainingMillis)}")
      .setProgress(totalMillis.toInt(), (totalMillis - remainingMillis).toInt(), false)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(openAppPendingIntent(ctx))
      .addAction(0, "\uD83D\uDE4F Pray now", openAppPendingIntent(ctx))
      .addAction(0, "Dismiss", dismissEmergencyPendingIntent(ctx))
      .build()

  private fun smallIconRes(ctx: Context): Int {
    // Prefer the icon expo-notifications generates, then the app icon.
    var res = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName)
    if (res == 0) res = ctx.applicationInfo.icon
    if (res == 0) res = android.R.drawable.ic_dialog_info
    return res
  }

  private fun endPendingIntent(ctx: Context): PendingIntent {
    val intent = Intent(END_PRAYER_ACTION).setPackage(ctx.packageName)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(ctx, 0, intent, flags)
  }

  private fun prayNextPendingIntent(ctx: Context): PendingIntent {
    val intent = Intent(PRAY_ACTION).setPackage(ctx.packageName)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(ctx, 3, intent, flags)
  }

  private fun buildPrayerSessionNotification(ctx: Context, personName: String) =
    NotificationCompat.Builder(ctx, CHANNEL_ID)
      .setSmallIcon(smallIconRes(ctx))
      .setContentTitle("\uD83D\uDE4F Prayer in progress")
      .setContentText(if (personName.isNotBlank()) "Praying for $personName" else null)
      // The platform chronometer counts up live from `when` — no JS timer needed.
      .setUsesChronometer(true)
      .setShowWhen(true)
      .setWhen(sessionStartedAt)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(openAppPendingIntent(ctx))
      .addAction(0, "Pray", prayNextPendingIntent(ctx))
      .addAction(0, "End prayer", endPendingIntent(ctx))
      .build()

  private fun openAppPendingIntent(ctx: Context): PendingIntent {
    val launchIntent = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getActivity(ctx, 1, launchIntent, flags)
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoPrayerTimer")

    Events("onEndPrayer", "onPrayNext", "onEmergencyDismiss")

    OnCreate {
      moduleInstance = this@ExpoPrayerTimerModule
    }

    OnDestroy {
      if (moduleInstance === this@ExpoPrayerTimerModule) moduleInstance = null
    }

    Function("start") { personName: String ->
      val ctx = appContext.reactContext ?: return@Function null
      ensureChannel(ctx)
      sessionStartedAt = System.currentTimeMillis()
      notificationManager(ctx).notify(NOTIFICATION_ID, buildPrayerSessionNotification(ctx, personName))
    }

    // Rebuilds the ongoing notification with the new person name. The
    // chronometer keeps counting from the original session start.
    Function("update") { personName: String ->
      val ctx = appContext.reactContext ?: return@Function null
      ensureChannel(ctx)
      if (sessionStartedAt == 0L) sessionStartedAt = System.currentTimeMillis()
      notificationManager(ctx).notify(NOTIFICATION_ID, buildPrayerSessionNotification(ctx, personName))
    }

    Function("stop") {
      val ctx = appContext.reactContext ?: return@Function null
      sessionStartedAt = 0L
      try {
        notificationManager(ctx).cancel(NOTIFICATION_ID)
      } catch (_: Exception) {
      }
    }

    // True when the app was (re)launched from the notification's End button
    // while JS wasn't alive to receive the event. Clears the flag.
    Function("consumePendingEndRequest") {
      val activity = appContext.currentActivity ?: return@Function false
      val intent = activity.intent ?: return@Function false
      if (intent.getBooleanExtra(EXTRA_END_PRAYER, false)) {
        intent.removeExtra(EXTRA_END_PRAYER)
        return@Function true
      }
      return@Function false
    }

    // ── Emergency prayer live pill ──────────────────────────────────────────
    // Ongoing notification with a depleting progress bar, live countdown text,
    // "Pray now" (opens app) and "Dismiss" actions. Can't be swiped away.

    Function("startEmergency") { personName: String, remainingMillis: Long, totalMillis: Long ->
      val ctx = appContext.reactContext ?: return@Function null
      ensureEmergencyChannel(ctx)
      notificationManager(ctx).notify(
        EMERGENCY_NOTIFICATION_ID,
        buildEmergencyNotification(ctx, personName, remainingMillis, totalMillis)
      )
    }

    Function("updateEmergency") { personName: String, remainingMillis: Long, totalMillis: Long ->
      val ctx = appContext.reactContext ?: return@Function null
      ensureEmergencyChannel(ctx)
      notificationManager(ctx).notify(
        EMERGENCY_NOTIFICATION_ID,
        buildEmergencyNotification(ctx, personName, remainingMillis, totalMillis)
      )
    }

    Function("stopEmergency") {
      val ctx = appContext.reactContext ?: return@Function null
      try {
        notificationManager(ctx).cancel(EMERGENCY_NOTIFICATION_ID)
      } catch (_: Exception) {
      }
    }

    // True when the app was launched from the emergency "Dismiss" button
    // while JS wasn't alive. Clears the flag.
    Function("consumePendingEmergencyDismiss") {
      val activity = appContext.currentActivity ?: return@Function false
      val intent = activity.intent ?: return@Function false
      if (intent.getBooleanExtra(EXTRA_DISMISS_EMERGENCY, false)) {
        intent.removeExtra(EXTRA_DISMISS_EMERGENCY)
        return@Function true
      }
      return@Function false
    }
  }
}
