

// ===============================
// Path-resolver (werkt in ELKE directory op GitHub Pages)
// - probeert eerst huidige directory
// - daarna repo-root (bijv. /praatkaarten/)
// - daarna (optioneel) parent directories
// ===============================
function getRepoRoot(){
  const parts = location.pathname.split('/').filter(Boolean);
  // GitHub Pages project site: eerste segment is repo-name
  // /<repo>/... -> repo root = /<repo>/
  if(parts.length>=1) return `/${parts[0]}/`;
  return '/';
}
function currentDirUrl(){
  return new URL('./', location.href);
}
function resolveResourceUrl(rel){
  const relClean = rel.replace(/^\//,''); // nooit absolute slash
  const tries = [];
  const cur = currentDirUrl();
  tries.push(new URL(relClean, cur));

  // probeer parent directories (max 3 niveaus) voor het geval je nested test-mappen hebt
  let parent = cur;
  for(let i=0;i<3;i++){
    parent = new URL('../', parent);
    tries.push(new URL(relClean, parent));
  }

  // repo root als laatste (meest stabiel)
  const repoRoot = new URL(getRepoRoot(), location.origin);
  tries.push(new URL(relClean, repoRoot));

  // ook repoRoot + "praatkaarten-main/" fallback (voor oudere structuren)
  tries.push(new URL(`praatkaarten-main/${relClean}`, repoRoot));

  return tries;
}
async function fetchJsonFallback(rel){
  const urls = resolveResourceUrl(rel);
  let lastErr = null;
  for(const u of urls){
    try{
      const r = await fetch(u.toString(), { cache: 'no-store' });
      if(r.ok) return await r.json();
      lastErr = new Error(`HTTP ${r.status} for ${u}`);
    }catch(e){
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Kon ${rel} niet laden`);
}
async function fetchTextFallback(rel){
  const urls = resolveResourceUrl(rel);
  let lastErr = null;
  for(const u of urls){
    try{
      const r = await fetch(u.toString(), { cache: 'no-store' });
      if(r.ok) return await r.text();
      lastErr = new Error(`HTTP ${r.status} for ${u}`);
    }catch(e){
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Kon ${rel} niet laden`);
}
const toggle = document.getElementById('toggleUitleg');
const container = document.getElementById('uitlegContainer');
const text = document.getElementById('uitlegText');

text.textContent = "Deze kaarten nodigen je uit om samen te kijken naar wat er speelt, zichtbaar wordt en onbesproken blijft.";

toggle.addEventListener('click', () => {
  container.classList.toggle('expanded');
  container.classList.toggle('collapsed');
  toggle.textContent = container.classList.contains('expanded') ? 'Verberg uitleg' : 'Toon uitleg';
});
