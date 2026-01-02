# 1. Bibliotecas Padrão do Python
from datetime import datetime, timedelta,timezone
import random
import secrets
from zoneinfo import ZoneInfo
# 2. Bibliotecas de Terceiros (Instaladas via pip)
from fastapi import (APIRouter,BackgroundTasks,Depends,HTTPException,Request)
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
# 3. Módulos locais
from api.funcoes.loginf import (ACCESS_TOKEN_EXPIRE_MINUTES,authenticate_user,create_access_token,get_current_user,pwd_context,generate_verification_code,send_verification_code)
from api.models.demandasM import Gestao
from api.models.user_models import (PrimeiroAcesso,UserCreate,UserCreateTeste,VerificacaoDeEmail,PasswordResetRequest,PasswordResetForm)
from api.models.demandasM import User
from db.session import SessionLocal
fuso_horario_brasil = ZoneInfo("America/Sao_Paulo")
fuso_utc = timezone.utc
# --- Configuração do Roteador ---
router = APIRouter(
    prefix="/user",
    tags=["Autenticação e Usuários"] # Agrupando todas as rotas sob uma tag
)
templates = Jinja2Templates(directory="templates")
# --- Dependência para Sessão do Banco de Dados ---
def get_db():
    """
    Cria e fornece uma sessão de banco de dados por requisição.
    Garante que a sessão seja sempre fechada ao final.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



# ROTAS DE AUTENTICAÇÃO
@router.post("/login", response_class=HTMLResponse)
async def efetuar_login_usuario(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Autentica um usuário e o redireciona para a página apropriada.

    Args:
        request (Request): A requisição HTTP.
        form_data (OAuth2PasswordRequestForm): Os dados do formulário de login (usuário e senha).
        db (Session): A sessão do banco de dados.

    Returns:
        RedirectResponse: Redireciona para a página de personalização em caso de primeiro acesso
                          ou para a home em caso de login bem-sucedido.
        TemplateResponse: Retorna a página de login com uma mensagem de erro em caso de falha
                          na autenticação.
    """
    user = await authenticate_user(db,form_data.username, form_data.password)
    if not user:
        error_message = "Usuário ou senha incorretos"
        return templates.TemplateResponse("login.html", {"request": request, "error_message": error_message})

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    accessToken = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    # Redireciona para a personalização se for o primeiro acesso da empresa
    redirect_url = "/app/personalizar" if user.empresa_id is None else "/app/home"
    response = RedirectResponse(url=redirect_url, status_code=303)
    response.set_cookie("accessToken", accessToken)
    return response

@router.get("/verificarAcesso")
async def verificar_permissao_acesso(current_user: User = Depends(get_current_user)):
    """
    Verifica o nível de permissão do usuário logado.

    Args:
        current_user (User): O usuário atualmente autenticado.

    Returns:
        dict: Um dicionário contendo o nível de acesso do usuário (permissao_adm).
    """
    return {"acesso": current_user.permissao_adm}

# ROTAS DE REGISTRO E CRIAÇÃO DE USUÁRIOS

