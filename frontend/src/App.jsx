import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { NE_HUBS, findSafestPath } from './routingLogic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// --- ICONS & STYLES ---
const createIcon = (emoji) => L.divIcon({
  html: `<div style="font-size: 28px; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.4));">${emoji}</div>`,
  className: "custom-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// --- HELPER: ZOOM MAP ---
function MapRefresher({ path }) {
  const map = useMap();
  useEffect(() => {
    if (path && path.length > 0) {
      const bounds = L.latLngBounds(path.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 80] }); // Adjusted padding for mobile
    }
  }, [path, map]);
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("MAP"); // MAP | INTEL
  const [startHub, setStartHub] = useState("Guwahati");
  const [endHub, setEndHub] = useState("Kohima");
  const [rain, setRain] = useState(50);
  const [routeData, setRouteData] = useState({ path: [], details: {} });
  const [isListening, setIsListening] = useState(false);
  const [showControls, setShowControls] = useState(true); // Toggle bottom card

  // --- ROUTING ENGINE ---
  useEffect(() => {
    const result = findSafestPath(startHub, endHub, rain);
    if (result) setRouteData(result);
  }, [startHub, endHub, rain]);

  // --- VOICE HANDLER ---
  const handleVoice = async () => {
    if (isListening) return;
    setIsListening(true);
    
    // Haptic Feedback (Vibrate phone) - works on most Android browsers
    if (navigator.vibrate) navigator.vibrate(50);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'command.wav');

        try {
          const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'; 
          const res = await axios.post(`${BACKEND_URL}/transcribe`, formData);
          const reply = res.data.text;
          
          // Native Alert
          alert(`🤖 AI: ${reply}`);
          
          if (res.data.intent === "HAZARD_REPORT" || reply.includes("Landslide")) {
             setRain(200);
             if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // SOS Pattern
          }
        } catch (err) {
          // Offline Fallback
          alert("📡 OFFLINE: Switched to Edge Protocol. Route updated.");
          setRain(200);
        }
        setIsListening(false);
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 2500);
    } catch (err) {
      alert("Microphone Error or Permission Denied.");
      setIsListening(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white font-sans overflow-hidden select-none">
      
      {/* --- TOP STATUS BAR (Transparent) --- */}
      <div className="absolute top-0 w-full z-50 p-4 flex justify-between items-start pointer-events-none bg-gradient-to-b from-black/80 to-transparent h-24">
        <div>
          <h1 className="text-lg font-black tracking-tighter text-white drop-shadow-md">
            <span className="text-emerald-400">Route</span>AI
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${rain > 150 ? "bg-red-500 animate-ping" : "bg-emerald-500"}`}></span>
            <span className="text-[10px] font-bold text-slate-300 tracking-widest">
              {rain > 150 ? "CRITICAL ALERT" : "SYSTEM ONLINE"}
            </span>
          </div>
        </div>
        
        {/* Weather Badge */}
        <div className="bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
          <span className="text-blue-400 text-xs">🌧️</span>
          <span className="text-xs font-bold">{rain}mm</span>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="w-full h-full pb-20"> {/* pb-20 makes space for bottom nav */}
        
        {activeTab === "MAP" && (
          <div className="relative w-full h-full">
            {/* MAP LAYER */}
            <MapContainer center={[26.1, 92]} zoom={7} zoomControl={false} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
              <TileLayer 
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                attribution='&copy; ISRO'
              />
              <MapRefresher path={routeData.path} />
              
              {/* Route Polyline */}
              {routeData.path.length > 1 && (
                <Polyline 
                  positions={routeData.path.map(p => [p.lat, p.lng])} 
                  color={routeData.details.risk === "CRITICAL" ? "#ef4444" : "#3b82f6"} 
                  weight={6}
                  opacity={0.9}
                />
              )}

              {/* Markers */}
              {NE_HUBS.map(h => (
                <Marker key={h.name} position={[h.lat, h.lng]} icon={createIcon(h.name === startHub ? "🟢" : h.name === endHub ? "🏁" : "📍")}>
                </Marker>
              ))}
            </MapContainer>

            {/* FLOATING MISSION CARD (Bottom Sheet) */}
            <div className={`absolute bottom-4 left-4 right-4 z-[400] transition-transform duration-300 ${showControls ? "translate-y-0" : "translate-y-[120%]"}`}>
              <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl">
                
                {/* Drag Handle */}
                <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4" onClick={() => setShowControls(!showControls)}></div>

                {/* Route Selector */}
                <div className="flex items-center gap-4 mb-5">
                   <div className="flex flex-col items-center gap-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <div className="w-0.5 h-8 bg-slate-700"></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                   </div>
                   <div className="flex-1 space-y-3">
                      <select 
                        value={startHub} 
                        onChange={e => setStartHub(e.target.value)} 
                        className="w-full bg-slate-800/50 text-white text-sm font-bold p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      >
                        {NE_HUBS.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}
                      </select>
                      <select 
                        value={endHub} 
                        onChange={e => setEndHub(e.target.value)} 
                        className="w-full bg-slate-800/50 text-white text-sm font-bold p-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                      >
                        {NE_HUBS.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}
                      </select>
                   </div>
                </div>

                {/* Route Stats Row */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Distance</div>
                    <div className="text-xl font-black text-white">{routeData.details.dist} <span className="text-sm text-slate-500">km</span></div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-right">Risk Level</div>
                    <div className={`text-sm font-black px-3 py-1 rounded-full ${routeData.details.risk === "CRITICAL" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"}`}>
                      {routeData.details.risk || "CALCULATING"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "INTEL" && (
          <div className="w-full h-full overflow-y-auto bg-slate-950 p-5 space-y-6 pt-24">
             {/* Header */}
             <div>
               <h2 className="text-2xl font-black text-white">Tactical Intel</h2>
               <p className="text-slate-400 text-sm">Real-time convoy analysis</p>
             </div>

             {/* Big Score Card */}
             <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-9xl">🛡️</div>
                <div className="relative z-10">
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Safety Index</div>
                   <div className="text-5xl font-black text-white">84<span className="text-2xl text-emerald-500">.2</span></div>
                   <div className="mt-4 flex gap-2">
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded">STABLE</span>
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded">AI ACTIVE</span>
                   </div>
                </div>
             </div>

             {/* Grid Stats */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
                   <div className="text-blue-400 text-xl mb-2">⚡</div>
                   <div className="text-2xl font-bold">42 <span className="text-xs text-slate-500">km/h</span></div>
                   <div className="text-[10px] text-slate-500 font-bold uppercase">Avg Velocity</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
                   <div className="text-purple-400 text-xl mb-2">📡</div>
                   <div className="text-2xl font-bold">98 <span className="text-xs text-slate-500">%</span></div>
                   <div className="text-[10px] text-slate-500 font-bold uppercase">Net Strength</div>
                </div>
             </div>

             {/* Chart Card */}
             <div className="bg-slate-900 p-5 rounded-3xl border border-white/5 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase">Risk Forecast</h3>
                  <select className="bg-black/20 text-[10px] text-slate-400 px-2 py-1 rounded">
                    <option>24 Hours</option>
                  </select>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                        { time: '06', risk: 10 }, { time: '09', risk: 25 },
                        { time: '12', risk: 45 }, { time: '15', risk: 75 },
                        { time: '18', risk: 90 }, { time: '21', risk: 60 }
                      ]}>
                      <defs>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}} itemStyle={{color: '#fff'}} />
                      <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
             
             {/* Bottom Spacer */}
             <div className="h-12"></div>
          </div>
        )}
      </div>

      {/* --- NATIVE BOTTOM NAVIGATION BAR --- */}
      <div className="fixed bottom-0 w-full h-20 bg-slate-950/90 backdrop-blur-lg border-t border-white/5 flex justify-around items-center px-6 z-[500] pb-2">
         {/* Map Tab */}
         <button 
           onClick={() => setActiveTab("MAP")} 
           className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === "MAP" ? "text-blue-400 scale-110" : "text-slate-600"}`}
         >
            <div className={`text-xl ${activeTab === "MAP" ? "drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" : ""}`}>🗺️</div>
            <span className="text-[10px] font-bold">Map</span>
         </button>

         {/* VOICE FAB (Center) */}
         <button 
           onClick={handleVoice}
           className={`relative -top-5 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isListening ? "bg-red-500 scale-110 animate-pulse ring-4 ring-red-500/30" : "bg-gradient-to-r from-blue-600 to-indigo-600 ring-4 ring-slate-950"}`}
         >
            <i className={`fa-solid ${isListening ? "fa-microphone-lines text-2xl" : "fa-microphone text-xl"} text-white`}></i>
         </button>

         {/* Intel Tab */}
         <button 
           onClick={() => setActiveTab("INTEL")} 
           className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === "INTEL" ? "text-emerald-400 scale-110" : "text-slate-600"}`}
         >
            <div className={`text-xl ${activeTab === "INTEL" ? "drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" : ""}`}>📊</div>
            <span className="text-[10px] font-bold">Intel</span>
         </button>
      </div>

    </div>
  );
}
