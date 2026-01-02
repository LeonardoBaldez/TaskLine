# 1. Bibliotecas de Terceiros (Instaladas via pip)
from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
# 2. Módulos locais
from api.funcoes.loginf import get_current_user
from api.funcoes.logs import get_logs_by_empresa
from api.funcoes.user import get_user_setor
from api.funcoes.demandas import ler_notificacao
from api.models.demandasM import User, Gestao
from db.session import SessionLocal

# --- Configuração Inicial ---
# Criação do roteador e instância dos templates
router = APIRouter(
    prefix="/app", # Adicionar um prefixo 
    tags=["Páginas e Templates"] # Tag padrão para este grupo de rotas
)

templates = Jinja2Templates(directory="templates")
# --- Dependência para Sessão do Banco de Dados ---
def get_db():
    """
    Cria e fornece uma sessão de banco de dados por requisição.

    Garante que a sessão seja sempre fechada ao final.

    Yields:
        Session: A sessão do banco de dados.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Rotas da Aplicação ---

@router.get("/home", response_class=HTMLResponse)
async def show_home_page(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Exibe a página inicial (home) do usuário.

    Args:
        request (Request): A requisição HTTP.
        current_user (User): O usuário atualmente autenticado.
        db (Session): A sessão do banco de dados.

    Returns:
        TemplateResponse: A página home renderizada com as notificações do usuário.
    """
    notificacoes = await ler_notificacao(db, current_user.id)
    return templates.TemplateResponse("home.html", {
        "request": request,
        "notificacoes": notificacoes,
        "current_user": current_user
    })
    
@router.post("/home", response_class=HTMLResponse)
async def handle_home_form(request: Request, current_user: User = Depends(get_current_user)):
    """
    Processa dados de um formulário enviado da página home.

    Args:
        request (Request): A requisição HTTP.
        current_user (User): O usuário atualmente autenticado.

    Returns:
        RedirectResponse: Redireciona de volta para a página home.
    """
    return RedirectResponse(url="/app/home", status_code=303)

@router.get("/personalizar", response_class=HTMLResponse)
async def show_personalizar_page(request: Request, current_user: User = Depends(get_current_user)):
    """
    Exibe a página de personalização.

    Args:
        request (Request): A requisição HTTP.
        current_user (User): O usuário atualmente autenticado.

    Returns:
        TemplateResponse: A página de personalização renderizada.
    """
    return templates.TemplateResponse("personalizar.html", {
        "request": request,
        "current_user": current_user
    })

@router.post("/personalizar", response_class=HTMLResponse)
async def handle_personalizar_form(request: Request, current_user: User = Depends(get_current_user)):
    """
    Processa dados do formulário de personalização.

    Args:
        request (Request): A requisição HTTP.
        current_user (User): O usuário atualmente autenticado.

    Returns:
        RedirectResponse: Redireciona de volta para a página de personalização.
    """
    # Redireciona para a mesma página para evitar reenvio do formulário
    return RedirectResponse(url="/app/personalizar", status_code=303)

@router.get("/perfil", response_class=HTMLResponse)
async def show_perfil_page(request: Request, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    """
    Exibe a página de perfil do usuário, incluindo seus setores.

    Args:
        request (Request): A requisição HTTP.
        db (Session): A sessão do banco de dados.
        current_user (User): O usuário atualmente autenticado.

    Returns:
        TemplateResponse: A página de perfil renderizada com os dados do usuário, notificações e setores.
    """
    setores = get_user_setor(db,current_user.id)
    notificacoes = await ler_notificacao(db, current_user.id)
    gestor = db.query(Gestao).filter(Gestao.id_usuario == current_user.id).first()
    
    return templates.TemplateResponse("perfil.html", {
        "request": request,
        "current_user": current_user,
        "notificacoes": notificacoes,
        "setores": setores,
        "gestor": gestor.gestor
    })

@router.get("/demanda/{id}", response_class=HTMLResponse)
async def show_demanda_details(request: Request, id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Exibe os detalhes de uma demanda específica.

    Args:
        request (Request): A requisição HTTP.
        id (int): O ID da demanda a ser exibida.
        current_user (User): O usuário atualmente autenticado.
        db (Session): A sessão do banco de dados.

    Returns:
        TemplateResponse: A página da demanda renderizada com os detalhes da demanda, notificações e informações do usuário.
    """
    notificacoes = await ler_notificacao(db, current_user.id)
    return templates.TemplateResponse("demanda.html", {
        "request": request,
        "current_user": current_user,
        "notificacoes": notificacoes,
        "id": id
    })
    
@router.get("/telaerro", response_class=HTMLResponse)
async def telaErro(request: Request):
    """
    Exibe a página de erro.

    Args:
        request (Request): A requisição HTTP.

    Returns:
        TemplateResponse: A página de erro renderizada.
    """
    return templates.TemplateResponse("telaErro.html", {
        "request": request
    })