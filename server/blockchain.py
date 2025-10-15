import os
import time
import hashlib
import requests
import math
from ecdsa import SigningKey, SECP256k1
import web3
from web3.exceptions import InvalidTransaction
from web3.middleware import geth_poa_middleware
from eth_account import Account
from solana.rpc.api import Client as SolanaClient
from solders.keypair import Keypair
from solana.transaction import Transaction
from solders.system_program import (
    TransferParams,
    transfer
)
from solana.rpc.commitment import Processed, Confirmed
from solana.rpc.types import TxOpts
from solders.pubkey import Pubkey

import base58  # pip install base58
from tronpy import Tron  # pip install tronpy
from tronpy.keys import PrivateKey
from tronpy.providers import HTTPProvider
from bit import Key
from bit.transaction import (
    deserialize,
    address_to_scriptpubkey,
)
from bit.network import NetworkAPI
import binascii

import json
import socket
import ssl
import bit

from models import GeneratedWallet, NewWallet, FullWallet
from config import COIN_SETTINGS, POLL_INTERVAL,PRKEY,ETHAPIKEY,BSCAPIKEY,TRONAPIKEY,VALRDEPOSIT, COIN_NETWORKS, DATABASE_TYPE
if DATABASE_TYPE == 'postgresql':
    from postgres_storage import storage
elif DATABASE_TYPE == 'mysql':
    from storage import storage

# ERC20 Token ABI (Standard Interface)
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    }
]

# Note: Install required libraries:
# pip3 install ecdsa web3 solana base58 tronpy requests

# Configuration - Replace with your own RPC URLs and central wallets
# For ETH: Get a free Infura/Alchemy project ID
# For SOL: Use a public RPC like https://api.mainnet-beta.solana.com
# For TRX: Use a public RPC like https://api.trongrid.io
# For BTC: Using BlockCypher API (rate-limited, consider alternatives for production)

def hex_to_bytes(hexed):

    if len(hexed) & 1:
        hexed = '0' + hexed

    return bytes.fromhex(hexed)

# Function to compute scripthash from a script (P2PKH or P2PK)
def script_to_scripthash(script_hex):
    try:
        # Convert script hex to bytes
        script = bytes.fromhex(script_hex)
        # SHA256 hash of the script
        scripthash = hashlib.sha256(script).digest()
        # Reverse the hash (ElectrumX uses little-endian)
        scripthash = scripthash[::-1]
        return scripthash.hex()
    except Exception as e:
        raise Exception(f"Error computing scripthash: {e}")

def address_to_scripthash(address):
    try:
        # Check if address is Bech32 (starts with 'bc1')
        if address.startswith('bc1'):
            raise Exception("Only witness version 0 is supported (P2WPKH/P2WSH)")
        else:
            # Decode Base58 address (P2PKH or P2SH)
            decoded = base58.b58decode_check(address)
            version = decoded[0]
            hash_bytes = decoded[1:]  # Remove version byte
            if version == 0:  # P2PKH (starts with '1')
                # Script: OP_DUP OP_HASH160 <pubkeyhash> OP_EQUALVERIFY OP_CHECKSIG
                script = bytes.fromhex("76a914") + hash_bytes + bytes.fromhex("88ac")
            elif version == 5:  # P2SH (starts with '3')
                # Script: OP_HASH160 <scripthash> OP_EQUAL
                script = bytes.fromhex("a914") + hash_bytes + bytes.fromhex("87")
            else:
                raise Exception("Unsupported address version")
            return script_to_scripthash(script.hex())
    except Exception as e:
        raise Exception(f"Error converting address to scripthash: {e}")


# Basic synchronous JSON-RPC client for ElectrumX
class ElectrumXClient:
    #electrum.blockstream.info 50001 electrum.cakewallet.com 50001 2ex.digitaleveryware.com 50001

    def __init__(self, host, port, ssl=True):
        self.host = host
        self.port = port
        self.ssl = ssl
        self.socket = None
        self.id_counter = 0

    def connect(self):
        try:
            # Create socket
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            if self.ssl:
                # Wrap socket with SSL
                context = ssl.create_default_context()
                self.socket = context.wrap_socket(self.socket, server_hostname=self.host)
            self.socket.connect((self.host, self.port))
        except Exception as e:
            raise Exception(f"Connection error: {e}")

    def close(self):
        if self.socket:
            self.socket.close()
            self.socket = None

    def send_request(self, method, params):
        self.id_counter += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.id_counter,
            "method": method,
            "params": params
        }
        # Serialize and send request
        request_data = json.dumps(request) + '\n'
        self.socket.sendall(request_data.encode('utf-8'))

        # Receive response
        response_data = ''
        while True:
            chunk = self.socket.recv(4096).decode('utf-8')
            if not chunk:
                break
            response_data += chunk
            if '\n' in response_data:
                break

        try:
            response = json.loads(response_data.strip())
            
#            print(response)
            return response
#            print("!!!!!!!!!!")
#            if "error" in response and response["error"] is not None:
#              print(f"RPC Error: ")
              #print(f"RPC Error: {response['error']}")
              #raise Exception(f"RPC Error: {response['error']}")
#              return {}

#            else:
#              return response["result"]
        except json.JSONDecodeError:
            raise Exception("Invalid JSON response from server")

    def get_history(self, scripthash):
        return self.send_request("blockchain.scripthash.get_history", [scripthash])

    def get_balance(self, scripthash):
        return self.send_request("blockchain.scripthash.get_balance", [scripthash])

    def get_transaction(self, txid):
        transaction = self.send_request("blockchain.transaction.get", [txid, False])
        return deserialize(transaction['result'])

    def list_unspent(self, scripthash):
        return self.send_request("blockchain.scripthash.listunspent", [scripthash])

    def broadcast(self, raw_hex):
        return self.send_request("blockchain.transaction.broadcast", [raw_hex])

    def get_fee(self):
        return self.send_request("blockchain.relayfee", [])

    def get_fee_num(self,blocks):
        return self.send_request("blockchain.estimatefee", [blocks])

