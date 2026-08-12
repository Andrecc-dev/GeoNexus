import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchRealRouteWithTraffic } from '../services/geoService';

// Marcadores Visuais de Técnicos (Duplas)
const createTechIcon = (isSimulating = false, status = 'available') => {
  let bg = 'bg-emerald-500 shadow-emerald-500/50';
  let symbol = '👥'; // Ícone padrão para Dupla Técnica Disponível

  if (isSimulating) {
    bg = 'bg-amber-500 shadow-amber-500/50';
    symbol = '🚘'; // Em Deslocamento GPS
  } else if (status === 'busy' || status === 'traveling') {
    bg = 'bg-indigo-600 shadow-indigo-600/50';
    symbol = '🛠️'; // Em Atendimento
  } else if (status === 'offline') {
    bg = 'bg-slate-600 shadow-slate-600/50';
    symbol = '💤';
  }

  return L.divIcon({
    className: 'custom-tech-pin',
    html: `
      <div class="relative flex items-center justify-center w-10 h-10 ${bg} text-white rounded-full shadow-2xl border-2 border-white transform hover:scale-110 transition-transform ${isSimulating ? 'ring-4 ring-amber-400/50 animate-pulse' : ''}">
        <span class="text-xs font-bold">${symbol}</span>
        <span class="absolute -bottom-1 w-2.5 h-2.5 ${bg} rotate-45 border-r border-b border-white"></span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

// Marcadores Visuais dos Problemas (Chamados)
const createTicketIcon = (severity) => {
  const sev = severity?.toLowerCase();
  let bg = 'bg-amber-500 shadow-amber-500/50';
  let symbol = '⚠️';

  if (sev === 'critical') {
    bg = 'bg-red-600 shadow-red-600/60 animate-bounce';
    symbol = '🔥'; // Urgência Crítica
  } else if (sev === 'low') {
    bg = 'bg-sky-500 shadow-sky-500/50';
    symbol = '🔧'; // Urgência Baixa
  }

  return L.divIcon({
    className: 'custom-ticket-pin',
    html: `
      <div class="relative flex items-center justify-center w-9 h-9 ${bg} text-white rounded-xl shadow-xl border-2 border-slate-900">
        <span class="text-xs font-bold">${symbol}</span>
        <span class="absolute -bottom-1 w-2.5 h-2.5 ${bg} rotate-45 border-r border-b border-slate-900"></span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

const traduzirGravidade = (severity) => {
  const mapa = { critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' };
  return mapa[severity?.toLowerCase()] || severity;
};

function CameraFollower({ position, active }) {
  const map = useMap();
  useEffect(() => {
    if (active && position) {
      map.panTo(position, { animate: true, duration: 0.4 });
    }
  }, [position, active, map]);
  return null;
}

export default function Map({ technicians = [], tickets = [], onSelectTicket, activeTicketForRoute }) {
  const defaultCenter = [-20.3155, -40.3128]; // Vitória-ES

  const [routeData, setRouteData] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulatedLocation, setSimulatedLocation] = useState(null);
  const [simSpeed, setSimSpeed] = useState(2);

  const handleStartPitchSimulation = async () => {
    if (isSimulating) {
      setIsSimulating(false);
      return;
    }

    const targetTicket = activeTicketForRoute || tickets[0] || {
      id: 'pitch-ticket',
      code: 'CH-PITCH',
      title: 'Atendimento Crítico em Campo',
      severity: 'critical',
      location: { lat: -20.3015, lng: -40.2928, address: 'Praia do Canto, Vitória' }
    };

    const targetTech = technicians.find((t) => t.status === 'available') || technicians[0] || {
      id: 'tech-pitch',
      name: 'Dupla Técnico Campo (GPS)',
      team: 'Alfa',
      location: { lat: -20.3255, lng: -40.3328 }
    };

    setIsLoadingRoute(true);

    const routeResult = await fetchRealRouteWithTraffic(
      targetTech.location.lat,
      targetTech.location.lng,
      targetTicket.location.lat,
      targetTicket.location.lng
    );

    setRouteData(routeResult);
    setCurrentStep(0);

    if (routeResult?.coordinates?.length > 0) {
      setSimulatedLocation(routeResult.coordinates[0]);
      setIsSimulating(true);
    }

    setIsLoadingRoute(false);
  };

  useEffect(() => {
    if (!isSimulating || !routeData?.coordinates) return;

    const intervalMs = Math.max(80, 500 / simSpeed);

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next >= routeData.coordinates.length) {
          setIsSimulating(false);
          return prev;
        }
        setSimulatedLocation(routeData.coordinates[next]);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isSimulating, routeData, simSpeed]);

  const totalPoints = routeData?.coordinates?.length || 1;
  const progressPercent = Math.min(100, Math.round((currentStep / (totalPoints - 1 || 1)) * 100));
  const remainingDistanceKm = routeData ? Number((routeData.distanceKm * (1 - currentStep / totalPoints)).toFixed(2)) : 0;
  const remainingPath = routeData?.coordinates ? routeData.coordinates.slice(currentStep) : [];

  return (
    <div className="w-full flex flex-col font-sans relative">
      {/* Cabeçalho do Mapa */}
      <div className="flex flex-wrap justify-between items-center bg-slate-900 border border-slate-800 p-3 rounded-t-xl gap-2 z-20">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isSimulating ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`}></span>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Telemetria e Frota Ativa
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isSimulating && (
            <div className="flex items-center gap-2 text-xs bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-slate-400">Progresso: <strong className="text-emerald-400">{progressPercent}%</strong></span>
              <span className="text-slate-400">Restante: <strong className="text-amber-400">{remainingDistanceKm} km</strong></span>

              <div className="flex gap-1 ml-2">
                {[1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSimSpeed(speed)}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-mono font-bold ${
                      simSpeed === speed ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleStartPitchSimulation}
            disabled={isLoadingRoute}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg ${
              isSimulating
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
            } ${isLoadingRoute ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoadingRoute ? (
              <span>⏳ Trançando Rota...</span>
            ) : isSimulating ? (
              <span>⏸ Pausar Telemetria GPS</span>
            ) : (
              <span>▶ Simular Telemetria GPS (Pitch)</span>
            )}
          </button>
        </div>
      </div>

      {/* Renderização do Mapa e Legenda Integrada */}
      <div className="h-[480px] w-full rounded-b-xl overflow-hidden border-x border-b border-slate-800 relative z-10">
        
        {/* LEGENDA FLUTUANTE DO MAPA */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs space-y-2.5 max-w-[220px] pointer-events-auto">
          <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px] border-b border-slate-800 pb-1 flex justify-between items-center">
            <span>📍 Legenda do Mapa</span>
            <span className="text-[9px] text-emerald-400 font-mono">AO VIVO</span>
          </div>

          {/* Equipes / Técnicos */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Equipes (Duplas)</span>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold border border-white">👥</span>
              <span className="text-[11px]">Dupla Disponível</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] text-white font-bold border border-white animate-pulse">🚘</span>
              <span className="text-[11px]">Em Deslocamento (GPS)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold border border-white">🛠️</span>
              <span className="text-[11px]">Em Atendimento</span>
            </div>
          </div>

          {/* Problemas / Chamados */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gravidade do Problema</span>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-lg bg-red-600 flex items-center justify-center text-[10px] text-white font-bold border border-slate-900">🔥</span>
              <span className="text-[11px]">Urgência Crítica</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-lg bg-amber-500 flex items-center justify-center text-[10px] text-white font-bold border border-slate-900">⚠️</span>
              <span className="text-[11px]">Urgência Média/Alta</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-5 h-5 rounded-lg bg-sky-500 flex items-center justify-center text-[10px] text-white font-bold border border-slate-900">🔧</span>
              <span className="text-[11px]">Urgência Baixa</span>
            </div>
          </div>
        </div>

        <MapContainer center={defaultCenter} zoom={11} scrollWheelZoom={true} className="h-full w-full">
          <TileLayer
            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maxZoom={20}
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            attribution="&copy; Google Maps"
          />

          <CameraFollower position={simulatedLocation} active={isSimulating} />

          {remainingPath.length > 0 && (
            <Polyline
              positions={remainingPath}
              color={routeData?.trafficStatus === 'heavy' ? '#ef4444' : '#f59e0b'}
              weight={5}
              opacity={0.85}
              dashArray={isSimulating ? '6, 8' : undefined}
            />
          )}

          {/* Marcador em Deslocamento */}
          {simulatedLocation && (
            <Marker position={simulatedLocation} icon={createTechIcon(true)}>
              <Popup>
                <div className="p-1 text-slate-900 font-sans">
                  <strong className="block text-xs">Dupla Técnica em Deslocamento (GPS)</strong>
                  <span className="text-[11px] text-emerald-600 font-bold block">Sinal de Telemetria Ativo</span>
                  <span className="text-[11px] text-slate-600 block">Distância Restante: {remainingDistanceKm} km</span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marcadores das Duplas Técnicas */}
          {!simulatedLocation &&
            technicians?.map((tech) => tech.location && (
              <Marker key={`tech-${tech.id}`} position={[tech.location.lat, tech.location.lng]} icon={createTechIcon(false, tech.status)}>
                <Popup>
                  <div className="text-slate-900 font-sans p-1">
                    <strong className="block text-sm">Dupla Técnica: {tech.name}</strong>
                    <span className="text-xs text-slate-600 block">Equipe: {tech.team}</span>
                    <span className="text-xs font-semibold text-emerald-600 uppercase block mt-1">
                      Status: {tech.status === 'available' ? 'Disponível' : tech.status === 'busy' ? 'Em Atendimento' : tech.status}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Marcadores das Ocorrências / Problemas */}
          {tickets?.map((ticket) => ticket.location && (
            <Marker
              key={`ticket-${ticket.id}`}
              position={[ticket.location.lat, ticket.location.lng]}
              icon={createTicketIcon(ticket.severity)}
              eventHandlers={{
                click: () => onSelectTicket && onSelectTicket(ticket)
              }}
            >
              <Popup>
                <div className="text-slate-900 font-sans p-1">
                  <span className="text-xs font-mono font-bold text-red-600">{ticket.code}</span>
                  <strong className="block text-sm mt-0.5">{ticket.title}</strong>
                  <p className="text-xs text-slate-600 mt-1">
                    Gravidade: <strong>{traduzirGravidade(ticket.severity)}</strong>
                  </p>
                  <p className="text-xs text-slate-500">📍 {ticket.location.address}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}