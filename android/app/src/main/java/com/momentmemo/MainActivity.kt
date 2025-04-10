package com.momentmemo

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import org.devio.rn.splashscreen.SplashScreen
import android.os.Bundle
import android.os.Build
import android.graphics.BitmapFactory
import android.app.ActivityManager
import androidx.core.content.ContextCompat

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "momentMemo"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
      SplashScreen.show(this) // 스플래시 화면 표시
      super.onCreate(savedInstanceState)


      if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        val icon = BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
        setTaskDescription(
          ActivityManager.TaskDescription(
            getString(R.string.app_name),
            icon,
            ContextCompat.getColor(this, R.color.primary_color)
          )
        )
      }

  }
}
