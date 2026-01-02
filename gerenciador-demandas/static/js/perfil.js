const currentUserId = document.getElementById("hiddenId").value;
//Popup de usuários
const dialog = document.getElementById("popupUsers");
function abrirPopupUser() {
    exibirUsers();
    if (!dialog.open) {
        dialog.show();
        requestAnimationFrame(() => {
            dialog.classList.add("aberto");
        });
    }
}
function fecharPopupUser() {
    dialog.classList.remove("aberto");
    // Aguarda a animação antes de realmente fechar o dialog
    setTimeout(() => {
        dialog.close();
    }, 500); // tempo igual ao transition do CSS
}



//POPUP DE CADASTRO
//POPUP DE CADASTRO
//POPUP DE CADASTRO
const containerPopupCadastro = document.querySelector(".containerPopupCadastro");
const popupCadastro = document.querySelector(".popupCadastro");

async function abrirPopupCadastro() {
    await preencherSetores();
    containerPopupCadastro.style.display = 'flex';
    setTimeout(() => {
        containerPopupCadastro.style.opacity = "1"; // Suaviza a aparição
        popupCadastro.style.transform = "scale(1)"; // Faz o popup crescer suavemente
    }, 10); // Pequeno delay para ativar a animação
}
function fecharPopupCadastro() {
    containerPopupCadastro.style.opacity = "0"; // Suaviza o desaparecimento
    popupCadastro.style.transform = "scale(0.8)"; // Encolhe suavemente
    setTimeout(() => {
        containerPopupCadastro.style.display = "none"; // Esconde após a animação
    }, 400); // Tempo igual ao da transição no CSS
}
// Fecha o popup ao clicar fora dele
containerPopupCadastro.addEventListener("click", function (event) {
    if (!popupCadastro.contains(event.target)) {
        fecharPopupCadastro();
    }
});

//Lógica para preenchimento de inputs:
// Mesmo Número - Telefone Fixo
document.getElementById("mesmoNumero").addEventListener("change", function () {
    const inputWhatsapp = document.getElementById("inputWhatsapp");
    const inputTelefone = document.getElementById("inputTelefone");

    if (this.checked) {
        const { mascarado, limpo } = formatarTelefone(inputWhatsapp.value);
        inputTelefone.value = mascarado;
        inputTelefone.setAttribute("data-valor-limpo", limpo);
        inputTelefone.setAttribute("readonly", true);
    } else {
        inputTelefone.removeAttribute("readonly");
    }
});
// Atualiza o Telefone automaticamente ao digitar no WhatsApp
document.getElementById("inputWhatsapp").addEventListener("input", function () {
    const mesmoNumero = document.getElementById("mesmoNumero");
    const inputTelefone = document.getElementById("inputTelefone");
    if (mesmoNumero.checked) {
        inputTelefone.value = this.value;
    }
});


