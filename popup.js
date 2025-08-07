
document.addEventListener("DOMContentLoaded", () => {
  const validKeys = ['LXRE-24XP-TZ48-RW9J','QTP3-GX8Z-DY7C-LU20','92FZ-WALM-JR5X-EYTD','V6UG-RMBN-PX94-CHAK','FDUJ-WMKQ-Z4X6-A3YB','XKJP-8RY5-QU63-ENFD'];
  const keyInput = document.getElementById("keyInput");
  const status = document.getElementById("status");
  const btn = document.getElementById("activateBtn");

  chrome.storage.local.get("proUnlocked", (res) => {
    if (res.proUnlocked) {
      status.textContent = "✅ PRO features already unlocked.";
    }
  });

  btn.onclick = () => {
    const userKey = keyInput.value.trim();
    if (validKeys.includes(userKey)) {
      chrome.storage.local.set({ proUnlocked: true }, () => {
        status.textContent = "✅ PRO features unlocked!";
      });
    } else {
      status.textContent = "❌ Invalid license key.";
    }
  };
});