@router.post("/registrar")
async def registrar_novo_usuario(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria um novo usuário no sistema, associado à empresa do usuário logado.

    Args:
        user_data (UserCreate): Os dados do novo usuário a ser criado.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário autenticado que está realizando a operação.

    Raises:
        HTTPException: Se o e-mail fornecido já estiver cadastrado.

    Returns:
        dict: Uma mensagem de sucesso informando que o usuário foi cadastrado.
    """
    usuario_existente = db.query(User).filter(User.email == user_data.email).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Usuário com este e-mail já cadastrado.")

    # Criação do usuário
    senha_temporaria = secrets.token_hex(8)
    db_user = User(
        nome=user_data.nome,
        email=user_data.email,
        senha=pwd_context.hash(senha_temporaria),
        registro=user_data.registro,
        telefone=user_data.telefone,
        whatsapp=user_data.whatsapp,
        criado_em=datetime.now(),
        primeiro_acesso=True,
        permissao_adm=False,
        empresa_id=current_user.empresa_id,
        plano=str(current_user.plano) # Definir plano
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Adiciona os setores ao usuário
    for setor_info in user_data.setores:
        setor_add = Gestao(id_setor=setor_info["id"], id_usuario=db_user.id, gestor=setor_info["gestor"])
        db.add(setor_add)
    
    db.commit()
    
    # Depois vamos ativar o envio de e-mail
    # background_tasks.add_task(enviar_email_boas_vindas, email=db_user.email, senha=senha_temporaria)

    return {"message": "Usuário cadastrado com sucesso!"}

@router.post("/registrarTeste")
async def registrar_usuario_teste(user_data: UserCreateTeste, db: Session = Depends(get_db)):
    """
    Endpoint de teste para registrar um novo usuário administrador sem empresa.

    Args:
        user_data (UserCreateTeste): Os dados do usuário de teste a ser criado.
        db (Session): A sessão do banco de dados.

    Raises:
        HTTPException: Se o e-mail fornecido já estiver cadastrado.

    Returns:
        dict: Uma mensagem de sucesso informando que o usuário de teste foi cadastrado.
    """
    usuario_existente = db.query(User).filter(User.email == user_data.email).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Usuário com este e-mail já cadastrado.")
    senha_temporaria = secrets.token_hex(8)
    db_user = User(
        nome=user_data.nome,
        email=user_data.email,
        senha=pwd_context.hash(senha_temporaria),
        registro=user_data.registro,
        telefone=user_data.telefone,
        whatsapp=user_data.whatsapp,
        criado_em=datetime.now(),
        primeiro_acesso=True,
        permissao_adm=True, 
        plano="01"
    )
    db.add(db_user)
    db.commit()
    return {"message": "Usuário de teste cadastrado com sucesso!"}

# ROTAS DE PRIMEIRO ACESSO
@router.post("/verificarEmailPrimeiroAcesso")
async def verificar_email_para_primeiro_acesso(request: VerificacaoDeEmail, db: Session = Depends(get_db)):
    """
    Verifica se um e-mail é válido para realizar o primeiro acesso.

    Args:
        request (VerificacaoDeEmail): A requisição contendo o e-mail a ser verificado.
        db (Session): A sessão do banco de dados.

    Raises:
        HTTPException: Se o e-mail for inválido ou se o usuário já tiver realizado
                       o primeiro acesso.

    Returns:
        dict: Um dicionário contendo o e-mail do usuário, caso seja válido.
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="E-mail inválido.")
    if not user.primeiro_acesso:
        raise HTTPException(status_code=400, detail="Este usuário já realizou o primeiro acesso.")
    
    return {"email": user.email}

@router.post("/primeiroAcessoFuncao")
async def definir_senha_primeiro_acesso(acesso_data: PrimeiroAcesso, db: Session = Depends(get_db)):
    """
    Define a nova senha do usuário no primeiro acesso.

    Args:
        acesso_data (PrimeiroAcesso): Os dados de primeiro acesso, incluindo e-mail e nova senha.
        db (Session): A sessão do banco de dados.

    Raises:
        HTTPException: Se a requisição for inválida (e-mail não encontrado ou
                       primeiro acesso já realizado).

    Returns:
        RedirectResponse: Redireciona para a página de login com uma mensagem de sucesso.
    """
    user = db.query(User).filter(User.email == acesso_data.email).first()
    if not user or not user.primeiro_acesso:
        raise HTTPException(status_code=400, detail="Requisição inválida.")

    user.senha = pwd_context.hash(acesso_data.senha)
    user.primeiro_acesso = False
    db.commit()
    
    return RedirectResponse(url="/?message=Senha definida com sucesso! Faça o login.", status_code=303)


# ROTA PARA WEBHOOK