class Blockchain:
    def __init__(self):
        self.coins = COIN_SETTINGS
        self.eth_client = web3.Web3(web3.HTTPProvider(COIN_SETTINGS['ETH']['rpc_url']))
        self.bnb_client = web3.Web3(web3.HTTPProvider(COIN_SETTINGS['BNB']['rpc_url']))
        self.bnb_client.middleware_onion.inject(geth_poa_middleware, layer=0)
        self.sol_client = SolanaClient(COIN_SETTINGS['SOL']['rpc_url'])
        provider = HTTPProvider(timeout=30, endpoint_uri=COIN_SETTINGS['TRX']['rpc_url'])
        provider.sess.trust_env = False
        self.trx_client = Tron(provider)


    def get_btc_fee(self):
        url="https://mempool.space/api/v1/fees/recommended"
        resutl = requests.get(url)
        print(resutl.text)
        return resutl.json()


      
    def get_balance(self, wallet: FullWallet):
        coin = wallet.coin
        if coin in self.coins:
          if coin == "BTC":
            balance = self.get_elbtc_balance(wallet.address)
            return str(balance)
          elif coin == "ETH":
            balance = self.get_eth_balance(wallet.address)
            return str(balance)
          elif coin == "BNB":
            balance = self.get_bnb_balance(wallet.address)
            return str(balance)
          elif coin == "TRX":
            balance = self.get_trx_balance(wallet.address)
            return str(balance)
          elif coin == "SOL":
            balance = self.get_sol_balance(wallet.address)
            return str(balance)
          elif coin in COIN_NETWORKS:
            balance = 0
            for netcoin in COIN_NETWORKS[coin]:
              basecoin = coin + netcoin
              balance += self.get_token_balance(self, netcoin, coin, wallet)
            return str(balance)
          else:
            return '0'
        else:
          return '0'
  
    def sendcrypto(self, address, email, amount, coin):
          data = {
              "address": address,
              "amount": amount,
              "coin": coin,
              "email": email,
            }

          print(data)
          details = "test"
          btcam = "0"
          err = 0
          if True:
            resutl = requests.post("http://127.0.0.1:8086/api/txsexchange", data=data, verify=False)
            print(resutl.text)
            res = resutl.json()
            details = res["done"]
          
          

          return details
        
    def move_from_hot(self,coin):
          try:
            if coin == "BTC":
              balance = self.get_elbtc_balance(COIN_SETTINGS[coin]['central_wallet'])
              print(str(balance))
              if int(balance) > COIN_SETTINGS[coin]['min_send_amount']:
                self.send_btc_all(COIN_SETTINGS[coin]['central_wallet'], PRKEY, VALRDEPOSIT[coin]['address'])
            elif coin == "ETH":
              balance = self.get_eth_balance(COIN_SETTINGS[coin]['central_wallet'])
              print(str(balance))
              if int(balance) > COIN_SETTINGS[coin]['min_send_amount']:
                self.send_eth_all(COIN_SETTINGS[coin]['central_wallet'], PRKEY, VALRDEPOSIT[coin]['address'])
            elif coin == "BNB":
              balance = self.get_bnb_balance(COIN_SETTINGS[coin]['central_wallet'])
              print(str(balance))
              if int(balance) > COIN_SETTINGS[coin]['min_send_amount']:
                self.send_bnb_all(COIN_SETTINGS[coin]['central_wallet'], PRKEY, VALRDEPOSIT[coin]['address'])
            elif coin == "TRX":
              balance = self.get_trx_balance(COIN_SETTINGS[coin]['central_wallet'])
              print(str(balance))
              if int(balance) > COIN_SETTINGS[coin]['min_send_amount']:
                self.send_trx_all(COIN_SETTINGS[coin]['central_wallet'], PRKEY, VALRDEPOSIT[coin]['address'])
            elif coin == "SOL":
              balance = self.get_sol_balance(COIN_SETTINGS[coin]['central_wallet'])
              print(str(balance))
              if int(balance) > COIN_SETTINGS[coin]['min_send_amount']:
                self.send_sol_all(COIN_SETTINGS[coin]['central_wallet'], PRKEY, VALRDEPOSIT[coin]['address'])
            elif coin in COIN_NETWORKS:
              for netcoin in COIN_NETWORKS[coin]:
                basecoin = coin + netcoin
                if netcoin == "TRC20":
                  self.send_trc20_all(COIN_SETTINGS[COIN_NETWORKS[coin][netcoin]]['central_wallet'], PRKEY, VALRDEPOSIT[basecoin]['address'], COIN_CONTRACTS[coin][netcoin])
                elif netcoin == "ERC20":
                  self.send_erc20_all(COIN_SETTINGS[COIN_NETWORKS[coin][netcoin]]['central_wallet'], PRKEY, VALRDEPOSIT[basecoin]['address'], COIN_CONTRACTS[coin][netcoin])
          except Exception as e: print(e)


    def get_transactions(self, wallet: FullWallet):
        coin = wallet.coin
        print(coin)
        if coin in self.coins:
          if coin == "BTC":
            #print("=========== BTC transactions")
            transactions = self.get_elbtc_transactions(wallet.address)
            #print(transactions)
            return transactions
          elif coin == "ETH":
            transactions = self.get_eth_transactions(wallet.address)
            return transactions
          elif coin == "BNB":
            transactions = self.get_bnb_transactions(wallet.address)
            return transactions
          elif coin == "TRX":
            transactions = self.get_tron_transactions(wallet.address)
            return transactions
          elif coin == "SOL":
            transactions = self.get_sol_transactions(wallet.address)
            return transactions
          elif coin in COIN_NETWORKS:
            transactions = []
            user = storage.get_user_by_email(wallet.email)
            for netcoin in COIN_NETWORKS[coin]:
              basecoin = coin + netcoin
              networkwallet  = storage.get_coinwallet(COIN_NETWORKS[coin][netcoin], user)
              if netcoin == "TRC20":
                transactions.append(self.get_trc20_transactions(networkwallet.address, COIN_CONTRACTS[coin][netcoin]))
              elif netcoin == "ERC20":
                transactions.append(self.get_erc20_transactions(networkwallet.address, COIN_CONTRACTS[coin][netcoin]))
            return transactions
          else:
            return []
        else:
          return []

    def forward_to_hot(self, wallet: FullWallet):
        coin = wallet.coin
        try:
          if coin in self.coins:
            if coin == "BTC":
              self.send_btc_all(wallet.address, wallet.privatekey, COIN_SETTINGS[coin]['central_wallet'])
            elif coin == "ETH":
              self.send_eth_all(wallet.address, wallet.privatekey, COIN_SETTINGS[coin]['central_wallet'])
            elif coin == "BNB":
              self.send_bnb_all(wallet.address, wallet.privatekey, COIN_SETTINGS[coin]['central_wallet'])
            elif coin == "TRX":
              self.send_trx_all(wallet.address, wallet.privatekey, COIN_SETTINGS[coin]['central_wallet'])
            elif coin == "SOL":
              self.send_sol_all(wallet.address, wallet.privatekey, COIN_SETTINGS[coin]['central_wallet'])
            elif coin in COIN_NETWORKS:
              user = storage.get_user_by_email(wallet.email)
              for netcoin in COIN_NETWORKS[coin]:
                basecoin = coin + netcoin
                networkwallet  = storage.get_coinwallet(COIN_NETWORKS[coin][netcoin], user)
                if netcoin == "TRC20":
                  self.send_trc20_all(networkwallet.address, networkwallet.privatekey, COIN_SETTINGS[COIN_NETWORKS[coin][netcoin]]['central_wallet'], COIN_CONTRACTS[coin][netcoin])
                elif netcoin == "ERC20":
                  self.send_erc20_all(networkwallet.address, networkwallet.privatekey, COIN_SETTINGS[COIN_NETWORKS[coin][netcoin]]['central_wallet'], COIN_CONTRACTS[coin][netcoin])

            else:
              return []
          else:
            return []
        except Exception as e: print(e)

    def generate_main_wallet(self):
        PRKEYb  = hex_to_bytes(PRKEY)
      
        address = self.generate_btc_address(PRKEYb)
        print(f"BTC Address: {address}")
        address = self.generate_eth_address(PRKEYb)
        print(f"eth Address: {address}")
        address = self.generate_bnb_address(PRKEYb)
        print(f"bnb Address: {address}")
        address = self.generate_trx_address(PRKEYb)
        print(f"trx Address: {address}")
        address = self.generate_sol_address(PRKEYb)
        print(f"sol Address: {address}")



    def generate_wallet(self, wallet: NewWallet) -> GeneratedWallet:
        coin = wallet.coin
        if coin in self.coins:
          private_key = os.urandom(32)
          print(f"Private Key (hex): {private_key.hex()}")
          if coin == "BTC":
            address = self.generate_btc_address(private_key)
            print(f"BTC Address: {address}")
            return GeneratedWallet(
                coin=coin,
                address=address,
                private_key=private_key.hex()
              )
          elif coin == "ETH":
            address = self.generate_eth_address(private_key)
            print(f"ETH Address: {address}")
            return GeneratedWallet(
                coin=coin,
                address=address,
                private_key=private_key.hex()
              )
          elif coin == "BNB":
            address = self.generate_bnb_address(private_key)
            print(f"BNB Address: {address}")
            return GeneratedWallet(
                coin=coin,
                address=address,
                private_key=private_key.hex()
              )
          elif coin == "SOL":
            address = self.generate_sol_address(private_key)
            print(f"SOL Address: {address}")
            return GeneratedWallet(
                coin=coin,
                address=address,
                private_key=private_key.hex()
              )
          elif coin == "TRX":
            address = self.generate_trx_address(private_key)
            print(f"TRX Address: {address}")
            return GeneratedWallet(
                coin=coin,
                address=address,
                private_key=private_key.hex()
              )
          else:
            return None
        else:
          return None



    def generate_btc_address(self, priv_key_bytes):
        key = Key.from_hex(priv_key_bytes.hex())
        address = key.segwit_address
        return address

    def generate_eth_address(self, priv_key_bytes):
        priv_key_eth = priv_key_bytes.hex()
        ethprivate_key = '0x'+priv_key_eth
        account     = Account.from_key(ethprivate_key)
        address  = account.address
        return address

    def generate_bnb_address(self, priv_key_bytes):
        priv_key_bnb = priv_key_bytes.hex()
        bnbprivate_key = '0x'+priv_key_bnb
        account     = Account.from_key(bnbprivate_key)
        address  = account.address
        return address

    def generate_sol_address(self, priv_key_bytes):
        keypair = Keypair.from_seed(priv_key_bytes)
        address = str(keypair.pubkey())
        return address

    def generate_trx_address(self, priv_key_bytes):
        private_key = PrivateKey(priv_key_bytes)
        address = private_key.public_key.to_base58check_address()
        return address


    def get_btc_transactions(self, address):
        url = f"https://blockstream.info/api/address/{address}/txs"
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            transactions = []
            for onetx in data:
              print(onetx)
              for outad in onetx['vout']:
                if outad['scriptpubkey_address'] == address:
                  transactions.append({
                    'hash':onetx['txid'],
                    'side':'Deposit',
                    'amount':outad['value'],
                  })
            
            return transactions
        return []


    def get_elbtc_transactions(self, address):
        try:
            # Convert address to scripthash
            scripthash = address_to_scripthash(address)
            scriptpubkeyaddress = address_to_scriptpubkey(address)
            #print(scripthash)
            
            # Connect to ElectrumX server
            client = ElectrumXClient(COIN_SETTINGS['BTC']['electrum']['host'], COIN_SETTINGS['BTC']['electrum']['port'], ssl=COIN_SETTINGS['BTC']['electrum']['ssl'])
            client.connect()
            
            # Get transaction history
            history_response = client.get_history(scripthash)
            #print(history_response)
            
            transactions = []
            if history_response and 'result' in history_response:
                for tx in history_response['result']:
                    # Get full transaction details
                    tx_response = client.get_transaction(tx['tx_hash'])
                    #print(tx['tx_hash'])

                    if tx_response:
                        # Determine if deposit or withdrawal
                        side = 'Sent to'
                        amount = 0
                        #print(tx_response.TxOut)

                        for vout in tx_response.TxOut:
                            addresses = vout.script_pubkey
                            if scriptpubkeyaddress in addresses:
                                side = 'Deposit'
                                amount = int.from_bytes(vout.amount, byteorder='little')
                                #amount = int(vout.amount * 100000000)  # Convert BTC to satoshis
                                break
                        if side:
                          transactions.append({
                              'hash': tx['tx_hash'],
                              'side': side,
                              'amount': amount,
                          })
            
            client.close()
            return transactions
        except Exception as e:
            print(f"ElectrumX error, falling back to API: {e}")
            # Fallback to blockstream API
            url = f"https://blockstream.info/api/address/{address}/txs"
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                transactions = []
                for onetx in data:
                    for outad in onetx['vout']:
                        if outad['scriptpubkey_address'] == address:
                            transactions.append({
                                'hash':onetx['txid'],
                                'side':'Deposit',
                                'amount':outad['value'],
                            })
                return transactions
            return []

    def get_eth_transactions(self, address):
        url = f"https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address={address}&sort=desc&apikey={ETHAPIKEY}"
        response = requests.get(url)
        
