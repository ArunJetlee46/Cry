import { createContext, useContext, useState, useCallback } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../constants";

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [network, setNetwork] = useState(null);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install it to continue.");
      return;
    }
    try {
      const ethProvider = new BrowserProvider(window.ethereum);
      const accounts = await ethProvider.send("eth_requestAccounts", []);
      const signer = await ethProvider.getSigner();
      const net = await ethProvider.getNetwork();

      const crowdFundingContract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      setProvider(ethProvider);
      setAccount(accounts[0]);
      setNetwork(net);
      setContract(crowdFundingContract);

      // Listen for account/network changes
      window.ethereum.on("accountsChanged", (newAccounts) => {
        setAccount(newAccounts[0] || null);
        if (!newAccounts[0]) {
          setContract(null);
          setProvider(null);
        }
      });

      window.ethereum.on("chainChanged", async () => {
        // Re-initialize on network switch without a full page reload
        try {
          const updatedProvider = new BrowserProvider(window.ethereum);
          const updatedSigner = await updatedProvider.getSigner();
          const updatedNet = await updatedProvider.getNetwork();
          const updatedContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, updatedSigner);
          setProvider(updatedProvider);
          setNetwork(updatedNet);
          setContract(updatedContract);
          setError(null);
        } catch {
          setError("Network changed — please reconnect your wallet.");
          setAccount(null);
          setProvider(null);
          setContract(null);
          setNetwork(null);
        }
      });
    } catch (err) {
      setError(err.message || "Connection failed");
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setContract(null);
    setNetwork(null);
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        contract,
        network,
        error,
        connect,
        disconnect,
        formatEther,
        parseEther,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  return useContext(Web3Context);
}
