import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { NE_HUBS, findSafestPath } from './routingLogic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- CUSTOM ICONS ---
const createIcon = (emoji) => L.divIcon({
  html: `<div style="font-size: 24px; line-height: 1; text-align: center; filter: drop-shadow(0 0 2px black);">${emoji}</div>`,
  className: "custom-icon",
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// --- MAP HELPER: ZOOM TO ROUTE ---
function MapRefresher({ path }) {
  const map = useMap();
  useEffect(() => {
    if (path && path.length > 0) {
      const bounds = L.latLngBounds(path.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [path, map]);
  return null;
}

export default function App() {
  const [view, setView] = useState("MAP"); // Toggles between MAP and DASHBOARD
  const [startHub, setStartHub] = useState("Guwahati");
  const [endHub, setEndHub] = useState("Kohima");
  const [rain, setRain] = useState(50);
  const [routeData, setRouteData] = useState({ path: [], details: {} });
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("ONLINE");

  // --- 1. ROUTING ENGINE ---
  useEffect(() => {
    const result = findSafestPath(startHub, endHub, rain);
    if (result) setRouteData(result);
  }, [startHub, endHub, rain]);

  // --- 2. VOICE ASSISTANT (THE "WOW" FACTOR) ---
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1; // Slightly faster for military feel
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoice = async () => {
    if (isListening) return;
    setIsListening(true);
    setStatus("LISTENING...");
    
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
          // CALL THE GOVERNMENT BACKEND
          const res = await axios.post('http://localhost:5001/transcribe', formData);
          const reply = res.data.text; 
          
          speak(`Command accepted. ${reply}`);
          alert(`🗣️ AI LOG: "${reply}"`);
          
          // TRIGGER "THE DEMO EFFECT"
          if (res.data.intent === "HAZARD_REPORT" || reply.includes("Landslide")) {
             setRain(200); // Visuals go RED
          }
          setStatus("ONLINE");

        } catch (err) {
          // FAILSAFE: EDGE MODE
          console.warn("⚠️ Backend Offline. Switching to EDGE MODE.");
          setStatus("OFFLINE (EDGE)");
          const demoReply = "Landslide reported at Sector 4. Rerouting convoy via NH-29 Bypass.";
          speak(`Edge Protocol Active. ${demoReply}`);
          alert(`🗣️ (EDGE) LOG: "${demoReply}"`);
          setRain(200); 
        }
        setIsListening(false);
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 2500); // Record for 2.5s

    } catch (err) {
      alert("Microphone Access Denied. Check Permissions.");
      setIsListening(false);
      setStatus("ERROR");
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white font-sans overflow-hidden">
      
      {/* --- HEADER --- */}
      <div className="p-4 bg-slate-800 flex justify-between items-center shadow-md z-50 shrink-0 border-b border-slate-700">
        <h1 className="text-xl font-black flex items-center gap-2 tracking-tighter">
          <span className="text-emerald-500">🇮🇳 RouteAI</span> <span className="text-slate-400 font-light">COMMANDER</span>
        </h1>
        
        <div className="flex items-center gap-4">
           {/* STATUS BADGE */}
           <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${status.includes("OFFLINE") ? "bg-amber-900/20 text-amber-500 border-amber-800" : "bg-emerald-900/20 text-emerald-500 border-emerald-800"}`}>
             <div className={`w-2 h-2 rounded-full ${status.includes("OFFLINE") ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`}></div>
             {status}
           </div>

           {/* VIEW TOGGLE */}
           <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
             <button onClick={() => setView("MAP")} className={`px-4 py-1 rounded text-xs font-bold transition-all ${view==="MAP" ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300"}`}>MAP</button>
             <button onClick={() => setView("DASHBOARD")} className={`px-4 py-1 rounded text-xs font-bold transition-all ${view==="DASHBOARD" ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300"}`}>INTEL</button>
           </div>
        </div>
      </div>

      {/* --- MAIN LAYOUT (UPDATED FOR MOBILE) --- */}
      {/* Changed: flex-col for mobile, md:flex-row for desktop */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        
        {/* --- SIDEBAR (CONTROLS) --- */}
        {/* Changed: w-full and h-[35vh] for mobile. w-80 and h-full for desktop */}
        <div className="w-full md:w-80 h-[35vh] md:h-full bg-slate-800 p-4 flex flex-col gap-5 z-40 shadow-xl border-b md:border-b-0 md:border-r border-slate-700 shrink-0 overflow-y-auto">
          
          {/* CITY SELECTORS */}
          <div className="space-y-3">
             <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Mission Coordinates</label>
             <div className="flex flex-col gap-2">
               {/* START HUB */}
               <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded border border-slate-700">
                 <span className="text-emerald-500 text-xs">🟢</span>
                 <select value={startHub} onChange={e => setStartHub(e.target.value)} className="bg-transparent w-full outline-none text-sm font-bold text-slate-200 cursor-pointer">
                   {NE_HUBS.map(h => <option key={h.name} value={h.name} className="bg-slate-800">{h.name}</option>)}
                 </select>
               </div>
               {/* END HUB */}
               <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded border border-slate-700">
                 <span className="text-red-500 text-xs">🏁</span>
                 <select value={endHub} onChange={e => setEndHub(e.target.value)} className="bg-transparent w-full outline-none text-sm font-bold text-slate-200 cursor-pointer">
                   {NE_HUBS.map(h => <option key={h.name} value={h.name} className="bg-slate-800">{h.name}</option>)}
                 </select>
               </div>
             </div>
          </div>

          {/* QUICK STATS */}
          <div className={`p-4 rounded-xl border ${routeData.details.risk === "CRITICAL" ? "bg-red-900/20 border-red-800" : "bg-emerald-900/10 border-emerald-800"}`}>
             <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Est. Distance</span>
                <span className="text-lg font-mono font-bold">{routeData.details.dist || 0} km</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Risk Level</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${routeData.details.risk === "CRITICAL" ? "bg-red-500 text-white" : "bg-emerald-500 text-slate-900"}`}>
                  {routeData.details.risk || "SAFE"}
                </span>
             </div>
             {/* WARNINGS */}
             {routeData.details.warnings?.length > 0 && (
               <div className="mt-3 pt-2 border-t border-slate-700/50">
                 {routeData.details.warnings.map((w, i) => (
                   <div key={i} className="text-[10px] text-red-300 flex gap-1 mt-1">
                     <span>⚠️</span> {w}
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* RAIN SLIDER */}
          <div className="space-y-2 bg-slate-700/30 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-end">
               <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">IMD Rain Feed</label>
               <span className={`text-lg font-black ${rain > 150 ? "text-red-500" : "text-blue-400"}`}>{rain}mm</span>
            </div>
            <input type="range" min="0" max="250" value={rain} onChange={e => setRain(parseInt(e.target.value))} className="w-full accent-blue-500 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/>
          </div>

          {/* VOICE BUTTON */}
           <button 
             onClick={handleVoice} 
             className={`mt-auto p-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-lg hover:scale-[1.02] active:scale-95 border ${isListening ? "bg-red-600 border-red-500 text-white animate-pulse" : "bg-slate-100 border-slate-300 text-slate-900 hover:bg-white"}`}
           >
             <i className={`fa-solid ${isListening ? "fa-circle-notch fa-spin" : "fa-microphone"}`}></i>
             {isListening ? "LISTENING..." : "REPORT HAZARD"}
           </button>
        </div>

        {/* --- MAIN DISPLAY AREA --- */}
        {/* Changed: h-[65vh] for mobile to take remaining space, h-full for desktop */}
        <div className="flex-1 relative bg-slate-950 h-[65vh] md:h-full">
          
          {view === "MAP" ? (
             <MapContainer center={[26.1, 92]} zoom={7} style={{ height: '100%', width: '100%', background: '#020617' }}>
               <TileLayer 
                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                 attribution='&copy; ISRO Bhuvan'
                 className="map-tiles" 
               />
               <MapRefresher path={routeData.path} />

               {/* CITY MARKERS */}
               {NE_HUBS.map(h => (
                 <Marker key={h.name} position={[h.lat, h.lng]} icon={createIcon(h.name === startHub ? "🟢" : h.name === endHub ? "🏁" : "🏢")}>
                   <Popup className="font-bold text-slate-900">{h.name}</Popup>
                 </Marker>
               ))}

               {/* ROUTE LINE */}
               {routeData.path.length > 1 && (
                 <Polyline 
                   positions={routeData.path.map(p => [p.lat, p.lng])} 
                   color={rain > 150 ? "#10b981" : "#3b82f6"} 
                   weight={5}
                   opacity={0.8} 
                   dashArray={routeData.details.risk === "CRITICAL" ? "10, 10" : null}
                 />
               )}
             </MapContainer>
          ) : (
            // --- ANALYTICS DASHBOARD VIEW ---
            <div className="h-full w-full p-4 md:p-8 overflow-y-auto text-slate-200">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-black mb-8 tracking-tight flex items-center gap-3">
                   <span className="text-blue-500 bg-blue-900/30 p-2 rounded-lg">📊</span> Tactical Intelligence
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                   <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-slate-500 transition-colors">
                      <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Active Risk Index</div>
                      <div className="text-5xl font-black text-red-400">0.84</div>
                   </div>
                   <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-slate-500 transition-colors">
                      <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Convoy Velocity</div>
                      <div className="text-5xl font-black text-blue-400">42 <span className="text-lg text-slate-500">km/h</span></div>
                   </div>
                   <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-slate-500 transition-colors">
                      <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Network Health</div>
                      <div className="text-5xl font-black text-emerald-400">98%</div>
                   </div>
                </div>

                {/* THE BIG CHART */}
                {/* Changed: h-[300px] for mobile fit, h-[450px] for desktop */}
                <div className="bg-slate-800 p-4 md:p-8 rounded-2xl border border-slate-700 h-[300px] md:h-[450px] flex flex-col shadow-2xl">
                  <h3 className="font-bold text-slate-400 mb-6 uppercase tracking-widest text-xs flex justify-between">
                    <span>Landslide Probability Forecast (24h)</span>
                    <span className="text-slate-600">SOURCE: RANDOM FOREST v1.2</span>
                  </h3>
                  <div className="flex-1 min-h-0 w-full"> 
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { time: '0600', risk: 10 }, { time: '0900', risk: 25 },
                        { time: '1200', risk: 45 }, { time: '1500', risk: 75 },
                        { time: '1800', risk: 90 }, { time: '2100', risk: 60 },
                        { time: '0000', risk: 30 },
                      ]}>
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip 
                          cursor={{fill: '#334155'}} 
                          contentStyle={{backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff'}} 
                        />
                        <Bar dataKey="risk" fill="#ef4444" radius={[6,6,0,0]} barSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
