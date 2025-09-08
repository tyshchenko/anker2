import json
import os
from datetime import datetime, timedelta
from typing import Optional
import tornado.web
from pydantic import ValidationError

from models import LoginRequest, RegisterRequest, User, InsertUser
from storage import storage
from auth_utils import auth_utils


class AuthBaseHandler(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_header("Content-Type", "application/json")
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    
    def options(self):
        # Handle preflight requests
        self.set_status(204)
        self.finish()
    
    def write_error(self, status_code: int, **kwargs):
        if "error_message" in kwargs:
            message = kwargs["error_message"]
        else:
            message = "Internal Server Error"
        
        self.write({"error": message})
    
    async def get_current_user_from_session(self) -> Optional[User]:
        """Get current user from session token"""
        session_token = self.get_secure_cookie("session_token")
        if not session_token:
            return None
        
        session_token = session_token.decode('utf-8')
        session = await storage.get_session(session_token)
        if not session:
            return None
        
        return await storage.get_user(session.user_id)


class RegisterHandler(AuthBaseHandler):
    async def post(self):
        try:
            body = json.loads(self.request.body.decode())
            register_data = RegisterRequest(**body)
            
            # Check if user already exists
            existing_user = await storage.get_user_by_email(register_data.email)
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
            
            user = await storage.create_user(insert_user)
            
            # Create session
            session_token = auth_utils.generate_session_token()
            expires_at = datetime.now() + timedelta(days=7)
            await storage.create_session(user.id, session_token, expires_at)
            
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
            self.set_status(400)
            self.write({"error": "Invalid registration data", "details": e.errors()})
        except Exception as e:
            self.set_status(500)
            self.write({"error": str(e)})


class LoginHandler(AuthBaseHandler):
    async def post(self):
        try:
            body = json.loads(self.request.body.decode())
            login_data = LoginRequest(**body)
            
            # Find user by email
            user = await storage.get_user_by_email(login_data.email)
            if not user or not user.password_hash:
                self.set_status(401)
                self.write({"error": "Invalid email or password"})
                return
            
            # Verify password
            if not auth_utils.verify_password(login_data.password, user.password_hash):
                self.set_status(401)
                self.write({"error": "Invalid email or password"})
                return
            
            # Create session
            session_token = auth_utils.generate_session_token()
            expires_at = datetime.now() + timedelta(days=7)
            await storage.create_session(user.id, session_token, expires_at)
            
            # Set secure cookie
            self.set_secure_cookie("session_token", session_token, expires_days=7)
            
            # Return user data (without password)
            user_data = user.dict()
            user_data.pop('password_hash', None)
            
            self.write({
                "success": True,
                "user": user_data,
                "message": "Login successful"
            })
            
        except ValidationError as e:
            self.set_status(400)
            self.write({"error": "Invalid login data", "details": e.errors()})
        except Exception as e:
            self.set_status(500)
            self.write({"error": str(e)})


class LogoutHandler(AuthBaseHandler):
    async def post(self):
        try:
            session_token = self.get_secure_cookie("session_token")
            if session_token:
                session_token = session_token.decode('utf-8')
                await storage.delete_session(session_token)
            
            # Clear cookie
            self.clear_cookie("session_token")
            
            self.write({
                "success": True,
                "message": "Logout successful"
            })
            
        except Exception as e:
            self.set_status(500)
            self.write({"error": str(e)})


class GoogleAuthHandler(AuthBaseHandler):
    async def post(self):
        try:
            body = json.loads(self.request.body.decode())
            google_token = body.get('token')
            
            if not google_token:
                self.set_status(400)
                self.write({"error": "Google token is required"})
                return
            
            # Get Google client ID from environment
            google_client_id = os.getenv('GOOGLE_CLIENT_ID')
            if not google_client_id:
                self.set_status(500)
                self.write({"error": "Google authentication not configured"})
                return
            
            # Verify Google token
            google_user_info = await auth_utils.verify_google_token(google_token, google_client_id)
            if not google_user_info:
                self.set_status(401)
                self.write({"error": "Invalid Google token"})
                return
            
            # Check if user exists by Google ID
            user = await storage.get_user_by_google_id(google_user_info['google_id'])
            
            if not user:
                # Check if user exists by email
                user = await storage.get_user_by_email(google_user_info['email'])
                
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
                    user = await storage.create_user(insert_user)
            
            # Create session
            session_token = auth_utils.generate_session_token()
            expires_at = datetime.now() + timedelta(days=7)
            await storage.create_session(user.id, session_token, expires_at)
            
            # Set secure cookie
            self.set_secure_cookie("session_token", session_token, expires_days=7)
            
            # Return user data
            user_data = user.dict()
            user_data.pop('password_hash', None)
            
            self.write({
                "success": True,
                "user": user_data,
                "message": "Google authentication successful"
            })
            
        except Exception as e:
            self.set_status(500)
            self.write({"error": str(e)})


class MeHandler(AuthBaseHandler):
    async def get(self):
        """Get current user information"""
        try:
            user = await self.get_current_user_from_session()
            if not user:
                self.set_status(401)
                self.write({"error": "Not authenticated"})
                return
            
            # Return user data (without password)
            user_data = user.dict()
            user_data.pop('password_hash', None)
            
            self.write({
                "success": True,
                "user": user_data
            })
            
        except Exception as e:
            self.set_status(500)
            self.write({"error": str(e)})