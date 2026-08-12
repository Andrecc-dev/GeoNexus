import React, { useState } from 'react';
import { Users, UserPlus, X, Shield, Wrench, CheckCircle2, Zap } from 'lucide-react';
import { addTechToDB } from '../services/dbService';
import { MOCK_COMPANY_ID } from '../data/mockData';

export default function AdminPanel({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState('A');
  const [selectedSkills, setSelectedSkills] = useState(['backbone']);
  const [selectedNRs, setSelectedNRs] = useState(['NR10']);
  const [address, setAddress] = useState('Vitória - ES');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const availableSkills = ['backbone', 'pop', 'network', 'datacenter', 'endpoint'];
  const availableNRs = ['NR10', 'NR35', 'NR33', 'NR06'];

  const toggleSkill = (skill) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const toggleNR = (nr) => {
    setSelectedNRs(prev => 
      prev.includes(nr) ? prev.filter(n => n !== nr) : [...prev, nr]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newTech = {
        id: `tech_${Date.now()}`,
        companyId: MOCK_COMPANY_ID,
        name: name.toUpperCase(),
        team,
        status: 'available',
        skills: selectedSkills,
        nrs: selectedNRs,
        location: {
          lat: -20.3155 + (Math.random() - 0.5) * 0.04,
          lng: -40.3128 + (Math.random() - 0.5) * 0.04,
          address
        },
        vehicle: { model: 'Gol 1.0', fuelConsumptionKmPerLiter: 12 },
        currentTicketId: null
      };

      if (typeof addTechToDB === 'function') {
        await addTechToDB(newTech);
      }
      
      setName('');
      onClose();
    } catch (err) {
      console.error("Erro ao cadastrar técnico:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-sky-400" /> Cadastrar Nova Dupla Técnica
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300">Nome da Dupla / Técnico</label>
            <input 
              required 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ex: Carlos & Mateus" 
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white mt-1 focus:border-sky-500 outline-none" 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300">Equipe / Squad</label>
              <select value={team} onChange={(e) => setTeam(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white mt-1">
                <option value="A">Equipe A</option>
                <option value="B">Equipe B</option>
                <option value="C">Equipe C</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Base de Origem</label>
              <input 
                type="text" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white mt-1" 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1 mb-1.5">
              <Wrench className="w-3.5 h-3.5 text-sky-400" /> Habilidades Técnicas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableSkills.map(skill => (
                <button
                  type="button"
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-2.5 py-1 rounded text-xs transition flex items-center gap-1 uppercase font-mono ${
                    selectedSkills.includes(skill)
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {selectedSkills.includes(skill) && <CheckCircle2 className="w-3 h-3" />}
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1 mb-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> Certificações de Segurança (NRs)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableNRs.map(nr => (
                <button
                  type="button"
                  key={nr}
                  onClick={() => toggleNR(nr)}
                  className={`px-2.5 py-1 rounded text-xs transition flex items-center gap-1 uppercase font-mono ${
                    selectedNRs.includes(nr)
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {selectedNRs.includes(nr) && <CheckCircle2 className="w-3 h-3" />}
                  {nr}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded flex items-center gap-2">
              {isSubmitting ? 'Salvando...' : 'Cadastrar e Sincronizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}