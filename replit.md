# Exchange Application

## Overview

This is a cryptocurrency exchange web application built with React, Express.js, and PostgreSQL. The application provides a trading platform with real-time market data, multi-currency support (including South African Rand), and a modern dark-themed UI. It features a sidebar navigation, price charts, market tickers, and trading functionality for buying, selling, and converting between cryptocurrencies and fiat currencies.

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

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Real-time Communication**: WebSocket server integration for live price updates
- **Data Storage**: In-memory storage with interface design allowing easy database migration
- **API Design**: RESTful endpoints with structured error handling and request logging
- **Build System**: ESBuild for server compilation with external package bundling

### Database Schema
- **Users Table**: User authentication with username/password storage
- **Trades Table**: Complete trade history with asset pairs, amounts, rates, and fees
- **Market Data Table**: Historical price data with 24h change and volume metrics
- **Data Types**: Decimal precision for financial calculations to avoid floating-point errors

### Authentication and Session Management
- **Session Storage**: PostgreSQL session store with connect-pg-simple
- **User Management**: Basic username/password authentication system
- **Trade Authorization**: User-specific trade history and portfolio tracking

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