function getCookieValue(cookieName) {
    // Separa os cookies individuais
    const cookies = document.cookie.split(';');
    // Procura pelo cookie desejado
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        // Verifica se este é o cookie que estamos procurando
        if (cookie.startsWith(cookieName + '=')) {
            // Retorna o valor do cookie
            return cookie.substring(cookieName.length + 1);
        }
    }
    // Retorna null se o cookie não for encontrado
    return null;
}
//Definição de token globalmente
const token = getCookieValue('accessToken');
async function cadastrarUsuario() {
    mostrarLoading();
    const nome = document.getElementById('inputNome').value;
    const whatsapp = document.getElementById('inputWhatsapp').getAttribute('data-valor-limpo');
    const telefoneFixo = document.getElementById('inputTelefone').getAttribute('data-valor-limpo');
    const email = document.getElementById('inputEmail').value;
    const cpfCnpj = document.getElementById('inputRegistro').getAttribute('data-valor-limpo');

    // --- NOVA VERIFICAÇÃO DE CAMPOS OBRIGATÓRIOS ---
    // Verifica se algum dos campos de texto está vazio
    if (!nome || !email || !cpfCnpj || !telefoneFixo || !whatsapp) {
        abrirPopupResposta("Ação interrompida", "Por favor, preencha todos os campos obrigatórios.");
        return; // Interrompe a função aqui se a validação falhar
    }

    const setoresSelecionados = [];
    const setores = document.querySelectorAll('.setorDinamico');
    setores.forEach(setor => {
        const checkbox = setor.querySelector('input[type="checkbox"]');
        const select = setor.querySelector('.selectGestor').value;
        const id = setor.getAttribute('data-id');
        if (checkbox.checked) {
            setoresSelecionados.push({
                id: id,
                gestor: select === 'sim'
            });
        }
    });
    if (setoresSelecionados.length === 0) {
        abrirPopupResposta("Ação interrompida", "Por favor, selecione um setor para o usuário.");
        esconderLoading();
        return;
    }
    try {
        const response = await fetch('/user/registrar', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nome: nome,
                email: email,
                registro: cpfCnpj,
                telefone: telefoneFixo,
                whatsapp: whatsapp,
                setores: setoresSelecionados
            })
        });
        if (response.ok) {
            abrirPopupResposta("Ação concluída", "Usuário criado com sucesso!");
            fecharPopupCadastro();
            esconderLoading();
            window.location.reload();
        } else {
            abrirPopupResposta("Ação interrompida", "Erro ao criar usuário, tente novamente mais tarde!");
        }
    } catch {
        console.error(error)
    }
}



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
        return data;
    } catch (error) {
        console.error("Erro ao buscar personalização:", error);
        return null;
    }
}
async function preencherSetores() {
    const data = await dadosEmpresa();
    const containerSetores = document.querySelector(".blockSetor");
    containerSetores.innerHTML = "";
    data.setores.forEach(setor => {
        // Cria a div principal
        const setorDinamico = document.createElement("div");
        setorDinamico.classList.add("setorDinamico");
        setorDinamico.setAttribute("data-id", setor.id);
        // Cria <p class="setorName"> com o nome do setor
        const setorName = document.createElement("p");
        setorName.classList.add("setorName");
        setorName.textContent = setor.nome;
        setorDinamico.appendChild(setorName);
        // Cria a div do select
        const boxSelectGestor = document.createElement("div");
        boxSelectGestor.classList.add("boxSelectGestor");
        // Cria o <select class="selectGestor">
        const select = document.createElement("select");
        select.classList.add("selectGestor");
        const optionNao = document.createElement("option");
        optionNao.value = "nao";
        optionNao.textContent = "Não";
        optionNao.selected = true;
        const optionSim = document.createElement("option");
        optionSim.value = "sim";
        optionSim.textContent = "Sim";
        select.appendChild(optionNao);
        select.appendChild(optionSim);
        boxSelectGestor.appendChild(select);
        setorDinamico.appendChild(boxSelectGestor);
        // Cria a div da checkbox
        const checkboxRound = document.createElement("div");
        checkboxRound.classList.add("checkbox-round");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `roundCheckbox-${setor.id}`; // ID único por setor
        const label = document.createElement("label");
        label.setAttribute("for", checkbox.id);
        checkboxRound.appendChild(checkbox);
        checkboxRound.appendChild(label);
        setorDinamico.appendChild(checkboxRound);
        containerSetores.appendChild(setorDinamico);
        // EVENT LISTENERS — escopo correto
        checkbox.addEventListener("change", function () {
            if (checkbox.checked) {
                checkbox.style.backgroundColor = "var(--corPrincipal)";
                select.style.color = "var(--corPrincipal)";
                select.style.borderColor = "var(--corPrincipal)";
                setorName.style.color = "var(--corPrincipal)";
                setorDinamico.style.background = "var(--corSecundaria)";
            } else {
                checkbox.checked = false;
                select.value = "nao";
                select.style.color = "var(--corSecundaria)";
                select.style.borderColor = "var(--corSecundaria)";
                setorName.style.color = "var(--corSecundaria)";
                setorDinamico.style.background = "";
            }
        });
        select.addEventListener("change", function () {
            if (this.value === "sim") {
                checkbox.checked = true;
                checkbox.style.backgroundColor = "var(--corPrincipal)";
                select.style.color = "var(--corPrincipal)";
                select.style.borderColor = "var(--corPrincipal)";
                setorName.style.color = "var(--corPrincipal)";
                setorDinamico.style.background = "var(--corSecundaria)";
            } else {
                checkbox.checked = false;
                select.style.color = "var(--corSecundaria)";
                select.style.borderColor = "var(--corSecundaria)";
                setorName.style.color = "var(--corSecundaria)";
                setorDinamico.style.background = "";
            }
        });
    });
}
async function consultarUsers() {
    try {
        const response = await fetch("/api/empresa/usuarios", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}
async function exibirUsers() {
    mostrarLoading();
    const data = await consultarUsers();
    const containerUsers = document.querySelector(".containerUsers");
    containerUsers.innerHTML = "";
    data.forEach(user => {
        const lineUser = document.createElement('div');
        lineUser.classList.add('lineUser');
        lineUser.id = `lineUser-${data.id}`;
        const nomeUser = document.createElement('p');
        nomeUser.textContent = user.nome;
        nomeUser.title = user.nome;
        lineUser.appendChild(nomeUser);
        const setorUser = document.createElement('p');
        const setores = user.setores;
        setores.forEach(setor => {
            setorUser.textContent += setor.nome + "; ";
            setorUser.title += setor.nome + "; ";
        });
        lineUser.appendChild(setorUser);
        const emailUser = document.createElement('p');
        emailUser.textContent = user.email;
        emailUser.title = user.email;
        lineUser.appendChild(emailUser);
        const telefoneUser = document.createElement('p');
        telefoneUser.textContent = user.telefone;
        lineUser.appendChild(telefoneUser);
        const whatsappUser = document.createElement('p');
        whatsappUser.textContent = user.whatsapp;
        lineUser.appendChild(whatsappUser);
        const registroUser = document.createElement('p');
        registroUser.textContent = user.registro;
        lineUser.appendChild(registroUser);
        const editarUser = document.createElement('p');
        const iconEditar = document.createElement('i');
        iconEditar.classList.add('fa-solid', 'fa-user-gear');
        iconEditar.addEventListener('click', () => abrirPopupEditUser(user.id));
        editarUser.appendChild(iconEditar);
        lineUser.appendChild(editarUser);
        const excluirUser = document.createElement('p');
        const iconExcluir = document.createElement('i');
        iconExcluir.classList.add('fa-solid', 'fa-user-xmark');
        iconExcluir.addEventListener('click', () => deleteUser(user.id));
        excluirUser.appendChild(iconExcluir);
        lineUser.appendChild(excluirUser);
        containerUsers.appendChild(lineUser);
    });
    esconderLoading();
    return data;
}
async function deleteUser(id_usuario) {
    // Confirmação do usuário é uma ótima prática de UX antes de uma ação destrutiva.  

    if (!confirm(`Tem certeza de que deseja excluir o usuário? Esta ação não pode ser desfeita.`)) {
        return; // O usuário cancelou a ação.
    }
    try {
        const response = await fetch(`/api/empresa/usuarios?usuario_id=${id_usuario}`, {
            method: "DELETE",
            headers: {
                // 2. O cabeçalho de autorização é essencial para rotas protegidas.
                "Authorization": `Bearer ${token}`
            }
        });
        if (response.ok) {
            abrirPopupResposta("Ação concluída", "Usuário excluído com sucesso!");
            mostrarLoading();
            exibirUsers();
        } else {
            // Se a exclusão falhar (ex: usuário não encontrado, falta de permissão).
            const errorData = await response.json(); // FastAPI envia um JSON com o erro.
            abrirPopupResposta("Ação interrompida", `Falha ao excluir o usuário!`);
            esconderLoading();
            console.error("Erro ao excluir:", errorData);
        }
    } catch (error) {
        console.error(error);
        abrirPopupResposta("Ação interrompida", "Falha ao excluir o usuário.");
    }
}

//POPUP DE EDITAR USUÁRIO
//POPUP DE EDITAR USUÁRIO
//POPUP DE EDITAR USUÁRIO
async function abrirPopupEditUser(id) {
    await preencherSetoresUser();
    const dialog = document.querySelector(".popupEditarUser");
    dialog.setAttribute("data-id", id);
    atualizarUsuario(id);
    if (!dialog.open) {
        dialog.showModal();
        requestAnimationFrame(() => {
            dialog.classList.add("aberto");
        });
    }
}
async function atualizarUsuario(id) {
    var inputNome = document.getElementById("inputNomeUser");
    var inputRegistro = document.getElementById("inputRegistroUser");
    var inputWhatsapp = document.getElementById("inputWhatsappUser");
    var inputTelefone = document.getElementById("inputTelefoneUser");
    var inputEmail = document.getElementById("inputEmailUser");
    const mesmoNumeroCheckbox = document.getElementById("mesmoNumero"); // Adicionei a seleção do checkbox

    // Os "users" são carregados apenas para preencher o formulário, não para enviar de volta
    const users = await exibirUsers(); // Certifique-se que esta função retorna os usuários.

    // Encontre o usuário específico pelo ID
    const userParaEditar = users.find(user => user.id === id);

    if (userParaEditar) {
        // Preencher os campos de texto
        inputNome.value = userParaEditar.nome;
        inputRegistro.value = userParaEditar.registro;
        inputWhatsapp.value = userParaEditar.whatsapp;
        inputTelefone.value = userParaEditar.telefone;
        inputEmail.value = userParaEditar.email;

        // Se o telefone fixo for igual ao whatsapp, marque o checkbox "Mesmo do Whatsapp"
        if (userParaEditar.telefone === userParaEditar.whatsapp && userParaEditar.telefone !== "") {
            mesmoNumeroCheckbox.checked = true;
        } else {
            mesmoNumeroCheckbox.checked = false;
        }

        // Resetar todas as seleções de setores para garantir que não haja sobras de edições anteriores
        const todosOsSetoresDinamicos = document.querySelectorAll(".setorDinamico");
        todosOsSetoresDinamicos.forEach(setorDiv => {
            const checkbox = setorDiv.querySelector("input[type='checkbox']");
            const select = setorDiv.querySelector("select");

            if (checkbox) checkbox.checked = false;
            if (select) select.value = "nao"; // Assume 'nao' como valor padrão

            // Resetar estilos visuais se necessário
            const setorName = setorDiv.querySelector(".setorName");
            if (checkbox) checkbox.style.backgroundColor = "";
            if (select) select.style.color = "var(--corSecundaria)";
            if (select) select.style.borderColor = "var(--corSecundaria)";
            if (setorName) setorName.style.color = "var(--corSecundaria)";
            setorDiv.style.background = "";
        });

        // Iterar sobre os setores DO USUÁRIO e marcar os elementos correspondentes
        userParaEditar.setores.forEach(setorDoUsuario => {
            // Encontrar o elemento setorDinamico que corresponde ao ID do setor do usuário
            const setorDinamicoElement = document.querySelector(`.setorDinamico[data-id="${setorDoUsuario.id}"]`);

            if (setorDinamicoElement) {
                const selectGestor = setorDinamicoElement.querySelector(`.selectGestorUser-${setorDoUsuario.id}`);
                const checkbox = setorDinamicoElement.querySelector(`input[type='checkbox']`);

                if (checkbox) {
                    checkbox.checked = true;
                    // Aplicar os estilos visuais quando o checkbox é marcado
                    checkbox.style.backgroundColor = "var(--corPrincipal)";
                    const setorName = setorDinamicoElement.querySelector(".setorName");
                    setorName.style.color = "var(--corPrincipal)";
                    setorDinamicoElement.style.background = "var(--corSecundaria)";
                }

                if (selectGestor) {
                    selectGestor.value = setorDoUsuario.gestor ? "sim" : "nao";
                    // Aplicar os estilos visuais quando o select é alterado
                    selectGestor.style.color = "var(--corPrincipal)";
                    selectGestor.style.borderColor = "var(--corPrincipal)";
                }
            }
        });
    } else {
        console.warn(`Usuário com ID ${id} não encontrado.`);
    }
}

async function salvarUsuarioEditado() {
    // Coleta os dados dos campos de entrada
    popupUser = document.querySelector(".popupEditarUser");
    const currentEditingUserId = popupUser.getAttribute("data-id");;
    if (!currentEditingUserId) {
        console.error("ID do usuário a ser editado não encontrado.");
        return;
    }

    const inputNome = document.getElementById("inputNomeUser").value;
    const inputRegistro = document.getElementById("inputRegistroUser").value;
    const inputWhatsapp = document.getElementById("inputWhatsappUser").value;
    const inputTelefone = document.getElementById("inputTelefoneUser").value;
    const inputEmail = document.getElementById("inputEmailUser").value;
    const mesmoNumeroCheckbox = document.getElementById("mesmoNumero");

    // Lógica para sincronizar telefone fixo se o checkbox "Mesmo do Whatsapp" estiver marcado
    let telefoneParaEnviar = inputTelefone;
    if (mesmoNumeroCheckbox.checked) {
        telefoneParaEnviar = inputWhatsapp;
    }

    // Coleta os setores selecionados
    const setoresSelecionados = [];
    const todosOsSetoresDinamicos = document.querySelectorAll(".setorDinamico");

    todosOsSetoresDinamicos.forEach(setorDiv => {
        const checkbox = setorDiv.querySelector("input[type='checkbox']");
        const select = setorDiv.querySelector("select");
        const setorId = parseInt(setorDiv.getAttribute('data-id')); // Converte para número

        if (checkbox && checkbox.checked && setorId) {
            setoresSelecionados.push({
                id: setorId,
                gestor: select ? (select.value === "sim") : false // Garante que é um booleano
            });
        }
    });

    const payload = {
        id: currentEditingUserId,
        nome: inputNome,
        email: inputEmail,
        registro: inputRegistro,
        whatsapp: inputWhatsapp,
        telefone: telefoneParaEnviar,
        setores: setoresSelecionados // A lista de objetos {id: ..., gestor: ...}
    };

    // Fetch para rota de atualização
    try {
        const response = await fetch(`/api/empresa/usuarios/${currentEditingUserId}`, { // A URL está correta
            // 1. Corrigido para PUT, para corresponder ao @router.put
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                // 2. Adicionado cabeçalho de autorização, essencial para rotas protegidas
                "Authorization": `Bearer ${token}`
            },
            // 3. O corpo agora corresponde exatamente ao que o payload 'UserUpdate' espera
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            abrirPopupResposta("Ação concluída", "Usuário atualizado com sucesso!");
            fecharPopupEditarUser();
            // Você pode otimizar isso para não recarregar a página inteira,
            // mas por enquanto, recarregar os dados funciona.
            mostrarLoading();
            exibirUsers();
        } else {
            // Se a resposta não for 'ok', tente ler o JSON de erro para uma mensagem mais clara
            const errorData = await response.json();
            // O detalhe do erro do FastAPI geralmente vem em `errorData.detail`
            abrirPopupResposta("Ação interrompida", `Falha ao atualizar o usuário! Tente novamente mais tarde.`);
            console.error("Erro na atualização:", errorData);
        }
    } catch (error) {
        console.error("Erro ao fazer a requisição de atualização:", error);
        abrirPopupResposta("Ação interrompida", "Ocorreu um erro de rede ao tentar atualizar o usuário.");
    }
}
function fecharPopupEditarUser() {
    const dialog = document.querySelector(".popupEditarUser");
    dialog.classList.remove("aberto");
    setTimeout(() => {
        dialog.close();
    }, 500);
}
async function preencherSetoresUser() {
    const data = await dadosEmpresa();
    const containerSetores = document.querySelector(".blockSetorUser");
    containerSetores.innerHTML = "";
    data.setores.forEach(setor => {
        // Cria a div principal
        const setorDinamico = document.createElement("div");
        setorDinamico.classList.add("setorDinamico");
        setorDinamico.setAttribute("data-id", setor.id);
        // Cria <p class="setorName"> com o nome do setor
        const setorName = document.createElement("p");
        setorName.classList.add("setorName");
        setorName.textContent = setor.nome;
        setorDinamico.appendChild(setorName);
        // Cria a div do select
        const boxSelectGestor = document.createElement("div");
        boxSelectGestor.classList.add("boxSelectGestor");
        // Cria o <select class="selectGestor">
        const select = document.createElement("select");
        select.classList.add("selectGestorUser", `selectGestorUser-${setor.id}`);
        const optionNao = document.createElement("option");
        optionNao.value = "nao";
        optionNao.textContent = "Não";
        optionNao.selected = true;
        const optionSim = document.createElement("option");
        optionSim.value = "sim";
        optionSim.textContent = "Sim";
        select.appendChild(optionNao);
        select.appendChild(optionSim);
        boxSelectGestor.appendChild(select);
        setorDinamico.appendChild(boxSelectGestor);
        // Cria a div da checkbox
        const checkboxRound = document.createElement("div");
        checkboxRound.classList.add("checkbox-round");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `roundCheckbox-${setor.id}`; // ID único por setor
        const label = document.createElement("label");
        label.setAttribute("for", checkbox.id);
        checkboxRound.appendChild(checkbox);
        checkboxRound.appendChild(label);
        setorDinamico.appendChild(checkboxRound);
        containerSetores.appendChild(setorDinamico);
        // EVENT LISTENERS — escopo correto
        checkbox.addEventListener("change", function () {
            if (checkbox.checked) {
                checkbox.style.backgroundColor = "var(--corPrincipal)";
                select.style.color = "var(--corPrincipal)";
                select.style.borderColor = "var(--corPrincipal)";
                setorName.style.color = "var(--corPrincipal)";
                setorDinamico.style.background = "var(--corSecundaria)";
            } else {
                checkbox.checked = false;
                select.value = "nao";
                select.style.color = "var(--corSecundaria)";
                select.style.borderColor = "var(--corSecundaria)";
                setorName.style.color = "var(--corSecundaria)";
                setorDinamico.style.background = "";
            }
        });
        select.addEventListener("change", function () {
            if (this.value === "sim") {
                checkbox.checked = true;
                checkbox.style.backgroundColor = "var(--corPrincipal)";
                select.style.color = "var(--corPrincipal)";
                select.style.borderColor = "var(--corPrincipal)";
                setorName.style.color = "var(--corPrincipal)";
                setorDinamico.style.background = "var(--corSecundaria)";
            } else {
                checkbox.checked = false;
                select.style.color = "var(--corSecundaria)";
                select.style.borderColor = "var(--corSecundaria)";
                setorName.style.color = "var(--corSecundaria)";
                setorDinamico.style.background = "";
            }
        });
    });
}

async function abrirPopupEmpresa() {
    const dialog = document.querySelector(".popupEmpresa");
    await preencherPopupEmpresa();
    if (!dialog.open) {
        dialog.show();
        requestAnimationFrame(() => {
            dialog.classList.add("aberto");
        });
    }
}
function fecharPopupEditarEmpresa() {
    const dialog = document.querySelector(".popupEmpresa");
    dialog.classList.remove("aberto");
    setTimeout(() => {
        dialog.close();
    }, 500);
}
function aplicarDragAndDrop(container) {
    const draggables = container.querySelectorAll('.lineEtapas[draggable="true"]');
    let dragElement = null;

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => {
            dragElement = draggable;
            // Adiciona a classe para dar feedback visual
            setTimeout(() => draggable.classList.add('dragging'), 0);
        });

        draggable.addEventListener('dragend', () => {
            if (dragElement) {
                // Remove a classe ao final do arraste
                dragElement.classList.remove('dragging');
                dragElement = null;
            }
        });
    });

    container.addEventListener('dragover', e => {
        e.preventDefault(); // Essencial para permitir o 'drop'

        const afterElement = getDragAfterElement(container, e.clientY);
        const dragging = container.querySelector('.dragging');

        // NOVO: Pega a referência do primeiro elemento, que deve ser o fixo.
        const primeiraEtapa = container.firstElementChild;
        if (afterElement === primeiraEtapa) {
            return; // Impede a reordenação
        }

        if (dragging) {
            if (afterElement == null) {
                container.appendChild(dragging);
            } else {
                container.insertBefore(dragging, afterElement);
            }
        }
    });
}
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.lineEtapas:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
async function preencherPopupEmpresa() {
    const data = await dadosEmpresa();

    const inputNomeEmpresa = document.querySelector(".nomeEmpresa");
    inputNomeEmpresa.value = data.empresa.nomeEmpresa;

    const logoPreview = document.querySelector(".logoPreview");
    logoPreview.src = data.empresa.logo_url;

    const hiddenInput = document.getElementById('selectedColor');
    hiddenInput.value = data.empresa.cod_cor;
    colorOptions.querySelectorAll('.color-option').forEach(option => {
        hiddenInput.value = data.empresa.cod_cor;
        if (hiddenInput.value == option.getAttribute('data-value')) {
            option.classList.add('selected');
        }
    });

    //Criação dinâmica dos setores
    const containerSetores = document.querySelector(".containerEditarSetores");
    containerSetores.innerHTML = "";
    const setores = data.setores;
    setores.forEach((setor) => {
        // 1. Criar o elemento div.lineSetores
        const lineSetoresDiv = document.createElement('div');
        lineSetoresDiv.classList.add('lineSetores');
        lineSetoresDiv.setAttribute('data-id', setor.id);
        // 2. Criar o elemento input.inputSetor
        const inputSetor = document.createElement('input');
        inputSetor.type = 'text'; // Define o tipo do input como 'text'
        inputSetor.value = setor.nome;
        inputSetor.classList.add('inputSetor');
        // 3. Criar o segundo ícone (fa-solid fa-trash)
        const iconExcluirSetor = document.createElement('i');
        iconExcluirSetor.classList.add('fa-solid', 'fa-trash', 'iconExcluirSetor');
        // --- Event Listener para o Ícone de Exclusão/Cancelar ---
        iconExcluirSetor.addEventListener('click', () => {
            const setorParaExcluir = document.querySelector(`.lineSetores[data-id="${setor.id}"]`);
            const idSetorExcluido = setorParaExcluir.getAttribute('data-id');
            if (setorParaExcluir) {
                setorParaExcluir.remove(); // Remove o elemento do DOM
            }
        });
        // 5. Anexar os elementos filhos à div principal
        lineSetoresDiv.appendChild(inputSetor);
        lineSetoresDiv.appendChild(iconExcluirSetor);
        // 6.Adiciona 'lineSetoresDiv' ao container
        containerSetores.appendChild(lineSetoresDiv);
    });

    //Criação dos tipos de demanda
    const containerTipoDemanda = document.querySelector(".containerTipoDemanda");
    containerTipoDemanda.innerHTML = "";
    const tiposDemanda = data.areas;
    tiposDemanda.forEach((tipoDemanda) => {
        // 1. Criar o elemento <details> principal
        const detailsTipoDemanda = document.createElement('details');
        detailsTipoDemanda.classList.add('detailsTipoDemanda');
        if (tipoDemanda.id) { // Ou o nome do campo de ID que você usa, ex: tipoDemanda.idArea
            detailsTipoDemanda.setAttribute('data-id-area', tipoDemanda.id);
        } else {
            console.warn('Tipo de Demanda/Área sem ID:', tipoDemanda.nome_area);
        }
        // 2. Criar o elemento <summary>
        const summaryTipoDemanda = document.createElement('summary');
        summaryTipoDemanda.classList.add('summaryTipoDemanda');
        // 2.1. Criar o input dentro do <summary>
        const nomeTipoDemandaInput = document.createElement('input');
        nomeTipoDemandaInput.type = 'text';
        nomeTipoDemandaInput.classList.add('nomeTipoDemanda');
        nomeTipoDemandaInput.value = tipoDemanda.nome_area;
        // 2.2. Criar os ícones dentro do <summary>
        const iconDeleteDemandaSummary = document.createElement('i');
        iconDeleteDemandaSummary.classList.add('fa-solid', 'fa-delete-left', 'iconDeleteDemanda');
        const iconChevron = document.createElement('i');
        iconChevron.classList.add('fa-solid', 'fa-chevron-down', 'iconChevron');

        summaryTipoDemanda.addEventListener('click', (event) => {
            event.preventDefault(); // Impede que o <details> abra/feche com um clique no <summary>
        });
        iconChevron.addEventListener('click', (event) => {
            // Impede que o evento de clique se propague para o summary listener
            // Alterna manualmente o estado 'open' do <details>
            detailsTipoDemanda.open = !detailsTipoDemanda.open;
        });

        detailsTipoDemanda.addEventListener('toggle', () => {
            if (detailsTipoDemanda.open) {
                iconChevron.classList.remove('fa-chevron-down');
                iconChevron.classList.add('fa-chevron-up');
            } else {
                iconChevron.classList.remove('fa-chevron-up');
                iconChevron.classList.add('fa-chevron-down');
            }
        });

        // Anexar os elementos ao <summary>
        summaryTipoDemanda.appendChild(nomeTipoDemandaInput);
        summaryTipoDemanda.appendChild(iconDeleteDemandaSummary);
        summaryTipoDemanda.appendChild(iconChevron);
        // Anexar o <summary> ao <details>
        detailsTipoDemanda.appendChild(summaryTipoDemanda);
        // --- Event Listener para o Ícone de Exclusão/Cancelar (Lixeira/X) ---
        iconDeleteDemandaSummary.addEventListener('click', (event) => {
            // Previne que o evento de clique no ícone feche/abra o <details>
            // event.stopPropagation(); 
            event.preventDefault();
            // Se não estiver em modo de edição (clicou para EXCLUIR uma demanda existente)
            const demandaParaExcluir = iconDeleteDemandaSummary.closest('.detailsTipoDemanda');
            if (demandaParaExcluir) {
                demandaParaExcluir.remove(); // Remove o elemento do DOM
            }
        });
        // 3. Criar o <div> containerButtonAddEtapa
        const containerButtonAddEtapa = document.createElement('div');
        containerButtonAddEtapa.classList.add('containerButtonAddEtapa');
        // 3.1. Criar o <button> dentro de containerButtonAddEtapa
        const addEtapaButton = document.createElement('button');
        addEtapaButton.classList.add('addEtapa');
        addEtapaButton.textContent = 'Adicionar Etapa';
        // Anexar o botão ao seu container
        containerButtonAddEtapa.appendChild(addEtapaButton);
        addEtapaButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Evita que o clique no botão feche o details
            const containerEtapas = detailsTipoDemanda.querySelector('.containerEtapas');
            // Chama a função addEtapa, passando os setores e o container de etapas
            addEtapa(setores, containerEtapas);
        });
        // Anexar o container do botão ao <details>
        detailsTipoDemanda.appendChild(containerButtonAddEtapa);
        // 4. Criar o <div> containerEtapas
        const containerEtapas = document.createElement('div');
        containerEtapas.classList.add('containerEtapas');
        const etapasOrdenadas = [...tipoDemanda.modelos_etapa].sort((a, b) => a.numero_etapa - b.numero_etapa);
        //Criação das etapas
        etapasOrdenadas.forEach((etapa) => {
            // 4.1. Criar o <div> lineEtapas
            const lineEtapas = document.createElement('div');
            lineEtapas.classList.add('lineEtapas');
            // NOVO: Criar o ícone para arrastar (drag handle)
            const iconDrag = document.createElement('i');
            iconDrag.classList.add('fa-solid', 'fa-bars', 'drag-handle');
            if (etapa.numero_etapa != 1) {
                lineEtapas.appendChild(iconDrag);
                lineEtapas.setAttribute('draggable', true);
            }
            // 4.1.1. Criar o <div> containerNomeEtapa
            const containerNomeEtapa = document.createElement('div');
            containerNomeEtapa.classList.add('containerNomeEtapa');
            // 4.1.1.1. Criar o <p> e o <input> dentro de containerNomeEtapa
            const pNome = document.createElement('p');
            pNome.textContent = 'Nome:';
            const inputNomeEtapa = document.createElement('input');
            inputNomeEtapa.type = 'text';
            inputNomeEtapa.classList.add('nomeEtapa');
            inputNomeEtapa.value = etapa.nome_etapa;
            // Anexar <p> e <input> a containerNomeEtapa
            containerNomeEtapa.appendChild(pNome);
            containerNomeEtapa.appendChild(inputNomeEtapa);
            // Anexar containerNomeEtapa a lineEtapas
            lineEtapas.appendChild(containerNomeEtapa);
            // 4.1.2. Criar o <div> containerSetoresEtapa
            const containerSetoresEtapa = document.createElement('div');
            containerSetoresEtapa.classList.add('containerSetoresEtapa');
            // 4.1.2.1. Criar o <p> e o <select> dentro de containerSetoresEtapa
            const pSetores = document.createElement('p');
            pSetores.textContent = 'Setores:';
            const selectSetoresEtapa = document.createElement('select');
            selectSetoresEtapa.classList.add('setoresEtapa');
            setores.forEach((setor) => {
                //Criação dos options do select de setores das etapas
                const option = document.createElement('option');
                option.textContent = setor.nome;
                if (option.textContent === etapa.setor) {
                    option.selected = true;
                }
                selectSetoresEtapa.appendChild(option);
            });
            // Anexar <p> e <select> a containerSetoresEtapa
            containerSetoresEtapa.appendChild(pSetores);
            containerSetoresEtapa.appendChild(selectSetoresEtapa);
            // Anexar containerSetoresEtapa a lineEtapas
            lineEtapas.appendChild(containerSetoresEtapa);
            // 4.1.3. Criar os ícones finais dentro de lineEtapas
            const iconDeleteDemandaLine = document.createElement('i');
            iconDeleteDemandaLine.classList.add('fa-solid', 'fa-delete-left', 'iconDeleteEtapa');

            // --- Event Listener para o Ícone de Exclusão/Cancelar da Etapa (Lixeira/X) ---
            iconDeleteDemandaLine.addEventListener('click', () => {
                // Se não estiver em modo de edição (clicou para EXCLUIR uma etapa existente)
                const etapaParaExcluir = iconDeleteDemandaLine.closest('.lineEtapas');
                if (etapaParaExcluir) {
                    etapaParaExcluir.remove(); // Remove o elemento do DOM
                }
            });
            //Criação da checkbox de validação da etapa
            const containerValidacaoEtapa = document.createElement('div');
            containerValidacaoEtapa.classList.add('containerValidacaoEtapa');
            const pValidacaoEtapa = document.createElement('p');
            pValidacaoEtapa.textContent = 'Validação:';
            const checkboxEtapa = document.createElement('input');
            checkboxEtapa.type = 'checkbox';
            checkboxEtapa.classList.add('checkboxEtapa');
            checkboxEtapa.checked = etapa.validacao;
            containerValidacaoEtapa.appendChild(pValidacaoEtapa);
            containerValidacaoEtapa.appendChild(checkboxEtapa);
            lineEtapas.appendChild(containerValidacaoEtapa);
            // Anexar os ícones a lineEtapas
            lineEtapas.appendChild(iconDeleteDemandaLine);
            // Anexar lineEtapas a containerEtapas
            containerEtapas.appendChild(lineEtapas);
        });
        // Anexar containerEtapas ao <details> principal
        detailsTipoDemanda.appendChild(containerEtapas);
        aplicarDragAndDrop(containerEtapas);
        containerTipoDemanda.appendChild(detailsTipoDemanda);
    });
}


