package com.kidsstream

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.os.Build
import androidx.core.app.NotificationCompat
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class VideoDownloadService : Service() {
    companion object {
        const val ACTION_START = "com.kidsstream.START_VIDEO_DOWNLOAD"
        private const val CHANNEL_ID = "kiddotube_download_service"
        private const val NOTIFICATION_ID = 7811
        private const val BUFFER_SIZE = 64 * 1024
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action != ACTION_START) return START_STICKY

        val videoId = intent.getStringExtra("videoId") ?: return START_NOT_STICKY
        val title = intent.getStringExtra("title") ?: videoId
        val url = intent.getStringExtra("videoUrl")?.split("|||")?.firstOrNull()
            ?: return START_NOT_STICKY

        createChannel()
        startForeground(NOTIFICATION_ID, notification(title, 0, "Starting..."))
        Thread {
            download(videoId, title, url)
        }.start()
        return START_STICKY
    }

    private fun download(videoId: String, title: String, url: String) {
        val dir = File(filesDir, "downloads").apply { mkdirs() }
        val tmp = File(dir, "$videoId.tmp")
        val target = File(dir, "$videoId.mp4")
        var connection: HttpURLConnection? = null

        try {
            var offset = if (tmp.exists()) tmp.length() else 0L
            var completed = false
            var lastError: Exception? = null

            for (attempt in 0 until 4) {
                try {
                    connection = (URL(url).openConnection() as HttpURLConnection).apply {
                        connectTimeout = 30_000
                        readTimeout = 60_000
                        instanceFollowRedirects = true
                        setRequestProperty("User-Agent", "KiddoTube/1.0 (Android)")
                        setRequestProperty("Accept", "*/*")
                        if (offset > 0) setRequestProperty("Range", "bytes=$offset-")
                        connect()
                    }

                    val code = connection!!.responseCode
                    if (code != 200 && code != 206) {
                        throw java.io.IOException("Download server returned HTTP $code")
                    }
                    if (offset > 0 && code == 200) {
                        offset = 0
                        tmp.delete()
                    }

                    val expected = connection!!.contentLengthLong.let {
                        if (code == 206 && it > 0) it + offset else it
                    }
                    connection!!.inputStream.use { input ->
                        FileOutputStream(tmp, offset > 0).use { output ->
                            val buffer = ByteArray(BUFFER_SIZE)
                            var downloaded = offset
                            var read: Int
                            while (input.read(buffer).also { read = it } != -1) {
                                output.write(buffer, 0, read)
                                downloaded += read
                                val progress = if (expected > 0) {
                                    ((downloaded * 100) / expected).toInt().coerceIn(0, 100)
                                } else 0
                                notificationManager().notify(
                                    NOTIFICATION_ID,
                                    notification(title, progress, "$progress%")
                                )
                                sendProgress(videoId, downloaded, expected, progress)
                            }
                            offset = downloaded
                        }
                    }
                    completed = true
                    break
                } catch (error: Exception) {
                    lastError = error
                    connection?.disconnect()
                    connection = null
                    Thread.sleep((attempt + 1) * 1000L)
                }
            }

            if (!completed || !tmp.exists() || tmp.length() <= 64 * 1024L) {
                throw lastError ?: java.io.IOException("Download did not complete")
            }
            if (target.exists()) target.delete()
            if (!tmp.renameTo(target)) throw java.io.IOException("Could not save downloaded video")

            val result = com.facebook.react.bridge.Arguments.createMap().apply {
                putString("videoId", videoId)
                putString("localUri", "file://${target.absolutePath}")
                putDouble("totalBytes", target.length().toDouble())
            }
            DownloadNotificationModule.sendEvent("onNativeDownloadCompleted", result)
            notificationManager().notify(
                NOTIFICATION_ID,
                notification(title, 100, "Download complete")
            )
        } catch (error: Exception) {
            DownloadNotificationModule.sendEvent(
                "onNativeDownloadFailed",
                com.facebook.react.bridge.Arguments.createMap().apply {
                    putString("videoId", videoId)
                    putString("error", error.message ?: "Download failed")
                }
            )
        } finally {
            connection?.disconnect()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun sendProgress(videoId: String, downloaded: Long, total: Long, progress: Int) {
        DownloadNotificationModule.sendEvent(
            "onNativeDownloadProgress",
            com.facebook.react.bridge.Arguments.createMap().apply {
                putString("videoId", videoId)
                putDouble("downloadedBytes", downloaded.toDouble())
                putDouble("totalBytes", total.toDouble())
                putInt("progress", progress)
                putString("speed", "")
                putString("eta", "")
            }
        )
    }

    private fun notification(title: String, progress: Int, text: String): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(com.kidsstream.R.drawable.ic_download_notification)
            .setContentTitle("Downloading: $title")
            .setContentText(text)
            .setProgress(100, progress, false)
            .setOngoing(progress < 100)
            .setOnlyAlertOnce(true)
            .build()

    private fun notificationManager(): NotificationManager =
        getSystemService(NOTIFICATION_SERVICE) as NotificationManager

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager().createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "KiddoTube downloads",
                    NotificationManager.IMPORTANCE_LOW
                )
            )
        }
    }
}