#        print(response.text)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "1":
                transactions = []
                for tx in data.get("result", []):
                    side = "Deposit" if tx["to"].lower() == address.lower() else "Sent to"
                    amount = int(tx["value"]) 
                    transactions.append({
                        "hash": tx["hash"],
                        "side": side,
                        "amount": amount
                    })
                return transactions
        return []

    def get_bnb_transactions(self, address):
        url = f"https://api.etherscan.io/v2/api?chainid=56&module=account&action=txlist&address={address}&sort=desc&apikey={BSCAPIKEY}"
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "1":
                transactions = []
                for tx in data.get("result", []):
                    side = "Deposit" if tx["to"].lower() == address.lower() else "Sent to"
                    amount = int(tx["value"])
                    transactions.append({
                        "hash": tx["hash"],
                        "side": side,
                        "amount": amount
                    })
                return transactions
        return []


    def get_tron_transactions(self, address):
        url = f"https://api.tronscan.org/api/transaction?sort=-timestamp&limit=50&address={address}"
#        headers = {"TRON-PRO-API-KEY": TRONAPIKEY}
        headers = {"Content-Type": "application/json"}
        response = requests.get(url, headers=headers)
#        print(response.text)
        if response.status_code == 200:
            data = response.json()
            transactions = []
            for tx in data.get("data", []):
                side = "Deposit" if tx["toAddress"] == address else "Sent to"
                amount = int(tx["amount"])
                transactions.append({
                    "hash": tx["hash"],
                    "side": side,
                    "amount": amount
                })
            return transactions
        return []

      
    def get_sol_transactions(self, address):
        try:
            # Get transaction signatures for the address
            pubkey = Pubkey.from_string(address)
            
            # Fetch signatures (limit to 50 most recent)
            response = self.sol_client.get_signatures_for_address(
                pubkey,
                limit=50
            )
            
            transactions = []
            #print(response)
            
            if response and hasattr(response, 'value') and response.value:
                for sig_info in response.value:
                    # Get transaction details
                    tx_hash = str(sig_info.signature)
                    print(tx_hash)
                    
                    # Fetch full transaction to determine side and amount
                    try:
                        tx_response = self.sol_client.get_transaction(
                            sig_info.signature,
                            encoding="jsonParsed",
                            max_supported_transaction_version=0
                        )
                        
                        if tx_response and hasattr(tx_response, 'value') and tx_response.value:
                            tx_data = tx_response.value
                            
                            # Parse transaction to find transfers involving this address
                            if hasattr(tx_data, 'transaction') and hasattr(tx_data.transaction.transaction, 'message'):
                                message = tx_data.transaction.transaction.message
                                
                                
                                # Default values
                                side = "Unknown"
                                amount = 0
                                
                                # Check if this is a simple transfer
                                if hasattr(message, 'instructions'):
                                    for instruction in message.instructions:
                                        
                                        # Check for system program transfers (native SOL)
                                        if hasattr(instruction, 'parsed'):
                                            parsed = instruction.parsed
                                            
                                            if isinstance(parsed, dict):
                                                if parsed.get('type') == 'transfer':
                                                    info = parsed.get('info', {})
                                                    
                                                    destination = info.get('destination')
                                                    source = info.get('source')
                                                    lamports = info.get('lamports', 0)
                                                    
                                                    # Determine if deposit or withdrawal
                                                    if destination == address:
                                                        side = "Deposit"
                                                        amount = lamports
                                                    elif source == address:
                                                        side = "Sent to"
                                                        amount = lamports
                                
                                # Add transaction if we identified it
                                if side != "Unknown" and amount > 0:
                                    transactions.append({
                                        'hash': tx_hash,
                                        'side': side,
                                        'amount': amount,  # in lamports (1 SOL = 1,000,000,000 lamports)
                                    })
                    except Exception as e:
                        # Skip transactions we can't parse
                        print(f"Error parsing SOL transaction {tx_hash}: {e}")
                        continue
            #print(transactions)
            return transactions
            
        except Exception as e:
            print(f"Error fetching Solana transactions: {e}")
            return []
            
    def get_btc_balance(self, address):
        url = f"{COIN_SETTINGS['BTC']['rpc_url']}/addrs/{address}/balance"
        response = requests.get(url)
        print(response.text)
        if response.status_code == 200:
            data = response.json()
            return data['balance']  # in satoshis
        else:
          url = f"https://blockstream.info/api/address/{address}"
          response = requests.get(url)
          print(response.text)
          if response.status_code == 200:
              data = response.json()
              return data['chain_stats']['funded_txo_sum']  # in satoshis


        return 0
      
    def get_elbtc_balance(self, address):
        try:
            # Convert address to scripthash
            scripthash = address_to_scripthash(address)
            
            # Connect to ElectrumX server
            client = ElectrumXClient(COIN_SETTINGS['BTC']['electrum']['host'], COIN_SETTINGS['BTC']['electrum']['port'], ssl=COIN_SETTINGS['BTC']['electrum']['ssl'])
            client.connect()
            
            # Get balance
            balance_response = client.get_balance(scripthash)
            
