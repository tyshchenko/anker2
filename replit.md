# Exchange Application

## Overview

This is a cryptocurrency exchange web application built with React/TypeScript frontend and Python/Tornado backend with MySQL database. The application provides a trading platform with real-time market data, multi-currency support (including South African Rand), and a modern dark-themed UI. It features OAuth authentication, Two-Factor Authentication, KYC verification, wallet management, mystery box rewards system, and a trading competition.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for development and bundling
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Recharts library for financial data visualization
- **Form Handling**: React Hook Form with Zod validation
- **Responsive Design**: Mobile-first approach with responsive sidebar and adaptive layouts
- **Theme**: Golden mystery box theme with yellow/amber gradients and glowing effects

### Backend Architecture
- **Framework**: Python Tornado asynchronous web framework
- **Database**: MySQL with pymysql-pool for connection pooling
- **Real-time Communication**: WebSocket server integration for live price updates
- **Data Storage**: MySQL database with custom storage layer (server/storage.py)
- **API Design**: RESTful endpoints with JSON responses and error handling
- **Blockchain Integration**: Multi-network cryptocurrency support (BTC, ETH, TRX, BNB, etc.)

### Database Schema
- **Users Table**: OAuth authentication, 2FA, KYC status, profile data
- **Wallets Table**: Multi-coin wallet balances with network support
- **Trades Table**: Complete trade history with asset pairs, amounts, rates, and fees
- **Transactions Table**: Deposit/withdrawal history with blockchain transaction hashes
- **Reward Tasks Table**: Task definitions (KYC, deposit, trading volume)
- **User Rewards Table**: Individual user progress on tasks, completion status, claim status
- **Data Types**: Decimal precision for financial calculations to avoid floating-point errors

### Authentication and Session Management
- **OAuth Integration**: Google OAuth for user authentication
- **Two-Factor Authentication**: TOTP-based 2FA with QR code generation
- **User Verification**: KYC/identity verification system with status tracking
- **Session Management**: Secure session handling with user context

### Real-time Features
- **WebSocket Integration**: Live price updates and market data streaming
- **Market Data Refresh**: 5-second interval polling for price updates
- **UI State Synchronization**: Automatic re-fetching on window focus and connection restore

### Trading Engine
- **Multi-Asset Support**: Cryptocurrencies (BTC, ETH, USDT, SOL, BNB, TRX, XRP, DOGE, MATIC, ADA) and fiat currencies (ZAR, USD, EUR, GBP)
- **Multi-Network USDT Support**: USDT available on both ERC20 (Ethereum) and TRC20 (Tron) networks
  - Network-specific address generation and validation
  - Fee differentiation (TRC20 lower fees, ERC20 higher fees)
  - User-selectable network on Send and Receive pages
  - Network badge display for USDT wallets
- **Exchange Rate Calculation**: Real-time conversion rates with ZAR as base currency
- **Fee Structure**: Configurable transaction fees (0.1% default)
- **Trade Types**: Buy, sell, and convert operations with validation
- **Price Discovery**: Mock price feeds with volatility simulation for development

### Mystery Box Rewards System
- **Qualification Process**: Users must complete ALL steps to unlock rewards (not individual claims)
  1. Register and complete KYC verification → 100 ZAR reward
  2. Deposit R1,000+ (crypto or ZAR) → 200 BNB reward
  3. Complete R1,000 trading volume → 700 ZAR reward
- **Total Reward Value**: R1,000+ worth of mystery box rewards
- **Backend Enforcement**: `claim_reward()` method validates all tasks completed before allowing claims
- **Qualification Check**: `check_qualification_status()` returns detailed completion status
- **Frontend UX**: Golden theme with mystery box icons, progress tracking, and detailed error messages
- **Expiration**: Rewards expire 14 days after user registration
- **API Endpoints**:
  - `GET /api/rewards` - Get user rewards with progress
  - `POST /api/rewards/claim` - Claim reward (requires full qualification)

### Trading Competition
- **Prize Pool**: R10,000 worth of BNB
- **Winners**: Top 3 traders by 30-day trading volume
- **Leaderboard**: 
  - Real-time rankings with crown/medal icons (🥇🥈🥉)
  - Privacy-friendly display (email prefix only)
  - Shows trading volume and trade count
- **API Endpoint**: `GET /api/leaderboard` - Get top traders
- **Competition Period**: Monthly 30-day rolling competitions

## External Dependencies

### Core Technologies
- **Neon Database**: Serverless PostgreSQL database provider (@neondatabase/serverless)
- **Drizzle Kit**: Database migrations and schema management
- **React Ecosystem**: Core React libraries and hooks

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Radix UI**: Accessible component primitives for complex UI elements
- **Recharts**: React-based charting library for financial data visualization
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **TypeScript**: Static type checking across frontend and backend
- **Vite**: Fast build tool with hot module replacement
- **ESBuild**: JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration

### Validation and Forms
- **Zod**: Schema validation for API endpoints and form data
- **React Hook Form**: Form state management with validation
- **Drizzle Zod**: Database schema to Zod schema generation

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx/twMerge**: Conditional CSS class utilities
- **nanoid**: Unique ID generation for entities
- **ws**: WebSocket implementation for real-time communication