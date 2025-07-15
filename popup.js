
document.addEventListener("DOMContentLoaded", () => {
  const keyInput = document.getElementById("licenseKeyInput");
  const status = document.getElementById("status");
  const btn = document.getElementById("activateBtn");

  chrome.storage.local.get(["proUnlocked"], (result) => {
    if (result.proUnlocked) {
      status.textContent = "Pro Unlocked ✅";
      keyInput.disabled = true;
      btn.disabled = true;
    }
  });

  btn.addEventListener("click", () => {
    const key = keyInput.value.trim();
    if (validKeys.includes(key)) {
      chrome.storage.local.set({ proUnlocked: true }, () => {
        status.textContent = "Pro Unlocked ✅";
        keyInput.disabled = true;
        btn.disabled = true;
      });
    } else {
      status.textContent = "Invalid Key ❌";
    }
  });

  document.getElementById("buyLink").addEventListener("click", () => {
    window.open("https://talenmagistro.gumroad.com/l/luhnj", "_blank");
  });
});
