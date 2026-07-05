package com.sentinel.wallet.overlay

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.sentinel.wallet.R
import com.sentinel.wallet.model.ScreenResult

/**
 * Draws the Sentinel warning card over another app using a system alert window.
 *
 * The overlay shows a spinner while the screening request is in flight, then
 * swaps to a result card with Cancel / Send anyway actions. It never blocks or
 * automates the underlying wallet; the user must still make the final decision.
 */
class WarningOverlay(private val context: Context) {

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private var currentView: View? = null

    /**
     * Shows a centered spinner with the "AI is checking this transfer…" message.
     */
    fun showLoading() {
        remove()
        val view = LayoutInflater.from(context).inflate(R.layout.overlay_warning, null)
        view.findViewById<LinearLayout>(R.id.card_result).visibility = View.GONE
        view.findViewById<ProgressBar>(R.id.progress).visibility = View.VISIBLE
        view.findViewById<TextView>(R.id.status_text).apply {
            visibility = View.VISIBLE
            setText(R.string.overlay_checking)
        }
        attach(view)
    }

    /**
     * Shows the screening verdict and action buttons.
     *
     * @param result The verdict from the Sentinel backend.
     * @param onCancel Called when the user taps "Cancel transfer".
     * @param onProceed Called when the user taps "Send anyway".
     */
    fun showResult(result: ScreenResult, onCancel: () -> Unit, onProceed: () -> Unit) {
        remove()
        val view = LayoutInflater.from(context).inflate(R.layout.overlay_warning, null)
        view.findViewById<ProgressBar>(R.id.progress).visibility = View.GONE
        view.findViewById<TextView>(R.id.status_text).visibility = View.GONE

        val card = view.findViewById<LinearLayout>(R.id.card_result)
        card.visibility = View.VISIBLE

        val badge = view.findViewById<TextView>(R.id.badge)
        val reason = view.findViewById<TextView>(R.id.reason)
        val cancelButton = view.findViewById<Button>(R.id.btn_cancel)
        val proceedButton = view.findViewById<Button>(R.id.btn_proceed)

        if (result.advice == ADVICE_BLOCK) {
            badge.setBackgroundResource(R.drawable.badge_block)
            badge.setText(R.string.overlay_badge_block)
            proceedButton.visibility = View.GONE
        } else {
            badge.setBackgroundResource(R.drawable.badge_warn)
            badge.setText(R.string.overlay_badge_warn)
            proceedButton.visibility = View.VISIBLE
        }

        reason.text = result.reason.ifBlank {
            view.context.getString(R.string.overlay_default_reason)
        }

        cancelButton.setOnClickListener {
            remove()
            onCancel()
        }
        proceedButton.setOnClickListener {
            remove()
            onProceed()
        }

        attach(view)
    }

    /**
     * Removes the overlay from the window manager if it is currently attached.
     */
    fun remove() {
        currentView?.let { view ->
            try {
                windowManager.removeView(view)
            } catch (_: IllegalArgumentException) {
                // View was already removed.
            }
            currentView = null
        }
    }

    private fun attach(view: View) {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
        }
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            type,
            WindowManager.LayoutParams.FLAG_DIM_BEHIND,
            PixelFormat.TRANSLUCENT
        ).apply {
            dimAmount = DIM_AMOUNT
            gravity = Gravity.CENTER
        }
        windowManager.addView(view, params)
        currentView = view
    }

    companion object {
        private const val ADVICE_BLOCK = "block"
        private const val DIM_AMOUNT = 0.65f
    }
}