function addSetor() {
    const containerSetores = document.querySelector(".containerEditarSetores");
    // 1. Criar o elemento div.lineSetores
    const lineSetoresDiv = document.createElement('div');
    lineSetoresDiv.classList.add('lineSetores');
    // 2. Criar o elemento input.inputSetor
    const inputSetor = document.createElement('input');
    inputSetor.type = 'text';
    inputSetor.classList.add('inputSetor');
    // 4. Criar o ícone de exclusão/cancelar (fa-solid fa-trash)
    const iconExcluirSetor = document.createElement('i');
    // ATUALIZADO: Inicia com o ícone de 'xmark' para o modo de adição/cancelar
    iconExcluirSetor.classList.add('fa-solid', 'fa-trash', 'iconExcluirSetor');

    // --- Event Listener para o Ícone de Exclusão/Cancelar ('xmark' ou 'trash') ---
    iconExcluirSetor.addEventListener('click', () => {
        // Se não estiver em modo de edição (clicou para EXCLUIR uma linha existente)
        const setorParaExcluir = iconExcluirSetor.closest('.lineSetores');
        if (setorParaExcluir) {
            setorParaExcluir.remove(); // Remove o elemento do DOM
        }
    });
    // 5. Anexar os elementos filhos à div principal
    lineSetoresDiv.appendChild(inputSetor);
    lineSetoresDiv.appendChild(iconExcluirSetor);
    // 6. Adiciona 'lineSetoresDiv' ao container
    containerSetores.appendChild(lineSetoresDiv);
    // --- Ações Pós-Criação para Modo de Edição Inicial ---
    inputSetor.focus(); // Coloca o foco no input
}
let tempAreaIdCounter = 0;

