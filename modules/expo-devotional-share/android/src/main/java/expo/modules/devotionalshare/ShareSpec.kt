package expo.modules.devotionalshare

/**
 * The spec the JS model (lib/devotional-share.ts) hands the
 * maker: a plain map of numbers, strings and nested maps. Every
 * value the painter and the renderer draw by arrives here — the
 * native side pins no layout, colour or timing of its own.
 */
class ShareSpec(private val map: Map<String, Any?>) {
  fun str(key: String): String? = map[key] as? String

  fun reqStr(key: String): String =
    str(key) ?: throw IllegalArgumentException("share spec is missing '$key'")

  fun dbl(key: String, default: Double = 0.0): Double =
    (map[key] as? Number)?.toDouble() ?: default

  /** The number at key, or null when the JS side sent null (or
   * nothing) — the card model's one nullable measure, the story
   * ghost's bottom anchor (absent = centred). */
  fun dblOrNull(key: String): Double? = (map[key] as? Number)?.toDouble()

  fun int(key: String, default: Int = 0): Int =
    (map[key] as? Number)?.toInt() ?: default

  @Suppress("UNCHECKED_CAST")
  fun child(key: String): ShareSpec? =
    (map[key] as? Map<*, *>)?.let { ShareSpec(it as Map<String, Any?>) }

  fun dblList(key: String): List<Double> =
    (map[key] as? List<*>)?.mapNotNull { (it as? Number)?.toDouble() } ?: emptyList()
}
