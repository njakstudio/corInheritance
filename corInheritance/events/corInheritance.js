({
  checkType: "general",
  checkAndAct: function () {},

  methods: {
    // ---------------------------------------------------------------------
    // Entry
    // ---------------------------------------------------------------------
    openWillModal: function () {
      window.corInheritance = window.corInheritance || {};

      // Only open when the injected UI button sets this.
      if (!window.corInheritance._allowOpenOnce) {
        console.log("[corInheritance] blocked openWillModal (not user click)");
        return;
      }
      window.corInheritance._allowOpenOnce = false;

      var st = window.daapi.getState();
      var ownerId = st && st.current ? st.current.id : null;
      if (!ownerId) return;

      window.daapi.displayInteractionModal(this._buildWillModal(ownerId));
    },

    // ---------------------------------------------------------------------
    // Save
    // ---------------------------------------------------------------------
    saveWill: function (ctx) {
      try {
        var st = window.daapi.getState();
        var ownerId =
          (ctx && ctx.ownerId) ? ctx.ownerId :
          (st && st.current ? st.current.id : null);

        if (!ownerId) return;

        if (!window.corApi || !window.corApi.setInheritanceShares) {
          window.daapi.displayInteractionModal(
            this._simpleModal("Will Editor", "corApi.setInheritanceShares not available.")
          );
          return;
        }

        // Get the heir ordering we stored when we built the modal.
        var tmp = window.daapi.getCharacterFlag({
          characterId: ownerId,
          flag: "corInheritance:tmpWillEdit:v1"
        });

        var payload = (tmp && tmp.data) ? tmp.data : tmp;
        var heirIds = (payload && Array.isArray(payload.heirIds)) ? payload.heirIds : [];

        // Read current input values from the live interaction modal state.
        var modal = st && st.interactionModal ? st.interactionModal : null;
        var inputs = modal && Array.isArray(modal.inputs) ? modal.inputs : [];

        var shares = {};
        var total = 0;

        for (var i = 0; i < heirIds.length; i++) {
          var raw = (inputs[i] && inputs[i].value != null) ? inputs[i].value : 0;
          var n = Number(raw);

          if (!isFinite(n) || n < 0) n = 0;
          if (n > 100) n = 100;

          if (n > 0) {
            shares[heirIds[i]] = n; // percent weights; corApi can normalize if needed
            total += n;
          }
        }

        if (total !== 100) {
          window.daapi.displayInteractionModal(
            this._simpleModal("Will Editor", "Total must equal 100%. Current total: " + total + "%.")
          );
          return;
        }

        // Persist via corApi (prefer letting corApi enforce eligibility)
        window.corApi.setInheritanceShares(ownerId, shares, { restrictToEligible: true });

        window.daapi.displayInteractionModal(this._simpleModal("Will Editor", "Will saved."));
      } catch (e) {
        console.warn("[corInheritance] saveWill failed", e);
        window.daapi.displayInteractionModal(this._simpleModal("Will Editor", "Save failed. Check console."));
      }
    },

    // ---------------------------------------------------------------------
    // Modal
    // ---------------------------------------------------------------------
    _buildWillModal: function (ownerId) {
      var heirIds = this._getEligibleHeirIds(ownerId);

      // Store order for saveWill.
      window.daapi.setCharacterFlag({
        characterId: ownerId,
        flag: "corInheritance:tmpWillEdit:v1",
        data: { heirIds: heirIds }
      });

      var inputs = [];
      for (var i = 0; i < heirIds.length; i++) {
        inputs.push({
          type: "number",
          title: this._name(heirIds[i]),
          value: "0"
        });
      }

      return {
        title: "Will Editor",
        message: heirIds.length
          ? "Set inheritance percentages. Total must be 100%."
          : "No eligible heirs found.",
        inputs: inputs,
        options: heirIds.length
          ? [
              this._optAction("Save", {
                event: "/corInheritance/events/corInheritance",
                method: "saveWill",
                context: { ownerId: ownerId }
              }),
              this._optClose("Close")
            ]
          : [this._optClose("Close")]
      };
    },

    // ---------------------------------------------------------------------
    // Heirs (UPDATED: prefer corApi.getEligibleHeirs)
    // ---------------------------------------------------------------------
    _getEligibleHeirIds: function (ownerId) {
      // 1) Prefer corApi if present
      try {
        if (window.corApi && window.corApi.getEligibleHeirs) {
          var res = window.corApi.getEligibleHeirs(ownerId);

          // Common shapes:
          // - Array: ["id1","id2"]
          // - Object: { heirIds: [...] }
          // Be defensive for other likely property names.
          var ids = null;

          if (Array.isArray(res)) {
            ids = res;
          } else if (res && Array.isArray(res.heirIds)) {
            ids = res.heirIds;
          } else if (res && Array.isArray(res.eligible)) {
            ids = res.eligible;
          } else if (res && Array.isArray(res.heirs)) {
            ids = res.heirs;
          }

          if (ids && ids.length) return ids.slice();
        }
      } catch (e) {
        // fall through to children fallback
      }

      // 2) Fallback: childrenIds from the character record
      try {
        var c = window.daapi.getCharacter({ characterId: ownerId });
        var kids = (c && Array.isArray(c.childrenIds)) ? c.childrenIds : [];
        return kids.slice();
      } catch (e2) {
        return [];
      }
    },

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------
    _name: function (id) {
      try {
        var c = window.daapi.getCharacter({ characterId: id });
        if (!c) return String(id);
        var p = c.praenomen ? c.praenomen : "";
        var a = c.agnomen ? c.agnomen : "";
        var n = (p + " " + a).replace(/\s+/g, " ").trim();
        return n ? n : String(id);
      } catch (e) {
        return String(id);
      }
    },

    _emptyStatChanges: function () {
      return {
        cash: 0,
        prestige: 0,
        influence: 0,
        property: {},
        modifiers: [],
        removeModifiers: [],
        additiveModifiers: [],
        removeAdditiveModifiers: []
      };
    },

    // IMPORTANT: tooltip must be an ARRAY (renderer calls forEach)
    _optClose: function (text) {
      return {
        text: text,
        icons: [],
        tooltip: [],
        statChanges: this._emptyStatChanges()
      };
    },

    _optAction: function (text, action) {
      return {
        text: text,
        icons: [],
        tooltip: [],
        statChanges: this._emptyStatChanges(),
        action: action
      };
    },

    _simpleModal: function (title, message) {
      return {
        title: title,
        message: message,
        options: [this._optClose("OK")]
      };
    }
  }
})
