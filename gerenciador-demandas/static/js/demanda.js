const demandaId = document.getElementById("idDemanda").value;
const currentUserId = document.getElementById("currentUserId").value;
const currentUserNome = document.getElementById("currentUserName").value;

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

async function carregarDemanda(demandaId) {
    try {
        const response = await fetch(`/api/demandas/${demandaId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }
        const data = await response.json();  
        return data;
    }
    catch(error) {
        console.error(error);
    }
}

const containerDetails = document.querySelector(".containerDetails");
async function preencherDemanda(demandaId) {
    mostrarLoading();
    const data = await carregarDemanda(demandaId);
        //Preenchimento de dados
        document.getElementById("nomeDemanda").textContent = data.demanda.cliente_nome;
        document.getElementById("nomeDemanda").title = data.demanda.cliente_nome;
        document.getElementById("numDemanda").textContent = data.demanda.id;
        document.getElementById("telefoneContato").value = data.demanda.cliente_telefone;
        document.getElementById("emailContato").value = data.demanda.cliente_email;
        document.getElementById("emailContato").title = data.demanda.cliente_email;
        document.getElementById("registroContato").value = data.demanda.registro_cliente;
        document.getElementById("whatsAppContato").value = data.demanda.cliente_whatsapp;
        document.getElementById("descricao").textContent = data.demanda.descricao;
        document.getElementById("criador").textContent = data.demanda.criado_por;
        document.getElementById("dataCriacao").textContent = data.demanda.criado_em;
        document.getElementById("tipoDemanda").textContent = data.demanda.nome_area;
        document.getElementById("dataAtualizacao").textContent = data.demanda.cliente_representante;
        
        //Preenchimento da lista com os documentos da demanda
        const containerListaDocumentos = document.querySelector(".containerListaDocumentos");
        containerListaDocumentos.innerHTML = '';
        const listaDocumentos = data.demanda.documentos_demanda;
        listaDocumentos.forEach(documentos => {
            if (documentos.length > 0) {
                documentos.forEach(documento => {
                    // Cria o elemento <div> principal
                    const divElemento = document.createElement('div');
                    divElemento.addEventListener('click', () => baixarArquivo(documento.id));
                    // Cria o elemento <i> para o ícone
                    const iconeElemento = document.createElement('i');
                    // Cria o elemento <p> para o nome do documento
                    const pElemento = document.createElement('p');
                    // --- Passo 2: Configurar os elementos (classes e conteúdo) ---
                    // Adiciona a classe 'documentoElement' à div
                    divElemento.classList.add('documentoElement');
                    // Adiciona as classes do Font Awesome ao ícone
                    // .classList.add() pode receber múltiplos argumentos
                    iconeElemento.classList.add('fa-solid', 'fa-file-lines');
                    // Adiciona a classe 'nomeDocumento' ao parágrafo
                    pElemento.classList.add('nomeDocumento');
                    // Define o conteúdo de texto do parágrafo
                    pElemento.textContent = documento.nome_arquivo;
                    // --- Passo 3: Montar a estrutura aninhando os elementos ---
                    // Adiciona o <i> como filho da <div>
                    divElemento.appendChild(iconeElemento);
                    // Adiciona o <p> como filho da <div>
                    divElemento.appendChild(pElemento);
                    // --- Passo 4: Adicionar o elemento criado à página ---
                    containerListaDocumentos.appendChild(divElemento);
                })
            }
        });

        const etapas = data.demanda.etapas;
        containerDetails.innerHTML = ''
        const etapasFiltradas = etapas.filter(etapa => etapa.DemandaId == demandaId);
        arquivosSelecionadosPorEtapa = {};
        
        etapasFiltradas.forEach((etapa) => {
            // Usa a nova função para criar o elemento da etapa
            const elementoEtapa = renderizarEtapa(etapa, data);
            containerDetails.appendChild(elementoEtapa);
        });
        configurarEventosInputs();       
        
        //LÓGICA PARA EDIÇÃO DE INFORMAÇÕES DA DEMANDA
        const currentUserAdm = document.getElementById('currentUserAdm').value;
        const nomeCriador = document.getElementById('criador').textContent;
        
        if (currentUserAdm === "True" || nomeCriador === currentUserNome) {
            async function editarDemanda(demanda_id) {
                const telefone_cliente = document.getElementById("telefoneContato").value;
                const email_cliente = document.getElementById("emailContato").value;
                const registro_cliente = document.getElementById("registroContato").value;
                const whatsapp_cliente = document.getElementById("whatsAppContato").value;
                const descricao = document.getElementById("descricao").value;
                console.log(telefone_cliente, email_cliente, registro_cliente, whatsapp_cliente, descricao)
                try {
                    // --- ETAPA 1: Atualizar os dados textuais da etapa ---
                    const response = await fetch(`/api/demandas/${demanda_id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            "descricao": descricao,
                            "telefone_cliente": telefone_cliente,
                            "email_cliente": email_cliente,
                            "registro_cliente": registro_cliente,
                            "whatsapp_cliente": whatsapp_cliente
                        })
                    });
                    if (response.ok) {
                        abrirPopupResposta("Ação concluída", "Demanda atualizada com sucesso.");
                    }
                } catch (error) {
                    // O bloco catch captura qualquer erro lançado no bloco try
                    console.error(error);
                    abrirPopupResposta("Ação interrompida", `Tente novamente mais tarde.`);
                }
            }
        
            // 1. Seleciona todos os ícones de edição
            const editIcons = document.querySelectorAll('.edit-btn');
            // 2. Itera sobre cada ícone encontrado
            editIcons.forEach(icon => {
                icon.style.setProperty('display', 'block', 'important');
                // 3. Adiciona um "ouvinte" para o evento de clique em cada ícone
                icon.addEventListener('click', async () => {
                    // 4. Encontra o elemento <input> que vem imediatamente antes do ícone
                    const inputField = icon.previousElementSibling;
                    // 5. Remove o atributo 'disabled' e foca no campo
                    if (inputField && inputField.tagName === 'INPUT') {
                        if (icon.classList.contains('fa-pen-to-square')) {
                            // MODO DE EDIÇÃO ATIVADO
                            // Habilita o campo de input
                            inputField.disabled = false;
                            // Foca no campo para digitação imediata
                            inputField.focus();
                            // Remove o ícone de edição e adiciona o de check
                            icon.classList.remove('fa-pen-to-square');
                            icon.classList.add('fa-check');
                        } else {
                            // MODO DE EDIÇÃO DESATIVADO (SALVANDO)
                            // Desabilita o campo de input
                            inputField.disabled = true;
                            // Remove o ícone de check e adiciona o de edição de volta
                            icon.classList.remove('fa-check');
                            icon.classList.add('fa-pen-to-square');
                            await editarDemanda(demandaId)
                        }
                    }
                });
            });
            //Edição da descrição
            const editDesc = document.querySelector(".edit-desc");
            editDesc.style.setProperty('display', 'block', 'important');
            editDesc.addEventListener('click', async () => {
                // 4. Encontra o elemento <input> que vem imediatamente antes do ícone
                const textAreaDesc = document.getElementById("descricao");
                // 5. Remove o atributo 'disabled' e foca no campo
                if (editDesc.classList.contains('fa-pen-to-square')) {
                    // MODO DE EDIÇÃO ATIVADO
                    // Habilita o campo de input
                    textAreaDesc.disabled = false;
                    // Foca no campo para digitação imediata
                    textAreaDesc.focus();
                    // Remove o ícone de edição e adiciona o de check
                    editDesc.classList.remove('fa-pen-to-square');
                    editDesc.classList.add('fa-check');
                } else {
                    // MODO DE EDIÇÃO DESATIVADO (SALVANDO)
                    // Desabilita o campo de input
                    textAreaDesc.disabled = true;
                    // Remove o ícone de check e adiciona o de edição de volta
                    editDesc.classList.remove('fa-check');
                    editDesc.classList.add('fa-pen-to-square');
                    await editarDemanda(demandaId)
                }
            });
        }
}
// Chama a função assim que a página carregar
document.addEventListener("DOMContentLoaded", async () => {
    await preencherDemanda(demandaId); 
});

