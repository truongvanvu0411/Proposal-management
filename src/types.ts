export enum UserRole {
  SUPPLIER = 'SUPPLIER',
  PRODUCT_MANAGER = 'PRODUCT_MANAGER',
  SALES = 'SALES',
  ADMIN = 'ADMIN',
}

export enum ProductStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL', // 追加
  ACTIVE = 'ACTIVE',
  ADOPTED = 'ADOPTED',
  INACTIVE = 'INACTIVE',
  CANCELLED = 'CANCELLED',
}

export enum AdoptionStatus {
  PROPOSED = 'PROPOSED',
  ADOPTED = 'ADOPTED',
  REJECTED = 'REJECTED',
}

export enum OrderStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  SHIPPED = 'SHIPPED',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProductType {
  DIRECT = 'DIRECT', // 直送
  WAREHOUSE = 'WAREHOUSE', // 倉庫納品
}

export enum ProjectProductDeliveryMethod {
  WAREHOUSE = 'WAREHOUSE',
  DIRECT = 'DIRECT',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  PROPOSED = 'PROPOSED',
  ADOPTED = 'ADOPTED',
  REJECTED = 'REJECTED',
}

export interface ProjectProduct {
  productId: string;
  proposalComment: string;
  recommendationReasons?: RecommendationReason[];
  cost: number;
  sellingPrice: number;
  quantity: number;
  displayOrder?: number;
  isAdopted: boolean;
  companyProductCode?: string;
  adoptionDate?: string;
  orderPlannedDate?: string;
  deliveryMethod?: ProjectProductDeliveryMethod;
  allowPublish?: boolean;
  allowOrder?: boolean;
  orderStatus?: OrderStatus;
}

export interface RecommendationReason {
  title: string;
  detail: string;
}

export interface OrderRequest {
  id: string;
  projectId: string; // 追加
  productId: string;
  productName: string;
  supplierId: string;
  quantity: number;
  deliveryDate: string;
  deliveryLocation: string;
  status: OrderStatus;
  orderType: 'NEW' | 'ADDITIONAL';
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  assignedSalesUserId?: string;
  assignedSalesUserName?: string;
  status: ProjectStatus;
  proposalBackground?: string;
  recommendationPoints?: string[];
  remarks?: string;
  products: ProjectProduct[];
  orderRequests?: OrderRequest[]; // 追加
  totalRevenue: number;
  totalProfit: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  supplierId?: string;
  supplierName?: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'ORDER_REQUESTED' | 'ORDER_SHIPPED' | 'ORDER_RECEIVED' | string;
  projectId?: string;
  orderId?: string;
  productId?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  address?: string;
  phone?: string;
}

export interface Client {
  id: string;
  name: string;
  contactName: string;
  email: string;
  address?: string;
  phone?: string;
}

export interface ProductVersion {
  version: number;
  name?: string;
  categoryName?: string;
  janCode?: string;
  modelNumber?: string;
  features?: string[];
  cost: number;
  listPrice: number;
  minLot?: number;
  leadTime?: string;
  description: string;
  updatedBy?: string;
  createdAt: string;
}

export interface ProductFieldDiff {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface ProductImageDiff {
  type: 'ADD' | 'DELETE' | 'REORDER';
  label: string;
  imageId?: string;
  fileId?: string;
  sortOrder?: number;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  previousOrder?: string[];
  nextOrder?: string[];
}

export interface ProductPendingChange {
  id: string;
  productId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  targetVersion: number;
  requestedById?: string;
  requestedByName?: string;
  createdAt: string;
  changedFields: string[];
  fieldDiffs: ProductFieldDiff[];
  imageDiffs: ProductImageDiff[];
  hasDiff: boolean;
  legacy?: boolean;
  currentVersion: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  modelNumber?: string;
  features?: string[];
  categoryId: string;
  categoryName: string;
  janCode: string;
  productType: ProductType;
  cost: number;
  listPrice: number; // 参考上代
  minLot: number;
  leadTime: string;
  supplierId: string;
  supplierName: string;
  status: ProductStatus;
  images: string[];
  imageAssets?: ProductImageAsset[];
  attachments: string[];
  createdAt: string;
  version: number; // 追加
  versions?: ProductVersion[]; // 追加
  pendingChange?: ProductPendingChange;
  remarks?: string;
}

export interface Proposal {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  productIds: string[];
  comments: Record<string, string>; // productId -> comment
  status: string;
  createdAt: string;
}

export interface ProfitAndLoss {
  id: string;
  projectId: string;
  cost: number;
  sellingPrice: number;
  quantity: number;
  shippingFee: number;
  processingFee: number;
  otherFee: number;
  revenue: number;
  grossProfit: number;
  grossProfitMargin: number;
}

export interface ChangeRequest {
  id: string;
  type: 'COST_CHANGE' | 'CANCEL_PROPOSAL';
  productId: string;
  productName: string;
  applicantId: string;
  applicantName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  beforeValue: string;
  afterValue: string;
  comment: string;
  createdAt: string;
}

export interface ProductImageAsset {
  id: string;
  productId: string;
  fileId: string;
  sortOrder: number;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  warnings?: string[];
}

export interface GeneratedDocument {
  id: string;
  purpose: 'PROJECT_PROPOSAL_PPTX' | 'PROJECT_PL_XLSX';
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
}
