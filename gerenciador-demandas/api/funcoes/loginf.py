# 1. Importações da Biblioteca Padrão
from datetime import datetime, timedelta
from typing import Optional, Dict
import random
import string
from zoneinfo import ZoneInfo
# 2. Importações de Bibliotecas de Terceiros
from fastapi import Depends, HTTPException, Request,Query,WebSocket,WebSocketException
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import smtplib 
from email.mime.multipart import MIMEMultipart 
from email.mime.text import MIMEText 
from email.mime.image import MIMEImage  
from email.utils import formatdate 
from fastapi_mail import ConnectionConfig
# 3. Importações da Aplicação Local
from db.session import SessionLocal
from api.models.demandasM import User
from config.mainconfig import settings

fuso_horario_brasil = ZoneInfo("America/Sao_Paulo")
# --- Constantes e Configuração ---
# Contexto para criptografia de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Configurações do Token JWT
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 900

# --- Dependência do Banco de Dados ---
def get_db():
    """
    Fornece uma sessão de banco de dados por requisição.

    Yields:
        Session: A sessão do banco de dados.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Funções de Criptografia e Senha ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha fornecida corresponde à senha com hash.

    Args:
        plain_password (str): A senha em texto plano.
        hashed_password (str): A senha com hash.

    Returns:
        bool: True se a senha corresponder, False caso contrário.
    """
    return pwd_context.verify(plain_password, hashed_password)
def get_password_hash(password: str) -> str:
    """
    Gera o hash de uma senha.

    Args:
        password (str): A senha em texto plano.

    Returns:
        str: O hash da senha.
    """
    return pwd_context.hash(password)

# --- Funções de Token (JWT) ---
def create_access_token(data: Dict, expires_delta: timedelta) -> str:
    """
    Cria um novo token de acesso JWT.

    Args:
        data (Dict): Os dados a serem incluídos no token.
        expires_delta (timedelta): O tempo de expiração do token.

    Returns:
        str: O token de acesso JWT codificado.
    """
    to_encode = data.copy()
    expire = datetime.now(fuso_horario_brasil) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Funções de Autenticação e Dependências ---
def get_user(db, email: str) -> Optional[User]:
    """
    Busca um usuário pelo e-mail.

    Args:
        db (Session): A sessão do banco de dados.
        email (str): O e-mail do usuário.

    Returns:
        Optional[User]: O objeto do usuário, ou None se não for encontrado.
    """
    return db.query(User).filter(User.email == email).first()

async def authenticate_user(db: Session, email: str, senha: str) -> Optional[User]:
    """
    Autentica um usuário, verificando e-mail e senha.

    Args:
        db (Session): A sessão do banco de dados.
        email (str): O e-mail do usuário.
        senha (str): A senha do usuário.

    Returns:
        Optional[User]: O objeto do usuário em caso de sucesso, ou None caso contrário.
    """
    user = get_user(db,email)
    if not user:
        return None
    if not verify_password(senha, user.senha):
        return None
    return user

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """
    Dependência do FastAPI para obter o usuário logado a partir do token no cookie.

    Args:
        request (Request): A requisição HTTP.
        db (Session): A sessão do banco de dados.

    Raises:
        HTTPException: Se o usuário não estiver autenticado ou se o token for inválido.

    Returns:
        User: O objeto do usuário autenticado.
    """
    access_token = request.cookies.get("accessToken")
    if access_token is None:
        raise HTTPException(status_code=401, detail="Usuário não autenticado")

    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token inválido, e-mail ausente")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    user = get_user(db, email=email)
    if user is None:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
        
    return user

async def get_current_user_from_ws(
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependência para autenticar um usuário a partir de um token em um query parameter de WebSocket.

    Args:
        token (Optional[str], optional): O token de acesso. Defaults to Query(None).
        db (Session, optional): A sessão do banco de dados. Defaults to Depends(get_db).

    Raises:
        WebSocketException: Se o token não for fornecido ou for inválido.

    Returns:
        User: O objeto do usuário autenticado.
    """
    if token is None:
        raise WebSocketException(code=1008, reason="Token não fornecido.")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise WebSocketException(code=1008, reason="Token inválido: e-mail ausente.")
    except JWTError:
        raise WebSocketException(code=1008, reason="Token inválido ou expirado.")

    user = get_user(db, email=email)
    if user is None:
        raise WebSocketException(code=1008, reason="Usuário não encontrado.")

    return user

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_USERNAME,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=True,  # Substitui MAIL_TLS
    MAIL_SSL_TLS=False,  # Substitui MAIL_SSL
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)




def carregar_template_html(caminho_email: str) -> str:
    """
    Carrega o conteúdo de um arquivo de template HTML.

    Args:
        caminho_email (str): O caminho para o arquivo HTML.

    Returns:
        str: O conteúdo do arquivo HTML como uma string.
    """
    with open(caminho_email, 'r', encoding='utf-8') as arquivo:
        return arquivo.read()

def generate_verification_code(length=6):
    """
    Gera um código de verificação alfanumérico.

    Args:
        length (int, optional): O comprimento do código. Defaults to 6.

    Returns:
        str: O código de verificação gerado.
    """
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


# Função para enviar e-mail de recuperação de senha
def send_verification_code(destinatario: str, code: str):
    """
    Envia um e-mail com o código de verificação para redefinição de senha.

    Args:
        destinatario (str): O endereço de e-mail do destinatário.
        code (str): O código de verificação a ser enviado.
    """
    assunto = 'Código de Redefinição de Senha'
    # Carrega o template e insere o código no local apropriado
    mensagem = carregar_template_html('templates/recuperacao_senha.html').format(code=code)
    
    # Configurações do servidor de e-mail
    smtp_server = settings.MAIL_SERVER
    smtp_port = settings.MAIL_PORT
    remetente = settings.MAIL_USERNAME
    senha = settings.MAIL_PASSWORD
    
    # Criação do objeto de mensagem
    msg = MIMEMultipart('related')
    msg['From'] = remetente
    msg['To'] = destinatario
    msg['Subject'] = assunto
    msg['Date'] = formatdate(localtime=True)

    # Adicionar alternativa de texto/HTML
    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)
    msg_html = MIMEText(mensagem, 'html')
    msg_alternative.attach(msg_html)

    # Adiciona uma imagem se necessário, exemplo de logo
    # with open("static/img/logo.png", "rb") as img_file:
    #     img = MIMEImage(img_file.read())
    #     img.add_header('Content-ID', '<logo>')
    #     msg.attach(img)

    # Enviar e-mail
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()  # Inicia uma conexão segura com TLS
        server.login(remetente, senha)
        server.sendmail(remetente, destinatario, msg.as_string())  # Envia o e-mail
        print('E-mail de recuperação enviado com sucesso!')
    except Exception as e:
        print(f"Erro ao enviar o e-mail de recuperação: {e}")
    finally:
        server.quit()  # Encerra a conexão com o servidor