// Import the crypto getRandomValues shim (**BEFORE** the shims)
import "react-native-get-random-values";

// Import the the ethers shims (**BEFORE** ethers)
import "@ethersproject/shims";

// Import the ethers library
import { ethers } from "ethers";

interface EthereumWalletData {
  privateKey: string;
  address: string;
}

export const generateEthereumKeyPair = async () => {
  const wallet = ethers.Wallet.createRandom();

  const walletData: EthereumWalletData = {
    privateKey: wallet.privateKey,
    address: wallet.address,
  };

  return {
    publicKey: walletData.address,
    privateKey: walletData.privateKey,
  };
};

export const signMessage = async ({
  message,
  privateKey,
}: {
  message: string;
  privateKey: string;
}) => {
  const wallet = new ethers.Wallet(privateKey);

  const signature = await wallet.signMessage(message);

  return signature;
};
