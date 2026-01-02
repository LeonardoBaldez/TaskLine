# 1. Importações da Biblioteca Padrão
import json
import re
from base64 import b64decode
from datetime import datetime
from typing import List, Optional

# 2. Importações de Bibliotecas de Terceiros
from jose import jwt, JWTError
from fastapi import Request, HTTPException,Depends
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session, selectinload

# 3. Importações da Aplicação Local
from api.models.user_models import EmpresaConfigUpdatePayload
from api.models.demandasM import Gestao, Setores,Empresa, Area,ModeloEtapa,User,Demanda
from db.session import SessionLocal
from config.mainconfig import settings
from db.session import SessionLocal

# --- Constantes de Segurança ---
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

# --- Dependência para Sessão do Banco de Dados ---
def get_db():
    """
    Cria e fornece uma sessão de banco de dados por requisição.

    Yields:
        Session: A sessão do banco de dados.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Funções de Banco de Dados / CRUD ---

def get_user(db: Session, email: str) -> Optional[User]:
    """
    Busca um usuário pelo e-mail no banco de dados.

    Args:
        db (Session): A sessão do banco de dados.
        email (str): O e-mail do usuário.

    Returns:
        Optional[User]: O objeto do usuário, ou None se não for encontrado.
    """
    return db.query(User).filter(User.email == email).first()

def get_user_setor(db: Session, usuario_id: int) -> List[str]:
    """
    Busca os nomes de todos os setores de um usuário.

    Args:
        db (Session): A sessão do banco de dados.
        usuario_id (int): O ID do usuário.

    Returns:
        List[str]: Uma lista com os nomes dos setores do usuário.
    """
    # Consulta otimizada com JOIN para evitar o problema N+1.
    # Isto faz uma única chamada ao banco para buscar todos os nomes.
    resultados = (
        db.query(Setores.nome)
        .join(Gestao, Gestao.id_setor == Setores.id)
        .filter(Gestao.id_usuario == usuario_id)
        .all()
    )
    # O resultado é uma lista de tuplas, ex: [('Financeiro',), ('Vendas',)].
    # A linha abaixo converte para uma lista de strings: ['Financeiro', 'Vendas'].
    return [nome for nome, in resultados]

# --- Funções de Dependência / Autenticação ---

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
    token_acesso = request.cookies.get("token_acesso")
    if token_acesso is None:
        raise HTTPException(status_code=401, detail="Usuário não autenticado")

    try:
        payload = jwt.decode(token_acesso, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token inválido: e-mail ausente.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")

    # Passa a sessão 'db' para a função que busca o usuário.
    user = get_user(db, email=email)
    if user is None:
        raise HTTPException(status_code=401, detail="Usuário não encontrado.")
        
    return user




# --- Funções de Serviço  ---
def _criar_empresa_com_personalizacao(db: Session, dados_json: str, imagem_conteudo: bytes, user: User):
    """
    Cria uma empresa com personalização, incluindo setores, áreas e modelos de etapa.

    Args:
        db (Session): A sessão do banco de dados.
        dados_json (str): Uma string JSON contendo os dados de personalização.
        imagem_conteudo (bytes): O conteúdo da imagem da logo da empresa.
        user (User): O usuário administrador que está criando a empresa.
    """
    # (O corpo desta função permanece o mesmo que você forneceu)
    dados_dict = json.loads(dados_json)
    
    # ... (toda a lógica de criação de empresa, setores, áreas, etc.)
    # 1. Cria a Empresa
    empresa_data = dados_dict[0]
    nova_empresa = Empresa(
        nome=empresa_data["nomeEmpresa"],
        logo=imagem_conteudo,
        cod_cor=int(dados_dict[1]["cod_cor"]),
        plano=user.plano,
        fim_contrato=datetime.now() + relativedelta(years=1),
        acessos=100
    )
    db.add(nova_empresa)
    db.flush() 

    # 2. Cria os Setores
    setores_criados = {}
    
    for nome_setor in set(dados_dict[2]["setores"]):
        novo_setor = Setores(empresa_id=nova_empresa.id, nome=nome_setor)
        db.add(novo_setor)
        db.flush()
        setores_criados[nome_setor] = novo_setor.id
    # 3. Cria Áreas e Modelos de Etapa
    for area_data in dados_dict[3]["areas"]:
        nova_area = Area(empresa_id=nova_empresa.id, nome_area=area_data['nomeArea'])
        db.add(nova_area)
        db.flush()
        for i, etapa_data in enumerate(area_data['etapas']):
            nome_setor_da_etapa = etapa_data['setor']
            id_setor_correto = setores_criados.get(nome_setor_da_etapa)
            modelo_etapa = ModeloEtapa(
                nome_etapa=etapa_data['nomeEtapa'],
                setor=etapa_data['setor'],
                validacao=etapa_data['validacao'],
                id_area=nova_area.id,
                numero_etapa=i + 1,
                id_setor=id_setor_correto
            )
            db.add(modelo_etapa)
            
    # 4. Atualiza o Usuário ADM
    adm_data = dados_dict[4]
    print(dados_dict[4])
    user.empresa_id = nova_empresa.id
    user.nome = adm_data["nomeAdm"]
    user.email = adm_data["emailAdm"]
    user.telefone = adm_data["telefone"]
    user.whatsapp = adm_data["whatsapp"]
    
    # 5. Associa o ADM ao seus setores
    setores_adm = adm_data["setoresAdm"]
    for setor_adm in setores_adm:
        id_setor_adm = setores_criados.get(setor_adm)
        if id_setor_adm:
            nova_gestao_adm = Gestao(id_usuario=user.id, id_setor=id_setor_adm, gestor=True)
            db.add(nova_gestao_adm)

def _atualizar_empresa_e_relacionados_service(db: Session, empresa_id: int, payload: EmpresaConfigUpdatePayload):
    """
    Atualiza os dados de uma empresa e seus relacionamentos (setores, áreas, modelos de etapa).

    Args:
        db (Session): A sessão do banco de dados.
        empresa_id (int): O ID da empresa a ser atualizada.
        payload (EmpresaConfigUpdatePayload): Os novos dados da empresa.

    Raises:
        e: Uma exceção genérica em caso de erro.

    Returns:
        str: Uma mensagem de sucesso ou uma mensagem de erro indicando por que a
             operação falhou.
    """
    try:
        # --------------------------------------------------------------------
        # 1. ATUALIZA OS DADOS DA EMPRESA
        # --------------------------------------------------------------------
        if payload.empresa:
            empresa_data = payload.empresa[0]
            empresa_db = db.query(Empresa).filter(Empresa.id == empresa_id).first()
            if empresa_db:
                empresa_db.nome = empresa_data.get("nome",empresa_db.nome)
                empresa_db.cod_cor = empresa_data.get("cor",empresa_db.cod_cor)
                logo_base64 = empresa_data.get("logo")
                if logo_base64 and logo_base64.startswith('data:image'):
                    match = re.match(r"data:image\/[a-zA-Z]+;base64,(.*)", logo_base64)
                    if match:
                        empresa_db.logo = b64decode(match.group(1))
        # --------------------------------------------------------------------
        # 2. ATUALIZA OS SETORES
        # --------------------------------------------------------------------
        mapa_setores = {}  # {nome: setor_obj} para uso posterior pelas áreas
        if payload.setores is not None:
            setores_existentes = db.query(Setores).filter(Setores.empresa_id == empresa_id).all()
            mapa_setores_db_por_id = {setor.id: setor for setor in setores_existentes}
            payload_setor_ids = set()

            for setor_data in payload.setores:
                setor_id_str = setor_data.get("id")
                nome_setor = setor_data.get("nome")
                setor_id = None
                if setor_id_str:
                    try:
                        setor_id = int(setor_id_str)
                    except (ValueError, TypeError):
                        setor_id = None

                if setor_id and setor_id > 0 and setor_id in mapa_setores_db_por_id:
                    setor_obj = mapa_setores_db_por_id[setor_id]
                    setor_obj.nome = nome_setor
                    payload_setor_ids.add(setor_id)
                else:
                    setor_obj = Setores(nome=nome_setor, empresa_id=empresa_id)
                    db.add(setor_obj)

            db_setor_ids = set(mapa_setores_db_por_id.keys())
            setores_to_delete_ids = db_setor_ids - payload_setor_ids
            for setor_id_to_delete in setores_to_delete_ids:
                setor_to_delete = mapa_setores_db_por_id[setor_id_to_delete]
                etapas_count = db.query(ModeloEtapa).filter(ModeloEtapa.id_setor == setor_to_delete.id).count()
                if etapas_count > 0:
                    return (f"O setor '{setor_to_delete.nome}' não pode ser excluído pois está em uso por {etapas_count} etapa(s) de demanda.")
                gestao_count = db.query(Gestao).filter(Gestao.id_setor == setor_to_delete.id).count()
                if gestao_count > 0:
                    return (f"O setor '{setor_to_delete.nome}' não pode ser excluído pois há usuários associados a ele.")
                db.delete(setor_to_delete)
        
        db.flush()

        all_final_setores = db.query(Setores).filter(Setores.empresa_id == empresa_id).all()
        mapa_setores_por_nome = {setor.nome: setor.id for setor in all_final_setores}
        mapa_setores_por_id = {setor.id: setor.nome for setor in all_final_setores}
        
        # ---------------------------------------------------------------------
        # 3. ATUALIZA AS ÁREAS E SEUS MODELOS DE ETAPA
        # ---------------------------------------------------------------------
        if payload.areas is not None:
            areas_existentes = db.query(Area).options(selectinload(Area.modelos_etapa)).filter(Area.empresa_id == empresa_id).all()
            mapa_areas_db = {area.id: area for area in areas_existentes}
            payload_area_ids = set()

            for area_data in payload.areas:
                area_id_str = area_data.get("id")
                nome_area = area_data.get("nome_area")
                area_id = None
                if area_id_str:
                    try:
                        area_id = int(area_id_str)
                    except (ValueError, TypeError):
                        area_id = None

                if area_id and area_id > 0 and area_id in mapa_areas_db:
                    area_obj = mapa_areas_db[area_id]
                    area_obj.nome_area = nome_area
                    payload_area_ids.add(area_id)
                else:
                    area_obj = Area(nome_area=nome_area, empresa_id=empresa_id)
                    db.add(area_obj)

                db.flush() 
                mapa_etapas_db = {etapa.numero_etapa: etapa for etapa in area_obj.modelos_etapa}
                numeros_etapas_payload = set()

                for i, etapa_data in enumerate(area_data.get("etapas", [])):
                    numero_etapa = i + 1
                    numeros_etapas_payload.add(numero_etapa)
                    
                    nome_setor_payload = etapa_data["setor"]
                    id_setor = mapa_setores_por_nome.get(nome_setor_payload)
                    
                    etapa_obj = mapa_etapas_db.get(numero_etapa)
                    if not etapa_obj:
                        etapa_obj = ModeloEtapa(numero_etapa=numero_etapa, id_area=area_obj.id)
                        db.add(etapa_obj)
                    
                    # Se o nome do setor do payload não for encontrado, mas a etapa já tinha um id_setor,
                    # use o nome atualizado desse setor.
                    if id_setor is None and etapa_obj.id_setor and etapa_obj.id_setor in mapa_setores_por_id:
                        etapa_data["setor"] = mapa_setores_por_id[etapa_obj.id_setor]
                        id_setor = etapa_obj.id_setor
                    # TODO VERIFICAR USABILIDADE DESSA VALIDAÇÃO 
                    # if id_setor is None and etapa_data.get("setor") is not None:
                    #     return (f"Setor '{etapa_data['setor']}' inválido na área '{nome_area}'.")

                    etapa_obj.nome_etapa = etapa_data.get("nomeEtapa")
                    etapa_obj.setor = etapa_data.get("setor")
                    etapa_obj.validacao = etapa_data.get("validacao")
                    etapa_obj.id_setor = id_setor
                    etapa_obj.area = area_obj

                for numero_etapa_db, etapa_obj_db in mapa_etapas_db.items():
                    if numero_etapa_db not in numeros_etapas_payload:
                        db.delete(etapa_obj_db)

            db_area_ids = set(mapa_areas_db.keys())
            areas_to_delete_ids = db_area_ids - payload_area_ids
            for area_id_to_delete in areas_to_delete_ids:
                area_to_delete = mapa_areas_db[area_id_to_delete]
                demandas_count = db.query(Demanda).filter(Demanda.id_area == area_to_delete.id).count()
                if demandas_count > 0:
                    return (f"A área '{area_to_delete.nome_area}' não pode ser excluída pois está sendo utilizada por {demandas_count} demanda(s).")
                db.delete(area_to_delete)
                    
        # --------------------------------------------------------------------
        # Finaliza a transação
        # --------------------------------------------------------------------
        db.commit()
        return ("Empresa atualizada com sucesso!")
    except Exception as e:
        print(f"Ocorreu um erro, revertendo a transação: {e}")
        db.rollback()
        raise e
