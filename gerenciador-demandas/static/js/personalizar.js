//Mudanca de fundo do gerenciador
const colorOptions = document.getElementById('colorOptions');
const hiddenInput = document.getElementById('selectedColor');

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
colorOptions.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
        // Remove seleção anterior
        colorOptions.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        // Adiciona seleção atual
        option.classList.add('selected');
        // Atualiza valor oculto
        hiddenInput.value = option.getAttribute('data-value');
        const valorInputCores = hiddenInput.value;
        if (valorInputCores == 1) {
            document.documentElement.style.setProperty('--fundoGerenciador', "url('/static/img/fundoGerenciador.jpg')");
            document.documentElement.style.setProperty('--corPrincipal', "#242f4d");
            document.documentElement.style.setProperty('--corSecundaria', "#B89A5F");
            document.documentElement.style.setProperty('--sombraSecundaria', "#826c41");
        } else if(valorInputCores == 2) {
            document.documentElement.style.setProperty('--fundoGerenciador', "url('/static/img/fundoGerenciadorBrown.jpg')");
            document.documentElement.style.setProperty('--corPrincipal', "#492D1A");
            document.documentElement.style.setProperty('--corSecundaria', "#FEF9EF");
            document.documentElement.style.setProperty('--sombraSecundaria', "#a19f9a");
        } else if (valorInputCores == 3) {
            document.documentElement.style.setProperty('--fundoGerenciador', "url('/static/img/fundoGerenciadorBranco.jpg')");
            document.documentElement.style.setProperty('--corPrincipal', "#610a16ff");
            document.documentElement.style.setProperty('--corSecundaria', "#88693bff");
            document.documentElement.style.setProperty('--sombraSecundaria', "#a19f9a");
        } else if (valorInputCores == 4) {
            document.documentElement.style.setProperty('--fundoGerenciador', "url('/static/img/fundoGenrenciadorGreen.png')");
            document.documentElement.style.setProperty('--corPrincipal', "#113c25");
            document.documentElement.style.setProperty('--corSecundaria', "#B89A5F");
            document.documentElement.style.setProperty('--sombraSecundaria', "#a19f9a");
        }
    });
});

document.querySelector('.logoEmpresa').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const iframe = document.querySelector('.logoPreview');
    if (file) {
        const fileURL = URL.createObjectURL(file);
        iframe.src = fileURL;
    } else {
        iframe.src = "";
    }
});
// Sombras em cada etapa de personalização
const boxCores = document.querySelector('.containerBoxCores');
const boxSetores = document.querySelector('.containerBoxSetores');
const boxAreas = document.querySelector('.containerBoxAreas');
const boxAdm = document.querySelector('.containerBoxAdm');
const cores = document.getElementById('cores');
cores.classList.add('etapaAtual');
// Cores para Setores (Deslizamento para a direita)
document.querySelector('.btnCorParaSetor').addEventListener('click', function(){
    boxCores.style.animation = "slideOutLeft 0.5s forwards";
    setTimeout(() => {
        boxCores.style.display = "none";
        boxSetores.style.display = "flex";
        boxSetores.style.animation = "slideInRight 0.5s forwards";
    }, 500);
    const setores = document.getElementById('setores');
    setores.classList.add('etapaAtual');
});
// Voltando de setores para cores (Deslizamento para a esquerda)
document.querySelector('.btnSetorParaCores').addEventListener('click', function(){
    boxSetores.style.animation = "slideOutRight 0.5s forwards";
    setTimeout(() => {
        boxSetores.style.display = "none";
        boxCores.style.display = "flex";
        boxCores.style.animation = "slideInLeft 0.5s forwards";
    }, 500);
    const setores = document.getElementById('setores');
    setores.classList.remove('etapaAtual');
});
// Setores para Areas (Deslizamento para a direita)
document.querySelector('.btnSetorParaAreas').addEventListener('click', function(){
    boxSetores.style.animation = "slideOutLeft 0.5s forwards";
    setTimeout(() => {
        boxSetores.style.display = "none";
        boxAreas.style.display = "flex";
        boxAreas.style.animation = "slideInRight 0.5s forwards";
    }, 500);
    const areas = document.getElementById('areas');
    areas.classList.add('etapaAtual');
});
// Voltando de areas para setores (Deslizamento para a esquerda)
document.querySelector('.btnAreaParaSetor').addEventListener('click', function(){
    boxAreas.style.animation = "slideOutRight 0.5s forwards";
    setTimeout(() => {
        boxAreas.style.display = "none";
        boxSetores.style.display = "flex";
        boxSetores.style.animation = "slideInLeft 0.5s forwards";
    }, 500);
    const areas = document.getElementById('areas');
    areas.classList.remove('etapaAtual');
});
document.querySelector('.btnSetorParaAreas').addEventListener('click', function(){
    boxSetores.style.animation = "slideOutLeft 0.5s forwards";
    setTimeout(() => {
        boxSetores.style.display = "none";
        boxAreas.style.display = "flex";
        boxAreas.style.animation = "slideInRight 0.5s forwards";
    }, 500);
    const areas = document.getElementById('areas');
    areas.classList.add('etapaAtual');
});
//De áreas para personalização do admnistrador
document.querySelector('.btnAreaParaAdm').addEventListener('click', function(){
    boxAreas.style.animation = "slideOutLeft 0.5s forwards";
    setTimeout(() => {
        boxAreas.style.display = "none";
        boxAdm.style.display = "flex";
        boxAdm.style.animation = "slideInRight 0.5s forwards";
    }, 500);
    const admnistrador = document.getElementById('admnistrador');
    admnistrador.classList.add('etapaAtual');
});
document.querySelector('.btnAdmParaArea').addEventListener('click', function(){
    boxAdm.style.animation = "slideOutRight 0.5s forwards";
    setTimeout(() => {
        boxAdm.style.display = "none";
        boxAreas.style.display = "flex";
        boxAreas.style.animation = "slideInLeft 0.5s forwards";
    }, 500);
    const admnistrador = document.getElementById('admnistrador');
    admnistrador.classList.remove('etapaAtual');
});