@router.post("/cadastroWebhook")
async def processar_webhook_cadastro(request: Request, db: Session = Depends(get_db)):
    """
    Processa webhooks de criação ou cancelamento de assinatura.

    Args:
        request (Request): A requisição HTTP contendo o payload do webhook.
        db (Session): A sessão do banco de dados.

    Raises:
        HTTPException: Se o payload do webhook for inválido.

    Returns:
        dict: Uma mensagem indicando o resultado do processamento do webhook.
    """
    body = await request.json()
    cliente = body.get("Customer")
    event = body.get("webhook_event_type")

    if not cliente or not event:
        raise HTTPException(status_code=400, detail="Payload do webhook inválido.")

    email = cliente.get("email")
    usuario_existente = db.query(User).filter(User.email == email).first()

    if event == "order_approved":
        if usuario_existente:
            return {"message": "Usuário já existente, nenhuma ação tomada."}

        # Lógica para criar novo usuário
        senha_temporaria = str(random.randint(100000, 999999))
        novo_usuario = User(
            nome=cliente.get("full_name"),
            email=email,
            whatsapp=cliente.get("mobile"),
            plano="01",
            senha=pwd_context.hash(senha_temporaria),
            registro=cliente.get("cpf") or cliente.get("cnpj"),
            permissao_adm=True,
            telefone=cliente.get("mobile"),
            criado_em=datetime.now()
        )
        db.add(novo_usuario)
        db.commit()
        return {"message": "Acesso criado com sucesso via webhook."}

    elif event == "order_refunded":
        if usuario_existente:
            db.delete(usuario_existente)
            db.commit()
            return {"message": "Acesso removido com sucesso via webhook."}
        return {"message": "Usuário não encontrado, nenhuma ação tomada."}

    return {"message": "Evento de webhook não suportado."}



# Rota para recuperação de senha
@router.post("/senha-reset", tags=["Login"])
async def pedidoRedefinicaoSenha(request:PasswordResetRequest,background_tasks: BackgroundTasks,db: Session = Depends(get_db)):
    """
    Inicia o processo de redefinição de senha para um usuário.

    Args:
        request (PasswordResetRequest): A requisição contendo o e-mail do usuário.
        background_tasks (BackgroundTasks): O gerenciador de tarefas em segundo plano do FastAPI.
        db (Session): A sessão do banco de dados.

    Raises:
        HTTPException: Se o e-mail fornecido for inválido.

    Returns:
        dict: Uma mensagem de sucesso e o código de verificação (para fins de teste).
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=400,detail="Email inválido")
    
    verification_code = generate_verification_code()
    user.codigo_verificacao = verification_code
    user.codigo_verificacao_criado_em = datetime.now()
    db.commit()
    background_tasks.add_task(send_verification_code, user.email, verification_code)
    return {"message": "Verifique seu e-mail para redefinir sua senha", "codigo_verificacao": verification_code}

from fastapi.responses import JSONResponse
@router.post("/resetar-senha", tags=["Login"])
async def resetar_senha(form:PasswordResetForm,db: Session = Depends(get_db)):
    """
    Redefine a senha de um usuário após a verificação do código.

    Args:
        form (PasswordResetForm): O formulário contendo o e-mail, o código de verificação
                                  e a nova senha.
        db (Session): A sessão do banco de dados.

    Raises:
        HTTPException: Se o e-mail, o código de verificação ou o tempo de expiração
                       forem inválidos.

    Returns:
        JSONResponse: Uma resposta JSON indicando que a senha foi redefinida com sucesso.
    """
    user = db.query(User).filter(User.email == form.email).first()
    if not user:
        raise HTTPException(status_code=400,detail="Email inválido")
    print("Código enviado: ", form.verification_code, type(form.verification_code))
    print("Código esperado: ", user.codigo_verificacao, type(user.codigo_verificacao))
    if user.codigo_verificacao != form.verification_code:
        raise HTTPException(status_code=400,detail="Código de Verificação inválido")
    if (datetime.now() - user.codigo_verificacao_criado_em).seconds > 300:
        raise HTTPException(status_code=400,detail="Código de Verificação expirado")
    
    hashed_password = pwd_context.hash(form.new_password)
    user.senha = hashed_password
    user.codigo_verificacao = None
    user.codigo_verificacao_criado_em = None
    db.commit()
    return JSONResponse(
        status_code=200,
        content={"message": "Senha redefinida com sucesso!"}
    )
