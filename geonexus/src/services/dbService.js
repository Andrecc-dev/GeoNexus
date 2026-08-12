import { ref, set, onValue, update } from "firebase/database";
import { db } from "./firebase";
import { initialTechnicians, initialTickets, initialContractors, defaultSettings } from "../data/mockData";

export const seedDatabase = async () => {
  try {
    const techMap = initialTechnicians.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
    const ticketMap = initialTickets.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
    const contractorMap = initialContractors.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});

    await set(ref(db, "technicians"), techMap);
    await set(ref(db, "tickets"), ticketMap);
    await set(ref(db, "contractors"), contractorMap);
    await set(ref(db, "settings"), defaultSettings);

    return { success: true };
  } catch (error) {
    console.error("Erro ao sincronizar com o Firebase:", error);
    return { success: false, error };
  }
};

export const createTicketInDB = async (ticketData) => {
  try {
    const newTicketRef = ref(db, `tickets/${ticketData.id}`);
    await set(newTicketRef, ticketData);
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar ticket:", error);
    return { success: false, error };
  }
};

export const dispatchTicketToTech = async (ticketId, techId) => {
  try {
    await update(ref(db, `tickets/${ticketId}`), {
      status: 'assigned',
      assignedTechId: techId,
      assignedAt: Date.now()
    });

    await update(ref(db, `technicians/${techId}`), {
      status: 'traveling',
      currentTicketId: ticketId
    });

    return { success: true };
  } catch (error) {
    console.error("Erro no despacho:", error);
    return { success: false, error };
  }
};

export const dispatchTicketToContractor = async (ticketId, contractorId) => {
  try {
    await update(ref(db, `tickets/${ticketId}`), {
      status: 'contractor',
      assignedContractorId: contractorId,
      assignedAt: Date.now()
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao terceirizar:", error);
    return { success: false, error };
  }
};

export const subscribeToCollection = (path, callback) => {
  const dataRef = ref(db, path);
  return onValue(dataRef, (snapshot) => {
    const val = snapshot.val();
    if (val) {
      callback(Array.isArray(val) ? val : Object.values(val));
    } else {
      callback([]);
    }
  });
};

export const updateTechTicketStatus = async (ticketId, techId, ticketStatus, techStatus) => {
  try {
    await update(ref(db, `tickets/${ticketId}`), { 
      status: ticketStatus,
      updatedAt: Date.now()
    });

    await update(ref(db, `technicians/${techId}`), {
      status: techStatus,
      currentTicketId: ticketStatus === 'resolved' ? null : ticketId
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar status do atendimento:", error);
    return { success: false, error };
  }
};

// Função adicionada para atualização do status direto pelo app mobile
export const updateTechStatusInDB = async (techId, techStatus) => {
  try {
    await update(ref(db, `technicians/${techId}`), {
      status: techStatus,
      updatedAt: Date.now()
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar status do técnico:", error);
    return { success: false, error };
  }
};