//Adição de setores
function addSetor() {
    const containerSetores = document.querySelector(".containerTableSetores");
    // Captura os valores já existentes
    const setoresExistentes = Array.from(document.querySelectorAll(".inputSetor"))
        .map(input => input.value.trim().toLowerCase())
        .filter(v => v); // ignora vazios
    // Cria o novo input para o setor
    const newInput = document.createElement("input");
    newInput.type = "text";
    newInput.classList.add("inputSetor");
    newInput.focus();
    // Evento de validação ao sair do campo
    newInput.addEventListener("blur", () => {
        const valorDigitado = newInput.value.trim().toLowerCase();
        if (!valorDigitado) return;
        const setoresAtualizados = Array.from(document.querySelectorAll(".inputSetor"))
            .filter(input => input !== newInput)
            .map(input => input.value.trim().toLowerCase());
        if (setoresAtualizados.includes(valorDigitado)) {
            abrirPopupResposta("Ação interrompida","Este setor já foi adicionado.");
            newInput.value = "";
            newInput.focus();
        } else {
            atualizarSelectsDeSetores(); // Atualiza selects apenas quando valor válido
        }
    });
    const newSetor = document.createElement("div");
    newSetor.classList.add("setor");

    const newText = document.createElement("p");
    newText.innerText = "Setor:";

    const newIcon = document.createElement("i");
    newIcon.classList.add("fa-solid", "fa-trash");
    newIcon.addEventListener("click", () => {
        removeSetor(newSetor);
    });
    newSetor.appendChild(newText);
    newSetor.appendChild(newInput);
    newSetor.appendChild(newIcon);
    containerSetores.appendChild(newSetor);
}
function removeSetor(setor) {
    const containerSetores = document.querySelector(".containerTableSetores");
    containerSetores.removeChild(setor);
}
function atualizarSelectsDeSetores() {
    const setores = Array.from(document.querySelectorAll('.inputSetor'))
        .map(input => input.value.trim())
        .filter((value, index, self) => value && self.indexOf(value) === index); // únicos e não vazios

    const selects = document.querySelectorAll('.selectSetor');

    selects.forEach(select => {
        const valorAtual = select.value; // tenta manter valor já selecionado
        select.innerHTML = '';
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Selecione o setor';
        option.selected = true;
        select.appendChild(option);

        setores.forEach(setor => {
            const option = document.createElement('option');
            option.value = setor;
            option.textContent = setor;
            select.appendChild(option);
        });

        // Restaura valor se ainda existir
        if (setores.includes(valorAtual)) {
            select.value = valorAtual;
        }
    });
}

