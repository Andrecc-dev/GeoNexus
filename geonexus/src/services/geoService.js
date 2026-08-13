/**
 * GEONEXUS ENGINE - SERVIÇO DE GEOLOCALIZAÇÃO, ROTAS E ALOCAÇÃO INTELIGENTE
 */

/**
 * Cálculo de distância em linha reta (Fórmula de Haversine) em km
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
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
    if (!startLat || !startLng || !endLat || !endLng) throw new Error("Coordenadas inválidas");

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
      if (!tech.location?.lat || !tech.location?.lng || !ticket?.location?.lat || !ticket?.location?.lng) return null;

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
 * Retorna o melhor técnico disponível e qualificado para o chamado com base no Rankeamento
 */
export const findBestTechForTicket = (ticket, technicians = []) => {
  const ranked = rankTechniciansForTicket(ticket, technicians);
  return ranked.find((tech) => tech.status === 'available') || ranked[0] || null;
};

/**
 * Busca inteligente de CEP (BrasilAPI v2 -> ViaCEP + Nominatim)
 */
export const searchAddressByCEP = async (cep) => {
  try {
    const cleanCep = String(cep).replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    // 1. Tenta BrasilAPI v2 (Retorna Lat/Lng diretas)
    try {
      const bRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.location?.coordinates?.latitude && bData.location?.coordinates?.longitude) {
          const lat = parseFloat(bData.location.coordinates.latitude);
          const lng = parseFloat(bData.location.coordinates.longitude);
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
            return {
              address: `${bData.street || ''}, ${bData.neighborhood || ''} - ${bData.city}/${bData.state}`,
              lat,
              lng
            };
          }
        }
      }
    } catch (e) {
      // Segue para a próxima API se falhar
    }

    // 2. Tenta ViaCEP e converte o nome da rua em GPS via Nominatim
    const viaRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const viaData = await viaRes.json();

    if (viaData.erro) return null;

    const fullStreet = `${viaData.logradouro || ''}, ${viaData.bairro || ''}, ${viaData.localidade} - ${viaData.uf}, Brasil`;

    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullStreet)}&limit=1`,
      { headers: { 'User-Agent': 'GeoNexus-App' } }
    );
    const geoData = await geoRes.json();

    if (geoData && geoData.length > 0) {
      return {
        address: fullStreet,
        lat: parseFloat(geoData[0].lat),
        lng: parseFloat(geoData[0].lon)
      };
    }

    // Fallback para o centro da cidade do CEP
    const cityStreet = `${viaData.localidade} - ${viaData.uf}, Brasil`;
    const cityRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityStreet)}&limit=1`,
      { headers: { 'User-Agent': 'GeoNexus-App' } }
    );
    const cityData = await cityRes.json();

    if (cityData && cityData.length > 0) {
      return {
        address: fullStreet,
        lat: parseFloat(cityData[0].lat),
        lng: parseFloat(cityData[0].lon)
      };
    }

  } catch (err) {
    console.error("Erro ao buscar por CEP:", err);
  }
  return null;
};

/**
 * Geocodificação Universal de Endereço ou CEP
 */
/**
 * Geocodificação Universal em Camadas (Endereço Completo -> Simplificado -> Cidade -> Fallback)
 */
export const getCoordinatesFromAddress = async (address) => {
  if (!address) return { lat: -20.3155, lng: -40.3128, address: "Vitória - ES" };

  // 1. Se for CEP puro (8 dígitos com ou sem hífen)
  const cleanInput = String(address).replace(/\D/g, '');
  if (cleanInput.length === 8) {
    const cepResult = await searchAddressByCEP(cleanInput);
    if (cepResult) return cepResult;
  }

  // Função auxiliar de requisição ao Nominatim
  const fetchNominatim = async (queryText) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText)}&limit=1`,
        { headers: { 'User-Agent': 'GeoNexus-App' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name
        };
      }
    } catch (err) {
      console.error("Erro na consulta do mapa:", err);
    }
    return null;
  };

  // TENTATIVA 1: Endereço completo digitado
  let result = await fetchNominatim(address);
  if (result) return result;

  // TENTATIVA 2: Limpeza de hífens e do termo "Centro"
  const cleanedAddress = address.replace(/-/g, ' ').replace(/Centro/gi, '').replace(/\s+/g, ' ').trim();
  result = await fetchNominatim(cleanedAddress);
  if (result) return result;

  // TENTATIVA 3: Busca apenas Cidade e Estado (Garante a localização no município correto)
  const addressParts = address.split(/[-,]/).map(p => p.trim()).filter(Boolean);
  if (addressParts.length >= 2) {
    // Pega os dois últimos elementos (ex: "Alfredo Chaves" e "ES")
    const cityState = `${addressParts[addressParts.length - 2]}, ${addressParts[addressParts.length - 1]}, Brasil`;
    result = await fetchNominatim(cityState);
    if (result) return result;
  }

  // TENTATIVA 4: Fallback de Segurança caso não ache nada
  return { lat: -20.3155, lng: -40.3128, address };
};