#            print(client.get_fee())
#            print(client.get_fee_num(1))
#            print(client.get_fee_num(3))
            client.close()
            
            if balance_response and 'result' in balance_response:
                # ElectrumX returns confirmed and unconfirmed balances in satoshis
                confirmed = balance_response['result'].get('confirmed', 0)
                unconfirmed = balance_response['result'].get('unconfirmed', 0)
                total_balance = confirmed + unconfirmed
                return total_balance
            
            return 0
        except Exception as e:
            print(f"ElectrumX error, falling back to API: {e}")
            # Fallback to existing API method
            url = f"{COIN_SETTINGS['BTC']['rpc_url']}/addrs/{address}/balance"
            response = requests.get(url)
            print(response.text)
            if response.status_code == 200:
                data = response.json()
                return data['balance']  # in satoshis
            else:
                url = f"https://blockstream.info/api/address/{address}"
                response = requests.get(url)
                print(response.text)
                if response.status_code == 200:
                    data = response.json()
                    return data['chain_stats']['funded_txo_sum']  # in satoshis
            
            return 0

    def get_eth_balance(self, address):
        return self.eth_client.eth.get_balance(address)


    def get_token_balance(self, network, token, wallet):
        user = storage.get_user_by_email(wallet.email)
        networkwallet  = storage.get_coinwallet(COIN_NETWORKS[token][network], user)
        if network == 'ERC20':
          return get_erc20_balance(networkwallet.address, COIN_CONTRACTS[token][network])
        elif  network == 'TRC20':
          return get_trc20_balance(networkwallet.address, COIN_CONTRACTS[token][network])
        return 0

    def get_bnb_balance(self, address):
        return self.bnb_client.eth.get_balance(address)

    def get_sol_balance(self, address):
        pubkey = Pubkey.from_string(address)
        response = self.sol_client.get_balance(pubkey)
        print('sol balance ' + str(response.value) + ' ' + address)
        return response.value

    def get_trx_balance(self, address):
        try:
          balance = self.trx_client.get_account_balance(address) * 10**6
          return balance
        except Exception as e: 
          print(e)
          return 0

    def send_btc_all(self, address, priv_key_hex, central):
        # For BTC sending, it's more complex. Recommend using 'bit' library for simplicity.
        # pip install bit
        key = Key.from_hex(priv_key_hex)
        balance = self.get_elbtc_balance(address)
        if balance > COIN_SETTINGS['BTC']['min_send_amount']:
            client = ElectrumXClient(COIN_SETTINGS['BTC']['electrum']['host'], COIN_SETTINGS['BTC']['electrum']['port'], ssl=COIN_SETTINGS['BTC']['electrum']['ssl'])
            client.connect()
        
            fee_rate = int(math.ceil((float(client.get_fee_num(1)['result'])/1000)*10**8))
            print(fee_rate)
            signed_raw_tx = key.create_transaction(
                outputs=[],
                fee=fee_rate,
                leftover=central
            )
            
            print(signed_raw_tx)
            client.broadcast(signed_raw_tx)
            client.close()

            txid = NetworkAPI.broadcast_tx(signed_raw_tx)
        
