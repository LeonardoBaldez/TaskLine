from db.base import engine
from db.models import *


def create_database():
    """
    Cria todas as tabelas no banco de dados registradas no metadata da Base.
    """
    print("Iniciando a criação das tabelas...")
    try:
        # A mágica acontece aqui!
        # Usamos Base.metadata em vez de um objeto metadata importado separadamente.
        Base.metadata.create_all(bind=engine)
        print("Tabelas criadas com sucesso! ✅")
    except Exception as e:
        print(f"Ocorreu um erro ao criar as tabelas: {e}")

if __name__ == "__main__":
    create_database()