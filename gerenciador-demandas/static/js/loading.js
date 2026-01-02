//Função para redirecionar para página de edição de demanda
async function abrirDemanda(id) {
    mostrarLoading();
    try {
        const response = await fetch(`/api/demandas/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            window.location.href = `/app/demanda/${id}`;
        }
        const data = await response.json();
    }
    catch(error) {
            console.error(error);
        }
}

document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationPanel = document.getElementById('notificationPanel');
    const notificationList = document.getElementById('notificationList');
    const dadosInput = document.getElementById('dadosNotificacoes');
    // 1. Pega a string JSON do input e a converte para um Array de objetos JavaScript
    let notificacoes = [];
    if (dadosInput && dadosInput.value) {
        try {
            notificacoes = JSON.parse(dadosInput.value);
        } catch (e) {
            console.error("Erro ao parsear as notificações:", e);
        }
    }
    // Função para renderizar apenas as notificações não lidas
    function renderizarNotificacoes() {
        // Limpa a lista atual para não duplicar
        notificationList.innerHTML = '';
        // 2. Filtra o array para pegar apenas as notificações com 'lida' == false
        const naoLidas = notificacoes.filter(notificacao => !notificacao.lida);
        // 3. Atualiza a visibilidade e o número no badge de notificações
        if (naoLidas.length > 0) {
            notificationBadge.textContent = naoLidas.length; // Mostra a contagem
            notificationBadge.classList.remove('hidden'); // Garante que o badge esteja visível
        } else {
            notificationBadge.classList.add('hidden'); // Esconde o badge se não houver não lidas
        }

            notificacoes.forEach(notificacao => {
                const containerNotificacao = document.createElement('div');
                containerNotificacao.classList.add('containerNotificacao');
                containerNotificacao.dataset.id = notificacao.id; // Guarda o ID para referência futura

                // Adiciona um evento de clique para marcar como lida e abrir a demanda
                containerNotificacao.addEventListener('click', async () => {
                    // Apenas marca como lida se ainda não foi lida, para evitar requisições desnecessárias
                    if (!notificacao.lida) {
                        await marcarComoLidas(notificacao.id);
                    }
                    // A função para abrir a demanda pode ser chamada independentemente do status de leitura
                    await abrirDemanda(notificacao.demanda_id);
                });
                if (notificacao.lida === true) {
                    containerNotificacao.classList.add('lida');
                }

                const msgNotificacao = document.createElement('p');
                msgNotificacao.classList.add('msgNotificacao');
                msgNotificacao.textContent = notificacao.mensagem;
                containerNotificacao.appendChild(msgNotificacao);

                const horarioNotificacao = document.createElement('p');
                horarioNotificacao.classList.add('horarioNotificacao');
                horarioNotificacao.textContent = notificacao.criada_em;
                containerNotificacao.appendChild(horarioNotificacao);

                notificationList.appendChild(containerNotificacao);
            });
    }
    // Função para marcar todas as notificações visíveis como lidas
    async function marcarComoLidas(id) {
        const id_a_enviar = [id];
        fetch('/api/notificacao/marcar_lida', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(id_a_enviar)
        })
        .then(response => response.json())
        .then(data => console.log('Notificações marcadas como lidas:', data))
        .catch(error => console.error('Erro ao marcar notificações:', error));
        
    }

    // Evento de clique no ícone de notificação
    notificationIcon.addEventListener('click', (event) => {
        event.stopPropagation();
        const isVisible = notificationPanel.classList.toggle('visible');
    });
    // Fechar o painel ao clicar fora
    document.addEventListener('click', (event) => {
        if (!notificationPanel.contains(event.target) && !notificationIcon.contains(event.target)) {
            notificationPanel.classList.remove('visible');
        }
    });
    // Renderiza as notificações iniciais ao carregar a página
    renderizarNotificacoes()

    function getCookieValue(cookieName) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.startsWith(cookieName + '=')) {
                return cookie.substring(cookieName.length + 1);
            }
        }
        return null;
    }
    const token = getCookieValue('accessToken');
    const dadosNotificacoesInput = document.getElementById('dadosNotificacoes');
    const userId = document.getElementById('hiddenId').value ;
    if (token && dadosNotificacoesInput) {
        try {
            // Verifique se a variável global `userId` existe
            if (typeof userId !== 'undefined') {
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsHost = window.location.host;
                const wsUrl = `${wsProtocol}//${wsHost}/api/ws/notifications/${userId}?token=${token}`;
                console.log("Tentando conectar ao WebSocket em:", wsUrl)
                const ws = new WebSocket(wsUrl);

                ws.onmessage = function(event) {
                    console.log("Notificação recebida:", event.data);
                    const notification = JSON.parse(event.data);

                    // Adiciona a nova notificação à lista de notificações (se 'notificacoes' for a sua lista)
                    if (typeof notificacoes !== 'undefined') {
                        notificacoes.unshift(notification);
                        renderizarNotificacoes(); // Re-renderiza a lista com a nova notificação
                    }
                };

                ws.onclose = function(event) {
                    console.log('Conexão WebSocket fechada:', event.reason);
                };

                ws.onerror = function(error) {
                    console.error('Erro no WebSocket:', error);
                };

            } else {
                console.warn("A variável global 'userId' não foi encontrada. Não foi possível iniciar o WebSocket.");
            }

        } catch (e) {
            console.error("Erro ao decodificar token ou iniciar WebSocket:", e);
        }
    }
});
function renderizarPersonalizacao(data) {
    if (!data || !data.empresa) {
        console.error("Dados de personalização inválidos ou ausentes.");
        return;
    }
    // Aplica as cores com base no cod_cor
    const { cod_cor } = data.empresa;
    const style = document.documentElement.style;
    if (cod_cor == 1) {
        style.setProperty('--fundoGerenciador', "url('/static/img/fundoGerenciador.jpg')");
        style.setProperty('--corPrincipal', "#242f4d");
        style.setProperty('--corSecundaria', "#B89A5F");
        style.setProperty('--sombraSecundaria', "#826c41");
    } else if (cod_cor == 2) {
        style.setProperty('--fundoGerenciador', "url('/static/img/fundoGerenciadorBrown.jpg')");
        style.setProperty('--corPrincipal', "#492D1A");
        style.setProperty('--corSecundaria', "#FEF9EF");
        style.setProperty('--sombraSecundaria', "#a19f9a");
    } else if (cod_cor == 3) {
        style.setProperty('--fundoGerenciador', "url('/static/img/fundoGerenciadorBranco.jpg')");
        style.setProperty('--corPrincipal', "#610a16ff");
        style.setProperty('--corSecundaria', "#88693bff");
        style.setProperty('--sombraSecundaria', "#a19f9a");
    } else if (cod_cor == 4) {
        style.setProperty('--fundoGerenciador', "url('/static/img/fundoGenrenciadorGreen.png')");
        style.setProperty('--corPrincipal', "#113c25");
        style.setProperty('--corSecundaria', "#B89A5F");
        style.setProperty('--sombraSecundaria', "#a19f9a");
    }
    // Aplica o logo e o nome da empresa
    document.querySelector(".logoLoading").src = data.empresa.logo_url;
    document.querySelector(".logoTopBar").src = data.empresa.logo_url;

    const inputInfoNome = document.querySelector(".inputInfoNome");
    if (inputInfoNome) {
        inputInfoNome.value = data.empresa.nomeEmpresa;
    }
}

