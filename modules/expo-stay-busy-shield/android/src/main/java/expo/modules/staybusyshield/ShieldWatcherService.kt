package expo.modules.staybusyshield

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * The Stay Busy Shield watcher (v401, Jonathan: "Build it. Make
 * it work."). A foreground service that polls UsageStatsManager
 * for foreground changes; when a shielded app comes to the front,
 * it lays the prompt over that app as a TYPE_APPLICATION_OVERLAY
 * window — a cover, not a wall: Continue removes the window and
 * the man is simply back in his app, untouched.
 *
 * Why the overlay and not a full-screen-intent activity: Continue
 * has to return him to the app he opened. An activity of ours
 * would sit in its own task, and finishing it lands on the home
 * screen, not back inside Instagram. The overlay never leaves the
 * target app at all. The full-screen-intent route also needs a
 * separate Android 14 grant the overlay does not.
 *
 * NO HISTORY: this service writes nothing to any store. Grace
 * windows are held in a HashMap in this process's memory and die
 * with the service. There is no log of what opened, what he
 * chose, or when — there is deliberately no code here that could
 * keep one.
 */
class ShieldWatcherService : Service() {
  companion object {
    @Volatile
    var running: Boolean = false
      private set

    fun startIfWanted(ctx: Context) {
      if (!ShieldStore.isMasterEnabled(ctx)) return
      if (ShieldStore.shieldedPackages(ctx).isEmpty()) return
      if (!ShieldStore.hasUsageAccess(ctx)) return
      val intent = Intent(ctx, ShieldWatcherService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
    }

    fun stop(ctx: Context) {
      ctx.stopService(Intent(ctx, ShieldWatcherService::class.java))
    }
  }

  private var workerThread: HandlerThread? = null
  private var worker: Handler? = null
  private val main = Handler(Looper.getMainLooper())

  /** package -> wall-clock ms when its post-Continue grace ends. Memory only. */
  private val graceUntil = HashMap<String, Long>()
  private var lastForegroundPackage: String? = null
  private var promptedPackage: String? = null
  private var overlayView: View? = null
  private var launcherPackage: String? = null

  private val tick = object : Runnable {
    override fun run() {
      try {
        poll()
      } catch (_: Exception) {
        // A bad tick must never kill the watcher.
      }
      worker?.postDelayed(this, POLL_MS)
    }
  }

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        ShieldContract.NOTIFICATION_ID, notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
      )
    } else {
      startForeground(ShieldContract.NOTIFICATION_ID, notification)
    }
    running = true
    launcherPackage = resolveLauncherPackage()
    workerThread = HandlerThread("shield-watcher").apply { start() }
    worker = Handler(workerThread!!.looper)
    worker?.post(tick)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!conditionsHold()) {
      stopSelf()
      return START_NOT_STICKY
    }
    return START_STICKY
  }

  override fun onDestroy() {
    running = false
    worker?.removeCallbacks(tick)
    workerThread?.quitSafely()
    workerThread = null
    worker = null
    dismissPrompt()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun conditionsHold(): Boolean =
    ShieldStore.isMasterEnabled(this) &&
      ShieldStore.shieldedPackages(this).isNotEmpty() &&
      ShieldStore.hasUsageAccess(this)

  // ─── Watching ────────────────────────────────────────────────────────────

  private fun poll() {
    if (!conditionsHold()) {
      stopSelf()
      return
    }
    val keyguard = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    if (keyguard?.isKeyguardLocked == true) {
      if (promptedPackage != null) dismissPrompt()
      return
    }
    val foreground = currentForegroundPackage() ?: return
    if (foreground == lastForegroundPackage) return
    lastForegroundPackage = foreground

    // He navigated away from the prompted app: the cover goes with it.
    if (promptedPackage != null && foreground != promptedPackage && foreground != packageName) {
      dismissPrompt()
    }

    if (foreground == packageName) return // never prompt over ourselves (KMO included)
    if (foreground == launcherPackage) return
    if (foreground == "com.android.systemui") return
    if (!ShieldStore.shieldedPackages(this).contains(foreground)) return
    if (promptedPackage == foreground) return
    val grace = graceUntil[foreground] ?: 0L
    if (System.currentTimeMillis() < grace) return
    if (!ShieldStore.hasOverlayPermission(this)) return // inert without the grant
    showPrompt(foreground)
  }

  @Suppress("DEPRECATION")
  private fun currentForegroundPackage(): String? {
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
    val now = System.currentTimeMillis()
    val events = usm.queryEvents(now - EVENT_WINDOW_MS, now) ?: return null
    val event = UsageEvents.Event()
    var foreground: String? = null
    var foregroundAt = 0L
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val resumed = event.eventType == UsageEvents.Event.ACTIVITY_RESUMED ||
        event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND
      if (resumed && event.timeStamp >= foregroundAt) {
        foreground = event.packageName
        foregroundAt = event.timeStamp
      }
    }
    return foreground
  }

  private fun resolveLauncherPackage(): String? {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    return try {
      packageManager.resolveActivity(intent, 0)?.activityInfo?.packageName
    } catch (_: Exception) {
      null
    }
  }

  // ─── The prompt ──────────────────────────────────────────────────────────

  private fun appLabel(pkg: String): String = try {
    val info = packageManager.getApplicationInfo(pkg, 0)
    packageManager.getApplicationLabel(info).toString()
  } catch (_: Exception) {
    pkg
  }

  private fun showPrompt(pkg: String) {
    val label = appLabel(pkg)
    main.post {
      if (promptedPackage != null) return@post
      val wm = getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return@post
      val view = buildPromptView(pkg, label)
      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT,
      )
      try {
        wm.addView(view, params)
        overlayView = view
        promptedPackage = pkg
      } catch (_: Exception) {
        // Overlay grant revoked mid-flight, or the window died:
        // stay inert rather than crash the watcher.
      }
    }
  }

  private fun dismissPrompt() {
    main.post {
      val view = overlayView ?: run {
        promptedPackage = null
        return@post
      }
      try {
        (getSystemService(Context.WINDOW_SERVICE) as? WindowManager)?.removeView(view)
      } catch (_: Exception) {
      }
      overlayView = null
      promptedPackage = null
    }
  }

  /** Continue: the cover drops, the app underneath never noticed, the shield rests an hour. */
  private fun onContinue(pkg: String) {
    graceUntil[pkg] = System.currentTimeMillis() + ShieldContract.GRACE_MS
    dismissPrompt()
  }

  /** Occupy: the cover drops and PrayerCircle comes forward at Keep Me Occupied. */
  private fun onOccupy() {
    dismissPrompt()
    val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      putExtra(ShieldContract.EXTRA_OPEN_KMO, true)
    } ?: return
    try {
      startActivity(launch)
    } catch (_: Exception) {
    }
  }

  /**
   * The prompt card, built natively in the mockup's own tokens
   * (stay-busy-shield-concept-v1.html — drawn on his dark theme:
   * deep-navy card, tonal quiet button, seed-blue filled pill, the
   * wave-red kept as the meaning colour on the shield mark only).
   */
  private fun buildPromptView(pkg: String, label: String): View {
    val ctx = this
    val density = resources.displayMetrics.density
    fun dp(v: Int): Int = (v * density).toInt()
    fun pill(color: Int, radiusDp: Int): GradientDrawable = GradientDrawable().apply {
      setColor(color)
      cornerRadius = dp(radiusDp).toFloat()
    }
    fun text(sizeSp: Float, color: Int, bold: Boolean): TextView = TextView(ctx).apply {
      textSize = sizeSp
      setTextColor(color)
      if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
    }

    val scrim = FrameLayout(ctx).apply {
      setBackgroundColor(Color.argb(140, 4, 7, 13))
      isFocusable = true
      isFocusableInTouchMode = true
      setOnKeyListener { _, keyCode, keyEvent ->
        if (keyCode == KeyEvent.KEYCODE_BACK && keyEvent.action == KeyEvent.ACTION_UP) {
          onContinue(pkg)
          true
        } else {
          false
        }
      }
    }

    val card = LinearLayout(ctx).apply {
      orientation = LinearLayout.VERTICAL
      background = pill(Color.rgb(0x16, 0x1E, 0x30), 28)
      setPadding(dp(22), dp(26), dp(22), dp(20))
    }

    val mark = text(21f, Color.WHITE, false).apply {
      this.text = "\uD83C\uDF0A"
      gravity = Gravity.CENTER
      background = pill(Color.rgb(0x5B, 0x23, 0x26), 16)
    }
    card.addView(mark, LinearLayout.LayoutParams(dp(46), dp(46)))

    val question = text(23f, Color.rgb(0xE8, 0xED, 0xF7), true).apply {
      this.text = "Like to stay busy?"
      setPadding(0, dp(14), 0, 0)
    }
    card.addView(question)

    val sub = text(13.5f, Color.rgb(0xA5, 0xB2, 0xCC), false).apply {
      this.text = "You opened $label. The games are one tap away — or carry on, no questions asked."
      setPadding(0, dp(8), 0, 0)
      setLineSpacing(0f, 1.35f)
    }
    card.addView(sub)

    val occupy = text(15.5f, Color.rgb(0x0A, 0x1C, 0x3F), true).apply {
      this.text = "Occupy me"
      gravity = Gravity.CENTER
      background = pill(Color.rgb(0x8A, 0xB4, 0xFF), 999)
      setPadding(0, dp(15), 0, dp(15))
      isClickable = true
      setOnClickListener { onOccupy() }
    }
    card.addView(occupy, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT,
    ).apply { topMargin = dp(18) })

    val cont = text(15.5f, Color.rgb(0xE8, 0xED, 0xF7), true).apply {
      this.text = "Continue to $label"
      gravity = Gravity.CENTER
      background = pill(Color.rgb(0x1D, 0x27, 0x40), 999)
      setPadding(0, dp(15), 0, dp(15))
      isClickable = true
      setOnClickListener { onContinue(pkg) }
    }
    card.addView(cont, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT,
    ).apply { topMargin = dp(11) })

    val grace = text(12.5f, Color.rgb(0x71, 0x80, 0x9E), false).apply {
      this.text = "Continue rests the shield for an hour."
      gravity = Gravity.CENTER
      setPadding(0, dp(13), 0, 0)
    }
    card.addView(grace)

    val cardParams = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER,
    ).apply {
      leftMargin = dp(22)
      rightMargin = dp(22)
    }
    scrim.addView(card, cardParams)
    return scrim
  }

  // ─── The watcher's own notification ──────────────────────────────────────

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        ShieldContract.CHANNEL_ID, "Stay Busy Shield", NotificationManager.IMPORTANCE_LOW,
      ).apply {
        setShowBadge(false)
      }
      (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
    }
  }

  private fun buildNotification(): Notification {
    val openApp = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val contentIntent = openApp?.let { PendingIntent.getActivity(this, 0, it, flags) }
    return NotificationCompat.Builder(this, ShieldContract.CHANNEL_ID)
      .setSmallIcon(smallIconRes())
      .setContentTitle("Stay Busy Shield is on")
      .setContentText("Watching the apps you picked — nothing is recorded.")
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(contentIntent)
      .build()
  }

  private fun smallIconRes(): Int {
    var res = resources.getIdentifier("notification_icon", "drawable", packageName)
    if (res == 0) res = applicationInfo.icon
    if (res == 0) res = android.R.drawable.ic_dialog_info
    return res
  }
}

private const val POLL_MS = 700L
private const val EVENT_WINDOW_MS = 15_000L
