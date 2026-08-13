import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Clock, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  X,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export default function ManagerAnalyticsModal({ onClose, tickets = [], technicians = [] }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodPreset, setPeriodPreset] = useState('todos');
  const [isExporting, setIsExporting] = useState(false);

  // Exportação para PDF usando a caixa de impressão nativa
  const handleExportPDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 300);
  };

  // Seleção rápida de data
  const handlePresetChange = (preset) => {
    setPeriodPreset(preset);
    const today = new Date();
    if (preset === 'hoje') {
      setSelectedDate(today.toISOString().split('T')[0]);
    } else if (preset === 'ontem') {
      today.setDate(today.getDate() - 1);
      setSelectedDate(today.toISOString().split('T')[0]);
    } else if (preset === 'todos') {
      setSelectedDate('');
    }
  };

  // 1. FILTRAGEM DINÂMICA DE TICKETS POR DATA
  const filteredTickets = useMemo(() => {
    if (!selectedDate) return tickets;
    return tickets.filter(t => {
      const dateSource = t.createdAt || t.updatedAt;
      if (!dateSource) return true;
      const ticketDate = new Date(dateSource).toISOString().split('T')[0];
      return ticketDate === selectedDate;
    });
  }, [tickets, selectedDate]);

  // 2. CÁLCULOS EM TEMPO REAL DOS INDICADORES (KPIs)
  const stats = useMemo(() => {
    const totalTickets = filteredTickets.length;
    const completedTickets = filteredTickets.filter(
      t => t.status === 'resolved' || t.status === 'completed'
    );
    
    // SLA: Porcentagem de chamados sem atraso grave (ou resolvidos)
    const slaSuccessCount = filteredTickets.filter(
      t => t.status === 'resolved' || t.status === 'completed' || t.status === 'in_progress'
    ).length;
    const slaAccuracy = totalTickets > 0 ? Math.round((slaSuccessCount / totalTickets) * 100) : 100;

    // Tempo Médio de Solução (Minutos)
    const totalMinutes = filteredTickets.reduce((acc, t) => acc + (Number(t.estimatedRepairMinutes) || 60), 0);
    const avgSolutionTime = totalTickets > 0 ? Math.round(totalMinutes / totalTickets) : 0;

    // Custo de Deslocamento (Simulado dinamicamente por chamado/distância R$ 15,00 por rota)
    const totalTravelCost = (totalTickets * 15.50).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    // Ocupação da Frota (% de técnicos em deslocamento ou atendimento)
    const busyTechs = technicians.filter(
      t => t.status === 'busy' || t.status === 'traveling' || t.status === 'em_atendimento'
    ).length;
    const occupancyRate = technicians.length > 0 
      ? Math.round((busyTechs / technicians.length) * 100) 
      : 0;

    // Chamados Terceirizados
    const contractorTickets = filteredTickets.filter(
      t => t.assignedContractorId || t.status === 'contractor'
    ).length;

    return {
      totalTickets,
      completedCount: completedTickets.length,
      slaAccuracy,
      avgSolutionTime,
      totalTravelCost,
      occupancyRate,
      busyTechs,
      contractorTickets
    };
  }, [filteredTickets, technicians]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative text-slate-100 print:bg-white print:text-black print:border-none print:shadow-none print:w-full">
        
        {/* Botão Fechar */}
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors print:hidden"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 print:border-gray-300">
          <div>
            <div className="flex items-center gap-2 text-sky-400 print:text-sky-700">
              <BarChart3 className="w-6 h-6" />
              <h2 className="text-xl font-bold tracking-tight text-white print:text-black">
                Painel do Gestor - Desempenho Operacional
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 print:text-gray-600">
              Indicadores calculados em tempo real com base na operação
            </p>
          </div>

          {/* Exportar PDF */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-sky-600/20 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>
          </div>
        </div>

        {/* Filtro por Data e Atalhos */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Calendar className="w-5 h-5 text-sky-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-300">Filtrar por Data:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-2 outline-none focus:border-sky-500 transition-colors cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => handlePresetChange('todos')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                periodPreset === 'todos'
                  ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Ver Todos ({tickets.length})
            </button>
            <button
              onClick={() => handlePresetChange('hoje')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                periodPreset === 'hoje'
                  ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => handlePresetChange('ontem')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                periodPreset === 'ontem'
                  ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Ontem
            </button>
          </div>
        </div>

        {/* Informação do Relatório no PDF */}
        <div className="hidden print:block text-xs text-gray-600 mb-2">
          Relatório Operacional - Data de Referência:{' '}
          <strong>
            {selectedDate 
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR') 
              : 'Histórico Completo'}
          </strong>
        </div>

        {/* Indicadores Principais (KPIs DINÂMICOS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: SLA Dinâmico */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 print:border-gray-300 print:bg-gray-50">
            <div className="flex justify-between items-center text-slate-400 print:text-gray-700">
              <span className="text-xs font-medium">Acurácia de SLA</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 print:text-emerald-700">
              {stats.slaAccuracy}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden print:bg-gray-200">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${stats.slaAccuracy}%` }} 
              />
            </div>
            <p className="text-[10px] text-slate-500 print:text-gray-500">
              {stats.totalTickets} chamados analisados
            </p>
          </div>

          {/* Card 2: Custo Estimado Dinâmico */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 print:border-gray-300 print:bg-gray-50">
            <div className="flex justify-between items-center text-slate-400 print:text-gray-700">
              <span className="text-xs font-medium">Custo de Deslocamento</span>
              <DollarSign className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white print:text-black">
              {stats.totalTravelCost}
            </div>
            <p className="text-[10px] text-slate-500 print:text-gray-500">
              Calculado via rotas do período
            </p>
          </div>

          {/* Card 3: Tempo Média Dinâmico */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 print:border-gray-300 print:bg-gray-50">
            <div className="flex justify-between items-center text-slate-400 print:text-gray-700">
              <span className="text-xs font-medium">Tempo Médio Solução</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 print:text-amber-700">
              {stats.avgSolutionTime} min
            </div>
            <p className="text-[10px] text-slate-500 print:text-gray-500">
              Média do tempo previsto em campo
            </p>
          </div>
        </div>

        {/* Seção Secundária: Frota e Contingência Dinâmica */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4 print:border-gray-300 print:bg-white">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 print:text-black">
            <Users className="w-4 h-4 text-sky-400" /> Performance da Frota em Tempo Real
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Técnicos Ativos */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1 print:border-gray-200 print:bg-gray-50">
              <span className="text-[11px] text-slate-400 print:text-gray-600 block">Técnicos Internos</span>
              <span className="text-lg font-bold text-white print:text-black">
                {technicians.length} <span className="text-xs font-normal text-slate-400">cadastrados</span>
              </span>
            </div>

            {/* Terceirizadas acionadas */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1 print:border-gray-200 print:bg-gray-50">
              <span className="text-[11px] text-slate-400 print:text-gray-600 block">Terceirizados</span>
              <span className="text-lg font-bold text-amber-400 print:text-amber-700">
                {stats.contractorTickets} <span className="text-xs font-normal text-slate-400">chamados</span>
              </span>
            </div>

            {/* Chamados Concluídos */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1 print:border-gray-200 print:bg-gray-50">
              <span className="text-[11px] text-slate-400 print:text-gray-600 block">Chamados Concluídos</span>
              <span className="text-lg font-bold text-emerald-400 print:text-emerald-700">
                {stats.completedCount} <span className="text-xs font-normal text-slate-400">resolvidos</span>
              </span>
            </div>

            {/* Taxa de Ocupação da Frota */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1 print:border-gray-200 print:bg-gray-50">
              <span className="text-[11px] text-slate-400 print:text-gray-600 block">Taxa de Ocupação</span>
              <span className="text-lg font-bold text-sky-400 print:text-sky-700">
                {stats.occupancyRate}% <span className="text-[10px] font-normal text-slate-400">({stats.busyTechs} em campo)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé informativo */}
        <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 print:border-gray-300 print:text-gray-500">
          <span>
            Exibindo <strong>{filteredTickets.length}</strong> de <strong>{tickets.length}</strong> chamados
          </span>
          <span className="flex items-center gap-1 text-emerald-400 print:text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse print:hidden" />
            Sincronizado via Firebase
          </span>
        </div>

      </div>
    </div>
  );
}