#!/usr/bin/env python3.9

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import os
import asyncio
import tornado.web
import tornado.ioloop
import tornado.httpserver
import tornado.websocket
import json
import random
import threading
import requests
import numbers
import time
import smtplib

from email.mime.text import MIMEText
from typing import Optional, Set
from pydantic import ValidationError
from datetime import datetime, timedelta
from pathlib import Path
# Optional telebot import
try:
    import telebot
except ImportError:
    telebot = None

# Optional Twilio import for SMS
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    Client = None

from tornado.options import define, options

from auth_utils import auth_utils
from models import InsertTrade, LoginRequest, RegisterRequest, User, InsertUser, NewWallet, NewBankAccount, FullWallet, SendTransaction,WithdrawTransaction
from blockchain import blockchain

from config import GOOGLE_CLIENT_ID, DATABASE_TYPE, APP_PORT, APP_HOST, ACTIVE_COINS,COIN_SETTINGS, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, SMTP_SERVER, SMTP_PORT, EMAIL_ADDRESS, EMAIL_PASSWORD

if DATABASE_TYPE == 'postgresql':
    from postgres_storage import storage
elif DATABASE_TYPE == 'mysql':
    from storage import storage

class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        elif isinstance(o, (int, float)):
            return str(o)
        else:
            return super().default(o)
      
class Application(tornado.web.Application):
    coins = {}
    
    def __init__(self):
        print("%s start starting" % datetime.now())
        threading.Timer(60.0, self.wathcher).start()
        threading.Timer(1800.0, self.hourlywathcher).start()
        threading.Timer(1.0, self.coin_wathcher).start()

        blockchain.generate_main_wallet()
    

        handlers = [
            # API routes
            (r"/api/market/(.+)", MarketDataHandler),
            (r"/api/market", MarketDataHandler),
            (r"/api/transactions/(.+)", TransactionsHandler),
            (r"/api/trades", TradesHandler),
            (r"/api/trades/(.+)", UserTradesHandler),
            (r"/api/wallets", WalletsHandler),
            (r"/api/wallet/create", WalletCreateHandler),
            (r"/api/bankaccounts", BankAccountsHandler),
            (r"/api/bankaccount/create", BankAccountCreateHandler),
            (r"/api/send", SendHandler),
            (r"/api/withdraw", WithdrawHandler),
            
            # Verification routes
            (r"/api/verification/submit", VerificationSubmitHandler),
            (r"/api/auth/verification-status", VerificationStatusHandler),
            (r"/api/objects/upload", ObjectUploadHandler),
            (r"/api/verification/phone/send", PhoneVerificationSendHandler),
            (r"/api/verification/phone/verify", PhoneVerificationVerifyHandler),
            (r"/api/verification/email/send", EmailVerificationSendHandler),
            (r"/api/verification/email/verify", EmailVerificationVerifyHandler),
            
            (r"/api/users/(.+)/deposit", DepositHandler),
            
            # Crypto metadata and token routes
            (r"/api/cryptocurrencies", CryptocurrenciesHandler),
            (r"/api/tokens/search", TokenSearchHandler),
            (r"/api/wallets/popular", PopularWalletsHandler),
            
            # Authentication routes
            (r"/api/auth/register", RegisterHandler),
            (r"/api/auth/login", LoginHandler),
            (r"/api/auth/logout", LogoutHandler),
            (r"/api/auth/google", GoogleAuthHandler),
            (r"/api/auth/facebook", FacebookAuthHandler),
            (r"/api/auth/x", XAuthHandler),
            (r"/api/auth/me", MeHandler),
            (r"/api/auth/2fa", Auth2FAHandler),
            
            # Profile routes
            (r"/api/profile", ProfileHandler),
            (r"/api/profile/notifications", ProfileNotificationsHandler),
            (r"/api/profile/password", ProfilePasswordHandler),
            (r"/api/profile/2fa", Profile2FAHandler),
            (r"/api/profile/2fa/setup", Profile2FASetupHandler),
            
            # File upload/download routes (must be before catch-all)
            (r"/api/upload/([^/]+)/([^/]+)", FileDownloadHandler),
            
            # WebSocket route
            (r"/ws", WebSocketHandler),
            (r'/.*', NotFoundHandler)
        ]
    
        settings = {
            "cookie_secret": "sdfg54dfg54dh454hf654",
            "debug": True
        }
        super(Application, self).__init__(handlers, **settings)

    def wathcher(self):
        try:
          print("\n%s \n" % datetime.now())
          storage.update_latest_prices()
        except Exception as e: print(e)
        threading.Timer(60.0, self.wathcher).start()

    def hourlywathcher(self):
        try:
          print("\n%s \n" % datetime.now())
          storage._initialize_market_data()
        except Exception as e: print(e)
        threading.Timer(1800.0, self.hourlywathcher).start()

    def coin_wathcher(self):
        try:
          print("\n%s check coins\n" % datetime.now())
          allwallets = storage.get_all_wallets(ACTIVE_COINS)
          txhashes = storage.get_tx_hashes()
          for onewallet in allwallets:

            print(onewallet.address)
            walletbalance = blockchain.get_balance(onewallet)
            print(walletbalance)
            if int(float(walletbalance)) > COIN_SETTINGS[onewallet.coin]['min_send_amount']:
              print("FORWARD " + onewallet.coin)
              blockchain.forward_to_hot(onewallet)
              
            if walletbalance != onewallet.hotwalet:
              print("BALANCE changed")
              txhashes = storage.update_wallet_balance(onewallet, walletbalance, txhashes)
              
            
        except Exception as e: print(e)
        try:
          print("\n%s check pending ZAR\n" % datetime.now())
          storage.move_pending_zar()
        except Exception as e: print(e)
        
        try:
          print("\n%s check pending crypto\n" % datetime.now())
          storage.move_pending_crypto()
        except Exception as e: print(e)
        
        threading.Timer(77.0, self.coin_wathcher).start()

class BaseHandler(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "x-requested-with")
        self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.set_header("Cache-Control", "no-cache")
        self.set_header("Content-Type", "application/json")

    def write_error(self, status_code, **kwargs):
        if status_code == 404:
            self.write({"error": "Resource not found. Check the URL."})
        elif status_code == 405:
            self.write({"error": "Method not allowed in this resource."})
        else:
            if "error_message" in kwargs:
                message = kwargs["error_message"]
            else:
                message = "Internal Server Error"
            self.write({"error": message})

    def write(self, chunk):
        if isinstance(chunk, dict):
            chunk = json.dumps(chunk, cls=DateTimeEncoder)
            self.set_header("Content-Type", "application/json; charset=UTF-8")
        super().write(chunk)
        
    def post(self):  # for all methods
        self.write({"code": 404,"msg": "Invalid API resource path."})
        
    def options(self):
        self.set_status(204)
        self.finish()

    def get_auth_headers(self):
        return self.application.get_auth_headers()

    def get_time(self, btc):
        ms = int(time.time())
        return str(ms)+"_"+btc
      
    def get_current_user_from_session(self) -> Optional[User]:
        """Get current user from session token"""
        session_token = self.get_secure_cookie("session_token")
        if not session_token:
            return None
        
        session_token = session_token.decode('utf-8')
        session = storage.get_session(session_token)
        if not session:
            return None
        
        return storage.get_user(session.user_id)
      