async function addTipoDemanda() {
    const data = await dadosEmpresa();
    const setores = data.setores; // Pegamos os setores para passar para addEtapa
    const containerTipoDemanda = document.querySelector(".containerTipoDemanda");
    // 1. Criar o elemento <details> principal
    const detailsTipoDemanda = document.createElement('details');
    detailsTipoDemanda.classList.add('detailsTipoDemanda');
    detailsTipoDemanda.setAttribute('open', true); // Abre o details por padrão para edição inicial
    // --- LÓGICA DE GERAÇÃO E ATRIBUIÇÃO DO ID ---
    // NOVO: Decrementa o contador para obter um número negativo único (-1, -2, etc.)
    tempAreaIdCounter--;
    const novoIdTemporario = tempAreaIdCounter;
    // NOVO: Atribui o ID temporário ao atributo data-id-area
    detailsTipoDemanda.setAttribute('data-id-area', novoIdTemporario);
    // 2. Criar o elemento <summary>
    const summaryTipoDemanda = document.createElement('summary');
    summaryTipoDemanda.classList.add('summaryTipoDemanda');
    // 2.1. Criar o input dentro do <summary>
    const nomeTipoDemandaInput = document.createElement('input');
    nomeTipoDemandaInput.type = 'text';
    nomeTipoDemandaInput.classList.add('nomeTipoDemanda');
    // 2.2. Criar os ícones dentro do <summary>
    const iconDeleteDemandaSummary = document.createElement('i');
    iconDeleteDemandaSummary.classList.add('fa-solid', 'fa-delete-left', 'iconDeleteDemanda');
    const iconChevron = document.createElement('i');
    iconChevron.classList.add('fa-solid', 'fa-chevron-down', 'iconChevron');

    summaryTipoDemanda.addEventListener('click', (event) => {
        event.preventDefault(); // Impede que o <details> abra/feche com um clique no <summary>
    });
    iconChevron.addEventListener('click', (event) => {
        // Impede que o evento de clique se propague para o summary listener
        // Alterna manualmente o estado 'open' do <details>
        detailsTipoDemanda.open = !detailsTipoDemanda.open;
    });
    detailsTipoDemanda.addEventListener('toggle', () => {
        if (detailsTipoDemanda.open) {
            iconChevron.classList.remove('fa-chevron-down');
            iconChevron.classList.add('fa-chevron-up');
        } else {
            iconChevron.classList.remove('fa-chevron-up');
            iconChevron.classList.add('fa-chevron-down');
        }
    });

    // Anexar os elementos ao <summary>
    summaryTipoDemanda.appendChild(nomeTipoDemandaInput);
    summaryTipoDemanda.appendChild(iconDeleteDemandaSummary);
    summaryTipoDemanda.appendChild(iconChevron);
    // Anexar o <summary> ao <details>
    detailsTipoDemanda.appendChild(summaryTipoDemanda);

    // --- Event Listener para o Ícone de Exclusão/Cancelar (Lixeira/X) ---
    iconDeleteDemandaSummary.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        const demandaParaExcluir = iconDeleteDemandaSummary.closest('.detailsTipoDemanda');
        if (demandaParaExcluir) {
            demandaParaExcluir.remove();
        }
    });
    // 3. Criar o <div> containerButtonAddEtapa
    const containerButtonAddEtapa = document.createElement('div');
    containerButtonAddEtapa.classList.add('containerButtonAddEtapa');
    // 3.1. Criar o <button> dentro de containerButtonAddEtapa
    const addEtapaButton = document.createElement('button');
    addEtapaButton.classList.add('addEtapa');
    addEtapaButton.textContent = 'Adicionar Etapa';
    // --- NOVO: Event listener para o botão de Adicionar Etapa ---
    addEtapaButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Evita que o clique no botão feche o details
        const containerEtapas = detailsTipoDemanda.querySelector('.containerEtapas');
        // Chama a função addEtapa, passando os setores e o container de etapas
        addEtapa(setores, containerEtapas);
    });
    // Anexar o botão ao seu container
    containerButtonAddEtapa.appendChild(addEtapaButton);
    // Anexar o container do botão ao <details>
    detailsTipoDemanda.appendChild(containerButtonAddEtapa);
    // 4. Criar o <div> containerEtapas
    const containerEtapas = document.createElement('div');
    containerEtapas.classList.add('containerEtapas');

    //CRIAÇÃO DE ETAPA DE CRIAÇÃO DE DEMANDA NATIVAMENTE
    // 4.1. Criar o <div> lineEtapas
    const lineEtapas = document.createElement('div');
    lineEtapas.classList.add('lineEtapas');
    lineEtapas.setAttribute('draggable', true);
    // 4.1.1. Criar o <div> containerNomeEtapa
    // 4.1.1. Criar o <div> containerNomeEtapa
    const containerNomeEtapa = document.createElement('div');
    containerNomeEtapa.classList.add('containerNomeEtapa');
    // 4.1.1.1. Criar o <p> e o <input> dentro de containerNomeEtapa
    const pNome = document.createElement('p');
    pNome.textContent = 'Nome:';
    const inputNomeEtapa = document.createElement('input');
    inputNomeEtapa.type = 'text';
    inputNomeEtapa.value = 'Criação de Demanda';
    inputNomeEtapa.classList.add('nomeEtapa');
    // Anexar <p> e <input> a containerNomeEtapa
    containerNomeEtapa.appendChild(pNome);
    containerNomeEtapa.appendChild(inputNomeEtapa);
    // Anexar containerNomeEtapa a lineEtapas
    lineEtapas.appendChild(containerNomeEtapa);
    // 4.1.3. Criar os ícones finais dentro de lineEtapas
    const iconDeleteEtapa = document.createElement('i');
    iconDeleteEtapa.classList.add('fa-solid', 'fa-delete-left', 'iconDeleteEtapa'); // Inicia com 'xmark'
    // Criação da checkbox de validação da etapa
    const containerValidacaoEtapa = document.createElement('div');
    containerValidacaoEtapa.classList.add('containerValidacaoEtapa');
    const pValidacaoEtapa = document.createElement('p');
    pValidacaoEtapa.textContent = 'Validação:';
    const checkboxEtapa = document.createElement('input');
    checkboxEtapa.type = 'checkbox';
    checkboxEtapa.classList.add('checkboxEtapa');

    containerValidacaoEtapa.appendChild(pValidacaoEtapa);
    containerValidacaoEtapa.appendChild(checkboxEtapa);
    lineEtapas.appendChild(containerValidacaoEtapa);
    // Anexar os ícones a lineEtapas
    lineEtapas.appendChild(iconDeleteEtapa);
    // --- Event Listener para o Ícone de Exclusão/Cancelar da Etapa (Lixeira/X) ---
    iconDeleteEtapa.addEventListener('click', () => {
        // Se não estiver em modo de edição (clicou para EXCLUIR uma etapa existente)
        const etapaParaExcluir = iconDeleteEtapa.closest('.lineEtapas');
        if (etapaParaExcluir) {
            abrirPopupResposta("Ação interrompida", 'Não é possível excluir a etapa de criação de demanda.');
        }
    });
    // Anexar lineEtapas ao containerEtapas
    containerEtapas.appendChild(lineEtapas);
    // --- Ações Pós-Criação para Modo de Edição Inicial ---
    inputNomeEtapa.focus(); // Coloca o foco no input

    // Anexar containerEtapas ao <details> principal
    detailsTipoDemanda.appendChild(containerEtapas);
    aplicarDragAndDrop(containerEtapas);
    // Anexar o <details> completo ao container principal
    containerTipoDemanda.appendChild(detailsTipoDemanda);
    // --- Ações Pós-Criação para Modo de Edição Inicial ---
    nomeTipoDemandaInput.focus();
}

