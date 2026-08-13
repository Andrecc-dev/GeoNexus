import React, { useState } from 'react';
import { Zap, Building2, User, DollarSign, Clock, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { findBestTechForTicket } from '../services/geoService';
import { calculateContractorCost } from '../services/contratoService';
import { initialContractors } from '../data/mockData';
import { dispatchTicketToTech } from '../services/dbService';

export default function TicketDispatchModal({ ticket, technicians = [], isOpen, onClose }) {
  const [mode, setMode] = useState('smart'); // 'smart' (interna) ou 'contractor' (terceira)
  const [selectedContractorId, setSelectedContractorId] = useState(initialContractors[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !ticket) return null;

  // 1. Lógica da Equipe Interna (Despacho Inteligente)
  const bestTech = findBestTechForTicket(ticket, technicians);

  // 2. Lógica da Terceirizada (Cálculo Financeiro)
  const selectedContractor = initialContractors.find(c => c.id === selectedContractorId);
  const costDetails = calculateContractorCost(selectedContractor, ticket, 12.5);

  // Executar Alocação
  const handleConfirmDispatch = async () => {
    setIsSubmitting(true);
    try {
      if (mode === 'smart') {
        if (!bestTech) {
          alert('⚠️ Nenhuma dupla interna disponível no momento!');
          setIsSubmitting(false);
          return;
        }
        await dispatchTicketToTech(ticket.id, bestTech.id);
        alert(`⚡ Alocado com sucesso para a equipe interna: ${bestTech.name}!`);
      } else {
        // Alocação Terceirizada
        await dispatchTicketToTech(ticket.id, `contractor_${selectedContractor.id}`);
        alert(`🏢 Chamado enviado para a Terceirizada ${selectedContractor.name}!\nCusto Estimado: R$ ${costDetails.totalCost}`);
      }
      onClose();
    } catch (err) {
      console.error('Erro ao despachar chamado:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase bg-slate-800 text-sky-400 px-2 py-0.5 rounded">
              {ticket.code || '#CHAMADO'}
            </span>
            <h3 className="text-sm font-bold mt-1">{ticket.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Chaveador de Abas */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setMode('smart')}
            className={`py-2 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
              mode === 'smart' ? 'bg-amber-500 text-slate-950 shadow font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" /> Despacho Inteligente
          </button>
          <button
            onClick={() => setMode('contractor')}
            className={`py-2 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
              mode === 'contractor' ? 'bg-sky-600 text-white shadow font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" /> Terceirizada
          </button>
        </div>

        {/* ABA 1: DESPACHO INTELIGENTE (EQUIPE INTERNA) */}
        {mode === 'smart' && (
          <div className="bg-slate-950/70 border border-amber-500/20 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Recomendação por Algoritmo (SLA)
              </span>
            </div>

            {bestTech ? (
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-white">
                  <span>{bestTech.name}</span>
                  <span className="text-emerald-400">Score: {bestTech.score || 95}/100</span>
                </div>
                <p className="text-slate-400">Equipe: {bestTech.team} | Veículo: {bestTech.vehicle?.model || 'Gol'}</p>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                  <span>Distância: <strong>{bestTech.distanceKm || 4.2} km</strong></span>
                  <span>Tempo de Chegada: <strong>~{bestTech.etaMinutes || 15} min</strong></span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Nenhuma equipe disponível no momento.</p>
            )}
          </div>
        )}

        {/* ABA 2: TERCEIRIZADA (COM CUSTOS) */}
        {mode === 'contractor' && (
          <div className="bg-slate-950/70 border border-sky-500/20 p-4 rounded-xl space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-300">Empresa Credenciada</label>
              <select
                value={selectedContractorId}
                onChange={(e) => setSelectedContractorId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white mt-1 outline-none"
              >
                {initialContractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — ⭐ {c.rating}
                  </option>
                ))}
              </select>
            </div>

            {costDetails && (
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Taxa Base de Visita:</span>
                  <span className="font-mono text-white">R$ {costDetails.baseRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Deslocamento ({costDetails.distanceKm} km):</span>
                  <span className="font-mono text-white">R$ {costDetails.distanceCost.toFixed(2)}</span>
                </div>
                {costDetails.severitySurcharge > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Adicional Urgência:</span>
                    <span className="font-mono">+ R$ {costDetails.severitySurcharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-emerald-400 pt-2 border-t border-slate-800">
                  <span>Custo Total Estimado:</span>
                  <span className="font-mono text-base">R$ {costDetails.totalCost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botão de Ação */}
        <button
          onClick={handleConfirmDispatch}
          disabled={isSubmitting}
          className={`w-full py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            mode === 'smart'
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : 'bg-sky-600 hover:bg-sky-500 text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          {isSubmitting ? 'Processando...' : mode === 'smart' ? '⚡ Confirmar Despacho Inteligente' : '🏢 Despachar Terceirizada'}
        </button>

      </div>
    </div>
  );
}