async function carregarPersonalizacao() {
    const dadosSalvos = localStorage.getItem("dadosEmpresa");
    if (dadosSalvos) {
        // Se encontrou os dados no localStorage, usa eles para renderizar.
        try {
            const personalizacao = JSON.parse(dadosSalvos);
            renderizarPersonalizacao(personalizacao);
            console.log("Personalização aplicada a partir do localStorage.");
        } catch (error) {
            console.error("Erro ao parsear dados de personalização do localStorage:", error);
            // Se der erro, limpa o item inválido para buscar da API na próxima vez
            localStorage.removeItem("dadosEmpresa");
        }
    } else {
        // Se não encontrou, busca na API.
        console.log("Nenhuma personalização no localStorage. Buscando da API...");
        try {
            const response = await fetch("/api/empresa/configuracao", {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) {
                throw new Error("Erro ao buscar personalização da API");
            }
            const data = await response.json();
            // Salva os novos dados no localStorage para uso futuro
            localStorage.setItem("dadosEmpresa", JSON.stringify(data));
            // Renderiza a personalização com os dados recém-buscados
            renderizarPersonalizacao(data);
        } catch (error) {
            console.error("Falha ao carregar e aplicar personalização:", error);
        }
    }
}
// Substitua a chamada original no seu código por esta.
// A função carregarPersonalizacao agora cuida de tudo.
document.addEventListener("DOMContentLoaded", carregarPersonalizacao);

const loading = document.querySelector(".loading-container");
function mostrarLoading() {
    loading.style.display = "flex";
}
function esconderLoading() {
    loading.style.display = "none";    
}
//Faz com que feche o loading ao voltar para página
window.addEventListener("pageshow", function(){
    esconderLoading();
});

//Máscara para celular
    //Máscara para celular
        //Máscara para celular
function formatarTelefone(valor) {
    const numeros = valor.replace(/\D/g, '').slice(0, 11); // até 11 dígitos
    if (numeros.length === 0) return { mascarado: '', limpo: '' };
    const ddd = numeros.slice(0, 2);
    const primeiro = numeros.slice(2, 3);
    const meioFixo = numeros.slice(2, 6);
    const meioCel = numeros.slice(3, 7);
    const fim = numeros.length > 10 ? numeros.slice(7, 11) : numeros.slice(6, 10);
    let mascarado = '';
    if (numeros.length <= 2) {
    mascarado = `(${ddd}`;
    } else if (numeros.length <= 6) {
    mascarado = `(${ddd}) ${numeros.slice(2)}`;
    } else if (numeros.length <= 10) {
    // Telefone fixo
    mascarado = `(${ddd}) ${meioFixo}-${fim}`;
    } else {
    // Celular com 9 dígitos
    mascarado = `(${ddd}) ${primeiro} ${meioCel}-${fim}`;
    }
    return {mascarado, limpo: numeros};
}
function aplicarMascaraTelefone(input){    
    input.addEventListener('input', function (e) {
        const input = e.target;
        const raw = input.value;
        const cursor = input.selectionStart;
        const numerosAntes = raw.slice(0, cursor).replace(/\D/g, '').length;
        const {mascarado, limpo} = formatarTelefone(raw);
        input.value = mascarado;
        input.setAttribute('data-valor-limpo', limpo);
        // Reposiciona o cursor após aplicar máscara
        let contador = 0, posicao = 0;
        while (contador < numerosAntes && posicao < mascarado.length) {
        if (/\d/.test(mascarado[posicao])) contador++;
        posicao++;
        }
        input.setSelectionRange(posicao, posicao);
    });
}
document.querySelectorAll('.inputsTelefone').forEach(aplicarMascaraTelefone);

function formatarCpfCnpj(valor) {
    const numeros = valor.replace(/\D/g, '').slice(0, 14);
    if (numeros.length <= 11) {
        // CPF
        return numeros
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        // CNPJ
        return numeros
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
}
function aplicarMascaraCpfCnpj(input) {
    input.addEventListener('input', function () {
        const raw = input.value;
        const numeros = raw.replace(/\D/g, '').slice(0, 14);
        const cursor = input.selectionStart;
        const numerosAntes = raw.slice(0, cursor).replace(/\D/g, '').length;
        const novoValor = formatarCpfCnpj(raw);
        input.value = novoValor;
        input.setAttribute('data-valor-limpo', numeros);
    // Reposicionar cursor após formatação
    let contador = 0, posicao = 0;
    while (contador < numerosAntes && posicao < novoValor.length) {
        if (/\d/.test(novoValor[posicao])) contador++;
        posicao++;
    }
    input.setSelectionRange(posicao, posicao);
    });
}
document.querySelectorAll('.inputsCpf').forEach(aplicarMascaraCpfCnpj);

document.getElementById("logoutButton").addEventListener("click", function() {
    // Deleta o cookie do token
    document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // Redireciona para a página inicial
    window.location.href = "/";
});

const popupResposta = document.querySelector(".popupResposta");
function abrirPopupResposta(titulo, mensagem) {
    const titlePopupResposta = popupResposta.querySelector(".titlePopupResposta");
    const msgResposta = popupResposta.querySelector(".msgResposta");
    titlePopupResposta.textContent = titulo;
    msgResposta.textContent = mensagem;
    popupResposta.showModal();
    setTimeout(() => {
        fecharPopupResposta();
    }, 5000);
}
function fecharPopupResposta() {
    esconderLoading();
    popupResposta.close();
}
const popupConfirmacao = document.querySelector(".popupConfirmacao");
function abrirPopupConfirmacao(titulo, mensagem) {
    const titlePopupConfirmacao = document.querySelector(".titlePopupConfirmacao");
    const msgPopupConfirmacao = document.querySelector(".msgPopupConfirmacao");
    titlePopupConfirmacao.textContent = titulo;
    msgPopupConfirmacao.textContent = mensagem;
    popupConfirmacao.showModal();
    // Retornamos uma Promise que "promete" um resultado (true ou false)
    return new Promise((resolve) => {
        const btnConfirmacao = document.querySelector(".btnConfirmacao");
        const btnCancelConfirmacao = document.querySelector(".btnCancelConfirmacao");

        const onConfirm = () => {
            fecharPopupConfirmacao();
            mostrarLoading();
            resolve(true); // Resolve a promessa com 'true'
        };

        const onCancel = () => {
            fecharPopupConfirmacao();
            resolve(false); // Resolve a promessa com 'false'
        };

        // Adicionamos os eventos. O { once: true } é uma boa prática aqui,
        // pois garante que o evento seja acionado apenas uma vez e depois removido automaticamente.
        btnConfirmacao.addEventListener("click", onConfirm, { once: true });
        btnCancelConfirmacao.addEventListener("click", onCancel, { once: true });
    });
}
function fecharPopupConfirmacao() {
    esconderLoading();
    popupConfirmacao.close();
}