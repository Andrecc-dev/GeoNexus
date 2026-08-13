import React, { useState, useEffect } from 'react';
import { Smartphone, Navigation, CheckCircle2, AlertCircle, Clock, ShieldCheck, X } from 'lucide-react';
import { updateTechTicketStatus, updateTechStatus, updateTicketStatus } from '../services/dbService';

export default function TechMobileView({ technicians = [], tickets = [], onClose }) {
  const [selectedTechId, setSelectedTechId] = useState(technicians[0]?.id || '');

  // Sincroniza o técnico selecionado quando a lista assíncrona do Firebase carregar
  useEffect(() => {
    if (!selectedTechId && technicians.length > 0) {
      setSelectedTechId(technicians[0].id);
    }
  }, [technicians, selectedTechId]);

  const currentTech = technicians.find(t => t.id === selectedTechId);
  const activeTicket = tickets.find(
    t => t.id === currentTech?.currentTicketId || 
         (t.assignedTechId === currentTech?.id && t.status !== 'resolved' && t.status !== 'completed')
  );

  const handleStatusChange = async (nextTicketStatus, nextTechStatus) => {
    if (!activeTicket || !currentTech) return;

    if (typeof updateTechTicketStatus === 'function') {
      await updateTechTicketStatus(activeTicket.id, currentTech.id, nextTicketStatus, nextTechStatus);
    } else {
      if (typeof updateTicketStatus === 'function') await updateTicketStatus(activeTicket.id, nextTicketStatus);
      if (typeof updateTechStatus === 'function') await updateTechStatus(currentTech.id, nextTechStatus);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Simulador de Smartphone Header */}
        <div className="text-center border-b border-slate-800 pb-3">
          <div className="flex items-center justify-center gap-2 text-sky-400 font-bold text-sm">
            <Smartphone className="w-4 h-4" /> App do Técnico (Visão de Campo)
          </div>
          
          {/* Seletor de Técnico */}
          <select 
            value={selectedTechId} 
            onChange={(e) => setSelectedTechId(e.target.value)}
            className="mt-2 w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded p-2 focus:border-sky-500 outline-none cursor-pointer"
          >
            {technicians.length === 0 ? (
              <option value="">Carregando técnicos...</option>
            ) : (
              technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
              ))
            )}
          </select>
        </div>

        {/* Conteúdo do Celular */}
        {activeTicket ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono text-sky-400 font-bold">{activeTicket.code}</span>
              <span className="text-[10px] bg-sky-950 text-sky-400 px-2 py-0.5 rounded uppercase font-semibold border border-sky-800/50">
                {activeTicket.status}
              </span>
            </div>

            <h4 className="text-sm font-bold text-white">{activeTicket.title}</h4>
            <p className="text-xs text-slate-400">📍 {activeTicket.location?.address || 'Endereço não informado'}</p>

            <div className="flex gap-2 text-[10px] text-slate-300 bg-slate-900 p-2 rounded">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> {activeTicket.estimatedRepairMinutes || 60} min</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" /> NRs Verificadas</span>
            </div>

            {/* Workflow de Ações do Técnico */}
            <div className="space-y-2 pt-2">
              {activeTicket.status === 'assigned' && (
                <button 
                  onClick={() => handleStatusChange('traveling', 'traveling')}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Navigation className="w-4 h-4" /> Iniciar Deslocamento
                </button>
              )}

              {activeTicket.status === 'traveling' && (
                <button 
                  onClick={() => handleStatusChange('in_progress', 'busy')}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <AlertCircle className="w-4 h-4" /> Cheguei no Local / Iniciar Reparo
                </button>
              )}

              {activeTicket.status === 'in_progress' && (
                <button 
                  onClick={() => handleStatusChange('resolved', 'available')}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> Concluir Atendimento
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-medium text-slate-300">Nenhum chamado pendente para este técnico.</p>
            <p className="text-[10px] text-slate-500">Status atual: {currentTech?.status || 'Disponível'}</p>
          </div>
        )}
      </div>
    </div>
  );
}