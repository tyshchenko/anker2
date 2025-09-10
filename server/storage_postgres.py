from typing import List, Optional, Dict
from datetime import datetime, timedelta
import random
import requests
import string
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor
import os

from models import User, InsertUser, Trade, InsertTrade, MarketData, InsertMarketData, Session, Wallet, BankAccount, NewWallet, NewBankAccount
from config import DATABASE_URL, VALR_KEY, VALR_SECRET

class DataBase(object):
    def __init__(self, database=None):
        # Use PostgreSQL connection
        if DATABASE_URL:
            self.pool = SimpleConnectionPool(1, 5, DATABASE_URL)
        else:
            raise Exception("DATABASE_URL not found in environment variables")
        
    def query(self, sqlquery, params=None):
        try:
            con = self.pool.getconn()
            cur = con.cursor(cursor_factory=RealDictCursor)
            if params:
                cur.execute(sqlquery, params)
            else:
                cur.execute(sqlquery)
            rows = cur.fetchall()
            # Convert RealDictRow to regular tuples for compatibility
            result = [tuple(row) for row in rows] if rows else []
            cur.close()
            self.pool.putconn(con)
            return result
        except Exception as e:
            print(f"Database query error: {e}")
            if 'con' in locals():
                self.pool.putconn(con, close=True)
            return []
        
    def execute(self, sqlquery, vals=None, return_id=False):
        try:
            con = self.pool.getconn()
            cur = con.cursor()
            if not vals:
                cur.execute(sqlquery)
            else:
                cur.execute(sqlquery, vals)
            con.commit()
            
            row_id = None
            if return_id:
                # PostgreSQL way to get last inserted ID
                cur.execute("SELECT lastval()")
                row_id = cur.fetchone()[0]
            
            cur.close()
            self.pool.putconn(con)
            
            if return_id:
                return True, row_id
            return True
        except Exception as e:
            print(f"Database execute error: {e}")
            if 'con' in locals():
                con.rollback()
                self.pool.putconn(con, close=True)
            return False

