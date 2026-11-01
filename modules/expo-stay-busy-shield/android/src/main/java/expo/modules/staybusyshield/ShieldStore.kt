package expo.modules.staybusyshield

import android.app.AppOpsManager
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.Process
import android.provider.Settings

/**
 * The shield's shared constants and its SETTINGS mirror.
 *
 * The no-history law (Jonathan's rule for the whole Keep Me Occupied
 * feature, extended to the shield in v401): nothing about triggers
 * or choices is ever persisted — no event log, no counters, no
 * last-triggered timestamps, anywhere. The ONLY thing this store
 * holds is settings: the master toggle and the shielded-apps set,
 * mirrored into SharedPreferences because the watcher service
 * cannot read the app's AsyncStorage. Grace windows live in the
 * service's memory and die with it, by design.
 */
object ShieldContract {
  const val PREFS_NAME = "stay_busy_shield"
  const val KEY_MASTER_ENABLED = "master_enabled"
  const val KEY_SHIELDED_PACKAGES = "shielded_packages"

  /** Set on the launch intent when the prompt's "Occupy me" is tapped. */
  const val EXTRA_OPEN_KMO = "expo.modules.staybusyshield.EXTRA_OPEN_KMO"

  /** How long Continue rests the shield for one app (in memory only). */
  const val GRACE_MS: Long = 60L * 60L * 1000L

  const val NOTIFICATION_ID = 9101
  const val CHANNEL_ID = "stay-busy-shield"
}

object ShieldStore {
  private fun prefs(ctx: Context): SharedPreferences =
    ctx.getSharedPreferences(ShieldContract.PREFS_NAME, Context.MODE_PRIVATE)

  fun isMasterEnabled(ctx: Context): Boolean =
    prefs(ctx).getBoolean(ShieldContract.KEY_MASTER_ENABLED, false)

  fun shieldedPackages(ctx: Context): Set<String> =
    prefs(ctx).getStringSet(ShieldContract.KEY_SHIELDED_PACKAGES, emptySet()) ?: emptySet()

  /** The only write this feature ever makes natively: settings in, settings out. */
  fun writeSettings(ctx: Context, enabled: Boolean, packages: Collection<String>) {
    prefs(ctx).edit()
      .putBoolean(ShieldContract.KEY_MASTER_ENABLED, enabled)
      .putStringSet(ShieldContract.KEY_SHIELDED_PACKAGES, packages.toSet())
      .apply()
  }

  fun hasUsageAccess(ctx: Context): Boolean {
    val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  fun hasOverlayPermission(ctx: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx)
}
