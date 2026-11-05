package com.kidsstream

import android.content.Context
import android.database.ContentObserver
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.LifecycleEventListener

class SafeVolumeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    private val audioManager =
        reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val handler = Handler(Looper.getMainLooper())
    private var enabled = false
    private var correcting = false

    private val volumeObserver = object : ContentObserver(handler) {
        override fun onChange(selfChange: Boolean) {
            enforceLimit()
        }
    }

    init {
        reactContext.contentResolver.registerContentObserver(
            Settings.System.CONTENT_URI,
            true,
            volumeObserver
        )
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = "SafeVolumeModule"

    @ReactMethod
    fun setSafeVolumeEnabled(value: Boolean) {
        enabled = value
        if (enabled) enforceLimit()
    }

    @ReactMethod
    fun enforceSafeVolume() {
        enforceLimit()
    }

    private fun enforceLimit() {
        if (!enabled || correcting) return
        val maximum = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        if (maximum <= 0) return
        val limit = (maximum * 0.5f).toInt()
        val current = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
        if (current > limit) {
            correcting = true
            try {
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, limit, 0)
            } finally {
                handler.post {
                    correcting = false
                }
            }
        }
    }

    override fun onHostResume() {
        enforceLimit()
    }

    override fun onHostPause() = Unit

    override fun onHostDestroy() = Unit

    override fun invalidate() {
        reactContext.contentResolver.unregisterContentObserver(volumeObserver)
        reactContext.removeLifecycleEventListener(this)
        super.invalidate()
    }
}
