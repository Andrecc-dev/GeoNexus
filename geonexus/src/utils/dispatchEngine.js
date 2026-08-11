// Cálculo de Distância Geográfica (Haversine Formula)
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
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

export function rankTechniciansForTicket(ticket, technicians, fuelPrice = 6.20) {
  if (!ticket || !technicians) return [];

  const ticketLat = ticket.location?.lat || -20.3100;
  const ticketLng = ticket.location?.lng || -40.3100;

  return technicians.map((tech) => {
    const techLat = tech.location?.lat || -20.3150;
    const techLng = tech.location?.lng || -40.3150;

    // 1. Distância e Estimativas
    const distanceKm = calculateDistanceKm(ticketLat, ticketLng, techLat, techLng);
    const etaMinutes = Math.round((distanceKm / 35) * 60) + 10; // Média 35km/h na cidade + 10m setup
    const fuelConsumption = tech.vehicle?.fuelConsumptionKmPerLiter || 12;
    const estimatedFuelCost = parseFloat(((distanceKm / fuelConsumption) * fuelPrice * 2).toFixed(2)); // Indo e voltando

    // 2. Validação Restritiva de NRs (Inviolável)
    const hasAllNRs = (ticket.requiredNRs || []).every((nr) =>
      (tech.nrs || []).includes(nr)
    );

    // 3. Validação de Competências Técnicas
    const hasAllSkills = (ticket.requiredSkills || []).every((skill) =>
      (tech.skills || []).includes(skill)
    );

    // 4. Pontuação do Algoritmo (0 a 100)
    let score = 0;

    if (hasAllNRs && hasAllSkills && tech.status !== 'offline') {
      // Disponibilidade
      const statusScore = tech.status === 'available' ? 40 : 15;
      
      // Proximidade (Máximo 40 pts)
      const distancePenalty = Math.min(distanceKm * 2, 40);
      const proximityScore = Math.max(40 - distancePenalty, 5);

      // Custo-Benefício (Máximo 20 pts)
      const costScore = Math.max(20 - (estimatedFuelCost / 2), 5);

      score = Math.round(statusScore + proximityScore + costScore);
    }

    return {
      ...tech,
      distanceKm,
      etaMinutes,
      estimatedFuelCost,
      hasAllNRs,
      hasAllSkills,
      isQualified: hasAllNRs && hasAllSkills && tech.status !== 'offline',
      score: Math.min(score, 100)
    };
  }).sort((a, b) => b.score - a.score);
}