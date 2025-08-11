// Load settings + pro state, then init
chrome.storage.local.get(["proUnlocked","barCount","colorMatch","showDot","bpmMatch","autoSpacing","barWidth","barGap"], (res) => {
  const isPro = !!res.proUnlocked;
  const initialBars = Number.isInteger(res.barCount) ? res.barCount : 48;
  const settings = isPro ? {
    colorMatch:  res.colorMatch !== false,
    showDot:     res.showDot !== false,
    bpmMatch:    res.bpmMatch !== false,
    autoSpacing: res.autoSpacing !== false,
    barWidth:    Number.isInteger(res.barWidth) ? res.barWidth : 6,
    barGap:      Number.isInteger(res.barGap)   ? res.barGap   : 15
  } : {
    colorMatch:  false,
    showDot:     false,
    bpmMatch:    false,
    autoSpacing: true,
    barWidth:    6,
    barGap:      15
  };
  startVisualizer(isPro, initialBars, settings);
});

let wrapper, vis, styleEl;
let currentSettings = { colorMatch:false, showDot:false, bpmMatch:false, autoSpacing:true, barWidth:6, barGap:15 };
let beatTimer, colorTimer, bpmTimer;
let proActive = false;
let lastColor = "#ff4dd2";

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !wrapper) return;

  if (changes.proUnlocked) {
    const on = !!changes.proUnlocked.newValue;
    if (on) startPro(); else stopPro();
  }

  // Only apply setting changes if PRO is active
  if (!proActive) return;

  if (changes.barCount) {
    const n = clampInt(changes.barCount.newValue, 8, 120, 48);
    rebuildBars(n);
  }
  if (changes.autoSpacing) {
    currentSettings.autoSpacing = !!changes.autoSpacing.newValue;
    adaptLayout(vis.children.length);
  }
  if (changes.barWidth) {
    currentSettings.barWidth = clampInt(changes.barWidth.newValue, 2, 20, 6);
    adaptLayout(vis.children.length);
  }
  if (changes.barGap) {
    currentSettings.barGap = clampInt(changes.barGap.newValue, 2, 30, 15);
    adaptLayout(vis.children.length);
  }
  if (changes.colorMatch) {
    currentSettings.colorMatch = !!changes.colorMatch.newValue;
    if (currentSettings.colorMatch) updateVisualizerColor(true);
  }
  if (changes.showDot) {
    currentSettings.showDot = !!changes.showDot.newValue;
    const dot = document.querySelector('.visualizer-color-dot');
    if (dot) dot.style.display = currentSettings.showDot ? 'block' : 'none';
  }
  if (changes.bpmMatch) currentSettings.bpmMatch = !!changes.bpmMatch.newValue;
});

