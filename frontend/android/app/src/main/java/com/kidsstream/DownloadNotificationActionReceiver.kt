package com.kidsstream

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class DownloadNotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == DownloadNotificationModule.ACTION_CANCEL) {
            val videoId = intent.getStringExtra("videoId") ?: return

            // Immediately cancel the notification from the shade
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.cancel(videoId.hashCode())

            // Disseminate event to React Native JS layer
            DownloadNotificationModule.sendEvent("onNotificationCancelDownload", videoId)
        }
    }
}

