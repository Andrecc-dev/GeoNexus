import React from 'react';
import { X, TrendingUp, Clock, DollarSign, CheckCircle2, ShieldAlert, Award } from 'lucide-react';

export default function AnalyticsModal({ tickets = [], technicians = [], contractors = [], onClose }) {
  const totalTickets = tickets.length || 1;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved');
  const slaCompliance = Math.round((resolvedTickets.length / totalTickets) * 100);

  // Métricas calculadas
  const totalEstFuelCost = tickets.reduce((acc, t) => acc + (t.status !== 'pending' ? 45.50 : 0), 0);
  const avgRepairTime = Math.round(
    tickets.reduce((acc, t) => acc + (t.estimatedRepairMinutes || 0), 0) / totalTickets
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-3xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-400" /> Executive Analytics & SLA Operations
            </h3>
            <p className="text-xs text-slate-400">Indicadores consolidados de eficiência, custos e performance em tempo real</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-sky-400" /> Acurácia de SLA</span>
            <div className="text-2xl font-bold text-emerald-400">{slaCompliance}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${slaCompliance}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Custo de Deslocamento</span>
            <div className="text-2xl font-bold text-white">R$ {totalEstFuelCost.toFixed(2)}</div>
            <p className="text-[10px] text-slate-500 mt-1">Baseado nas rotas otimizadas</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Tempo Médio Solução</span>
            <div className="text-2xl font-bold text-amber-400">{avgRepairTime} min</div>
            <p className="text-[10px] text-slate-500 mt-1">Previsão acumulada por chamado</p>
          </div>
        </div>

        {/* Resumo da Operação */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-sky-400" /> Performance da Frota & Contingência
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Técnicos Internos</span>
              <strong className="text-sm text-white">{technicians.length} ativos</strong>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Terceirizadas</span>
              <strong className="text-sm text-amber-400">{contractors.length} homologadas</strong>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Chamados Concluídos</span>
              <strong className="text-sm text-emerald-400">{resolvedTickets.length} resolvidos</strong>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Taxa de Ocupação</span>
              <strong className="text-sm text-sky-400">
                {Math.round((technicians.filter(t => t.status !== 'available').length / (technicians.length || 1)) * 100)}%
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}