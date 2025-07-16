import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { API_URL, APP_KEYSTORE_KEYS_ENUM } from "@/constants/app";
import { Colors } from "@/constants/Colors";
import { TailwindColors } from "@/constants/TailwindColors";
import { useDarkMode } from "@/hooks/useThemeColor";
import { useAppStore } from "@/stores/app.store";
import { signMessage } from "@/utils/crypto";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Button, ScrollView, TouchableOpacity } from "react-native";
import Toast from "react-native-toast-message";
import { removeData } from "../index";

interface AuthRequest {
  id: string;
  code: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

const StatusValues: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const AuthRequestCard = ({ request }: { request: AuthRequest }) => {
  const { id, code, status, expiresAt } = request;
  const [timeLeft, setTimeLeft] = useState<string>("");

  // const fetchRequests = async () => {
  //   const signedCode = await signMessage({
  //     message: code,
  //     privateKey: authPrivateKey,
  //   });

  //   console.log(signedCode, "signedCode");
  //   axios
  //     .post(`${API_URL}/auth/login/request/accept`, {
  //       id: id,
  //       code: code,
  //       authSessionId: authSessionId,
  //       signedChallenge: signedCode,
  //     })
  //     .then((res) => {
  //       console.log(res.data, "res");
  //       Alert.alert("Solicitud aprobada");
  //     })
  //     .catch((err) => {
  //       console.log(err?.response?.data, "err");
  //     });
  // };

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const expiresAtDate = new Date(expiresAt);
      const diffMs = expiresAtDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeLeft("0");
        return;
      }

      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      setTimeLeft(`${diffMins}m ${diffSecs}s`);
    };

    // Actualizar inmediatamente
    updateTimeLeft();

    // Actualizar cada segundo
    const interval = setInterval(updateTimeLeft, 1000);

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  }, [expiresAt]);

  const isExpired = timeLeft === "0";

  const isDarkMode = useDarkMode();

  const authSessionId = useAppStore((state) => state.authSessionId);
  const authPrivateKey = useAppStore((state) => state.privateKey);

  return (
    <ThemedView
      key={id}
      style={{
        borderWidth: 1,
        borderColor: "gray",
        padding: 12,
        borderRadius: 12,
        width: "100%",
      }}
    >
      <ThemedView
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <ThemedText type="title">{code}</ThemedText>
        <ThemedText
          type="title"
          style={{
            color: isExpired
              ? TailwindColors.red[500]
              : TailwindColors.green[500],
          }}
        >
          {isExpired ? "Expirado" : StatusValues[status]}
        </ThemedText>
      </ThemedView>
      <ThemedView
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <ThemedView
          style={{
            flexDirection: "row",
            gap: 6,
            marginTop: 12,
            backgroundColor: isDarkMode ? "gray" : "gray",
            padding: 8,
            borderRadius: 12,
          }}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={isDarkMode ? Colors.dark.text : Colors.light.text}
          />
          <ThemedText type="defaultSemiBold">
            {isExpired ? "0m 00s" : timeLeft}
          </ThemedText>
        </ThemedView>
        <ThemedView
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 12,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: Colors.light.rejectButton,
              padding: 4,
              borderRadius: 4,
            }}
            onPress={async () => {}}
          >
            <ThemedText type="title" style={{ fontSize: 20 }}>
              Rechazar
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: Colors.light.confirmButton,
              padding: 4,
              borderRadius: 4,
            }}
            onPress={async () => {
              const signedCode = await signMessage({
                message: code,
                privateKey: authPrivateKey,
              });

              console.log(signedCode, "signedCode");
              axios
                .post(`${API_URL}/auth/login/request/accept`, {
                  id: id,
                  code: code,
                  authSessionId: authSessionId,
                  signedChallenge: signedCode,
                })
                .then((res) => {
                  console.log(res.data, "res");
                  Toast.show({
                    type: "success",
                    text1: "Solicitud aprobada",
                    visibilityTime: 3000,
                  });
                })
                .catch((err) => {
                  console.log(err?.response?.data, "err");
                });
            }}
          >
            {/* <Button title="Aprobar" color={Colors.light.confirmButton} /> */}
            <ThemedText type="title" style={{ fontSize: 20 }}>
              Aprobar
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

export default function Dashboard() {
  const authSessionId = useAppStore((state) => state.authSessionId);
  const authPrivateKey = useAppStore((state) => state.privateKey);
  const authPublicKey = useAppStore((state) => state.publicKey);
  const setAuthSessionId = useAppStore((state) => state.setAuthSessionId);
  const setIsLoggedIn = useAppStore((state) => state.setIsLoggedIn);
  const setPublicKey = useAppStore((state) => state.setPublicKey);
  const setPrivateKey = useAppStore((state) => state.setPrivateKey);

  const [authRequests, setAuthRequests] = useState<AuthRequest[]>([]);

  const [isUnlinked, setIsUnlinked] = useState(false);

  const getAuthData = async () => {
    console.log("fetching auth data");
    try {
      const response = await axios.get(
        `${API_URL}/auth/login/requests/${authSessionId}/${authPublicKey}`
      );
      const data = response.data;
      console.log(data, "data");

      if (data?.unlinked && data?.isLinked === false) {
        Toast.show({
          type: "error",
          text1: "El dispositivo fue desvinculado",
          autoHide: false,
        });
        await removeData(APP_KEYSTORE_KEYS_ENUM.USER_SECURITY_DATA_KEYS);
        setAuthSessionId("");
        setIsLoggedIn(false);
        setPublicKey("");
        setPrivateKey("");
        setIsUnlinked(true);
        return;
      }

      setAuthRequests(data);
    } catch (error) {
      console.log(error, "error");
    }
  };

  useEffect(() => {
    getAuthData();
  }, []);

  const validAuthRequests = useMemo(() => {
    return authRequests
      .filter(
        (request) =>
          request.status === "pending" &&
          new Date(request.expiresAt) > new Date()
      )
      .sort(
        (a, b) =>
          new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
      );
  }, [authRequests]);

  if (isUnlinked) {
    console.log("redirecting to home");
    return <Redirect href="/" />;
  }

  return (
    <ThemedView style={{ padding: 16, flex: 1 }}>
      <ThemedView>
        <ThemedText type="title">
          Lista de solicitudes de autenticación
        </ThemedText>
        <Button
          title="Recargar"
          onPress={() => {
            getAuthData();
          }}
        />
      </ThemedView>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 10, paddingBottom: 50, marginTop: 10 }}
      >
        {validAuthRequests.map((request) => (
          <AuthRequestCard key={request.id} request={request} />
        ))}
      </ScrollView>
    </ThemedView>
  );
}
