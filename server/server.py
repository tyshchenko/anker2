#!/usr/bin/env python3
import os
import asyncio
import tornado.web
import tornado.ioloop
import tornado.httpserver
import subprocess
import json
import random
from decimal import Decimal
from datetime import datetime
from pathlib import Path

from handlers import MarketDataHandler, TradesHandler, UserTradesHandler, WebSocketHandler
from auth_handlers import RegisterHandler, LoginHandler, LogoutHandler, GoogleAuthHandler, MeHandler
from storage import storage
from models import InsertMarketData


class StaticFileHandler(tornado.web.StaticFileHandler):
    """Custom static file handler that serves index.html for SPA routes"""
    
    @classmethod
    def get_absolute_path(cls, root, path):
        # If file doesn't exist and it's not an API route, serve index.html
        absolute_path = super().get_absolute_path(root, path)
        if not os.path.exists(absolute_path) and not path.startswith('api/'):
            return super().get_absolute_path(root, 'index.html')
        return absolute_path


class ViteProxyHandler(tornado.web.RequestHandler):
    """Proxy handler for Vite development server"""
    
    async def get(self, path=""):
        # In development, proxy all non-API requests to Vite dev server
        if path.startswith('api/'):
            self.set_status(404)
            return
            
        vite_url = f"http://localhost:5173/{path}"
        
        try:
            import aiohttp
            timeout = aiohttp.ClientTimeout(total=5)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(vite_url, allow_redirects=True) as resp:
                    if resp.status == 200:
                        content = await resp.read()
                        content_type = resp.headers.get("Content-Type", "text/html")
                        self.set_header("Content-Type", content_type)
                        self.write(content)
                    else:
                        # Fallback to serving index.html for SPA routing
                        index_url = "http://localhost:5173/"
                        async with session.get(index_url) as index_resp:
                            if index_resp.status == 200:
                                content = await index_resp.read()
                                self.set_header("Content-Type", "text/html")
                                self.write(content)
                            else:
                                self.set_status(404)
                                self.write("Frontend not available")
        except Exception as e:
            # Serve a minimal HTML page with instructions
            self.set_header("Content-Type", "text/html")
            self.write(f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Exchange App</title>
                <style>
                    body {{ font-family: Arial, sans-serif; padding: 40px; text-align: center; }}
                    .error {{ color: #e74c3c; margin: 20px 0; }}
                    .info {{ color: #3498db; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <h1>Exchange Application</h1>
                <div class="error">Frontend server not available</div>
                <div class="info">Please run: npm run vite:dev in a separate terminal</div>
                <div class="info">Or the Vite server on port 5173 is not responding</div>
                <div>Error: {str(e)}</div>
            </body>
            </html>
            """)


def create_app():
    """Create and configure the Tornado application"""
    
    # Determine if we're in development or production
    is_development = os.getenv('NODE_ENV', 'development') == 'development'
    
    handlers = [
        # API routes
        (r"/api/market/([^/]+)", MarketDataHandler),
        (r"/api/market", MarketDataHandler),
        (r"/api/trades", TradesHandler),
        (r"/api/trades/([^/]+)", UserTradesHandler),
        
        # Authentication routes
        (r"/api/auth/register", RegisterHandler),
        (r"/api/auth/login", LoginHandler),
        (r"/api/auth/logout", LogoutHandler),
        (r"/api/auth/google", GoogleAuthHandler),
        (r"/api/auth/me", MeHandler),
        
        # WebSocket route
        (r"/ws", WebSocketHandler),
    ]
    
    if is_development:
        # In development, let Vite handle frontend serving
        handlers.append((r"/(.*)", ViteProxyHandler))
    else:
        # In production, serve built static files
        static_path = Path(__file__).parent.parent / "dist" / "public"
        handlers.extend([
            (r"/static/(.*)", tornado.web.StaticFileHandler, {"path": static_path}),
            (r"/(.*)", StaticFileHandler, {"path": static_path, "default_filename": "index.html"}),
        ])
    
    app = tornado.web.Application(
        handlers,
        debug=is_development,
        autoreload=False,  # Disable autoreload since we're using our own restart mechanism
    )
    
    return app


async def simulate_price_updates():
    """Simulate real-time price updates every 5 seconds"""
    while True:
        try:
            await asyncio.sleep(5)
            
            # Get all current market data
            all_data = await storage.get_all_market_data()
            
            # Update each pair with small random changes
            for market_data in all_data:
                volatility = (random.random() - 0.5) * 0.01  # ±0.5% volatility
                current_price = market_data.price
                new_price = current_price * (1 + Decimal(str(volatility)))
                
                # Update market data
                update_data = InsertMarketData(
                    pair=market_data.pair,
                    price=new_price,
                    change_24h=market_data.change24h,
                    volume_24h=market_data.volume24h
                )
                
                await storage.update_market_data(update_data)
            
            # Broadcast updates to WebSocket clients
            updated_data = await storage.get_all_market_data()
            await WebSocketHandler.broadcast_market_update(updated_data)
            
        except Exception as e:
            print(f"Error in price simulation: {e}")


def log_request(handler):
    """Log HTTP requests similar to Express.js logging"""
    if handler.request.uri.startswith("/api"):
        duration = int((handler.request.request_time() or 0) * 1000)
        method = handler.request.method
        path = handler.request.uri
        status = handler.get_status()
        
        log_line = f"{method} {path} {status} in {duration}ms"
        
        # Truncate long log lines
        if len(log_line) > 80:
            log_line = log_line[:79] + "…"
        
        print(f"{datetime.now().strftime('%I:%M:%S %p')} [tornado] {log_line}")


async def main():
    """Main entry point"""
    app = create_app()
    
    # Get port from environment or default to 5000
    port = int(os.getenv('PORT', '5000'))
    
    # Create HTTP server
    server = tornado.httpserver.HTTPServer(app)
    server.bind(port, address="0.0.0.0")
    server.start(1)  # Use single process
    
    print(f"{datetime.now().strftime('%I:%M:%S %p')} [tornado] serving on port {port}")
    
    # Start price simulation in background
    asyncio.create_task(simulate_price_updates())
    
    # Start the event loop
    await asyncio.Event().wait()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down server...")