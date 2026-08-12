import React, { useState, useEffect } from 'react';
import { 
  Activity, Users, AlertTriangle, Database, ShieldAlert, Truck, 
  Wrench, PlusCircle, Navigation, DollarSign, X, Building2, Smartphone, BarChart3, Clock, Loader2, Search, UserPlus
} from 'lucide-react';
import { seedDatabase, subscribeToCollection, createTicketInDB, dispatchTicketToTech, dispatchTicketToContractor } from './services/dbService';
import { rankTechniciansForTicket, getCoordinatesFromAddress } from './services/geoService';
import { getAddressFromCep } from './utils/geoUtils';
import Map from './components/Map';
import TechMobileView from './components/TechMobileView';
import AnalyticsModal from './components/AnalyticsModal';
import AdminPanel from './components/AdminPanel';

const formatarTempo = (minutosTotais) => {
  if (!minutosTotais || minutosTotais <= 0) return '0 min';
  const dias = Math.floor(minutosTotais / 1440);
  const horas = Math.floor((minutosTotais % 1440) / 60);
  const min = minutosTotais % 60;

  const partes = [];
  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  if (min > 0 || partes.length === 0) partes.push(`${min}min`);

  return partes.join(' ');
};

const traduzirGravidade = (severity) => {
  const mapa = { critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' };
  return mapa[severity?.toLowerCase()] || severity;
};

export default function App() {
  const [technicians, setTechnicians] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Detecção Automática de Tela Mobile (< 768px)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isTechMobileOpen, setIsTechMobileOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newType] = useState('backbone');
  const [newSeverity, setNewSeverity] = useState('medium');
  const [newRepairTime, setNewRepairTime] = useState(120);
  
  const [cep, setCep] = useState('');
  const [newAddress, setNewAddress] = useState('Vitória - ES');
  const [currentCoords, setCurrentCoords] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const unsubTechs = subscribeToCollection('technicians', setTechnicians);
    const unsubTickets = subscribeToCollection('tickets', setTickets);
    const unsubContractors = subscribeToCollection('contractors', setContractors);

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubTechs();
      unsubTickets();
      unsubContractors();
    };
  }, []);

  const handleCepSearch = async () => {
    if (!cep || cep.replace(/\D/g, '').length !== 8) return;
    setIsSearchingCep(true);
    if (typeof getAddressFromCep === 'function') {
      const result = await getAddressFromCep(cep);
      if (result) {
        setNewAddress(result.address);
        setCurrentCoords({ lat: result.lat, lng: result.lng, address: result.address });
      }
    }
    setIsSearchingCep(false);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newId = `ticket_${Date.now()}`;
      const newCode = `#${Math.floor(1000 + Math.random() * 9000)}`;
      const locationCoords = currentCoords || await getCoordinatesFromAddress(newAddress);

      const newTicket = {
        id: newId,
        code: newCode,
        title: newTitle.toUpperCase(),
        type: newType,
        severity: newSeverity,
        difficulty: 'medium',
        requiredSkills: ['backbone'],
        requiredNRs: ['NR10'],
        estimatedRepairMinutes: Number(newRepairTime),
        status: 'pending',
        assignedTechId: null,
        location: locationCoords,
        createdAt: Date.now()
      };

      await createTicketInDB(newTicket);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setCep('');
      setCurrentCoords(null);
    } catch (error) {
      console.error("Erro ao criar chamado:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchTech = async (ticketId, techId) => {
    await dispatchTicketToTech(ticketId, techId);
    setSelectedTicket(null);
  };

  const handleDispatchContractor = async (ticketId, contractorId) => {
    await dispatchTicketToContractor(ticketId, contractorId);
    setSelectedTicket(null);
  };

  // 🔴 REGRA MOBILE EXCLUSIVA:
  // Se for celular (< 768px), mostra SOMENTE o app do técnico
  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-2">
        <TechMobileView 
          technicians={technicians} 
          tickets={tickets} 
          onClose={null} 
        />
      </div>
    );
  }

  const rankedCandidates = selectedTicket ? rankTechniciansForTicket(selectedTicket, technicians) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-500/20 p-2.5 rounded-lg border border-sky-500/30">
            <Activity className="w-6 h-6 text-sky-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              GeoNexus <span className="text-xs font-normal text-sky-400 bg-sky-950 border border-sky-800 px-2 py-0.5 rounded-full">Painel do Administrador</span>
            </h1>
            <p className="text-xs text-slate-400">Alocação Inteligente de Equipes & Roteamento em Tempo Real</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setIsAdminPanelOpen(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs font-semibold px-3 py-2.5 rounded-lg transition">
            <UserPlus className="w-4 h-4" /> Gestão de Técnicos
          </button>
          <button onClick={() => setIsAnalyticsOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-lg shadow-lg shadow-indigo-600/20 transition">
            <BarChart3 className="w-4 h-4" /> Custos & SLA
          </button>
          <button onClick={() => setIsTechMobileOpen(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-lg shadow-lg shadow-emerald-600/20 transition">
            <Smartphone className="w-4 h-4" /> Modulo Celular
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-lg shadow-lg shadow-sky-600/20 transition">
            <PlusCircle className="w-4 h-4" /> Novo Chamado
          </button>
          <button onClick={seedDatabase} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-2.5 rounded-lg border border-slate-700 transition">
            <Database className="w-4 h-4 text-sky-400" /> Reiniciar
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Total de Chamados</p>
              <h3 className="text-2xl font-bold text-white mt-1">{tickets.length}</h3>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400"><Wrench className="w-5 h-5" /></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Ocorrências Críticas</p>
              <h3 className="text-2xl font-bold text-red-400 mt-1">{tickets.filter(t => t.severity === 'critical' && t.status === 'pending').length}</h3>
            </div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"><ShieldAlert className="w-5 h-5" /></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Técnicos Livres</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{technicians.filter(t => t.status === 'available').length} / {technicians.length}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400"><Users className="w-5 h-5" /></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Em Atendimento</p>
              <h3 className="text-2xl font-bold text-sky-400 mt-1">{technicians.filter(t => t.status === 'busy' || t.status === 'traveling').length}</h3>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400"><Truck className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            📍 Localização da Frota em Tempo Real (Visão Geral)
          </h2>
          <Map 
            technicians={technicians} 
            tickets={tickets} 
            onSelectTicket={(ticket) => setSelectedTicket(ticket)} 
            activeTicketForRoute={selectedTicket}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Chamados Pendentes
            </h2>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {tickets.map((t) => (
                <div key={t.id} onClick={() => t.status === 'pending' && setSelectedTicket(t)} className={`bg-slate-950 border rounded-lg p-4 space-y-3 cursor-pointer transition ${t.status === 'pending' ? 'border-sky-500/40 hover:border-sky-400' : 'border-slate-800 opacity-60'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono text-sky-400 font-bold">{t.code}</span>
                      <h4 className="text-sm font-semibold text-white mt-0.5">{t.title}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      {traduzirGravidade(t.severity)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <p>📍 {t.location?.address}</p>
                    <p>Situação: <span className="text-sky-300 font-medium uppercase">{t.status === 'pending' ? 'Pendente' : t.status}</span></p>
                  </div>

                  {t.status === 'pending' && (
                    <button className="w-full mt-2 bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-xs py-1.5 rounded font-medium transition">
                      Sugerir Técnico Ideal
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 border-b border-slate-800 pb-3">
              <Users className="w-4 h-4 text-sky-400" /> Situação dos Técnicos em Campo
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {technicians.map((tech) => (
                <div key={tech.id} className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">{tech.name} <span className="text-xs text-slate-500 font-normal">(Equipe {tech.team})</span></h4>
                      <p className="text-xs text-slate-400">📍 {tech.location?.address}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tech.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-sky-500/10 text-sky-400'}`}>{tech.status === 'available' ? 'Disponível' : tech.status === 'traveling' ? 'Em Deslocamento' : 'Em Atendimento'}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {tech.skills?.map(s => <span key={s} className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded">{s}</span>)}
                    {tech.nrs?.map(nr => <span key={nr} className="px-1.5 py-0.5 text-[9px] bg-emerald-950 text-emerald-400 rounded font-semibold">{nr}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Painel do Administrador (Cadastrar Técnicos) */}
      <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />

      {/* Cadastro de Chamados */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><PlusCircle className="w-5 h-5 text-sky-400" /> Cadastrar Novo Chamado</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Título da Ocorrência</label>
                <input required type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: ROMPIMENTO DE CABO FIBRA" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white mt-1 focus:border-sky-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Nível de Urgência</label>
                  <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white mt-1">
                    <option value="critical">Crítica</option>
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Tempo de Reparo (min)</label>
                  <input type="number" value={newRepairTime} onChange={(e) => setNewRepairTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white mt-1" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">CEP do Local (ViaCEP)</label>
                <div className="flex gap-2">
                  <input type="text" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="29000-000" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" />
                  <button type="button" onClick={handleCepSearch} disabled={isSearchingCep} className="px-3 py-2 bg-sky-950 border border-sky-800 hover:bg-sky-900 text-sky-300 rounded text-xs font-semibold flex items-center gap-1 transition">
                    {isSearchingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Endereço Completo ou Município</label>
                <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white mt-1" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 text-white text-xs font-semibold rounded flex items-center gap-2">
                  {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processando...</> : 'Cadastrar e Analisar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Despacho com IA */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-sky-400">{selectedTicket.code}</span>
                <h3 className="text-lg font-bold text-white">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-400">📍 Local do Chamado: <strong className="text-slate-200">{selectedTicket.location?.address}</strong></p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Técnicos Mais Indicados para este Atendimento</h4>

              {rankedCandidates.map((cand, idx) => (
                <div key={cand.id} className={`p-4 rounded-lg border space-y-2 ${idx === 0 && cand.isQualified ? 'bg-sky-950/40 border-sky-500/60' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{cand.name}</span>
                      <span className="text-xs text-slate-400">(Equipe {cand.team})</span>
                      {idx === 0 && cand.isQualified && <span className="bg-sky-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded">RECOMENDADO</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-sky-400">{cand.score}</span>
                      <span className="text-[10px] text-slate-400 block">NÍVEL DE COMPATIBILIDADE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900/60 p-2.5 rounded border border-slate-800/50">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Navigation className="w-3.5 h-3.5 text-sky-400" />
                      <span>Distância: <strong>{cand.distanceKm} km</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Chegada Estimada: <strong className="text-amber-300">{formatarTempo(cand.etaMinutes)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Custo Combustível: <strong>R$ {cand.estimatedFuelCost}</strong></span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex gap-1">
                      {cand.hasAllNRs ? <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">Normas (NRs) OK</span> : <span className="text-[10px] text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">Falta NR</span>}
                      {cand.hasAllSkills ? <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">Habilidades OK</span> : <span className="text-[10px] text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">Falta Habilidade</span>}
                    </div>

                    <button disabled={!cand.isQualified} onClick={() => handleDispatchTech(selectedTicket.id, cand.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold rounded transition">
                      {cand.isQualified ? 'Confirmar Despacho' : 'Incompatível'}
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1"><Building2 className="w-4 h-4" /> Empresas Terceirizadas (Contingência)</h4>
                {contractors.map(c => (
                  <div key={c.id} className="bg-slate-950 border border-slate-800 p-3 rounded flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-bold text-slate-200">{c.name}</h5>
                      <p className="text-[11px] text-slate-400">Tempo Médio de Atendimento: {formatarTempo(c.avgEtaMinutes)} | Avaliação: {c.rating}⭐</p>
                    </div>
                    <button onClick={() => handleDispatchContractor(selectedTicket.id, c.id)} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded">
                      Acionar Terceirizada
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isTechMobileOpen && <TechMobileView technicians={technicians} tickets={tickets} onClose={() => setIsTechMobileOpen(false)} />}
      {isAnalyticsOpen && <AnalyticsModal tickets={tickets} technicians={technicians} contractors={contractors} onClose={() => setIsAnalyticsOpen(false)} />}
    </div>
  );
}