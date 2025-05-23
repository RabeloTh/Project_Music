// Authorization token that must have been created previously. See : https://developer.spotify.com/documentation/web-api/concepts/authorization
const token = 'BQC-7SrZ9t2f4aUS_2r0Eshd8E1ZrNVtGn7yzPRJYNxPMumt6J0EMwaOz5OFInY039J4H5pJSRe0UxIhv1JhK_Sq7CC-CjppRTHq8E6Usk7YwdBsGkI8_Fve4KiA2ffYC_uA4X4wv6BQl985tS0EgQ_OvGiwUorNtGpS4Iaa5rZs0B_d-AXsyCSQkeghwaD9OK6weeoZWVlr-CtrL2_hvW9qfk387rpvE6yn1zC-9EtD7KbPtW0r-XApXH_e3PaUsLkEFtPixpf1CRJoJhFkkqDx7M6rD60o-lE-_iPgf8CL1-di-fgmZUNTuONO1m_H';
async function fetchWebApi(endpoint, method, body) {
  const res = await fetch(`https://api.spotify.com/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method,
    body:JSON.stringify(body)
  });
  return await res.json();
}

async function getTopTracks(){
  // Endpoint reference : https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
  return (await fetchWebApi(
    'v1/me/top/tracks?time_range=long_term&limit=5', 'GET'
  )).items;
}

const topTracks = await getTopTracks();
console.log(
  topTracks?.map(
    ({name, artists}) =>
      `${name} by ${artists.map(artist => artist.name).join(', ')}`
  )
);
// Funções auxiliares para mostrar/esconder seções
function showSection(selector) {
    document.querySelector(selector).classList.remove('hidden');
}

function hideSection(selector) {
    document.querySelector(selector).classList.add('hidden');
}

// Funções para atualizar mensagens de status
function updateStatus(elementId, message, type = 'info') {
    const statusElement = document.getElementById(elementId);
    statusElement.textContent = `Status: ${message}`;
    statusElement.className = `status-message ${type}`; // Limpa e adiciona a classe de tipo
}

// --- Lógica para Conexão de Plataforma de Origem ---
const sourcePlatformButtons = {
    spotify: document.getElementById('connectSpotifySource'),
    appleMusic: document.getElementById('connectAppleMusicSource'),
    youtubeMusic: document.getElementById('connectYouTubeMusicSource'),
    deezer: document.getElementById('connectDeezerSource'),
};
const sourceStatus = document.getElementById('sourceStatus');
let selectedSourcePlatform = null; // Armazena a plataforma de origem selecionada

// Adiciona event listeners para os botões de conexão de origem
for (const platform in sourcePlatformButtons) {
    sourcePlatformButtons[platform].addEventListener('click', () => {
        // Em um projeto real, aqui você faria uma requisição para o seu backend
        // que iniciaria o fluxo OAuth para a plataforma selecionada.
        // Por exemplo: window.location.href = `/api/auth/${platform}`;

        updateStatus('sourceStatus', `Conectando com ${platform.charAt(0).toUpperCase() + platform.slice(1)}...`, 'info');

        // Simula uma conexão bem-sucedida após um tempo
        setTimeout(() => {
            selectedSourcePlatform = platform;
            updateStatus('sourceStatus', `Conectado com ${platform.charAt(0).toUpperCase() + platform.slice(1)}!`, 'success');
            showSection('.playlist-selection'); // Mostra a seção de seleção de playlist
            // Desabilita os outros botões de origem
            for (const p in sourcePlatformButtons) {
                if (p !== platform) {
                    sourcePlatformButtons[p].disabled = true;
                }
            }
        }, 1500); // Atraso de 1.5 segundos para simular carregamento
    });
}

// --- Lógica para Seleção de Playlist ---
const playlistSelect = document.getElementById('playlistSelect');
const loadPlaylistsBtn = document.getElementById('loadPlaylistsBtn');
const playlistStatus = document.getElementById('playlistStatus');

loadPlaylistsBtn.addEventListener('click', async () => {
    if (!selectedSourcePlatform) {
        updateStatus('playlistStatus', 'Por favor, conecte uma plataforma de origem primeiro.', 'error');
        return;
    }

    updateStatus('playlistStatus', `Carregando playlists do ${selectedSourcePlatform.charAt(0).toUpperCase() + selectedSourcePlatform.slice(1)}...`, 'info');
    playlistSelect.innerHTML = '<option value="">Carregando playlists...</option>';
    playlistSelect.disabled = true;
    loadPlaylistsBtn.disabled = true;

    // Em um projeto real, aqui você faria uma requisição para o seu backend
    // para listar as playlists da plataforma de origem.
    // Exemplo: const response = await fetch(`/api/playlists/${selectedSourcePlatform}`);
    // const data = await response.json();
    // const playlists = data.playlists; // Assumindo que o backend retorna um array de playlists

    // Simulação de carregamento de playlists
    setTimeout(() => {
        const dummyPlaylists = [
            { id: 'p1', name: 'Minhas Favoritas Pop' },
            { id: 'p2', name: 'Workout Hits' },
            { id: 'p3', name: 'Chill Vibes' },
            { id: 'p4', name: 'Rock Clássico' },
        ];

        playlistSelect.innerHTML = '<option value="">-- Selecione uma playlist --</option>';
        dummyPlaylists.forEach(playlist => {
            const option = document.createElement('option');
            option.value = playlist.id;
            option.textContent = playlist.name;
            playlistSelect.appendChild(option);
        });
        playlistSelect.disabled = false;
        loadPlaylistsBtn.disabled = false;
        updateStatus('playlistStatus', 'Playlists carregadas!', 'success');
        showSection('.platform-selection:nth-of-type(3)'); // Mostra a seção de destino
    }, 2000);
});

// --- Lógica para Conexão de Plataforma de Destino ---
const destPlatformButtons = {
    spotify: document.getElementById('connectSpotifyDest'),
    appleMusic: document.getElementById('connectAppleMusicDest'),
    youtubeMusic: document.getElementById('connectYouTubeMusicDest'),
    deezer: document.getElementById('connectDeezerDest'),
};
const destStatus = document.getElementById('destStatus');
let selectedDestPlatform = null;

// Adiciona event listeners para os botões de conexão de destino
for (const platform in destPlatformButtons) {
    destPlatformButtons[platform].addEventListener('click', () => {
        // Similar ao de origem, mas para a plataforma de destino
        updateStatus('destStatus', `Conectando com ${platform.charAt(0).toUpperCase() + platform.slice(1)}...`, 'info');

        setTimeout(() => {
            selectedDestPlatform = platform;
            updateStatus('destStatus', `Conectado com ${platform.charAt(0).toUpperCase() + platform.slice(1)}!`, 'success');
            showSection('.transfer-action'); // Mostra a seção de transferência
            // Desabilita os outros botões de destino
            for (const p in destPlatformButtons) {
                if (p !== platform) {
                    destPlatformButtons[p].disabled = true;
                }
            }
        }, 1500);
    });
}


// --- Lógica para Transferência da Playlist ---
const transferBtn = document.getElementById('transferBtn');
const transferStatus = document.getElementById('transferStatus');

transferBtn.addEventListener('click', async () => {
    const selectedPlaylistId = playlistSelect.value;

    if (!selectedSourcePlatform || !selectedDestPlatform) {
        updateStatus('transferStatus', 'Por favor, conecte ambas as plataformas.', 'error');
        return;
    }
    if (!selectedPlaylistId) {
        updateStatus('transferStatus', 'Por favor, selecione uma playlist para transferir.', 'error');
        return;
    }

    const selectedPlaylistName = playlistSelect.options[playlistSelect.selectedIndex].textContent;

    updateStatus('transferStatus', `Iniciando transferência de "${selectedPlaylistName}" de ${selectedSourcePlatform.charAt(0).toUpperCase() + selectedSourcePlatform.slice(1)} para ${selectedDestPlatform.charAt(0).toUpperCase() + selectedDestPlatform.slice(1)}...`, 'info');
    transferBtn.disabled = true;

    // Em um projeto real, aqui você faria uma requisição POST para o seu backend
    // para iniciar a transferência. O backend faria a comunicação entre as APIs.
    // Exemplo:
    // try {
    //     const response = await fetch('/api/transfer-playlist', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({
    //             sourcePlatform: selectedSourcePlatform,
    //             destPlatform: selectedDestPlatform,
    //             playlistId: selectedPlaylistId
    //         })
    //     });
    //     const result = await response.json();
    //     if (response.ok) {
    //         updateStatus('transferStatus', `Playlist "${selectedPlaylistName}" transferida com sucesso!`, 'success');
    //     } else {
    //         updateStatus('transferStatus', `Erro na transferência: ${result.message || 'Desconhecido'}`, 'error');
    //     }
    // } catch (error) {
    //     updateStatus('transferStatus', `Erro na transferência: ${error.message}`, 'error');
    // } finally {
    //     transferBtn.disabled = false;
    // }

    // Simulação de transferência
    setTimeout(() => {
        const success = Math.random() > 0.2; // 80% de chance de sucesso
        if (success) {
            updateStatus('transferStatus', `Playlist "${selectedPlaylistName}" transferida com sucesso!`, 'success');
        } else {
            updateStatus('transferStatus', `Erro ao transferir "${selectedPlaylistName}". Tente novamente.`, 'error');
        }
        transferBtn.disabled = false;
    }, 3000); // Simula 3 segundos de transferência
});