function addEtapa(setores, containerEtapas) {
    // 4.1. Criar o <div> lineEtapas
    const lineEtapas = document.createElement('div');
    lineEtapas.classList.add('lineEtapas');
    lineEtapas.setAttribute('draggable', true);
    // NOVO: Criar o ícone para arrastar (drag handle)
    const iconDrag = document.createElement('i');
    iconDrag.classList.add('fa-solid', 'fa-bars', 'drag-handle');
    // 4.1.1. Criar o <div> containerNomeEtapa
    const containerNomeEtapa = document.createElement('div');
    containerNomeEtapa.classList.add('containerNomeEtapa');
    // 4.1.1.1. Criar o <p> e o <input> dentro de containerNomeEtapa
    const pNome = document.createElement('p');
    pNome.textContent = 'Nome:';
    const inputNomeEtapa = document.createElement('input');
    inputNomeEtapa.type = 'text';
    inputNomeEtapa.classList.add('nomeEtapa');
    // Anexar <p> e <input> a containerNomeEtapa
    containerNomeEtapa.appendChild(pNome);
    containerNomeEtapa.appendChild(inputNomeEtapa);
    // Anexar containerNomeEtapa a lineEtapas
    lineEtapas.appendChild(iconDrag);
    lineEtapas.appendChild(containerNomeEtapa);
    // 4.1.2. Criar o <div> containerSetoresEtapa
    const containerSetoresEtapa = document.createElement('div');
    containerSetoresEtapa.classList.add('containerSetoresEtapa');
    // 4.1.2.1. Criar o <p> e o <select> dentro de containerSetoresEtapa
    const pSetores = document.createElement('p');
    pSetores.textContent = 'Setores:';
    const selectSetoresEtapa = document.createElement('select');
    selectSetoresEtapa.classList.add('setoresEtapa');
    setores.forEach((setor) => {
        const option = document.createElement('option');
        option.textContent = setor.nome;
        selectSetoresEtapa.appendChild(option);
    });
    // Anexar <p> e <select> a containerSetoresEtapa
    containerSetoresEtapa.appendChild(pSetores);
    containerSetoresEtapa.appendChild(selectSetoresEtapa);
    // Anexar containerSetoresEtapa a lineEtapas
    lineEtapas.appendChild(containerSetoresEtapa);
    // 4.1.3. Criar os ícones finais dentro de lineEtapas
    const iconDeleteEtapa = document.createElement('i');
    iconDeleteEtapa.classList.add('fa-solid', 'fa-delete-left', 'iconDeleteEtapa'); // Inicia com 'xmark'
    // Criação da checkbox de validação da etapa
    const containerValidacaoEtapa = document.createElement('div');
    containerValidacaoEtapa.classList.add('containerValidacaoEtapa');
    const pValidacaoEtapa = document.createElement('p');
    pValidacaoEtapa.textContent = 'Validação:';
    const checkboxEtapa = document.createElement('input');
    checkboxEtapa.type = 'checkbox';
    checkboxEtapa.classList.add('checkboxEtapa');
    containerValidacaoEtapa.appendChild(pValidacaoEtapa);
    containerValidacaoEtapa.appendChild(checkboxEtapa);
    lineEtapas.appendChild(containerValidacaoEtapa);
    // Anexar os ícones a lineEtapas
    lineEtapas.appendChild(iconDeleteEtapa);
    // --- Event Listener para o Ícone de Exclusão/Cancelar da Etapa (Lixeira/X) ---
    iconDeleteEtapa.addEventListener('click', () => {
        // Se não estiver em modo de edição (clicou para EXCLUIR uma etapa existente)
        const etapaParaExcluir = iconDeleteEtapa.closest('.lineEtapas');
        if (etapaParaExcluir) {
            etapaParaExcluir.remove(); // Remove o elemento do DOM
        }
    });
    // Anexar lineEtapas ao containerEtapas
    containerEtapas.appendChild(lineEtapas);
    aplicarDragAndDrop(containerEtapas);
    // --- Ações Pós-Criação para Modo de Edição Inicial ---
    inputNomeEtapa.focus(); // Coloca o foco no input
}

//Função de salvar alterações da empresa
async function salvarAlteracoesEmpresa() {
    mostrarLoading();
    const dadosParaSalvar = {
        setores: [],
        tiposDeDemanda: [],
        empresa: []
    };
    // 1. Coletar nome da empresa
    const nomeEmpresaInput = document.querySelector('.nomeEmpresa');
    const nomeEmpresa = nomeEmpresaInput ? nomeEmpresaInput.value.trim() : '';
    // 2. Coletar logo da empresa (base64, se houver)
    const logoInput = document.querySelector('.logoEmpresa');
    let logoBase64 = '';
    if (logoInput && logoInput.files.length > 0) {
        const file = logoInput.files[0];
        logoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file); // Lê como base64
        });
    }
    // 3. Coletar cor selecionada
    const selectedColorElement = document.querySelector('#colorOptions .color-option.selected');
    const corSelecionada = selectedColorElement ? parseInt(selectedColorElement.getAttribute('data-value')) : null;
    // 4. Adicionar dados da empresa ao array
    dadosParaSalvar.empresa.push({
        nome: nomeEmpresa,
        logo: logoBase64 || null,
        cor: corSelecionada
    });

    // 1. Coletar dados dos Setores
    const containerSetores = document.querySelector(".containerEditarSetores");
    if (containerSetores) {
        const lineSetoresElements = containerSetores.querySelectorAll(".lineSetores");
        lineSetoresElements.forEach(lineSetorDiv => {
            const id = lineSetorDiv.getAttribute('data-id'); // Pega o ID (pode ser temporário ou permanente)
            const inputSetor = lineSetorDiv.querySelector('.inputSetor');
            const nome = inputSetor ? inputSetor.value : '';
            dadosParaSalvar.setores.push({
                id,
                nome
            });
        });
    }
    // 2. Coletar dados dos Tipos de Demanda e suas Etapas
    const containerTipoDemanda = document.querySelector(".containerTipoDemanda");
    if (containerTipoDemanda) {
        const detailsTipoDemandaElements = containerTipoDemanda.querySelectorAll(".detailsTipoDemanda");
        detailsTipoDemandaElements.forEach(detailsElement => {
            const idArea = detailsElement.getAttribute('data-id-area') || null; // Pega o ID da área
            const summaryElement = detailsElement.querySelector('.summaryTipoDemanda');
            const nomeTipoDemandaInput = summaryElement ? summaryElement.querySelector('.nomeTipoDemanda') : null;
            const nomeArea = nomeTipoDemandaInput ? nomeTipoDemandaInput.value : '';
            const tipoDemandaAtual = {
                id: idArea,
                nome_area: nomeArea,
                etapas: []
            };
            const containerEtapas = detailsElement.querySelector('.containerEtapas');
            if (containerEtapas) {
                const lineEtapasElements = containerEtapas.querySelectorAll('.lineEtapas');
                lineEtapasElements.forEach((lineEtapaDiv, index) => {
                    const inputNomeEtapa = lineEtapaDiv.querySelector('.nomeEtapa');
                    const selectSetoresEtapa = lineEtapaDiv.querySelector('.setoresEtapa');
                    const checkboxEtapa = lineEtapaDiv.querySelector('.checkboxEtapa');
                    const nomeEtapa = inputNomeEtapa ? inputNomeEtapa.value : '';
                    const setorSelecionado = selectSetoresEtapa ? selectSetoresEtapa.value : '';
                    const validacao = checkboxEtapa ? checkboxEtapa.checked : false;

                    tipoDemandaAtual.etapas.push({
                        nomeEtapa: nomeEtapa,
                        setor: setorSelecionado,
                        validacao: validacao,
                        numero_etapa: index + 1 // ← Numeração aqui
                    });
                });
            }
            dadosParaSalvar.tiposDeDemanda.push(tipoDemandaAtual);
        });
    }
    try {
        const response = await fetch("/api/empresa/configuracao", {
            // 1. Método corrigido para PUT
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                // 2. Cabeçalho de autenticação adicionado
                "Authorization": `Bearer ${token}`
            },
            // 3. Corpo (payload) com a estrutura corrigida
            body: JSON.stringify({
                // A API espera um objeto, não um array de objetos
                empresa: dadosParaSalvar.empresa,
                // A chave deve ser 'setores', que já está correta
                setores: dadosParaSalvar.setores,
                // A chave provavelmente é 'areas' (plural) e não 'area'
                areas: dadosParaSalvar.tiposDeDemanda
            })
        });
        const result = await response.json();
        if (result != "Empresa atualizada com sucesso!") {
            esconderLoading();
            abrirPopupResposta("Ação interrompida", result);
            await preencherPopupEmpresa();
        } else {
            esconderLoading();
            await preencherPopupEmpresa();
            abrirPopupResposta("Ação concluída", result);
        }
    } catch (error) {
        console.error("Erro de rede ao salvar configuração:", error);
        esconderLoading();
        abrirPopupResposta("Ação interrompida", "Não foi possível conectar ao servidor para salvar as alterações.");
    }
}

const btnSalvarEdicao = document.querySelectorAll(".btnSalvarEdicao");
btnSalvarEdicao.forEach(botao => {
    botao.addEventListener("click", salvarAlteracoesEmpresa);
})

