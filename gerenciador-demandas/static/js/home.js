// POPUP ADICIONAR DEMANDAS
    // POPUP ADICIONAR DEMANDAS
        // POPUP ADICIONAR DEMANDAS
const containerPopupAddDemanda = document.querySelector(".containerPopupAddDemanda");
const popupAddDemanda = document.querySelector(".contentPopupAddDemanda");
const outrosCampos = document.querySelector("#outrosCampos");
const btnCriar = document.querySelector("#btnCriar");
async function dadosEmpresa() {
    try {
        const response = await fetch("/api/empresa/configuracao", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error("Erro ao buscar personalização");
        }
        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.error("Erro ao aplicar personalização:", error);
        return null;
    }
    
}
let empresaData;
document.addEventListener('DOMContentLoaded', async () => {
    empresaData = await dadosEmpresa();
    if (empresaData) {
        preencherAreas();
    }
});
    


async function abrirPopupAddDemanda() {
    console.log("Dados:",empresaData);
    const inputArea = document.querySelector(".inputArea");
    inputArea.innerHTML = "";
    const areasEmpresa = empresaData.areas;
    const optionInicial = document.createElement("option");
    optionInicial.value = "";
    optionInicial.textContent = "Selecione um tipo de demanda";
    inputArea.appendChild(optionInicial);
    areasEmpresa.forEach(area => {
        const option = document.createElement("option");
        option.value = area.nome_area;
        option.textContent = area.nome_area;
        option.setAttribute("area-id", area.id);
        inputArea.appendChild(option);
    });
    containerPopupAddDemanda.style.display = "flex";
    setTimeout(() => {
        containerPopupAddDemanda.classList.add("ativo");
    }, 10);
    esconderLoading();
}
let arquivosSelecionados = [];

document.getElementById("inputArquivosDemanda").addEventListener("change", function (event) {
    const novosArquivos = Array.from(event.target.files);
    // Adiciona apenas os arquivos que ainda não estão na lista (evita duplicados)
    novosArquivos.forEach(novo => {
        if (!arquivosSelecionados.some(arq => arq.name === novo.name && arq.size === novo.size)) {
            arquivosSelecionados.push(novo);
        }
    });
    atualizarListaVisual();
});
function atualizarListaVisual() {
    console.log(arquivosSelecionados);
    const lista = document.getElementById("listaArquivosSelecionados");
    lista.innerHTML = ""; // limpa a lista antes de recriar
    arquivosSelecionados.forEach((file, index) => {
        const item = document.createElement("li");
        item.textContent = `${index + 1}. ${file.name}`;
        const btnRemover = document.createElement("button");
        btnRemover.textContent = "Remover";
        btnRemover.classList.add("btnRemoverArquivo");
        btnRemover.onclick = function () {
            arquivosSelecionados.splice(index, 1); // remove o item correto
            atualizarListaVisual(); // re-renderiza
        };
        item.appendChild(btnRemover);
        lista.appendChild(item);
    });
}
function limparFormularioDemanda() {
    arquivosSelecionados = [];
    // Reseta o campo de seleção de área para a primeira opção
    document.querySelector('.inputArea').value = '';

    // Desmarca o checkbox "Preencher com meus dados"
    document.querySelector('#usarDadosUsuario').checked = false;

    // Limpa todos os inputs de texto, email e telefone
    document.querySelector('.inputNome').value = '';
    document.querySelector('.inputRepresentante').value = '';
    document.querySelector('.inputEmail').value = '';
    document.querySelector('.inputTelefone').value = '';
    document.querySelector('.inputWhatsapp').value = ''; // Note que este também tem a classe .inputTelefone
    document.querySelector('.inputCNPJ').value = '';

    // Limpa a descrição
    document.querySelector('.inputDescricao').value = '';

    // Limpa o campo de upload de arquivos e a lista visual
    const inputArquivos = document.querySelector('#inputArquivosDemanda');
    if (inputArquivos) {
        inputArquivos.value = ''; // Isso limpa a seleção de arquivos
    }
    document.querySelector('#listaArquivosSelecionados').innerHTML = ''; // Limpa a lista de nomes de arquivos

    // Garante que os campos e o botão voltem a ficar ocultos para a próxima abertura
    document.querySelector('#outrosCampos').classList.add('oculto');
    document.querySelector('#btnCriar').classList.add('oculto');
}
function fecharPopupAddDemanda() {
    limparFormularioDemanda();
    containerPopupAddDemanda.classList.remove("ativo");
    setTimeout(() => {
        containerPopupAddDemanda.style.display = "none";
    }, 300);
}
function mostrarCampos() {
    // Remove a classe "oculto" e ativa a animação de entrada
    outrosCampos.classList.remove("oculto");
    btnCriar.classList.remove("oculto");

    setTimeout(() => {
        outrosCampos.style.opacity = "1";
        outrosCampos.style.transform = "translateY(0)";
        btnCriar.style.opacity = "1";
        btnCriar.style.transform = "translateY(0)";
    }, 10);
}

