// data.js – load JSON data (v3.6.2)
export const VERSION = "3.6.3";

const withV = (u) => u + (u.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(VERSION);

export async function fetchJson(relPath) {
  // Relatief pad is genoeg zolang alles in dezelfde map staat.
  const res = await fetch(withV(relPath), { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch mislukt: ${relPath} (${res.status})`);
  return res.json();
}

export async function loadQuestions() {
  // 1) Eerst proberen uit embedded JSON (werkt ook bij file:// openen)
  //    <script id="questions-json" type="application/json">...</script>
  const embedded = document.getElementById("questions-json")?.textContent?.trim();
  if (embedded) {
    try {
      const q = JSON.parse(embedded);

      // Jouw format: { verkennen:[...], duiden:[...], ... }
      if (q && typeof q === "object" && !Array.isArray(q)) {
        const keys = Object.keys(q);
        const looksLikeMap = keys.length && keys.every(k => Array.isArray(q[k]));
        if (looksLikeMap) {
          const items = [];
          keys.forEach((theme) => {
            q[theme].forEach((text, i) => {
              items.push({
                id: `${theme}-${i+1}`,
                theme,
                index: i + 1,
                text,
                img: withV(`cards/${theme}.svg`)
              });
            });
          });
          return items;
        }
      }

      if (Array.isArray(q)) return q;
      // zo niet, val door naar fetch
    } catch (_e) {
      // val door naar fetch
    }
  }

  // 2) Fallback: ophalen via fetch (werkt op GitHub Pages / server)
  const q = await fetchJson("questions.json");

  // Jouw format: { verkennen:[...], duiden:[...], ... }
  if (q && typeof q === "object" && !Array.isArray(q)) {
    const keys = Object.keys(q);
    const looksLikeMap = keys.length && keys.every(k => Array.isArray(q[k]));
    if (looksLikeMap) {
      const items = [];
      keys.forEach((theme) => {
        q[theme].forEach((text, i) => {
          items.push({
            id: `${theme}-${i+1}`,
            theme,
            index: i + 1,
            text,
            img: withV(`cards/${theme}.svg`)
          });
        });
      });
      return items;
    }
  }

  // Fallback: als het al een array is
  if (Array.isArray(q)) return q;

  throw new Error("Onbekend questions.json formaat");
}

export async function loadUitlegSlides() {
  // 1) Eerst embedded JSON (werkt ook bij file:// openen)
  //    <script id="intro-json" type="application/json">...</script>
  const embedded = document.getElementById("intro-json")?.textContent?.trim();
  if (embedded) {
    try { return JSON.parse(embedded); } catch(_e) {}
  }

  // 2) Fallback via fetch: voorkeur uitleg-data.json, anders intro-data.json
  try { return await fetchJson("uitleg-data.json"); }
  catch (_e) { return await fetchJson("intro-data.json"); }
}