const blockSetorAreas = document.querySelector('.blockSetorAreas');
const blockCorNome = document.querySelector('.blockCorNome');
const btnEditarAreas = document.getElementById('editarAreas');
const btnEditarPersonalizacao = document.getElementById('editarPersonalizacao');
//Edição de cores e nome para setores e areas (Deslizamento para direita)
btnEditarAreas.addEventListener('click', function () {
    // Se o botão já estiver ativo, não faça nada
    if (btnEditarAreas.classList.contains('btn-ativo')) {
        return;
    }
    // Atualiza as classes dos botões
    btnEditarPersonalizacao.classList.remove('btn-ativo');
    btnEditarPersonalizacao.classList.add('btn-inativo');
    btnEditarAreas.classList.remove('btn-inativo');
    btnEditarAreas.classList.add('btn-ativo');

    blockCorNome.style.animation = "slideOutLeft 0.5s forwards";
    setTimeout(() => {
        blockCorNome.style.display = "none";
        blockSetorAreas.style.display = "flex";
        blockSetorAreas.style.animation = "slideInRight 0.5s forwards";
    }, 500);
});
//Edição de setores e areas para cores e nome (Deslizamento para esquerda)
btnEditarPersonalizacao.addEventListener('click', function () {
    // Se o botão já estiver ativo, não faça nada
    if (btnEditarPersonalizacao.classList.contains('btn-ativo')) {
        return;
    }
    // Atualiza as classes dos botões
    btnEditarAreas.classList.remove('btn-ativo');
    btnEditarAreas.classList.add('btn-inativo');
    btnEditarPersonalizacao.classList.remove('btn-inativo');
    btnEditarPersonalizacao.classList.add('btn-ativo');

    blockSetorAreas.style.animation = "slideOutRight 0.5s forwards";
    setTimeout(() => {
        blockSetorAreas.style.display = "none";
        blockCorNome.style.display = "flex";
        blockCorNome.style.animation = "slideInLeft 0.5s forwards";
    }, 500);
});
document.querySelector('.logoEmpresa').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const iframe = document.querySelector('.logoPreview');
    if (file) {
        const fileURL = URL.createObjectURL(file);
        iframe.src = fileURL;
    } else {
        iframe.src = "";
    }
});
const colorOptions = document.getElementById('colorOptions');
const hiddenInput = document.getElementById('selectedColor');
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
        } else if (valorInputCores == 2) {
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

async function dadosLog() {
    try {
        const response = await fetch("/api/logs", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erro ao buscar logs:", error);
        return null;
    }
}
async function preencherLogs() {
    const logs = await dadosLog();
    const containerLog = document.querySelector('.containerLog');
    const logsUser = logs.filter(log => log.user_id == currentUserId).slice(0, 10);//Filtra os últimos 10 logs do usuários
    logsUser.forEach(log => {
        // 1. Cria o elemento principal <div> com a classe "contentMsgLog"
        const contentMsgLog = document.createElement('div');
        contentMsgLog.className = 'contentMsgLog';
        // 2. Cria o <h3> para a ação
        const actionH3 = document.createElement('h3');
        actionH3.className = 'action';
        actionH3.textContent = log.action;
        // 3. Cria o <p> para os detalhes
        const detailsP = document.createElement('p');
        detailsP.className = 'details';
        detailsP.textContent = log.details;
        // 4. Cria a <div> container para as informações do usuário
        const containerUserLog = document.createElement('div');
        containerUserLog.className = 'containerUserLog';
        // 5. Cria o <h4> com o título "Usuário:"
        const titleUserLogH4 = document.createElement('h4');
        titleUserLogH4.className = 'titleUserLog';
        titleUserLogH4.textContent = 'Usuário:';
        // 6. Cria o <p> com o nome do usuário
        const nameUserLogP = document.createElement('p');
        nameUserLogP.className = 'nameUserLog';
        nameUserLogP.textContent = log.nome_user;
        // 7. Aninha os elementos de usuário (h4 e p) dentro do seu container
        containerUserLog.appendChild(titleUserLogH4);
        containerUserLog.appendChild(nameUserLogP);
        // 8. Cria o <p> final para a data
        const dateLogP = document.createElement('p');
        dateLogP.className = 'dateLog';
        dateLogP.textContent = log.timestamp;
        // 9. Aninha todos os elementos criados dentro do container principal "contentMsgLog"
        contentMsgLog.appendChild(actionH3);
        contentMsgLog.appendChild(detailsP);
        contentMsgLog.appendChild(containerUserLog);
        contentMsgLog.appendChild(dateLogP);
        containerLog.appendChild(contentMsgLog);
    })
    esconderLoading();
}
document.addEventListener('DOMContentLoaded', async () => {
    mostrarLoading();
    // Chama a função assim que a página carregar
    await preencherLogs();
});


async function enviarDemandas() {
    try {
        const response = await fetch("/api/demandas", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await response.json(); // Converte a resposta para JSON
        if (!response.ok) {
            throw new Error(`Erro ao buscar demandas: ${response.statusText}`);
        } else {
            return data;
        }
    } catch (error) {
        console.error("Erro ao carregar demandas:", error);
    }
}
let listaDemandas = [];
let listaUsuarios = [];
let usuariosFiltro = [];
let areasFiltro = [];
let etapasFiltro = [];
async function preencherPopupLogs() {
    mostrarLoading();
    try {
        const dados = await enviarDemandas();
        // Acessamos o array de demandas de dentro do objeto
        listaDemandas = dados.demandas;
        console.log("Preenchendo listaDemandas", listaDemandas);
        listaUsuarios = dados.usuarios_setor;
        // Busca os dados dos filtros e armazena nas variáveis
        const usuariosData = await consultarUsers();
        usuariosFiltro = usuariosData || []; // Garante que é um array
        const dadosArea = await dadosEmpresa();
        console.log(dadosArea);
        areasFiltro = dadosArea.areas || []; // Garante que é um array
        // Use flatMap para extrair 'modelos_etapa' de cada 'area' e achatar tudo em um único array 'etapasFiltro'.
        etapasFiltro = dadosArea.areas.flatMap(area => area.modelos_etapa || []); // Garante que é um array

        // Ação Padrão: Renderiza a tabela de Demandas e define a aba como ativa
        document.querySelector('.subTitleLogs:first-child').classList.add('aba-ativa');
        renderizarTabela(listaDemandas);
        // Função para fechar todos os menus de filtro
        function closeAllFilterMenus() {
            document.querySelectorAll('.filter-menu.visible').forEach(openMenu => {
                openMenu.classList.remove('visible');
            });
        }
        // Fecha o menu se o usuário clicar em qualquer outro lugar da página
        window.addEventListener('click', () => {
            closeAllFilterMenus();
        });
        function aplicarFiltros() {
            // 1. Determina qual a lista de demandas base (Ativas, Em Espera, etc.)
            const abaAtiva = document.querySelector('.subTitleLogs.aba-ativa');
            if (!abaAtiva) {
                console.error("Nenhuma aba ativa encontrada.");
                return; // Sai da função
            }
            // 2. Decide qual lógica de filtro usar com base na aba
            switch (abaAtiva.textContent) {
                case 'Demandas': {
                    // Coleta os valores de todos os filtros de DEMANDA
                    const filtrosArea = Array.from(document.querySelectorAll('#optionsArea input:checked')).map(cb => cb.value);
                    const filtrosResponsavel = Array.from(document.querySelectorAll('#usuariosResponsavelAtual input:checked')).map(cb => cb.value);
                    const filtroData = Array.from(document.querySelectorAll('#optionsData input:checked')).map(cb => cb.value);
                    const filtroEtapaAtual = Array.from(document.querySelectorAll('#optionsEtapas input:checked')).map(cb => cb.value);
                    const filtroStatusDemanda = Array.from(document.querySelectorAll('#statusDemanda input:checked')).map(cb => cb.value);
                    const termoPesquisa = document.getElementById('inputPesquisaDemandas').value.toLowerCase();
                    // Aplica os filtros na lista de DEMANDAS
                    let resultadoFiltrado = listaDemandas.filter(demanda => {
                        const atendeArea = filtrosArea.length === 0 || filtrosArea.includes(demanda.area);
                        const atendeEtapa = filtroEtapaAtual.length === 0 || filtroEtapaAtual.includes(demanda.etapa_atual);
                        const atendeStatus = filtroStatusDemanda.length === 0 || filtroStatusDemanda.includes(demanda.status);
                        const atendeResponsavel = filtrosResponsavel.length === 0 || filtrosResponsavel.includes(demanda.responsavel_etapa);
                        const atendePesquisa = termoPesquisa === '' || demanda.cliente_nome.toLowerCase().includes(termoPesquisa) || String(demanda.id).includes(termoPesquisa);
                        return atendeArea && atendeResponsavel && atendePesquisa && atendeEtapa && atendeStatus;
                    });
                    // Aplica a ordenação por data
                    if (filtroData.includes('recente')) {
                        resultadoFiltrado.sort((a, b) => parseDateString(b.criado_em) - parseDateString(a.criado_em));
                    } else if (filtroData.includes('distante')) {
                        resultadoFiltrado.sort((a, b) => parseDateString(a.criado_em) - parseDateString(b.criado_em));
                    }
                    // Renderiza a tabela de DEMANDAS
                    renderizarTabela(resultadoFiltrado);
                    break; // Encerra o case 'Demandas'
                }
                case 'Usuários': {
                    // Coleta o valor do filtro de USUÁRIO (apenas a pesquisa)
                    const termoPesquisa = document.getElementById('inputPesquisaUsers').value.toLowerCase();
                    // Aplica o filtro na lista de USUÁRIOS
                    let resultadoFiltrado = listaUsuarios.filter(usuario => {
                        // Garante que o nome exista antes de tentar filtrar
                        const nomeUsuario = (usuario.nome || '').toLowerCase();
                        return nomeUsuario.includes(termoPesquisa);
                    });
                    // Renderiza a tabela de USUÁRIOS
                    renderizarTabelaUsuarios(resultadoFiltrado);
                    break; // Encerra o case 'Usuários'
                }
                default:
                    console.log("Nenhuma aba válida selecionada.");
            }
        }
        const inputPesquisaDemandas = document.getElementById('inputPesquisaDemandas');
        const inputPesquisaUsers = document.getElementById('inputPesquisaUsers');
        // O evento 'input' é disparado instantaneamente a cada alteração
        inputPesquisaDemandas.addEventListener('input', aplicarFiltros);
        inputPesquisaUsers.addEventListener('input', aplicarFiltros);

        const popupLog = document.querySelector(".popupLog");
        popupLog.addEventListener('click', (event) => {
            const target = event.target; // O elemento exato que foi clicado
            // --- 1. Lógica para ABRIR/FECHAR o menu de filtro ---
            // Verifica se o clique foi no <span> dentro de .filter-header
            const trigger = target.closest('.filter-header > span');
            if (trigger) {
                event.stopPropagation(); // Impede que o clique feche o menu
                const menu = trigger.parentElement.querySelector('.filter-menu');
                if (menu) {
                    const isVisible = menu.classList.contains('visible');
                    closeAllFilterMenus(); // Fecha todos os outros primeiro
                    if (!isVisible) {
                        menu.classList.add('visible'); // Abre o menu atual
                    }
                }
                return; // Encerra a execução
            }
            // --- 2. Lógica para o botão APLICAR ---
            if (target.classList.contains('apply-filter-btn')) {
                event.stopPropagation();
                aplicarFiltros();
                // Opcional: fechar o menu após aplicar
                // closeAllFilterMenus();
                return;
            }
            // --- 3. Lógica para o botão LIMPAR ---
            if (target.classList.contains('clear-filter-btn')) {
                event.stopPropagation();
                const menu = target.closest('.filter-menu');
                if (menu) {
                    menu.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                        checkbox.checked = false;
                    });
                }
                aplicarFiltros(); // Re-aplica (agora sem filtros)
                return;
            }
            // --- 4. Lógica para impedir que o clique DENTRO do menu o feche ---
            if (target.closest('.filter-menu')) {
                event.stopPropagation(); // Se o clique foi dentro do menu, não faz nada
                return;
            }
        });
        // O listener do 'window' para fechar os menus clicando fora está CORRETO
        // e deve ser mantido como está.
        window.addEventListener('click', () => {
            closeAllFilterMenus();
        });

    } catch (error) {
        console.error("Ocorreu um erro ao buscar as demandas:", error);
        // Trate o erro, talvez mostrando uma notificação para o usuário
    } finally {
        // O bloco 'finally' garante que o loading será escondido, mesmo que ocorra um erro
        esconderLoading();
    }
}
function createFilterHeader(title, ulId) {
    // <h3 class="filter-header">
    const h3 = document.createElement('h3');
    h3.className = 'filter-header';
    // <span>Área <i class="fa-solid fa-filter filter-icon"></i></span>
    const span = document.createElement('span');
    // Adicionamos o texto e o ícone separadamente
    span.appendChild(document.createTextNode(title + ' ')); // Adiciona o texto (ex: "Área ")
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-filter filter-icon';
    span.appendChild(icon); // Adiciona o ícone dentro do <span>
    // <div class="filter-menu">
    const filterMenu = document.createElement('div');
    filterMenu.className = 'filter-menu';
    // <ul class="filter-options" id="optionsArea">
    const ul = document.createElement('ul');
    ul.className = 'filter-options';
    ul.id = ulId;
    // <div class="filter-actions">
    const filterActions = document.createElement('div');
    filterActions.className = 'filter-actions';
    // <button class="apply-filter-btn">Aplicar</button>
    const applyBtn = document.createElement('button');
    applyBtn.className = 'apply-filter-btn';
    applyBtn.textContent = 'Aplicar';
    // <button class="clear-filter-btn">Limpar</button>
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-filter-btn';
    clearBtn.textContent = 'Limpar';
    // ----- Montagem (de dentro para fora) -----
    // 1. Adiciona botões às Ações
    filterActions.appendChild(applyBtn);
    filterActions.appendChild(clearBtn);
    // 2. Adiciona a <ul> e as Ações ao Menu
    filterMenu.appendChild(ul);
    filterMenu.appendChild(filterActions);
    // 3. Adiciona o <span> e o Menu ao <h3>
    h3.appendChild(span);
    h3.appendChild(filterMenu);
    // Retorna o H3 montado e a UL (para podermos adicionar <li> nela depois)
    return { h3, ul };
}
async function buscarRelatorioEtapas(tipo, id) {
    if (!id || !tipo) {
        console.error("ID ou Tipo inválido para buscar relatório.");
        return; 
    }
    try {
        mostrarLoading(); // Se tiver essa função
        const response = await fetch(`/api/relatorio/etapas`, {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id_etapas: String(id),
                tipo: tipo
            })
        });
        if (!response.ok) {
            // Pega o erro detalhado do backend se houver
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro na requisição');
        }
        const dados = await response.json();
        renderizarTabelaEtapas(dados);
        console.log("Relatório recebido:", dados);
    } catch (error) {
        console.error("Erro ao buscar relatório:", error);
    } finally {
        esconderLoading(); // Se tiver essa função
    }
}