//Função responsável por carregar um card de etapa
function renderizarEtapa(etapa, data) {
    const setoresCurrentUser = data.demanda.setores_current_user; 
    // 1. Cria um novo elemento <details> em memória
    const boxEtapa = document.createElement('div');
    boxEtapa.className = 'containerBoxEtapa';
    boxEtapa.id = "etapa"+etapa.id;
    boxEtapa.dataset.etapa = etapa.DemandaId;
    boxEtapa.dataset.numeroEtapa = etapa.numeroEtapa;
    // Lógica para a 'etapaAtual' permanece a mesma
    const etapasDemanda = data.demanda.etapas;
    console.log(etapasDemanda);
    etapasDemanda.forEach(etapa => {
        if (etapa.status == "Pendente" || etapa.status == "Iniciado" || etapa.status == "Negado") {
            const etapaAtual = document.querySelector('.etapaAtual');
            etapaAtual.textContent = etapa.nome_etapa;
            etapaAtual.href = '#' + "etapa" + etapa.id;
            // Adiciona um "ouvinte" para o evento de clique
            etapaAtual.addEventListener('click', function(event) {
                // 1. Previne o comportamento padrão do link (a rolagem para o topo)
                event.preventDefault();
                // 2. Pega o ID do alvo a partir do atributo href (ex: '#MinhaEtapa')
                const targetId = this.getAttribute('href');
                // 3. Encontra o elemento no documento com o ID correspondente
                const targetElement = document.querySelector(targetId);
                // 4. Se o elemento existir, executa a rolagem suave para o centro
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth', // Para uma animação de rolagem suave
                        block: 'start'     // Essencial: alinha o elemento ao centro vertical da tela
                    });
                }
            });
        }
    });
    // --- 1. Criação do <tituloEtapa> e seu conteúdo ---
    const tituloEtapa = document.createElement('div');
    tituloEtapa.className = 'tituloEtapa';
    // Helper function para criar os blocos de subtítulo (h3 + h4)
    const criarSubtitulo = (label, valor) => {
        const div = document.createElement('div');
        div.className = 'subtituloEtapa';
    
        const h3 = document.createElement('h3');
        h3.textContent = `${label}:`;
    
        const h4 = document.createElement('h4');
        h4.textContent = valor;
        div.append(h3, h4); // append pode adicionar múltiplos elementos de uma vez
        return div;
    };
    // Bloco: Etapa
    tituloEtapa.appendChild(criarSubtitulo('Etapa', etapa.nome_etapa));
    // Bloco: Setor
    //verificação de primeira etapa para não aparecer o setor
    if (etapa.numeroEtapa != 1) {
        tituloEtapa.appendChild(criarSubtitulo('Setor', etapa.setor));
    }
    // Bloco: Responsável (com <select>)
    const divResponsavel = document.createElement('div');
    divResponsavel.className = 'subtituloEtapa responsavel';
    const h3Responsavel = document.createElement('h3');
    h3Responsavel.textContent = 'Responsável:';
    const selectResponsavelElement = document.createElement('select');
    selectResponsavelElement.className = 'selectResponsavel';
    selectResponsavelElement.id = `responsavel${etapa.id}`;
    const optionDefault = document.createElement('option');
    optionDefault.value = '';
    optionDefault.textContent = 'Selecione o responsável';
    selectResponsavelElement.appendChild(optionDefault);
    if (etapa.numeroEtapa == 1) {
        selectResponsavelElement.value = data.demanda.criado_por;
    }
    divResponsavel.append(h3Responsavel, selectResponsavelElement);
    tituloEtapa.appendChild(divResponsavel);
    // Bloco: Prazo (com <input>)
    const divPrazo = document.createElement('div');
    divPrazo.className = 'subtituloEtapa prazo';
    const h3Prazo = document.createElement('h3');
    h3Prazo.textContent = 'Prazo:';
    // 1. Criar o wrapper que segura o input e o ícone
    const inputWrapper = document.createElement('div');
    // Esta nova classe fará a mágica de posicionamento e manterá a largura
    inputWrapper.className = 'date-input-wrapper'; 
    // 2. Criar o input 
    const inputPrazoElement = document.createElement('input');
    inputPrazoElement.setAttribute('type', 'date');
    inputPrazoElement.setAttribute('class', 'inputPrazo'); // Classe existente
    inputPrazoElement.setAttribute('id', `prazo-${etapa.id}`);
    inputPrazoElement.disabled = true; 
    if (etapa.prazo) {
        inputPrazoElement.value = etapa.prazo.substring(0, 10);
    } else {
        inputPrazoElement.value = ''; // Garante que está vazio se for null/undefined
    }
    // 3. Criar o seu ícone personalizado
    const customIcon = document.createElement('i');
    // Adicionamos as classes do Font Awesome + uma classe customizada
    customIcon.className = 'fa-solid fa-calendar-days custom-date-icon';
    customIcon.classList.add('disabled-icon');
    customIcon.addEventListener('click', () => {
        // Força o seletor de data do input a aparecer
        if (!inputPrazoElement.disabled) {
            // Força o seletor de data do input a aparecer
            inputPrazoElement.showPicker();
        }
    });
    // 4. Adicionar o input e o ícone AO WRAPPER
    inputWrapper.append(inputPrazoElement, customIcon);
    divPrazo.append(h3Prazo, inputWrapper);
    if (etapa.numeroEtapa == 1) {
        divPrazo.style.display = 'none';
    }
    tituloEtapa.appendChild(divPrazo);
    // Bloco: Status
    const divStatus = document.createElement('div');
    divStatus.className = 'subtituloEtapa';
    const h3LabelStatus = document.createElement('h3');
    h3LabelStatus.textContent = 'Status:';
    const h3ValorStatus = document.createElement('h3');
    h3ValorStatus.className = 'statusEtapa';
    h3ValorStatus.textContent = etapa.status;
    divStatus.append(h3LabelStatus, h3ValorStatus);
    tituloEtapa.appendChild(divStatus);
    // --- 2. Criação do <div> principal do conteúdo ---
    const contentDetails = document.createElement('div');
    contentDetails.className = 'contentdetails';
    // Container da Descrição
    const containerDescricao = document.createElement('div');
    containerDescricao.className = 'containerDecricaoEtapa';
    const titleDescricao = document.createElement('div');
    titleDescricao.className = 'titleDescricaoEtapa';
    const iconInfo = document.createElement('i');
    iconInfo.className = 'fas fa-info-circle';
    iconInfo.title = 'Chat da etapa';
    const pDescricao = document.createElement('p');
    pDescricao.textContent = 'Chat da Etapa:';
    titleDescricao.append(iconInfo, pDescricao);
    //Chat da etapa
    const containerChatEtapa  = document.createElement('div');
    containerChatEtapa.className = 'containerChatEtapa Etapa';
    containerChatEtapa.dataset.idEtapa = etapa.id;
    const mensagensContainer = document.createElement('div');
    mensagensContainer.className = 'mensagensContainer';
    const mensagens = etapa.acoes;
        mensagens.forEach(mensagem => {
            const mensagemContent = document.createElement('div');
            mensagemContent.className = 'mensagemContent';
            if (mensagem.user_id == currentUserId) {
                mensagemContent.classList.add('mensagem-propria');
            } else {
                mensagemContent.classList.add('mensagem-outro');
            }
            //Define a classe para mensagens vindas do sistema
            if (mensagem.user_id == 989890796) {
                mensagemContent.classList.add('mensagem-sistema');
                const blockMsg = document.createElement('div');
                blockMsg.className = 'blockMsg';
                const mensagemText = document.createElement('p');
                mensagemText.className = 'mensagemText';
                mensagemText.textContent = mensagem.acao;
                const dataMensagem = document.createElement('p');
                dataMensagem.className = 'dataMensagem';
                dataMensagem.textContent = mensagem.data_hora;
                blockMsg.append(mensagemText);
                mensagemContent.append(blockMsg, dataMensagem);
            } 
            //Define os elementos quando for uma mensagem enviada por usuário
            else {
                const userMensagem = document.createElement('p');
                userMensagem.className = 'userMensagem';
                userMensagem.textContent = mensagem.user_name;
                userMensagem.setAttribute('data-idUser', mensagem.user_id);
                const blockMsg = document.createElement('div');
                blockMsg.className = 'blockMsg';
                const mensagemText = document.createElement('p');
                mensagemText.className = 'mensagemText';
                mensagemText.textContent = mensagem.acao;
                const dataMensagem = document.createElement('p');
                dataMensagem.className = 'dataMensagem';
                dataMensagem.textContent = mensagem.data_hora;
                blockMsg.append(userMensagem, mensagemText);
                mensagemContent.append(blockMsg, dataMensagem);
            }
            mensagensContainer.appendChild(mensagemContent);
        });
    // Rola o container de mensagens para a posição mais baixa
    setTimeout(() => {
        mensagensContainer.scrollTop = mensagensContainer.scrollHeight;
    }, 0);
    const containerInputChatEtapa = document.createElement('div');  
    containerInputChatEtapa.className = 'containerInputChatEtapa';
    const inputChatEtapa = document.createElement('input');
    inputChatEtapa.type = 'text';
    inputChatEtapa.className = 'inputChatEtapa';
    inputChatEtapa.setAttribute('data-idEtapa', etapa.id);
    inputChatEtapa.placeholder = 'Mensagem...';
    inputChatEtapa.disabled = true;
    const iconEnviarMensagem = document.createElement('i');
    iconEnviarMensagem.className = 'fa-solid fa-paper-plane';
    iconEnviarMensagem.setAttribute('data-idEtapa', etapa.id);
    iconEnviarMensagem.title = 'Enviar Mensagem';
    iconEnviarMensagem.addEventListener('click', async () => {
        // Pega o valor do input associado a este ícone
        const comentario = inputChatEtapa.value.trim(); // .trim() remove espaços em branco extras
        const idEtapa = iconEnviarMensagem.getAttribute('data-idEtapa');
        // Verifica se o comentário não está vazio
        if (!comentario) {
            // Se o campo estiver vazio, informa o usuário
            alert("Por favor, digite uma mensagem antes de enviar.");
            inputChatEtapa.focus(); // Coloca o foco de volta no input
        } 
        const options = {
            year: 'numeric',   // 2025
            month: '2-digit',  // 10
            day: '2-digit',    // 23
            hour: '2-digit',   // 06
            minute: '2-digit', // 48
            hour12: false      // Usar formato 24h
        };
        const hora = new Date();
        const dataHoraComVirgula = hora.toLocaleString('pt-BR', options);
        const mensagemTemporaria = {
            user_id: currentUserId, // Você precisa ter essa variável globalmente
            user_name: currentUserNome, // E essa também
            acao: comentario,
            data_hora: dataHoraComVirgula.replace(',', '') // Gera uma data/hora local
        };
        // 2. Adicione imediatamente a mensagem à interface.
        adicionarMensagemAoChat(idEtapa, mensagemTemporaria, true);
        // 3. Limpe o campo de input.
        inputChatEtapa.value = '';
        enviarComentario(idEtapa, mensagemTemporaria);
    });
    containerInputChatEtapa.append(inputChatEtapa);
    containerInputChatEtapa.append(iconEnviarMensagem);
    if (etapa.status === 'Iniciado') {
        inputChatEtapa.disabled = false;
    }
    containerChatEtapa.append(mensagensContainer);
    containerChatEtapa.append(containerInputChatEtapa);
    if (etapa.status === 'Aguardando') {
        containerChatEtapa.disabled = true;
        containerChatEtapa.placeholder = 'Edição não permitida para etapas em aguardo.'; 
    }
    if (etapa.status === 'Finalizado') {
        containerChatEtapa.disabled = true;
    }
    containerDescricao.append(titleDescricao, containerChatEtapa);
    // Container dos Documentos
    const containerDocs = document.createElement('div');
    containerDocs.className = 'containerButtonDocs';
    const titleAnexos = document.createElement('div');
    titleAnexos.className = 'titleAnexos';
    const iconPdf = document.createElement('i');
    iconPdf.className = 'fa-solid fa-file-pdf';
    const pAnexos = document.createElement('p');
    pAnexos.textContent = 'Anexo de Documentos:';
    titleAnexos.append(iconPdf, pAnexos);
    const containerAnexoArquivos = document.createElement('div');
    containerAnexoArquivos.className = 'containerAnexoArquivos';
    const inputArquivos = document.createElement('input');
    inputArquivos.type = 'file';
    inputArquivos.dataset.numeroEtapa = etapa.id;
    inputArquivos.className = 'inputArquivos';
    inputArquivos.multiple = true;
    if (etapa.status === 'Aguardando' || etapa.status === 'Finalizado') {
        inputArquivos.disabled = true;
    }
    const fileList = document.createElement('ul');
    fileList.className = 'fileList';
    fileList.id = `fileList-${etapa.id}`;

    const btnEnviarArquivos = document.createElement('button');
    btnEnviarArquivos.className = 'btnEnviarArquivos';
    btnEnviarArquivos.id = `btnEnviarArquivos-${etapa.id}`;
    btnEnviarArquivos.textContent = 'Salvar Anexos';
    // --- Fetch para salvar os arquivos ---
        // Este bloco só executa se houver arquivos na lista para esta etapa
    btnEnviarArquivos.addEventListener('click', async () => {
        const arquivosParaSalvar = arquivosSelecionadosPorEtapa[etapa.id] || [];
        if (arquivosParaSalvar.length > 0) {
            const formData = new FormData();
            arquivosParaSalvar.forEach(arquivo => {
                formData.append("arquivos", arquivo);
            });
            const idDemanda = document.getElementById("numDemanda").textContent;
            formData.append("id_demanda", idDemanda);
            formData.append("etapa_id", etapa.id);
            const responseArquivos = await fetch('/api/arquivos', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            // Se o upload dos arquivos falhar, lança um erro
            if (!responseArquivos.ok) {
                const data = await responseArquivos.json();
                console.log(`Erro do servidor: ${data.detail}`);
                throw new Error('Falha ao salvar os arquivos anexados.');
            }
            if (responseArquivos.ok) {
                abrirPopupResposta("Ação concluída","Arquivos salvos com sucesso!");
            }
            // Limpa o array de arquivos locais APENAS se o upload for bem-sucedido
            arquivosSelecionadosPorEtapa[etapa.id] = [];
        }
    })
    if (etapa.status === 'Iniciado') {
        containerAnexoArquivos.append(inputArquivos, fileList, btnEnviarArquivos);
    } else {
        containerAnexoArquivos.append(inputArquivos, fileList);
    }
    containerDocs.append(titleAnexos, containerAnexoArquivos);

    contentDetails.append(containerDescricao, containerDocs);

    // --- 3. Criação do container de botões ---
    const containerBotoes = document.createElement('div');
    containerBotoes.className = 'containerBtnProxEtapa';

    // Helper para criar botões
    const criarBotao = (texto, classe, acao) => {
        const button = document.createElement('button');
        button.className = `btnEtapas ${classe}`;
        button.textContent = texto;
        // BOA PRÁTICA: Usar addEventListener em vez de onclick inline
        button.addEventListener('click', acao);
        return button;
    };
    const etapas = data.demanda.etapas;
    const etapasFiltradas = etapas.filter(etapa => etapa.DemandaId == demandaId);
    //Criação do botão de iniciar a etapa
    const btnIniciarEtapa = criarBotao('Iniciar etapa', 'btnSalvarArquivos', () => salvarEtapa(etapa.id,"Etapa iniciada", false, false, false, null));
    //Criação do botão de negar a etapa
    const btnNegar = criarBotao('Negar', 'btnNegarEtapa', () => abrirPopupEditarEtapa("Descrição de negação de etapa:",etapa.id, false, true, false, etapasFiltradas));
    //Criação do botão de finalizar a etapa
    const btnFinalizar = criarBotao('Finalizar', 'btnProxEtapa', () => abrirPopupEditarEtapa("Descrição de finalização de etapa:",etapa.id, true, false, false, etapasFiltradas));
    //Criação do botão de sinalizar pendência da etapa
    const btnPendencia = criarBotao('Sinalizar Pendência', 'btnPendencia', () => abrirPopupEditarEtapa("Descrição de pendência de etapa:",etapa.id, false, false, true, etapasFiltradas));

    if (etapa.status === 'Finalizado' || etapa.status === 'Aguardando' || etapa.status === 'Aguardando Pendência') {
        containerBotoes.append();
    } else if (etapa.status === 'Pendente' || etapa.status === 'Negado') {
        containerBotoes.append(btnIniciarEtapa);
    }
    else {
        const etapaPendente = etapasFiltradas.filter(etapa => etapa.status == 'Aguardando Pendência');
        if (etapaPendente.length > 0) {
            containerBotoes.append(btnNegar, btnFinalizar);
        } else {
            if (etapa.numeroEtapa == 1) {
                containerBotoes.append(btnNegar, btnFinalizar);
            } else {
                containerBotoes.append(btnNegar, btnPendencia, btnFinalizar);
            }
        }
        
    }        
    // --- 4. Anexar tudo ao elemento <details> principal ---
    boxEtapa.append(tituloEtapa, contentDetails, containerBotoes);
    // 3. Adicione o novo elemento completo ao container principal
    //    Isso NÃO destrói o que já estava lá.
    containerDetails.appendChild(boxEtapa);
    // --- A LÓGICA DE PREENCHIMENTO AGORA FUNCIONA CORRETAMENTE ---
    //    Como não estamos mais destruindo o select, as modificações persistem.
    const usuarios = etapa.usuarios;
    // IMPORTANTE: Busque o select a partir do 'boxEtapa' que acabamos de criar para garantir que estamos pegando o correto.
    const selectResponsavel = boxEtapa.querySelector(`#responsavel${etapa.id}`);
    selectResponsavel.disabled = true;
    selectResponsavel.setAttribute('data-id-etapa', etapa.id);
    selectResponsavel.setAttribute('data-id-setor', etapa.id_setor);
    if (usuarios && usuarios.length > 0) {
        usuarios.forEach((usuario) => {
            const option = document.createElement('option');
            option.value = usuario.id;
            option.textContent = usuario.nome;
            selectResponsavel.appendChild(option);
        });
    }
    if (etapa.responsavel) {
        const responsavelObj = usuarios.find(u => u.nome === etapa.responsavel);
        if (responsavelObj) {
            selectResponsavel.value = responsavelObj.id;
        }
    }
    if (etapa.numeroEtapa == 1) {
        selectResponsavel.disabled = true;
        selectResponsavel.value = data.demanda.criado_por_id;
    }
    //Filtros de permissão para delegar responsável
    //Edição possível apenas por gestor do setor da etapa
    const setor_id = etapa.id_setor;
    if (etapa.status == "Pendente" || etapa.status == "Iniciado") {
        setoresCurrentUser.forEach(setor => {
            if (setor[0] === setor_id && setor[1] === true && etapa.numeroEtapa != 1) {
                selectResponsavel.disabled = false;
                customIcon.classList.remove('disabled-icon'); 
                inputPrazoElement.disabled = false;
                // 1. Pega a data de hoje
                const hoje = new Date();                
                // 2. Ajusta para o fuso horário local (evita bugs de "ontem" à meia-noite)
                hoje.setMinutes(hoje.getMinutes() - hoje.getTimezoneOffset());                
                // 3. Converte para o formato YYYY-MM-DD
                const dataMinima = hoje.toISOString().split('T')[0];                
                // 4. Define o atributo 'min' no input
                inputPrazoElement.setAttribute('min', dataMinima);
            }
        })
    } else {
        // Se não estiver 'Iniciado', adicione uma classe para desabilitar o ícone visualmente
        customIcon.classList.add('disabled-icon'); 
    }

    //Disponibilidade para negar etapas apenas para gestores
    // 1. Seleciona o botão DENTRO do contexto do 'boxEtapa' atual.
    const validacao = etapa.validacao;

    const btnNegarEtapa = boxEtapa.querySelector(".btnNegarEtapa"); 
    // 2. Verifica se o usuário atual é gestor NO SETOR DESTA ETAPA.
    //Usar .some() é mais eficiente, pois para a verificação assim que encontra um resultado positivo.
    const gestorDoSetor = setoresCurrentUser.some(setor => {
        return setor[0] === setor_id && setor[1] === true;
    });
    // 3. Se for gestor, exibe o botão.
    if (btnNegarEtapa && etapa.status != "Finalizado" && gestorDoSetor && validacao === true) {
        btnNegarEtapa.style.display = "flex";
    }
    
    // Preenchimento dos documentos
    const documentos = etapa.documentos;
    const listaDocumentos = boxEtapa.querySelector(`#fileList-${etapa.id}`);
    if (documentos && documentos.length > 0) {
        documentos.forEach((documento) => {
            listaDocumentos.innerHTML += `
            <li class="documento" id="documento-${documento.id}">
                <p onclick="baixarArquivo(${documento.id})"><i class="fa-solid fa-file-arrow-down"></i> ${documento.nome_arquivo}</p>
                <i class="fa-solid fa-trash-can" onclick="excluirArquivo(${documento.id})"></i>
            </li>
            `;
        });
    }
    return boxEtapa; // Retorna o elemento HTML completo da etapa
}

