# 1. Importações da Biblioteca Padrão
from datetime import datetime
from typing import List, Dict, Any, Optional

# 2. Importações de Bibliotecas de Terceiros
from pydantic import BaseModel, EmailStr
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import declarative_base, relationship
# --- Base do Banco de Dados ---
# Base declarativa da qual os modelos ORM herdarão.
Base = declarative_base()

#--- Modelos do Banco de Dados (SQLAlchemy ORM) ---
# Representa a tabela 'usuarios' no banco de dados.

# --- Modelos de Dados (Pydantic Schemas) ---
# Define a estrutura de dados para validação e serialização na API.
class UserCreate(BaseModel):
    """
    Schema para criar um novo usuário com seus setores.

    Attributes:
        nome (str): O nome do usuário.
        email (str): O e-mail do usuário.
        registro (str): O CPF ou CNPJ do usuário.
        telefone (str): O telefone de contato do usuário.
        whatsapp (str): O número de WhatsApp do usuário.
        setores (Any): Os setores aos quais o usuário pertence.
    """
    nome: str
    email: str
    registro: str
    telefone: str
    whatsapp: str
    setores: Any
class UserCreateTeste(BaseModel):
    """
    Schema para criar um usuário de teste simplificado.

    Attributes:
        nome (str): O nome do usuário.
        email (EmailStr): O e-mail do usuário.
        registro (str): O CPF ou CNPJ do usuário.
        telefone (str): O telefone de contato do usuário.
        whatsapp (str): O número de WhatsApp do usuário.
    """
    nome: str
    email: EmailStr
    registro: str
    telefone: str
    whatsapp: str
class UserUpdate(BaseModel):
    """
    Schema para atualizar um usuário existente.

    Attributes:
        id (int): O ID do usuário a ser atualizado.
        nome (str): O novo nome do usuário.
        email (EmailStr): O novo e-mail do usuário.
        registro (str): O novo CPF ou CNPJ do usuário.
        telefone (str): O novo telefone de contato do usuário.
        whatsapp (str): O novo número de WhatsApp do usuário.
        setores (Any): A nova lista de setores aos quais o usuário pertence.
    """
    id: int # O ID do usuário a ser atualizado
    nome: str
    email: EmailStr
    registro: str
    telefone: str
    whatsapp: str
    setores: Any
# Modelos para autenticação e verificação
class VerificacaoDeEmail(BaseModel):
    """
    Schema para receber um e-mail para verificação.

    Attributes:
        email (EmailStr): O e-mail a ser verificado.
    """
    email: EmailStr
class PrimeiroAcesso(BaseModel):
    """
    Schema para o processo de definição de senha no primeiro acesso.

    Attributes:
        email (EmailStr): O e-mail do usuário.
        senha (str): A nova senha do usuário.
    """
    email: EmailStr
    senha: str
# Modelo para atualização da configuração da empresa
class EmpresaConfigUpdatePayload(BaseModel):
    """
    Schema para receber os dados de atualização da configuração da empresa.

    Attributes:
        empresa (Optional[List[Dict[str, Any]]]): Os novos dados da empresa.
        setores (Optional[List[Dict[str, Any]]]): A nova lista de setores.
        areas (Optional[List[Dict[str, Any]]]): A nova lista de áreas e seus modelos de etapa.
    """
    empresa: Optional[List[Dict[str, Any]]] = None
    setores: Optional[List[Dict[str, Any]]] = None
    areas: Optional[List[Dict[str, Any]]] = None
    
    
class PasswordResetRequest(BaseModel):
    """
    Schema para solicitar a redefinição de senha.

    Attributes:
        email (EmailStr): O e-mail do usuário que solicita a redefinição de senha.
    """
    email: EmailStr
    
class PasswordResetForm(BaseModel):
    """
    Schema para o formulário de redefinição de senha.

    Attributes:
        email (EmailStr): O e-mail do usuário.
        verification_code (str): O código de verificação recebido por e-mail.
        new_password (str): A nova senha do usuário.
    """
    email: EmailStr
    verification_code: str
    new_password: str