import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ícones Customizados
const techIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ticketIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper de tradução
const traduzirGravidade = (severity) => {
  const mapa = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa'
  };
  return mapa[severity?.toLowerCase()] || severity;
};

export default function Map({ technicians, tickets, onSelectTicket }) {
  const defaultCenter = [-20.3155, -40.3128];

  return (
    <div className="h-[420px] w-full rounded-xl overflow-hidden border border-slate-800 shadow-xl relative z-10">
      <MapContainer 
        center={defaultCenter} 
        zoom={9} 
        scrollWheelZoom={true} 
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={20}
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          attribution="&copy; Google Maps"
        />

        {/* Marcadores de Técnicos (Sem o círculo azul de raio) */}
        {technicians?.map((tech) => tech.location && (
          <Marker key={`tech-${tech.id}`} position={[tech.location.lat, tech.location.lng]} icon={techIcon}>
            <Popup>
              <div className="text-slate-900 font-sans p-1">
                <strong className="block text-sm">{tech.name}</strong>
                <span className="text-xs text-slate-600 block">Equipe: {tech.team}</span>
                <span className="text-xs font-semibold text-emerald-600 uppercase block mt-1">
                  Status: {tech.status === 'available' ? 'Disponível' : tech.status}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Marcadores de Chamados com Gravidade Traduzida */}
        {tickets?.map((ticket) => ticket.location && (
          <Marker 
            key={`ticket-${ticket.id}`} 
            position={[ticket.location.lat, ticket.location.lng]} 
            icon={ticketIcon}
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
  );
}