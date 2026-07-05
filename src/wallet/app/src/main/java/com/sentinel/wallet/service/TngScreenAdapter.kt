package com.sentinel.wallet.service

import android.view.accessibility.AccessibilityNodeInfo
import com.sentinel.wallet.model.Transfer

/**
 * Reads a wallet transfer confirmation from an Android accessibility node tree.
 *
 * The adapter is designed against TNG eWallet's confirmation screen but also
 * works with the bundled Mock TNG activity. It pattern-matches visible text
 * using the same label vocabulary as the browser extension's site adapters.
 */
class TngScreenAdapter {

    /**
     * Walks the node tree and returns a [Transfer] when a payee and amount can
     * be resolved; returns null when the screen does not look like a transfer
     * confirmation.
     *
     * @param root The root node of the active window.
     */
    fun readTransfer(root: AccessibilityNodeInfo): Transfer? {
        val texts = mutableListOf<String>()
        collectText(root, texts)

        val payee = findValueAfterLabel(texts, PAYEE_LABELS) ?: ""
        val amountText = findValueAfterLabel(texts, AMOUNT_LABELS) ?: findLargestRinggitAmount(texts)
        val amount = parseAmount(amountText)
        val memo = findValueAfterLabel(texts, MEMO_LABELS) ?: ""

        if (payee.isBlank() && amount <= 0.0) return null
        return Transfer(payee, amount, memo)
    }

    private fun collectText(node: AccessibilityNodeInfo, out: MutableList<String>) {
        node.text?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let { out.add(it) }
        for (index in 0 until node.childCount) {
            node.getChild(index)?.let { collectText(it, out) }
        }
    }

    private fun findValueAfterLabel(texts: List<String>, labels: Set<String>): String? {
        for (index in texts.indices) {
            if (normalize(texts[index]) in labels) {
                for (scan in index + 1 until minOf(index + LABEL_SCAN_AHEAD, texts.size)) {
                    val candidate = texts[scan].trim()
                    if (candidate.isNotEmpty() && normalize(candidate) !in labels) {
                        return candidate
                    }
                }
            }
        }
        return null
    }

    private fun findLargestRinggitAmount(texts: List<String>): String {
        var largestAmount = 0.0
        var largestMatch = ""
        for (text in texts) {
            for (match in RINGGIT_PATTERN.findAll(text)) {
                val value = parseAmount(match.groupValues[1])
                if (value > largestAmount) {
                    largestAmount = value
                    largestMatch = match.value
                }
            }
        }
        return largestMatch
    }

    private fun parseAmount(text: String?): Double {
        if (text.isNullOrBlank()) return 0.0
        val digits = text.replace(Regex("[^0-9.]"), "")
        return digits.toDoubleOrNull() ?: 0.0
    }

    private fun normalize(text: String): String {
        return text.lowercase()
            .replace(Regex("\\s+"), " ")
            .replace(Regex("[:*\\s]+$"), "")
    }

    companion object {
        private const val LABEL_SCAN_AHEAD = 4

        private val RINGGIT_PATTERN =
            Regex("""(?:RM|MYR)\s*([0-9][\d,]*(?:\.\d{1,2})?)""", RegexOption.IGNORE_CASE)

        private val PAYEE_LABELS = setOf(
            "transfer to",
            "recipient name",
            "recipient",
            "payee",
            "payee name",
            "beneficiary name",
            "beneficiary",
            "account holder name",
            "to account",
            "duitnow id",
            "penerima",
            "nama penerima"
        )

        private val AMOUNT_LABELS = setOf(
            "amount",
            "transfer amount",
            "transaction amount",
            "payment amount",
            "total amount",
            "you are paying",
            "total",
            "amaun",
            "jumlah"
        )

        private val MEMO_LABELS = setOf(
            "reference",
            "payment reference",
            "notes",
            "note",
            "description",
            "memo",
            "remarks",
            "recipient reference",
            "rujukan",
            "catatan"
        )
    }
}
