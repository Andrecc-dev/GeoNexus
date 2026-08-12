/**
 * GEONEXUS ENGINE - SERVIÇO DE GEOLOCALIZAÇÃO, ROTAS E ALOCAÇÃO INTELIGENTE
 */

/**
 * Cálculo de distância em linha reta (Fórmula de Haversine) em km
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

/**
 * Consulta API OSRM para traçar rota real sobre as vias públicas com impacto de tráfego
 */
export const fetchRealRouteWithTraffic = async (startLat, startLng, endLat, endLng) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes?.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const distanceKm = Number((route.distance / 1000).toFixed(2));
      const durationMinutes = Math.ceil(route.duration / 60);

      // Fator de Trânsito baseado em Horário de Pico (07h-09h e 17h-19h)
      const currentHour = new Date().getHours();
      const isPeakHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
      const trafficMultiplier = isPeakHour ? 1.35 : 1.10; // +35% no pico, +10% em horário normal

      const realEtaMinutes = Math.ceil(durationMinutes * trafficMultiplier);

      return {
        coordinates,
        distanceKm,
        etaMinutes: realEtaMinutes,
        trafficStatus: isPeakHour ? 'heavy' : 'moderate'
      };
    }
  } catch (error) {
    console.warn("API OSRM offline. Utilizando modelo geodésico aproximado.", error);
  }

  // Fallback em caso de indisponibilidade de rede externa
  const dist = calculateDistanceKm(startLat, startLng, endLat, endLng);
  const fallbackEta = Math.ceil((dist / 30) * 60); // 30km/h média urbana
  return {
    coordinates: [[startLat, startLng], [endLat, endLng]],
    distanceKm: dist,
    etaMinutes: fallbackEta,
    trafficStatus: 'normal'
  };
};

/**
 * Algoritmo de Rankeamento e Alocação Automática de Técnicos por SLA e Compliance
 */
export const rankTechniciansForTicket = (ticket, technicians) => {
  if (!ticket || !technicians || technicians.length === 0) return [];

  const requiredSkills = ticket.requiredSkills || [];
  const requiredNRs = ticket.requiredNRs || [];

  return technicians
    .map((tech) => {
      if (!tech.location?.lat || !tech.location?.lng) return null;

      // Validação de Habilidades e Normas Regulamentadoras (NRs)
      const hasAllSkills = requiredSkills.every((skill) =>
        tech.skills?.map((s) => s.toLowerCase()).includes(skill.toLowerCase())
      );
      const hasAllNRs = requiredNRs.every((nr) =>
        tech.nrs?.map((n) => n.toLowerCase()).includes(nr.toLowerCase())
      );

      const isQualified = hasAllSkills && hasAllNRs;

      // Distância linear imediata
      const distanceKm = calculateDistanceKm(
        tech.location.lat,
        tech.location.lng,
        ticket.location.lat,
        ticket.location.lng
      );

      // SLA base e consumo de combustível (média R$ 5,80/L a 10km/L)
      const etaMinutes = Math.ceil((distanceKm / 30) * 60);
      const estimatedFuelCost = Number(((distanceKm / 10) * 5.80).toFixed(2));

      // Pontuação Operacional (Score de 0 a 100)
      let score = 100;
      score -= distanceKm * 3.5;
      if (tech.status !== 'available') score -= 40;
      if (!hasAllSkills) score -= 30;
      if (!hasAllNRs) score -= 50;

      return {
        ...tech,
        distanceKm,
        etaMinutes,
        estimatedFuelCost,
        hasAllSkills,
        hasAllNRs,
        isQualified,
        score: Math.max(0, Math.round(score))
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
};

/**
 * Geocodificação de Endereço via Nominatim OpenStreetMap
 */
export const getCoordinatesFromAddress = async (address) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name
      };
    }
  } catch (err) {
    console.error("Erro no Geocoding Nominatim:", err);
  }
  return { lat: -20.3155, lng: -40.3128, address }; // Fallback Vitória-ES
};