function renderizarTabela(listaDeDemandas) {
    const inputPesquisaDemandas = document.getElementById('inputPesquisaDemandas');
    inputPesquisaDemandas.style.display = "flex";
    const inputPesquisaUsers = document.getElementById('inputPesquisaUsers');
    inputPesquisaUsers.style.display = "none";
    const lineTitlePopupLogs = document.querySelector(".lineTitlePopupLogs");
    lineTitlePopupLogs.replaceChildren();
    lineTitlePopupLogs.classList.add('header-demanda-view'); // Adiciona classe no header
    lineTitlePopupLogs.classList.remove('header-user-view'); // Remove a outra
    // 1. <h3>N° Demanda</h3>
    const h3NumDemanda = document.createElement('h3');
    h3NumDemanda.textContent = 'N° Demanda';
    // 2. <h3>Demanda</h3>
    const h3Demanda = document.createElement('h3');
    h3Demanda.textContent = 'Demanda';
    // 3. Filtro de Área
    // Usamos a função auxiliar
    const areaFilter = createFilterHeader('Área', 'optionsArea');
    areasFiltro.forEach(area => {
        const li = criarOpcaoFiltro(area.nome_area, area.nome_area);
        areaFilter.ul.appendChild(li);
    });
    // 4. <h3>Etapa Atual</h3>
    const EtapaFilter = createFilterHeader('Etapa Atual', 'optionsEtapas');
    const nomesEtapas = etapasFiltro.map(etapa => etapa.nome_etapa);
    const nomesEtapasUnicas = [...new Set(nomesEtapas)];
    nomesEtapasUnicas.forEach(nomeEtapa => {
        const li = criarOpcaoFiltro(nomeEtapa, nomeEtapa);
        EtapaFilter.ul.appendChild(li);
    });
    // 5. Filtro de Responsável Atual
    const respFilter = createFilterHeader('Responsável Atual', 'usuariosResponsavelAtual');
    usuariosFiltro.forEach(user => {
        const li = criarOpcaoFiltro(user.nome, user.nome);
        respFilter.ul.appendChild(li);
    });
    // 6. Filtro de Status
    const statusFilter = createFilterHeader('Status da Demanda', 'statusDemanda');
    const liAtiva = document.createElement('li');
    const labelAtiva = document.createElement('label');
    const inputAtiva = document.createElement('input');
    inputAtiva.type = 'checkbox';
    inputAtiva.value = 'Ativo';
    labelAtiva.appendChild(inputAtiva);
    labelAtiva.appendChild(document.createTextNode(' Ativas'));
    liAtiva.appendChild(labelAtiva);
    const liEmEspera = document.createElement('li');
    const labelEmEspera = document.createElement('label');
    const inputEmEspera = document.createElement('input');
    inputEmEspera.type = 'checkbox';
    inputEmEspera.value = 'Em espera';
    labelEmEspera.appendChild(inputEmEspera);
    labelEmEspera.appendChild(document.createTextNode(' Em Espera'));
    liEmEspera.appendChild(labelEmEspera);
    const liFinalizada = document.createElement('li');
    const labelFinalizada = document.createElement('label');
    const inputFinalizada = document.createElement('input');
    inputFinalizada.type = 'checkbox';
    inputFinalizada.value = 'Finalizada';
    labelFinalizada.appendChild(inputFinalizada);
    labelFinalizada.appendChild(document.createTextNode(' Finalizadas'));
    liFinalizada.appendChild(labelFinalizada);
    statusFilter.ul.appendChild(liAtiva);
    statusFilter.ul.appendChild(liEmEspera);
    statusFilter.ul.appendChild(liFinalizada);

    // 7. Filtro de Data de Criação
    const dataFilter = createFilterHeader('Data de Criação', 'optionsData');
    const liRecente = document.createElement('li');
    const labelRecente = document.createElement('label');
    const inputRecente = document.createElement('input');
    inputRecente.type = 'checkbox';
    inputRecente.value = 'recente';
    labelRecente.appendChild(inputRecente);
    labelRecente.appendChild(document.createTextNode(' Data mais recente'));
    liRecente.appendChild(labelRecente);
    // <li><label><input type="checkbox" value="distante"> Data mais distante</label></li>
    const liDistante = document.createElement('li');
    const labelDistante = document.createElement('label');
    const inputDistante = document.createElement('input');
    inputDistante.type = 'checkbox';
    inputDistante.value = 'distante';
    labelDistante.appendChild(inputDistante);
    labelDistante.appendChild(document.createTextNode(' Data mais distante'));
    liDistante.appendChild(labelDistante);
    // Adiciona os <li> na <ul> do filtro de data
    dataFilter.ul.appendChild(liRecente);
    dataFilter.ul.appendChild(liDistante);
    if (lineTitlePopupLogs) {
        lineTitlePopupLogs.appendChild(h3NumDemanda);
        lineTitlePopupLogs.appendChild(h3Demanda);
        lineTitlePopupLogs.appendChild(areaFilter.h3); // Adicionamos o h3 retornado pela função
        lineTitlePopupLogs.appendChild(EtapaFilter.h3);
        lineTitlePopupLogs.appendChild(respFilter.h3); // Adicionamos o h3 retornado pela função
        lineTitlePopupLogs.appendChild(statusFilter.h3);
        lineTitlePopupLogs.appendChild(dataFilter.h3); // Adicionamos o h3 retornado pela função
    } else {
        console.error('Elemento "container-pai" não encontrado!');
    }
    const containerTabela = document.querySelector(".contentTableLog");
    // 1. Limpa o conteúdo atual da tabela para não duplicar os dados
    containerTabela.replaceChildren();
    // 2. Verifica se a lista está vazia
    if (listaDeDemandas.length === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'aviso-tabela-vazia';
        // Usamos textContent para inserir texto de forma segura, prevenindo ataques XSS.
        aviso.textContent = 'Nenhuma demanda encontrada para este status.';
        containerTabela.appendChild(aviso);
        return;
    }
    // 3. Itera sobre a lista e cria o HTML para cada linha
    listaDeDemandas.forEach(demanda => {
        // Cria o elemento principal da linha
        const linhaDiv = document.createElement('div');
        linhaDiv.className = 'lineTableLog';
        linhaDiv.setAttribute('demanda-id', demanda.id);
        linhaDiv.style.cursor = "pointer"; // Muda o cursor para indicar clicável
        linhaDiv.addEventListener('click', async () => {
            // Pega o ID direto do atributo que você setou ou do objeto
            await buscarRelatorioEtapas('demanda', demanda.id);
        });
        // Um array com os dados da demanda para criar os parágrafos de forma mais limpa
        const dadosDaLinha = [
            demanda.id,
            demanda.cliente_nome,
            demanda.area,
            demanda.etapa_atual,
            demanda.responsavel_etapa,
            demanda.status,
            demanda.criado_em
        ];
        // Cria um parágrafo para cada dado e o anexa à div da linha
        dadosDaLinha.forEach(texto => {
            const p = document.createElement('p');
            p.textContent = texto;
            linhaDiv.appendChild(p);
        });
        // Adiciona a linha completa (já com todos os parágrafos) ao contêiner da tabela
        containerTabela.appendChild(linhaDiv);
    });
}

function renderizarTabelaUsuarios(listaDeUsuarios) {
    const inputPesquisaUsers = document.getElementById("inputPesquisaUsers");
    inputPesquisaUsers.style.display = "flex";
    const inputPesquisaDemandas = document.getElementById("inputPesquisaDemandas");
    inputPesquisaDemandas.style.display = "none";
    const lineTitlePopupLogs = document.querySelector(".lineTitlePopupLogs");
    lineTitlePopupLogs.replaceChildren(); // Limpa os cabeçalhos antigos
    lineTitlePopupLogs.classList.add('header-user-view'); // Adiciona classe no header
    lineTitlePopupLogs.classList.remove('header-demanda-view'); // Remove a outra
    // 1. Criar os cabeçalhos da tabela de usuários
    // Usamos textContent por simplicidade, já que usuários não têm filtros
    const h3Nome = document.createElement('h3');
    h3Nome.textContent = 'Nome';

    const h3Email = document.createElement('h3');
    h3Email.textContent = 'Email';

    const h3Registro = document.createElement('h3');
    h3Registro.textContent = 'Registro';

    const h3Telefone = document.createElement('h3');
    h3Telefone.textContent = 'Telefone';

    const h3Whatsapp = document.createElement('h3');
    h3Whatsapp.textContent = 'Whatsapp';

    // 2. Adiciona os novos cabeçalhos
    if (lineTitlePopupLogs) {
        lineTitlePopupLogs.appendChild(h3Nome);
        lineTitlePopupLogs.appendChild(h3Email);
        lineTitlePopupLogs.appendChild(h3Registro);
        lineTitlePopupLogs.appendChild(h3Telefone);
        lineTitlePopupLogs.appendChild(h3Whatsapp);
    } else {
        console.error('Elemento ".lineTitlePopupLogs" não encontrado!');
    }

    // 3. Limpa o conteúdo atual da tabela
    const containerTabela = document.querySelector(".contentTableLog");
    containerTabela.replaceChildren();

    // 4. Verifica se a lista de usuários está vazia
    if (!listaDeUsuarios || listaDeUsuarios.length === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'aviso-tabela-vazia';
        aviso.textContent = 'Nenhum usuário encontrado.';
        containerTabela.appendChild(aviso);
        return;
    }

    // 5. Itera sobre a lista e cria o HTML para cada linha de usuário
    listaDeUsuarios.forEach(usuario => {
        console.log(usuario);
        const linhaDiv = document.createElement('div');
        linhaDiv.className = 'lineUsersTableLog';
        linhaDiv.setAttribute('user-id', usuario.id);
        linhaDiv.style.cursor = "pointer"; // Muda o cursor para indicar clicável
        linhaDiv.addEventListener('click', async () => {
            console.log(typeof(usuario.id));
            // Pega o ID do objeto usuario
            await buscarRelatorioEtapas('user', usuario.id);
        });
        // Mapeia os dados do usuário para os parágrafos
        // Assegura que os campos 'telefone' e 'whatsapp' tenham um valor padrão
        const dadosDaLinha = [
            usuario.nome || 'N/A',
            usuario.email || 'N/A',
            usuario.registro || 'N/A',
            usuario.telefone || 'N/A',
            usuario.whatsapp || 'N/A'
        ];

        // Cria um parágrafo para cada dado
        dadosDaLinha.forEach(texto => {
            const p = document.createElement('p');
            p.textContent = texto;
            linhaDiv.appendChild(p);
        });

        // Adiciona a linha ao contêiner
        containerTabela.appendChild(linhaDiv);
    });
}
function renderizarTabelaEtapas(listaEtapas) {
    // 1. Esconde os inputs de pesquisa, pois o filtro atual não se aplica a essa visualização
    document.getElementById('inputPesquisaDemandas').style.display = "none";
    document.getElementById('inputPesquisaUsers').style.display = "none";
    // 2. Configura o Cabeçalho
    const lineTitlePopupLogs = document.querySelector(".lineTitlePopupLogs");
    lineTitlePopupLogs.replaceChildren(); // Limpa cabeçalhos antigos
    // Remove classes de filtros anteriores para evitar conflitos de CSS
    lineTitlePopupLogs.classList.remove('header-demanda-view');
    lineTitlePopupLogs.classList.add('header-user-view'); // Reusa layout de usuários (5 colunas)
    lineTitlePopupLogs.style.gridTemplateColumns = "repeat(6, 1fr)";
    // Cria os títulos das colunas
    const titulos = ['ID Demanda', 'Nome da Etapa', 'Setor', 'Responsável', 'Prazo', 'Status'];
    titulos.forEach(texto => {
        const h3 = document.createElement('h3');
        h3.textContent = texto;
        lineTitlePopupLogs.appendChild(h3);
    });
    // 3. Configura o Corpo da Tabela
    const containerTabela = document.querySelector(".contentTableLog");
    containerTabela.replaceChildren(); // Limpa o conteúdo anterior
    // Verifica se veio vazio
    if (!listaEtapas || listaEtapas.length === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'aviso-tabela-vazia';
        aviso.textContent = 'Nenhuma etapa encontrada para este registro.';
        containerTabela.appendChild(aviso);
        return;
    }
    // 4. Renderiza as linhas
    listaEtapas.forEach(etapa => {
        const linhaDiv = document.createElement('div');
        console.log(etapa);

        linhaDiv.className = 'lineUsersTableLog'; 
        linhaDiv.style.gridTemplateColumns = "repeat(6, 1fr)";
        linhaDiv.style.cursor = "pointer";
        linhaDiv.addEventListener('click', async () => {
            await buscarAcoesDaEtapa(etapa.demanda_id, etapa.etapa_id || etapa.id); 
        });
        const dadosDaLinha = [
            etapa.demanda_id,
            etapa.nome,
            etapa.setor,
            etapa.responsavel,
            etapa.prazo, 
            etapa.status
        ];
        dadosDaLinha.forEach((texto, index) => {
            const p = document.createElement('p');
            p.textContent = texto;
            if (index === 4 && etapa.vencido === 'Vencido') {
                p.style.color = 'red';
                p.style.fontWeight = 'bold'; // Opcional: deixa negrito para destacar
            }
            
            linhaDiv.appendChild(p);
        });
        containerTabela.appendChild(linhaDiv);
    });
}

