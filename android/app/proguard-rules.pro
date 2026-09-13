# Les règles consumer de Capacitor conservent déjà ses plugins et callbacks.
# Préserver également le pont JavaScript invoqué par la WebView.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes SourceFile,LineNumberTable
