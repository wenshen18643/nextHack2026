package com.sentinel.wallet

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.accessibilityservice.AccessibilityService
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

/**
 * Launcher activity for Sentinel Wallet Shield.
 *
 * It surfaces whether the accessibility service and overlay permission are
 * active, lets the user configure the Sentinel API base URL, and opens the
 * bundled Mock TNG transfer screen for a self-contained demo.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var apiBaseInput: EditText

    private val overlayLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        updateStatus()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.status_text)
        apiBaseInput = findViewById(R.id.api_base_input)

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        apiBaseInput.setText(prefs.getString(API_BASE_KEY, DEFAULT_API_BASE))

        findViewById<Button>(R.id.btn_enable_accessibility).setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            Toast.makeText(this, R.string.toast_enable_sentinel, Toast.LENGTH_LONG).show()
        }

        findViewById<Button>(R.id.btn_grant_overlay).setOnClickListener {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                overlayLauncher.launch(intent)
            } else {
                Toast.makeText(this, R.string.toast_overlay_already, Toast.LENGTH_SHORT).show()
            }
        }

        findViewById<Button>(R.id.btn_save_api_base).setOnClickListener {
            val url = apiBaseInput.text.toString().trim()
            prefs.edit().putString(API_BASE_KEY, url).apply()
            Toast.makeText(this, R.string.toast_api_saved, Toast.LENGTH_SHORT).show()
        }

        findViewById<Button>(R.id.btn_open_demo).setOnClickListener {
            startActivity(Intent(this, MockTngActivity::class.java))
        }

        updateStatus()
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    private fun updateStatus() {
        val accessibilityEnabled = isAccessibilityServiceEnabled()
        val overlayEnabled = Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
            Settings.canDrawOverlays(this)

        statusText.text = when {
            accessibilityEnabled && overlayEnabled ->
                getString(R.string.status_protected)
            accessibilityEnabled ->
                getString(R.string.status_no_overlay)
            else ->
                getString(R.string.status_disabled)
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val manager = getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val services = manager.getEnabledAccessibilityServiceList(AccessibilityService.FEEDBACK_ALL_MASK)
        return services.any { it.resolveInfo.serviceInfo.packageName == packageName }
    }

    companion object {
        const val PREFS_NAME = "sentinel_prefs"
        const val API_BASE_KEY = "api_base"
        const val DEFAULT_API_BASE = "https://next-hack2026.vercel.app"
    }
}
