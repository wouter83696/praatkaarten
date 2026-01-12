// assets/data.js – data loaders (v3.6.5)
export const VERSION = "3.6.5";

const withV = (u) => u + (u.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(VERSION);

async function fetchJson(relPath){
  const res = await fetch(withV(relPath), { cache: "no-store" });
  if(!res.ok) throw new Error(`Fetch mislukt: ${relPath} (${res.status})`);
  return res.json();
}

export async function loadQuestions(){
  const q = await fetchJson("questions.json");

  // Format A: { verkennen:[...], duiden:[...], ... }
  if(q && typeof q === "object" && !Array.isArray(q)){
    const keys = Object.keys(q);
    const looksLikeMap = keys.length && keys.every(k => Array.isArray(q[k]));
    if(looksLikeMap){
      const items = [];
      keys.forEach((theme) => {
        (q[theme] || []).forEach((text, i) => {
          items.push({
            id: `${theme}-${i+1}`,
            theme,
            index: i+1,
            text,
            img: withV(`cards/${theme}.svg`)
          });
        });
      });
      return items;
    }
  }

  // Format B: array of items
  if(Array.isArray(q)) return q;

  throw new Error("Onbekend questions.json formaat");
}

export async function loadUitlegSlides(){
  try {
    return await fetchJson("uitleg-data.json");
  } catch(_e) {
    return await fetchJson("intro-data.json");
  }
}

export function withVersion(url){ return withV(url); }
