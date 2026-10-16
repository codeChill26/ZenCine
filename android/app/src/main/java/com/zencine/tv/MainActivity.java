package com.zencine.tv;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public class ZenNativeBridge {
        @JavascriptInterface
        public void exitApp() {
            runOnUiThread(MainActivity.this::finish);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Đảm bảo WebView luôn nhận tiêu điểm (Focus) ngay khi khởi động cho Remote Android TV / D-Pad
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            webView.requestFocus();

            // Cung cấp Native Bridge cho Web App
            webView.addJavascriptInterface(new ZenNativeBridge(), "ZenNative");

            // Tối ưu cài đặt cho Android TV và Chuột bay / Remote cảm biến
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        // Hỗ trợ chuột bay (Air Mouse) và con trỏ cảm biến trên Remote TV Sony
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().dispatchGenericMotionEvent(event);
        }
        return super.dispatchGenericMotionEvent(event);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();
        int action = event.getAction();

        // 1. Phím BACK trên Remote TV (Sony, Samsung, LG, Android TV Box)
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (action == KeyEvent.ACTION_UP) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { " +
                        "  if (window.zenHandleTvBack) { " +
                        "    window.zenHandleTvBack(); " +
                        "  } else { " +
                        "    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })); " +
                        "  } " +
                        "})();", null
                    );
                }
            }
            return true;
        }

        if (action == KeyEvent.ACTION_DOWN) {
            // Nút PLAY (▶) trên Remote TV Sony / Google TV (KEYCODE_MEDIA_PLAY = 126)
            if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY || keyCode == 126) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { " +
                        "  window.dispatchEvent(new CustomEvent('tv-media-play')); " +
                        "  var v = document.querySelector('video'); if (v) v.play(); " +
                        "})();", null
                    );
                    return true;
                }
            }

            // Nút PAUSE (||) trên Remote TV (KEYCODE_MEDIA_PAUSE = 127)
            if (keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE || keyCode == 127) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { " +
                        "  window.dispatchEvent(new CustomEvent('tv-media-pause')); " +
                        "  var v = document.querySelector('video'); if (v) v.pause(); " +
                        "})();", null
                    );
                    return true;
                }
            }

            // Nút gộp PLAY/PAUSE (KEYCODE_MEDIA_PLAY_PAUSE = 85)
            if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE || keyCode == 85) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { " +
                        "  window.dispatchEvent(new CustomEvent('tv-media-playpause')); " +
                        "  var v = document.querySelector('video'); if (v) { if (v.paused) v.play(); else v.pause(); } " +
                        "})();", null
                    );
                    return true;
                }
            }

            // Nút TUA LÙI (<<) (KEYCODE_MEDIA_REWIND = 89)
            if (keyCode == KeyEvent.KEYCODE_MEDIA_REWIND || keyCode == 89) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { " +
                        "  window.dispatchEvent(new CustomEvent('tv-media-rewind')); " +
                        "  var v = document.querySelector('video'); if (v) v.currentTime = Math.max(0, v.currentTime - 10); " +
                        "})();", null
                    );
                    return true;
                }
            }

            // Nút TUA TỚI (>>) (KEYCODE_MEDIA_FAST_FORWARD = 90)
            if (keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD || keyCode == 90) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { " +
                        "  window.dispatchEvent(new CustomEvent('tv-media-fastforward')); " +
                        "  var v = document.querySelector('video'); if (v) v.currentTime = Math.min(v.duration || 999999, v.currentTime + 10); " +
                        "})();", null
                    );
                    return true;
                }
            }
        }

        // TẤT CẢ CÁC PHÍM ĐIỀU HƯỚNG D-PAD (Lên, Xuống, Trái, Phải, Nút giữa OK):
        // Cho phép chuyển thẳng tự nhiên vào WebView để Spatial Navigation di chuyển menu/focus và chọn tập
        return super.dispatchKeyEvent(event);
    }
}
