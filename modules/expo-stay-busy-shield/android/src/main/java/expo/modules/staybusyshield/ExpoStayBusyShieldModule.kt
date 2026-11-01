package expo.modules.staybusyshield

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

/**
 * The Stay Busy Shield's JS bridge (v401).
 *
 * The surface is deliberately small and settings-shaped: list the
 * apps, read the three grants, open the three Settings screens,
 * sync the shielded set, report whether the watcher is running.
 * Nothing here can read or write a trigger history — none exists.
 */
class ExpoStayBusyShieldModule : Module() {

  private fun context(): Context? = appContext.reactContext

  private fun openSettings(intent: Intent) {
    val ctx = context() ?: return
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      ctx.startActivity(intent)
    } catch (_: ActivityNotFoundException) {
      // A Settings screen this device doesn't have: stay quiet.
    } catch (_: Exception) {
    }
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoStayBusyShield")

    Events("onShieldOccupy")

    // The prompt's "Occupy me" relaunched the app while JS was
    // alive: forward it as an event, and clear the extra so the
    // cold-start consume path can't fire it a second time.
    OnNewIntent { intent ->
      if (intent.getBooleanExtra(ShieldContract.EXTRA_OPEN_KMO, false)) {
        intent.removeExtra(ShieldContract.EXTRA_OPEN_KMO)
        sendEvent("onShieldOccupy", emptyMap<String, Any?>())
      }
    }

    /** User apps only: label + package, the settings page's list. */
    AsyncFunction("getInstalledApps") {
      val ctx = context() ?: return@AsyncFunction emptyList<Map<String, String>>()
      val pm = ctx.packageManager
      val own = ctx.packageName
      pm.getInstalledApplications(0)
        .filter { it.packageName != own && (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }
        .map {
          mapOf(
            "packageName" to it.packageName,
            "label" to pm.getApplicationLabel(it).toString(),
          )
        }
        .sortedBy { it["label"]?.lowercase() }
    }

    /** One app's icon as a PNG base64 string (the page asks per row). */
    AsyncFunction("getAppIcon") { packageName: String ->
      val ctx = context() ?: return@AsyncFunction null
      try {
        val drawable = ctx.packageManager.getApplicationIcon(packageName)
        val bitmap = Bitmap.createBitmap(ICON_PX, ICON_PX, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, ICON_PX, ICON_PX)
        drawable.draw(canvas)
        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
      } catch (_: Exception) {
        null
      }
    }

    Function("hasUsageAccess") {
      val ctx = context() ?: return@Function false
      ShieldStore.hasUsageAccess(ctx)
    }

    Function("hasOverlayPermission") {
      val ctx = context() ?: return@Function false
      ShieldStore.hasOverlayPermission(ctx)
    }

    Function("hasBatteryExemption") {
      val ctx = context() ?: return@Function false
      val pm = ctx.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return@Function false
      pm.isIgnoringBatteryOptimizations(ctx.packageName)
    }

    Function("openUsageAccessSettings") {
      openSettings(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    }

    Function("openOverlaySettings") {
      val ctx = context() ?: return@Function null
      openSettings(
        Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + ctx.packageName)),
      )
    }

    Function("openBatterySettings") {
      val ctx = context() ?: return@Function null
      try {
        val intent = Intent(
          Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          Uri.parse("package:" + ctx.packageName),
        )
        openSettings(intent)
      } catch (_: Exception) {
        openSettings(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
      }
    }

    /**
     * The one sync point: JS owns the settings (AsyncStorage);
     * this mirrors them where the service can read them, then
     * starts or stops the watcher to match. Settings only — the
     * mirror can never carry a trigger or a choice.
     */
    Function("syncShield") { shielded: List<String>, enabled: Boolean ->
      val ctx = context() ?: return@Function null
      ShieldStore.writeSettings(ctx, enabled, shielded)
      if (enabled && shielded.isNotEmpty() && ShieldStore.hasUsageAccess(ctx)) {
        ShieldWatcherService.startIfWanted(ctx)
      } else {
        ShieldWatcherService.stop(ctx)
      }
    }

    Function("isWatcherRunning") {
      ShieldWatcherService.running
    }

    /**
     * True when the app was cold-launched from the prompt's
     * "Occupy me" while JS wasn't alive to receive the event.
     * Clears the flag.
     */
    Function("consumePendingOccupyRequest") {
      val activity = appContext.currentActivity ?: return@Function false
      val intent = activity.intent ?: return@Function false
      if (intent.getBooleanExtra(ShieldContract.EXTRA_OPEN_KMO, false)) {
        intent.removeExtra(ShieldContract.EXTRA_OPEN_KMO)
        return@Function true
      }
      return@Function false
    }
  }
}

private const val ICON_PX = 96