async function atualizarEtapa(etapaId) {
    mostrarLoading();
    try {
        const data = await carregarDemanda(demandaId);
        const etapaAtualizada = data.demanda.etapas.find(e => e.id === etapaId);
        if (!etapaAtualizada) {
            console.error("Não foi possível encontrar os dados da etapa atualizada.");
            return;
        }
        // Passo 2: Encontrar o elemento antigo da etapa na página
        const containerEtapaAntiga = document.getElementById(`etapa${etapaId}`);
        if (!containerEtapaAntiga) {
            console.error(`Elemento da etapa ${etapaId} não encontrado na página.`);
            return;
        }
        // Passo 3: Criar o novo elemento HTML da etapa usando a função que isolamos
        const containerEtapaNova = renderizarEtapa(etapaAtualizada, data);
        // Passo 4: Substituir o elemento antigo pelo novo no DOM
        containerEtapaAntiga.replaceWith(containerEtapaNova); 

        configurarEventosInputs();
    } catch (error) {
        console.error("Falha ao atualizar a etapa:", error);
        abrirPopupResposta("Ação interrompida", "Não foi possível atualizar a etapa.");
    } finally {
        esconderLoading();
    }
}


function adicionarMensagemAoChat(idEtapa, mensagem, isPropria = true) {
    // 1. Encontrar o container de mensagens correto usando o ID da etapa
    const containerChat = document.querySelector(`.containerChatEtapa[data-id-etapa="${idEtapa}"]`);
    if (!containerChat) {
        console.error(`Container de chat para a etapa ${idEtapa} não encontrado.`);
        return;
    }
    const mensagensContainer = containerChat.querySelector('.mensagensContainer');
    // 2. Criar os elementos da mensagem (lógica similar à que você já tem)
    const mensagemContent = document.createElement('div');
    mensagemContent.className = 'mensagemContent';
    // Adiciona a classe para alinhar a mensagem (direita ou esquerda)
    mensagemContent.classList.add(isPropria ? 'mensagem-propria' : 'mensagem-outro');
    const userMensagem = document.createElement('p');
    userMensagem.className = 'userMensagem';
    userMensagem.textContent = mensagem.user_name;
    userMensagem.setAttribute('data-idUser', mensagem.user_id);
    const blockMsg = document.createElement('div');
    blockMsg.className = 'blockMsg';
    const mensagemText = document.createElement('p');
    mensagemText.className = 'mensagemText';
    mensagemText.textContent = mensagem.acao;
    const dataMensagem = document.createElement('p');
    dataMensagem.className = 'dataMensagem';
    dataMensagem.textContent = mensagem.data_hora;
    blockMsg.append(userMensagem, mensagemText);
    mensagemContent.append(blockMsg, dataMensagem);
    // 3. Adicionar a nova mensagem ao container
    mensagensContainer.appendChild(mensagemContent);
    // 4. Rolar para o final para que a nova mensagem seja visível
    mensagensContainer.scrollTop = mensagensContainer.scrollHeight;
}



