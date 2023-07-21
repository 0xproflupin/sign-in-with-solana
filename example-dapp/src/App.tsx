import React, { useState, useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useWallet, useConnection, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { Adapter } from '@solana/wallet-adapter-base';
import { type SolanaSignInInput } from '@solana/wallet-standard-features';
import { verifySignIn } from '@solana/wallet-standard-util';

import {
  createAddressLookupTable,
  createSignInData,
  createSignInErrorData,
  createTransferTransaction,
  createTransferTransactionV0,
  extendAddressLookupTable,
  pollSignatureStatus,
  signAllTransactions,
  signAndSendTransaction,
  signAndSendTransactionV0WithLookupTable,
  signMessage,
  signIn,
  signTransaction,
} from './utils';

import { TLog } from './types';

import { Logs, Sidebar, AutoConnectProvider } from './components';

// =============================================================================
// Styled Components
// =============================================================================

const StyledApp = styled.div`
  display: flex;
  flex-direction: row;
  height: 100vh;
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

// =============================================================================
// Constants
// =============================================================================

const message = 'To avoid digital dognappers, sign below to authenticate with CryptoCorgis.';

// =============================================================================
// Typedefs
// =============================================================================

export type ConnectedMethods =
  | {
    name: string;
    onClick: () => Promise<string>;
  }
  | {
    name: string;
    onClick: () => Promise<void>;
  };


const StatelessApp = () => {
  const { wallet, publicKey, connect, disconnect, signMessage: signMsg, signIn: siws, signTransaction: signTx, signAllTransactions: signAllTx, sendTransaction: sendTx } = useWallet();
  const { connection } = useConnection();
  const [logs, setLogs] = useState<TLog[]>([]);

  const createLog = useCallback(
    (log: TLog) => {
      return setLogs((logs) => [...logs, log]);
    },
    [setLogs]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, [setLogs]);

  useEffect(() => {
    if (!publicKey || !wallet) return;

    createLog({
      status: 'success',
      method: 'connect',
      message: `Connected to account ${publicKey.toBase58()}`,
    });
  }, [createLog, publicKey, wallet]);

  /** SignAndSendTransaction */
  const handleSignAndSendTransaction = useCallback(async () => {
    if (!publicKey || !wallet) return;

    try {
      const transaction = await createTransferTransaction(publicKey, connection);
      createLog({
        status: 'info',
        method: 'signAndSendTransaction',
        message: `Requesting signature for: ${JSON.stringify(transaction)}`,
      });
      const signature = await signAndSendTransaction(transaction, connection, sendTx);
      createLog({
        status: 'info',
        method: 'signAndSendTransaction',
        message: `Signed and submitted transaction ${signature}.`,
      });
      pollSignatureStatus(signature, connection, createLog);
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signAndSendTransaction',
        message: error.message,
      });
    }
  }, [connection, createLog, publicKey, sendTx, wallet]);

  /** SignAndSendTransactionV0 */
  const handleSignAndSendTransactionV0 = useCallback(async () => {
    if (!publicKey || !wallet) return;

    try {
      const transactionV0 = await createTransferTransactionV0(publicKey, connection);
      createLog({
        status: 'info',
        method: 'signAndSendTransactionV0',
        message: `Requesting signature for: ${JSON.stringify(transactionV0)}`,
      });
      const signature = await signAndSendTransaction(transactionV0, connection, sendTx);
      createLog({
        status: 'info',
        method: 'signAndSendTransactionV0',
        message: `Signed and submitted transactionV0 ${signature}.`,
      });
      pollSignatureStatus(signature, connection, createLog);
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signAndSendTransactionV0',
        message: error.message,
      });
    }
  }, [connection, createLog, publicKey, sendTx, wallet]);

  /** SignAndSendTransactionV0WithLookupTable */
  const handleSignAndSendTransactionV0WithLookupTable = useCallback(async () => {
    if (!publicKey || !wallet) return;
    try {
      const [lookupSignature, lookupTableAddress] = await createAddressLookupTable(
        publicKey,
        connection,
        sendTx,
        await connection.getLatestBlockhash().then((res) => res.blockhash)
      );
      createLog({
        status: 'info',
        method: 'signAndSendTransactionV0WithLookupTable',
        message: `Signed and submitted transactionV0 to make an Address Lookup Table ${lookupTableAddress} with signature: ${lookupSignature}. Please wait for 5-7 seconds after signing the next transaction to be able to see the next transaction popup. This time is needed as newly appended addresses require one slot to warmup before being available to transactions for lookups.`,
      });
      pollSignatureStatus(lookupSignature, connection, createLog);
      const extensionSignature = await extendAddressLookupTable(
        publicKey,
        connection,
        await connection.getLatestBlockhash().then((res) => res.blockhash),
        lookupTableAddress,
        sendTx
      );
      createLog({
        status: 'info',
        method: 'signAndSendTransactionV0WithLookupTable',
        message: `Signed and submitted transactionV0 to extend Address Lookup Table ${extensionSignature}.`,
      });
      pollSignatureStatus(extensionSignature, connection, createLog);
      const signature = await signAndSendTransactionV0WithLookupTable(
        publicKey,
        connection,
        await connection.getLatestBlockhash().then((res) => res.blockhash),
        lookupTableAddress,
        sendTx
      );
      createLog({
        status: 'info',
        method: 'signAndSendTransactionV0WithLookupTable',
        message: `Signed and submitted transactionV0 with Address Lookup Table ${signature}.`,
      });
      pollSignatureStatus(signature, connection, createLog);
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signAndSendTransactionV0WithLookupTable',
        message: error.message,
      });
    }
  }, [connection, createLog, publicKey, sendTx, wallet]);

  /** SignTransaction */
  const handleSignTransaction = useCallback(async () => {
    if (!publicKey || !wallet) return;

    try {
      const transaction = await createTransferTransaction(publicKey, connection);
      createLog({
        status: 'info',
        method: 'signTransaction',
        message: `Requesting signature for: ${JSON.stringify(transaction)}`,
      });
      const signedTransaction = await signTransaction(transaction, signTx);
      createLog({
        status: 'success',
        method: 'signTransaction',
        message: `Transaction signed: ${JSON.stringify(signedTransaction)}`,
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signTransaction',
        message: error.message,
      });
    }
  }, [connection, createLog, publicKey, signTx, wallet]);

  /** SignAllTransactions */
  const handleSignAllTransactions = useCallback(async () => {
    if (!publicKey || !wallet) return;

    try {
      const transactions = [
        await createTransferTransaction(publicKey, connection),
        await createTransferTransaction(publicKey, connection),
      ];
      createLog({
        status: 'info',
        method: 'signAllTransactions',
        message: `Requesting signature for: ${JSON.stringify(transactions)}`,
      });
      const signedTransactions = await signAllTransactions(transactions[0], transactions[1], signAllTx);
      createLog({
        status: 'success',
        method: 'signAllTransactions',
        message: `Transactions signed: ${JSON.stringify(signedTransactions)}`,
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signAllTransactions',
        message: error.message,
      });
    }
  }, [connection, createLog, publicKey, signAllTx, wallet]);

  /** SignMessage */
  const handleSignMessage = useCallback(async () => {
    if (!publicKey || !wallet) return;

    try {
      const signedMessage = await signMessage(message, signMsg);
      createLog({
        status: 'success',
        method: 'signMessage',
        message: `Message signed: ${JSON.stringify(signedMessage)}`,
      });
      return signedMessage;
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signMessage',
        message: error.message,
      });
    }
  }, [createLog, publicKey, signMsg, wallet]);

  /** SignIn */
  const handleSignIn = useCallback(async () => {
    if (!publicKey || !wallet) return;
    const signInData = await createSignInData();

    try {
      const {account, signedMessage, signature} = await signIn(signInData, siws);
      const message = new TextDecoder().decode(signedMessage);
      createLog({
        status: 'success',
        method: 'signIn',
        message: `Message signed: ${message} by ${account.address} with signature ${signature}`,
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signIn',
        message: error.message,
      });
    }
  }, [createLog, publicKey, siws, wallet]);

  /** SignInError */
  const handleSignInError = useCallback(async () => {
    if (!publicKey || !wallet) return;
    const signInData = await createSignInErrorData();

    try {
      const {account, signedMessage, signature} = await signIn(signInData, siws);
      createLog({
        status: 'success',
        method: 'signMessage',
        message: `Message signed: ${JSON.stringify(signedMessage)} by ${account.address} with signature ${signature}`,
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'signIn',
        message: error.message,
      });
    }
  }, [createLog, publicKey, siws, wallet]);

  /** Connect */
  const handleConnect = useCallback(async () => {
    if (!publicKey || !wallet) return;

    try {
      await connect();
    } catch (error) {
      createLog({
        status: 'error',
        method: 'connect',
        message: error.message,
      });
    }
  }, [connect, createLog, publicKey, wallet]);

  /** Disconnect */
  const handleDisconnect = useCallback(async () => {
    if (!publicKey || !wallet) return;

    try {
      await disconnect();
      createLog({
        status: 'warning',
        method: 'disconnect',
        message: '👋',
      });
    } catch (error) {
      createLog({
        status: 'error',
        method: 'disconnect',
        message: error.message,
      });
    }
  }, [createLog, disconnect, publicKey, wallet]);

  const connectedMethods = useMemo(() => {
    return [
      {
        name: 'Sign and Send Transaction (Legacy)',
        onClick: handleSignAndSendTransaction,
      },
      {
        name: 'Sign and Send Transaction (v0)',
        onClick: handleSignAndSendTransactionV0,
      },
      {
        name: 'Sign and Send Transaction (v0 + Lookup table)',
        onClick: handleSignAndSendTransactionV0WithLookupTable,
      },
      {
        name: 'Sign Transaction',
        onClick: handleSignTransaction,
      },
      {
        name: 'Sign All Transactions',
        onClick: handleSignAllTransactions,
      },
      {
        name: 'Sign Message',
        onClick: handleSignMessage,
      },
      {
        name: 'Sign In',
        onClick: handleSignIn,
      },
      {
        name: 'Sign In Error',
        onClick: handleSignInError,
      },
      {
        name: 'Disconnect',
        onClick: handleDisconnect,
      },
    ];
  }, [
    handleSignAndSendTransaction,
    handleSignAndSendTransactionV0,
    handleSignAndSendTransactionV0WithLookupTable,
    handleSignTransaction,
    handleSignAllTransactions,
    handleSignMessage,
    handleSignIn,
    handleSignInError,
    handleDisconnect,
  ]);

  return (
    <StyledApp>
      <Sidebar publicKey={publicKey} connectedMethods={connectedMethods} connect={handleConnect} />
      <Logs publicKey={publicKey} logs={logs} clearLogs={clearLogs} />
    </StyledApp>
  );
};

// =============================================================================
// Main Component
// =============================================================================
const App = () => {
  const network = WalletAdapterNetwork.Mainnet;

  const endpoint = `https://rpc-devnet.helius.xyz/?api-key=${process.env.REACT_APP_HELIUS_API}`;

  const wallets = useMemo(
    () => [], // confirmed also with `() => []` for wallet-standard only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  const autoSignIn = useCallback(async (adapter: Adapter) => {
    if (!('signIn' in adapter)) return true;

    const input: SolanaSignInInput = await createSignInData();
    const output = await adapter.signIn(input);

    if (!verifySignIn(input, output)) throw new Error('Sign In verification failed!');

    return false;
}, []);

  return (
    <AutoConnectProvider>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={autoSignIn}>
          <WalletModalProvider>
            <StatelessApp />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </AutoConnectProvider>
  );
};

export default App;