function startVisualizer(isPro, barCount, settings) {
  currentSettings = settings;
  if (document.querySelector('.visualizer-fake')) return;

  wrapper = document.createElement('div');
  wrapper.className = 'visualizer-wrapper';

  vis = document.createElement('div');
  vis.className = 'visualizer-fake';

  buildBars(barCount);

  wrapper.appendChild(vis);
  document.body.appendChild(wrapper);

  styleEl = document.createElement('style');
  styleEl.textContent = baseCSS();
  document.head.appendChild(styleEl);

  // Lite baseline
  const fallbackBPM = 116;
  let beatInterval = 60 / fallbackBPM;
  beatTimer = setInterval(bounceVisualizerWaveform, beatInterval * 1000);

  if (isPro) startPro();

  const observer = new MutationObserver(() => {
    const isPaused = document.querySelector('[data-testid="control-button-play"]');
    wrapper.classList.toggle('paused', !!isPaused);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  console.log("🎵 Visualizer ready. PRO:", isPro, "Settings:", currentSettings);
}

function startPro(){
  if (proActive) return;
  proActive = true;
  // Start loops (BPM obeys toggle)
  bpmTimer   = setInterval(() => { if (currentSettings.bpmMatch) simulateBPMChange(); }, 4000);
  colorTimer = setInterval(() => { if (currentSettings.colorMatch) updateVisualizerColor(); }, 4000);
  // Kick once now for instant feedback
  if (currentSettings.colorMatch) updateVisualizerColor(true);
  if (currentSettings.bpmMatch) simulateBPMChange();
  console.log("🔓 PRO active");
}

function stopPro(){
  proActive = false;
  if (bpmTimer)  { clearInterval(bpmTimer);  bpmTimer = null; }
  if (colorTimer){ clearInterval(colorTimer); colorTimer = null; }
  console.log("🔒 PRO stopped");
}

function baseCSS() {
  return `
    .visualizer-wrapper {
      position: fixed; bottom: 75px; left: 0; width: 100%;
      display:flex; justify-content:center; z-index:999999; pointer-events:none;
    }
    .visualizer-fake {
      display:flex; justify-content:center; align-items:flex-end;
      gap: var(--bar-gap, 15px);
    }
    .visualizer-bar {
      width: var(--bar-width, 6px);
      height: 50px;
      background: linear-gradient(180deg, #ffffff, ${lastColor});
      background-size: 100% 200%;
      transform-origin: bottom center;
      transition: transform 0.2s ease-out, background 0.6s ease;
      box-shadow: 0 0 6px rgba(255,77,210,0.3);
    }
    .visualizer-bar:hover { transform: scaleY(2) scaleX(1.2); box-shadow: 0 0 12px rgba(255,255,255,0.6); }
    .paused .visualizer-bar { animation-play-state: paused !important; }
    .visualizer-color-dot {
      position: fixed; width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid white; background-color: white; box-shadow: 0 0 10px white;
      z-index: 999999999 !important; pointer-events: none;
      transition: top 0.2s ease, left 0.2s ease; opacity: 1;
      display: ${'${currentSettings.showDot ? "block" : "none"}'};
    }
  `;
}

function buildBars(n) {
  vis.innerHTML = '';
  const count = clampInt(n, 8, 120, 48);
  adaptLayout(count);
  for (let i = 0; i < count; i++) {
    const bar = document.createElement('div');
    bar.className = 'visualizer-bar';
    vis.appendChild(bar);
  }
}

function rebuildBars(n) { buildBars(n); }

function adaptLayout(count) {
  if (currentSettings.autoSpacing) {
    const vw = Math.max(320, window.innerWidth || 1280);
    const targetWidth = Math.floor(vw * 0.9);
    let spacePerBar = Math.max(6, Math.floor(targetWidth / count));
    let barWidth = Math.min(12, Math.max(3, Math.floor(spacePerBar * 0.45)));
    let gap = Math.min(22, Math.max(4, spacePerBar - barWidth));

    const totalWidth = count * barWidth + (count - 1) * gap;
    if (totalWidth > targetWidth) {
      const scale = targetWidth / totalWidth;
      barWidth = Math.max(2, Math.floor(barWidth * scale));
      gap = Math.max(2, Math.floor(gap * scale));
    }
    if (styleEl) styleEl.textContent = baseCSS();
    vis.style.setProperty('--bar-width', barWidth + 'px');
    vis.style.setProperty('--bar-gap',   gap + 'px');
  } else {
    const bw = clampInt(currentSettings.barWidth, 2, 20, 6);
    const bg = clampInt(currentSettings.barGap,   2, 30, 15);
    if (styleEl) styleEl.textContent = baseCSS();
    vis.style.setProperty('--bar-width', bw + 'px');
    vis.style.setProperty('--bar-gap',   bg + 'px');
  }
}

function bounceVisualizerWaveform() {
  const bars = document.querySelectorAll('.visualizer-bar');
  bars.forEach((bar) => {
    const delay = Math.random() * 200;
    const scale = 1 + Math.random() * 2;
    setTimeout(() => {
      bar.style.transform = `scaleY(${scale.toFixed(2)})`;
      setTimeout(() => { bar.style.transform = 'scaleY(1)'; }, 180 + Math.random() * 100);
    }, delay);
  });
}

function simulateBPMChange() {
  const fallbackBPM = 116;
  const bpm = fallbackBPM + Math.floor(Math.random() * 10 - 5);
  const beatInterval = 60 / bpm;
  if (beatTimer) clearInterval(beatTimer);
  beatTimer = setInterval(bounceVisualizerWaveform, beatInterval * 1000);
  console.log("🎵 Simulated BPM:", bpm);
}

function getDominantColorFromImg(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const width = img.naturalWidth, height = img.naturalHeight;
  if (!width || !height) return '#ffffff';
  canvas.width = width; canvas.height = height;
  try {
    ctx.drawImage(img, 0, 0);
    const x = Math.floor(width / 2), y = Math.floor(height / 2);
    const data = ctx.getImageData(x, y, 1, 1).data;
    return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
  } catch { return '#ffffff'; }
}

function updateVisualizerColor(force=false) {
  if (!currentSettings.colorMatch && !force) return;
  const img = document.querySelector('[data-testid="now-playing-widget"] img');
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const color = getDominantColorFromImg(img);
  lastColor = color;

  document.querySelectorAll('.visualizer-bar').forEach(bar => {
    bar.style.background = `linear-gradient(180deg, #ffffff, ${color})`;
  });

  let dot = document.querySelector('.visualizer-color-dot');
  if (!dot) { dot = document.createElement('div'); dot.className = 'visualizer-color-dot'; document.body.appendChild(dot); }
  dot.style.display = currentSettings.showDot ? 'block' : 'none';

  const rect = img.getBoundingClientRect();
  const scaleX = rect.width / img.naturalWidth;
  const scaleY = rect.height / img.naturalHeight;
  const offsetX = rect.left + (img.naturalWidth / 2) * scaleX;
  const offsetY = rect.top + (img.naturalHeight / 2) * scaleY;
  dot.style.left = `${offsetX}px`;
  dot.style.top = `${offsetY}px`;
  dot.style.opacity = 1;
  setTimeout(() => { dot.style.opacity = currentSettings.showDot ? 0.3 : 0; }, 3000);
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
