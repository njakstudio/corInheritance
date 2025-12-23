({
  canTriggerIfUnavailable: true,
  checkType: "general",

  checkAndAct: function () {
    // Start once
    if (window.__corWillBtnStarted) return;
    window.__corWillBtnStarted = true;

    var BUTTON_ID = "corInheritance-will-btn";
    var POLL_MS = 400;

    function getAnchor() {
      // You confirmed there are 2 of these; pick the first one for now.
      // We can refine later if it injects above the wrong one.
      return document.querySelector(".text-muted.text-small.btn.btn-link.btn-link-none.btn-block");
    }

    function inPropertyScreen() {
      // Prefer "real" property buttons if present
      if (document.querySelector(".js-btn-sell-excess")) return true;
      if (document.querySelector(".js-btn-buy-all-to-limit")) return true;

      // Fallback: the anchor existing is usually enough
      return !!getAnchor();
    }

    function ensureButton() {
      if (!inPropertyScreen()) return;

      var anchor = getAnchor();
      if (!anchor || !anchor.parentElement) return;

      // If we left and re-entered, the old button might still exist; don't duplicate.
      if (document.getElementById(BUTTON_ID)) return;

      var btn = document.createElement("button");
      btn.id = BUTTON_ID;
      btn.type = "button";
      btn.className = "btn btn-info btn-sm";
      btn.style.width = "180px"; // fixed width
      btn.textContent = "To Will";

      btn.onclick = function () {
        // ONLY open on click
        window.corInheritance = window.corInheritance || {};
        window.corInheritance._allowOpenOnce = true;

        window.daapi.invokeMethod({
          event: "/corInheritance/events/corInheritance",
          method: "openWillModal",
          context: {}
        });
      };

      anchor.parentElement.insertBefore(btn, anchor);
      console.log("[corInheritance] injected will button");
    }

    window.__corWillBtnPoll = setInterval(ensureButton, POLL_MS);
  }
})
