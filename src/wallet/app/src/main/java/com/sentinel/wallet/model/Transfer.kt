package com.sentinel.wallet.model

/**
 * The three fields the Sentinel screening endpoint needs from any wallet
 * transfer screen: who receives the money, how much, and any free-text note.
 *
 * @property payee Recipient name, DuitNow ID, or account identifier shown on the confirmation screen.
 * @property amount Transfer amount in Malaysian Ringgit as a plain number.
 * @property memo Optional reference, note, or description attached to the transfer.
 */
data class Transfer(
    val payee: String,
    val amount: Double,
    val memo: String = ""
)