#            to_send_amnt = balance - COIN_SETTINGS['BTC']['min_send_amount']
#            # Estimate fee, bit handles it
#            print(COIN_SETTINGS['BTC']['central_wallet'])
#            print("key.send " + str(to_send_amnt) +"  "+ str(COIN_SETTINGS['BTC']['min_send_amount']) + '  ' + str(balance))
#            print(key.send([(central, to_send_amnt / 10**8, 'btc')], leftover=COIN_SETTINGS['BTC']['central_wallet']))
#            print("BTC sent to central")


    def send_eth_all(self, address, priv_key_bytes, central):
        balance = self.get_eth_balance(address)
        if balance > COIN_SETTINGS['ETH']['min_send_amount']:
            acct = self.eth_client.eth.account.from_key(priv_key_bytes)
            gas_price = self.eth_client.eth.gas_price
            gas = 21000
            value = balance - (gas * gas_price)
            if value > 0:
                nonce = self.eth_client.eth.get_transaction_count(address)
                tx = {
                    'nonce': nonce,
                    'to': central,
                    'value': value,
                    'gasPrice': gas_price,
                    'chainId': self.eth_client.eth.chain_id
                }
                estimated_gas = self.eth_client.eth.estimate_gas(tx)
                gas = int(estimated_gas)
                max_fee = gas * gas_price
                value = balance - max_fee
                if value > 0 and gas < 150000:
                  tx = {
                        'nonce': nonce,
                        'to': central,
                        'value': value,
                        'gas': gas,
                        'gasPrice': gas_price,
                        'chainId': self.eth_client.eth.chain_id
                    }
                  print("estimated_gas!!!!!!!!!!")
                  print(estimated_gas)
                  signed_tx = acct.sign_transaction(tx)
                  tx_hash = self.eth_client.eth.send_raw_transaction(signed_tx.raw_transaction)
                  print(f"ETH sent: {tx_hash.hex()}")
                  return value
        
        return 0

    def get_erc20_balance(self, address, token_contract):
        """Get ERC20 token balance for an address"""
        try:
            # Create contract instance
            contract = self.eth_client.eth.contract(
                address=self.eth_client.to_checksum_address(token_contract),
                abi=ERC20_ABI
            )
            # Get balance
            balance = contract.functions.balanceOf(
                self.eth_client.to_checksum_address(address)
            ).call()
            return balance
        except Exception as e:
            print(f"Error getting ERC20 balance: {e}")
            return 0

    def get_erc20_transactions(self, address, token_contract):
        """Get ERC20 token transactions for an address using Etherscan API"""
        try:
            url = f"https://api.etherscan.io/api?module=account&action=tokentx&contractaddress={token_contract}&address={address}&sort=desc&apikey={ETHAPIKEY}"
            response = requests.get(url)
            data = response.json()
            
            if data['status'] == '1' and data['message'] == 'OK':
                transactions = []
                for tx in data['result']:
                    transactions.append({
                        'hash': tx['hash'],
                        'from': tx['from'],
                        'to': tx['to'],
                        'value': tx['value'],
                        'timestamp': tx['timeStamp'],
                        'blockNumber': tx['blockNumber'],
                        'tokenSymbol': tx['tokenSymbol'],
                        'tokenDecimal': tx['tokenDecimal']
                    })
                return transactions
            return []
        except Exception as e:
            print(f"Error getting ERC20 transactions: {e}")
            return []

    def send_erc20_all(self, address, priv_key_bytes, central, token_contract):
        """Send all ERC20 tokens from address to central wallet"""
        try:
            # Get token balance
            token_balance = self.get_erc20_balance(address, token_contract)
            if token_balance <= 0:
                return 0

            # Get ETH balance for gas
            eth_balance = self.get_eth_balance(address)
            if eth_balance <= 0:
                print("No ETH for gas fees")
                return 0

            # Create account from private key
            acct = self.eth_client.eth.account.from_key(priv_key_bytes)
            
            # Create contract instance
            contract = self.eth_client.eth.contract(
                address=self.eth_client.to_checksum_address(token_contract),
                abi=ERC20_ABI
            )

            # Get nonce
            nonce = self.eth_client.eth.get_transaction_count(address)
            gas_price = self.eth_client.eth.gas_price

            # Build transaction
            tx = contract.functions.transfer(
                self.eth_client.to_checksum_address(central),
                token_balance
            ).build_transaction({
                'from': self.eth_client.to_checksum_address(address),
                'nonce': nonce,
                'gasPrice': gas_price,
                'chainId': self.eth_client.eth.chain_id
            })

            # Estimate gas
            estimated_gas = self.eth_client.eth.estimate_gas(tx)
            tx['gas'] = int(estimated_gas)

            # Check if we have enough ETH for gas
            gas_cost = tx['gas'] * gas_price
            if eth_balance < gas_cost:
                print(f"Insufficient ETH for gas. Need: {gas_cost}, Have: {eth_balance}")
                return 0

            # Sign and send transaction
            signed_tx = acct.sign_transaction(tx)
            tx_hash = self.eth_client.eth.send_raw_transaction(signed_tx.raw_transaction)
            print(f"ERC20 tokens sent: {tx_hash.hex()}")
            
            return token_balance
        except Exception as e:
            print(f"Error sending ERC20 tokens: {e}")
            return 0
      
    def send_bnb_all(self, address, priv_key_bytes, central):
        balance = self.get_bnb_balance(address)
        if balance > COIN_SETTINGS['BNB']['min_send_amount']:
            acct = self.bnb_client.eth.account.from_key(priv_key_bytes)
            gas_price = self.bnb_client.eth.gas_price
            gas = 21000
            value = balance - (gas * gas_price)
            if value > 0:
                nonce = self.bnb_client.eth.get_transaction_count(address)
                tx = {
                    'nonce': nonce,
                    'to': central,
                    'value': value,
                    'gasPrice': gas_price,
                    'chainId': self.bnb_client.eth.chain_id
                }
                estimated_gas = self.bnb_client.eth.estimate_gas(tx)
                gas = int(estimated_gas)
                max_fee = gas * gas_price
                value = balance - max_fee
                if value > 0 and gas < 150000:
                  tx = {
                        'nonce': nonce,
                        'to': central,
                        'value': value,
                        'gas': gas,
                        'gasPrice': gas_price,
                        'chainId': self.bnb_client.eth.chain_id
                    }
                  print("BNBestimated_gas!!!!!!!!!!")
                  print(estimated_gas)
                  signed_tx = acct.sign_transaction(tx)
                  tx_hash = self.bnb_client.eth.send_raw_transaction(signed_tx.raw_transaction)
                  print(f"BNB sent: {tx_hash.hex()}")
                  
                  return value
        
        return 0

    def send_sol_all(self, address, priv_key_hex, central):
        balance = self.get_sol_balance(address)
        if balance > COIN_SETTINGS['SOL']['min_send_amount']:
            priv_key_bytes  = hex_to_bytes(priv_key_hex)
            keypair = Keypair.from_seed(priv_key_bytes)
            txn = Transaction(fee_payer=keypair.pubkey()).add(
                transfer(
                    TransferParams(
                        from_pubkey=keypair.pubkey(),
                        to_pubkey=Pubkey.from_string(central),
                        lamports=balance - 5000  # Approximate fee
                    )
                )
            )
            blockhash_resp = self.sol_client.get_latest_blockhash(Confirmed).value
            recent_blockhash = blockhash_resp.blockhash
            txn.recent_blockhash = recent_blockhash
            signers = [keypair]

            txn.sign(*signers)
            stx = txn.serialize()
            DEFAULT_OPTIONS = TxOpts(skip_confirmation=True, skip_preflight=True, preflight_commitment=Processed)

            try:
              result = self.sol_client.send_raw_transaction(stx, opts=DEFAULT_OPTIONS)
              print(result)

              time.sleep(27)
              signatures = txn.signatures
              resp = self.sol_client.get_signature_statuses(signatures)
              if resp.value is not None and resp.value[0] is not None:
                return balance - 5000
                print("SOL sent: "+str(resp.value))

            except Exception as e:
              print(e)

        return 0

    def send_trx_all(self, address, priv_key_bytes, central):
        PRKEYb  = hex_to_bytes(priv_key_bytes)
        priv_key = PrivateKey(PRKEYb)
        naddress = priv_key.public_key.to_base58check_address()
        balance = self.get_trx_balance(address)
        print(balance)
        print("TRX!!! " + naddress + " " + address)
        sendingamount = int(balance) - 2000000
        print(sendingamount)
        if balance > COIN_SETTINGS['TRX']['min_send_amount']:
            txn = (
                self.trx_client.trx.transfer(address, central, sendingamount)  # Leave some for fee
                .fee_limit(100 * 1000000)
                .build()
                .sign(priv_key)
            )
            result = txn.broadcast().wait()
            print(f"TRX sent: {result}")
            return sendingamount

        return 0

    def get_trc20_balance(self, address, token_contract):
        """Get TRC20 token balance for an address"""
        try:
            # Get contract instance
            contract = self.trx_client.get_contract(token_contract)
            
            # Call balanceOf function
            balance = contract.functions.balanceOf(address)
            return balance
        except Exception as e:
            print(f"Error getting TRC20 balance: {e}")
            return 0

    def get_trc20_transactions(self, address, token_contract):
        """Get TRC20 token transactions for an address using TronGrid API"""
        try:
            url = f"https://api.trongrid.io/v1/accounts/{address}/transactions/trc20"
            params = {
                'limit': 200,
                'contract_address': token_contract
            }
            headers = {'TRON-PRO-API-KEY': TRONAPIKEY} if TRONAPIKEY else {}
            
            response = requests.get(url, params=params, headers=headers)
            data = response.json()
            
            if data.get('success'):
                transactions = []
                for tx in data.get('data', []):
                    transactions.append({
                        'hash': tx.get('transaction_id'),
                        'from': tx.get('from'),
                        'to': tx.get('to'),
                        'value': tx.get('value'),
                        'timestamp': tx.get('block_timestamp'),
                        'tokenSymbol': tx.get('token_info', {}).get('symbol'),
                        'tokenDecimal': tx.get('token_info', {}).get('decimals')
                    })
                return transactions
            return []
        except Exception as e:
            print(f"Error getting TRC20 transactions: {e}")
            return []

    def send_trc20_all(self, address, priv_key_bytes, central, token_contract):
        """Send all TRC20 tokens from address to central wallet"""
        try:
            # Get private key
            PRKEYb = hex_to_bytes(priv_key_bytes)
            priv_key = PrivateKey(PRKEYb)
            
            # Get token balance
            token_balance = self.get_trc20_balance(address, token_contract)
            if token_balance <= 0:
                print("No TRC20 tokens to send")
                return 0

            # Get TRX balance for fees
            trx_balance = self.get_trx_balance(address)
            if trx_balance <= 0:
                print("No TRX for transaction fees")
                return 0

            # Get contract instance
            contract = self.trx_client.get_contract(token_contract)
            
            # Build transfer transaction
            txn = (
                contract.functions.transfer(central, token_balance)
                .with_owner(address)
                .fee_limit(100 * 1000000)  # 100 TRX fee limit
                .build()
                .sign(priv_key)
            )
            
            # Broadcast transaction
            result = txn.broadcast().wait()
            print(f"TRC20 tokens sent: {result}")
            
            return token_balance
        except Exception as e:
            print(f"Error sending TRC20 tokens: {e}")
            return 0


    
