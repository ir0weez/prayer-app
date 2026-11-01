package expo.modules.staybusyshield

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * After a reboot, the watcher restarts itself — under exactly the
 * conditions the service enforces (master on, at least one app
 * shielded, usage access granted). Reads settings only; a boot is
 * not an event this feature records anywhere.
 */
class ShieldBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
    ShieldWatcherService.startIfWanted(context)
  }
}
