/**
 * E-ABSENSI DIGITAL — Enterprise Cybersecurity & Anti-Abuse Shield
 * Versi: 4.0 — Perlindungan Komprehensif: Anti-Scraper, Anti-Inspect, Anti-DevTools, Anti-Bot, Anti-Tamper
 */
(function () {
  'use strict';

  /* 1. Proteksi Iframe / Clickjacking */
  try {
    if (window.self !== window.top) {
      window.top.location.href = window.self.location.href;
    }
  } catch (_) {
    document.body.innerHTML = '';
  }

  /* 2. Anti-Headless Scraper & Automation Bot Detection */
  function periksaAutomasi() {
    try {
      var isBot = false;
      var w = window;
      var n = navigator;
      var d = document;

      if (n.webdriver) isBot = true;
      if (w.__nightmare || w._phantom || w.callPhantom || w.domAutomation) isBot = true;
      if (d.__selenium_unwrapped || d.__webdriver_evaluate || d.__selenium_evaluate) isBot = true;
      if (w.emit && w.chrome && !w.chrome.runtime) isBot = true;

      // Deteksi Chrome DevTools Protocol & CDP Automation Injection
      for (var kunci in w) {
        if (/^cdc_[a-z0-9]/i.test(kunci)) {
          isBot = true;
          break;
        }
      }
      // Deteksi Dimensi Layar Headless Anomali
      if (w.outerWidth === 0 && w.outerHeight === 0 && w.innerWidth === 0) isBot = true;
      // Deteksi Navigator Anomali
      if (n.languages && Array.isArray(n.languages) && n.languages.length === 0) isBot = true;

      if (isBot) {
        if (d.body) {
          d.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0b1222;color:#f87171;font-family:sans-serif;font-size:16px;font-weight:bold;text-align:center;padding:20px;">[403] Akses Ditolak: Deteksi Otomasi & Bot Dilarang pada Sistem E-Absensi Digital.</div>';
        }
        throw new Error('Bot scraping attempt blocked');
      }
    } catch (_) {}
  }
  periksaAutomasi();

  /* 3. Nonaktifkan Klik Kanan (Anti-Inspect & Anti-View-Source) */
  document.addEventListener('contextmenu', function (e) {
    var target = e.target;
    var isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
    if (!isInput) {
      e.preventDefault();
      return false;
    }
  }, { capture: true });

  /* 4. Blokir Tombol Pintas DevTools & View Source */
  document.addEventListener('keydown', function (e) {
    var key = e.key ? e.key.toLowerCase() : '';
    var code = e.keyCode || e.which;

    // F12 (DevTools)
    if (key === 'f12' || code === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspector), Ctrl+Shift+K
    if (e.ctrlKey && e.shiftKey) {
      if (key === 'i' || key === 'j' || key === 'c' || key === 'k' || code === 73 || code === 74 || code === 67 || code === 75) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }

    // Mac Cmd+Option+I, Cmd+Option+J, Cmd+Option+C, Cmd+Option+U
    if (e.metaKey && e.altKey) {
      if (key === 'i' || key === 'j' || key === 'c' || key === 'u' || code === 73 || code === 74 || code === 67 || code === 85) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }

    // Ctrl+U / Cmd+U (View Source)
    if ((e.ctrlKey || e.metaKey) && (key === 'u' || code === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page)
    if ((e.ctrlKey || e.metaKey) && (key === 's' || code === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

  /* 5. Anti-Tamper & Clean Runtime */
  try {
    if (typeof window !== 'undefined' && window.top === window.self) {
      window.__ABSENSI_SHIELD__ = true;
    }
  } catch (_) {}

  /* 6. Anti Console Data-Leakage di Lingkungan Publik */
  try {
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      var noop = function () {};
      var banner = function () {
        console.warn('%cPERINGATAN KEAMANAN SISTEM%c\nFitur konsol ini ditujukan hanya untuk Administrator Sistem. Dilarang keras menyalin atau menempelkan script ke konsol ini (Self-XSS Protection).', 'color: #ef4444; font-size: 16px; font-weight: bold;', 'color: #64748b; font-size: 12px;');
      };
      window.console.log = noop;
      window.console.debug = noop;
      window.console.info = noop;
      window.console.dir = noop;
      window.console.table = noop;
      banner();
    }
  } catch (_) {}

  /* 7. Mencegah Drag & Drop Sumber Daya Internal (Anti-Asset Theft) */
  document.addEventListener('dragstart', function (e) {
    if (e.target && e.target.nodeName === 'IMG') {
      e.preventDefault();
    }
  }, false);

  /* 8. Client-Side Anti-DDoS Click & Form Flood Shield (AutoClicker & Script Throttling) */
  (function () {
    var klikRiwayat = [];
    var ambangKlik = 12; // Maksimal 12 klik per detik secara global
    document.addEventListener('click', function (e) {
      var sekarang = Date.now();
      klikRiwayat = klikRiwayat.filter(function (t) { return sekarang - t < 1000; });
      klikRiwayat.push(sekarang);
      if (klikRiwayat.length > ambangKlik) {
        e.preventDefault();
        e.stopPropagation();
        var target = e.target;
        if (target && typeof target.setAttribute === 'function') {
          target.setAttribute('disabled', 'true');
          setTimeout(function () {
            target.removeAttribute('disabled');
          }, 2000);
        }
        return false;
      }
    }, { capture: true });
  })();

})();