document.getElementById("logoutButton").addEventListener("click", function() {
    // Deleta o cookie do token
    document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Redireciona para a página inicial
    window.location.href = "/";
});

function updateDonutChart(data){
    const chart = document.querySelector('.donut-chart');
    const legend = document.getElementById('chart-legend');

    chart.innerHTML = ''; // Limpa o gráfico antes de desenhar novamente
    legend.innerHTML = ''; // Limpa a legenda antes de desenhar novamente

    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Se não houver dados, exibe uma mensagem
    if (total === 0) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '50%');
        text.setAttribute('y', '50%');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '0.3em');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '8');
        text.textContent = 'Sem Dados';
        chart.appendChild(text);
        return;
    }

    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    let cumulativeAngle = 0;

    data.forEach(item => {
        if (item.value === 0) return;
        const percentage = item.value / total;
        const arcLength = percentage * circumference;
        const angle = percentage * 360;

        // Cria o segmento do círculo
        const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        segment.setAttribute('class', 'donut-segment');
        segment.setAttribute('cx', 50);
        segment.setAttribute('cy', 50);
        segment.setAttribute('r', radius);
        segment.setAttribute('fill', 'transparent');
        segment.setAttribute('stroke', item.color);
        segment.setAttribute('stroke-width', '10');
        segment.setAttribute('stroke-dasharray', `${arcLength} ${circumference}`);
        segment.style.transform = `rotate(${cumulativeAngle}deg)`;
        chart.appendChild(segment);
        
        // Criar o item da legenda
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color-box" style="background-color: ${item.color};"></div>
            <span class="legend-label">${item.label} (${item.value})</span>
        `;
        legend.appendChild(legendItem);
        cumulativeAngle += angle;
    });
}

function getCookieValue(cookieName) {
    // Separa os cookies individuais
    const cookies = document.cookie.split(';');
    // Procura pelo cookie desejado
    for(let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        // Verifica se este é o cookie que estamos procurando
        if(cookie.startsWith(cookieName + '=')) {
            // Retorna o valor do cookie
            return cookie.substring(cookieName.length + 1);
        }
    }
    // Retorna null se o cookie não for encontrado
    return null;
}
const token = getCookieValue('accessToken');
//lógica para preenchimendo dos dados da demanda com o do usuário logado
const dataNome = document.getElementById("dataNome").value;
const dataRepresentante = document.getElementById("dataRepresentante").value;
const dataEmail = document.getElementById("dataEmail").value;
const dataTelefone = document.getElementById("dataTelefone").value;
const dataWhatsapp = document.getElementById("dataWhatsapp").value;
const datacnpj = document.getElementById("datacnpj").value;

const checkboxUser = document.getElementById("usarDadosUsuario");
const inputNome = document.querySelector(".inputNome");
const inputRepresentante = document.querySelector(".inputRepresentante");
const inputEmail = document.querySelector(".inputEmail");
const inputTelefone = document.querySelector(".inputTelefone");
const inputWhatsapp = document.querySelector(".inputWhatsapp");
const inputCNPJ = document.querySelector(".inputCNPJ");
const descricao = document.querySelector(".inputDescricao");
const inputArea = document.querySelector(".inputArea");

checkboxUser.addEventListener("change", async () => {
    if (checkboxUser.checked) {
        console.log("nome", dataNome, "representante", dataRepresentante, "email", dataEmail, "telefone", dataTelefone, "whatsapp", dataWhatsapp, "cnpj", datacnpj);
        inputNome.value = dataNome;
        inputRepresentante.value = dataRepresentante;
        inputEmail.value = dataEmail;
        inputTelefone.value = dataTelefone;
        inputWhatsapp.value = dataWhatsapp;
        inputCNPJ.value = datacnpj;
    } else {
        // Limpa os campos caso a checkbox seja desmarcada
        inputNome.value = "";
        inputRepresentante.value = "";
        inputEmail.value = "";
        inputTelefone.value = "";
        inputWhatsapp.value = "";
        inputCNPJ.value = "";
    }
});
function enviarArquivosBackend() {
    const input = document.getElementById("inputArquivosDemanda");
    const formData = new FormData();
    for (let i = 0; i < input.files.length; i++) {
        formData.append("arquivos", input.files[i]);
    }
    console.log(input.files);
    try {
        const response = fetch('/api/arquivos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
            })
    .then(response => response.json())
    .then(data => {
        console.log("Arquivos enviados com sucesso:", data);
    })
    } catch (error) {
        console.error(error);
    }
}

//Função responsável pela criação de demandas
async function CriarDemanda() {
    // Lista de todos os campos que precisam ser validados e seus nomes amigáveis
    const camposParaValidar = [
        { elemento: inputNome, nome: "Nome do Cliente" },
        { elemento: inputTelefone, nome: "Telefone" },
        { elemento: inputWhatsapp, nome: "WhatsApp" },
        { elemento: inputCNPJ, nome: "CNPJ" },
        { elemento: descricao, nome: "Descrição" },
        { elemento: inputArea, nome: "Área de Atuação" }
    ];
    // Loop que percorre cada campo da lista
    for (const campo of camposParaValidar) {
        // Verifica se o valor do campo está vazio ou contém apenas espaços em branco
        if (!campo.elemento.value || campo.elemento.value.trim() === '') {
            abrirPopupResposta("Ação interrompida",`Por favor, preencha o campo: "${campo.nome}"`); 
            campo.elemento.focus(); // Foca no campo que precisa ser preenchido
            return; // Interrompe a execução da função
        }
    }

    const selectElement = document.querySelector('.inputArea');
    const selectedIndex = selectElement.selectedIndex;
    const selectedOption = selectElement.options[selectedIndex];
    const areaId = selectedOption.getAttribute('area-id');
    console.log(areaId);

    var valorRepresentante = inputRepresentante.value || "-";
    mostrarLoading();
    try {
        const response = await fetch('/api/demandas', {
            method: 'POST',
            headers: {
            'Content-type':'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            cliente_nome: inputNome.value,
            cliente_representante: valorRepresentante,
            cliente_email: inputEmail.value,
            cliente_telefone: inputTelefone.value,
            cliente_whatsapp: inputWhatsapp.value,
            cliente_cnpj: inputCNPJ.value,
            descricao: descricao.value,
            status: "Em espera",
            id_area: areaId
        })
        });
        if (response.ok) {
            data = await response.json();
            const inputArquivos = document.getElementById("inputArquivosDemanda");
            
            if (inputArquivos.files.length > 0) {
                const formData = new FormData();
                for (let i = 0; i < inputArquivos.files.length; i++) {
                    formData.append("arquivos", inputArquivos.files[i]);
                }
                formData.append("id_demanda",data.id_demanda);
                formData.append("etapa_id",data.etapa_id);
                try {
                    const resultado = fetch('/api/arquivos', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                        })
                } catch (error) {
                    console.error(error);
                }
            } 
            await carregarDemandas();
            esconderLoading();
            fecharPopupAddDemanda();
            abrirPopupResposta("Ação concluída","Demanda criada com sucesso!");  
        }
    } catch(error) {
        console.error(error);
    }
}

async function enviarDemandas() {
    try {
        const response = await fetch("/api/demandas", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await response.json(); // Converte a resposta para JSON
        console.log(data);
        if (!response.ok) {
            throw new Error(`Erro ao buscar demandas: ${response.statusText}`);
        } else {
            return data;
        }
        } catch (error) {
            console.error("Erro ao carregar demandas:", error);
    }
}

// Função auxiliar para criar uma coluna de dados (<div class="columnData"><p>...</p></div>).
function criarColuna(texto) {
    const div = document.createElement('div');
    div.className = 'columnData';
    const p = document.createElement('p');
    p.textContent = texto; 
    div.appendChild(p);
    return div;
}

function criarIconeAcao(classesIcone, demandaId, callback) {
    const div = document.createElement('div');
    div.className = 'columnData';

    const icone = document.createElement('i');
    icone.classList.add(...classesIcone); // Adiciona todas as classes do array
    // Adiciona o evento de clique de forma segura e moderna
    icone.addEventListener('click', () => callback(demandaId));

    div.appendChild(icone);
    return div;
}

function criarCardIdentificacao(demanda) {
    const div = document.createElement('div');
    div.className = 'identificacao';

    const pId = document.createElement('p');
    pId.className = 'idDemanda';
    pId.textContent = `N°: ${demanda.id}`;

    const pNome = document.createElement('p');
    pNome.className = 'nomeDemanda';
    pNome.textContent = demanda.cliente_nome;

    div.appendChild(pId);
    div.appendChild(pNome);

    // Adiciona o evento de clique no card inteiro
    div.addEventListener('click', () => abrirDemanda(demanda.id));

    return div;
}

let demandas = [];
async function carregarDemandas() {
    try {
        const data = await enviarDemandas();
        mostrarLoading();
        // Seleciona o container onde os dados serão preenchidos
        const lineDataContainer = document.querySelector(".columnDataContainer");

        demandas = data.demandas || [];

        // Atualiza os cards de status
        const cardDemandasAtivas = document.getElementById("cardDemandasAtivas");
        const cardDemandasEspera = document.getElementById("cardDemandasEspera");
        const cardDemandasFinalizadas = document.getElementById("cardDemandasFinalizadas");
        const cardDemandasResponsavel = document.getElementById("cardDemandasResponsavel");
        //Limpa os dados dos cards antes de preencher
        document.querySelectorAll(".identificacao").forEach((el) => el.remove());
        // Armazenando as demandas na variável global
        demandas = data.demandas;

        cardDemandasAtivas.innerHTML = '';
        cardDemandasEspera.innerHTML = '';
        cardDemandasFinalizadas.innerHTML = '';
        cardDemandasResponsavel.innerHTML = '';

        const countEspera = demandas.filter(d => d.status_individual === "Em espera").length;
        const countAtiva = demandas.filter(d => d.status_individual === "Ativa").length;
        const countFinalizada = demandas.filter(d => d.status_individual === "Finalizado").length;

        const chartData = [
            { label: 'Em espera', value: countEspera, color: 'yellow' }, 
            { label: 'Ativa', value: countAtiva, color: 'green' },     
            { label: 'Finalizado', value: countFinalizada, color: 'red' } 
        ];
        
        updateDonutChart(chartData);

        // Percorre a lista de demandas e adiciona dinamicamente ao HTML
        demandas.forEach((demanda) => {
            const demandaElement = document.createElement("div");
            demandaElement.classList.add("lineData");
            // Usa as funções auxiliares para criar cada coluna
            demandaElement.appendChild(criarColuna(demanda.id));
            demandaElement.appendChild(criarColuna(demanda.cliente_nome));
            demandaElement.appendChild(criarColuna(demanda.area));
            demandaElement.appendChild(criarColuna(demanda.etapa_atual));
            demandaElement.appendChild(criarColuna(demanda.prazo_etapa));
            demandaElement.appendChild(criarColuna(demanda.responsavel_etapa));
            demandaElement.appendChild(criarColuna(demanda.criado_em));
            demandaElement.appendChild(criarColuna(demanda.status));
            // Cria as colunas de ação com event listeners
            demandaElement.appendChild(criarIconeAcao(['fa-solid', 'fa-eye'], demanda.id, abrirDemanda));
            demandaElement.appendChild(criarIconeAcao(['fa-solid', 'fa-trash'], demanda.id, excluirDemanda));
            lineDataContainer.appendChild(demandaElement);
            // --- 2. Distribuição para os cards de status ---
            const identificacaoCard = criarCardIdentificacao(demanda);
            const identificacaoCardResponsavel = criarCardIdentificacao(demanda);
            if (demanda.status_individual === "Em espera") {
                cardDemandasEspera.appendChild(identificacaoCard);
            } else if (demanda.status_individual === "Ativa") {
                cardDemandasAtivas.appendChild(identificacaoCard);
            } else if (demanda.status_individual === "Finalizado") {
                cardDemandasFinalizadas.appendChild(identificacaoCard);
            }
            const setoresCurrentUser = demanda.setores_ids;
            const userAdm = (document.getElementById("userAdm").value === "True");
            // Mostra o container se o usuário for Admin OU for gestor de QUALQUER setor
            const isGestorQualquerSetor = setoresCurrentUser.some(setor => setor[1] === true);
            const containerCardResponsavelGestores = document.getElementById('containerCardResponsavelGestores');
            if (userAdm || isGestorQualquerSetor) {
                containerCardResponsavelGestores.style.display = 'flex';
            } else {
                containerCardResponsavelGestores.style.display = 'none';
            }
            // 1. Verifica se o usuário é gestor DO SETOR específico desta etapa
            const isGestorThisSetor = setoresCurrentUser.some(setor => setor[0] === demanda.setor_id_etapa_atual && setor[1] === true);
            // 2. Condições para adicionar ao card:
            //    - A etapa DEVE estar sem responsável ("N/A")
            //    - E (O usuário é Admin OU ele é gestor deste setor específico)
            if (demanda.responsavel_etapa === "N/A" && (userAdm || isGestorThisSetor)) {
                const identificacaoCardResponsavel = criarCardIdentificacao(demanda);
                cardDemandasResponsavel.appendChild(identificacaoCardResponsavel);
            }
        });
        // Aplica filtros e renderiza a tabela
        aplicarFiltro(demandas);
        esconderLoading();
    } catch (error) {
        console.error("Falha ao carregar as demandas:", error);
        esconderLoading(); // Garante que o loading suma mesmo em caso de erro
    }
}
// Chama a função assim que a página carregar
document.addEventListener("DOMContentLoaded", carregarDemandas);

//FUNÇÃO PARA EXCLUIR DEMANDA
async function excluirDemanda(demandaId) {
    const userAdm = document.getElementById("userAdm").value;
    if (userAdm == "True") {
        const confirmacao = await abrirPopupConfirmacao("Excluir Demanda", "Tem certeza que deseja excluir esta demanda? Esta ação não poderá ser desfeita.");
        console.log(confirmacao);
        if (confirmacao) {
            try {
                const response = await fetch(`/api/demandas/${demandaId}`, {
                    method: "DELETE",
                });
                if (response.ok) {
                    await carregarDemandas();
                    esconderLoading();
                    abrirPopupResposta("Ação concluída","Demanda excluida com sucesso!");
                }
            } catch(error) {
                console.error(error);
                abrirPopupResposta("Ação interrompida","Falha ao excluir a demanda.");
            }
        } else {
            // Caso o usuário cancele
            abrirPopupResposta("Ação interrompida","Exclusão cancelada.");
        }
    } else {
        abrirPopupResposta("Ação interrompida","A demanda só pode ser excluída por admnistradores.");
    }
    
}

//Lógica de filtros
    //Lógica de filtros
        //Lógica de filtros
async function preencherAreas() {
    const dropdownArea = document.getElementById("dropdownArea");
    dropdownArea.innerHTML = "";
    const areas = empresaData.areas;
    const optionNenhuma = document.createElement("div");
    optionNenhuma.classList.add("option");
    optionNenhuma.textContent = "Nenhum";
    optionNenhuma.setAttribute("onclick", `selectOption('Nenhum', 'dropdownArea')`);
    dropdownArea.appendChild(optionNenhuma);
    areas.forEach(area => {
        const option = document.createElement("div");
        option.classList.add("option");
        option.textContent = area.nome_area;
        option.setAttribute("onclick", `selectOption('${area.nome_area}', 'dropdownArea')`);
        dropdownArea.appendChild(option);
    });
}

// função responsável por fazer a div virar select
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

// Fecha dropdowns ao clicar fora
document.addEventListener("click", function (event) {
    document.querySelectorAll(".dropdown-content").forEach((dropdown) => {
        if (!dropdown.parentElement.contains(event.target)) {
            dropdown.style.display = "none";
        }
    });
});

let filtrosSelecionados = {
    area: "",
    data: "",  // "Recente" ou "Distante"
    etapa: ""
};

function aplicarFiltro(demandas) {
    const container = document.querySelector(".columnDataContainer");
    container.innerHTML = ""; // Limpa a tabela antes de aplicar os filtros
    // Filtra as demandas conforme os filtros selecionados
    let linhas = demandas.filter(demanda => {
        const area = demanda.area;
        const etapa = demanda.status;
        // Verifica se tem algum filtro selecionado, se houver passam as demandas específicas, se não houver passa todas
        // Filtro de Área
        const filtrarArea = !filtrosSelecionados.area || filtrosSelecionados.area === area;
        // Filtro de Etapa
        const filtrarEtapa = !filtrosSelecionados.etapa || filtrosSelecionados.etapa === etapa;
        return filtrarArea && filtrarEtapa;
    });

    // Ordenação pelo ID, evitando cálculos com datas
    //.sort() tem a função de ordenar os valores 
    if (filtrosSelecionados.data === "Recente") {
        linhas.sort((a, b) => b.id - a.id); // Maior ID primeiro (mais recente)
    } else if (filtrosSelecionados.data === "Distante") {
        linhas.sort((a, b) => a.id - b.id); // Menor ID primeiro (mais antigo)
    }

    // Adiciona os elementos filtrados ao HTML
    //.lenmgth retorna o número de elementos ou carcteres, no caso de elementos
    if (linhas.length > 0) {
        linhas.forEach(linha => {
            const demandaElement = document.createElement("div");
            demandaElement.classList.add("lineData");
            demandaElement.innerHTML = `
                <div class="columnData"><p>${linha.id}</p></div>
                <div class="columnData"><p>${linha.cliente_nome}</p></div>
                <div class="columnData"><p>${linha.area}</p></div>
                <div class="columnData"><p>${linha.etapa_atual}</p></div>
                <div class="columnData"><p>${linha.prazo_etapa}</p></div>
                <div class="columnData"><p>${linha.responsavel_etapa}</p></div> 
                <div class="columnData"><p>${linha.criado_em}</p></div>
                <div class="columnData"><p>${linha.status}</p></div>
                <div class="columnData">
                    <i class="fa-solid fa-eye" onclick="abrirDemanda(${linha.id})"></i>
                </div>
                <div class="columnData">
                    <i class="fa-solid fa-trash" onclick="excluirDemanda(${linha.id})"></i>                
                </div>
            `;
            container.appendChild(demandaElement);
        });
    } else {
        container.innerHTML = "<p>Não há dados disponíveis para o filtro selecionado.</p>";
    }
}
// Função para selecionar a opção do filtro
function selectOption(value, dropdownId) {
    // Atualiza o filtro correspondente
    if (value === "Nenhum") {
        // Resetando todos os filtros para os valores padrão
        filtrosSelecionados.area = "";
        filtrosSelecionados.data = "";
        filtrosSelecionados.etapa = "";
        carregarDemandas();
    } else {
        // Atualiza o filtro correspondente, sem resetar os outros filtros
        if (dropdownId === "dropdownArea") {//Identifica qual dropdown foi alterado e atualiza apenas esse filtro
            filtrosSelecionados.area = value; //atualiza os resultados filtrados
        } else if (dropdownId === "dropdownData") {
            filtrosSelecionados.data = value;
        } else if (dropdownId === "dropdownEtapa") {
            filtrosSelecionados.etapa = value;
        }
        aplicarFiltro(demandas); // Chama a função para aplicar o filtro após a seleção
    }

    document.getElementById(dropdownId).style.display = "none"; //fecha o dropdown
}
//Função responsável por ordenar as demandas de acordo com nome e id
function filtrarPesquisa() {
    const termo = document.querySelector(".inputSearch").value.trim().toLowerCase();

    let demandasFiltradas = demandas.filter(demanda => {
        const nomeCliente = demanda.cliente_nome.toLowerCase();
        const idDemanda = demanda.id.toString();
        return nomeCliente.includes(termo) || idDemanda.includes(termo);
    });

    aplicarFiltro(demandasFiltradas);
}

function renderizarTabela(demandasParaRenderizar) {
    const container = document.querySelector(".columnDataContainer");
    container.innerHTML = ""; // Limpa a tabela

    if (demandasParaRenderizar.length > 0) {
        demandasParaRenderizar.forEach(demanda => {
            const demandaElement = document.createElement("div");
            demandaElement.classList.add("lineData");     
            demandaElement.innerHTML = `
                <div class="columnData"><p>${linha.id}</p></div>
                <div class="columnData"><p>${linha.cliente_nome}</p></div>
                <div class="columnData"><p>${linha.area}</p></div>
                <div class="columnData"><p>${linha.etapa_atual}</p></div>
                <div class="columnData"><p>${linha.prazo_etapa}</p></div>
                <div class="columnData"><p>${linha.responsavel_etapa}</p></div>
                <div class="columnData"><p>${linha.criado_em}</p></div>
                <div class="columnData"><p>${linha.status}</p></div>
                <div class="columnData">
                    <i class="fa-solid fa-eye" onclick="abrirDemanda(${linha.id})"></i>
                </div>
                <div class="columnData">
                    <i class="fa-solid fa-trash" onclick="excluirDemanda(${linha.id})"></i>                
                </div>
            `;
            container.appendChild(demandaElement);
        });
    } else {
        container.innerHTML = "<p>Não há dados disponíveis para os filtros selecionados.</p>";
    }
}
//Aplicação de máscaras
document.querySelectorAll(".inputTelefone").forEach(aplicarMascaraTelefone);
document.querySelectorAll('.inputCNPJ').forEach(aplicarMascaraCpfCnpj);
