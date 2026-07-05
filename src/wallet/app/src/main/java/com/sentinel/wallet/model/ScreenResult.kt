package com.sentinel.wallet.model

/**
 * Verdict returned by the Sentinel /api/screen endpoint.
 *
 * @property advice One of "allow", "warn", or "block".
 * @property reason Human-readable explanation shown to the user.
 * @property unavailable True when the network call failed and the app fell open to avoid blocking legitimate payments.
 */
data class ScreenResult(
    val advice: String,
    val reason: String,
    val unavailable: Boolean = false
)
