
// Start visualizer regardless, then activate PRO logic when license detected
chrome.storage.local.get("proUnlocked", (res) => {
  const isPro = !!res.proUnlocked;
  startVisualizer(isPro);
});

function startVisualizer(isPro) {
  if (document.querySelector('.visualizer-fake')) return;

  const barCount = 48;
  const fallbackBPM = 116;
  let beatInterval = 60 / fallbackBPM;
  let beatTimer;
  let lastTrack = '';
  let lastSrc = '';
  let lastColor = '#ff4dd2';

  const wrapper = document.createElement('div');
  wrapper.className = 'visualizer-wrapper';

  const vis = document.createElement('div');
  vis.className = 'visualizer-fake';

  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('div');
    bar.className = 'visualizer-bar';
    vis.appendChild(bar);
  }

  wrapper.appendChild(vis);
  document.body.appendChild(wrapper);

  const style = document.createElement('style');
  style.textContent = `
    .visualizer-wrapper {
      position: fixed;
      bottom: 75px;
      left: 0;
      width: 100%;
      display: flex;
      justify-content: center;
      z-index: 999999;
      pointer-events: none;
    }
    .visualizer-fake {
      display: flex;
      gap: 15px;
      justify-content: center;
    }
    .visualizer-bar {
      width: 6px;
      height: 50px;
      background: linear-gradient(180deg, #ffffff, ${lastColor});
      background-size: 100% 200%;
      transform-origin: bottom center;
      transition: transform 0.2s ease-out, background 0.6s ease;
      box-shadow: 0 0 6px rgba(255, 77, 210, 0.3);
    }
    .visualizer-bar:hover {
      transform: scaleY(2) scaleX(1.2);
      box-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
    }
    .paused .visualizer-bar {
      animation-play-state: paused !important;
    }
    .visualizer-color-dot {
      position: fixed;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      background-color: white;
      box-shadow: 0 0 10px white;
      z-index: 999999999 !important;
      pointer-events: none;
      transition: top 0.2s ease, left 0.2s ease;
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  function bounceVisualizerWaveform() {
    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach((bar, i) => {
      const delay = Math.random() * 200;
      const scale = 1 + Math.random() * 2;
      setTimeout(() => {
        bar.style.transform = `scaleY(${scale.toFixed(2)})`;
        setTimeout(() => {
          bar.style.transform = 'scaleY(1)';
        }, 180 + Math.random() * 100);
      }, delay);
    });
  }

  function getCurrentTrackInfo() {
    const title = document.querySelector('[data-testid="context-item-info-title"]')?.innerText?.trim();
    const artist = document.querySelector('[data-testid="context-item-info-subtitles"]')?.innerText?.trim();
    return title && artist ? { title, artist } : null;
  }

  function simulateBPMChange() {
    beatInterval = 60 / (fallbackBPM + Math.floor(Math.random() * 10 - 5));
    if (beatTimer) clearInterval(beatTimer);
    beatTimer = setInterval(() => bounceVisualizerWaveform(), beatInterval * 1000);
    console.log("🎵 Simulated BPM:", (60 / beatInterval).toFixed(1));
  }

  function getDominantColorFromImg(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) return '#ffffff';
    canvas.width = width;
    canvas.height = height;
    try {
      ctx.drawImage(img, 0, 0);
      const x = Math.floor(width / 2);
      const y = Math.floor(height / 2);
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      return `rgb(${r}, ${g}, ${b})`;
    } catch {
      return '#ffffff';
    }
  }

  function updateVisualizerColor() {
    const img = document.querySelector('[data-testid="now-playing-widget"] img');
    if (!img) return;
    if (!img.complete || img.naturalWidth === 0) return;

    const color = getDominantColorFromImg(img);
    lastColor = color;

    document.querySelectorAll('.visualizer-bar').forEach(bar => {
      bar.style.background = `linear-gradient(180deg, #ffffff, ${color})`;
    });

    let dot = document.querySelector('.visualizer-color-dot');
    if (!dot) {
      dot = document.createElement('div');
      dot.className = 'visualizer-color-dot';
      document.body.appendChild(dot);
    }

    const rect = img.getBoundingClientRect();
    const scaleX = rect.width / img.naturalWidth;
    const scaleY = rect.height / img.naturalHeight;
    const offsetX = rect.left + (img.naturalWidth / 2) * scaleX;
    const offsetY = rect.top + (img.naturalHeight / 2) * scaleY;
    dot.style.left = `${offsetX}px`;
    dot.style.top = `${offsetY}px`;
    dot.style.opacity = 1;
    setTimeout(() => {
      dot.style.opacity = 0.3;
    }, 5000);
  }

  // Always bounce (Lite)
  beatTimer = setInterval(() => bounceVisualizerWaveform(), beatInterval * 1000);

  if (isPro) {
    setInterval(() => {
      simulateBPMChange();
      updateVisualizerColor();
    }, 4000);
  }

  const observer = new MutationObserver(() => {
    const isPaused = document.querySelector('[data-testid="control-button-play"]');
    wrapper.classList.toggle('paused', !!isPaused);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  console.log("🎵 Spotify Visualizer Enhanced " + (isPro ? "+ PRO" : "") + " active.");
}
