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
 *
 * v539 adds two things. The render reports its progress as it
 * goes (onRenderProgress: frames done of the whole — a flat
 * pair of numbers, the shape events in this app already cross
 * with) so the working chip can show a percentage instead of
 * sitting mute. And probeVideoAudio answers whether a made
 * MP4 actually carries its audio: the v538 device run finished
 * and saved a video with NO audio in it, so neither a fresh
 * render nor a cached file is trusted on its looks anymore —
 * the renderer probes its own output before calling it done,
 * and the Share flow probes a cached video before reusing it.
 *
 * v545: probeVideoAudio also asks the timeline question —
 * whether the file's video starts at ~0 and runs the length
 * its own audio runs. The v544 device run saved a video that
 * sounded right and claimed 37:56:41 for a 1:29 devotional
 * (its frames carried the phone-uptime timestamps the
 * encoder had stamped them with), so a cached file is no
 * more trusted on its length than on its sound.
 */
class ExpoDevotionalShareModule : Module() {
  companion object {
    private var moduleInstance: ExpoDevotionalShareModule? = null

    /** Tell JS (if alive) how far a video render has got:
     * frames committed of the frame total. */
    fun sendRenderProgress(done: Int, total: Int) {
      moduleInstance?.sendEvent(
        "onRenderProgress",
        mapOf("done" to done, "total" to total),
      )
    }
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoDevotionalShare")

    Events("onRenderProgress")

    OnCreate {
      moduleInstance = this@ExpoDevotionalShareModule
    }

    OnDestroy {
      if (moduleInstance === this@ExpoDevotionalShareModule) moduleInstance = null
    }

    AsyncFunction("renderCardPng") { specJson: String ->
      ShareCardRenderer.renderStill(ShareSpec.parse(specJson))
    }

    AsyncFunction("renderVideo") { specJson: String ->
      ShareVideoRenderer.render(ShareSpec.parse(specJson)) { done, total ->
        sendRenderProgress(done, total)
      }
    }

    AsyncFunction("probeVideoAudio") { path: String ->
      ShareAudioProbe.hasAudibleTrack(path, 0L) &&
        ShareAudioProbe.hasSaneDuration(path, 0L)
    }
  }
}
