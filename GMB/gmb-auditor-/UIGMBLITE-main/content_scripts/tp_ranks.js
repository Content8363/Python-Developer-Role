// // Inject a full-screen loading overlay
// const loader = document.createElement('div');
// loader.id = 'gmb-loader-overlay';
// loader.style = `
//   position: fixed;
//   top: 0; left: 0;
//   width: 100vw;
//   height: 100vh;
//   background: rgba(255, 255, 255, 0.9);
//   z-index: 999999;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   font-size: 20px;
//   font-weight: bold;
//   color: #333;
//   font-family: sans-serif;
// `;
// loader.innerText = '🔄 Fetching business rankings…';
// document.body.appendChild(loader);

// (() => {
//   const scrape = () => {
//     const cards = [...document.querySelectorAll('.Nv2PK')];
//     const rankings = cards.map((c, i) => ({
//       rank: i + 1,
//       name: c.querySelector('.qBF1Pd')?.textContent.trim() || '—'
//     }));

//     // ➜ persist for Teleport
//     chrome.storage.local.set({ tp_rankings: rankings });

//     // ➜ live push for open Teleport tab
//     chrome.runtime.sendMessage({ type: 'TP_RANKINGS', data: rankings });

//     console.table(rankings);
//   };
//   setTimeout(scrape, 3000);
// })();


chrome.storage.local.get('tp_active', ({ tp_active }) => {
  if (!tp_active) {
    console.log("🚫 Skipping tp_ranks.js because teleport is not active.");
    return;
  }

  console.log("✅ Running tp_ranks.js for teleport search.");

  const loader = document.createElement('div');
  loader.id = 'gmb-loader-overlay';
  loader.style = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 255, 255, 0.9);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: bold;
    color: #333;
    font-family: sans-serif;
  `;
  loader.innerText = '🔄 Fetching business rankings…';
  document.body.appendChild(loader);

  setTimeout(() => {
    const cards = [...document.querySelectorAll('.Nv2PK')];
    const rankings = cards.map((c, i) => ({
      rank: i + 1,
      name: c.querySelector('.qBF1Pd')?.textContent.trim() || '—'
    }));

    chrome.storage.local.set({ tp_rankings: rankings, tp_active: false }); // reset flag
    chrome.runtime.sendMessage({ type: 'TP_RANKINGS', data: rankings });

    console.table(rankings);
    loader.remove();
  }, 3000);
});
