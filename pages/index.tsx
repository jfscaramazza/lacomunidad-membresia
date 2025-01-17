import {
  Box,
  Center,
  Container,
  Text,
  Heading,
  Button,
  Link,
} from "@chakra-ui/react";
import { useWeb3React } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import Head from "next/head";
import React, { useCallback, useState } from "react";
import { ThirdwebSDK } from "@3rdweb/sdk";

// Polygon only
const injectedConnector = new InjectedConnector({ supportedChainIds: [137] });

const MEMBERSHIP_NFT_CONTRACT_ADDRESS =
  "0x8b0A0b7Ba195E37065fc28436875877FDa0b1A15";
const MEMBERSHIP_NFT_TOKEN_ID = "0";
const MEMBERSHIP_NFT_TOKEN_COUNT = 1;
const OPENSEA_LINK =
  "https://opensea.io/assets/matic/0x8b0A0b7Ba195E37065fc28436875877FDa0b1A15/0";

/**
 * A React hook that can be used to determine membership status of the connected wallet
 * @returns true, if connected wallet owns the NFT.
 */
const useWalletMembershipAccess = () => {
  const [access, setAccess] = useState(false);
  const { account, library } = useWeb3React();

  async function checkWalletMembership() {
    // get the connected wallet as a signer
    const signer = library.getSigner(account);

    /*
      Our SDK takes in a valid Signer or Provider.
      A signer can perform READ and WRITE calls on the blockchain.
      A provider can only perform READ calls on the blockchain.
      Read more: https://docs.ethers.io/v5/api/signer
      */
    const module = new ThirdwebSDK(signer).getCollectionModule(
      MEMBERSHIP_NFT_CONTRACT_ADDRESS
    );

    // check connceted wallet balance of the token
    const balance = await module.balance(MEMBERSHIP_NFT_TOKEN_ID);
    if (balance.toNumber() >= MEMBERSHIP_NFT_TOKEN_COUNT) {
      return true;
    } else {
      return false;
    }
  }

  if (library && account) {
    // Check wallet for membership nft then update the state.
    checkWalletMembership().then(setAccess);
  } else {
    // Reset access state if account is disconnected.
    if (access) {
      setAccess(false);
    }
  }

  return access;
};

const Home: NextPage = () => {
  const router = useRouter();
  const { account, library, activate } = useWeb3React();
  const hasMembershipAccess = useWalletMembershipAccess();

  /* This method uses server-side to validate that the wallet has the required NFT. */
  const enterMemberLounge = useCallback(async () => {
    if (library && account) {
      // Note: request for nonce (one-time use code) to prevent signature reply attack
      const reqAccess = await fetch("/api/request_access");
      const reqAccessResp = await reqAccess.json();

      // Get the connected wallet Signer
      const signer = library.getSigner(account);
      // Signature is used to authenticate the wallet address on the server-side.
      const signature = await signer.signMessage(
        `I want to enter the lounge. one-time access code: ${reqAccessResp.nonce}`
      );

      // Redirect to the lounge page with signature, so that the server side can recover
      // the wallet address who signed the message, then check the balance of the
      // Membership NFT of that wallet to determine if wallet can access the gated content.
      router.push(`/lounge?signature=${signature}`);
    }
  }, [router, library, account]);

  return (
    <Container>
      <Head>
        <title>thirdweb membership gated content</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/*  */}
      <Center flexDirection="column">
        <Heading>Member Only Lounge</Heading>
        <Text>
          You need to own Membership NFT in order to get access to the lounge
          webpage.
        </Text>

        <Text mt={4} textAlign="center">
          You need to have at least{" "}
          <Text fontWeight="bold" as="span">
            {MEMBERSHIP_NFT_TOKEN_COUNT}{" "}
          </Text>
          <Text as="span">of token id </Text>
          <Text fontWeight="bold" as="span">
            {MEMBERSHIP_NFT_TOKEN_ID}{" "}
          </Text>
          <Text as="span">from NFT address </Text>
          <Text fontWeight="bold" as="span">
            {MEMBERSHIP_NFT_CONTRACT_ADDRESS}{" "}
          </Text>
        </Text>

        <Link mt={4} href={OPENSEA_LINK} color="blue" isExternal>
          View NFT on OpenSea
        </Link>
      </Center>

      {/* Setup wallet connect button and enter lounge button if wallet is connected.  */}
      <Box mt={20} textAlign="center">
        {account ? (
          <>
            <Text>Wallet: {account}</Text>
            <Text mt={4}>
              Do you have access to the member only lounge?{" "}
              <Button onClick={() => enterMemberLounge()}>
                Attempt to Enter Private Lounge
              </Button>
            </Text>
          </>
        ) : (
          <Button onClick={() => activate(injectedConnector)}>
            Connect Wallet (Polygon only)
          </Button>
        )}
      </Box>

      {/* This method uses client-side to conditionally display information based off
          membership nft in the connected wallet */}
      {hasMembershipAccess ? (
        <Center mt={8}>
          <Text textAlign="center">
            Only member can see this: heres the member only private discord
            invite link{" "}
            <Link color="blue" href="https://discord.gg/thirdweb" isExternal>
              https://discord.gg/thirdweb
            </Link>
          </Text>
        </Center>
      ) : null}

      {router.query.denied ? (
        <Text color="red" textAlign="center" mt={8}>
          Access Denied{" "}
        </Text>
      ) : null}
    </Container>
  );
};

export default Home;
