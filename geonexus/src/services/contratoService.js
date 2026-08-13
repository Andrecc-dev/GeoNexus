/**
 * GEONEXUS / AYKO ENGINE - SERVIÇO DE TERCEIRIZAÇÃO E GESTÃO DE CREDENCIADAS
 */

import { initialContractors } from '../data/mockData';

/**
 * Calcula a estimativa detalhada de custo de atendimento por empresa terceirizada
 * @param {Object} contractor - Objeto da credenciada/terceirizada
 * @param {Object} ticket - Objeto do chamado
 * @param {number} distanceKm - Distância em km até o local (padrão: 12 km)
 * @returns {Object} Detalhamento financeiro e de SLA
 */
export const calculateContractorCost = (contractor, ticket, distanceKm = 12) => {
  if (!ticket) return null;

  const baseRate = 180.00; // Taxa de visita técnica / deslocamento base (R$)
  const pricePerKm = 3.50;  // Custo logístico por km rodado (R$)
  
  // Multiplicador financeiro de acordo com a gravidade do chamado
  const severityMultipliers = {
    critical: 1.40, // +40% (Atendimento emergencial / plantão)
    high: 1.20,     // +20% (Prioridade alta)
    medium: 1.00,   // Normal
    low: 1.00       // Normal
  };

  const severity = ticket?.severity?.toLowerCase() || 'medium';
  const multiplier = severityMultipliers[severity] || 1.00;

  const distanceCost = Number((distanceKm * pricePerKm).toFixed(2));
  const subtotal = baseRate + distanceCost;
  const totalCost = Number((subtotal * multiplier).toFixed(2));
  const severitySurcharge = Number((totalCost - subtotal).toFixed(2));

  return {
    contractorName: contractor?.name || "Empresa Terceirizada",
    baseRate,
    distanceKm,
    distanceCost,
    severitySurcharge,
    totalCost,
    avgEtaMinutes: contractor?.avgEtaMinutes || 45,
    rating: contractor?.rating || 4.5
  };
};

/**
 * Seleciona automaticamente a melhor empresa terceirizada com base em Rating e SLA
 * @param {Array} contractors - Lista de empresas terceirizadas cadastradas
 * @returns {Object|null}
 */
export const getBestContractor = (contractors = initialContractors) => {
  const activeContractors = contractors.filter(c => c.active !== false);
  if (activeContractors.length === 0) return null;

  // Ordena por maior nota (rating) e menor tempo médio de resposta (avgEtaMinutes)
  return activeContractors.sort((a, b) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    return a.avgEtaMinutes - b.avgEtaMinutes;
  })[0];
};