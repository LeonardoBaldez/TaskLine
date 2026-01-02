document.addEventListener('DOMContentLoaded', function () {
    
    // ===================================================================
    // FUNÇÕES GERAIS E ANIMAÇÕES
    // ===================================================================

    // Função para mostrar/ocultar senha (toggle)
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');
    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function () {
            const passwordInput = this.previousElementSibling;
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    });

    // Função genérica para animar a troca de painéis
    function animarTroca(painelSaindo, painelEntrando, animacaoSaida, animacaoEntrada) {
        painelSaindo.style.animation = `${animacaoSaida} 0.5s forwards`;
        setTimeout(() => {
            painelSaindo.style.display = "none";
            painelEntrando.style.display = "flex";
            painelEntrando.style.animation = `${animacaoEntrada} 0.5s forwards`;
        }, 500);
    }

    // Selecionando os painéis principais
    const boxLogin = document.querySelector('.boxLogin');
    const boxPrimeiroAcesso = document.querySelector('.boxPrimeiroAcesso');
    const boxRecuperarSenha = document.querySelector('.boxRecuperarSenha');
    const boxEmailVerificacao = document.querySelector('.boxEmailVerificacao');
    const boxRedefinirSenha = document.querySelector('.boxRedefinirSenha');

    // Navegação: Login -> Primeiro Acesso
    document.getElementById('primeiroAcesso').addEventListener('click', function(){
        animarTroca(boxLogin, boxPrimeiroAcesso, "rotateOutRight", "rotateInRight");
    });

    // Navegação: Primeiro Acesso -> Login
    document.getElementById('voltarLoginPa').addEventListener('click', function() {
        animarTroca(boxPrimeiroAcesso, boxLogin, "rotateOutRight", "rotateInRight");
    });

    // Navegação: Login -> Recuperar Senha
    document.getElementById('recuperarSenha').addEventListener('click', function(){
        animarTroca(boxLogin, boxRecuperarSenha, "rotateOutLeft", "rotateInLeft");
    });

    // Navegação: Recuperar Senha -> Login
    document.getElementById('voltarLoginEs').addEventListener('click', function () {
        animarTroca(boxRecuperarSenha, boxLogin, "rotateOutLeft", "rotateInLeft");
    });
    // Navegação: Recuperar Redefinir senha -> Codigo de verificação
    document.getElementById('voltarSenhaPcodigo').addEventListener('click', function () {
        animarTroca(boxRedefinirSenha, boxEmailVerificacao, "rotateOutLeft", "rotateInLeft");
    });
    

    // ===================================================================
    // LÓGICA DE PRIMEIRO ACESSO
    // ===================================================================
    const boxSenhaPA = document.querySelector('.boxGerarSenha');
    const boxErroPA = document.querySelector('.boxErroMessage');
    const messageErroPA = document.getElementById('messageErro');
    const btnCriarSenhaPA = document.querySelector('.btnCriarSenha');
    const emailPrimeiroAcessoInput = document.getElementById('emailPrimeiroAcesso');

    async function verificarEmail() {
        const email = emailPrimeiroAcessoInput.value;
        try {
            const response = await fetch('/user/verificarEmailPrimeiroAcesso', {
                method: 'POST',
                headers: { 'Content-type':'application/json' },
                body: JSON.stringify({ email })
            });
            if (response.ok) {
                boxSenhaPA.style.display = 'flex';
                btnCriarSenhaPA.style.display = 'none';
                boxErroPA.style.display = 'none';
            } else {
                const errordata = await response.json();
                boxErroPA.style.display = 'flex';
                boxSenhaPA.style.display = 'none';
                messageErroPA.textContent = errordata.detail;
            }
        } catch (error) {
            console.error('Erro ao verificar e-mail:', error);
            messageErroPA.textContent = "Erro de conexão. Tente novamente.";
            boxErroPA.style.display = 'flex';
        }
    }
    document.querySelector('.btnCriarSenha').addEventListener('click', verificarEmail);

    async function criarSenha() {
        const email = emailPrimeiroAcessoInput.value;
        const senha = document.getElementById('senhaPrimeiroAcesso').value;
        try {
            const response = await fetch('/user/primeiroAcessoFuncao', {
                method: 'POST',
                headers: { 'Content-type':'application/json' },
                body: JSON.stringify({ email, senha })
            });
            if (response.ok) {
                // Anima de volta para o login após sucesso
                animarTroca(boxPrimeiroAcesso, boxLogin, "rotateOutRight", "rotateInRight");
            }
        } catch (error) {
            console.error('Erro ao criar senha:', error);
        }
    }
    document.querySelector('.boxGerarSenha .btnEntrar').addEventListener('click', criarSenha);
    
    // ===================================================================
    // LÓGICA DE RECUPERAÇÃO DE SENHA
    // ===================================================================

// Selecionando elementos da seção de Recuperar Senha
const btnEnviarCod = document.querySelector('.btnEnviarCod');
const btnVerificarCod = document.querySelector('.btnVerificarCod');
const btnRedefinirSenha = document.querySelector('.btnRedefinirSenha');
const emailRecuperarInput = document.getElementById('emailRedefinirSenha');
const novaSenhaInput = document.getElementById('novaSenha');
const codeInputs = document.querySelectorAll(".code-input");
const mensagemRecuperacao = document.getElementById('mensagemRecuperacao');

const boxRedefinirSenhaDiv = document.querySelector('.boxRedefinirSenha');
// Selecionando a nova DIV que criamos
const boxCodigoVerificacao = document.getElementById('boxCodigoVerificacao');


// --- Passo 1: Enviar o código de verificação ---
btnEnviarCod.addEventListener('click', async function() {
    const email = emailRecuperarInput.value;
    if (!email) {
        alert('Por favor, insira um e-mail.');
        return;
    }
    // Mostra feedback temporário
    this.textContent = 'Enviando...';

    try {
        const response = await fetch('/user/senha-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message || 'Código enviado com sucesso! Verifique seu e-mail.');
            console.log(result.codigo_verificacao);
            // --- Passo 2: Apenas animar para a próxima etapa (SEM CHAMADA À API) ---
            btnVerificarCod.addEventListener('click', function() {
                let codigo = '';
                codeInputs.forEach(input => {
                    codigo += input.value.toUpperCase();
                });
                console.log('Codigo:', codigo);
            
                if (codigo.length < 6) {
                    mensagemRecuperacao.textContent = 'Por favor, insira o código de 6 dígitos.';
                    mensagemRecuperacao.style.display = 'block';
                    return; // Para a execução se o código não estiver completo
                }
                if (codigo !== result.codigo_verificacao) {
                    mensagemRecuperacao.textContent = 'Código de verificação incorreto.';
                    mensagemRecuperacao.style.display = 'block';
                    return; // Para a execução se o código estiver incorreto
                }
            
                // Se o código está preenchido, apenas avança para a próxima tela
                mensagemRecuperacao.style.display = 'none'; 
                animarTroca(boxEmailVerificacao, boxRedefinirSenhaDiv, "rotateOutRight", "rotateInRight");
            });
            // MOSTRA A SEÇÃO DE INSERIR O CÓDIGO
            boxCodigoVerificacao.style.display = 'flex'; 
            this.style.display = 'none'; // Esconde o botão "Enviar Código"
        } else {
            alert(result.detail || 'E-mail não encontrado ou erro ao enviar.');
            this.textContent = 'Enviar Código'; // Restaura o texto do botão
        }
    } catch (error) {
        console.error('Erro ao enviar código:', error);
        alert('Erro de conexão. Tente novamente.');
        this.textContent = 'Enviar Código'; // Restaura o texto do botão
    }
});

// --- Passo 3: Redefinir a senha (A ÚNICA CHAMADA REAL À API) ---
btnRedefinirSenha.addEventListener('click', async function() {
    const email = emailRecuperarInput.value;
    const novaSenha = novaSenhaInput.value;
    let codigo = '';
    codeInputs.forEach(input => {
        codigo += input.value.toUpperCase();
    });

    if (!novaSenha) {
        alert('Por favor, digite a nova senha.');
        return;
    }
    try {
        const response = await fetch('/user/resetar-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                verification_code: codigo,
                new_password: novaSenha 
            })
        });
        
        const result = await response.json();

        if (response.ok) {
            alert('Senha redefinida com sucesso!');
            // Anima de volta para a tela de login
            animarTroca(boxRecuperarSenha, boxLogin, "rotateOutLeft", "rotateInLeft");
        } else {
            alert('Erro ao redefinir senha: ' + (result.detail || 'Código de verificação inválido.'));
        }
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        alert('Erro de conexão ao redefinir a senha.');
    }
});

// Lógica para pular entre os inputs do código de verificação (sem alteração)
codeInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
        if (e.inputType === "deleteContentBackward" && index > 0) {
            codeInputs[index - 1].focus();
        } else if (e.target.value && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }
    });

    input.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData("text").slice(0, codeInputs.length);
        pasteData.split("").forEach((char, i) => {
            if (codeInputs[i]) codeInputs[i].value = char;
        });
        codeInputs[pasteData.length - 1]?.focus();
    });
})
});