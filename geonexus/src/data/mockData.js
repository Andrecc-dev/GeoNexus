export const MOCK_COMPANY_ID = "company_geonexus_01";

export const initialTechnicians = [
  // EQUIPE A (9 Técnicos)
  { id: "tech_01", companyId: MOCK_COMPANY_ID, name: "Carlos Silva", team: "A", status: "available", skills: ["backbone", "pop", "network"], nrs: ["NR10", "NR35"], location: { lat: -20.3155, lng: -40.3128, address: "Vitória - ES" }, vehicle: { model: "Gol 1.0", fuelConsumptionKmPerLiter: 12 }, currentTicketId: null },
  { id: "tech_02", companyId: MOCK_COMPANY_ID, name: "Ana Souza", team: "A", status: "available", skills: ["datacenter", "backbone"], nrs: ["NR10", "NR35", "NR33"], location: { lat: -20.3200, lng: -40.3300, address: "Vila Velha - ES" }, vehicle: { model: "Fiorino", fuelConsumptionKmPerLiter: 10 }, currentTicketId: null },
  { id: "tech_03", companyId: MOCK_COMPANY_ID, name: "Marcos Lima", team: "A", status: "traveling", skills: ["endpoint", "network"], nrs: ["NR10"], location: { lat: -20.2800, lng: -40.3000, address: "Serra - ES" }, vehicle: { model: "Uno", fuelConsumptionKmPerLiter: 13 }, currentTicketId: "ticket_102" },
  { id: "tech_04", companyId: MOCK_COMPANY_ID, name: "Juliana Santos", team: "A", status: "busy", skills: ["pop", "endpoint"], nrs: ["NR10", "NR35"], location: { lat: -20.3400, lng: -40.3800, address: "Cariacica - ES" }, vehicle: { model: "Mobi", fuelConsumptionKmPerLiter: 14 }, currentTicketId: "ticket_103" },
  { id: "tech_05", companyId: MOCK_COMPANY_ID, name: "Roberto Alves", team: "A", status: "available", skills: ["backbone", "datacenter"], nrs: ["NR10", "NR35"], location: { lat: -20.3100, lng: -40.3200, address: "Vitória - ES" }, vehicle: { model: "Saveiro", fuelConsumptionKmPerLiter: 11 }, currentTicketId: null },
  { id: "tech_06", companyId: MOCK_COMPANY_ID, name: "Fernanda Costa", team: "A", status: "offline", skills: ["endpoint"], nrs: ["NR10"], location: { lat: -20.3250, lng: -40.3150, address: "Vitória - ES" }, vehicle: { model: "Ka", fuelConsumptionKmPerLiter: 12.5 }, currentTicketId: null },
  { id: "tech_07", companyId: MOCK_COMPANY_ID, name: "Lucas Mendes", team: "A", status: "available", skills: ["network", "pop"], nrs: ["NR10", "NR35"], location: { lat: -20.2900, lng: -40.3100, address: "Serra - ES" }, vehicle: { model: "Strada", fuelConsumptionKmPerLiter: 10.5 }, currentTicketId: null },
  { id: "tech_08", companyId: MOCK_COMPANY_ID, name: "Patricia Rocha", team: "A", status: "available", skills: ["backbone", "datacenter", "network"], nrs: ["NR10", "NR35", "NR33"], location: { lat: -20.3300, lng: -40.2900, address: "Vila Velha - ES" }, vehicle: { model: "HB20", fuelConsumptionKmPerLiter: 12 }, currentTicketId: null },
  { id: "tech_09", companyId: MOCK_COMPANY_ID, name: "Diego Oliveira", team: "A", status: "available", skills: ["endpoint", "network"], nrs: ["NR10"], location: { lat: -20.3500, lng: -40.3600, address: "Cariacica - ES" }, vehicle: { model: "Onix", fuelConsumptionKmPerLiter: 13 }, currentTicketId: null },

  // EQUIPE B (9 Técnicos)
  { id: "tech_10", companyId: MOCK_COMPANY_ID, name: "Gabriel Ferreira", team: "B", status: "available", skills: ["backbone", "pop"], nrs: ["NR10", "NR35"], location: { lat: -20.3180, lng: -40.3220, address: "Vitória - ES" }, vehicle: { model: "Gol 1.0", fuelConsumptionKmPerLiter: 12 }, currentTicketId: null },
  { id: "tech_11", companyId: MOCK_COMPANY_ID, name: "Camila Ribeiro", team: "B", status: "available", skills: ["datacenter"], nrs: ["NR10", "NR35"], location: { lat: -20.3220, lng: -40.3350, address: "Vila Velha - ES" }, vehicle: { model: "Fiorino", fuelConsumptionKmPerLiter: 10 }, currentTicketId: null },
  { id: "tech_12", companyId: MOCK_COMPANY_ID, name: "Thiago Barbosa", team: "B", status: "offline", skills: ["endpoint"], nrs: ["NR10"], location: { lat: -20.2750, lng: -40.3050, address: "Serra - ES" }, vehicle: { model: "Uno", fuelConsumptionKmPerLiter: 13 }, currentTicketId: null },
  { id: "tech_13", companyId: MOCK_COMPANY_ID, name: "Vanessa Martins", team: "B", status: "available", skills: ["network", "pop"], nrs: ["NR10", "NR35"], location: { lat: -20.3380, lng: -40.3750, address: "Cariacica - ES" }, vehicle: { model: "Mobi", fuelConsumptionKmPerLiter: 14 }, currentTicketId: null },
  { id: "tech_14", companyId: MOCK_COMPANY_ID, name: "Rodrigo Gomes", team: "B", status: "available", skills: ["backbone", "datacenter"], nrs: ["NR10", "NR35"], location: { lat: -20.3080, lng: -40.3180, address: "Vitória - ES" }, vehicle: { model: "Saveiro", fuelConsumptionKmPerLiter: 11 }, currentTicketId: null },
  { id: "tech_15", companyId: MOCK_COMPANY_ID, name: "Aline Cardoso", team: "B", status: "available", skills: ["endpoint", "network"], nrs: ["NR10"], location: { lat: -20.3210, lng: -40.3110, address: "Vitória - ES" }, vehicle: { model: "Ka", fuelConsumptionKmPerLiter: 12.5 }, currentTicketId: null },
  { id: "tech_16", companyId: MOCK_COMPANY_ID, name: "Bruno Carvalho", team: "B", status: "available", skills: ["network", "pop"], nrs: ["NR10", "NR35"], location: { lat: -20.2850, lng: -40.3120, address: "Serra - ES" }, vehicle: { model: "Strada", fuelConsumptionKmPerLiter: 10.5 }, currentTicketId: null },
  { id: "tech_17", companyId: MOCK_COMPANY_ID, name: "Amanda Teixeira", team: "B", status: "available", skills: ["backbone", "datacenter"], nrs: ["NR10", "NR35"], location: { lat: -20.3320, lng: -40.2950, address: "Vila Velha - ES" }, vehicle: { model: "HB20", fuelConsumptionKmPerLiter: 12 }, currentTicketId: null },
  { id: "tech_18", companyId: MOCK_COMPANY_ID, name: "Leonardo Araujo", team: "B", status: "available", skills: ["endpoint"], nrs: ["NR10"], location: { lat: -20.3450, lng: -40.3650, address: "Cariacica - ES" }, vehicle: { model: "Onix", fuelConsumptionKmPerLiter: 13 }, currentTicketId: null }
];

export const initialTickets = [
  {
    id: "ticket_101",
    companyId: MOCK_COMPANY_ID,
    code: "#1042",
    title: "QUEDA DE BACKBONE CENTRAL",
    type: "backbone",
    severity: "critical",
    difficulty: "hard",
    requiredSkills: ["backbone"],
    requiredNRs: ["NR10", "NR35"],
    estimatedRepairMinutes: 240,
    status: "pending",
    assignedTechId: null,
    assignedContractorId: null,
    location: { lat: -20.3100, lng: -40.3100, address: "Centro, Vitória - ES" },
    createdAt: Date.now()
  }
];

export const initialContractors = [
  { id: "contractor_01", companyId: MOCK_COMPANY_ID, name: "TechService Redes LTDA", rating: 4.8, avgEtaMinutes: 45, active: true },
  { id: "contractor_02", companyId: MOCK_COMPANY_ID, name: "FiberCorp Terceirizada", rating: 4.5, avgEtaMinutes: 60, active: true }
];

export const defaultSettings = {
  fuelPricePerLiter: 6.20,
  maxEtaThresholdMinutes: 120,
  autoContractorSuggestion: true
};