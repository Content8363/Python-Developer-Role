const $ = q => document.querySelector(q);

// Tab navigation (Tailwind-based)
for (const btn of document.querySelectorAll('nav .tab')) {
  btn.onclick = () => {
     const tabId = btn.dataset.tab;

      // Special case: AI TOOL should open new tab instead of showing section
    if (tabId === "Ai_Tool") {
      chrome.tabs.create({ url: chrome.runtime.getURL("pages/ai-tools.html") });
      return;
    }
    // Reset all tabs
    document.querySelectorAll('nav .tab').forEach(t => {
      t.classList.remove('bg-blue-600', 'text-white');
      t.classList.add('text-gray-700');
    });

    // Highlight the clicked tab
    btn.classList.add('bg-blue-600', 'text-white');
    btn.classList.remove('text-gray-700');

    // Show the relevant section
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(btn.dataset.tab).classList.remove('hidden');
  };
}

//--------------------Teleport-----------------
document.getElementById('tp_go').onclick = () => {
  const qEl = document.getElementById('tp_query');
  const query = qEl.value.trim();
  if (!query) {
    alert('Enter a search query');
    return;
  }

  chrome.storage.local.set({ tp_query: query, tp_active: true }, () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('pages/teleport.html') });
    window.close();
  });
};

// ---------------GMB info refresher---------------
const refreshGmb = () => {
  chrome.storage.local.get('gmb_details', ({ gmb_details }) => {
    const box = document.getElementById('gmb_box');
    if (!gmb_details) {
      box.innerHTML = `<p style="color: gray;">…waiting for data</p>`;
      return;
    }

    const {
      name, address, website, phone, category,
      lat, lng, placeId, kgId, links
    } = gmb_details;

    box.innerHTML = `
      <div style="margin-bottom: 8px;">
        <span style="font-size: 14px;">🧠 <b>GMB Lite Panel</b></span>
      </div>
      <div><b>Name:</b> ${name || '-'}</div>
      <div><b>Address:</b> ${address || '-'}</div>
      <div><b>Website:</b> <a href="http://${website}" target="_blank" style="color:#1a73e8;">${website}</a></div>
      <div><b>Phone:</b> ${phone || 'Phone not found'}</div>
      <div><b>Category:</b> ${category || '-'}</div>
      <div><b>Latitude:</b> ${lat || '-'}</div>
      <div><b>Longitude:</b> ${lng || '-'}</div>
      <div><b>Place ID:</b> ${placeId || '-'}</div>
      <div><b>Knowledge Panel ID:</b> ${kgId || 'Not found'}</div>
      <br/>
      
      <div><b>🔗 GMB Links:</b></div>
      <ul style="list-style: none; padding-left: 0; margin-top: 4px;">
        <li><a href="${links?.gmb?.reviewList}" target="_blank" style="color:#1a73e8;">Review list</a></li>
        <li><a href="${links?.gmb?.reviewWrite}" target="_blank" style="color:#1a73e8;">Review request</a></li>
        <li><a href="${links?.gmb?.panel}" target="_blank" style="color:#1a73e8;">Knowledge Panel</a></li>
        <li><a href="${links?.gmb?.post}" target="_blank" style="color:#1a73e8;">GMB Post</a></li>
        <li><a href="${links?.gmb?.questions}" target="_blank" style="color:#1a73e8;">Q&A URL</a></li>
        <li><a href="${links?.gmb?.services}" target="_blank" style="color:#1a73e8;">Services</a></li>
        <li><a href="${links?.gmb?.products}" target="_blank" style="color:#1a73e8;">Products</a></li>
      </ul>

      <br/>
      <div><b>🌐 SEO & External Tools:</b></div>
      <ul style="list-style: none; padding-left: 0; margin-top: 4px;">
        <li><a href="${links?.seo?.cache}" target="_blank" style="color:#1a73e8;">Google Cache</a></li>
        <li><a href="${links?.seo?.siteSearch}" target="_blank" style="color:#1a73e8;">Content Indexed</a></li>
        <li><a href="${links?.seo?.siteWeek}" target="_blank" style="color:#1a73e8;">Content This Week</a></li>
        <li><a href="${links?.seo?.pageSpeed}" target="_blank" style="color:#1a73e8;">PageSpeed</a></li>
        <li><a href="${links?.seo?.mobile}" target="_blank" style="color:#1a73e8;">Mobile Friendly</a></li>
        <li><a href="${links?.seo?.schema}" target="_blank" style="color:#1a73e8;">Schema Test</a></li>
        <li><a href="${links?.seo?.whois}" target="_blank" style="color:#1a73e8;">WhoIs Lookup</a></li>
        <li><a href="${links?.seo?.builtwith}" target="_blank" style="color:#1a73e8;">BuiltWith Tech</a></li>
        <li><a href="${links?.seo?.neilpatel}" target="_blank" style="color:#1a73e8;">Neil Patel Audit</a></li>
        <li><a href="${links?.seo?.wayback}" target="_blank" style="color:#1a73e8;">Wayback History</a></li>
      </ul>

      <br/>
<button id="open_full_info"
        style="margin-top: 12px; padding: 6px 10px; font-size: 13px;
               background: #1a73e8; color: white; border: none; border-radius: 4px;
               cursor: pointer; width: 100%;">
  🔎 View Full Info Page
</button>

    `;
  });
};

