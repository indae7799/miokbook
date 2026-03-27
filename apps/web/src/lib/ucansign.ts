type UcanSignEnvelope<T> = {
  msg: string;
  result: T;
  code: number;
};

type UcanSignParticipantCreate = {
  name: string;
  message?: string;
  signingMethodType: 'email' | 'kakao' | 'none';
  signingContactInfo?: string;
  signingOrder: number;
};

type UcanSignTemplateCreateInput = {
  templateDocumentId: string;
  documentName: string;
  isSendMessage: boolean;
  participants: UcanSignParticipantCreate[];
  customValue?: string;
  customValue1?: string;
  customValue2?: string;
  customValue3?: string;
  customValue4?: string;
  customValue5?: string;
};

type UcanSignTemplateCreateResult = {
  documentId: string;
  name: string;
  status: string;
  participants?: Array<{
    participantId: string;
    documentId: string;
    name: string;
    roleName?: string;
    participantRole?: string;
    signingMethodType?: string;
    signingContactInfo?: string;
    signingOrder?: number;
    status?: string;
  }>;
  customValue?: string;
  customValue1?: string;
  customValue2?: string;
  customValue3?: string;
  customValue4?: string;
  customValue5?: string;
};

type UcanSignEmbeddingResult = {
  url: string;
  expiration: string;
};

const UCANSIGN_API_ROOT = 'https://app.ucansign.com/openapi';

function getApiKey(): string {
  const value = process.env.UCANSIGN_API_KEY?.trim();
  if (!value) {
    throw new Error('UCANSIGN_API_KEY is not configured');
  }
  return value;
}

async function parseEnvelope<T>(response: Response): Promise<UcanSignEnvelope<T>> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as UcanSignEnvelope<T>) : null;

  if (!response.ok || !data || data.code !== 0) {
    throw new Error(
      `UCanSign API error (${response.status}): ${data?.msg ?? response.statusText ?? 'unknown error'}`,
    );
  }

  return data;
}

export async function issueUcanSignAccessToken(): Promise<string> {
  const response = await fetch(`${UCANSIGN_API_ROOT}/user/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'miokbook/1.0',
    },
    body: JSON.stringify({
      apiKey: getApiKey(),
    }),
    cache: 'no-store',
  });

  const data = await parseEnvelope<{ accessToken: string }>(response);
  return data.result.accessToken;
}

async function ucansignFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await issueUcanSignAccessToken();
  const response = await fetch(`${UCANSIGN_API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'miokbook/1.0',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const data = await parseEnvelope<T>(response);
  return data.result;
}

export async function createUcanSignDocumentFromTemplate(input: UcanSignTemplateCreateInput) {
  return ucansignFetch<UcanSignTemplateCreateResult>(`/templates/${input.templateDocumentId}`, {
    method: 'POST',
    headers: {
      'x-ucansign-test': 'false',
    },
    body: JSON.stringify({
      documentName: input.documentName,
      processType: 'PROCEDURE',
      isSequential: true,
      isSendMessage: input.isSendMessage,
      participants: input.participants,
      customValue: input.customValue,
      customValue1: input.customValue1,
      customValue2: input.customValue2,
      customValue3: input.customValue3,
      customValue4: input.customValue4,
      customValue5: input.customValue5,
    }),
  });
}

export async function getUcanSignEmbeddingUrl(input: {
  documentId: string;
  participantId?: string | null;
  redirectUrl: string;
}) {
  return ucansignFetch<UcanSignEmbeddingResult>(`/embedding/view/${input.documentId}`, {
    method: 'POST',
    body: JSON.stringify({
      redirectUrl: input.redirectUrl,
      ...(input.participantId ? { participantId: input.participantId } : {}),
    }),
  });
}
