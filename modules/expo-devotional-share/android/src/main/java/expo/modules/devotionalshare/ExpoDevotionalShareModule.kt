package expo.modules.devotionalshare

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The devotional share maker (v536): draws the share card model
 * (lib/devotional-share.ts) to PNG stills, and renders the
 * living card muxed with the devotional's own audio to MP4.
 * Both functions are async — an encode runs as long as it runs —
 * and both throw on any failure, so the JS side can say plainly
 * that a share could not be made instead of sharing a fragment.
 */
class ExpoDevotionalShareModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoDevotionalShare")

    AsyncFunction("renderCardPng") { spec: Map<String, Any?> ->
      ShareCardRenderer.renderStill(ShareSpec(spec))
    }

    AsyncFunction("renderVideo") { spec: Map<String, Any?> ->
      ShareVideoRenderer.render(ShareSpec(spec))
    }
  }
}
