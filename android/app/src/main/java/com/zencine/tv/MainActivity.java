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

        // Kích hoạt Hardware Acceleration cho Window để đạt 60fps trên TV
        getWindow().setFlags(
            android.view.WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            android.view.WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        // Đảm bảo WebView luôn nhận tiêu điểm (Focus) ngay khi khởi động cho Remote Android TV / D-Pad
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            webView.requestFocus();

            // Ép buộc Hardware Acceleration ở tầng Layer cho WebView
            webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);

            // Cung cấp Native Bridge cho Web App
            webView.addJavascriptInterface(new ZenNativeBridge(), "ZenNative");

            // Tối ưu cài đặt phần cứng cho Android TV và Chuột bay / Remote cảm biến
            android.webkit.WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Bật offscreen pre-raster để cuộn danh sách phim siêu mượt không bao giờ bị chớp trắng
            settings.setOffscreenPreRaster(true);

            // Vô hiệu hóa thanh cuộn rườm rà và hiệu ứng kéo dãn (over-scroll) gây lag trên TV
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
            webView.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        }
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        // Hỗ trợ chuột bay (Air Mouse) và con trỏ cảm biến trên Remote TV Sony / LG
        // Xử lý đơn luồng, tránh gửi trùng lặp sự kiện (duplicate motion jitter)
        if (getBridge() != null && getBridge().getWebView() != null) {
            if (getBridge().getWebView().dispatchGenericMotionEvent(event)) {
                return true;
            }
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
        // Chuyển thẳng trực tiếp vào WebView để Spatial Navigation di chuyển menu/focus và chọn tập
        if (getBridge() != null && getBridge().getWebView() != null) {
            if (getBridge().getWebView().dispatchKeyEvent(event)) {
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent event) {
        // Chuyển trực tiếp các sự kiện chạm và click của Chuột bay (Air Mouse) vào WebView
        if (getBridge() != null && getBridge().getWebView() != null) {
            if (getBridge().getWebView().dispatchTouchEvent(event)) {
                return true;
            }
        }
        return super.dispatchTouchEvent(event);
    }
}
