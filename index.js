/**
 * TizenBrew module cho HBO Max (Max)
 * File này được TizenBrew "inject" vào trang play.max.com khi chạy trên Tizen TV.
 * Mục đích: ánh xạ các phím trên remote Samsung sang hành động điều khiển video/điều hướng,
 * vì trang web Max vốn được thiết kế cho chuột/bàn phím, không phải remote TV.
 *
 * Module này KHÔNG chỉnh sửa, bẻ khoá hay can thiệp vào nội dung/DRM của Max.
 * Bạn vẫn cần đăng nhập bằng tài khoản Max hợp lệ để xem.
 */

(function () {
  'use strict';

  // --- Giả lập User-Agent để qua bước kiểm tra "trình duyệt được hỗ trợ" ---
  // Chạy sớm nhất có thể (evaluateScriptOnDocumentStart) để trang web đọc được
  // giá trị giả trước khi chạy logic kiểm tra browser của nó.
  (function spoofUserAgent() {
    var fakeUA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

    try {
      Object.defineProperty(navigator, 'userAgent', {
        get: function () { return fakeUA; },
        configurable: true
      });
      Object.defineProperty(navigator, 'appVersion', {
        get: function () { return fakeUA.replace('Mozilla/', ''); },
        configurable: true
      });
      Object.defineProperty(navigator, 'platform', {
        get: function () { return 'Win32'; },
        configurable: true
      });
      Object.defineProperty(navigator, 'vendor', {
        get: function () { return 'Google Inc.'; },
        configurable: true
      });
    } catch (e) {
      console.warn('[TizenBrew HBO Max] Không override được navigator UA:', e);
    }
  })();

  // Mã phím TV Samsung (Tizen TVInputDevice keycodes)
  const KEY = {
    RETURN: 10009,
    ENTER: 13,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    MEDIA_PLAY: 415,
    MEDIA_PAUSE: 19,
    MEDIA_PLAY_PAUSE: 10252,
    MEDIA_STOP: 413,
    MEDIA_REWIND: 412,
    MEDIA_FAST_FORWARD: 417,
    CH_UP: 427,
    CH_DOWN: 428
  };

  function getVideoEl() {
    return document.querySelector('video');
  }

  function seekBy(seconds) {
    const v = getVideoEl();
    if (v && !isNaN(v.currentTime)) {
      v.currentTime = Math.max(0, v.currentTime + seconds);
    }
  }

  function togglePlayPause() {
    const v = getVideoEl();
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  function handleReturnKey() {
    // Nếu đang xem video hoặc ở trang con -> quay lại trang trước
    // Nếu đã ở trang chủ Max -> thoát app TizenBrew
    const isHome =
      location.pathname === '/' ||
      location.pathname === '' ||
      history.length <= 1;

    if (isHome) {
      try {
        if (window.tizen && tizen.application) {
          tizen.application.getCurrentApplication().exit();
          return;
        }
      } catch (e) {
        /* fallback dưới đây */
      }
      window.close();
    } else {
      history.back();
    }
  }

  document.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
      case KEY.RETURN:
        handleReturnKey();
        e.preventDefault();
        break;

      case KEY.MEDIA_PLAY:
      case KEY.MEDIA_PAUSE:
      case KEY.MEDIA_PLAY_PAUSE:
      case KEY.ENTER:
        // ENTER chỉ toggle play/pause khi video đang có focus (tránh chặn điều hướng menu)
        if (e.keyCode !== KEY.ENTER || document.activeElement === getVideoEl()) {
          togglePlayPause();
          e.preventDefault();
        }
        break;

      case KEY.MEDIA_STOP:
        const v = getVideoEl();
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
        break;

      case KEY.MEDIA_REWIND:
      case KEY.CH_DOWN:
        seekBy(-10);
        e.preventDefault();
        break;

      case KEY.MEDIA_FAST_FORWARD:
      case KEY.CH_UP:
        seekBy(10);
        e.preventDefault();
        break;

      default:
        break;
    }
  });

  // Đăng ký các phím cần thiết với hệ thống Tizen (bắt buộc để nhận sự kiện keydown cho các phím media)
  try {
    if (window.tizen && tizen.tvinputdevice) {
      [
        'MediaPlay',
        'MediaPause',
        'MediaPlayPause',
        'MediaStop',
        'MediaRewind',
        'MediaFastForward',
        'ChannelUp',
        'ChannelDown'
      ].forEach(function (key) {
        try {
          tizen.tvinputdevice.registerKey(key);
        } catch (err) {
          console.warn('Không thể đăng ký phím:', key, err);
        }
      });
    }
  } catch (e) {
    console.warn('TVInputDevice API không khả dụng:', e);
  }

  console.log('[TizenBrew HBO Max] Module đã nạp thành công.');
})();
