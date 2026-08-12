// 1. Busca Endereço Completo pelo CEP (API Gratuita ViaCEP)
export async function getAddressFromCep(cep) {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      alert("CEP não encontrado!");
      return null;
    }

    // Monta o endereço formatado retornado pelo ViaCEP
    const formattedAddress = `${data.logradouro ? data.logradouro + ', ' : ''}${data.bairro ? data.bairro + ' - ' : ''}${data.localidade} - ${data.uf}`;
    
    // Busca coordenadas no Nominatim usando o endereço oficial retornado
    const coords = await getCoordinatesFromAddress(formattedAddress);

    return {
      address: formattedAddress,
      lat: coords.lat,
      lng: coords.lng,
      cepData: data
    };
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
}

// 2. Geocodificação de Endereço/Município via Nominatim (com tratamento de erros)
export async function getCoordinatesFromAddress(address) {
  if (!address) return { lat: -20.3155, lng: -40.3128, address: "Vitória - ES" };

  try {
    // Normaliza acentos e erros comuns de digitação
    const normalizedAddress = address.replace(/matheus/gi, 'mateus').trim();
    const query = encodeURIComponent(`${normalizedAddress}, Espírito Santo, Brasil`);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
    );
    
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: normalizedAddress
      };
    }
  } catch (error) {
    console.error("Erro na geocodificação:", error);
  }

  // Fallback inteligente para municípios principais caso o geocode falhe
  const lower = address.toLowerCase();
  if (lower.includes('mateus') || lower.includes('matheus')) return { lat: -18.7161, lng: -39.8589, address: "São Mateus - ES" };
  if (lower.includes('linhares')) return { lat: -19.3911, lng: -40.0722, address: "Linhares - ES" };
  if (lower.includes('viana')) return { lat: -20.3900, lng: -40.4600, address: "Viana - ES" };

  return { lat: -20.3155, lng: -40.3128, address };
}