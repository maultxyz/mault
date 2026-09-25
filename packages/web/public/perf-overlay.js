// Load-time diagnostics for devices without a remote inspector (iOS Safari on
// a machine with no Mac). Loaded only with ?perf=1 by the inline snippet in
// index.html, which also starts the root/stall/error recorders before any
// app code runs. Plain JS, independent of the app bundle, so it still reports
// when that bundle is the thing that's slow.
(function () {
  var P = window.__perf || { stalls: [], errors: [] };
  var ms = function (v) {
    return v == null || isNaN(v) ? "-" : Math.round(v) + "ms";
  };
  var kb = function (v) {
    return v ? Math.round(v / 1024) + "KB" : "-";
  };
  var shortName = function (url) {
    try {
      var u = new URL(url);
      var path = u.pathname.length > 48 ? "…" + u.pathname.slice(-47) : u.pathname;
      return (u.origin === location.origin ? "" : u.host) + path;
    } catch (e) {
      return url;
    }
  };

  function report() {
    var lines = [];
    var now = performance.now();
    lines.push("t=" + ms(now) + (P.rootAt ? "" : "  (app not rendered yet)"));
    lines.push(navigator.userAgent);
    lines.push(
      "SW controller: " +
        (navigator.serviceWorker && navigator.serviceWorker.controller ? "yes" : "no"),
    );

    var nav = performance.getEntriesByType("navigation")[0];
    if (nav) {
      lines.push("");
      lines.push("DOCUMENT (" + (nav.nextHopProtocol || "?") + ", " + kb(nav.transferSize) + ")");
      lines.push("  redirect  " + ms(nav.redirectEnd - nav.redirectStart));
      lines.push("  dns       " + ms(nav.domainLookupEnd - nav.domainLookupStart));
      lines.push("  connect   " + ms(nav.connectEnd - nav.connectStart));
      lines.push("  ttfb      " + ms(nav.responseStart));
      lines.push("  html done " + ms(nav.responseEnd));
      lines.push("  domInter. " + ms(nav.domInteractive));
      lines.push("  DCL       " + ms(nav.domContentLoadedEventEnd));
      lines.push("  load      " + ms(nav.loadEventEnd || null));
    }

    lines.push("");
    lines.push("MILESTONES");
    performance.getEntriesByType("paint").forEach(function (p) {
      lines.push("  " + p.name + " " + ms(p.startTime));
    });
    performance.getEntriesByType("mark").forEach(function (m) {
      lines.push("  " + m.name + " " + ms(m.startTime));
    });
    lines.push("  app rendered " + ms(P.rootAt));

    var resources = performance.getEntriesByType("resource");
    lines.push("");
    lines.push("SLOWEST REQUESTS (" + resources.length + " total)");
    lines.push("  start   dur     ttfb    size   proto  name");
    resources
      .slice()
      .sort(function (a, b) {
        return b.duration - a.duration;
      })
      .slice(0, 20)
      .forEach(function (r) {
        var ttfb = r.responseStart ? r.responseStart - r.startTime : null;
        lines.push(
          "  " +
            [
              ms(r.startTime).padEnd(7),
              ms(r.duration).padEnd(7),
              ms(ttfb).padEnd(7),
              kb(r.transferSize || r.encodedBodySize).padEnd(6),
              (r.nextHopProtocol || "?").padEnd(6),
              shortName(r.name),
            ].join(" "),
        );
      });

    lines.push("");
    lines.push("MAIN THREAD STALLS >200ms (start, length)");
    if (P.stalls.length === 0) lines.push("  none");
    P.stalls
      .slice()
      .sort(function (a, b) {
        return b[1] - a[1];
      })
      .slice(0, 10)
      .forEach(function (s) {
        lines.push("  at " + ms(s[0]) + " for " + ms(s[1]));
      });

    if (P.errors.length) {
      lines.push("");
      lines.push("ERRORS");
      P.errors.forEach(function (e) {
        lines.push("  " + ms(e[0]) + " " + e[1]);
      });
    }
    return lines.join("\n");
  }

  var panel = document.createElement("div");
  panel.setAttribute(
    "style",
    "position:fixed;left:0;right:0;bottom:0;max-height:60vh;overflow:auto;z-index:2147483647;" +
      "background:rgba(0,0,0,.9);color:#e5e5e5;font:10px/1.35 ui-monospace,Menlo,monospace;" +
      "padding:8px;border-top:1px solid #444;-webkit-text-size-adjust:100%",
  );
  var bar = document.createElement("div");
  bar.setAttribute("style", "display:flex;gap:8px;margin-bottom:6px");
  var pre = document.createElement("pre");
  pre.setAttribute("style", "margin:0;white-space:pre;");

  function button(label, onClick) {
    var b = document.createElement("button");
    b.textContent = label;
    b.setAttribute(
      "style",
      "font:12px system-ui;padding:6px 10px;border-radius:6px;border:1px solid #666;background:#222;color:#fff",
    );
    b.addEventListener("click", onClick);
    bar.appendChild(b);
    return b;
  }

  var copyButton = button("Copy report", function () {
    var text = report();
    var done = function () {
      copyButton.textContent = "Copied";
      setTimeout(function () {
        copyButton.textContent = "Copy report";
      }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      done();
    }
  });
  button("Close", function () {
    clearInterval(timer);
    panel.remove();
  });

  panel.appendChild(bar);
  panel.appendChild(pre);

  function mount() {
    document.body.appendChild(panel);
    pre.textContent = report();
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  var timer = setInterval(function () {
    pre.textContent = report();
  }, 1000);
})();