//Funções para adicionar e remover áreas e etapas
function addArea() {
    const containerAreas = document.querySelector(".boxAreas");

    const newDetails = document.createElement("details");
    newDetails.classList.add("detailsArea");
    newDetails.open = false;

    const newSummary = document.createElement("summary");

    const divSummary = document.createElement("div");
    divSummary.classList.add("containerAddArea");

    const containerNomeArea = document.createElement("div");
    containerNomeArea.classList.add("containerNomeArea");

    const pTipoDemanda = document.createElement("p");
    pTipoDemanda.textContent = "Tipo de demanda:";
    containerNomeArea.appendChild(pTipoDemanda);

    const inputArea = document.createElement("input");
    inputArea.type = "text";
    inputArea.classList.add("inputArea");
    // Validação para impedir nomes duplicados
    inputArea.addEventListener("blur", () => {
        const valorDigitado = inputArea.value.trim().toLowerCase();
        if (!valorDigitado) return;
        const nomesExistentes = Array.from(document.querySelectorAll(".inputArea"))
            .filter(input => input !== inputArea)
            .map(input => input.value.trim().toLowerCase());
        if (nomesExistentes.includes(valorDigitado)) {
            abrirPopupResposta("Ação interrompida","Este nome de área já foi usado.");
            inputArea.value = "";
            inputArea.focus();
        }
    });

    containerNomeArea.appendChild(inputArea);

    const iconMinus = document.createElement("i");
    iconMinus.classList.add("fa-solid", "fa-circle-minus", "iconMinusArea");
    iconMinus.addEventListener("click", () => {
        removeArea(newDetails);
    });
    containerNomeArea.appendChild(iconMinus);

    divSummary.appendChild(containerNomeArea);

    const iconChevron = document.createElement("i");
    iconChevron.classList.add("fa-solid", "fa-chevron-down", "iconChevron");

    newSummary.addEventListener("click", e => e.preventDefault());
    iconChevron.addEventListener("click", e => {
        e.stopPropagation();
        newDetails.open;
    });

    newSummary.appendChild(divSummary);
    newSummary.appendChild(iconChevron);
    newDetails.appendChild(newSummary);

    const containerEtapas = document.createElement("div");
    containerEtapas.classList.add("containerEtapasDemanda");

    const botaoAdicionarEtapa = document.createElement("button");
    botaoAdicionarEtapa.classList.add("addEtapa");
    botaoAdicionarEtapa.textContent = "Adicionar Etapa +";
    const etapa = document.createElement("div");
    etapa.classList.add("etapaDemandaCriacao");

    const nomeEtapa = document.createElement("div");
    nomeEtapa.classList.add("nomeEtapa");
    nomeEtapa.innerText = "Nome da etapa:";
    const inputEtapa = document.createElement("input");
    inputEtapa.value = "Criação de demanda";
    inputEtapa.disabled = true;
    inputEtapa.type = "text";
    inputEtapa.classList.add("inputEtapa");
    nomeEtapa.appendChild(inputEtapa);
    etapa.appendChild(nomeEtapa);

    const etapaValidacao = document.createElement("div");
    etapaValidacao.classList.add("etapaValidacao");
    etapaValidacao.innerText = "Validação:";

    const labelValidacao = document.createElement("label");
    labelValidacao.classList.add("checkbox-wrapper");

    const inputValidacao = document.createElement("input");
    inputValidacao.type = "checkbox";
    inputValidacao.classList.add("inputValidacao");

    const spanValidacao = document.createElement("span");
    spanValidacao.classList.add("custom-checkbox");

    labelValidacao.appendChild(inputValidacao);
    labelValidacao.appendChild(spanValidacao);
    etapaValidacao.appendChild(labelValidacao);
    etapa.appendChild(etapaValidacao);

    botaoAdicionarEtapa.addEventListener("click", () => {
        const novaEtapa = createEtapa();
        containerEtapas.appendChild(novaEtapa);
        atualizarSelectsDeSetores();
    });

    containerEtapas.appendChild(botaoAdicionarEtapa);
    containerEtapas.appendChild(etapa);
    containerEtapas.appendChild(createEtapa());

    newDetails.appendChild(containerEtapas);
    containerAreas.appendChild(newDetails);
    atualizarSelectsDeSetores();
}
const addEtapa = document.querySelector(".addEtapa");
addEtapa.addEventListener("click", () => {
    const containerEtapas = document.querySelector(".containerEtapasDemanda");
    containerEtapas.appendChild(createEtapa());
    atualizarSelectsDeSetores();
});

