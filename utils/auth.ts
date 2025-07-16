export interface QRSyncData {
  code: string;
  challenge: string;
}

export const getSyncDataFromQR = (qrString: string): QRSyncData | null => {
  if (!qrString) return null;

  const data = qrString.split(";");

  if (!data || data.length < 2) return null;

  const codeString = data[0];

  if (!codeString || codeString.length < 10) return null;

  const code = codeString.split(":").pop();

  if (!code) return null;

  const challengeString = data[1];

  if (!challengeString || challengeString.length < 10) return null;

  const challenge = challengeString.split(":").pop();

  if (!code || !challenge) return null;

  return { code, challenge };
};