//Função para abrir popup de edição de etapa
const popupEditarEtapa = document.querySelector('.popupEditarEtapa');
async function abrirPopupEditarEtapa(titulo, idEtapa, finalizada, negado, pendencia, etapas) {
    const contentEditarEtapa = document.querySelector('.contentEditarEtapa');
    contentEditarEtapa.innerHTML = '';
    // 1. Criar o elemento <span> para o botão de fechar
    const spanClose = document.createElement('span');
    spanClose.classList.add('closeEditarEtapa');
    spanClose.textContent = '\u00D7'; // O caractere '×' (times)
    spanClose.addEventListener('click', fecharEditarEtapa);
    contentEditarEtapa.appendChild(spanClose);

    // 2. Criar o título <h1>
    const h1Title = document.createElement('h1');
    h1Title.classList.add('titleEditarEtapa');
    h1Title.textContent = titulo;
    contentEditarEtapa.appendChild(h1Title);

    const selectEtapa = document.createElement('select');
    selectEtapa.classList.add('selectEtapa');
    selectEtapa.setAttribute('data-id-etapa', idEtapa);
    const optionPadrao = document.createElement('option');
    optionPadrao.value = '';
    optionPadrao.textContent = 'Selecione uma etapa';
    selectEtapa.appendChild(optionPadrao);
    etapas.forEach(etapa => {
        if (etapa.status == "Finalizado") {
            const optionEtapa = document.createElement('option');
            optionEtapa.value = etapa.id;
            optionEtapa.textContent = etapa.nome_etapa;
            selectEtapa.appendChild(optionEtapa);
        }
    });
    optionPadrao.selected = true;
    if (pendencia){
        contentEditarEtapa.appendChild(selectEtapa);
    }

    // 3. Criar a <textarea>
    const textareaMsg = document.createElement('textarea');
    textareaMsg.classList.add('msgEditarEtapa');
    textareaMsg.placeholder = 'Mensagem...';
    contentEditarEtapa.appendChild(textareaMsg);

    // 4. Criar o <button> de envio
    const btnEnviar = document.createElement('button');
    btnEnviar.classList.add('btnEnviarEtapa');
    btnEnviar.textContent = 'Enviar';
    
    btnEnviar.addEventListener('click', async () => {
        const valorSelect = selectEtapa.value || null;
        console.log("ID ETAPA: ", idEtapa, "MENSAGEM: " , textareaMsg.value, "FINALIZADA: " ,finalizada, "NEGADO: " , negado,  "PENDENCIA: ", pendencia, "Valor do select: ", valorSelect);
        await salvarEtapa(idEtapa,textareaMsg.value, finalizada, negado, pendencia, valorSelect);
        fecharEditarEtapa();
    })
    contentEditarEtapa.appendChild(btnEnviar);
    popupEditarEtapa.show();   
}
function fecharEditarEtapa() {
    popupEditarEtapa.close();
}


