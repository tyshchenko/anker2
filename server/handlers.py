import json
import tornado.web
import tornado.websocket
import asyncio
from typing import Optional, Set
from models import InsertTrade, InsertMarketData
from storage import storage
from pydantic import ValidationError


class BaseHandler(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_header("Content-Type", "application/json")
    
    def write_error(self, status_code: int, **kwargs):
        if "error_message" in kwargs:
            message = kwargs["error_message"]
        else:
            message = "Internal Server Error"
        
        self.write({"error": message})


class MarketDataHandler(BaseHandler):
    async def get(self, pair: Optional[str] = None):
        try:
            if pair:
                # Get specific pair data: /api/market/{pair}
                data = await storage.get_market_data(pair)
                self.write({"data": [item.dict(by_alias=True) for item in data]})
            else:
                # Get all market data: /api/market
                data = await storage.get_all_market_data()
                self.write({"data": [item.dict(by_alias=True) for item in data]})
        except Exception as e:
            self.set_status(500)
            self.write({"error": "Failed to fetch market data"})


class TradesHandler(BaseHandler):
    async def post(self):
        try:
            body = json.loads(self.request.body.decode())
            trade_data = InsertTrade(**body)
            trade = await storage.create_trade(trade_data)
            self.write(trade.dict(by_alias=True))
        except ValidationError as e:
            self.set_status(400)
            self.write({"error": "Invalid trade data", "details": e.errors()})
        except Exception as e:
            self.set_status(500)
            self.write({"error": str(e)})


class UserTradesHandler(BaseHandler):
    async def get(self, user_id: str):
        try:
            trades = await storage.get_user_trades(user_id)
            self.write({"data": [trade.dict(by_alias=True) for trade in trades]})
        except Exception as e:
            self.set_status(500)
            self.write({"error": "Failed to fetch trades"})


class WebSocketHandler(tornado.websocket.WebSocketHandler):
    clients: Set['WebSocketHandler'] = set()
    
    def check_origin(self, origin):
        return True  # Allow all origins for development
    
    def open(self, *args, **kwargs):
        self.clients.add(self)
        print("WebSocket client connected")
        # Send initial market data
        asyncio.create_task(self.send_initial_data())
    
    async def send_initial_data(self):
        try:
            data = await storage.get_all_market_data()
            message = {
                "type": "market_data",
                "data": [item.dict(by_alias=True) for item in data]
            }
            self.write_message(json.dumps(message))
        except Exception as e:
            print(f"Error sending initial data: {e}")
    
    def on_message(self, message):
        try:
            data = json.loads(message)
            if data.get("type") == "subscribe" and data.get("pair"):
                print(f"Client subscribed to {data['pair']}")
        except json.JSONDecodeError:
            print("Invalid WebSocket message received")
    
    def on_close(self):
        self.clients.discard(self)
        print("WebSocket client disconnected")
    
    @classmethod
    async def broadcast_market_update(cls, data):
        """Broadcast market data updates to all connected clients"""
        if cls.clients:
            message = {
                "type": "market_data",
                "data": [item.dict(by_alias=True) for item in data]
            }
            message_str = json.dumps(message)
            for client in cls.clients.copy():
                try:
                    client.write_message(message_str)
                except Exception:
                    cls.clients.discard(client)