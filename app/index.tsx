import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { API_URL, APP_KEYSTORE_KEYS_ENUM } from "@/constants/app";
import { useAppStore } from "@/stores/app.store";
import { getSyncDataFromQR, QRSyncData } from "@/utils/auth";
import { generateEthereumKeyPair, signMessage } from "@/utils/crypto";
import axios, { AxiosError } from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Button, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";

async function save(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, {
    requireAuthentication: true,
  });
}

function saveNoAsync(key: string, value: string) {
  SecureStore.setItem(key, value, {
    requireAuthentication: true,
  });
}

async function getValueFor(key: string) {
  let result = await SecureStore.getItemAsync(key, {
    authenticationPrompt: "Authentication required",
    requireAuthentication: true,
  });

  return result || null;
}

export const isDataSaved = async (key: string) => {
  const value = await getValueFor(key);
  return value !== null;
};

export const removeData = async (key: string) => {
  await SecureStore.deleteItemAsync(key, {
    requireAuthentication: true,
  });
};

const facing = "back";

export default function Index() {
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [scanned, setScanned] = useState<boolean>(false);
  const [scannedData, setScannedData] = useState<QRSyncData | null>(null);

  const authPrivateKey = useAppStore((state) => state.privateKey);
  const authSessionId = useAppStore((state) => state.authSessionId);
  const authPublicKey = useAppStore((state) => state.publicKey);
  const isKeysSaved = useAppStore((state) => state.isKeysSaved);
  const setAuthPrivateKey = useAppStore((state) => state.setPrivateKey);
  const setAuthPublicKey = useAppStore((state) => state.setPublicKey);
  const setAuthSessionId = useAppStore((state) => state.setAuthSessionId);

  const [permission, requestPermission] = useCameraPermissions();

  const [keys, setKeys] = useState({
    publicKey: "",
    privateKey: "",
  });

  useEffect(() => {
    if (!setAuthPrivateKey || !setAuthSessionId || !setAuthPublicKey) return;

    getValueFor(APP_KEYSTORE_KEYS_ENUM.USER_SECURITY_DATA_KEYS).then(
      (value) => {
        if (!value) return;

        console.log(value, "keys");

        const parsedKeys = JSON.parse(value);

        if (parsedKeys.authSessionId) {
          setAuthPrivateKey(parsedKeys.privateKey);
          setAuthSessionId(parsedKeys.authSessionId);
          setAuthPublicKey(parsedKeys.publicKey);
        } else {
          setKeys((prev) => {
            return {
              ...prev,
              publicKey: parsedKeys.publicKey,
              privateKey: parsedKeys.privateKey,
            };
          });
        }
      }
    );
  }, [setAuthPrivateKey, setAuthSessionId, setAuthPublicKey]);

  const keysLoaded = useMemo(() => {
    return keys.publicKey.length > 0 && keys.privateKey.length > 0;
  }, [keys]);

  const [keysLoading, setKeysLoading] = useState(false);
  const [auxKeys, setAuxKeys] = useState({
    publicKey: "",
    privateKey: "",
  });
  const [keysGenerationTriggered, setKeysGenerationTriggered] = useState(false);

  useEffect(() => {
    const auxKeysLoaded =
      keys?.privateKey?.length > 0 && keys?.publicKey?.length > 0;

    if (auxKeysLoaded && keysGenerationTriggered) {
      const stringifiedKeys = JSON.stringify(keys);
      save(
        APP_KEYSTORE_KEYS_ENUM.USER_SECURITY_DATA_KEYS,
        stringifiedKeys
      ).catch((e) => {
        Toast.show({
          type: "error",
          text1: "Error al guardar las llaves",
        });
        console.log(e, "error");
        setKeys({
          publicKey: "",
          privateKey: "",
        });
      });
    }
  }, [keysGenerationTriggered, keys]);

  useEffect(() => {
    if (keysLoading && !keysLoaded) {
      setTimeout(() => {
        generateEthereumKeyPair()
          .then((keys) => {
            setKeys({
              publicKey: keys.publicKey.toString(),
              privateKey: keys.privateKey.toString(),
            });
            setAuxKeys({
              publicKey: keys.publicKey.toString(),
              privateKey: keys.privateKey.toString(),
            });
          })
          .catch((error) => {
            console.log(error, "error");
          })
          .finally(() => {
            setKeysLoading(false);
            console.log("Keys generated");
          });
      }, 1000);
    }
  }, [keysLoading, keysLoaded]);

  const [auxLinkData, setAuxLinkData] = useState<{
    publicKey: string;
    privateKey: string;
    authSessionId: string;
  } | null>(null);

  const linkDevice = async () => {
    if (!scannedData?.challenge) {
      console.log("No challenge found");
      return;
    }

    console.log(scannedData?.challenge, "challenge");
    const signedChallenge = await signMessage({
      message: scannedData?.challenge || "",
      privateKey: keys.privateKey,
    });

    console.log(signedChallenge, "signedChallenge");

    axios
      .post(`${API_URL}/auth/linking/verify`, {
        linkingCode: scannedData?.code,
        walletAddress: keys.publicKey,
        signedChallenge,
        deviceInfo: JSON.stringify({
          deviceId: "1234567890",
          deviceName: "Device Name",
          deviceType: "Device Type",
          deviceModel: "Device Model",
          deviceManufacturer: "Device Manufacturer",
          deviceVersion: "Device Version",
          devicePlatform: "Device Platform",
        }),
      })
      .then((res) => {
        const data = res.data;
        console.log(data, "data");
        const linkingId = data?.id;
        if (linkingId) {
          const newAuthData = {
            ...keys,
            authSessionId: linkingId,
          };
          console.log(newAuthData, "newAuthData");
          try {
            saveNoAsync(
              APP_KEYSTORE_KEYS_ENUM.USER_SECURITY_DATA_KEYS,
              JSON.stringify(newAuthData)
            );
          } catch (e) {
            console.log(e, "error");
            Toast.show({
              type: "error",
              text1: "Error al guardar las llaves en el dispositivo",
            });
            setAuxLinkData(newAuthData);
          }
          console.log("saved");

          setAuthPrivateKey(newAuthData.privateKey);
          setAuthSessionId(newAuthData.authSessionId);
          setAuthPublicKey(newAuthData.publicKey);
          console.log("set");
          Toast.show({
            type: "success",
            text1: "Dispositivo vinculado correctamente",
          });
        }
      })
      .catch((err: AxiosError) => {
        console.log(err.response?.data, "err");
        Toast.show({
          type: "error",
          text1: "Error al vincular el dispositivo",
        });
        setScanned(false);
        setScannedData(null);
      });
  };

  useEffect(() => {
    if (scanned && scannedData) {
      linkDevice();
    }
  }, [scanned, scannedData]);

  useEffect(() => {
    if (permission?.granted) {
      setShowCamera(true);
    }
  }, [permission]);

  const auxKeysLoaded = useMemo(() => {
    return auxKeys.publicKey.length > 0 && auxKeys.privateKey.length > 0;
  }, [auxKeys]);

  if (authSessionId && authPrivateKey && authPublicKey) {
    return <Redirect href="/dashboard" />;
  }

  if (keysLoading) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ThemedText type="title">Generando llaves...</ThemedText>
        <ActivityIndicator size="large" color="#0000ff" />
      </ThemedView>
    );
  }

  if (!keysLoaded) {
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        {auxKeysLoaded ? (
          <Fragment>
            <ThemedText type="title">
              Debe permitir la operación de almacenar las keys en el dispositivo
              utilizando su metodo de autenticación biometrico.
            </ThemedText>
            <View style={{ marginTop: 16 }}>
              <Button
                title="Almacenar llaves en dispositivo"
                onPress={() => {
                  const stringifiedKeys = JSON.stringify(auxKeys);
                  save(
                    APP_KEYSTORE_KEYS_ENUM.USER_SECURITY_DATA_KEYS,
                    stringifiedKeys
                  )
                    .then(() => {
                      setKeys(auxKeys);
                    })
                    .catch((e) => {
                      console.log(e, "error");
                      Toast.show({
                        type: "error",
                        text1: "Error al guardar las llaves",
                      });
                    });
                }}
              />
            </View>
          </Fragment>
        ) : (
          <Fragment>
            <ThemedText type="subtitle">
              Debe generar una llave RSA para poder vincular su dispositivo
            </ThemedText>
            <Button
              title="Generate RSA Key Pair"
              onPress={() => {
                console.log("Generating keys...");
                setKeysLoading(true);
                setKeysGenerationTriggered(true);
              }}
            />
          </Fragment>
        )}
      </ThemedView>
    );
  }

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">
          Necesitamos tus permisos para mostrar la cámara
        </ThemedText>
        <View style={{ marginTop: 16 }}>
          <Button onPress={requestPermission} title="Conceder permisos" />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
      }}
    >
      {/* <Button
        title="Remove Keys"
        onPress={() => {
          removeData(APP_KEYSTORE_KEYS_ENUM.USER_SECURITY_DATA_KEYS);
        }}
      /> */}
      {showCamera && !scanned ? (
        <ThemedText type="title">
          Escanea el QR para vincular tu dispositivo
        </ThemedText>
      ) : (
        <ThemedText type="title">
          Debe vincular su dispositivo a una cuenta
        </ThemedText>
      )}

      {scanned && scannedData ? (
        <View>
          <ThemedView
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ThemedText type="title">Vinculando dispositivo...</ThemedText>
            <ActivityIndicator size="large" color="#0000ff" />
          </ThemedView>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            width: "100%",
            justifyContent: "center",
            gap: 16,
            marginTop: 12,
          }}
        >
          {showCamera ? (
            <CameraView
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={async (event) => {
                if (scanned) return;

                const syncData = getSyncDataFromQR(event.data || "");

                if (!syncData) return;

                setScannedData(syncData);
                setScanned(true);
              }}
              facing={facing}
              style={StyleSheet.absoluteFillObject}
            />
          ) : (
            <Button title="Escanear QR" onPress={() => setShowCamera(true)} />
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
});
