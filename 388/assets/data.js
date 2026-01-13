// data.js – load JSON data (v3.6.2)
export const VERSION = "3.6.2";

const withV = (u) => u + (u.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(VERSION);

export async function fetchJson(relPath) {
  // Relatief pad is genoeg zolang alles in dezelfde map staat.
  const res = await fetch(withV(relPath), { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch mislukt: ${relPath} (${res.status})`);
  return res.json();
}

export async function loadQuestions() {
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
  // voorkeur: uitleg-data.json, fallback: intro-data.json
  try {
    return await fetchJson("uitleg-data.json");
  } catch (_e) {
    return await fetchJson("intro-data.json");
  }
}
