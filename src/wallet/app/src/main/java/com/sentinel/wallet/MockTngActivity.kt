package com.sentinel.wallet

import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * A fake TNG eWallet transfer confirmation screen.
 *
 * The accessibility service reads this screen using the same adapter that
 * handles the real TNG app, so the full warning flow can be demonstrated on
 * a device that does not have TNG installed.
 */
class MockTngActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_mock_tng)

        findViewById<Button>(R.id.confirm_button).setOnClickListener {
            Toast.makeText(this, R.string.mock_sent_toast, Toast.LENGTH_SHORT).show()
            finish()
        }
    }
}
