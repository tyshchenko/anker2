// Simple wallet generation utility for demo purposes
// In production, this would use proper cryptographic libraries

export interface GeneratedWallet {
  address: string;
  privateKey: string;
  publicKey: string;
  symbol: string;
}

// Generate a random hex string
function generateRandomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate Bitcoin-style address
function generateBitcoinAddress(): string {
  // Simplified Bitcoin address generation (for demo only)
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '1'; // Bitcoin addresses typically start with 1 or 3
  for (let i = 0; i < 33; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate Ethereum-style address
function generateEthereumAddress(): string {
  return '0x' + generateRandomHex(40);
}

// Generate wallet address based on cryptocurrency type
export function generateWalletAddress(symbol: string): string {
  switch (symbol.toUpperCase()) {
    case 'BTC':
      return generateBitcoinAddress();
    case 'ETH':
    case 'USDT':
    case 'BNB':
    case 'MATIC':
      return generateEthereumAddress();
    case 'SOL':
      return generateRandomHex(44);
    case 'XRP':
      return 'r' + generateRandomHex(33);
    case 'ADA':
      return 'addr1' + generateRandomHex(55);
    case 'AVAX':
      return generateEthereumAddress();
    case 'DOGE':
      return 'D' + generateRandomHex(33);
    case 'ZAR':
      return 'ZAR-WALLET-' + generateRandomHex(8).toUpperCase();
    case 'USD':
      return 'USD-WALLET-' + generateRandomHex(8).toUpperCase();
    default:
      return generateEthereumAddress();
  }
}

// Generate a complete wallet with private/public keys
export function generateWallet(symbol: string): GeneratedWallet {
  const privateKey = generateRandomHex(64);
  const publicKey = generateRandomHex(66);
  const address = generateWalletAddress(symbol);

  return {
    address,
    privateKey,
    publicKey,
    symbol: symbol.toUpperCase()
  };
}

// Validate wallet address format
export function validateWalletAddress(address: string, symbol: string): boolean {
  switch (symbol.toUpperCase()) {
    case 'BTC':
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
    case 'ETH':
    case 'USDT':
    case 'BNB':
    case 'MATIC':
    case 'AVAX':
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'SOL':
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    case 'XRP':
      return /^r[0-9a-zA-Z]{33}$/.test(address);
    case 'ADA':
      return /^addr1[0-9a-z]{58}$/.test(address);
    case 'DOGE':
      return /^D[0-9a-zA-Z]{33}$/.test(address);
    case 'ZAR':
      return /^ZAR-WALLET-[A-Z0-9]{8}$/.test(address);
    case 'USD':
      return /^USD-WALLET-[A-Z0-9]{8}$/.test(address);
    default:
      return false;
  }
}