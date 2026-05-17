import type { Client, GeneratedDocument, Notification, OrderRequest, OrderStatus, Product, Project, Supplier, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const ACCESS_TOKEN_KEY = 'proposal_management_access_token';
const REFRESH_TOKEN_KEY = 'proposal_management_refresh_token';

let accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
let refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

export function getStoredAccessToken() {
  return accessToken;
}

export function getStoredRefreshToken() {
  return refreshToken;
}

export function setSession(tokens: { accessToken: string; refreshToken?: string }) {
  accessToken = tokens.accessToken;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    refreshToken = tokens.refreshToken;
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function clearSession() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const api = {
  async login(input: { email: string; password: string }) {
    const response = await request<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: input,
        skipAuth: true,
      },
    );
    setSession(response);
    return response;
  },

  async refresh() {
    const response = await request<{ user: User; accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
    });
    setSession({ accessToken: response.accessToken });
    return response;
  },

  async logout() {
    try {
      await request<void>('/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
    }
  },

  me: () => request<{ user: User }>('/auth/me'),

  listUsers: (query: { role?: string; supplierId?: string; status?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.role) params.set('role', query.role);
    if (query.supplierId) params.set('supplierId', query.supplierId);
    if (query.status) params.set('status', query.status);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<{ users: User[] }>(`/users${suffix}`);
  },
  createUser: (input: { name: string; email: string; role: User['role']; supplierId?: string; password: string }) =>
    request<{ user: User }>('/users', { method: 'POST', body: input }),
  updateUser: (id: string, input: { name?: string; email?: string; role?: User['role']; supplierId?: string }) =>
    request<{ user: User }>(`/users/${id}`, { method: 'PATCH', body: input }),
  resetUserPassword: (id: string, password: string) =>
    request<void>(`/users/${id}/reset-password`, { method: 'POST', body: { password } }),
  deleteUser: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),

  listSuppliers: () => request<{ suppliers: Supplier[] }>('/suppliers'),
  createSupplier: (supplier: Supplier) =>
    request<{ supplier: Supplier }>('/suppliers', { method: 'POST', body: supplier }),
  updateSupplier: (supplier: Supplier) =>
    request<{ supplier: Supplier }>(`/suppliers/${supplier.id}`, {
      method: 'PATCH',
      body: supplier,
    }),
  deleteSupplier: (id: string) => request<void>(`/suppliers/${id}`, { method: 'DELETE' }),

  listClients: () => request<{ clients: Client[] }>('/clients'),
  createClient: (client: Client) =>
    request<{ client: Client }>('/clients', { method: 'POST', body: client }),
  updateClient: (client: Client) =>
    request<{ client: Client }>(`/clients/${client.id}`, {
      method: 'PATCH',
      body: client,
    }),
  deleteClient: (id: string) => request<void>(`/clients/${id}`, { method: 'DELETE' }),

  listProducts: () => request<{ products: Product[] }>('/products'),
  checkProductJanCode: (janCode: string, excludeProductId?: string) => {
    const params = new URLSearchParams({ janCode });
    if (excludeProductId) {
      params.set('excludeProductId', excludeProductId);
    }
    return request<{
      available: boolean;
      product?: { id: string; name: string; janCode: string; deleted: boolean };
    }>(`/products/jan-code-availability?${params.toString()}`);
  },
  createProduct: (product: Product) =>
    request<{ product: Product }>('/products', {
      method: 'POST',
      body: toProductPayload(product),
    }),
  updateProduct: (product: Product) =>
    request<{ product: Product }>(`/products/${product.id}`, {
      method: 'PATCH',
      body: toProductPayload(product),
    }),
  deleteProduct: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),
  uploadProductImages: (productId: string, files: File[]) =>
    uploadFiles<{ images: Product['imageAssets']; rejected: Array<{ fileName: string; code: string; message: string }> }>(
      `/products/${productId}/images`,
      'images',
      files,
    ),
  deleteProductImage: (productId: string, imageId: string) =>
    request<void>(`/products/${productId}/images/${imageId}`, { method: 'DELETE' }),
  reorderProductImages: (productId: string, imageIds: string[]) =>
    request<{ images: Product['imageAssets'] }>(`/products/${productId}/images/order`, {
      method: 'PATCH',
      body: { imageIds },
    }),
  approveProduct: (id: string) =>
    request<{ product: Product }>(`/products/${id}/approve`, { method: 'POST' }),
  rejectProduct: (id: string) =>
    request<{ product: Product }>(`/products/${id}/reject`, { method: 'POST' }),

  listProjects: () => request<{ projects: Project[] }>('/projects'),
  createProject: (project: Project) =>
    request<{ project: Project }>('/projects', {
      method: 'POST',
      body: toProjectPayload(project),
    }),
  updateProject: (project: Project) =>
    request<{ project: Project }>(`/projects/${project.id}`, {
      method: 'PATCH',
      body: toProjectPayload(project),
    }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  updateOrderStatus: (projectId: string, orderId: string, status: OrderStatus) =>
    request<{ orderRequest: OrderRequest }>(`/projects/${projectId}/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status },
    }),

  listNotifications: () => request<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) =>
    request<{ notification: Notification }>(`/notifications/${id}/read`, { method: 'POST' }),

  listProjectDocuments: (projectId: string) =>
    request<{ documents: GeneratedDocument[] }>(`/projects/${projectId}/documents`),
  generateProjectDocument: (
    projectId: string,
    documentType: 'proposal-pptx' | 'pl-xlsx',
    force = false,
  ) =>
    request<{ document: GeneratedDocument; reused: boolean }>(
      `/projects/${projectId}/documents/${documentType}`,
      {
        method: 'POST',
        body: { force },
      },
    ),

  downloadExport: (dataset: string) => downloadFile(`/exports/${dataset}.csv`),
};

function toProductPayload(product: Product) {
  return {
    name: product.name,
    description: product.description,
    modelNumber: product.modelNumber ?? '',
    features: product.features ?? [],
    categoryName: product.categoryName,
    janCode: product.janCode,
    productType: product.productType,
    cost: product.cost,
    listPrice: product.listPrice,
    minLot: product.minLot,
    leadTime: product.leadTime,
    supplierId: product.supplierId,
    status: product.status,
    remarks: product.remarks,
  };
}

function toProjectPayload(project: Project) {
  return {
    title: project.title,
    proposalBackground: project.proposalBackground ?? '',
    recommendationPoints: project.recommendationPoints ?? [],
    remarks: project.remarks ?? '',
    clientId: project.clientId,
    assignedSalesUserId: project.assignedSalesUserId ?? '',
    status: project.status,
    products: project.products.map((product) => ({
      productId: product.productId,
      proposalComment: product.proposalComment,
      recommendationReasons: product.recommendationReasons ?? [],
      cost: product.cost,
      sellingPrice: product.sellingPrice,
      quantity: product.quantity,
      displayOrder: product.displayOrder ?? 0,
      isAdopted: product.isAdopted,
      companyProductCode: product.companyProductCode,
      adoptionDate: product.adoptionDate,
      orderPlannedDate: product.orderPlannedDate,
      deliveryMethod: product.deliveryMethod,
      allowPublish: product.allowPublish ?? false,
      allowOrder: product.allowOrder ?? false,
    })),
  };
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    skipAuth?: boolean;
  } = {},
): Promise<T> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (!options.skipAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, response.status));
  }

  return data as T;
}

async function downloadFile(path: string) {
  const headers = new Headers();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(data, response.status));
  }

  const disposition = response.headers.get('Content-Disposition');
  const dataset = path.split('/').pop()?.replace(/\.csv$/, '') ?? 'export';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = getFilenameFromDisposition(disposition) ?? `${dataset}-${today}.csv`;
  const blob = await response.blob();
  return { blob, filename };
}

async function uploadFiles<T>(path: string, fieldName: string, files: File[]): Promise<T> {
  const body = new FormData();
  files.forEach((file) => body.append(fieldName, file));
  const headers = new Headers();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, response.status));
  }

  return data as T;
}

function getApiErrorMessage(data: unknown, status: number): string {
  const statusFallback: Record<number, string> = {
    400: '入力内容を確認してください。',
    401: 'ログインが必要です。',
    403: 'この操作を実行する権限がありません。',
    404: '対象データが見つかりません。',
    409: '既に登録済みのデータがあります。',
    500: 'サーバーでエラーが発生しました。',
  };
  if (typeof data === 'object' && data !== null) {
    const payload = data as {
      error?: { code?: unknown; message?: unknown; details?: unknown };
      message?: unknown;
      rejected?: Array<{ message?: unknown; code?: unknown; fileName?: unknown }>;
    };
    if (typeof payload.error?.message === 'string' && payload.error.message) {
      const detail = getValidationDetail(payload.error.details);
      const baseMessage = translateApiError(payload.error.code, payload.error.message, status);
      return detail && !baseMessage.includes(detail)
        ? `${baseMessage} (${detail})`
        : baseMessage;
    }
    const rejected = payload.rejected?.find((item) => typeof item.message === 'string');
    if (rejected?.message) {
      return typeof rejected.fileName === 'string'
        ? `${rejected.fileName}: ${translateApiError(rejected.code, String(rejected.message), status)}`
        : translateApiError(rejected.code, String(rejected.message), status);
    }
    if (typeof payload.message === 'string' && payload.message) {
      return translateApiError(undefined, payload.message, status);
    }
  }
  return statusFallback[status] ?? `リクエストに失敗しました。（ステータス: ${status}）`;
}

function translateApiError(code: unknown, message: string, status: number) {
  const codeMap: Record<string, string> = {
    FORBIDDEN: 'この操作を実行する権限がありません。',
    UNAUTHORIZED: 'ログインが必要です。',
    INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません。',
    PRODUCT_NOT_FOUND: '商品が見つかりません。',
    SUPPLIER_NOT_FOUND: 'サプライヤーが見つかりません。',
    SUPPLIER_REQUIRED: 'サプライヤーを選択してください。',
    USER_NOT_FOUND: 'ユーザーが見つかりません。',
    CANNOT_DELETE_SELF: '自分自身のユーザーは削除できません。',
    STORAGE_UNAVAILABLE: 'ストレージサービスを利用できません。',
    IMAGE_REQUIRED: '画像を1枚以上選択してください。',
    PRODUCT_IMAGE_LIMIT_EXCEEDED: '登録できる商品画像の上限を超えています。',
    UNSUPPORTED_IMAGE_TYPE: 'JPEG、PNG、WebP形式の画像を選択してください。',
    INVALID_IMAGE_FILE: '画像ファイルが破損しているか、読み込めません。',
    IMAGE_TOO_SMALL: '画像サイズが小さすぎます。300 x 300 px以上の画像を選択してください。',
    IMAGE_DIMENSIONS_TOO_LARGE: '画像サイズが大きすぎます。',
  };
  if (typeof code === 'string' && codeMap[code]) {
    return codeMap[code];
  }
  const messageMap: Array<[RegExp, string]> = [
    [/janCode already exists/i, 'JANコードは既に登録されています。'],
    [/Forbidden/i, 'この操作を実行する権限がありません。'],
    [/Unauthorized/i, 'ログインが必要です。'],
    [/Internal Server Error/i, 'サーバーでエラーが発生しました。'],
    [/Request failed with status 400/i, '入力内容を確認してください。'],
    [/Request failed with status 401/i, 'ログインが必要です。'],
    [/Request failed with status 403/i, 'この操作を実行する権限がありません。'],
    [/Request failed with status 404/i, '対象データが見つかりません。'],
    [/Request failed with status 500/i, 'サーバーでエラーが発生しました。'],
  ];
  return messageMap.find(([pattern]) => pattern.test(message))?.[1] ?? (message || `リクエストに失敗しました。（ステータス: ${status}）`);
}

function getValidationDetail(details: unknown) {
  if (typeof details !== 'object' || details === null || !('fieldErrors' in details)) {
    return '';
  }
  const fieldErrors = (details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
  const first = Object.entries(fieldErrors ?? {}).find(([, messages]) => messages?.length);
  return first ? `${first[0]}: ${first[1][0]}` : '';
}

function getFilenameFromDisposition(disposition: string | null) {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1];
}
