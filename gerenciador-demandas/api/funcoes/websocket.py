from typing import Dict,List
from fastapi import WebSocket

class ConnectionManager:
    """
    Gerencia todas as conexões de WebSocket ativas.

    Attributes:
        active_connections (Dict[int, List[WebSocket]]): Um dicionário que armazena as conexões ativas,
                                                        onde a chave é o user_id e o valor é uma lista
                                                        de conexões WebSocket para aquele usuário.
    """
    def __init__(self):
        self.active_connections:Dict[int,List[WebSocket]] = {}
        
    async def connect(self,websocket: WebSocket, user_id:int):
        """
        Aceita uma nova conexão WebSocket e a adiciona à lista de conexões ativas.

        Args:
            websocket (WebSocket): A nova conexão WebSocket.
            user_id (int): O ID do usuário associado à conexão.
        """
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """
        Remove uma conexão WebSocket da lista de conexões ativas.

        Args:
            websocket (WebSocket): A conexão WebSocket a ser removida.
            user_id (int): O ID do usuário associado à conexão.
        """
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
    
    async def send_personal_message(self, message:str, user_id: int):
        """
        Envia uma mensagem para todas as conexões de um usuário específico.

        Args:
            message (str): A mensagem a ser enviada.
            user_id (int): O ID do usuário que receberá a mensagem.
        """
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_text(message)

manager = ConnectionManager()