function createEtapa() {
    const etapa = document.createElement("div");
    etapa.classList.add("etapaDemanda");

    const nomeEtapa = document.createElement("div");
    nomeEtapa.classList.add("nomeEtapa");
    nomeEtapa.innerText = "Nome da etapa:";
    const inputEtapa = document.createElement("input");
    inputEtapa.type = "text";
    inputEtapa.classList.add("inputEtapa");
    nomeEtapa.appendChild(inputEtapa);
    etapa.appendChild(nomeEtapa);

    const setorEtapa = document.createElement("div");
    setorEtapa.classList.add("setorEtapa");
    setorEtapa.innerText = "Setor:";

    const selectSetor = document.createElement("select");
    selectSetor.classList.add("selectSetor");

    const defaultOption = document.createElement("option");
    defaultOption.value = ""; // Valor vazio para a opção padrão
    defaultOption.textContent = "Selecione o setor";
    defaultOption.selected = true; // Define como selecionada
    defaultOption.disabled = true; // Opcional: impede o usuário de selecionar essa opção novamente
    selectSetor.appendChild(defaultOption);

    const setoresAtuais = Array.from(document.querySelectorAll('.inputSetor'))
        .map(input => input.value.trim())
        .filter((v, i, arr) => v && arr.indexOf(v) === i);

    setoresAtuais.forEach(setor => {
        const option = document.createElement("option");
        option.value = setor;
        option.textContent = setor;
        selectSetor.appendChild(option);
    });

    setorEtapa.appendChild(selectSetor);
    etapa.appendChild(setorEtapa);

    const etapaValidacao = document.createElement("div");
    etapaValidacao.classList.add("etapaValidacao");
    etapaValidacao.innerText = "Validação:";

    const labelValidacao = document.createElement("label");
    labelValidacao.classList.add("checkbox-wrapper");

    const inputValidacao = document.createElement("input");
    inputValidacao.type = "checkbox";
    inputValidacao.classList.add("inputValidacao");

    const spanValidacao = document.createElement("span");
    spanValidacao.classList.add("custom-checkbox");

    labelValidacao.appendChild(inputValidacao);
    labelValidacao.appendChild(spanValidacao);
    etapaValidacao.appendChild(labelValidacao);
    etapa.appendChild(etapaValidacao);

    const etapaIconMinus = document.createElement("i");
    etapaIconMinus.classList.add("fa-solid", "fa-circle-minus");
    etapaIconMinus.addEventListener("click", () => {
        etapa.remove();
    });
    etapa.appendChild(etapaIconMinus);

    return etapa;
}

function removeArea(area) {
    const containerAreas = document.querySelector(".boxAreas");
    containerAreas.removeChild(area);
}