// Armazenamento global dos arquivos por etapa
let arquivosSelecionadosPorEtapa = {};

// Vincula evento aos inputs dinâmicos depois de carregar a demanda
function configurarEventosInputs() {
    document.querySelectorAll('.inputArquivos').forEach(input => {
        const etapaId = input.getAttribute('data-numero-etapa');
        input.addEventListener('change', (event) => {
            const arquivosNovos = Array.from(event.target.files);
            if (arquivosNovos.length === 0) {
                return; // Não faz nada se nenhum arquivo foi selecionado
            }
            // Garante que o array para a etapa exista
            if (!arquivosSelecionadosPorEtapa[etapaId]) {
                arquivosSelecionadosPorEtapa[etapaId] = [];
            }
            // Adiciona os novos arquivos à lista
            arquivosSelecionadosPorEtapa[etapaId].push(...arquivosNovos);
            // Atualiza a exibição na lista correspondente
            const lista = document.getElementById(`fileList-${etapaId}`);
            arquivosNovos.forEach(arquivo => {
                const li = document.createElement('li');
                li.className = 'documento';
                // Adicionamos um atributo para identificar o arquivo pelo nome
                li.setAttribute('data-file-name', arquivo.name);
                // ... (o restante do seu código para criar o <p> e o ícone de download)
                const p = document.createElement('p');
                const iconDownload = document.createElement('i');
                iconDownload.className = 'fa-solid fa-file-arrow-down';
                p.appendChild(iconDownload);
                p.appendChild(document.createTextNode(` ${arquivo.name}`));
                li.appendChild(p);
                p.addEventListener('click', () => {
                    abrirPopupResposta("Ação interrompida", "Salve os arquivos antes de baixar!");
                });
                const iconRemove = document.createElement('i');
                iconRemove.className = 'fa-solid fa-trash-can iconRemoverArquivo';
                li.appendChild(iconRemove);
                iconRemove.addEventListener('click', () => {
                    if (confirm("Tem certeza que deseja remover este arquivo da lista?")) {
                        const nomeArquivoParaRemover = li.getAttribute('data-file-name');
                        // Remove o arquivo do array de dados
                        arquivosSelecionadosPorEtapa[etapaId] = arquivosSelecionadosPorEtapa[etapaId].filter(
                            file => file.name !== nomeArquivoParaRemover
                        );
                        // Remove o elemento da interface
                        li.remove();
                        console.log("Arquivo removido:", nomeArquivoParaRemover);
                        console.log("Arquivos restantes:", arquivosSelecionadosPorEtapa[etapaId]);
                    }
                });
                lista.appendChild(li);
            });
            // Limpa o valor do input para permitir que o mesmo arquivo seja selecionado novamente
            event.target.value = ''; 
        });
    });
}
async function excluirArquivo(documentoId) {
    const confirmacao = confirm("Tem certeza que deseja excluir este arquivo? Esta ação não poderá ser desfeita.");
    if (confirmacao) {
        mostrarLoading();
        try {
            const response = await fetch(`/api/arquivos/${documentoId}`, {
                method: "DELETE",
            });
            if (response.ok) {
                abrirPopupResposta("Ação concluída","Arquivo excluido com sucesso!");
                // ADICIONE A LÓGICA DE REMOÇÃO DIRETA DO DOM:
                const elementoArquivo = document.getElementById(`documento-${documentoId}`);
                if (elementoArquivo) {
                    elementoArquivo.remove(); // Simplesmente remove o elemento da tela
                }
            } else {
                abrirPopupResposta("Ação interrompida","Falha ao excluir o arquivo.");
            }
        } catch(error) {
            console.error(error);
            abrirPopupResposta("Ação interrompida","Falha ao excluir o arquivo.");
        }
    } else {
        // Caso o usuário cancele
        abrirPopupResposta("Ação concluída","Exclusão cancelada.");
        esconderLoading();
    }
}

