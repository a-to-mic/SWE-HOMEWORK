mergeInto(LibraryManager.library, {
  BattleAnimationDone: function (payloadPtr) {
    var payload = UTF8ToString(payloadPtr);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("unity-battle-animation-done", { detail: payload })
      );
    }
  },
});