blockchain = Blockchain()



#|  5 | viktor@ankerid.com    | ZAR  |                                            | 0       |         1 | 2025-09-11 13:10:00 | 2025-09-11 13:10:00 |                                                                  |
#|  6 | viktor@ankerid.com    | BTC  | 1LcQgtQRJostRv7vHmEauGVQs9dznp7Wtq         | 0       |         1 | 2025-09-11 13:24:54 | 2025-09-11 13:24:54 | 75db4b7fb0e30ae7951802d7884e613760fa4f04764162d2a6654a79cbf41b2a |
#|  7 | bobbyjonker@yahoo.com | ZAR  |                                            | 0       |         1 | 2025-09-11 14:18:34 | 2025-09-11 14:18:34 |                                                                  |
#|  8 | bobbyjonker@yahoo.com | BTC  | 1BeJVf7eArE43qdNQB1Yrcx87QVTUXgc98         | 0       |         1 | 2025-09-11 16:56:11 | 2025-09-11 16:56:11 | a5122e4e8217af2bd8f57e0e71b3b9983ffeb139ab5ce45904efbc321e958a87 |
#|  9 | viktor@ankerid.com    | ETH  | 0xb3e02d9648cdb0750eb42106fa3482c08399db5b | 0       |         1 | 2025-09-11 17:21:48 | 2025-09-11 17:21:48 | 09dcc7d0d68feecbbf6c42c3dc1f16ffbd54cab8c78d29535207f954b6ff8bf4 |
#| 10 | bobbyjonker@yahoo.com | ETH  | 0xa568e91fc79da57c5b617144fa8c65adfef7e8cf | 0       |         1 | 2025-09-11 17:26:07 | 2025-09-11 17:26:07 | 2eac5433ae9e28e17a06b663cd3548d5ef46fa9a73ecc5423416c6699bd3c701 |
#UPDATE wallets set pending='500' where email='bobbyjonker@yahoo.com' and coin='ZAR';
#INSERT INTO transactions (email, coin, side, amount, price, status, txhash) VALUES ('bobbyjonker@yahoo.com','ZAR','Deposit','500.0','1','completed','20250920APB12Q4NCTZ000000000050000TR');

