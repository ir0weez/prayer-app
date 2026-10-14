package expo.modules.appicon

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoAppIconModule : Module() {

  companion object {
    // Must match plugins/with-app-icons.js alias naming.
    private val ICON_IDS = listOf(
      "ember", "ocean", "retro", "sketch", "watercolor",
      "aurora", "neon", "liquid", "gold"
    )
  }

  private fun aliasComponentName(ctx: Context, iconId: String): ComponentName {
    return if (iconId == "original" || iconId == "default") {
      ComponentName(ctx.packageName, "${ctx.packageName}.MainActivity")
    } else {
      val alias = "Icon" + iconId.replaceFirstChar { it.uppercase() }
      ComponentName(ctx.packageName, "${ctx.packageName}.$alias")
    }
  }

  private fun allComponents(ctx: Context): List<ComponentName> {
    val list = mutableListOf(
      ComponentName(ctx.packageName, "${ctx.packageName}.MainActivity")
    )
    for (id in ICON_IDS) {
      list.add(aliasComponentName(ctx, id))
    }
    return list
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoAppIcon")

    AsyncFunction("setAppIcon") { iconId: String ->
      val ctx = appContext.reactContext ?: throw Exception("No react context")
      val pm = ctx.packageManager
      val target = aliasComponentName(ctx, iconId)
      for (component in allComponents(ctx)) {
        val state = if (component == target) {
          PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } else {
          PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        }
        pm.setComponentEnabledSetting(
          component,
          state,
          PackageManager.DONT_KILL_APP
        )
      }
    }

    AsyncFunction("getAppIcon") { ->
      val ctx = appContext.reactContext ?: return@AsyncFunction "original"
      val pm = ctx.packageManager
      for (id in ICON_IDS) {
        val component = aliasComponentName(ctx, id)
        if (pm.getComponentEnabledSetting(component) ==
          PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        ) {
          return@AsyncFunction id
        }
      }
      return@AsyncFunction "original"
    }
  }
}