async function baixarArquivo(documentoId) {
    mostrarLoading();
    try {
        const response = await fetch(`/api/arquivos/${documentoId}`, {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            // Tenta ler uma mensagem de erro do corpo da resposta, se houver
            const errorData = await response.json().catch(() => null);
            abrirPopupResposta("Ação interrompida", `Falha ao baixar o arquivo, tente novamente mais tarde.`);
            esconderLoading();
            return;
        }
        // Extração robusta do nome do arquivo
        const disposition = response.headers.get("Content-Disposition");
        let filename = "arquivo_desconhecido"; // Um nome padrão mais seguro
        if (disposition && disposition.includes("attachment")) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                // Remove aspas e decodifica o nome do arquivo
                filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
            }
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename; // Usa o nome de arquivo extraído de forma segura
        // Adiciona ao corpo, clica e depois remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Libera a memória do blob
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Erro ao tentar baixar o arquivo:", error);
        abrirPopupResposta("Ação interrompida","Ocorreu um erro inesperado ao tentar baixar o arquivo.");
    } finally {
        esconderLoading(); // Garante que o loading sempre será escondido
    }
}

async function enviarComentario(idEtapa, acao) {
    try {
        const response = await fetch(`/api/etapa/acao/${idEtapa}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(acao)
        })
        if (response.ok) {
            console.log("Comentário salvo com sucesso!");
        } else {
            // Se a API retornar um erro, exibe para o usuário
            const errorData = await response.json();
            abrirPopupResposta("Ação interrompida", `Falha ao enviar comentário: ${errorData.detail || 'Erro desconhecido'}`);
        }
    } catch(error) {
        console.error("Erro ao enviar comentário:", error);
    }
}


async function salvarEtapa(id,descricao, finalizada, negado, pendencia, idEtapaPendencia) {
    //Log de depuração
    // console.log("ID ETAPA: ", id, "MENSAGEM: " ,descricao, "FINALIZADA: " ,finalizada, "NEGADO: " , negado,  "PENDENCIA: ", pendencia, "Valor do select: ", idEtapaPendencia);
    const etapaId = id;
    const etapaElement = document.getElementById(`etapa${etapaId}`);
    let numeroEtapa = null;
    if (etapaElement) {
        // 2. Ler o número da etapa a partir do data attribute
        // Usamos parseInt para garantir que é um número
        numeroEtapa = parseInt(etapaElement.dataset.numeroEtapa, 10);
    }
    if (descricao == 'Etapa iniciada') {
        const selectResponsavelInicial = document.getElementById(`responsavel${etapaId}`);
        if (selectResponsavelInicial.value == '') {
            abrirPopupResposta("Ação interrompida","Selecione um responsável para iniciar a etapa.");
            return;
        }
        const inputPrazo = document.getElementById(`prazo-${etapaId}`)
        if (numeroEtapa !== 1 && inputPrazo.value == '') {
            abrirPopupResposta("Ação interrompida","Selecione um prazo para iniciar a etapa.");
            inputPrazo.focus();
            return;
        }
    }
    try {
        console.log(token);
        // --- ETAPA 1: Atualizar os dados textuais da etapa ---
        const responseEtapa = await fetch(`/api/etapas/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "descricao": descricao,
                "finalizada": finalizada,
                "negado": negado,
                "pendencia": pendencia,
                "id_etapa_pendencia": idEtapaPendencia
            })
        });

        // Se a atualização da etapa falhar, interrompe o processo e lança um erro
        if (!responseEtapa.ok) {
            throw new Error('Falha ao atualizar os dados da etapa.');
        }
        // --- ETAPA 3: Sucesso em todas as operações ---
        await atualizarEtapa(etapaId);
        if (pendencia) {
            await atualizarEtapa(parseInt(idEtapaPendencia, 10));
        }
        const proximaEtapa = etapaId + 1;
        if (finalizada) {
            await atualizarEtapa(proximaEtapa);
        }
        
        abrirPopupResposta("Ação concluída", "Etapa atualizada com sucesso.");

    } catch (error) {
        // O bloco catch captura qualquer erro lançado no bloco try
        console.error(error);
        abrirPopupResposta("Ação interrompida", `${error.message} Tente novamente mais tarde.`);
    }
}