class Storage:
    """Storage layer for cryptocurrency exchange"""
    
    def __init__(self):
        self.db = DataBase()
    
    # User management methods
    def create_user(self, user_data: InsertUser) -> Optional[User]:
        """Create a new user"""
        try:
            # Check if user already exists
            check_sql = "SELECT id FROM users WHERE email = %s"
            existing = self.db.query(check_sql, (user_data.email,))
            if existing:
                raise ValueError("User with this email already exists")
            
            # Insert new user - PostgreSQL syntax
            # Combine first_name and last_name into full_name if provided
            full_name = user_data.full_name
            if not full_name and (user_data.first_name or user_data.last_name):
                full_name = f"{user_data.first_name or ''} {user_data.last_name or ''}".strip()
            
            sql = """
                INSERT INTO users (email, password_hash, full_name, phone, country, language, timezone, verification_level, google_id, created_at, updated_at) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()) 
                RETURNING id
            """
            success, user_id = self.db.execute(sql, (
                user_data.email,
                user_data.password_hash,
                full_name,
                user_data.phone or '',
                user_data.country or '',
                user_data.language or 'en',
                user_data.timezone or 'UTC',
                user_data.verification_level or 'basic',
                user_data.google_id
            ), return_id=True)
            
            if success:
                # Fetch the created user
                fetch_sql = "SELECT * FROM users WHERE id = %s"
                user_data = self.db.query(fetch_sql, (user_id,))
                if user_data:
                    return self._row_to_user(user_data[0])
            return None
        except Exception as e:
            print(f"Error creating user: {e}")
            return None
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        sql = "SELECT * FROM users WHERE email = %s"
        result = self.db.query(sql, (email,))
        if result:
            return self._row_to_user(result[0])
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        sql = "SELECT * FROM users WHERE id = %s"
        result = self.db.query(sql, (user_id,))
        if result:
            return self._row_to_user(result[0])
        return None
    
    def _row_to_user(self, row) -> User:
        """Convert database row to User object"""
        # Split full_name into first_name and last_name if available
        full_name = row[3] or ''
        name_parts = full_name.split() if full_name else []
        first_name = name_parts[0] if name_parts else ''
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
        return User(
            id=str(row[0]),
            email=row[1],
            password_hash=row[2],
            full_name=full_name,
            first_name=first_name,
            last_name=last_name,
            phone=row[4] or '',
            country=row[5] or '',
            language=row[6] or 'en',
            timezone=row[7] or 'UTC',
            verification_level=row[8] or 'basic',
            google_id=row[11] if len(row) > 11 else None,
            created_at=row[9],
            updated_at=row[10]
        )
    
    # Wallet management
    def create_wallet(self, wallet_data: NewWallet, user: User) -> dict:
        """Create a new wallet"""
        # Generate a wallet address
        address = f"{wallet_data.coin}-{user.id[:8]}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=8))}"
        
        sql = """
            INSERT INTO wallets (user_id, coin, balance, address, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """
        success, wallet_id = self.db.execute(sql, (
            user.id,
            wallet_data.coin,
            '0.0',
            address
        ), return_id=True)
        
        if success:
            return {
                "id": str(wallet_id),
                "user_id": user.id,
                "coin": wallet_data.coin,
                "balance": "0.0",
                "address": address
            }
        raise Exception("Failed to create wallet")
    
    def get_wallets(self, user: User) -> List[dict]:
        """Get user's wallets"""
        sql = "SELECT id, user_id, coin, balance, address, created_at, updated_at FROM wallets WHERE user_id = %s"
        rows = self.db.query(sql, (user.id,))
        
        wallets = []
        for row in rows:
            wallets.append({
                "id": str(row[0]),
                "user_id": str(row[1]),
                "coin": row[2],
                "balance": str(row[3]),
                "address": row[4],
                "created_at": row[5].isoformat() if row[5] else None,
                "updated_at": row[6].isoformat() if row[6] else None
            })
        return wallets
    
    # Bank account management  
    def create_bank_account(self, bank_data: NewBankAccount, user: User) -> dict:
        """Create a new bank account"""
        # Check if user already has a bank account
        check_sql = "SELECT id FROM bank_accounts WHERE user_id = %s"
        existing = self.db.query(check_sql, (user.id,))
        if existing:
            raise ValueError("User already has a bank account")
        
        sql = """
            INSERT INTO bank_accounts (user_id, account_name, account_number, branch_code, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
            RETURNING id
        """
        success, account_id = self.db.execute(sql, (
            user.id,
            bank_data.accountName,
            bank_data.accountNumber,
            bank_data.branchCode
        ), return_id=True)
        
        if success:
            return {
                "id": str(account_id),
                "user_id": user.id,
                "account_name": bank_data.accountName,
                "account_number": bank_data.accountNumber,
                "branch_code": bank_data.branchCode
            }
        raise Exception("Failed to create bank account")
    
    def get_bank_accounts(self, user: User) -> List[dict]:
        """Get user's bank accounts"""
        sql = "SELECT id, user_id, account_name, account_number, branch_code, created_at, updated_at FROM bank_accounts WHERE user_id = %s"
        rows = self.db.query(sql, (user.id,))
        
        accounts = []
        for row in rows:
            accounts.append({
                "id": str(row[0]),
                "user_id": str(row[1]),
                "account_name": row[2],
                "account_number": row[3],
                "branch_code": row[4],
                "created_at": row[5].isoformat() if row[5] else None,
                "updated_at": row[6].isoformat() if row[6] else None
            })
        return accounts
    
    # Market data methods
    def get_market_data(self, pair: str, timeframe: str = "1D") -> List[dict]:
        """Get market data for a trading pair"""
        # Mock market data generation for now
        # In production, this would fetch from a real crypto API
        mock_data = []
        base_price = random.uniform(50000, 70000)  # Mock BTC price
        
        for i in range(100):
            price_variation = random.uniform(-0.05, 0.05)
            price = base_price * (1 + price_variation)
            
            mock_data.append({
                "pair": pair,
                "price": str(price),
                "timestamp": (datetime.now() - timedelta(minutes=i)).isoformat(),
                "volume": str(random.uniform(1, 100))
            })
        
        return mock_data
    
    # Session management
    def create_session(self, user_id: str, session_data: dict = None) -> str:
        """Create a user session"""
        session_id = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
        
        sql = """
            INSERT INTO sessions (id, user_id, data, created_at, expires_at)
            VALUES (%s, %s, %s, NOW(), NOW() + INTERVAL '30 days')
        """
        success = self.db.execute(sql, (
            session_id,
            user_id,
            str(session_data or {})
        ))
        
        if success:
            return session_id
        raise Exception("Failed to create session")
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """Get session data"""
        sql = "SELECT user_id, data, expires_at FROM sessions WHERE id = %s AND expires_at > NOW()"
        result = self.db.query(sql, (session_id,))
        
        if result:
            row = result[0]
            return {
                "user_id": row[0],
                "data": row[1],
                "expires_at": row[2]
            }
        return None
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session"""
        sql = "DELETE FROM sessions WHERE id = %s"
        return self.db.execute(sql, (session_id,))
    
    def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        """Get user by Google ID"""
        sql = "SELECT * FROM users WHERE google_id = %s"
        result = self.db.query(sql, (google_id,))
        if result:
            return self._row_to_user(result[0])
        return None
    
    # Market data methods
    def get_all_market_data(self) -> List[MarketData]:
        """Get all market data"""
        # For now, return mock data for common trading pairs
        pairs = ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "ADA-USD", "DOGE-USD", "USDT-USD", "DOT-USD"]
        market_data = []
        
        for pair in pairs:
            base_price = random.uniform(0.1, 70000)  # Wide range for different coins
            change_24h = random.uniform(-10, 10)  # -10% to +10% daily change
            volume_24h = random.uniform(1000, 1000000)  # Volume range
            
            market_data.append(MarketData(
                pair=pair,
                price=f"{base_price:.2f}",
                change24h=f"{change_24h:.2f}",
                volume24h=f"{volume_24h:.2f}",
                timestamp=datetime.now()
            ))
        
        return market_data
    
    # Trade methods
    def create_trade(self, trade_data: InsertTrade) -> Trade:
        """Create a new trade"""
        trade_id = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        
        sql = """
            INSERT INTO trades (id, user_id, type, from_asset, to_asset, from_amount, to_amount, rate, fee, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
        """
        success, _ = self.db.execute(sql, (
            trade_id,
            trade_data.userId,
            trade_data.type,
            trade_data.fromAsset,
            trade_data.toAsset,
            trade_data.fromAmount,
            trade_data.toAmount,
            trade_data.rate,
            trade_data.fee,
            trade_data.status
        ), return_id=True)
        
        if success:
            return Trade(
                id=trade_id,
                userId=trade_data.userId,
                type=trade_data.type,
                fromAsset=trade_data.fromAsset,
                toAsset=trade_data.toAsset,
                fromAmount=trade_data.fromAmount,
                toAmount=trade_data.toAmount,
                rate=trade_data.rate,
                fee=trade_data.fee,
                status=trade_data.status,
                createdAt=datetime.now()
            )
        raise Exception("Failed to create trade")
    
    def get_user_trades(self, user_id: str) -> List[Trade]:
        """Get trades for a user"""
        sql = """
            SELECT id, user_id, type, from_asset, to_asset, from_amount, to_amount, rate, fee, status, created_at
            FROM trades WHERE user_id = %s ORDER BY created_at DESC
        """
        rows = self.db.query(sql, (user_id,))
        
        trades = []
        for row in rows:
            trades.append(Trade(
                id=row[0],
                userId=row[1],
                type=row[2],
                fromAsset=row[3],
                toAsset=row[4],
                fromAmount=row[5],
                toAmount=row[6],
                rate=row[7],
                fee=row[8],
                status=row[9],
                createdAt=row[10]
            ))
        return trades
    
    def update_latest_prices(self):
        """Update latest cryptocurrency prices - placeholder implementation"""
        # In a real implementation, this would fetch from external APIs like CoinGecko
        print("Updating latest prices...")
        # For now, just a placeholder
        pass

# Global storage instance
storage = Storage()