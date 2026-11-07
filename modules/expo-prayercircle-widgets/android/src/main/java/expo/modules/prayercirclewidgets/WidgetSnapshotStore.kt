package expo.modules.prayercirclewidgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import org.json.JSONObject

/**
 * The one snapshot the widgets read: a single JSON document in a
 * SharedPreferences file this module owns. JS (lib/widget-push.tsx)
 * serializes lib/widget-snapshots' snapshots (seven sections
 * since v462's Daily Breakdown) plus the deep-link scheme into
 * it via ExpoPrayerCircleWidgetsModule; the providers
 * parse it with org.json at render time. Absent or unparseable =
 * every provider draws its quiet face — the layouts' defaults.
 */
object WidgetSnapshotStore {
  const val PREFS_NAME = "prayercircle_widgets"
  private const val KEY_SNAPSHOT = "snapshot_json"

  fun save(context: Context, json: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_SNAPSHOT, json)
      .apply()
  }

  fun read(context: Context): JSONObject? {
    val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_SNAPSHOT, null)
      ?: return null
    return try {
      JSONObject(raw)
    } catch (_: Exception) {
      null
    }
  }

  /** Re-render every placed instance of every provider, now. */
  fun refreshAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    for (kind in WidgetKind.values()) {
      val ids = manager.getAppWidgetIds(ComponentName(context, kind.providerClass))
      if (ids.isEmpty()) continue
      @Suppress("UNCHECKED_CAST")
      val provider = kind.providerClass.getDeclaredConstructor().newInstance()
      provider.onUpdate(context, manager, ids)
    }
  }
}
