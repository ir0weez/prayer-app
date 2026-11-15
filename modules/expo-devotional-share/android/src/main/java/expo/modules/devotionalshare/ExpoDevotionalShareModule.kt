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
 *
 * The spec arrives as ONE JSON STRING (v538), parsed by
 * [ShareSpec.parse]. It used to arrive as a Map<String, Any?>,
 * and the first device run threw "[renderVideo] Cannot convert
 * '[object Object]' to a Kotlin type": expo-modules-core's Any
 * converter recurses into nested objects with no null handling,
 * so the story layout's nested null (layout.ghostBottom) failed
 * the conversion of the whole argument. A String crosses with
 * no conversion at all — the class of failure is gone, not
 * patched around.
 */
class ExpoDevotionalShareModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoDevotionalShare")

    AsyncFunction("renderCardPng") { specJson: String ->
      ShareCardRenderer.renderStill(ShareSpec.parse(specJson))
    }

    AsyncFunction("renderVideo") { specJson: String ->
      ShareVideoRenderer.render(ShareSpec.parse(specJson))
    }
  }
}
