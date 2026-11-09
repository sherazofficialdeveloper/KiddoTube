package com.kidsstream

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.RingtoneManager
import android.os.Build
import android.os.StatFs
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionListener
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

class DownloadNotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        // Updated channel IDs so Android OS creates clean channels with proper high importance
        const val CHANNEL_ID = "kiddotube_downloads_v5"
        const val CHANNEL_NAME = "KiddoTube Downloads"
        const val CHANNEL_COMPLETE_ID = "kiddotube_complete_v5"
        const val CHANNEL_COMPLETE_NAME = "KiddoTube Downloads Completed"
        const val ACTION_CANCEL = "com.kidsstream.ACTION_CANCEL_DOWNLOAD"
        const val PERMISSION_REQ_CODE = 8801

        private var instance: DownloadNotificationModule? = null

        fun sendEvent(eventName: String, data: Any?) {
            instance?.reactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, data)
        }
    }

    private val notificationManager: NotificationManager by lazy {
        reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }

    // Active native download jobs
    private val activeDownloadThreads = ConcurrentHashMap<String, Thread>()
    private val activeDownloadCancelled = ConcurrentHashMap<String, AtomicBoolean>()
    private var pendingPermissionPromise: Promise? = null

    init {
        instance = this
        createNotificationChannels()
    }

    override fun getName(): String = "DownloadNotificationModule"

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // 1. In-progress download channel: High importance for visible shade & status bar display
            val progressChannel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Shows real-time download progress for KiddoTube videos"
                setShowBadge(true)
                enableVibration(false)
                setSound(null, null) // Silent updates to avoid spamming alert tones during progress ticks
            }
            notificationManager.createNotificationChannel(progressChannel)

            // 2. Completed channel: High importance with alert sound & vibration
            val completeChannel = NotificationChannel(
                CHANNEL_COMPLETE_ID,
                CHANNEL_COMPLETE_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts when a video download has finished and is ready for offline playback"
                setShowBadge(true)
                enableVibration(true)
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                    null
                )
            }
            notificationManager.createNotificationChannel(completeChannel)
        }
    }

    private fun canPostNotifications(): Boolean {
        val managerCompat = NotificationManagerCompat.from(reactContext)
        if (!managerCompat.areNotificationsEnabled()) {
            return false
        }
        return if (Build.VERSION.SDK_INT >= 33) {
            ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    private fun getAppIcon(): Int {
        return R.drawable.ic_download_notification
    }

    private fun formatSize(bytes: Double): String {
        val mb = bytes / (1024.0 * 1024.0)
        return if (mb >= 1000.0) {
            String.format(Locale.US, "%.1f GB", mb / 1024.0)
        } else {
            String.format(Locale.US, "%.1f MB", mb)
        }
    }

    private fun getDownloadsDir(): File {
        val dir = File(reactContext.filesDir, "downloads")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    // ==========================================
    // NOTIFICATION PERMISSION APIS
    // ==========================================

    @ReactMethod
    fun checkNotificationPermission(promise: Promise) {
        try {
            val areEnabled = NotificationManagerCompat.from(reactContext).areNotificationsEnabled()
            val hasPostPermission = if (Build.VERSION.SDK_INT >= 33) {
                ContextCompat.checkSelfPermission(
                    reactContext,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }

            val map = Arguments.createMap().apply {
                putBoolean("granted", areEnabled && hasPostPermission)
                putBoolean("areNotificationsEnabled", areEnabled)
                putBoolean("hasPostPermission", hasPostPermission)
                putBoolean("needsRuntimeRequest", Build.VERSION.SDK_INT >= 33 && !hasPostPermission)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_PERMISSION_CHECK", e.message)
        }
    }

    @ReactMethod
    fun requestNotificationPermission(promise: Promise) {
        val areEnabled = NotificationManagerCompat.from(reactContext).areNotificationsEnabled()
        if (Build.VERSION.SDK_INT < 33) {
            val map = Arguments.createMap().apply {
                putBoolean("granted", areEnabled)
                putBoolean("blockedBySettings", !areEnabled)
            }
            promise.resolve(map)
            return
        }

        val hasPost = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED

        if (hasPost) {
            val map = Arguments.createMap().apply {
                putBoolean("granted", areEnabled)
                putBoolean("blockedBySettings", !areEnabled)
            }
            promise.resolve(map)
            return
        }

        val activity = reactContext.currentActivity
        if (activity != null) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                PERMISSION_REQ_CODE
            )
        }

        val map = Arguments.createMap().apply {
            putBoolean("granted", false)
            putBoolean("blockedBySettings", false)
        }
        promise.resolve(map)
    }

    // ==========================================
    // NOTIFICATION SHADE DISPLAY APIS
    // ==========================================

    @ReactMethod
    fun showProgress(
        id: String,
        title: String,
        downloadedBytes: Double,
        totalBytes: Double,
        progress: Int,
        speedText: String,
        etaText: String
    ) {
        showProgressInternal(id, title, downloadedBytes, totalBytes, progress, speedText, etaText)
    }

    private fun showProgressInternal(
        id: String,
        title: String,
        downloadedBytes: Double,
        totalBytes: Double,
        progress: Int,
        speedText: String,
        etaText: String
    ) {
        if (!canPostNotifications()) return

        val notifId = id.hashCode()
        val clampedProgress = progress.coerceIn(0, 100)
        val downloadedFormatted = formatSize(downloadedBytes)
        val totalFormatted = formatSize(totalBytes)

        val cancelIntent = Intent(reactContext, DownloadNotificationActionReceiver::class.java).apply {
            action = ACTION_CANCEL
            putExtra("videoId", id)
        }
        val cancelPendingIntent = PendingIntent.getBroadcast(
            reactContext,
            notifId,
            cancelIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
        val contentPendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                reactContext,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else null

        val contentText = "$downloadedFormatted / $totalFormatted ($clampedProgress%) • $speedText"

        val builder = NotificationCompat.Builder(reactContext, CHANNEL_ID)
            .setContentTitle("Downloading: $title")
            .setContentText(contentText)
            .setSmallIcon(getAppIcon())
            .setProgress(100, clampedProgress, false)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Cancel Download",
                cancelPendingIntent
            )

        if (etaText.isNotBlank()) {
            builder.setSubText(etaText)
        }
        if (contentPendingIntent != null) {
            builder.setContentIntent(contentPendingIntent)
        }

        try {
            notificationManager.notify(notifId, builder.build())
            android.util.Log.d("DownloadNotification", "Notification displayed for id=$id, progress=$clampedProgress")
        } catch (e: Exception) {
            android.util.Log.e("DownloadNotification", "Failed to notify for id=$id", e)
        }
    }

    @ReactMethod
    fun showCompleted(id: String, title: String, totalBytes: Double) {
        if (!canPostNotifications()) return

        val notifId = id.hashCode()
        val totalFormatted = formatSize(totalBytes)

        val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
        val contentPendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                reactContext,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else null

        val builder = NotificationCompat.Builder(reactContext, CHANNEL_COMPLETE_ID)
            .setContentTitle("Download Complete! 🎉")
            .setContentText("$title ($totalFormatted) is ready for offline playback")
            .setSmallIcon(getAppIcon())
            .setProgress(0, 0, false)
            .setOngoing(false)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        if (contentPendingIntent != null) {
            builder.setContentIntent(contentPendingIntent)
        }

        try {
            notificationManager.notify(notifId, builder.build())
            android.util.Log.d("DownloadNotification", "Completed notification displayed for id=$id")
        } catch (e: Exception) {
            android.util.Log.e("DownloadNotification", "Failed to notify completion for id=$id", e)
        }
    }

    @ReactMethod
    fun showFailed(id: String, title: String, error: String) {
        if (!canPostNotifications()) return
        val notifId = id.hashCode()
        val builder = NotificationCompat.Builder(reactContext, CHANNEL_COMPLETE_ID)
            .setContentTitle("Download Failed ⚠️")
            .setContentText("$title: $error")
            .setSmallIcon(getAppIcon())
            .setProgress(0, 0, false)
            .setOngoing(false)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        try {
            notificationManager.notify(notifId, builder.build())
            android.util.Log.d("DownloadNotification", "Completed notification displayed for id=$id")
        } catch (e: Exception) {
            android.util.Log.e("DownloadNotification", "Failed to notify completion for id=$id", e)
        }
    }

    @ReactMethod
    fun cancelNotification(id: String) {
        try {
            notificationManager.cancel(id.hashCode())
        } catch (e: Exception) {}
    }

    @ReactMethod
    fun cancelAllNotifications() {
        try {
            notificationManager.cancelAll()
        } catch (e: Exception) {}
    }

    // ==========================================
    // REAL FILE DOWNLOAD & STREAMING ENGINE
    // ==========================================

    @ReactMethod
    fun startNativeDownload(
        videoId: String,
        title: String,
        videoUrl: String,
        durationText: String,
        promise: Promise
    ) {
        val serviceIntent = Intent(reactContext, VideoDownloadService::class.java).apply {
            action = VideoDownloadService.ACTION_START
            putExtra("videoId", videoId)
            putExtra("title", title)
            putExtra("videoUrl", videoUrl)
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(reactContext, serviceIntent)
            } else {
                reactContext.startService(serviceIntent)
            }
            promise.resolve(Arguments.createMap().apply {
                putString("videoId", videoId)
                putBoolean("started", true)
            })
        } catch (error: Exception) {
            promise.reject("ERR_START_DOWNLOAD", error.message)
        }
        return

        val dir = getDownloadsDir()
        val finalFile = File(dir, "$videoId.mp4")
        val tmpFile = File(dir, "$videoId.tmp")

        if (finalFile.exists() && finalFile.length() > 64 * 1024) {
            // Already downloaded and valid
            val map = Arguments.createMap().apply {
                putString("videoId", videoId)
                putString("localUri", "file://${finalFile.absolutePath}")
                putDouble("totalBytes", finalFile.length().toDouble())
                putBoolean("isAlreadyCompleted", true)
            }
            promise.resolve(map)
            return
        }

        if (activeDownloadThreads.containsKey(videoId)) {
            android.util.Log.d("DownloadNotification", "Download already in progress for $videoId")
            promise.reject("ERR_ALREADY_DOWNLOADING", "Download already active for $videoId")
            return
        }

        val isCancelled = AtomicBoolean(false)
        activeDownloadCancelled[videoId] = isCancelled
        // Show an ongoing notification before network resolution so a failed
        // connection never looks like a download that started late.
        showProgressInternal(videoId, title, 0.0, 0.0, 0, "Starting...", "")

        val downloadThread = Thread {
            var inputStream: InputStream? = null
            var outputStream: FileOutputStream? = null
            var connection: HttpURLConnection? = null

            try {
                // Support multiple candidate URLs separated by |||
                val candidates = videoUrl.split("|||")
                    .map { it.trim() }
                    .filter { it.isNotBlank() && (it.startsWith("http://") || it.startsWith("https://")) }

                if (candidates.isEmpty()) {
                    throw java.io.FileNotFoundException("No valid downloadable source URL available for $videoId")
                }

                var totalBytes = 0L
                var isResuming = false
                var existingBytes = if (tmpFile.exists()) tmpFile.length() else 0L
                var successfulUrl: String? = null
                var lastHttpError: String? = null

                for (candidateUrl in candidates) {
                    if (isCancelled.get()) break
                    var currentUrl = candidateUrl
                    var redirectHops = 0

                    while (redirectHops < 5 && !isCancelled.get()) {
                        try {
                            val url = URL(currentUrl)
                            val conn = url.openConnection() as HttpURLConnection
                            conn.connectTimeout = 30000
                            conn.readTimeout = 60000
                            conn.instanceFollowRedirects = true
                            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 KiddoTube/1.0")
                            conn.setRequestProperty("Accept", "*/*")
                            conn.setRequestProperty("Connection", "keep-alive")

                            // If we have previous bytes, request resumption
                            if (existingBytes > 0) {
                                conn.setRequestProperty("Range", "bytes=$existingBytes-")
                            }

                            conn.connect()
                            val code = conn.responseCode

                            // Handle HTTP redirects
                            if (code == HttpURLConnection.HTTP_MOVED_PERM || code == HttpURLConnection.HTTP_MOVED_TEMP || code == 307 || code == 308) {
                                val loc = conn.getHeaderField("Location")
                                conn.disconnect()
                                if (!loc.isNullOrBlank()) {
                                    currentUrl = loc
                                    redirectHops++
                                    continue
                                }
                            }

                            if (code == 206) {
                                // Server supports byte-range resumption
                                val len = conn.contentLength.toLong()
                                totalBytes = if (len > 0) existingBytes + len else 0L
                                val contentType = conn.contentType ?: ""
                                val contentRange = conn.getHeaderField("Content-Range") ?: ""
                                val rangeStartsAtExistingBytes =
                                    existingBytes == 0L ||
                                        contentRange.startsWith("bytes $existingBytes-")
                                if (rangeStartsAtExistingBytes &&
                                    !contentType.contains("text/html") &&
                                    !contentType.contains("application/json")) {
                                    inputStream = conn.inputStream
                                    connection = conn
                                    isResuming = true
                                    successfulUrl = currentUrl
                                    break
                                } else if (!rangeStartsAtExistingBytes) {
                                    lastHttpError =
                                        "HTTP 206 returned an unexpected byte range: $contentRange"
                                }
                            } else if (code in 200..299) {
                                // Server returned full content from byte 0
                                totalBytes = conn.contentLength.toLong()
                                val contentType = conn.contentType ?: ""
                                if (!contentType.contains("text/html") &&
                                    !contentType.contains("application/json")) {
                                    inputStream = conn.inputStream
                                    connection = conn
                                    isResuming = false
                                    existingBytes = 0L
                                    successfulUrl = currentUrl
                                    break
                                }
                            } else if (code == 416) {
                                // Range Not Satisfiable: restart from 0
                                conn.disconnect()
                                existingBytes = 0L
                                tmpFile.delete()
                                continue
                            } else {
                                val errBody = try {
                                    conn.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
                                } catch (e: Exception) { "" }
                                lastHttpError = "HTTP $code from $currentUrl: $errBody"
                                android.util.Log.w("DownloadNotification", "Candidate returned $lastHttpError")
                                conn.disconnect()
                                if (code == 429 || code == 500 || code == 502 || code == 503 || code == 504) {
                                    try {
                                        Thread.sleep(1000L * (redirectHops + 1))
                                    } catch (_: InterruptedException) {
                                        Thread.currentThread().interrupt()
                                    }
                                    redirectHops++
                                    continue
                                }
                                break
                            }
                        } catch (netEx: Exception) {
                            lastHttpError = "Network error from $currentUrl: ${netEx.message}"
                            android.util.Log.w("DownloadNotification", lastHttpError)
                            if (redirectHops < 2) {
                                try {
                                    Thread.sleep(1000L * (redirectHops + 1))
                                } catch (_: InterruptedException) {
                                    Thread.currentThread().interrupt()
                                }
                                redirectHops++
                                continue
                            }
                            break
                        }
                    }

                    if (inputStream != null) {
                        break
                    }
                }

                if (inputStream == null) {
                    val finalReason = lastHttpError ?: "Direct video stream not reachable for offline download"
                    android.util.Log.e("DownloadNotification", "All stream candidates failed for $videoId: $finalReason")
                    throw java.io.IOException(finalReason)
                }

                if (totalBytes <= 0) {
                    totalBytes = 25L * 1024 * 1024
                }

                outputStream = FileOutputStream(tmpFile, isResuming)
                val buffer = ByteArray(32 * 1024) // 32KB buffer for fast streaming
                var bytesDownloaded = if (isResuming) existingBytes else 0L
                var lastProgressUpdate = System.currentTimeMillis()
                var lastBytesDownloaded = bytesDownloaded

                // Initial notification trigger immediately on start!
                val startProgress = ((bytesDownloaded.toDouble() / totalBytes.toDouble()) * 100).toInt().coerceIn(0, 100)
                showProgressInternal(videoId, title, bytesDownloaded.toDouble(), totalBytes.toDouble(), startProgress, if (isResuming) "Resuming..." else "Starting...", "Connecting...")

                var bytesRead = -1
                while (inputStream?.read(buffer).also { bytesRead = it ?: -1 } != -1 && !isCancelled.get()) {
                    outputStream.write(buffer, 0, bytesRead)
                    bytesDownloaded += bytesRead

                    val now = System.currentTimeMillis()
                    val timeDiff = now - lastProgressUpdate

                    // Update UI and notification every 300ms
                    if (timeDiff >= 300) {
                        val progressPct = ((bytesDownloaded.toDouble() / totalBytes.toDouble()) * 100).toInt().coerceIn(0, 100)
                        val bytesSinceLast = bytesDownloaded - lastBytesDownloaded
                        val speedBytesPerSec = if (timeDiff > 0) (bytesSinceLast * 1000) / timeDiff else 0L
                        val remainingBytes = Math.max(0L, totalBytes - bytesDownloaded)
                        val etaSec = if (speedBytesPerSec > 0) remainingBytes / speedBytesPerSec else 0L

                        val speedFormatted = if (speedBytesPerSec >= 1024 * 1024) {
                            String.format(Locale.US, "%.1f MB/s", speedBytesPerSec / (1024.0 * 1024.0))
                        } else {
                            String.format(Locale.US, "%d KB/s", speedBytesPerSec / 1024)
                        }

                        val etaFormatted = if (etaSec > 0) "ETA ${etaSec}s" else ""

                        // Update Notification
                        showProgressInternal(
                            videoId,
                            title,
                            bytesDownloaded.toDouble(),
                            totalBytes.toDouble(),
                            progressPct,
                            speedFormatted,
                            etaFormatted
                        )

                        // Emit to React Native for real-time in-app bar synchronization
                        val progressMap = Arguments.createMap().apply {
                            putString("videoId", videoId)
                            putDouble("downloadedBytes", bytesDownloaded.toDouble())
                            putDouble("totalBytes", totalBytes.toDouble())
                            putInt("progress", progressPct)
                            putString("speed", speedFormatted)
                            putString("eta", etaFormatted)
                        }
                        sendEvent("onNativeDownloadProgress", progressMap)

                        lastProgressUpdate = now
                        lastBytesDownloaded = bytesDownloaded
                    }
                }

                outputStream.flush()
                outputStream.close()
                outputStream = null
                inputStream?.close()
                inputStream = null
                connection?.disconnect()

                if (isCancelled.get()) {
                    tmpFile.delete()
                    cancelNotification(videoId)
                    val cancelMap = Arguments.createMap().apply {
                        putString("videoId", videoId)
                    }
                    sendEvent("onNativeDownloadCancelled", cancelMap)
                    return@Thread
                }

                // Verify file integrity
                if (!tmpFile.exists() || tmpFile.length() < 64 * 1024) {
                    throw java.io.IOException("Downloaded video file is too small or incomplete (${tmpFile.length()} bytes)")
                }

                // Atomic rename to final playable MP4 file
                if (finalFile.exists()) {
                    finalFile.delete()
                }
                val renameSuccess = tmpFile.renameTo(finalFile)
                val targetFile = if (renameSuccess) finalFile else tmpFile

                if (!targetFile.exists() || targetFile.length() < 64 * 1024) {
                    throw java.io.IOException("Failed to save complete video file")
                }

                // Show completion notification
                showCompleted(videoId, title, targetFile.length().toDouble())

                val completedMap = Arguments.createMap().apply {
                    putString("videoId", videoId)
                    putString("localUri", "file://${targetFile.absolutePath}")
                    putDouble("totalBytes", targetFile.length().toDouble())
                }
                sendEvent("onNativeDownloadCompleted", completedMap)

                promise.resolve(completedMap)

            } catch (err: Exception) {
                // Keep partial tmpFile on network failure to allow resume on Retry.
                // Only clean up on user cancellation.
                if (isCancelled.get()) {
                    tmpFile.delete()
                }
                cancelNotification(videoId)
                showFailed(videoId, title, err.message ?: "Download error")
                promise.reject("ERR_DOWNLOAD_FAILED", err.message)
            } finally {
                activeDownloadThreads.remove(videoId)
                activeDownloadCancelled.remove(videoId)
                try {
                    outputStream?.close()
                    inputStream?.close()
                    connection?.disconnect()
                } catch (ignored: Exception) {}
            }
        }

        activeDownloadThreads[videoId] = downloadThread
        downloadThread.start()
    }

    private fun cancelDownloadInternal(videoId: String): Boolean {
        activeDownloadCancelled[videoId]?.set(true)
        activeDownloadThreads[videoId]?.interrupt()
        activeDownloadThreads.remove(videoId)
        activeDownloadCancelled.remove(videoId)

        val dir = getDownloadsDir()
        val tmpFile = File(dir, "$videoId.tmp")
        if (tmpFile.exists()) {
            tmpFile.delete()
        }
        cancelNotification(videoId)
        return true
    }

    @ReactMethod
    fun cancelDownload(videoId: String, promise: Promise) {
        try {
            cancelDownloadInternal(videoId)
            val map = Arguments.createMap().apply {
                putString("videoId", videoId)
                putBoolean("cancelled", true)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_CANCEL_DOWNLOAD", e.message)
        }
    }

    @ReactMethod
    fun deleteLocalFile(videoId: String, promise: Promise) {
        try {
            cancelDownloadInternal(videoId)

            val dir = getDownloadsDir()
            val mp4File = File(dir, "$videoId.mp4")
            val tmpFile = File(dir, "$videoId.tmp")
            var deleted = false
            if (mp4File.exists()) {
                deleted = mp4File.delete() || deleted
            }
            if (tmpFile.exists()) {
                deleted = tmpFile.delete() || deleted
            }
            cancelNotification(videoId)
            promise.resolve(deleted)
        } catch (e: Exception) {
            promise.reject("ERR_DELETE_FILE", e.message)
        }
    }

    @ReactMethod
    fun getLocalFile(videoId: String, promise: Promise) {
        try {
            val file = File(getDownloadsDir(), "$videoId.mp4")
            if (file.exists() && file.length() > 64 * 1024L) {
                val map = Arguments.createMap().apply {
                    putString("localUri", "file://${file.absolutePath}")
                    putDouble("totalBytes", file.length().toDouble())
                }
                promise.resolve(map)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("ERR_LOCAL_FILE", e.message)
        }
    }

    @ReactMethod
    fun getDownloadsDirectory(promise: Promise) {
        try {
            promise.resolve(getDownloadsDir().absolutePath)
        } catch (e: Exception) {
            promise.reject("ERR_DOWNLOADS_DIR", e.message)
        }
    }

    @ReactMethod
    fun getStorageStats(promise: Promise) {
        try {
            val dir = getDownloadsDir()
            var totalUsedBytes = 0.0
            var videoCount = 0

            val files = dir.listFiles()
            if (files != null) {
                for (file in files) {
                    if (file.isFile && file.name.endsWith(".mp4") && file.length() > 800000L) {
                        totalUsedBytes += file.length().toDouble()
                        videoCount++
                    }
                }
            }

            val statFs = StatFs(reactContext.filesDir.path)
            val freeBytes = statFs.availableBytes.toDouble()
            val totalDeviceBytes = statFs.totalBytes.toDouble()

            val map = Arguments.createMap().apply {
                putDouble("totalUsedBytes", totalUsedBytes)
                putDouble("freeBytes", freeBytes)
                putDouble("totalDeviceBytes", totalDeviceBytes)
                putInt("videoCount", videoCount)
                putString("downloadsPath", dir.absolutePath)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_STORAGE_STATS", e.message)
        }
    }

    @ReactMethod
    fun purgeInvalidDownloads(promise: Promise) {
        try {
            val dir = getDownloadsDir()
            val files = dir.listFiles()
            var purged = 0
            if (files != null) {
                for (file in files) {
                    // Keep usable partial files so a retry can resume after the
                    // React Native process is recreated.
                    if (file.isFile && file.length() <= 64 * 1024L) {
                        file.delete()
                        purged++
                    }
                }
            }
            promise.resolve(purged)
        } catch (e: Exception) {
            promise.resolve(0)
        }
    }
}