function preencherSetoresAdm() {
    const setores = Array.from(document.querySelectorAll('.inputSetor'))
    .map(input => input.value.trim())
    .filter((value, index, self) => value && self.indexOf(value) === index); // únicos e não vazios
    console.log(setores);
    const containerSetoresAdm = document.querySelector('.containerSetores');
    containerSetoresAdm.innerHTML = '';
    setores.forEach(setor => {
        // 1. Criar os elementos HTML
        const divPai = document.createElement('div');
        const paragrafo = document.createElement('p');
        const label = document.createElement('label');
        const input = document.createElement('input');
        const span = document.createElement('span');

        // 2. Configurar as classes e atributos
        divPai.classList.add('opcaoSetor');

        paragrafo.classList.add('nomeSetor');
        paragrafo.textContent = setor; // Usar textContent é mais seguro

        label.classList.add('checkbox-wrapper');

        input.type = 'checkbox'; // Define o tipo do input
        input.classList.add('inputSetorAdm');

        span.classList.add('custom-checkbox');

        // 3. Montar a hierarquia (aninhando os elementos)
        // Adiciona o input e o span dentro do label
        label.appendChild(input);
        label.appendChild(span);

        // Adiciona o parágrafo e o label dentro da div principal
        divPai.appendChild(paragrafo);
        divPai.appendChild(label);
        containerSetoresAdm.appendChild(divPai);
    });
}

//Função para captar todas as respostas do usuário e enviar para o backend
document.querySelector('.btnAdmParaLogin').addEventListener('click', async function () {
    mostrarLoading();
    const resultados = [];

    // Nome da empresa
    const nomeEmpresa = document.querySelector('.nomeEmpresa').value.trim();
    if (nomeEmpresa) {
        resultados.push({ nomeEmpresa: nomeEmpresa });
    }

    // Logo da empresa (apenas o nome do arquivo, por exemplo)
    const logoInput = document.querySelector('.logoEmpresa');
    const arquivoLogo = logoInput.files[0];

    // Cor selecionada
    const corSelecionada = document.getElementById('selectedColor').value;
    resultados.push({ cod_cor: corSelecionada });

    // Setores
    const setores = [];
    document.querySelectorAll('.inputSetor').forEach(input => {
        const setor = input.value.trim();
        if (setor) {
            setores.push(setor);
        }
    });
    resultados.push({ setores: setores });

    // Áreas e etapas
    const areas = [];
    document.querySelectorAll('.detailsArea').forEach(areaEl => {
        const nomeArea = areaEl.querySelector('.inputArea')?.value.trim();
        if (!nomeArea) return;

        const etapas = [];
        areaEl.querySelectorAll('.etapaDemanda').forEach(etapaEl => {
            const nomeEtapa = etapaEl.querySelector('.inputEtapa')?.value.trim();
            const setor = etapaEl.querySelector('.selectSetor')?.value;
            const validacao = etapaEl.querySelector('.inputValidacao')?.checked;

            if (nomeEtapa && setor) {
                etapas.push({
                    nomeEtapa,
                    setor,
                    validacao
                });
            }
        });

        areas.push({
            nomeArea,
            etapas
        });
    });
    resultados.push({ areas: areas });

    const nomeAdm = document.getElementById("nomeAdm").value;
    const emailAdm = document.getElementById("email").value;
    const telefone = document.getElementById("telefone").value;
    const whatsapp = document.getElementById("whatsapp").value;
    const setoresAdmSelecionados = [];
    // Seleciona todos os checkboxes de setor do admin que estão MARCADOS
    document.querySelectorAll('.inputSetorAdm:checked').forEach(checkbox => {
        // A partir do checkbox, encontra o elemento 'div' pai mais próximo
        const divPai = checkbox.closest('.opcaoSetor');
        // Dentro desse pai, encontra o parágrafo com o nome do setor
        const nomeSetor = divPai.querySelector('.nomeSetor').textContent;
        setoresAdmSelecionados.push(nomeSetor);
    });
    resultados.push({ nomeAdm: nomeAdm, emailAdm: emailAdm, telefone: telefone, whatsapp: whatsapp, setoresAdm: setoresAdmSelecionados });

    // Exibir no console (pode ser substituído por um envio ao backend)
    console.log(resultados);

const formData = new FormData();
formData.append("dados", JSON.stringify(resultados)); // Envia os dados como string JSON
formData.append("imagem", arquivoLogo); // `arquivo` é o objeto File da imagem
    try {
        const response = await fetch('/api/empresas/personalizadas', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
            if (response.ok) {
                abrirPopupResposta("Ação concluída","Personalização enviada com sucesso");
                esconderLoading();
                window.location.href = ("/");
            } else {
                console.error("Erro no envio:", await response.text());
            }
    } catch (error) {
        console.error("Erro no envio:", error);
    }
});


