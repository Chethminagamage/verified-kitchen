package lk.verifiedkitchen.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannels()
    }

    /**
     * Separate channels, so people can turn off the weekly summary in the phone's
     * settings but keep hygiene alerts. Ids match the push sender (send-push).
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel("hygiene_alerts", "Hygiene alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Grade and verification changes at kitchens you use"
            },
        )
        manager.createNotificationChannel(
            NotificationChannel("weekly_summary", "Weekly summary", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "A Sunday summary of your favourite kitchens"
            },
        )
    }
}
