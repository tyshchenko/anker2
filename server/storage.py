from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import random
from decimal import Decimal
from models import User, InsertUser, Trade, InsertTrade, MarketData, InsertMarketData, Session


class IStorage(ABC):
    @abstractmethod
    async def get_user(self, user_id: str) -> Optional[User]:
        pass

    @abstractmethod
    async def get_user_by_username(self, username: str) -> Optional[User]:
        pass

    @abstractmethod
    async def create_user(self, insert_user: InsertUser) -> User:
        pass

    @abstractmethod
    async def create_trade(self, insert_trade: InsertTrade) -> Trade:
        pass

    @abstractmethod
    async def get_user_trades(self, user_id: str) -> List[Trade]:
        pass

    @abstractmethod
    async def get_market_data(self, pair: str) -> List[MarketData]:
        pass

    @abstractmethod
    async def update_market_data(self, data: InsertMarketData) -> MarketData:
        pass

    @abstractmethod
    async def get_all_market_data(self) -> List[MarketData]:
        pass
    
    # Authentication methods
    @abstractmethod
    async def get_user_by_email(self, email: str) -> Optional[User]:
        pass
    
    @abstractmethod
    async def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        pass
    
    @abstractmethod
    async def create_session(self, user_id: str, session_token: str, expires_at: datetime) -> Session:
        pass
    
    @abstractmethod
    async def get_session(self, session_token: str) -> Optional[Session]:
        pass
    
    @abstractmethod
    async def delete_session(self, session_token: str) -> bool:
        pass


class MemStorage(IStorage):
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.trades: Dict[str, Trade] = {}
        self.market_data: Dict[str, List[MarketData]] = {}
        self.sessions: Dict[str, Session] = {}
        self._initialize_market_data()

    def _initialize_market_data(self):
        pairs = ["BTC/ZAR", "ETH/ZAR", "USDT/ZAR", "USD/ZAR", "EUR/ZAR", "GBP/ZAR"]
        base_prices = {
            "BTC/ZAR": Decimal("1202500"),
            "ETH/ZAR": Decimal("64750"),
            "USDT/ZAR": Decimal("18.50"),
            "USD/ZAR": Decimal("18.50"),
            "EUR/ZAR": Decimal("20.00"),
            "GBP/ZAR": Decimal("23.00")
        }

        for pair in pairs:
            base_price = base_prices.get(pair, Decimal("1"))
            data = []
            
            # Generate 72 hours of hourly data
            for i in range(72, 0, -1):
                timestamp = datetime.now() - timedelta(hours=i)
                volatility = (random.random() - 0.5) * 0.02  # ±1% volatility
                price = base_price * (1 + Decimal(str(volatility)))
                
                data.append(MarketData(
                    pair=pair,
                    price=price,
                    change_24h=Decimal(str((random.random() - 0.5) * 5)),  # ±2.5% change
                    volume_24h=Decimal(str(random.random() * 1000000)),
                    timestamp=timestamp
                ))
            
            self.market_data[pair] = data

    async def get_user(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)

    async def get_user_by_username(self, username: str) -> Optional[User]:
        for user in self.users.values():
            if user.username == username:
                return user
        return None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        for user in self.users.values():
            if user.email == email:
                return user
        return None
    
    async def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        for user in self.users.values():
            if user.google_id == google_id:
                return user
        return None
    
    async def create_session(self, user_id: str, session_token: str, expires_at: datetime) -> Session:
        session = Session(
            user_id=user_id,
            session_token=session_token,
            expires_at=expires_at
        )
        self.sessions[session_token] = session
        return session
    
    async def get_session(self, session_token: str) -> Optional[Session]:
        session = self.sessions.get(session_token)
        if session and session.expires_at > datetime.now():
            return session
        elif session:
            # Clean up expired session
            del self.sessions[session_token]
        return None
    
    async def delete_session(self, session_token: str) -> bool:
        if session_token in self.sessions:
            del self.sessions[session_token]
            return True
        return False

    async def create_user(self, insert_user: InsertUser) -> User:
        user = User(**insert_user.dict())
        self.users[user.id] = user
        return user

    async def create_trade(self, insert_trade: InsertTrade) -> Trade:
        trade = Trade(
            user_id=insert_trade.userId,
            type=insert_trade.type,
            from_asset=insert_trade.fromAsset,
            to_asset=insert_trade.toAsset,
            from_amount=insert_trade.fromAmount,
            to_amount=insert_trade.toAmount,
            rate=insert_trade.rate,
            fee=insert_trade.fee,
            status="completed",
            created_at=datetime.now()
        )
        self.trades[trade.id] = trade
        return trade

    async def get_user_trades(self, user_id: str) -> List[Trade]:
        user_trades = [
            trade for trade in self.trades.values() 
            if trade.userId == user_id
        ]
        return sorted(user_trades, key=lambda t: t.createdAt, reverse=True)

    async def get_market_data(self, pair: str) -> List[MarketData]:
        return self.market_data.get(pair, [])

    async def update_market_data(self, data: InsertMarketData) -> MarketData:
        market_data = MarketData(
            pair=data.pair,
            price=data.price,
            change_24h=data.change24h,
            volume_24h=data.volume24h,
            timestamp=datetime.now()
        )

        existing = self.market_data.get(data.pair, [])
        existing.append(market_data)
        
        # Keep only last 72 hours of data
        cutoff = datetime.now() - timedelta(hours=72)
        filtered = [d for d in existing if d.timestamp > cutoff]
        
        self.market_data[data.pair] = filtered
        return market_data

    async def get_all_market_data(self) -> List[MarketData]:
        all_data = []
        for data_list in self.market_data.values():
            if data_list:
                all_data.append(data_list[-1])  # Latest data point for each pair
        return all_data


# Global storage instance
storage = MemStorage()