class NotFoundHandler(BaseHandler):
    def get(self):  # for all methods
        self.set_status(404)
        self.write({"error": "Invalid API resource path."})


class RegisterHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            register_data = RegisterRequest(**body)
            
            # Check if user already exists
            existing_user = storage.get_user_by_email(register_data.email)
            if existing_user:
                self.set_status(400)
                self.write({"error": "User with this email already exists"})
                return

            # Hash password
            password_hash = auth_utils.hash_password(register_data.password)

            # Create user
            insert_user = InsertUser(
                email=register_data.email,
                password_hash=password_hash,
                first_name=register_data.first_name,
                last_name=register_data.last_name
            )

            user = storage.create_user(insert_user)

            # Create session
            session_token = auth_utils.generate_session_token()
            expires_at = datetime.now() + timedelta(days=7)
            storage.create_session(user.id, session_token, expires_at)

            # Set secure cookie
            self.set_secure_cookie("session_token", session_token, expires_days=7)

            # Return user data (without password)
            user_data = user.dict()
            user_data.pop('password_hash', None)
            
            self.write({
                "success": True,
                "user": user_data,
                "message": "User registered successfully"
            })
            
        except ValidationError as e:
            print(e)
            self.set_status(400)
            self.write({"error": "Invalid registration data", "details": e.errors()})
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class LoginHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            login_data = LoginRequest(**body)
            
            # Find user by email
            user = storage.get_user_by_email(login_data.email)
            if not user or not user.password_hash:
                self.set_status(401)
                self.write({"error": "Invalid email or password"})
                return
            
            # Verify password
            if not auth_utils.verify_password(login_data.password, user.password_hash):
                self.set_status(401)
                self.write({"error": "Invalid email or password"})
                return
            
            # Check if user has 2FA enabled
            user_profile = storage.get_user_profile(user.email)
            if user_profile and user_profile.two_factor_enabled:
                # Store user info temporarily for 2FA verification
                temp_session_token = auth_utils.generate_session_token()
                temp_expires = datetime.now() + timedelta(minutes=5)  # Short expiry for temp session
                storage.create_temp_session(user.id, temp_session_token, temp_expires)
                
                self.set_status(303)  # Special status indicating 2FA required
                self.write({
                    "requires_2fa": True,
                    "temp_session": temp_session_token,
                    "message": "Two-factor authentication required"
                })
                return
            
            # Create session
            session_token = auth_utils.generate_session_token()
            expires_at = datetime.now() + timedelta(days=7)
            storage.create_session(user.id, session_token, expires_at)
            
            # Set secure cookie
            self.set_secure_cookie("session_token", session_token, expires_days=7)
            
            # Return user data (without password)
            user_data = user.dict()
            user_data.pop('password_hash', None)
            
            self.write({
                "success": True,
                "user": user_data,
                "sessionId": session_token,
                "message": "Login successful"
            })
            
        except ValidationError as e:
            print(e)
            self.set_status(400)
            self.write({"error": "Invalid login data", "details": e.errors()})
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class LogoutHandler(BaseHandler):
    def post(self):
        try:
            session_token = self.get_secure_cookie("session_token")
            if session_token:
                session_token = session_token.decode('utf-8')
                storage.delete_session(session_token)
            
            # Clear cookie
            self.clear_cookie("session_token")
            
            self.write({
                "success": True,
                "message": "Logout successful"
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class GoogleAuthHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            google_token = body.get('token')
            
            if not google_token:
                self.set_status(400)
                self.write({"error": "Google token is required"})
                return
            
            # Get Google client ID from environment
            google_client_id = GOOGLE_CLIENT_ID
            if not google_client_id:
                self.set_status(500)
                self.write({"error": "Google authentication not configured"})
                return
            
            # Verify Google token
            google_user_info = auth_utils.verify_google_token(google_token, google_client_id)
            if not google_user_info:
                self.set_status(401)
                self.write({"error": "Invalid Google token"})
                return
            
            # Check if user exists by Google ID
            user = storage.get_user_by_google_id(google_user_info['google_id'])
            
            if not user:
                # Check if user exists by email
                user = storage.get_user_by_email(google_user_info['email'])
                
                if user:
                    # Update existing user with Google ID
                    user.google_id = google_user_info['google_id']
                    if not user.profile_image_url:
                        user.profile_image_url = google_user_info.get('profile_image_url')
                else:
                    # Create new user
                    insert_user = InsertUser(
                        email=google_user_info['email'],
                        google_id=google_user_info['google_id'],
                        first_name=google_user_info.get('first_name'),
                        last_name=google_user_info.get('last_name'),
                        profile_image_url=google_user_info.get('profile_image_url')
                    )
                    user = storage.create_user(insert_user)
            
            # Check if user has 2FA enabled
            user_profile = storage.get_user_profile(user.email)
            if user_profile and user_profile.two_factor_enabled:
                # Store user info temporarily for 2FA verification
                temp_session_token = auth_utils.generate_session_token()
                temp_expires = datetime.now() + timedelta(minutes=5)  # Short expiry for temp session
                storage.create_temp_session(user.id, temp_session_token, temp_expires)
                
                self.set_status(303)  # Special status indicating 2FA required
                self.write({
                    "requires_2fa": True,
                    "temp_session": temp_session_token,
                    "message": "Two-factor authentication required"
                })
                return
            
            # Create session
            session_token = auth_utils.generate_session_token()
            expires_at = datetime.now() + timedelta(days=7)
            storage.create_session(user.id, session_token, expires_at)
            
            # Set secure cookie
            self.set_secure_cookie("session_token", session_token, expires_days=7)
            
            # Return user data
            user_data = user.dict()
            user_data.pop('password_hash', None)
            
            self.write({
                "success": True,
                "user": user_data,
                "sessionId": session_token,
                "message": "Google authentication successful"
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class FacebookAuthHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            facebook_token = body.get('accessToken')
            user_email = body.get('email')
            user_name = body.get('name')
            
            if not facebook_token or not user_email:
                self.set_status(400)
                self.write({"error": "Facebook token and email are required"})
                return
            
            # For demo purposes, we'll accept any Facebook token
            # In production, you would verify the token with Facebook's API
            
            # Check if user exists by email
            user = storage.get_user_by_email(user_email)
            
            if not user:
                # Create new user
                insert_user = InsertUser(
                    email=user_email,
                    first_name=user_name.split(' ')[0] if user_name else None,
                    last_name=' '.join(user_name.split(' ')[1:]) if user_name and ' ' in user_name else None,
                    profile_image_url=body.get('picture')
                )
                user = storage.create_user(insert_user)
            
            # Check if user has 2FA enabled
            user_profile = storage.get_user_profile(user.email)
            if user_profile and user_profile.two_factor_enabled:
                # Store user info temporarily for 2FA verification
                temp_session_token = auth_utils.generate_session_token()
                temp_expires = datetime.now() + timedelta(minutes=5)  # Short expiry for temp session
                storage.create_temp_session(user.id, temp_session_token, temp_expires)
                
                self.set_status(303)  # Special status indicating 2FA required
                self.write({
                    "requires_2fa": True,
                    "temp_session": temp_session_token,
                    "message": "Two-factor authentication required"
                })
                return
            
            # Create session
            session_token = auth_utils.generate_session_token()
            expires_at = datetime.now() + timedelta(days=7)
            if user and user.id:
                storage.create_session(user.id, session_token, expires_at)
            
            # Set secure cookie
            self.set_secure_cookie("session_token", session_token, expires_days=7)
            
            # Return user data
            user_data = user.dict()
            user_data.pop('password_hash', None)
            
            self.write({
                "success": True,
                "user": user_data,
                "sessionId": session_token,
                "message": "Facebook authentication successful"
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class XAuthHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            x_token = body.get('accessToken')
            user_email = body.get('email')
            user_name = body.get('name')
            
            if not x_token or not user_email:
                self.set_status(400)
                self.write({"error": "X (Twitter) token and email are required"})
                return
            
            # For demo purposes, we'll accept any X token
            # In production, you would verify the token with X's API
            
            # Check if user exists by email
            user = storage.get_user_by_email(user_email)
            
            if not user:
                # Create new user
                insert_user = InsertUser(
                    email=user_email,
                    first_name=user_name.split(' ')[0] if user_name else None,
                    last_name=' '.join(user_name.split(' ')[1:]) if user_name and ' ' in user_name else None,
                    profile_image_url=body.get('picture')
                )
                user = storage.create_user(insert_user)
            
            # Check if user has 2FA enabled
            user_profile = storage.get_user_profile(user.email)
            if user_profile and user_profile.two_factor_enabled:
                # Store user info temporarily for 2FA verification
                temp_session_token = auth_utils.generate_session_token()
                temp_expires = datetime.now() + timedelta(minutes=5)  # Short expiry for temp session
                storage.create_temp_session(user.id, temp_session_token, temp_expires)
                
                self.set_status(303)  # Special status indicating 2FA required
                self.write({
                    "requires_2fa": True,
                    "temp_session": temp_session_token,
                    "message": "Two-factor authentication required"
                })
                return
            
            # Create session
            session_token = auth_utils.generate_session_token()
            expires_at = datetime.now() + timedelta(days=7)
            if user and user.id:
                storage.create_session(user.id, session_token, expires_at)
            
            # Set secure cookie
            self.set_secure_cookie("session_token", session_token, expires_days=7)
            
            # Return user data
            user_data = user.dict()
            user_data.pop('password_hash', None)
            
            self.write({
                "success": True,
                "user": user_data,
                "sessionId": session_token,
                "message": "X authentication successful"
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class MeHandler(BaseHandler):
    def get(self):
        """Get current user information"""
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Not authenticated"})
                return
            
            # Return user data (without password)
            user_data = user.dict()
            user_data.pop('password_hash', None)

            # Get user profile with notification preferences and 2FA settings
            user_profile = storage.get_user_profile(user.email)
            if user_profile:
                user_data['email_notifications'] = user_profile.email_notifications
                user_data['sms_notifications'] = user_profile.sms_notifications
                user_data['trading_notifications'] = user_profile.trading_notifications
                user_data['security_alerts'] = user_profile.security_alerts
                user_data['two_factor_enabled'] = user_profile.two_factor_enabled
            else:
                # Default values if no profile exists
                user_data['email_notifications'] = False
                user_data['sms_notifications'] = False
                user_data['trading_notifications'] = False
                user_data['security_alerts'] = False
                user_data['two_factor_enabled'] = False
            
            self.write({
                "success": True,
                "user": user_data
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class Auth2FAHandler(BaseHandler):
    def post(self):
        """Handle 2FA verification during authentication"""
        try:
            body = json.loads(self.request.body.decode())
            temp_session = body.get('temp_session')
            code = body.get('code')
            
            if not temp_session or not code:
                self.set_status(400)
                self.write({"error": "Temporary session token and verification code are required"})
                return
            
            # Get the temp session
            session = storage.get_temp_session(temp_session)
            if not session:
                self.set_status(401)
                self.write({"error": "Invalid or expired temporary session"})
                return
            
            # Get user from temp session
            user = storage.get_user_by_id(session.user_id)
            if not user:
                self.set_status(401)
                self.write({"error": "User not found"})
                return
            
            # Get user profile to check 2FA settings
            user_profile = storage.get_user_profile(user.email)
            if not user_profile or not user_profile.two_factor_enabled:
                self.set_status(400)
                self.write({"error": "Two-factor authentication is not enabled"})
                return
            
            # Verify the 2FA code
            import pyotp
            totp = pyotp.TOTP(user_profile.two_factor_secret)
            
            if not totp.verify(code, valid_window=1):
                self.set_status(401)
                self.write({"error": "Invalid verification code"})
                return
            
            # Delete the temporary session
            storage.delete_temp_session(temp_session)
            
            # Create a real session
            session_token = auth_utils.generate_session_token()
            expires_at = datetime.now() + timedelta(days=7)
            storage.create_session(user.id, session_token, expires_at)
            
            # Set secure cookie
            self.set_secure_cookie("session_token", session_token, expires_days=7)
            
            # Return user data (without password)
            user_data = user.dict()
            user_data.pop('password_hash', None)
            
            # Add profile data
            user_data['email_notifications'] = user_profile.email_notifications
            user_data['sms_notifications'] = user_profile.sms_notifications
            user_data['trading_notifications'] = user_profile.trading_notifications
            user_data['security_alerts'] = user_profile.security_alerts
            user_data['two_factor_enabled'] = user_profile.two_factor_enabled
            
            self.write({
                "success": True,
                "user": user_data,
                "sessionId": session_token,
                "message": "Two-factor authentication successful"
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class WalletsHandler(BaseHandler):
    def post(self):
        """Get user wallets with password_hash authentication"""
        try:
            body = json.loads(self.request.body.decode())
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Invalid authentication"})
                return
            
            # Get user wallets
            wallets = storage.get_wallets(user)
            
            # Format wallet data
            wallet_data = []
            miner_fee = storage.get_miner_fee()
            print(miner_fee)
            if wallets:
                for wallet in wallets:
                    coinminer_fee = 0
                    if wallet[2] in miner_fee:
                      coinminer_fee = miner_fee[wallet[2]]
                    wallet_data.append({
                        "id": str(wallet[0]),
                        "email": wallet[1],
                        "coin": wallet[2],
                        "fee": coinminer_fee,
                        "address": wallet[3],
                        "balance": str(wallet[4]),
                        "pending": str(wallet[8]),
                        "is_active": wallet[5],
                        "created": wallet[6].isoformat() if wallet[6] else None,
                        "updated": wallet[7].isoformat() if wallet[7] else None
                    })
            
            self.write({
                "success": True,
                "wallets": wallet_data
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class WalletCreateHandler(BaseHandler):
    def post(self):
        """Create a new wallet for the authenticated user"""
        try:
            body = json.loads(self.request.body.decode())
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # Validate input data
            try:
                new_wallet_data = NewWallet(**body)
            except ValidationError as e:
                print("Invalid wallet data", e.errors())
                self.set_status(400)
                self.write({"error": "Invalid wallet data", "details": e.errors()})
                return
            
            # Check if wallet already exists for this coin
            existing_wallets = storage.get_wallets(user)
            for wallet in existing_wallets:
                if wallet[2] == new_wallet_data.coin:  # wallet[2] is the coin field
                    print(f"Wallet for {new_wallet_data.coin} already exists")
                    self.set_status(400)
                    self.write({"error": f"Wallet for {new_wallet_data.coin} already exists"})
                    return
            
            # Create the new wallet
            wallet = storage.create_wallet(new_wallet_data, user)
            
            self.write({
                "success": True,
                "wallet": wallet.dict(),
                "message": "Wallet created successfully"
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class BankAccountsHandler(BaseHandler):
    def get(self):
        """Get all bank accounts for the authenticated user"""
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # Get user's bank accounts
            bank_accounts = storage.get_bank_accounts(user)
            
            self.write({
                "success": True,
                "bank_accounts": bank_accounts
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class BankAccountCreateHandler(BaseHandler):
    def post(self):
        """Create a new bank account for the authenticated user"""
        try:
            body = json.loads(self.request.body.decode())
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # Validate input data
            try:
                new_bank_account_data = NewBankAccount(**body)
            except ValidationError as e:
                self.set_status(400)
                self.write({"error": "Invalid bank account data", "details": e.errors()})
                return
            
            # Create the new bank account
            try:
                bank_account = storage.create_bank_account(new_bank_account_data, user)
                
                self.write({
                    "success": True,
                    "bank_account": bank_account,
                    "message": "Bank account created successfully"
                })
            except ValueError as e:
                self.set_status(400)
                self.write({"error": str(e)})
                return
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class MarketDataHandler(BaseHandler):
    def get(self, pair: Optional[str] = None):
        try:
            # Get timeframe parameter with default of "1H"
            timeframe = self.get_argument("timeframe", "1H")
            charttype = self.get_argument("type", "line")

            # Validate timeframe
            valid_timeframes = ["1H", "1D", "1W", "1M"]
            if timeframe not in valid_timeframes:
                self.set_status(400)
                self.write({"error": f"Invalid timeframe. Valid options: {', '.join(valid_timeframes)}"})
                return
            
            if pair:
                print(f"Get specific pair data: /api/market/{pair}?timeframe={timeframe}")
                data = storage.get_market_data(pair, timeframe, charttype)
                self.write(json.dumps([item.dict(by_alias=True) for item in data], cls=DateTimeEncoder))
            else:
                print(f"Get all market data: /api/market?timeframe={timeframe}")
                data = storage.get_all_market_data()
                #print(data)
                self.write(json.dumps([item.dict(by_alias=True) for item in data], cls=DateTimeEncoder))
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": "Failed to fetch market data"})


class TradesHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            trade_data = InsertTrade(**body)
            
            trade = storage.create_trade(trade_data, user)
            self.write(trade.dict(by_alias=True))
        except ValidationError as e:
            print(e)
            self.set_status(400)
            self.write({"error": "Invalid trade data", "details": e.errors()})
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class UserTradesHandler(BaseHandler):
    def get(self, user_id: str):
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            trades = storage.get_user_trades(user)
            self.write({"data": [trade.dict(by_alias=True) for trade in trades]})
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": "Failed to fetch trades"})

class TransactionsHandler(BaseHandler):
    def get(self, user_id: str):
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            trades = storage.get_user_transactions(user)
            self.write({"data": [trade.dict(by_alias=True) for trade in trades]})
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": "Failed to fetch trades"})


class SendHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            send_data = SendTransaction(**body)
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # Validate user has sufficient balance
            user_wallets = storage.get_wallets(user)
            sender_wallet = None
            for wallet in user_wallets:
                if wallet[2].upper() == send_data.fromAsset.upper():
                    sender_wallet = storage.to_wallet(wallet)
                    break
            
            if not sender_wallet:
                self.set_status(409)
                self.write({"error": f"No {send_data.fromAsset} wallet found"})
                return
            
            available_balance = float(sender_wallet.balance)
            send_amount = float(send_data.amount)
            
            if send_amount > available_balance:
                self.set_status(408)
                self.write({"error": "Insufficient balance"})
                return
            
            # For now, we'll simulate the send transaction
            # In a real implementation, you would:
            # 1. Deduct balance from sender wallet
            # 2. Create transaction record
            # 3. Broadcast to blockchain network
            
            # Simulate successful transaction
            transaction_id = f"tx_{send_data.fromAsset.lower()}_{int(time.time())}"
            
            # Update sender wallet balance (subtract the sent amount)
            new_balance = available_balance - send_amount
            storage.send_from_wallet(user,sender_wallet,send_data)
            
            response = {
                "status": "success",
                "message": "Transaction Successful!",
                "transactionId": transaction_id,
                "amount": send_data.amount,
                "fromAsset": send_data.fromAsset,
                "recipientAddress": send_data.recipientAddress,
                "memo": ''
            }
            
            self.write(response)
            
        except ValidationError as e:
            print(e)
            self.set_status(400)
            self.write({"error": "Invalid send data", "details": e.errors()})
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})



class WithdrawHandler(BaseHandler):
    def post(self):
        try:
          
            body = json.loads(self.request.body.decode())
            send_data = WithdrawTransaction(**body)
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # Validate user has sufficient balance
            user_wallet = storage.get_zarwallet(user)
            
            if not user_wallet:
                self.set_status(409)
                self.write({"error": f"No ZAR wallet found"})
                return
            
            available_balance = float(user_wallet.balance)
            send_amount = float(send_data.amount)
            
            if send_amount > available_balance:
                self.set_status(408)
                self.write({"error": "Insufficient balance"})
                return
            
            # Update sender wallet balance (subtract the sent amount)
            new_balance = available_balance - send_amount
            allsent = storage.withdraw(user,user_wallet,send_data)
            if allsent:
              response = {
                  "status": "success",
                  "message": "Transaction Successful!",
                  "transactionId": '',
                  "amount": send_data.amount,
                  "fromAsset": 'ZAR'
              }
              
              self.write(response)
            else:
              self.set_status(441)
              self.write({"error": "Invalid bank account"})
              
            
        except ValidationError as e:
            print(e)
            self.set_status(400)
            self.write({"error": "Invalid send data", "details": e.errors()})
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class VerificationSubmitHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            verification_type = body.get('type', 'identity')
            documents = body.get('documents', [])
            
            if verification_type == 'identity':
                # Update identity verification status to pending
                success = storage.update_identity_verification(user.email, 'pending', documents)
                if success:
                    self.write({
                        "success": True,
                        "message": "Identity verification documents submitted successfully",
                        "status": "pending",
                        "type": verification_type
                    })
                else:
                    self.set_status(500)
                    self.write({"error": "Failed to update verification status"})
            elif verification_type == 'address':
                # Update address verification status to pending
                success = storage.update_address_verification(user.email, 'pending', documents)
                if success:
                    self.write({
                        "success": True,
                        "message": "Address verification documents submitted successfully",
                        "status": "pending",
                        "type": verification_type
                    })
                else:
                    self.set_status(500)
                    self.write({"error": "Failed to update verification status"})
            else:
                self.set_status(400)
                self.write({"error": "Invalid verification type"})
            
        except Exception as e:
            print(f"Error in verification submit: {e}")
            self.set_status(500)
            self.write({"error": str(e)})


class VerificationStatusHandler(BaseHandler):
    def get(self):
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # Get real verification status from storage
            verification_status = storage.get_verification_status(user.email)
            
            if not verification_status:
                # Create initial verification status if it doesn't exist
                storage.create_verification_status(user.email)
                verification_status = storage.get_verification_status(user.email)
            
            # Build response with real data
            response = {
                "success": True,
                "verification_status": {
                    "email": {
                        "status": "verified" if verification_status.email_verified else "not_verified",
                        "email": verification_status.email_address
                    },
                    "phone": {
                        "status": "verified" if verification_status.phone_verified else "not_verified", 
                        "phone_number": verification_status.phone_number
                    },
                    "identity": {
                        "status": verification_status.identity_status,
                        "documents_required": ["id_document", "selfie"] if verification_status.identity_status == "not_verified" else []
                    },
                    "address": {
                        "status": verification_status.address_status,
                        "documents_required": ["proof_of_address"] if verification_status.address_status == "not_verified" else []
                    }
                },
                "email_verified": verification_status.email_verified,
                "identity_verified": verification_status.identity_status == "verified",
                "address_verified": verification_status.address_status == "verified", 
                "phone_verified": verification_status.phone_verified,
            }
            
            self.write(response)
            
        except Exception as e:
            print(f"Error getting verification status: {e}")
            self.set_status(500)
            self.write({"error": str(e)})


class ObjectUploadHandler(BaseHandler):
    def post(self):
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # Get uploaded file from request
            if not hasattr(self.request, 'files') or 'file' not in self.request.files:
                self.set_status(400)
                self.write({"error": "No file uploaded"})
                return
            
            file_info = self.request.files['file'][0]
            file_name = file_info['filename']
            file_body = file_info['body']
            file_type = self.get_argument('type', None)
            if not file_type:
                self.set_status(403)
                self.write({"error": "No type provided"})
                return
            
            # Create user-specific upload directory
            user_folder = user.email.replace('@', '_').replace('.', '_')  # Safe folder name
            upload_dir = Path(f"uploads/{user_folder}")
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename to avoid conflicts
            timestamp = int(time.time())
            name, ext = os.path.splitext(file_name)
            unique_filename = f"{name}_{timestamp}{ext}"
            
            # Save file to user's directory
            file_path = upload_dir / unique_filename
            with open(file_path, 'wb') as f:
                f.write(file_body)
            
            # Return successful response with download URL
            download_url = f"/api/upload/{user_folder}/{unique_filename}"
            if file_type == "id" or file_type == "selfie":
              storage.update_identity_verification(user.email, 'pending', file_type)
            if file_type == "poa":
              storage.update_address_verification(user.email, 'pending', file_type)
            self.write({
                "success": True,
                "filename": unique_filename,
                "url": download_url,
                "uploadURL": download_url,  # For compatibility with existing code
                "message": "File uploaded successfully"
            })
            
        except Exception as e:
            print(f"Error uploading file: {e}")
            self.set_status(500)
            self.write({"error": str(e)})


class PhoneVerificationSendHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            phone_number = body.get('phoneNumber')
            
            if not phone_number:
                self.set_status(400)
                self.write({"error": "Phone number is required"})
                return
            
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # For demo purposes, simulate sending SMS
            verification_code = f"{random.randint(100000, 999999)}"
            
            # Try to send SMS via Twilio if available
            if TWILIO_AVAILABLE and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
                try:
                    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                    message = client.messages.create(
                        body=f"Your verification code is: {verification_code}",
                        from_=TWILIO_PHONE_NUMBER,
                        to=phone_number
                    )
                    

                except Exception as twilio_error:
                    print(f"Twilio error: {twilio_error}")
                    # Fall through to demo mode
            
            # Demo mode - return verification code in response
            # Store verification code in database
            expires_at = datetime.now() + timedelta(minutes=5)
            from models import InsertVerificationCode
            code_data = InsertVerificationCode(
                user_id=user.id,
                type="phone",
                email=user.email,
                code=verification_code,
                contact=phone_number,
                expires_at=expires_at
            )
            
            success = storage.create_verification_code(code_data)
            if not success:
                self.set_status(500)
                self.write({"error": "Failed to create verification code"})
                return
            
            self.write({
                "success": True,
                "message": f"Verification code sent to {phone_number}",
                "phone_number": phone_number,
                "verification_code": verification_code,  # Remove in production
                "expires_in": 300
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


class PhoneVerificationVerifyHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            phone_number = body.get('phoneNumber')
            verification_code = body.get('code')
            
            if not phone_number or not verification_code:
                self.set_status(400)
                self.write({"error": "Phone number and verification code are required"})
                return
            
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # Get verification code from database
            stored_code = storage.get_verification_code(user.email, "phone", phone_number)
            
            if not stored_code:
                self.set_status(402)
                self.write({"error": "No verification code found"})
                return
            
            # Check if code is expired
            if datetime.now() > stored_code.expires_at:
                self.set_status(403)
                self.write({"error": "Verification code has expired"})
                return
            
            # Check attempts limit
            if stored_code.attempts >= 3:
                self.set_status(405)
                self.write({"error": "Too many verification attempts"})
                return
            
            # Verify the code
            if stored_code.code == verification_code:
                # Mark code as verified and update phone verification status
                storage.mark_verification_code_verified(stored_code.id)
                storage.update_phone_verification(user.email, phone_number, True)
                
                self.write({
                    "success": True,
                    "message": "Phone number verified successfully",
                    "phone_number": phone_number,
                    "verified": True
                })
            else:
                # Update attempts
                storage.update_verification_code_attempts(stored_code.id, stored_code.attempts + 1)
                self.set_status(408)
                self.write({"error": "Invalid verification code"})
            
        except Exception as e:
            print(f"Error verifying phone code: {e}")
            self.set_status(500)
            self.write({"error": str(e)})


class DepositHandler(BaseHandler):
    def post(self):
        try:
            body = json.loads(self.request.body.decode())
            user_id = self.path_args[0] if self.path_args else None
            
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            amount = body.get('amount')
            currency = body.get('currency', 'ZAR')
            
            if not amount:
                self.set_status(400)
                self.write({"error": "Amount is required"})
                return
            
            # For demo purposes, simulate a successful deposit
            transaction_id = f"dep_{currency.lower()}_{int(time.time())}"
            
            self.write({
                "success": True,
                "message": "Deposit processed successfully",
                "transaction_id": transaction_id,
                "amount": amount,
                "currency": currency,
                "status": "completed"
            })
            
        except Exception as e:
            print(e)
            self.set_status(500)
            self.write({"error": str(e)})


# Crypto metadata and tokens handlers
class CryptocurrenciesHandler(BaseHandler):
    def get(self):
        """Get cryptocurrency metadata (logos, colors, icons)"""
        try:
            # Define comprehensive crypto metadata
            crypto_metadata = {
                "BTC": {
                    "id": "btc-wallet",
                    "name": "Bitcoin",
                    "symbol": "BTC",
                    "icon": "₿",
                    "logoUrl": "/assets/BTC_1757408297384.png",
                    "color": "bg-orange-500",
                    "textColor": "text-orange-600",
                    "description": "The first and largest cryptocurrency by market cap",
                    "decimals": 8,
                    "is_active": True
                },
                "ETH": {
                    "id": "eth-wallet", 
                    "name": "Ethereum",
                    "symbol": "ETH",
                    "icon": "Ξ",
                    "logoUrl": "/assets/ETH_1757408297384.png",
                    "color": "bg-blue-500",
                    "textColor": "text-blue-600",
                    "description": "A decentralized platform for smart contracts",
                    "decimals": 18,
                    "is_active": True
                },
                "USDT": {
                    "id": "usdt-wallet",
                    "name": "Tether",
                    "symbol": "USDT", 
                    "icon": "₮",
                    "logoUrl": "/assets/tether-usdt-logo_1757408297385.png",
                    "color": "bg-green-500",
                    "textColor": "text-green-600",
                    "description": "A stablecoin pegged to the US dollar",
                    "decimals": 6,
                    "is_active": True
                },
                "BNB": {
                    "id": "bnb-wallet",
                    "name": "BNB",
                    "symbol": "BNB",
                    "icon": "◉",
                    "logoUrl": "/assets/BNB_1757408614597.png",
                    "color": "bg-yellow-500",
                    "textColor": "text-yellow-600",
                    "description": "Binance's native token",
                    "decimals": 18,
                    "is_active": True
                },
                "XRP": {
                    "id": "xrp-wallet",
                    "name": "XRP",
                    "symbol": "XRP",
                    "icon": "◉",
                    "logoUrl": "/assets/XRP_1757408614597.png",
                    "color": "bg-blue-600",
                    "textColor": "text-blue-700",
                    "description": "Digital payment protocol for financial institutions",
                    "decimals": 6,
                    "is_active": True
                },
                "DOGE": {
                    "id": "doge-wallet",
                    "name": "Dogecoin",
                    "symbol": "DOGE",
                    "icon": "Ð",
                    "logoUrl": "/assets/Dogecoin_1757409584282.png",
                    "color": "bg-yellow-400",
                    "textColor": "text-yellow-500",
                    "description": "The meme cryptocurrency",
                    "decimals": 8,
                    "is_active": True
                },
                "SOL": {
                    "id": "sol-wallet",
                    "name": "Solana",
                    "symbol": "SOL",
                    "icon": "◉",
                    "logoUrl": "/assets/SOL_1757408614598.png",
                    "color": "bg-purple-500",
                    "textColor": "text-purple-600",
                    "description": "High-performance blockchain supporting smart contracts",
                    "decimals": 9,
                    "is_active": True
                },
                "ADA": {
                    "id": "ada-wallet",
                    "name": "Cardano",
                    "symbol": "ADA",
                    "icon": "◉",
                    "logoUrl": "/assets/Cardano_1757409292578.png",
                    "color": "bg-blue-400",
                    "textColor": "text-blue-500",
                    "description": "Research-driven blockchain platform",
                    "decimals": 6,
                    "is_active": True
                },
                "MATIC": {
                    "id": "matic-wallet",
                    "name": "Polygon",
                    "symbol": "MATIC",
                    "icon": "◉",
                    "logoUrl": "/assets/Polygon_1757409292577.png",
                    "color": "bg-purple-600",
                    "textColor": "text-purple-700",
                    "description": "Ethereum scaling solution",
                    "decimals": 18,
                    "is_active": True
                },
                "ZAR": {
                    "id": "zar-wallet",
                    "name": "South African Rand",
                    "symbol": "ZAR",
                    "icon": "R",
                    "color": "bg-green-700",
                    "textColor": "text-green-800",
                    "description": "South African currency",
                    "decimals": 2,
                    "is_active": True
                },
                "USD": {
                    "id": "usd-wallet",
                    "name": "US Dollar",
                    "symbol": "USD",
                    "icon": "$",
                    "color": "bg-green-600",
                    "textColor": "text-green-700",
                    "description": "United States dollar",
                    "decimals": 2,
                    "is_active": True
                },
                "EUR": {
                    "id": "eur-wallet",
                    "name": "Euro",
                    "symbol": "EUR",
                    "icon": "€",
                    "color": "bg-blue-700",
                    "textColor": "text-blue-800",
                    "description": "European Union currency",
                    "decimals": 2,
                    "is_active": True
                },
                "GBP": {
                    "id": "gbp-wallet",
                    "name": "British Pound",
                    "symbol": "GBP",
                    "icon": "£",
                    "color": "bg-red-600",
                    "textColor": "text-red-700",
                    "description": "United Kingdom currency",
                    "decimals": 2,
                    "is_active": True
                }
            }

            self.write({"cryptocurrencies": crypto_metadata})
        except Exception as e:
            print(f"Error getting cryptocurrencies: {e}")
            self.set_status(500)
            self.write({"error": "Failed to get cryptocurrency metadata"})

class TokenSearchHandler(BaseHandler):
    def get(self):
        """Search for tokens based on query parameter"""
        try:
            query = self.get_argument("q", "").lower()
            
            # Mock token search results
            all_tokens = [
                {
                    "address": "So11111111111111111111111111111111111111112",
                    "symbol": "SOL",
                    "name": "Wrapped SOL",
                    "decimals": 9,
                    "price": 142.56,
                    "change24h": 2.34,
                    "volume24h": 45672891,
                    "marketCap": 67890123456,
                    "verified": True
                },
                {
                    "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    "symbol": "USDC",
                    "name": "USD Coin",
                    "decimals": 6,
                    "price": 1.0,
                    "change24h": 0.01,
                    "volume24h": 123456789,
                    "marketCap": 34567890123,
                    "verified": True
                },
                {
                    "address": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
                    "symbol": "RAY",
                    "name": "Raydium",
                    "decimals": 6,
                    "price": 2.45,
                    "change24h": -1.23,
                    "volume24h": 8765432,
                    "marketCap": 456789012,
                    "verified": True
                },
                {
                    "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                    "symbol": "BONK",
                    "name": "Bonk",
                    "decimals": 5,
                    "price": 0.0000234,
                    "change24h": 45.67,
                    "volume24h": 23456789,
                    "marketCap": 1234567890,
                    "verified": False
                },
                {
                    "address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
                    "symbol": "SAMO",
                    "name": "Samoyedcoin",
                    "decimals": 9,
                    "price": 0.0123,
                    "change24h": -5.67,
                    "volume24h": 987654,
                    "marketCap": 12345678,
                    "verified": False
                }
            ]
            
            # Filter based on query
            if query:
                filtered_tokens = [
                    token for token in all_tokens
                    if query in token["symbol"].lower() or query in token["name"].lower()
                ]
            else:
                filtered_tokens = all_tokens
            
            self.write({"tokens": filtered_tokens})
        except Exception as e:
            print(f"Error searching tokens: {e}")
            self.set_status(500)
            self.write({"error": "Failed to search tokens"})

class PopularWalletsHandler(BaseHandler):
    def get(self):
        """Get popular wallet options for token swapping"""
        try:
            popular_wallets = [
                {
                    "name": "MetaMask",
                    "description": "Most popular Ethereum wallet",
                    "icon": "🦊",
                    "color": "bg-orange-500",
                    "url": "https://metamask.io/",
                    "supported": ["ETH", "ERC-20", "BSC"],
                    "users": "30M+"
                },
                {
                    "name": "Trust Wallet",
                    "description": "Multi-chain mobile wallet",
                    "icon": "🛡️",
                    "color": "bg-blue-600",
                    "url": "https://trustwallet.com/",
                    "supported": ["BTC", "ETH", "BNB", "SOL"],
                    "users": "25M+"
                },
                {
                    "name": "Phantom",
                    "description": "Leading Solana wallet",
                    "icon": "👻",
                    "color": "bg-purple-600",
                    "url": "https://phantom.app/",
                    "supported": ["SOL", "SPL"],
                    "users": "3M+"
                },
                {
                    "name": "Coinbase Wallet",
                    "description": "Self-custody wallet by Coinbase",
                    "icon": "💼",
                    "color": "bg-blue-500",
                    "url": "https://wallet.coinbase.com/",
                    "supported": ["ETH", "SOL", "BTC"],
                    "users": "10M+"
                },
                {
                    "name": "Solflare",
                    "description": "Native Solana wallet",
                    "icon": "☀️",
                    "color": "bg-yellow-500",
                    "url": "https://solflare.com/",
                    "supported": ["SOL", "SPL"],
                    "users": "1M+"
                },
                {
                    "name": "Rainbow",
                    "description": "Ethereum wallet with NFT focus",
                    "icon": "🌈",
                    "color": "bg-gradient-to-r from-purple-500 to-pink-500",
                    "url": "https://rainbow.me/",
                    "supported": ["ETH", "ERC-20", "NFTs"],
                    "users": "2M+"
                }
            ]
            
            self.write({"wallets": popular_wallets})
        except Exception as e:
            print(f"Error getting popular wallets: {e}")
            self.set_status(500)
            self.write({"error": "Failed to get popular wallets"})

class ProfileHandler(BaseHandler):
    def get(self):
        """Get user profile information"""
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Not authenticated"})
                return
            
            # Return user profile data (without password)
            user_data = user.dict()
            user_data.pop('password_hash', None)
            
            self.write({
                "success": True,
                "profile": user_data
            })
            
        except Exception as e:
            print(f"Error getting profile: {e}")
            self.set_status(500)
            self.write({"error": str(e)})

    def post(self):
        """Update user profile information"""
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Not authenticated"})
                return
            
            data = json.loads(self.request.body.decode())
            if not data:
                self.set_status(400)
                self.write({"error": "Invalid JSON body"})
                return
            
            # Update allowed fields
            allowed_fields = ['first_name', 'last_name', 'phone', 'country', 'language', 'timezone']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            if update_data:
                # Update user in storage (this should update the users table, not user_profiles)
                # For now, acknowledge the request since we need to implement user update method
                success = storage.update_user_fields(user, update_data)
                if success:
                    self.write({
                        "success": True,
                        "message": "Profile updated successfully"
                    })
                else:
                    self.set_status(500)
                    self.write({"error": "Failed to update Profile"})

            else:
                self.set_status(400)
                self.write({"error": "No valid fields to update"})
                
        except Exception as e:
            print(f"Error updating profile: {e}")
            self.set_status(500)
            self.write({"error": str(e)})

class ProfileNotificationsHandler(BaseHandler):
    def post(self):
        """Update user notification preferences"""
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Not authenticated"})
                return
            
            data = json.loads(self.request.body.decode())
            if not data:
                self.set_status(400)
                self.write({"error": "Invalid JSON body"})
                return
            
            # Convert camelCase to snake_case for database fields
            field_mapping = {
                'emailNotifications': 'email_notifications',
                'smsNotifications': 'sms_notifications', 
                'tradingNotifications': 'trading_notifications',
                'securityAlerts': 'security_alerts'
            }
            
            # Build update data with correct field names
            update_data = {}
            for client_field, db_field in field_mapping.items():
                if client_field in data:
                    update_data[db_field] = data[client_field]
            
            if update_data:
                # Update notification preferences in storage
                success = storage.update_user_profile(user.email, update_data)
                if success:
                    self.write({
                        "success": True,
                        "message": "Notification preferences updated successfully"
                    })
                else:
                    self.set_status(500)
                    self.write({"error": "Failed to update notification preferences"})
            else:
                self.set_status(400)
                self.write({"error": "No valid notification preferences provided"})
                
        except Exception as e:
            print(f"Error updating notifications: {e}")
            self.set_status(500)
            self.write({"error": str(e)})

class ProfilePasswordHandler(BaseHandler):
    def post(self):
        """Change user password"""
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Not authenticated"})
                return
            
            data = json.loads(self.request.body.decode())
            if not data:
                self.set_status(400)
                self.write({"error": "Invalid JSON body"})
                return
            
            current_password = data.get('currentPassword')
            new_password = data.get('newPassword')
            
            if not current_password or not new_password:
                self.set_status(400)
                self.write({"error": "Current password and new password are required"})
                return
            
            # Verify current password
            if not auth_utils.verify_password(current_password, user.password_hash):
                self.set_status(400)
                self.write({"error": "Current password is incorrect"})
                return
            
            # Update password
            new_hash = auth_utils.hash_password(new_password)
            storage.update_user_password(user.email, new_hash)
            
            self.write({
                "success": True,
                "message": "Password updated successfully"
            })
            
        except Exception as e:
            print(f"Error changing password: {e}")
            self.set_status(500)
            self.write({"error": str(e)})

class Profile2FAHandler(BaseHandler):
    def post(self):
        """Toggle two-factor authentication"""
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Not authenticated"})
                return
            
            data = json.loads(self.request.body.decode())
            if not data:
                self.set_status(400)
                self.write({"error": "Invalid JSON body"})
                return
            
            enabled = data.get('enabled', False)
            secret_code = data.get('secretCode', None)
            secret = data.get('secret', None)
            
            # If enabling 2FA, validate the secret code
            if enabled:
                if not secret_code:
                    self.set_status(400)
                    self.write({"error": "2FA verification code is required"})
                    return
                
                # Get user profile to retrieve two_factor_secret
                user_profile = storage.get_user_profile(user.email)
                if not user_profile:
                    self.set_status(500)
                    self.write({"error": "Failed to retrieve user profile"})
                    return
                
                # Use the secret from request or existing profile
                totp_secret = secret or user_profile.get('two_factor_secret')
                if not totp_secret:
                    self.set_status(400)
                    self.write({"error": "2FA secret not found. Please setup 2FA first."})
                    return
                
                # Validate TOTP code
                import pyotp
                totp = pyotp.TOTP(totp_secret)
                if not totp.verify(secret_code, valid_window=1):
                    self.set_status(400)
                    self.write({"error": "Invalid 2FA verification code"})
                    return
            
            # Update 2FA status in storage
            update_data = {'two_factor_enabled': enabled}
            if secret:
                update_data['two_factor_secret'] = secret


            success = storage.update_user_profile(user.email, update_data)
            if success:
                self.write({
                    "success": True,
                    "message": f"Two-factor authentication {'enabled' if enabled else 'disabled'} successfully",
                    "twoFactorEnabled": enabled
                })
            else:
                self.set_status(500)
                self.write({"error": "Failed to update 2FA settings"})
            
        except Exception as e:
            print(f"Error updating 2FA: {e}")
            self.set_status(500)
            self.write({"error": str(e)})

class Profile2FASetupHandler(BaseHandler):
    def post(self):
        """Setup two-factor authentication - generate QR code and secret"""
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Not authenticated"})
                return
            
            # Generate a random secret for TOTP
            secret = storage.create_2fa()
            update_data = {'two_factor_secret': secret}
            
            # Create QR code data for Google Authenticator
            # Format: otpauth://totp/SERVICE:USER?secret=SECRET&issuer=ISSUER
            qr_data = f"otpauth://totp/AnkerSwap:{user.email}?secret={secret}&issuer=AnkerSwap"

            success = storage.update_user_profile(user.email, update_data)
            if success:
                self.write({
                    "success": True,
                    "secret": secret,
                    "qr_code": qr_data,
                    "message": "2FA setup initialized. Please scan the QR code with your authenticator app."
                })
            else:
                self.set_status(503)
                self.write({"error": "Failed to update 2FA settings"})
            

        except Exception as e:
            print(f"Error setting up 2FA: {e}")
            self.set_status(500)
            self.write({"error": str(e)})

class FileDownloadHandler(BaseHandler):
    def get(self, user_folder, filename):
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # Check if user can only access their own folder
            user_folder_name = user.email.replace('@', '_').replace('.', '_')
            if user_folder != user_folder_name:
                self.set_status(403)
                self.write({"error": "Access denied - you can only access your own files"})
                return
            
            # Construct file path
            file_path = Path(f"uploads/{user_folder}/{filename}")
            
            # Check if file exists and is within the user's directory
            if not file_path.exists():
                self.set_status(404)
                self.write({"error": "File not found"})
                return
            
            # Resolve path to prevent directory traversal attacks
            try:
                resolved_path = file_path.resolve()
                expected_base = Path(f"uploads/{user_folder}").resolve()
                if not str(resolved_path).startswith(str(expected_base)):
                    self.set_status(403)
                    self.write({"error": "Access denied"})
                    return
            except Exception:
                self.set_status(403)
                self.write({"error": "Invalid file path"})
                return
            
            # Serve the file
            try:
                with open(file_path, 'rb') as f:
                    file_content = f.read()
                
                # Set appropriate headers
                self.set_header('Content-Type', 'application/octet-stream')
                self.set_header('Content-Disposition', f'attachment; filename="{filename}"')
                self.set_header('Content-Length', len(file_content))
                
                self.write(file_content)
                
            except Exception as e:
                print(f"Error reading file: {e}")
                self.set_status(500)
                self.write({"error": "Error reading file"})
                
        except Exception as e:
            print(f"Error in file download: {e}")
            self.set_status(500)
            self.write({"error": str(e)})

class EmailVerificationSendHandler(BaseHandler):
    def post(self):
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            # Generate verification code
            verification_code = f"{random.randint(100000, 999999)}"
            expires_at = datetime.now() + timedelta(minutes=5)
            
            # Store verification code in database
            from models import InsertVerificationCode
            code_data = InsertVerificationCode(
                user_id=user.id,
                type="email",
                email=user.email,
                code=verification_code,
                contact=user.email,
                expires_at=expires_at
            )
            
            success = storage.create_verification_code(code_data)
            if not success:
                self.set_status(500)
                self.write({"error": "Failed to create verification code"})
                return
            
            # In production, send actual email using SMTP
            msg = MIMEText(f"Your verification code is: {verification_code}")
            msg['Subject'] = 'AnkerSwap verification'
            msg['From'] = 'info@ankerswap.com'
            msg['To'] = user.email

            server = smtplib.SMTP('127.0.0.1', 25)  # Замените на сервер сервиса
            server.starttls()
            #server.login('your_login', 'your_password')  # Или API-ключ
            server.send_message(msg)
            server.quit()
            # For demo purposes, return the code
            
            self.write({
                "success": True,
                "message": f"Verification code sent to {user.email}",
                "email": user.email,
                "expires_in": 300  # 5 minutes
            })
            
        except Exception as e:
            print(f"Error sending email verification: {e}")
            self.set_status(500)
            self.write({"error": str(e)})

class EmailVerificationVerifyHandler(BaseHandler):
    def post(self):
        try:
            user = self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Authentication required"})
                return
            
            body = json.loads(self.request.body.decode())
            code = body.get('code')
            
            if not code:
                self.set_status(400)
                self.write({"error": "Verification code is required"})
                return
            
            # Get verification code from database
            verification_code = storage.get_verification_code(user.email, "email", user.email)
            
            if not verification_code:
                self.set_status(400)
                self.write({"error": "No verification code found"})
                return
            
            # Check if code is expired
            if datetime.now() > verification_code.expires_at:
                self.set_status(400)
                self.write({"error": "Verification code has expired"})
                return
            
            # Check attempts limit
            if verification_code.attempts >= 3:
                self.set_status(400)
                self.write({"error": "Too many verification attempts"})
                return
            
            # Verify the code
            if verification_code.code == code:
                # Mark code as verified and update email verification status
                storage.mark_verification_code_verified(verification_code.id)
                storage.update_email_verification(user.email, user.email, True)
                
                self.write({
                    "success": True,
                    "message": "Email verified successfully",
                    "email": user.email
                })
            else:
                # Update attempts
                storage.update_verification_code_attempts(verification_code.id, verification_code.attempts + 1)
                self.set_status(400)
                self.write({"error": "Invalid verification code"})
            
        except Exception as e:
            print(f"Error verifying email code: {e}")
            self.set_status(500)
            self.write({"error": str(e)})

class WebSocketHandler(tornado.websocket.WebSocketHandler):
    clients: Set['WebSocketHandler'] = set()
    
    def check_origin(self, origin):
        return True  # Allow all origins for development
    
    def open(self, *args, **kwargs):
        self.clients.add(self)
        print("WebSocket client connected")
        # Send initial market data
        self.send_initial_data()
    
    def send_initial_data(self):
        try:
            data = storage.get_all_market_data()
            message = {
                "type": "market_data",
                "data": [item.dict(by_alias=True) for item in data]
            }
            self.write_message(json.dumps(message, cls=DateTimeEncoder))
        except Exception as e:
            print(e)
            print(f"Error sending initial data: {e}")
    
    def on_message(self, message):
        try:
            data = json.loads(message)
            if data.get("type") == "subscribe" and data.get("pair"):
                print(f"Client subscribed to {data['pair']}")
        except json.JSONDecodeError as e:
            print(f"Invalid WebSocket message received: {e}")
    
    def on_close(self):
        self.clients.discard(self)
        print("WebSocket client disconnected")
    
    @classmethod
    def broadcast_market_update(cls, data):
        """Broadcast market data updates to all connected clients"""
        if cls.clients:
            message = {
                "type": "market_data",
                "data": [item.dict(by_alias=True) for item in data]
            }
            message_str = json.dumps(message, cls=DateTimeEncoder)
            for client in cls.clients.copy():
                try:
                    client.write_message(message_str)
                except Exception as e:
                    print(e)
                    cls.clients.discard(client)

def main():
    tornado.options.parse_command_line()
    app = Application()
    app.listen(APP_PORT, address=APP_HOST)
    #logging.getLogger('tornado.access').disabled = True
    tornado.ioloop.IOLoop.current().start()

if __name__ == "__main__":
    main()
