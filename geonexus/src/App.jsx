import React, { useState, useEffect } from 'react';
import { 
  Activity, Users, AlertTriangle, Database, ShieldAlert, Truck, 
  Wrench, PlusCircle, Navigation, DollarSign, X, Building2, Smartphone, 
  BarChart3, Clock, Loader2, Search, UserPlus, Zap, ShieldCheck
} from 'lucide-react';

// Importação de Serviços
import { seedDatabase, subscribeToCollection, createTicketInDB, dispatchTicketToTech, dispatchTicketToContractor } from './services/dbService';
import { rankTechniciansForTicket, getCoordinatesFromAddress, findBestTechForTicket } from './services/geoService';
import { calculateContractorCost } from './services/contratoService';

// Importação de Componentes
import Map from './components/Map';
import TechMobileView from './components/TechMobileView';
import AnalyticsModal from './components/AnalyticsModal';
import AdminPanel from './components/AdminPanel';

// ============================================================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO E TRADUÇÃO
// ============================================================================

/** Formata o tempo estimado em minutos para formato humano (d, h, min) */
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

/** Traduz os níveis de severidade/gravidade dos chamados */
const traduzirGravidade = (severity) => {
  const mapa = { critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' };
  return mapa[severity?.toLowerCase()] || severity;
};

/** Renderiza a Badge de Status dos Chamados traduzida e estilizada */
const renderTicketStatusBadge = (status) => {
  const statusKey = status?.toUpperCase() || 'PENDING';
  
  const statusMap = {
    PENDING: { label: 'PENDENTE', classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10' },
    OPEN: { label: 'PENDENTE', classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10' },
    ASSIGNED: { label: 'ATRIBUÍDO', classes: 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sky-500/10' },
    TRAVELING: { label: 'EM DESLOCAMENTO', classes: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-indigo-500/10' },
    IN_PROGRESS: { label: 'EM ATENDIMENTO', classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10' },
    COMPLETED: { label: 'CONCLUÍDO', classes: 'bg-slate-700/40 text-slate-300 border-slate-600/50' },
  };

  const config = statusMap[statusKey] || {
    label: statusKey,
    classes: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider border shadow-sm ${config.classes}`}>
      {config.label}
    </span>
  );
};

/** Renderiza a Badge de Status da Frota de Técnicos */
const renderTechStatusBadge = (status) => {
  const statusKey = status?.toLowerCase() || 'available';

  const statusMap = {
    available: { label: 'Disponível', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    traveling: { label: 'Em Deslocamento', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    busy: { label: 'Em Atendimento', classes: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    offline: { label: 'Offline', classes: 'bg-slate-800 text-slate-500 border-slate-700' },
  };

  const config = statusMap[statusKey] || { label: status, classes: 'bg-slate-800 text-slate-300 border-slate-700' };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${config.classes}`}>
      {config.label}
    </span>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function App() {
  const [technicians, setTechnicians] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [contractors, setContractors] = useState([]);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dispatchTab, setDispatchTab] = useState('internal');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isTechMobileOpen, setIsTechMobileOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  
  // Estado para controlar o Modal do Despacho Inteligente
  const [quickDispatchModalData, setQuickDispatchModalData] = useState(null);

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

  // Busca CEP Integrada com ViaCEP + Geocodificação OpenStreetMap
  const handleCepSearch = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (!cleanCep || cleanCep.length !== 8) {
      alert("Por favor, digite um CEP válido com 8 dígitos.");
      return;
    }

    setIsSearchingCep(true);

    try {
      // 1. Consulta o ViaCEP para converter o CEP em endereço textual seguro
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const viaCepData = await res.json();

      if (viaCepData.erro) {
        alert("CEP não encontrado na base dos Correios.");
        setIsSearchingCep(false);
        return;
      }

      // 2. Monta o texto de endereço ignorando campos com "S/N" ou vazios
      const partes = [];
      if (viaCepData.logradouro && !viaCepData.logradouro.includes("S/N")) {
        partes.push(viaCepData.logradouro);
      }
      if (viaCepData.bairro && viaCepData.bairro !== "Centro") {
        partes.push(viaCepData.bairro);
      }
      if (viaCepData.localidade) {
        partes.push(viaCepData.localidade);
      }
      if (viaCepData.uf) {
        partes.push(viaCepData.uf);
      }

      const enderecoFormatado = partes.length > 0 ? partes.join(', ') : `${viaCepData.localidade} - ${viaCepData.uf}`;

      // Atualiza o campo de entrada para o nome da cidade/rua
      setNewAddress(enderecoFormatado);

      // 3. Obtém as coordenadas GPS exatas no mapa a partir do texto amigável
      const coords = await getCoordinatesFromAddress(enderecoFormatado);

      if (coords && coords.lat && !isNaN(coords.lat)) {
        setCurrentCoords({
          ...coords,
          address: enderecoFormatado
        });
      } else {
        alert(`Endereço localizado (${enderecoFormatado}), mas pode ser necessário informar a rua para maior precisão.`);
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      alert("Erro ao consultar CEP. Tente digitar o nome da cidade/rua manualmente.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Criação de Chamados com Suporte a Apenas Números (CEP) e Garantia de Coordenadas
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newId = `ticket_${Date.now()}`;
      const newCode = `#${Math.floor(1000 + Math.random() * 9000)}`;

      let finalAddress = newAddress.trim();
      let locationCoords = currentCoords;

      // DETECTOR AUTOMÁTICO DE CEP DIGITADO NO CAMPO DE ENDEREÇO (SOMENTE NÚMEROS)
      const cleanNumbers = finalAddress.replace(/\D/g, '');
      const isPureCep = cleanNumbers.length === 8 && (finalAddress === cleanNumbers || finalAddress.replace('-', '').length === 8);

      if (isPureCep) {
        try {
          const res = await fetch(`https://viacep.com.br/ws/${cleanNumbers}/json/`);
          const viaCep = await res.json();

          if (!viaCep.erro) {
            const partes = [];
            if (viaCep.logradouro && !viaCep.logradouro.includes("S/N")) partes.push(viaCep.logradouro);
            if (viaCep.bairro && viaCep.bairro !== "Centro") partes.push(viaCep.bairro);
            if (viaCep.localidade) partes.push(viaCep.localidade);
            if (viaCep.uf) partes.push(viaCep.uf);

            finalAddress = partes.length > 0 ? partes.join(', ') : `${viaCep.localidade} - ${viaCep.uf}`;
          }
        } catch (err) {
          console.error("Erro na conversão automática de CEP numérico:", err);
        }
      }

      // Garante a busca de coordenadas no mapa se ainda não existirem ou se o endereço mudou
      if (!locationCoords || !locationCoords.lat || isNaN(locationCoords.lat)) {
        locationCoords = await getCoordinatesFromAddress(finalAddress);
      }

      // Garante que o endereço gravado no objeto de localização seja o nome textual legível
      if (locationCoords) {
        locationCoords = {
          ...locationCoords,
          address: finalAddress
        };
      }

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

      // Reseta o formulário
      setIsCreateModalOpen(false);
      setNewTitle('');
      setCep('');
      setNewAddress('Vitória - ES');
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

  // Despacho Inteligente com Modal Estilizado
  const handleQuickDispatch = async (e, ticket) => {
    e.stopPropagation();
    const bestTech = findBestTechForTicket(ticket, technicians);
    if (bestTech) {
      await dispatchTicketToTech(ticket.id, bestTech.id);
      
      setQuickDispatchModalData({
        code: ticket.code,
        techName: bestTech.name,
        distanceKm: bestTech.distanceKm,
        etaMinutes: bestTech.etaMinutes
      });
    } else {
      setSelectedTicket(ticket);
      setDispatchTab('contractor');
    }
  };

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
      
      {/* HEADER PRINCIPAL */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-sky-500/20 p-2.5 rounded-lg border border-sky-500/30">
            <Activity className="w-6 h-6 text-sky-400 animate-pulse" />
          </div>
          
          <img 
            src="/logo.jpg" 
            alt="GeoNexus Logo" 
            className="w-10 h-10 object-contain rounded-lg bg-white p-0.5 shadow-md shrink-0"
          />
          
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
            <Smartphone className="w-4 h-4" /> Módulo Celular
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-lg shadow-lg shadow-sky-600/20 transition">
            <PlusCircle className="w-4 h-4" /> Novo Chamado
          </button>
          <button onClick={seedDatabase} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-2.5 rounded-lg border border-slate-700 transition">
            <Database className="w-4 h-4 text-sky-400" /> Reiniciar
          </button>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* CARDS DE INDICADORES (KPIs) */}
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

        {/* MAPA INTERATIVO */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            📍 Localização da Frota em Tempo Real (Visão Geral)
          </h2>
          <Map 
            technicians={technicians} 
            tickets={tickets} 
            onSelectTicket={(ticket) => { setSelectedTicket(ticket); setDispatchTab('internal'); }} 
            activeTicketForRoute={selectedTicket}
          />
        </div>

        {/* PAINÉIS DE CHAMADOS E TÉCNICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* PAINEL DE CHAMADOS */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Chamados em Operação
            </h2>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {tickets.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => { if (t.status === 'pending') { setSelectedTicket(t); setDispatchTab('internal'); } }} 
                  className={`bg-slate-950 border rounded-lg p-4 space-y-3 transition ${t.status === 'pending' ? 'border-sky-500/40 hover:border-sky-400 cursor-pointer' : 'border-slate-800 opacity-80'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono text-sky-400 font-bold">{t.code}</span>
                      <h4 className="text-sm font-semibold text-white mt-0.5">{t.title}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      {traduzirGravidade(t.severity)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-2">
                    <p>📍 {t.location?.address}</p>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                      <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                      {renderTicketStatusBadge(t.status)}
                    </div>
                  </div>

                  {t.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={(e) => handleQuickDispatch(e, t)}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-1.5 rounded flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 transition"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" /> Despacho Inteligente
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PAINEL DE TÉCNICOS EM CAMPO */}
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
                    {renderTechStatusBadge(tech.status)}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {tech.skills?.map(s => <span key={s} className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded uppercase font-mono">{s}</span>)}
                    {tech.nrs?.map(nr => <span key={nr} className="px-1.5 py-0.5 text-[9px] bg-emerald-950 text-emerald-400 rounded font-semibold font-mono">{nr}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* MODAL DE CONFIRMAÇÃO ESTILIZADO (DESPACHO INTELIGENTE) */}
      {quickDispatchModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl shadow-amber-500/10 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 fill-current animate-bounce" />
            </div>
            
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                Alocação Rápida Concluída!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Técnico notificado e rota gerada com sucesso.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-400">Chamado:</span>
                <strong className="text-sky-400 font-bold">{quickDispatchModalData.code}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-400">Dupla / Técnico:</span>
                <strong className="text-white">{quickDispatchModalData.techName}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-400">Distância:</span>
                <strong className="text-slate-200">{quickDispatchModalData.distanceKm} km</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Previsão Chegada:</span>
                <strong className="text-amber-400">{quickDispatchModalData.etaMinutes} min</strong>
              </div>
            </div>

            <button
              onClick={() => setQuickDispatchModalData(null)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 rounded-xl shadow-lg shadow-amber-500/10 transition"
            >
              Ok, Entendido
            </button>
          </div>
        </div>
      )}

      {/* COMPONENTES MODAIS AUXILIARES */}
      <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />

      {/* MODAL: NOVO CHAMADO */}
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
                <input 
                  type="text" 
                  value={newAddress} 
                  onChange={(e) => {
                    setNewAddress(e.target.value);
                    setCurrentCoords(null); // Reseta o cache de coordenadas ao alterar o texto manualmente
                  }} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white mt-1" 
                />
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

      {/* MODAL: DESPACHO MANUAL & TERCEIRIZADAS */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-sky-400 font-bold">{selectedTicket.code}</span>
                  {renderTicketStatusBadge(selectedTicket.status)}
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-400">📍 Local: <strong className="text-slate-200">{selectedTicket.location?.address}</strong></p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setDispatchTab('internal')}
                className={`py-2 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
                  dispatchTab === 'internal' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" /> Despacho Inteligente (Interno)
              </button>
              <button
                onClick={() => setDispatchTab('contractor')}
                className={`py-2 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
                  dispatchTab === 'contractor' ? 'bg-sky-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" /> Empresas Terceirizadas (Custos)
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              
              {/* ABA 1: EQUIPES INTERNAS RECOMENDADAS */}
              {dispatchTab === 'internal' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Técnicos Mais Indicados por Algoritmo de Geopexel</h4>

                  {rankedCandidates.map((cand, idx) => (
                    <div key={cand.id} className={`p-4 rounded-lg border space-y-2 ${idx === 0 && cand.isQualified ? 'bg-sky-950/40 border-sky-500/60' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{cand.name}</span>
                          <span className="text-xs text-slate-400">(Equipe {cand.team})</span>
                          {idx === 0 && cand.isQualified && <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5">⚡ RECOMENDADO</span>}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-sky-400">{cand.score}</span>
                          <span className="text-[10px] text-slate-400 block">COMPATIBILIDADE</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900/60 p-2.5 rounded border border-slate-800/50">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Navigation className="w-3.5 h-3.5 text-sky-400" />
                          <span>Distância: <strong>{cand.distanceKm} km</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Chegada: <strong className="text-amber-300">{formatarTempo(cand.etaMinutes)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Combustível: <strong>R$ {cand.estimatedFuelCost}</strong></span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-1">
                          {cand.hasAllNRs ? <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">NRs OK</span> : <span className="text-[10px] text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">Falta NR</span>}
                          {cand.hasAllSkills ? <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">Habilidades OK</span> : <span className="text-[10px] text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">Falta Habilidade</span>}
                        </div>

                        <button disabled={!cand.isQualified} onClick={() => handleDispatchTech(selectedTicket.id, cand.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold rounded transition flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {cand.isQualified ? 'Confirmar Despacho' : 'Incompatível'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA 2: EMPRESAS TERCEIRIZADAS */}
              {dispatchTab === 'contractor' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1"><Building2 className="w-4 h-4" /> Credenciadas & Simulação Financeira de Transbordo</h4>

                  {contractors.map(c => {
                    const cost = calculateContractorCost(c, selectedTicket, 12.5);
                    return (
                      <div key={c.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-sm font-bold text-white">{c.name}</h5>
                            <p className="text-xs text-slate-400">Tempo Médio: <strong>~{c.avgEtaMinutes || 45} min</strong> | Rating: <strong>⭐ {c.rating || 4.8}</strong></p>
                          </div>
                          <button onClick={() => handleDispatchContractor(selectedTicket.id, c.id)} className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> Despachar Terceirizada
                          </button>
                        </div>

                        {cost && (
                          <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-lg space-y-1.5 text-xs font-mono">
                            <div className="flex justify-between text-slate-400">
                              <span>Taxa Base de Deslocamento:</span>
                              <span className="text-slate-200">R$ {cost.baseRate.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Distância Estimada (12.5 km):</span>
                              <span className="text-slate-200">R$ {cost.distanceCost.toFixed(2)}</span>
                            </div>
                            {cost.severitySurcharge > 0 && (
                              <div className="flex justify-between text-amber-400 font-semibold">
                                <span>Adicional Urgência ({selectedTicket.severity?.toUpperCase()}):</span>
                                <span>+ R$ {cost.severitySurcharge.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-bold text-emerald-400 pt-2 border-t border-slate-800">
                              <span>Custo Total Previsto:</span>
                              <span className="text-base">R$ {cost.totalCost.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* OUTRAS MODAIS */}
      {isTechMobileOpen && <TechMobileView technicians={technicians} tickets={tickets} onClose={() => setIsTechMobileOpen(false)} />}
      {isAnalyticsOpen && <AnalyticsModal tickets={tickets} technicians={technicians} contractors={contractors} onClose={() => setIsAnalyticsOpen(false)} />}
    </div>
  );
}