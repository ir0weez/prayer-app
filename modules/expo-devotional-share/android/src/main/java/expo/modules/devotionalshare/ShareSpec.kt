package expo.modules.devotionalshare

import org.json.JSONArray
import org.json.JSONObject

/**
 * The spec the JS model (lib/devotional-share.ts) hands the
 * maker: numbers, strings, nested objects and one number list.
 * Every value the painter and the renderer draw by arrives
 * here — the native side pins no layout, colour or timing of
 * its own.
 *
 * Since v538 the spec crosses the JS→native boundary as a JSON
 * string and is parsed here with org.json (see
 * ExpoDevotionalShareModule for why the old Map<String, Any?>
 * argument could not carry it). The accessors keep the exact
 * semantics the map-backed version had: a JSON null and an
 * absent key both read as "not there", numbers widen through
 * Number, and a nested object reads through [child].
 */
class ShareSpec private constructor(private val json: JSONObject) {
  companion object {
    /** Parses the spec JSON the JS wrapper stringified. Throws
     * on malformed text — the maker fails plainly, as it does
     * for any other bad spec. */
    fun parse(specJson: String): ShareSpec = ShareSpec(JSONObject(specJson))
  }

  /** The raw value at key: null when the key is absent OR the
   * JS side sent null (JSONObject.NULL is not a String, a
   * Number or a JSONObject, so every typed read below treats
   * the two alike — the old map's semantics exactly). */
  private fun raw(key: String): Any? = if (json.has(key)) json.opt(key) else null

  fun str(key: String): String? = raw(key) as? String

  fun reqStr(key: String): String =
    str(key) ?: throw IllegalArgumentException("share spec is missing '$key'")

  fun dbl(key: String, default: Double = 0.0): Double =
    (raw(key) as? Number)?.toDouble() ?: default

  /** The number at key, or null when the JS side sent null (or
   * nothing) — the card model's one nullable measure, the story
   * ghost's bottom anchor (absent = centred). This null is the
   * value the old Map conversion could not carry nested; as
   * JSON text it is unremarkable. */
  fun dblOrNull(key: String): Double? = (raw(key) as? Number)?.toDouble()

  fun int(key: String, default: Int = 0): Int =
    (raw(key) as? Number)?.toInt() ?: default

  fun child(key: String): ShareSpec? =
    (raw(key) as? JSONObject)?.let { ShareSpec(it) }

  fun dblList(key: String): List<Double> {
    val arr = raw(key) as? JSONArray ?: return emptyList()
    return (0 until arr.length()).mapNotNull { (arr.opt(it) as? Number)?.toDouble() }
  }
}
