document.addEventListener("DOMContentLoaded", () => {
  const validKeys = ['LXRE-24XP-TZ48-RW9J','QTP3-GX8Z-DY7C-LU20','92FZ-WALM-JR5X-EYTD','V6UG-RMBN-PX94-CHAK','FDUJ-WMKQ-Z4X6-A3YB','XKJP-8RY5-QU63-ENFD'];
  const $ = (id) => document.getElementById(id);

  const keyInput = $("keyInput");
  const status   = $("status");
  const btn      = $("activateBtn");

  const barCount = $("barCount");
  const barCountVal = $("barCountVal");
  const autoSpacing = $("autoSpacing");
  const manualGroup = $("manualSpacingGroup");
  const barWidth = $("barWidth");
  const barWidthVal = $("barWidthVal");
  const barGap = $("barGap");
  const barGapVal = $("barGapVal");
  const colorMatch = $("colorMatch");
  const showDot = $("showDot");
  const bpmMatch = $("bpmMatch");
  const settingsWrapper = $("settingsWrapper");
  const proNotice = $("proNotice");

  function setSettingsEnabled(on){
    if (on){
      settingsWrapper.classList.remove("disabled");
      proNotice.style.display = "none";
      bpmMatch.disabled = false;
    } else {
      settingsWrapper.classList.add("disabled");
      proNotice.style.display = "block";
      bpmMatch.disabled = true;
    }
  }

  // Load state
  chrome.storage.local.get(
    ["proUnlocked","barCount","autoSpacing","barWidth","barGap","colorMatch","showDot","bpmMatch"],
    (res) => {
      const pro = !!res.proUnlocked;
      setSettingsEnabled(pro);
      if (pro) status.textContent = "✅ PRO features already unlocked.";

      const n = Number.isInteger(res.barCount) ? res.barCount : 48;
      barCount.value = n; barCountVal.textContent = n + " bars";

      const auto = res.autoSpacing !== false;
      autoSpacing.checked = auto;
      manualGroup.style.display = auto ? "none" : "block";

      const bw = Number.isInteger(res.barWidth) ? res.barWidth : 6;
      const bg = Number.isInteger(res.barGap)   ? res.barGap   : 15;
      barWidth.value = bw; barWidthVal.textContent = bw + " px";
      barGap.value   = bg; barGapVal.textContent   = bg + " px";

      colorMatch.checked = res.colorMatch !== false;
      showDot.checked    = res.showDot !== false;
      bpmMatch.checked   = res.bpmMatch !== false;
    }
  );

  // Activate license
  btn.addEventListener("click", () => {
    const userKey = (keyInput.value || "").trim();
    if (!userKey) { status.textContent = "Enter a key."; return; }
    if (validKeys.includes(userKey)) {
      chrome.storage.local.set({ proUnlocked: true }, () => {
        status.textContent = "✅ PRO features unlocked!";
        setSettingsEnabled(true);
        chrome.storage.local.set({ lastUnlockPing: Date.now() });
      });
    } else {
      status.textContent = "❌ Invalid license key.";
    }
  });

  // Realtime storage writes
  barCount.addEventListener("input", (e) => barCountVal.textContent = parseInt(e.target.value,10) + " bars");
  barCount.addEventListener("change", (e) => chrome.storage.local.set({ barCount: parseInt(e.target.value,10) }));

  autoSpacing.addEventListener("change", (e) => {
    const on = !!e.target.checked;
    manualGroup.style.display = on ? "none" : "block";
    chrome.storage.local.set({ autoSpacing: on });
  });

  barWidth.addEventListener("input", (e) => barWidthVal.textContent = parseInt(e.target.value,10) + " px");
  barWidth.addEventListener("change", (e) => chrome.storage.local.set({ barWidth: parseInt(e.target.value,10) }));

  barGap.addEventListener("input", (e) => barGapVal.textContent = parseInt(e.target.value,10) + " px");
  barGap.addEventListener("change", (e) => chrome.storage.local.set({ barGap: parseInt(e.target.value,10) }));

  colorMatch.addEventListener("change", (e) => chrome.storage.local.set({ colorMatch: !!e.target.checked }));
  showDot.addEventListener("change",   (e) => chrome.storage.local.set({ showDot: !!e.target.checked }));
  bpmMatch.addEventListener("change",  (e) => chrome.storage.local.set({ bpmMatch: !!e.target.checked }));

  // If license changes while popup is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.proUnlocked) setSettingsEnabled(!!changes.proUnlocked.newValue);
  });
});