# UPDATE wallets set balance=((balance+0)+500)  where email='bobbyjonker@yahoo.com' and coin='ZAR'


#2ex.digitaleveryware.com
#50001
#50002
#Reliable, community-run.
#electrum.tjader.xyz
#-
#50002
#SSL-only.
#electrum.blockstream.info
#50001
#50002
#Run by Blockstream; high uptime.
#electrum.coinfroggy.com
#50001
#50002
#Good performance.
#blockitall.us
#50001
#50002
#US-based.
#blackie.c3-soft.com
#57001
#57002
#Non-standard ports.
#electrum.blockitall.us
#50001
#50002
#Alternative hostname.
#fulcrum2.not.fyi
#-
#51002
#SSL-only, Fulcrum impl.
#det.electrum.blockitall.us
#50001
#50002
#Detached variant.
#4vrz2q62yxlfmcntnotzdjahpqh2joirp2vrcdsayyioxthffimbp2ad.onion
#50001
#-
#Tor onion, TCP-only.
#mempool.coinfroggy.com
#50001
#50002
#Mempool-focused.
#73.116.136.143
#50001
#-
#IP-based, TCP-only.
#electrum.kampfschnitzel.at
#-
#50002
#EU-based.
#blockstream.info
#110
#700
#Non-standard ports; explorer integration.
#mknux6bpnioe64vzn3dzjre67a6e4qsyhckx6mmipdastyfo5lzva7qd.onion
#50001
#-
#Tor onion.
#fulcrum.theuplink.net
#-
#50002
#Fulcrum impl.
#static.82.9.235.167.clients.your-server.de
#50001
#50002
#DE-based.
#molten.tranquille.cc
#50001
#50002
#Community.
#b6.1209k.com
#50001
#50002
#Monitor-affiliated.
#mempool.8333.mobi
#50001
#50002
#Mempool.
#ax102.blockeng.ch
#-
#50002
#CH-based.
#yskpxenmsud5ddy2777a2koiuob7emhd4m3uoic5olyjsvvc2eymxcqd.onion
#50001
#-
#Tor onion.
#fulcrum.slicksparks.ky
#-
#50002
#Fulcrum.
#167.235.9.82
#50001
#50002
#IP-based.
#23.155.96.131
#50001
#50002
#IP-based.
#smmalis37.ddns.net
#50001
#50002
#Dynamic DNS.
#kittyserver.ddnsfree.com
#50001
#50002
#Dynamic DNS.
#168.119.136.176
#50001
#-
#IP-based, TCP-only.
#fulcrum-core.1209k.com
#50001
#50002
#Monitor-affiliated.
#static.176.136.119.168.clients.your-server.de
#50001
#-
#DE-based, TCP-only.
#fulcrumwnoak45vtxkmdewwedaujulf6xkzvqiqfon5b6i5xbhs6igad.onion
#50001
#-
#Tor onion.
#explorerzydxu5ecjrkwceayqybizmpjjznk5izmitf2modhcusuqlid.onion
#110
#-
#Tor onion, non-standard.
#bitcoin.stackwallet.com
#-
#50002
#Stack Wallet.
#hezojf7rda2c33yxgcgcvvsxflechdz5vkm64gwlszgx2r4gc5e42kqd.onion
#50001
#-
#Tor onion.
#ool-4351f012.dyn.optonline.net
#-
#50002
#Dynamic.
#b.1209k.com
#-
#50002
#Monitor.
#hippo.1209k.com
#-
#50002
#Monitor.
#clownshow.fiatfaucet.com
#-
#50002
#Fun name.
#qeqgdlw2ezf3uabook2ny3lztjxxzeyyoqw2k7cempzvqpknbmevhmyd.onion
#50001
#-
#Tor onion.
#ax101.blockeng.ch
#-
#50002
#CH-based.
#electrum.cakewallet.com
#50001
#50002

