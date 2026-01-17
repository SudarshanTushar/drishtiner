// --- INDIGENOUS MAP DATA (Mocked OGD India) ---
  export const NE_HUBS = [
  { name: 'Guwahati', lat: 26.1445, lng: 91.7362 },
  { name: 'Shillong', lat: 25.5788, lng: 91.8933 },
  { name: 'Kohima', lat: 25.6751, lng: 94.1086 },
  { name: 'Tezpur', lat: 26.6528, lng: 92.7926 },
  { name: 'Dimapur', lat: 25.8629, lng: 93.7736 },
  { name: 'Silchar', lat: 24.8333, lng: 92.7789 },
  { name: 'Itanagar', lat: 27.0844, lng: 93.6053 }
];

const ROADS = [
  { from: 'Guwahati', to: 'Shillong', dist: 100, slope: 45 },
  { from: 'Guwahati', to: 'Tezpur', dist: 180, slope: 10 },
  { from: 'Tezpur', to: 'Dimapur', dist: 170, slope: 15 },
  { from: 'Dimapur', to: 'Kohima', dist: 74, slope: 50 },
  { from: 'Shillong', to: 'Silchar', dist: 210, slope: 60 },
  { from: 'Guwahati', to: 'Dimapur', dist: 280, slope: 12 }
];

export function findSafestPath(start, end, rainMm) {
  const dists = {};
  const prev = {};
  NE_HUBS.forEach(h => dists[h.name] = Infinity);
  dists[start] = 0;
  
  const queue = new Set(NE_HUBS.map(h => h.name));

  while(queue.size > 0) {
    let u = null;
    queue.forEach(n => { if(!u || dists[n] < dists[u]) u = n; });
    if(dists[u] === Infinity || u === end) break;
    queue.delete(u);

    const edges = ROADS.filter(r => r.from === u || r.to === u);
    edges.forEach(e => {
      const v = e.from === u ? e.to : e.from;
      if(!queue.has(v)) return;

      let riskPenalty = 0;
      if (rainMm > 150 && e.slope > 40) riskPenalty = 5.0; 
      else if (rainMm > 100 && e.slope > 30) riskPenalty = 1.0; 

      const alt = dists[u] + e.dist * (1 + riskPenalty);
      if(alt < dists[v]) {
        dists[v] = alt;
        prev[v] = u;
      }
    });
  }

  const path = [];
  let curr = end;
  if(!prev[curr] && curr !== start) return null;
  while(curr) { path.unshift(curr); curr = prev[curr]; }
  
  return { 
    path: path.map(n => NE_HUBS.find(h => h.name === n)),
    details: {
      dist: Math.round(dists[end]),
      risk: dists[end] > 500 ? "CRITICAL" : "SECURE",
      warnings: rainMm > 150 ? ["Landslide Risk High", "Soil Liquefaction Warning"] : []
    }
  };
}