async function atualizarResponsavelEPrazo(etapaId, responsavelId, prazoValor) {
    // 1. Validação: Não fazer nada se o responsável não estiver definido.
    if (!responsavelId) {
        console.warn("Tentativa de atualizar sem um responsável selecionado.");
        return; 
    }
    // 2. Validação: Se o prazo estiver vazio, envie 'null' ou não envie a chave.
    //    O Pydantic (FastAPI) lida bem com `None` (null).
    const payload = {
        responsavel_id: responsavelId,
        // Envia o prazo se ele existir, senão envia null
        prazo: prazoValor ? prazoValor : null 
    };
    console.log(`Atualizando Etapa ${etapaId} com:`, payload);
    try {
        const atualizacao = await fetch(`/api/etapa/responsavel/${etapaId}`, { // A rota que você forneceu
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (atualizacao.ok) {
            // Se o prazo não foi definido, foca no input de prazo
            if (!prazoValor) {
                abrirPopupResposta("Responsável definido", "Por favor, selecione um prazo para a etapa.");
                const inputPrazo = document.getElementById(`prazo-${etapaId}`);
                if (inputPrazo) inputPrazo.focus();
            } else {
                abrirPopupResposta("Ação concluída", "Responsável e prazo atualizados!");
                await atualizarEtapa(etapaId); // Reutiliza sua função de atualizar a UI
            }
        } else {
            const erroData = await atualizacao.json().catch(() => ({})); 
            console.error("Erro do servidor:", erroData);
            abrirPopupResposta("Ação interrompida", `Erro ao atualizar: ${erroData.detail || 'Tente novamente.'}`);
        }
    } catch (error) {
        console.error("Erro de rede ao atualizar:", error);
        abrirPopupResposta("Ação interrompida", "Erro de rede, tente novamente mais tarde.");
    }
}

containerDetails.addEventListener("change", async (event) => {
    const target = event.target;
    let etapaId;
    let responsavelId;
    let prazoValor;
    let elementoInputPrazo;
    let elementoSelectResp;
    // 1. Determina qual elemento disparou e qual é o 'par' dele
    if (target.classList.contains('selectResponsavel')) {
        etapaId = parseInt(target.getAttribute("data-id-etapa"));
        elementoSelectResp = target;
        elementoInputPrazo = document.getElementById(`prazo-${etapaId}`); // Encontra o input de prazo correspondente
    } else if (target.classList.contains('inputPrazo')) {
        etapaId = parseInt(target.id.split('-')[1]);
        elementoInputPrazo = target;
        elementoSelectResp = document.getElementById(`responsavel${etapaId}`); // Encontra o select de resp. correspondente
    } else {
        return; // Sai se não for nenhum dos dois
    }
    // 2. Se não encontrou os elementos, algo está errado
    if (!elementoSelectResp || !elementoInputPrazo) {
        console.error("Não foi possível encontrar os elementos de responsável e prazo para a etapa", etapaId);
        return;
    }
    // 3. Coleta os valores de AMBOS os campos
    responsavelId = parseInt(elementoSelectResp.value);
    prazoValor = elementoInputPrazo.value; // ex: "2025-10-28"
    // 4. Validação importante:
    // Se a alteração foi no 'prazo', mas o 'responsável' ainda está em "Selecione..."
    if (target.classList.contains('inputPrazo') && !responsavelId) {
        abrirPopupResposta("Ação pendente", "Por favor, selecione um responsável ANTES de definir o prazo.");
        target.value = ''; // Limpa o input de data
        return; // Não faz a chamada de API
    } 
    if (target.classList.contains('selectResponsavel') && !prazoValor) {
        abrirPopupResposta("Ação pendente", "Responsável definido, selecione um prazo.");
        return; // Não faz a chamada de API
    }
    // 5. Chama a função unificada
    // (A função já trata o caso de 'prazoValor' estar vazio)
    if (!responsavelId || !prazoValor) {
        abrirPopupResposta("Ação pendente", "Por favor, verifique se os campos de responsável e prazo estão definidos.");
    } else {
        await atualizarResponsavelEPrazo(etapaId, responsavelId, prazoValor);
    }
    
});