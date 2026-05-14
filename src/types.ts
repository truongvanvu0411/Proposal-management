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
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProductType {
  DIRECT = 'DIRECT', // 直送
  WAREHOUSE = 'WAREHOUSE', // 倉庫納品
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
  cost: number;
  sellingPrice: number;
  quantity: number;
  isAdopted: boolean;
  orderStatus?: OrderStatus;
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
  status: ProjectStatus;
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
  cost: number;
  listPrice: number;
  description: string;
  updatedBy?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
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
  attachments: string[];
  createdAt: string;
  version: number; // 追加
  versions?: ProductVersion[]; // 追加
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
