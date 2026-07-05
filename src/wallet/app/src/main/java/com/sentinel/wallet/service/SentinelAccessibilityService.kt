package com.sentinel.wallet.service

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.sentinel.wallet.model.Transfer
import com.sentinel.wallet.net.SentinelApi
import com.sentinel.wallet.overlay.WarningOverlay
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Android accessibility service that watches the TNG eWallet app (and the
 * bundled Mock TNG activity), reads transfer confirmation screens, and overlays
 * a Sentinel warning before the user completes a transfer.
 */
class SentinelAccessibilityService : AccessibilityService() {

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.Main + serviceJob)
    private val adapter = TngScreenAdapter()
    private var overlay: WarningOverlay? = null
    private var lastTransfer: Transfer? = null
    private var lastScreenedAt = 0L

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType !in WATCHED_EVENTS) return

        val root = rootInActiveWindow ?: return
        val packageName = root.packageName?.toString() ?: return

        if (!isTargetPackage(packageName)) {
            overlay?.remove()
            overlay = null
            return
        }

        if (packageName == TNG_PACKAGE) {
            logNodeTree(root)
        }

        val transfer = adapter.readTransfer(root) ?: return
        if (transfer.payee.isBlank() || transfer.amount <= 0.0) {
            Log.d(TAG, "TNG screen detected but no transfer extracted. Dump above can be used to tune adapter.")
            return
        }
        if (transfer == lastTransfer && now() - lastScreenedAt < DEBOUNCE_MS) return

        lastTransfer = transfer
        lastScreenedAt = now()
        screenTransfer(transfer)
    }

    private fun logNodeTree(root: AccessibilityNodeInfo) {
        val builder = StringBuilder()
        builder.appendLine("--- TNG accessibility dump ---")
        dumpNode(root, builder, 0)
        builder.appendLine("--- end dump ---")
        Log.d(TAG, builder.toString())
    }

    private fun dumpNode(node: AccessibilityNodeInfo, builder: StringBuilder, depth: Int) {
        val indent = "  ".repeat(depth)
        val text = node.text?.toString() ?: ""
        val className = node.className?.toString() ?: ""
        val viewId = node.viewIdResourceName ?: ""
        builder.appendLine("$indent[$className] id=$viewId text=\"$text\"")
        for (index in 0 until node.childCount) {
            node.getChild(index)?.let { dumpNode(it, builder, depth + 1) }
        }
    }

    private fun screenTransfer(transfer: Transfer) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val baseUrl = prefs.getString(API_BASE_KEY, DEFAULT_API_BASE) ?: DEFAULT_API_BASE

        overlay?.remove()
        overlay = WarningOverlay(this).also { it.showLoading() }

        serviceScope.launch {
            val result = SentinelApi(baseUrl).screen(transfer)
            overlay?.showResult(
                result,
                onCancel = { /* Dismissed; user must manually cancel inside TNG. */ },
                onProceed = { /* Dismissed; user may continue the TNG flow. */ }
            )
        }
    }

    private fun isTargetPackage(packageName: String): Boolean {
        return packageName == TNG_PACKAGE || packageName == BuildConfig.APPLICATION_ID
    }

    override fun onInterrupt() {
        // Nothing to clean up mid-event.
    }

    override fun onDestroy() {
        overlay?.remove()
        serviceScope.cancel()
        super.onDestroy()
    }

    private fun now(): Long = System.currentTimeMillis()

    companion object {
        private const val TAG = "SentinelAccessibility"
        private const val TNG_PACKAGE = "com.tngdigital.ewallet"
        private const val PREFS_NAME = "sentinel_prefs"
        private const val API_BASE_KEY = "api_base"
        private const val DEFAULT_API_BASE = "https://next-hack2026.vercel.app"
        private const val DEBOUNCE_MS = 3_000L
        private val WATCHED_EVENTS = setOf(
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED,
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        )
    }
}