refreshGmb();

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'open_full_info') {
    chrome.tabs.create({ url: chrome.runtime.getURL('info-full.html') });
  }
});


// ---------------------Reviews----------------------------
document.getElementById('rev_go').onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!/https:\/\/.*google\..*\/maps\/place\//.test(tab.url)) {
      alert('Open a Google Maps business page first.');
      return;
    }
    chrome.tabs.sendMessage(tab.id, { action: 'scrape_reviews' }).catch(() => { });
  });
};

// Chart rendering
let revChart;
const drawChart = (monthly) => {
  if (!window.Chart) return;
  const ctx = document.getElementById('rev_chart');
  if (revChart) revChart.destroy();
  revChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthly.map(m => m.month),
      datasets: [
        { label: 'Total reviews', data: monthly.map(m => m.count), borderWidth: 1 },
        { label: 'Avg rating', data: monthly.map(m => m.avg.toFixed(2)), borderWidth: 1 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
};

chrome.runtime.onMessage.addListener((m) => {
  if (m.type === 'REV_CHART_DATA') {
    drawChart(m.data);
  }
});

chrome.runtime.onMessage.addListener((m) => {
  if (m.type === 'GMB_DETAILS') {
    chrome.storage.local.set({ gmb_details: m.data }, refreshGmb);
  }
});


// 🧠 Listen for review scraping to finish and open report
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "scraping_done") {
    chrome.storage.local.set({ scrapedReviews: msg.reviews }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("pages/report.html") });
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      tabContents.forEach((tc) => tc.classList.add("hidden"));
      const tabId = btn.id.replace("-tab", "-content");
      document.getElementById(tabId).classList.remove("hidden");
    });
  });
});


  // -----------AI TOOL--------------------
  document.querySelector("[data-tab='Ai_Tool']").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("ai-tools.html") });
});

  // const GEMINI_API_KEY = "AIzaSyDpYUehnolHnCDl-8DJeYAvzTAkwQHRCnk";
  // const TOOL_LABELS = {
  //   "gmb-post": "Create a Google My Business post for",
  //   "facebook-post": "Create a Facebook post for",
  //   "category": "Find categories for",
  //   "service": "List services for",
  //   "review-response": "Write a review response for",
  //   "qa": "Generate common questions and answers for"
  // };

  // document.querySelectorAll(".ai-button").forEach(button => {
  //   button.addEventListener("click", async () => {
  //     const toolId = button.dataset.tool;
  //     // const prompt = TOOL_LABELS[toolId] + " Visacent LTD."; // Replace with dynamic name if needed
  //     chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  //       chrome.tabs.sendMessage(tab.id, { action: "get_business_name" }, async (response) => {
  //         const name = response?.name || "a business";
  //         const prompt = TOOL_LABELS[toolId] + " " + name;
  //         const textarea = document.getElementById("gmb-result");
  //         textarea.value = "Loading...";
  //       });
  //     });
  //         try {
  //           const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
  //             method: "POST",
  //             headers: { "Content-Type": "application/json" },
  //             body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  //           });
  //           const data = await res.json();
  //           textarea.value = data.candidates?.[0]?.content?.parts?.[0]?.text || "❌ No response from Gemini";
  //         } catch (e) {
  //           textarea.value = "❌ Error: " + e.message;
  //         }
  //       });
  //       });
  //     });
  //   });

