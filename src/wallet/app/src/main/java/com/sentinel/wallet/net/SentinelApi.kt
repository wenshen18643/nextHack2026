package com.sentinel.wallet.net

import com.sentinel.wallet.model.ScreenResult
import com.sentinel.wallet.model.Transfer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Screens a transfer against the existing Sentinel backend.
 *
 * The endpoint contract is identical to the browser extension: POST
 * `{payee, amount, memo}` to `/api/screen` and receive `{advice, reason}`.
 * Any network or HTTP failure returns an "allow" result so a down service
 * never becomes a denial of service on the user's own money.
 *
 * @param baseUrl Scheme, host, and optional port of the Sentinel deployment.
 */
class SentinelApi(private val baseUrl: String) {

    /**
     * POSTs the transfer to /api/screen and parses the verdict.
     *
     * @param transfer The wallet transfer extracted from the accessibility tree.
     * @return A [ScreenResult] from the server, or a fail-open permissive result on error.
     */
    suspend fun screen(transfer: Transfer): ScreenResult = withContext(Dispatchers.IO) {
        try {
            val url = URL("${baseUrl.trimEnd('/')}/api/screen")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            connection.readTimeout = READ_TIMEOUT_MS

            val body = JSONObject().apply {
                put("payee", transfer.payee)
                put("amount", transfer.amount)
                put("memo", transfer.memo)
            }.toString()

            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

            if (connection.responseCode !in SUCCESS_CODES) {
                return@withContext unavailableResult()
            }

            val responseText = connection.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(responseText)
            ScreenResult(
                advice = json.optString("advice", ADVICE_ALLOW),
                reason = json.optString("reason", REASON_UNAVAILABLE)
            )
        } catch (_: Exception) {
            unavailableResult()
        }
    }

    private fun unavailableResult(): ScreenResult =
        ScreenResult(ADVICE_ALLOW, REASON_UNAVAILABLE, unavailable = true)

    companion object {
        private const val CONNECT_TIMEOUT_MS = 10_000
        private const val READ_TIMEOUT_MS = 10_000
        private val SUCCESS_CODES = setOf(200, 201)
        private const val ADVICE_ALLOW = "allow"
        private const val REASON_UNAVAILABLE = "Screening unavailable."
    }
}
