// 1. Geocodificação Automática de Endereço/Município via API (Nominatim / OpenStreetMap)
export async function getCoordinatesFromAddress(address) {
  if (!address) return { lat: -20.3155, lng: -40.3128, address: "Vitória - ES" };

  try {
    const cleanAddress = address.trim();
    const query = encodeURIComponent(`${cleanAddress}, Espírito Santo, Brasil`);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
    );
    
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: cleanAddress
      };
    }
  } catch (error) {
    console.error("Erro ao buscar coordenadas na API:", error);
  }

  // Fallback de segurança para centro de Vitória caso a API não retorne
  return {
    lat: -20.3155,
    lng: -40.3128,
    address
  };
}

// 2. Cálculo de Distância Geográfica Real (Fórmula de Haversine)
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

  const R = 6371; // Raio da Terra em KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// 3. Motor de Ranking e Seleção Inteligente de Técnicos
export function rankTechniciansForTicket(ticket, technicians, fuelPrice = 6.20) {
  if (!ticket || !technicians) return [];

  const ticketLat = ticket.location?.lat ?? -20.3100;
  const ticketLng = ticket.location?.lng ?? -40.3100;

  return technicians.map((tech) => {
    const techLat = tech.location?.lat ?? -20.3150;
    const techLng = tech.location?.lng ?? -40.3150;

    // 1. Distância Real
    const distanceKm = calculateDistanceKm(ticketLat, ticketLng, techLat, techLng);

    // 2. Estimativa de Tempo de Deslocamento ajustada (Rodovia x Cidade)
    // Para distâncias acima de 30km, aplica velocidade média de estrada (70km/h); caso contrário, urbana (35km/h)
    const averageSpeed = distanceKm > 30 ? 70 : 35;
    const etaMinutes = Math.round((distanceKm / averageSpeed) * 60) + 10; // +10 min para mobilização

    // 3. Custo de Combustível (Ida e Volta)
    const fuelConsumption = tech.vehicle?.fuelConsumptionKmPerLiter || 12;
    const estimatedFuelCost = parseFloat(((distanceKm / fuelConsumption) * fuelPrice * 2).toFixed(2));

    // 4. Validação de NRs e Competências
    const hasAllNRs = (ticket.requiredNRs || []).every((nr) =>
      (tech.nrs || []).includes(nr)
    );

    const hasAllSkills = (ticket.requiredSkills || []).every((skill) =>
      (tech.skills || []).includes(skill)
    );

    const isQualified = hasAllNRs && hasAllSkills && tech.status !== 'offline';

    // 5. Pontuação do Algoritmo (0 a 100)
    let score = 0;

    if (isQualified) {
      // Disponibilidade (Até 40 pts)
      const statusScore = tech.status === 'available' ? 40 : 15;
      
      // Proximidade (Até 40 pts - reduz pontuação conforme a distância aumenta)
      const proximityScore = Math.max(40 - distanceKm * 0.8, 5);

      // Custo-Benefício (Até 20 pts)
      const costScore = Math.max(20 - (estimatedFuelCost / 3), 5);

      score = Math.round(statusScore + proximityScore + costScore);
    }

    return {
      ...tech,
      distanceKm,
      etaMinutes,
      estimatedFuelCost,
      hasAllNRs,
      hasAllSkills,
      isQualified,
      score: Math.min(score, 100)
    };
  }).sort((a, b) => b.score - a.score);
}