//   document.querySelectorAll(".ai-button").forEach(button => {
//   button.addEventListener("click", () => {
//     const toolId = button.dataset.tool;
//     chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
//       chrome.tabs.sendMessage(tab.id, { action: "get_business_name" }, async (response) => {
//         const name = response?.name || "a business";
//         const prompt = TOOL_LABELS[toolId] + " " + name;
//         const textarea = document.getElementById("gmb-result");
//         textarea.value = "Loading...";

//         try {
//           const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
//           });
//           const data = await res.json();
//           textarea.value = data.candidates?.[0]?.content?.parts?.[0]?.text || "❌ No response from Gemini";
//         } catch (e) {
//           textarea.value = "❌ Error: " + e.message;
//         }
//       });
//     });
//   });
// });

// document.addEventListener("DOMContentLoaded", () => {
//   const GEMINI_API_KEY = "AIzaSyDpYUehnolHnCDl-8DJeYAvzTAkwQHRCnk";

//   const TOOL_LABELS = {
//     "gmb-post": "Create a Google My Business post for",
//     "facebook-post": "Create a Facebook post for",
//     "category": "Find categories for",
//     "service": "List services for",
//     "review-response": "Write a review response for",
//     "qa": "Generate common questions and answers for"
//   };

//   document.querySelectorAll(".ai-button").forEach(button => {
//     button.addEventListener("click", () => {
//       const toolId = button.dataset.tool;

//       // Get current tab
//       chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
//         // Ask content script for business name
//         chrome.tabs.sendMessage(tab.id, { action: "get_business_name" }, async (response) => {
//           const name = response?.name || "a business";
//           const prompt = TOOL_LABELS[toolId] + " " + name;
//           const textarea = document.getElementById("gmb-result");
//           textarea.value = "Loading...";

//           try {
//             const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
//             });

//             const data = await res.json();
//             textarea.value = data.candidates?.[0]?.content?.parts?.[0]?.text || "❌ No response from Gemini";
//           } catch (e) {
//             textarea.value = "❌ Error: " + e.message;
//           }
//         });
//       });
//     });
//   });
// });


function processReviewData(reviews) {
  const monthlyData = {};

  reviews.forEach(({ rating, dateText }) => {
    const date = new Date(dateText);
    if (isNaN(date)) return;

    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[month]) {
      monthlyData[month] = { count: 0, sum: 0 };
    }

    monthlyData[month].count++;
    monthlyData[month].sum += rating;
  });

  const labels = Object.keys(monthlyData).sort();
  const cumulative = [];
  const avgRating = [];
  let total = 0;

  labels.forEach(month => {
    const { count, sum } = monthlyData[month];
    total += count;
    cumulative.push(total);
    avgRating.push((sum / count).toFixed(2));
  });

  return { labels, cumulative, avgRating };
}

function renderReviewAuditChart({ labels, cumulative, avgRating }) {
  const ctx = document.getElementById("rev_chart").getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total review with time",
          data: cumulative,
          borderColor: "#f97316", // orange
          backgroundColor: "#f97316",
          yAxisID: "y",
          tension: 0.3,
          pointRadius: 3,
          fill: false,
        },
        {
          label: "Average rating this month",
          data: avgRating,
          borderColor: "#dc2626", // red
          backgroundColor: "#dc2626",
          yAxisID: "y1",
          tension: 0.3,
          pointRadius: 3,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: "Review Audit Graph",
          font: {
            size: 18
          }
        },
        legend: {
          position: "top",
        },
        tooltip: {
          mode: "index",
          intersect: false,
        }
      },
      scales: {
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Total Reviews"
          },
          beginAtZero: true,
          ticks: {
            stepSize: 10
          }
        },
        y1: {
          type: "linear",
          position: "right",
          title: {
            display: true,
            text: "Average Rating"
          },
          min: 0,
          max: 5,
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            stepSize: 0.5
          }
        }
      }
    }
  });
}

document.getElementById("rev_go").addEventListener("click", () => {
  chrome.storage.local.get("scrapedReviews", ({ scrapedReviews }) => {
    if (!scrapedReviews || scrapedReviews.length === 0) {
      alert("No reviews found.");
      return;
    }

    const data = processReviewData(scrapedReviews);
    renderReviewAuditChart(data);
  });
});