// 1. Função para buscar os detalhes e extrair as ações
async function buscarAcoesDaEtapa(demandaId, etapaId) {
    try {
        mostrarLoading();
        // Reusa sua função existente 'enviarDemandas' ou faz um fetch direto se for uma rota diferente
        // Como a rota é /demandas/{id}, vamos fazer um fetch específico:
        const response = await fetch(`/api/demandas/${demandaId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${token}` 
            }
        });
        if (!response.ok) throw new Error("Erro ao buscar detalhes da demanda");
        const data = await response.json();
        // Precisamos encontrar a etapa correta dentro da lista
        const etapaEncontrada = data.demanda.etapas.find(e => e.id === Number(etapaId));
        if (etapaEncontrada && etapaEncontrada.acoes) {
            console.log("Ações encontradas:", etapaEncontrada.acoes);
            renderizarTabelaAcoes(etapaEncontrada.acoes);
        } else {
            alert("Nenhuma ação encontrada ou erro ao localizar etapa.");
        }
    } catch (error) {
        console.error("Erro ao carregar ações:", error);
    } finally {
        esconderLoading();
    }
}

// 2. Função para renderizar a tabela de Ações
function renderizarTabelaAcoes(listaAcoes) {
    // Configura o Cabeçalho
    const lineTitlePopupLogs = document.querySelector(".lineTitlePopupLogs");
    lineTitlePopupLogs.replaceChildren(); 
    // Remove classes anteriores
    lineTitlePopupLogs.classList.remove('header-demanda-view');
    lineTitlePopupLogs.classList.add('header-user-view'); 
    // Ajusta para 3 colunas (Usuário, Ação, Data)
    lineTitlePopupLogs.style.gridTemplateColumns = "1fr 2fr 1fr"; 
    const titulos = ['Usuário', 'Ação Realizada', 'Data/Hora'];
    titulos.forEach((texto, index) => {
        const h3 = document.createElement('h3');
        h3.textContent = texto;
        if (index === 1) {
            h3.className = 'contentAction';
        } else {
            h3.className = 'contentDate';
        }
        lineTitlePopupLogs.appendChild(h3);
    });
    // Configura o Corpo da Tabela
    const containerTabela = document.querySelector(".contentTableLog");
    containerTabela.replaceChildren();
    if (!listaAcoes || listaAcoes.length === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'aviso-tabela-vazia';
        aviso.textContent = 'Nenhuma ação registrada nesta etapa.';
        containerTabela.appendChild(aviso);
        return;
    }
    listaAcoes.forEach(acao => {
        const linhaDiv = document.createElement('div');
        linhaDiv.className = 'lineActionsTableLog'; // Reusa a classe de linha
        
        // Força o grid para 3 colunas na linha também
        linhaDiv.style.gridTemplateColumns = "1fr 2fr 1fr"; 
        const dadosDaLinha = [
            acao.user_name || 'Sistema', // Nome do usuário
            acao.acao,                   // Descrição da ação
            acao.data_hora               // Data formatada vinda do backend
        ];
        dadosDaLinha.forEach((texto, index) => {
            const p = document.createElement('p');
            p.textContent = texto;
            if (index === 1) {
                p.className = 'contentAction';
            } else {
                p.className = 'contentDate';
            }
            linhaDiv.appendChild(p);
        });
        containerTabela.appendChild(linhaDiv);
    });
}


function parseDateString(dataString) {
    // Exemplo de entrada: "17/10/2025 09:30:00"
    const [data, hora] = dataString.split(' '); // ["17/10/2025", "09:30:00"]
    const [dia, mes, ano] = data.split('/');   // ["17", "10", "2025"]
    const [horas, minutos] = hora.split(':'); // ["09", "30", "00"]
    // O mês no construtor Date é 0-indexado (Janeiro=0, Dezembro=11), então subtraímos 1.
    return new Date(ano, mes - 1, dia, horas, minutos);
}
function criarOpcaoFiltro(valor, textoLabel) {
    // 1. Cria os elementos necessários
    const li = document.createElement('li');
    const label = document.createElement('label');
    const input = document.createElement('input');
    // 2. Configura o input (checkbox)
    input.type = 'checkbox';
    input.value = valor;
    // 3. Monta a estrutura aninhando os elementos
    // Adiciona o <input> dentro do <label>
    label.appendChild(input);
    // Adiciona o texto ao lado do <input>, ainda dentro do <label>
    // Usamos createTextNode para segurança e clareza.
    label.appendChild(document.createTextNode(` ${textoLabel}`));
    // Adiciona o <label> completo dentro do <li>
    li.appendChild(label);
    // 4. Retorna o elemento <li> pronto
    return li;
}
const abas = document.querySelectorAll('.subTitleLogs');
abas.forEach(aba => {
    aba.addEventListener('click', () => {
        // Remove a classe 'ativa' de todas as abas para resetar o estilo
        abas.forEach(a => a.classList.remove('aba-ativa'));
        // Adiciona a classe 'ativa' apenas na aba clicada
        aba.classList.add('aba-ativa');
        const tipoSelecionado = aba.textContent;
        // Chama a função de renderização com a lista correta
        if (tipoSelecionado === "Demandas") {
            // console.log("Renderizando Demandas: ", listaDemandas);
            renderizarTabela(listaDemandas); // <-- Chama a função original
        } else if (tipoSelecionado === "Usuários") {
            // console.log("Renderizando Usuários: ", listaUsuarios);
            renderizarTabelaUsuarios(listaUsuarios); // <-- Chama a função de usuários
        }
    });
});
const btnRelatorio = document.getElementById('btn-relatorio');
btnRelatorio.addEventListener('click', () => {
    // 1. Seleciona o elemento que você quer transformar em PDF.
    // Neste caso, é o container principal dentro do seu dialog.
    const relatorioParaImprimir = document.querySelector('.containerPopupLog');
    // 2. Antes de "printar", é uma boa prática rolar a página para o topo
    // e remover a visibilidade de elementos que podem atrapalhar, como o botão de fechar.
    const botaoFechar = relatorioParaImprimir.querySelector('.closeLogs');
    if (botaoFechar) {
        botaoFechar.style.display = 'none'; // Esconde o botão de fechar
    }
    const containerAbasLog = relatorioParaImprimir.querySelector('.containerAbasLog');
    if (containerAbasLog) {
        containerAbasLog.style.display = 'none'; // Esconde o botão de fechar
    }
    if (btnRelatorio) {
        btnRelatorio.style.display = 'none'; // Esconde o botão de fechar
    }
    // 3. ATIVA O MODO RELATÓRIO
    // Adicionamos a classe ao elemento que será capturado
    relatorioParaImprimir.classList.add('modo-relatorio');
    // --- FIM DA MODIFICAÇÃO ---

    // 3. Usa a biblioteca html2canvas para capturar o elemento como uma imagem (canvas)
    html2canvas(relatorioParaImprimir, {
        scale: 2, // Aumenta a escala para uma melhor qualidade de imagem
        useCORS: true // Permite carregar imagens de outras origens, se houver
    }).then(canvas => {
        // 4. Quando a captura estiver pronta, esta parte do código é executada
        // Reexibe o botão que foi escondido para não afetar o uso da página
        // 5. DESATIVA O MODO RELATÓRIO
        // Removemos a classe para a tela voltar ao normal
        relatorioParaImprimir.classList.remove('modo-relatorio');
        if (botaoFechar) {
            botaoFechar.style.display = 'block';
        }
        if (containerAbasLog) {
            containerAbasLog.style.display = 'flex'; // Esconde o botão de fechar
        }
        if (btnRelatorio) {
            btnRelatorio.style.display = 'block'; // Esconde o botão de fechar
        }
        // Converte o canvas para um formato de imagem (PNG)
        const imgData = canvas.toDataURL('image/png');
        // Pega as dimensões do conteúdo capturado para ajustar o PDF
        const imgWidth = 210; // Largura do A4 em mm
        const pageHeight = 295; // Altura do A4 em mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        // 5. Usa a biblioteca jsPDF para criar o documento
        // 'p' = portrait (retrato), 'mm' = milímetros, 'a4' = tamanho da folha
        const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
        let position = 0;
        // Adiciona a imagem ao PDF
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        // Se o conteúdo for maior que uma página A4, ele cria novas páginas
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        // 6. Força o download do arquivo PDF
        pdf.save("relatorio-demandas.pdf");
    }).catch(error => {
        // Caso ocorra algum erro na captura, é bom saber
        console.error('Ocorreu um erro ao gerar o PDF:', error);
        // 8. GARANTE A DESATIVAÇÃO do modo relatório se der erro
        relatorioParaImprimir.classList.remove('modo-relatorio');
        // Garante que o botão de fechar reapareça mesmo se der erro
        if (botaoFechar) {
            botaoFechar.style.display = 'block';
        }
        if (inputPesquisa) {
            inputPesquisa.style.display = 'block'; // Esconde o botão de fechar
        }
        if (btnRelatorio) {
            btnRelatorio.style.display = 'block'; // Esconde o botão de fechar
        }
    });
});
const btnPopupRelatorio = document.querySelector(".btnPopupRelatorio")
const hiddenGestor = document.getElementById("hiddenGestor")
if (hiddenGestor.value == "True") {
    btnPopupRelatorio.style.display = "flex"
} else {
    btnPopupRelatorio.style.display = "none"
}
const popupLog = document.querySelector(".popupLog")
async function abrirPopupLogs() {
    await preencherPopupLogs();
    popupLog.showModal();
    esconderLoading();
}
function fecharPopupLogs() {
    popupLog.close();
}