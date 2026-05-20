/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate
} from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileText,
  Calculator,
  CheckCircle2,
  Circle,
  ShoppingCart,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Plus,
  Filter,
  Download,
  AlertCircle,
  FileBarChart,
  Trash2,
  Edit,
  ArrowRight,
  ArrowLeft,
  Users,
  Globe,
  History,
  Eye,
  Check,
  ArrowUpRight,
  ChevronLeft,
  HelpCircle,
  Calendar,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Send,
  Wallet,
  Target,
  Zap,
  TrendingUp,
  TrendingDown,
  CreditCard,
  DollarSign,
  ImageIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

import {
  GeneratedDocument, Notification, Project, ProjectStatus, Product, ProjectProduct, ProjectProductDeliveryMethod, ProductStatus, ProductType, ProductVersion, Supplier, Client, OrderRequest, OrderStatus, User, UserRole
} from './types';
import { api, clearSession, getStoredAccessToken, getStoredRefreshToken } from './api/client';
import { resolveManualUrl } from './lib/runtimePaths';

// --- Components ---

const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(children, document.body);
};

const projectStatusMap: Record<string, string> = {
  [ProjectStatus.DRAFT]: '下書き',
  [ProjectStatus.PROPOSED]: '提案中',
  [ProjectStatus.ADOPTED]: '成約',
  [ProjectStatus.REJECTED]: '却下',
};

const projectStatusIconMap: Record<ProjectStatus, React.ComponentType<{ size?: number; className?: string }>> = {
  [ProjectStatus.DRAFT]: FileText,
  [ProjectStatus.PROPOSED]: Send,
  [ProjectStatus.ADOPTED]: CheckCircle2,
  [ProjectStatus.REJECTED]: AlertCircle,
};

const orderStatusMap: Record<string, string> = {
  [OrderStatus.REQUESTED]: '発注依頼済み',
  [OrderStatus.CONFIRMED]: '確認済み',
  [OrderStatus.IN_PROGRESS]: '対応中',
  [OrderStatus.SHIPPED]: '発送済み',
  [OrderStatus.RECEIVED]: '受取済み',
  [OrderStatus.COMPLETED]: '完了',
  [OrderStatus.CANCELLED]: 'キャンセル',
};

const roleLabelMap: Record<UserRole, string> = {
  [UserRole.ADMIN]: '管理者',
  [UserRole.PRODUCT_MANAGER]: '商品担当',
  [UserRole.SALES]: '営業担当',
  [UserRole.SUPPLIER]: 'サプライヤー',
};

const deliveryMethodLabelMap: Record<ProjectProductDeliveryMethod, string> = {
  [ProjectProductDeliveryMethod.WAREHOUSE]: '倉庫',
  [ProjectProductDeliveryMethod.DIRECT]: '直送',
};

const stickyToolbarClass = 'sticky top-24 z-10 bg-white/90 backdrop-blur-md';

const logoIconSrc = '/assets/logo-icon.png';
const logoTitleSrc = '/assets/logo-title.png';

const productCategoryOptions = [
  'キッチン用品',
  'ガジェット',
  'バッグ・小物',
  'ビューティー・ケア',
  'ライフスタイル雑貨',
  '文具・オフィス用品',
  'アパレル',
  '食品・飲料',
  'スポーツ・アウトドア',
  'ホーム・インテリア',
];

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ToastTone = 'success' | 'error' | 'info';

type ToastMessage = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: 'default' | 'danger';
  onConfirm: () => void;
};

const ToastHost = ({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) => (
  <div className="fixed right-5 top-5 z-[220] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-3 pointer-events-none">
    {toasts.map((toast) => {
      const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertCircle : Bell;
      return (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl shadow-slate-200/70",
            toast.tone === 'success' && "border-emerald-100",
            toast.tone === 'error' && "border-red-100",
            toast.tone === 'info' && "border-primary/10",
          )}
        >
          <div className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            toast.tone === 'success' && "bg-emerald-50 text-emerald-600",
            toast.tone === 'error' && "bg-red-50 text-red-500",
            toast.tone === 'info' && "bg-primary-light text-primary",
          )}>
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900">{toast.title}</p>
            {toast.message && <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">{toast.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-600"
            aria-label="通知を閉じる"
          >
            <X size={16} />
          </button>
        </motion.div>
      );
    })}
  </div>
);

const ConfirmDialog = ({
  state,
  onCancel,
}: {
  state: ConfirmDialogState | null;
  onCancel: () => void;
}) => {
  if (!state) return null;

  const isDanger = state.intent === 'danger';
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-900/20"
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            isDanger ? "bg-red-50 text-red-500" : "bg-primary-light text-primary",
          )}>
            <AlertCircle size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black text-slate-900">{state.title}</h3>
            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-500">{state.message}</p>
          </div>
        </div>
        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl px-5 py-3 text-sm font-black text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            {state.cancelLabel ?? 'キャンセル'}
          </button>
          <button
            type="button"
            onClick={() => {
              const action = state.onConfirm;
              onCancel();
              action();
            }}
            className={cn(
              "rounded-2xl px-5 py-3 text-sm font-black text-white shadow-xl transition-all",
              isDanger
                ? "bg-red-500 shadow-red-100 hover:bg-red-600"
                : "bg-slate-900 shadow-slate-200 hover:bg-slate-800",
            )}
          >
            {state.confirmLabel ?? 'OK'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value?: string) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const isSameCalendarDate = (left: Date, right: Date) => (
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()
);

const JapaneseDatePicker = ({
  value,
  onChange,
  placeholder,
  min,
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  min?: string;
  className?: string;
}) => {
  const selectedDate = useMemo(() => parseDateInputValue(value), [value]);
  const minDate = useMemo(() => parseDateInputValue(min), [min]);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });

  const selectedLabel = selectedDate
    ? selectedDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : placeholder;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left text-sm font-black outline-none transition-all hover:border-primary/30 hover:bg-white focus:ring-4 focus:ring-primary/10",
          selectedDate ? "text-slate-700" : "text-slate-400",
        )}
      >
        <Calendar size={16} className="text-primary" />
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
      </button>
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[180] w-[min(320px,calc(100vw-2rem))] rounded-3xl border border-primary/10 bg-white p-4 shadow-2xl shadow-slate-200/80">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-primary-light hover:text-primary"
              aria-label="前月"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="rounded-full bg-primary-light px-4 py-2 text-sm font-black text-primary">
              {visibleMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
            </div>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-primary-light hover:text-primary"
              aria-label="翌月"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400">
            {['日', '月', '火', '水', '木', '金', '土'].map((weekday) => (
              <div key={weekday} className="py-1">{weekday}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateValue = formatDateInputValue(day);
              const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth();
              const isSelected = selectedDate ? isSameCalendarDate(day, selectedDate) : false;
              const isToday = isSameCalendarDate(day, today);
              const isDisabled = minDate ? dateValue < formatDateInputValue(minDate) : false;
              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(dateValue);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "grid h-9 place-items-center rounded-xl text-xs font-black transition-all",
                    isOutsideMonth && "text-slate-300",
                    !isOutsideMonth && "text-slate-700 hover:bg-primary-light hover:text-primary",
                    isToday && !isSelected && "ring-1 ring-primary/30",
                    isSelected && "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary hover:text-white",
                    isDisabled && "cursor-not-allowed text-slate-200 hover:bg-transparent hover:text-slate-200",
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="rounded-xl px-3 py-2 text-xs font-black text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              クリア
            </button>
            <button
              type="button"
              onClick={() => {
                const todayValue = formatDateInputValue(new Date());
                if (!minDate || todayValue >= formatDateInputValue(minDate)) {
                  onChange(todayValue);
                  setVisibleMonth(new Date());
                  setIsOpen(false);
                }
              }}
              className="rounded-xl bg-primary-light px-3 py-2 text-xs font-black text-primary transition-colors hover:bg-primary hover:text-white"
            >
              今日
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Badge = ({ children, status }: { children: React.ReactNode; status: string }) => {
  const ProjectIcon = Object.values(ProjectStatus).includes(status as ProjectStatus)
    ? projectStatusIconMap[status as ProjectStatus]
    : null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider",
      status === 'ACTIVE' || status === 'ADOPTED' || status === 'COMPLETED' || status === 'APPROVED' || status === 'Success'
        ? "bg-primary-light text-primary border-primary/10"
        : status === ProjectStatus.PROPOSED
          ? "bg-amber-50 text-amber-600 border-amber-100"
          : status === ProjectStatus.DRAFT
            ? "bg-slate-50 text-slate-500 border-slate-100"
            : (status === 'CANCELLED' || status === 'REJECTED' ? "bg-red-50 text-red-500 border-red-100" : "bg-slate-50 text-slate-400 border-slate-100")
    )}>
      {ProjectIcon && <ProjectIcon size={12} />}
      {children}
    </span>
  );
};

interface SidebarItemProps {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
  collapsed?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  to,
  icon: Icon,
  label,
  active,
  collapsed = false,
}) => (
  <Link
    to={to}
    title={collapsed ? label : undefined}
    className={cn(
      "flex items-center rounded-xl transition-all duration-200 group relative",
      collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-2.5",
      active
        ? "bg-primary-light text-primary"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    {active && !collapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full" />}
    <Icon size={20} className={cn(
      "transition-transform",
      active ? "text-primary" : "text-slate-400 group-hover:text-slate-900"
    )} />
    {!collapsed && <span className="font-medium text-sm">{label}</span>}
  </Link>
);

// Placeholder components for missing pages
const AdoptionList = () => <div className="p-8 bg-white rounded-2xl border border-slate-100 font-bold text-slate-400 text-center">採用管理画面（開発中）</div>;
const OrderManagement = () => <div className="p-8 bg-white rounded-2xl border border-slate-100 font-bold text-slate-400 text-center">発注管理画面（開発中）</div>;
const ExportData = () => {
  const [loadingDataset, setLoadingDataset] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const datasets = [
    { id: 'projects', label: '案件一覧データ', desc: '全プロジェクトの基本情報、顧客情報、合計収支。', icon: FileBarChart, format: 'CSV' },
    { id: 'product-master', label: '商品マスタデータ', desc: '商品カタログの全マスタ情報（JAN、原価、上代等）。', icon: Package, format: 'CSV' },
    { id: 'web-listing', label: 'Web掲載データ抽出', desc: 'ECサイトやWebカタログ掲載用の商品情報を抽出します。', icon: Globe, format: 'CSV' },
    { id: 'internal-master', label: '社内用商品マスタ出力', desc: '基幹システム連携用の内部管理項目を含むフルデータ。', icon: LayoutDashboard, labelSuffix: ' (社内用)', format: 'CSV' },
    { id: 'orders', label: '発注履歴データ', desc: '成約案件に基づく個別の発注・仕入れ実績。', icon: ShoppingCart, format: 'CSV' },
  ];

  const handleDownload = async (dataset: string) => {
    setLoadingDataset(dataset);
    setExportError(null);
    try {
      const { blob, filename } = await api.downloadExport(dataset);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${dataset}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'CSV出力に失敗しました。');
    } finally {
      setLoadingDataset(null);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">データ出力</h1>
        <p className="text-slate-500">業務データの外部出力およびバックアップを行います。</p>
      </div>

      {exportError && (
        <div className="px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold flex items-center gap-2">
          <AlertCircle size={18} /> {exportError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {datasets.map((d) => (
          <div key={d.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center">
            <div className="p-4 bg-slate-50 rounded-2xl mb-6 group-hover:bg-primary group-hover:text-white transition-all">
              <d.icon size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2 truncate w-full px-2">
              {d.label}
              {d.labelSuffix && <span className="text-xs text-primary">{d.labelSuffix}</span>}
            </h3>
            <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed h-10 line-clamp-2">{d.desc}</p>
            <div className="mt-auto w-full space-y-3">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d.format}</div>
              <button
                onClick={() => handleDownload(d.id)}
                disabled={loadingDataset !== null}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download size={18} /> {loadingDataset === d.id ? '出力中...' : 'ダウンロード'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-primary rounded-3xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="space-y-2 relative z-10">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">提案書自動生成</h2>
            <p className="text-white/80 font-medium italic">最新の案件ステータスをAIが解析し、ワンクリックでPPTX形式の提案資料を自動構成します。</p>
        </div>
        <button className="px-8 py-4 bg-white text-primary rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-xl relative z-10">
          <FileText size={20} /> 統合出力ウィザードを起動
        </button>
      </div>
    </div>
  );
};

const ProductCatalog = ({
  products,
  suppliers = [],
  currentUser,
  onUpdate,
  onAdd,
  onDelete,
  onDeleteImage,
  onSelect,
  isSelectionMode = false,
  onNotify,
}: {
  products: Product[],
  suppliers?: Supplier[],
  currentUser?: User | null,
  onUpdate?: (p: Product, imageFiles?: File[]) => void,
  onAdd?: (p: Product, imageFiles?: File[]) => void,
  onDelete?: (id: string) => void,
  onDeleteImage?: (productId: string, imageId: string) => void,
  onSelect?: (p: Product) => void,
  isSelectionMode?: boolean,
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCudModalOpen, setIsCudModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'INFO' | 'HISTORY'>('INFO');
  const [janCodeDraft, setJanCodeDraft] = useState('');
  const [janCodeAvailability, setJanCodeAvailability] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken' | 'error';
    productName?: string;
    deleted?: boolean;
    message?: string;
  }>({ status: 'idle' });
  const [productFormError, setProductFormError] = useState('');
  const isSupplierUser = currentUser?.role === UserRole.SUPPLIER;
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [productStatusFilter, setProductStatusFilter] = useState<'ALL' | 'NORMAL' | ProductStatus.PENDING_APPROVAL>('ALL');
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<Array<{ file: File; url: string }>>([]);
  const canManageProducts = currentUser
    ? [UserRole.ADMIN, UserRole.SUPPLIER].includes(currentUser.role)
    : false;

  const catalogCategories = useMemo(
    () => {
      const existingCategories = products
        .map((product) => product.categoryName)
        .filter((category): category is string => Boolean(category));
      const fixedCategories = new Set(productCategoryOptions);
      const extras = existingCategories
        .filter((category) => !fixedCategories.has(category))
        .sort((a, b) => a.localeCompare(b));
      return [...productCategoryOptions, ...Array.from(new Set(extras))];
    },
    [products],
  );
  const catalogSuppliers = useMemo(() => {
    const supplierMap = new Map<string, string>();
    suppliers.forEach((supplier) => supplierMap.set(supplier.id, supplier.name));
    products.forEach((product) => supplierMap.set(product.supplierId, product.supplierName));
    return Array.from(supplierMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, suppliers]);
  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.supplierName.toLowerCase().includes(normalizedSearch) ||
        product.categoryName.toLowerCase().includes(normalizedSearch) ||
        product.janCode.toLowerCase().includes(normalizedSearch);
      const matchesCategory = categoryFilter === 'ALL' || product.categoryName === categoryFilter;
      const matchesSupplier = supplierFilter === 'ALL' || product.supplierId === supplierFilter;
      const matchesStatus =
        productStatusFilter === 'ALL' ||
        (productStatusFilter === 'NORMAL'
          ? product.status !== ProductStatus.PENDING_APPROVAL
          : product.status === ProductStatus.PENDING_APPROVAL);
      return matchesSearch && matchesCategory && matchesSupplier && matchesStatus;
    });
  }, [categoryFilter, productStatusFilter, products, searchQuery, supplierFilter]);
  const duplicateJanProduct = useMemo(() => {
    const normalizedJanCode = janCodeDraft.trim().toLowerCase();
    if (!normalizedJanCode) return undefined;
    return products.find((product) =>
      product.id !== editingProduct?.id &&
      product.janCode.trim().toLowerCase() === normalizedJanCode
    );
  }, [editingProduct?.id, janCodeDraft, products]);

  useEffect(() => {
    const normalizedJanCode = janCodeDraft.trim();
    if (!isCudModalOpen || !normalizedJanCode || duplicateJanProduct) {
      setJanCodeAvailability({ status: 'idle' });
      return;
    }

    let isActive = true;
    setJanCodeAvailability({ status: 'checking' });
    const timer = window.setTimeout(() => {
      api.checkProductJanCode(normalizedJanCode, editingProduct?.id)
        .then((result) => {
          if (!isActive) return;
          setJanCodeAvailability(result.available
            ? { status: 'available' }
            : {
                status: 'taken',
                productName: result.product?.name,
                deleted: result.product?.deleted,
              });
        })
        .catch((error) => {
          if (!isActive) return;
          setJanCodeAvailability({
            status: 'error',
            message: error instanceof Error ? error.message : 'JANコードの確認に失敗しました。',
          });
        });
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [duplicateJanProduct, editingProduct?.id, isCudModalOpen, janCodeDraft]);

  useEffect(() => {
    if (!editingProduct) return;
    const latestProduct = products.find((product) => product.id === editingProduct.id);
    if (latestProduct) {
      setEditingProduct(latestProduct);
    }
  }, [editingProduct?.id, products]);

  useEffect(() => {
    const previews = selectedImageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setSelectedImagePreviews(previews);
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [selectedImageFiles]);

  const closeProductModal = () => {
    setIsCudModalOpen(false);
    setEditingProduct(null);
    setModalTab('INFO');
    setJanCodeDraft('');
    setJanCodeAvailability({ status: 'idle' });
    setProductFormError('');
    setPreviewImage(null);
    setSelectedImageFiles([]);
  };

  const openCreateProductModal = () => {
    setEditingProduct(null);
    setJanCodeDraft('');
    setJanCodeAvailability({ status: 'idle' });
    setProductFormError('');
    setSelectedImageFiles([]);
    setModalTab('INFO');
    setIsCudModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setJanCodeDraft(product.janCode);
    setJanCodeAvailability({ status: 'idle' });
    setProductFormError('');
    setSelectedImageFiles([]);
    setModalTab('INFO');
    setIsCudModalOpen(true);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalTab === 'HISTORY') return; // History tab doesn't have a form

    const formData = new FormData(e.target as HTMLFormElement);
    const submittedJanCode = String(formData.get('janCode') ?? '').trim();
    const submittedCost = Number(formData.get('cost'));
    const submittedListPrice = isSupplierUser
      ? submittedCost
      : Number(formData.get('listPrice') ?? submittedCost);
    const duplicateProduct = products.find((product) =>
      product.id !== editingProduct?.id &&
      product.janCode.trim().toLowerCase() === submittedJanCode.toLowerCase()
    );
    if (duplicateProduct) {
      const message = `JANコード「${submittedJanCode}」は「${duplicateProduct.name}」で既に登録されています。`;
      setProductFormError(message);
      onNotify?.({
        tone: 'error',
        title: 'JANコードが重複しています',
        message,
      });
      return;
    }
    const availability = await api.checkProductJanCode(submittedJanCode, editingProduct?.id).catch((error) => {
      const message = error instanceof Error ? error.message : 'JANコードの確認に失敗しました。';
      return { available: false, errorMessage: message };
    });
    if ('errorMessage' in availability) {
      setProductFormError(availability.errorMessage);
      onNotify?.({
        tone: 'error',
        title: 'JANコードを確認できません',
        message: availability.errorMessage,
      });
      return;
    }
    if (!availability.available) {
      const ownerName = availability.product?.name ?? '別の商品';
      const deletedHint = availability.product?.deleted ? '（削除済み）' : '';
      const message = `JANコード「${submittedJanCode}」は「${ownerName}」${deletedHint}で既に登録されています。`;
      setJanCodeAvailability({
        status: 'taken',
        productName: availability.product?.name,
        deleted: availability.product?.deleted,
      });
      setProductFormError(message);
      onNotify?.({
        tone: 'error',
        title: 'JANコードが重複しています',
        message,
      });
      return;
    }

    const imageFiles = selectedImageFiles;

    if (editingProduct) {
       const supplierId = isSupplierUser
         ? editingProduct.supplierId
         : formData.get('supplierId') as string;
       const supplier = suppliers.find(s => s.id === supplierId);
       // Push to approval instead of direct update
       const pendingProduct: Product = {
          ...editingProduct,
          name: formData.get('name') as string,
          categoryName: formData.get('categoryName') as string,
          janCode: submittedJanCode,
          modelNumber: formData.get('modelNumber') as string,
          features: [
            formData.get('feature1') as string,
            formData.get('feature2') as string,
            formData.get('feature3') as string,
          ].filter(Boolean),
          cost: submittedCost,
          listPrice: submittedListPrice,
          minLot: Number(formData.get('minLot')) || 1,
          leadTime: formData.get('leadTime') as string || editingProduct.leadTime,
          description: formData.get('description') as string,
          supplierId,
          supplierName: supplier?.name ?? editingProduct.supplierName,
          status: ProductStatus.PENDING_APPROVAL,
          versions: [
             ...(editingProduct.versions || []),
             {
                version: (editingProduct.version || 1) + 1,
                name: formData.get('name') as string,
                categoryName: formData.get('categoryName') as string,
                janCode: submittedJanCode,
                modelNumber: formData.get('modelNumber') as string,
                features: [
                  formData.get('feature1') as string,
                  formData.get('feature2') as string,
                  formData.get('feature3') as string,
                ].filter(Boolean),
                cost: submittedCost,
                listPrice: submittedListPrice,
                minLot: Number(formData.get('minLot')) || 1,
                leadTime: formData.get('leadTime') as string || editingProduct.leadTime,
                description: formData.get('description') as string,
                createdAt: new Date().toISOString().split('T')[0]
             }
          ]
       };
       onUpdate?.(pendingProduct, imageFiles);
    } else {
       const supplierId = isSupplierUser
         ? currentUser?.supplierId ?? ''
         : formData.get('supplierId') as string;
       const supplier = suppliers.find(s => s.id === supplierId);
       const newProduct: Product = {
          id: `PD-${Math.floor(Math.random() * 100000)}`,
          name: formData.get('name') as string,
          modelNumber: formData.get('modelNumber') as string,
          features: [
            formData.get('feature1') as string,
            formData.get('feature2') as string,
            formData.get('feature3') as string,
          ].filter(Boolean),
          categoryName: formData.get('categoryName') as string,
          categoryId: 'cat-gen',
          janCode: submittedJanCode,
          cost: submittedCost,
          listPrice: submittedListPrice,
          images: [],
          status: ProductStatus.ACTIVE,
          description: formData.get('description') as string,
          supplierName: supplier?.name || '未設定サプライヤー',
          supplierId,
          productType: ProductType.WAREHOUSE,
          minLot: Number(formData.get('minLot')) || 1,
          leadTime: formData.get('leadTime') as string || '3 days',
          attachments: [],
          createdAt: new Date().toISOString().split('T')[0],
          version: 1,
          versions: []
       };
       onAdd?.(newProduct, imageFiles);
    }

    closeProductModal();
  };

  const handleDeleteProduct = (id: string) => {
    onDelete?.(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {!isSelectionMode && (
          <div>
            <h1 className="text-2xl font-bold text-slate-800">商品カタログ</h1>
            <p className="text-slate-500">提案可能な全商品のマスタ管理を行います。</p>
          </div>
        )}
        <div className="flex flex-1 max-w-xl gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="商品名、カテゴリ、JANで検索..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!isSelectionMode && canManageProducts && (
            <button
              onClick={openCreateProductModal}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all shrink-0"
            >
              <Plus size={20} /> 新規登録
            </button>
          )}
        </div>
      </div>

      <div className={cn(
        !isSelectionMode && stickyToolbarClass,
        "grid grid-cols-1 gap-3 rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-sm backdrop-blur-md md:grid-cols-3",
        isSelectionMode && "border-slate-200 bg-slate-50/80 shadow-none",
      )}>
          <label className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none appearance-none"
            >
              <option value="ALL">すべてのカテゴリ</option>
              {catalogCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="relative">
            <ShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none appearance-none"
            >
              <option value="ALL">すべてのサプライヤー</option>
              {catalogSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>
          <label className="relative">
            <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={productStatusFilter}
              onChange={(event) => setProductStatusFilter(event.target.value as 'ALL' | 'NORMAL' | ProductStatus.PENDING_APPROVAL)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none appearance-none"
            >
              <option value="ALL">すべての商品</option>
              <option value="NORMAL">通常</option>
              <option value={ProductStatus.PENDING_APPROVAL}>承認待ち</option>
            </select>
          </label>
        </div>

      <div className={cn(
        "grid gap-6",
        isSelectionMode
          ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
      )}>
        {filteredProducts.map((product) => (
          <motion.div
            key={product.id}
            whileHover={{ y: -5 }}
            className={cn(
              "bg-white border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col",
              isSelectionMode ? "rounded-2xl" : "rounded-3xl",
            )}
          >
            <div className={cn("relative overflow-hidden bg-slate-50", isSelectionMode ? "aspect-[4/3]" : "aspect-square")}>
              {product.images[0] ? (
                <img src={product.images[0]} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon size={40} />
                </div>
              )}
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-black text-slate-800 rounded-full shadow-sm">
                  {product.categoryName}
                </span>
              </div>
              {isSelectionMode && (
                 <button
                  onClick={() => onSelect?.(product)}
                  className="absolute bottom-3 right-3 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
            <div className={cn("flex-1 flex flex-col justify-between", isSelectionMode ? "p-4 min-h-36" : "p-5")} onClick={() => !isSelectionMode && canManageProducts && openEditProductModal(product)}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className={cn(
                    "font-bold text-slate-800 line-clamp-2 leading-snug uppercase flex-1",
                    isSelectionMode ? "text-base" : "text-sm",
                  )}>{product.name}</h3>
                  <span className="text-[10px] font-black text-slate-300 ml-2">v{product.version || 1}</span>
                </div>
                {isSelectionMode && (
                  <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-400 line-clamp-2">
                    {product.description || product.janCode}
                  </p>
                )}
                {!isSelectionMode && (
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">JAN: {product.janCode}</p>
                    {product.status === ProductStatus.PENDING_APPROVAL && (
                       <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-widest">承認待ち</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-end justify-between mt-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">原価</p>
                  <p className="text-lg font-black text-slate-900">¥{product.cost.toLocaleString()}</p>
                </div>
                {!isSelectionMode && canManageProducts && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditProductModal(product); }}
                      className="p-2 text-slate-300 hover:text-primary transition-colors"
                    >
                      <Settings size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {isCudModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 overflow-y-auto custom-scrollbar">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeProductModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto"
          >
            <div className="p-8 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900">
                  {editingProduct ? '商品情報を編集' : '新規商品の登録'}
                </h3>
                <button type="button" onClick={closeProductModal} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                  <X size={24} />
                </button>
              </div>

              {editingProduct && (
                <div className="flex p-1 bg-slate-50 rounded-xl">
                  <button
                    onClick={() => setModalTab('INFO')}
                    className={cn(
                      "flex-1 py-2 text-xs font-black rounded-lg transition-all",
                      modalTab === 'INFO' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    基本情報
                  </button>
                  <button
                    onClick={() => setModalTab('HISTORY')}
                    className={cn(
                      "flex-1 py-2 text-xs font-black rounded-lg transition-all",
                      modalTab === 'HISTORY' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    変更履歴 ({(editingProduct.versions?.length || 0) + 1})
                  </button>
                </div>
              )}
            </div>

            {modalTab === 'INFO' ? (
              <form onSubmit={saveProduct}>
                <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">商品名</label>
                      <input name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">カテゴリ</label>
                      <select
                        name="categoryName"
                        defaultValue={editingProduct?.categoryName ?? ''}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold appearance-none"
                      >
                        <option value="">選択してください</option>
                        {catalogCategories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">JANコード</label>
                      <input
                        name="janCode"
                        value={janCodeDraft}
                        onChange={(event) => {
                          setJanCodeDraft(event.target.value);
                          setProductFormError('');
                        }}
                        required
                        aria-invalid={Boolean(duplicateJanProduct) || janCodeAvailability.status === 'taken' || janCodeAvailability.status === 'error'}
                        className={cn(
                          "w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 outline-none transition-all",
                          duplicateJanProduct || janCodeAvailability.status === 'taken' || janCodeAvailability.status === 'error'
                            ? "border-red-200 text-red-600 focus:ring-red-500/20"
                            : "border-slate-200 focus:ring-primary/20",
                        )}
                      />
                      {duplicateJanProduct && (
                        <p className="text-xs font-bold text-red-500 leading-relaxed">
                          このJANコードは「{duplicateJanProduct.name}」で登録済みです。
                        </p>
                      )}
                      {!duplicateJanProduct && janCodeAvailability.status === 'checking' && (
                        <p className="text-xs font-bold text-slate-400 leading-relaxed">JANコードを確認しています...</p>
                      )}
                      {!duplicateJanProduct && janCodeAvailability.status === 'taken' && (
                        <p className="text-xs font-bold text-red-500 leading-relaxed">
                          このJANコードは「{janCodeAvailability.productName ?? '別の商品'}」{janCodeAvailability.deleted ? '（削除済み）' : ''}で登録済みです。
                        </p>
                      )}
                      {!duplicateJanProduct && janCodeAvailability.status === 'error' && (
                        <p className="text-xs font-bold text-red-500 leading-relaxed">
                          {janCodeAvailability.message ?? 'JANコードの確認に失敗しました。'}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">型番</label>
                      <input name="modelNumber" defaultValue={editingProduct?.modelNumber} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">商品画像</label>
                      <input
                        name="images"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(event) => {
                          const files = Array.from(event.currentTarget.files ?? []);
                          if (files.length) {
                            setSelectedImageFiles((current) => [...current, ...files]);
                          }
                          event.currentTarget.value = '';
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold file:mr-3 file:border-0 file:bg-primary-light file:text-primary file:rounded-lg file:px-3 file:py-2 file:font-black"
                      />
                      {(editingProduct?.imageAssets?.length || editingProduct?.images?.length || selectedImagePreviews.length) ? (
                        <div className="flex gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar">
                          {editingProduct?.imageAssets?.length
                            ? editingProduct.imageAssets.map((image) => (
                                <div key={image.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 group">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({ url: image.url, name: image.originalName })}
                                    className="h-full w-full"
                                    title="画像を拡大表示"
                                  >
                                    <img src={image.url} alt={image.originalName} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                    <span className="absolute inset-0 bg-slate-950/0 transition-colors group-hover:bg-slate-950/10" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onDeleteImage?.(editingProduct.id, image.id);
                                    }}
                                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-red-500 shadow-sm"
                                    aria-label="画像を削除"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))
                            : editingProduct?.images?.map((url, index) => (
                                <div key={`${url}-${index}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 group">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({ url, name: `${editingProduct.name} ${index + 1}` })}
                                    className="h-full w-full"
                                    title="画像を拡大表示"
                                  >
                                    <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                    <span className="absolute inset-0 bg-slate-950/0 transition-colors group-hover:bg-slate-950/10" />
                                  </button>
                                </div>
                              ))}
                          {selectedImagePreviews.map((preview, index) => (
                            <div key={`${preview.file.name}-${preview.file.lastModified}-${index}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-primary-light group">
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: preview.url, name: preview.file.name })}
                                className="h-full w-full"
                                title="アップロード予定画像を拡大表示"
                              >
                                <img src={preview.url} alt={preview.file.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                <span className="absolute bottom-0 left-0 right-0 bg-primary/90 py-0.5 text-[8px] font-black text-white">NEW</span>
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedImageFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
                                }}
                                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-red-500 shadow-sm"
                                aria-label="アップロード予定画像を外す"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">原価 (¥)</label>
                      <input name="cost" type="number" defaultValue={editingProduct?.cost} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold" />
                    </div>
                    {!isSupplierUser && (
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase">参考価格 (¥)</label>
                        <input name="listPrice" type="number" defaultValue={editingProduct?.listPrice ?? editingProduct?.cost} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">サプライヤー</label>
                      {isSupplierUser ? (
                        <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600">
                          {suppliers.find(s => s.id === currentUser?.supplierId)?.name || '自社サプライヤー'}
                        </div>
                      ) : (
                        <select
                          name="supplierId"
                          defaultValue={editingProduct?.supplierId}
                          required
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold appearance-none"
                        >
                          <option value="">選択してください</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">リードタイム</label>
                      <input name="leadTime" defaultValue={editingProduct?.leadTime || '3 days'} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">最小ロット</label>
                      <input name="minLot" type="number" min={1} defaultValue={editingProduct?.minLot ?? 1} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">商品説明 (今回の更新内容をここに記述してください)</label>
                    <textarea name="description" defaultValue={editingProduct?.description} rows={3} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase">特徴 {index + 1}</label>
                        <input name={`feature${index + 1}`} defaultValue={editingProduct?.features?.[index] ?? ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                    ))}
                  </div>
                  {productFormError && (
                    <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                      <AlertCircle size={18} className="mt-0.5 shrink-0" />
                      <span>{productFormError}</span>
                    </div>
                  )}
                </div>
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                  <button type="button" onClick={closeProductModal} className="flex-1 py-3 text-slate-500 font-bold hover:text-slate-800">
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={Boolean(duplicateJanProduct) || janCodeAvailability.status === 'checking' || janCodeAvailability.status === 'taken' || janCodeAvailability.status === 'error'}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingProduct ? '更新を申請 (社内承認へ)' : '商品を登録'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 max-h-[70vh] overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/30">
                <div className="space-y-4">
                  {/* Current Active Version */}
                  <div className="p-5 bg-white border-2 border-emerald-100 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                      <Badge status="ACTIVE">現在のバージョン</Badge>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center font-black text-emerald-600">
                        {editingProduct?.version || 1}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">バージョン</p>
                        <p className="text-sm font-black text-slate-900">現在の公開版</p>
                      </div>
                    </div>
                    <div className={cn("grid gap-4 mb-4", isSupplierUser ? "grid-cols-1" : "grid-cols-2")}>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">原価</p>
                        <p className="font-bold text-slate-900">¥{editingProduct?.cost.toLocaleString()}</p>
                      </div>
                      {!isSupplierUser && (
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">参考価格</p>
                          <p className="font-bold text-slate-900">¥{editingProduct?.listPrice.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        ['商品名', editingProduct?.name],
                        ['カテゴリ', editingProduct?.categoryName],
                        ['JAN', editingProduct?.janCode],
                        ['型番', editingProduct?.modelNumber || '未設定'],
                        ['リードタイム', editingProduct?.leadTime],
                        ['最小ロット', editingProduct?.minLot ? `${editingProduct.minLot}` : '未設定'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-slate-50/70 px-3 py-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
                          <p className="truncate text-xs font-bold text-slate-700">{value || '未設定'}</p>
                        </div>
                      ))}
                    </div>
                    {editingProduct?.features?.length ? (
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {editingProduct.features.map((feature, index) => (
                          <span key={`${feature}-${index}`} className="rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-black text-primary">{feature}</span>
                        ))}
                      </div>
                    ) : null}
                    <p className="text-xs text-slate-500 italic leading-relaxed">{editingProduct?.description || '説明は登録されていません。'}</p>
                  </div>

                  {/* Previous Versions */}
                  {editingProduct?.versions && editingProduct.versions.length > 0 ? (
                    editingProduct.versions.map((v, idx) => (
                      <div key={idx} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400">
                            {v.version}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 leading-none mb-1">{v.createdAt}</p>
                            <p className="text-sm font-bold text-slate-700">過去バージョン</p>
                          </div>
                        </div>
                        <div className={cn("grid gap-4 mb-4", isSupplierUser ? "grid-cols-1" : "grid-cols-2")}>
                          <div className="p-3 bg-slate-50/50 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">原価</p>
                            <p className="text-sm font-bold text-slate-600">¥{v.cost.toLocaleString()}</p>
                          </div>
                          {!isSupplierUser && (
                            <div className="p-3 bg-slate-50/50 rounded-xl">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">参考価格</p>
                              <p className="text-sm font-bold text-slate-600">¥{v.listPrice.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {[
                            ['商品名', v.name],
                            ['カテゴリ', v.categoryName],
                            ['JAN', v.janCode],
                            ['型番', v.modelNumber || '未設定'],
                            ['リードタイム', v.leadTime],
                            ['最小ロット', v.minLot ? `${v.minLot}` : '未設定'],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-xl bg-slate-50/50 px-3 py-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
                              <p className="truncate text-xs font-bold text-slate-600">{value || '未設定'}</p>
                            </div>
                          ))}
                        </div>
                        {v.features?.length ? (
                          <div className="mb-4 flex flex-wrap gap-1.5">
                            {v.features.map((feature, featureIndex) => (
                              <span key={`${feature}-${featureIndex}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{feature}</span>
                            ))}
                          </div>
                        ) : null}
                        <p className="text-xs text-slate-400 italic leading-relaxed">{v.description}</p>
                      </div>
                    )).reverse()
                  ) : (
                     <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                        <History className="mx-auto text-slate-200 mb-2" size={32} />
                        <p className="text-slate-400 font-bold text-sm">以前のバージョンはありません</p>
                     </div>
                  )}
                </div>
                <div className="p-4 bg-primary-light rounded-2xl border border-primary/10 flex items-start gap-3">
                  <AlertCircle className="text-primary shrink-0 mt-0.5" size={18} />
                  <p className="text-[10px] text-primary font-bold leading-relaxed whitespace-pre-wrap">
                    変更履歴は読み取り専用です。バージョンを戻す場合は、基本情報タブから新しく上書き申請を行ってください。
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {previewImage && (
        <ModalPortal>
          <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-6 top-6 rounded-full bg-white/90 p-2 text-slate-600 shadow-xl"
              aria-label="画像プレビューを閉じる"
            >
              <X size={22} />
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-h-[86vh] max-w-[86vw] rounded-3xl object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

const ProjectWizard = ({
  onComplete,
  onSaveDraft,
  onCancel,
  products,
  clients = [],
  salesUsers = [],
  initialProject,
  onNotify,
}: {
  onComplete: (p: Project) => void,
  onSaveDraft: (p: Project) => void,
  onCancel: () => void,
  products: Product[],
  clients?: Client[],
  salesUsers?: User[],
  initialProject?: Project | null,
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void,
}) => {
  const [step, setStep] = useState(1);
  const [projectData, setProjectData] = useState<Partial<Project>>({
    ...(initialProject ?? {
      title: '',
      clientId: '',
      clientName: '',
      assignedSalesUserId: '',
      assignedSalesUserName: '',
      proposalBackground: '',
      recommendationPoints: ['', '', ''],
      remarks: '',
      products: [],
      status: ProjectStatus.DRAFT,
    }),
    products: initialProject?.products ?? [],
  });
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

  const addProduct = (p: Product) => {
    const exists = projectData.products?.find(pp => pp.productId === p.id);
    if (exists) return;

    const newProduct: ProjectProduct = {
      productId: p.id,
      proposalComment: '',
      recommendationReasons: [
        { title: '', detail: '' },
        { title: '', detail: '' },
        { title: '', detail: '' },
      ],
      cost: p.cost,
      sellingPrice: p.listPrice,
      quantity: 1,
      displayOrder: projectData.products?.length ?? 0,
      isAdopted: false,
      allowOrder: false,
      deliveryMethod: p.productType === ProductType.DIRECT
        ? ProjectProductDeliveryMethod.DIRECT
        : ProjectProductDeliveryMethod.WAREHOUSE,
    };

    setProjectData(prev => ({
      ...prev,
      products: [...(prev.products || []), newProduct]
    }));
  };

  const removeProduct = (productId: string) => {
    setProjectData(prev => ({
      ...prev,
      products: prev.products?.filter(pp => pp.productId !== productId)
    }));
  };

  const updateProduct = (productId: string, updates: Partial<ProjectProduct>) => {
    setProjectData(prev => ({
      ...prev,
      products: prev.products?.map(pp => pp.productId === productId ? { ...pp, ...updates } : pp)
    }));
  };

  const calculateTotals = () => {
    const totalRevenue = projectData.products?.reduce((acc, p) => acc + (p.sellingPrice * p.quantity), 0) || 0;
    const totalCost = projectData.products?.reduce((acc, p) => acc + (p.cost * p.quantity), 0) || 0;
    return {
      totalRevenue,
      totalProfit: totalRevenue - totalCost
    };
  };

  const buildProjectPayload = (status: ProjectStatus = projectData.status ?? ProjectStatus.DRAFT) => {
    const { totalRevenue, totalProfit } = calculateTotals();
    return {
      id: initialProject?.id ?? `PJ-${Math.floor(Math.random() * 10000)}`,
      title: projectData.title || '無題の案件',
      clientId: projectData.clientId!,
      clientName: projectData.clientName || '未記入クライアント',
      assignedSalesUserId: projectData.assignedSalesUserId || undefined,
      assignedSalesUserName: projectData.assignedSalesUserName || undefined,
      proposalBackground: projectData.proposalBackground,
      recommendationPoints: projectData.recommendationPoints,
      remarks: projectData.remarks,
      status,
      products: projectData.products || [],
      orderRequests: initialProject?.orderRequests ?? [],
      totalRevenue,
      totalProfit,
      createdAt: initialProject?.createdAt ?? new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
  };

  const validateDraftMinimum = () => {
    if (!projectData.title || !projectData.clientId) {
      onNotify?.({
        tone: 'error',
        title: '入力を確認してください',
        message: '下書き保存には案件名とクライアントが必要です。',
      });
      return false;
    }
    return true;
  };

  const handleSaveDraft = () => {
    if (!validateDraftMinimum()) return;
    onSaveDraft(buildProjectPayload(ProjectStatus.DRAFT));
  };

  const handleComplete = () => {
    if (!validateDraftMinimum()) return;
    const finalProject = buildProjectPayload(projectData.status ?? ProjectStatus.DRAFT);
    onComplete(finalProject);
  };

  return (
    <div className="relative">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto max-h-[calc(100vh-7rem)] flex flex-col">
        {/* Sticky Global Header */}
        <div className="p-8 border-b border-slate-100 bg-white shrink-0 z-40">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
               <FileText className="text-primary" size={24} />
               {initialProject ? '下書き案件編集' : '新規案件作成'}
            </h2>
            <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
              <X size={24} />
            </button>
          </div>

          <div className="flex items-center gap-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  step === s ? "bg-primary text-white scale-110 shadow-lg shadow-primary/10" : (step > s ? "bg-primary-light text-primary" : "bg-slate-100 text-slate-400")
                )}>
                  {step > s ? <Check size={16} /> : s}
                </div>
                <span className={cn("text-sm font-bold", step >= s ? "text-slate-800" : "text-slate-400")}>
                  {s === 1 ? '基本情報' : s === 2 ? '商品選定' : '条件確定'}
                </span>
                {s < 3 && <div className="w-12 h-px bg-slate-100 ml-2" />}
              </div>
            ))}
          </div>

          {/* persistent project info */}
          {step > 1 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">案件名</p>
                  <p className="text-sm font-bold text-slate-900">{projectData.title || '（未入力）'}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">クライアント</p>
                  <p className="text-sm font-bold text-slate-900">{projectData.clientName || '（未入力）'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">選択中</p>
                   <p className="text-sm font-bold text-primary">{projectData.products?.length} 商品</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">合計利益</p>
                   <p className="text-sm font-black text-emerald-600">¥{calculateTotals().totalProfit.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-8 min-h-[400px] flex-1 overflow-y-auto custom-scrollbar">
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto space-y-6 py-10">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">案件名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="例: 2024年秋季ノベルティ商談"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                  value={projectData.title}
                  onChange={e => setProjectData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">クライアント <span className="text-red-500">*</span></label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold appearance-none"
                  value={projectData.clientId}
                  onChange={e => {
                    const client = clients.find(c => c.id === e.target.value);
                    setProjectData(prev => ({ ...prev, clientId: e.target.value, clientName: client?.name || '' }));
                  }}
                >
                  <option value="">選択してください</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">営業担当</label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold appearance-none"
                  value={projectData.assignedSalesUserId ?? ''}
                  onChange={e => {
                    const sales = salesUsers.find(user => user.id === e.target.value);
                    setProjectData(prev => ({
                      ...prev,
                      assignedSalesUserId: e.target.value,
                      assignedSalesUserName: sales?.name || '',
                    }));
                  }}
                >
                  <option value="">未割当</option>
                  {salesUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">提案背景</label>
                <textarea
                  rows={4}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                  value={projectData.proposalBackground ?? ''}
                  onChange={e => setProjectData(prev => ({ ...prev, proposalBackground: e.target.value }))}
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">おすすめポイント</label>
                {[0, 1, 2].map((index) => (
                  <input
                    key={index}
                    type="text"
                    placeholder={`ポイント ${index + 1}`}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                    value={projectData.recommendationPoints?.[index] ?? ''}
                    onChange={e => {
                      const points = [...(projectData.recommendationPoints ?? ['', '', ''])];
                      points[index] = e.target.value;
                      setProjectData(prev => ({ ...prev, recommendationPoints: points }));
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">提案商品の選定</h3>
                    <p className="text-sm text-slate-500 font-medium">カタログから商品を選び、プロジェクトに追加してください。</p>
                  </div>
                  <button
                    onClick={() => setIsProductSelectorOpen(true)}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/10 hover:scale-105 transition-all"
                  >
                    <Plus size={20} /> 商品リストを開く
                  </button>
               </div>

               {projectData.products?.length === 0 ? (
                 <div className="py-20 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                       <ShoppingCart className="text-slate-200" size={32} />
                    </div>
                    <div>
                       <p className="text-slate-400 font-bold">まだ商品が選択されていません</p>
                       <p className="text-xs text-slate-300 font-medium mt-1">「商品リストを開く」から商品を追加してください。</p>
                    </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projectData.products?.map(pp => {
                      const product = products.find(d => d.id === pp.productId);
                      return (
                        <div key={pp.productId} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4 group hover:shadow-lg transition-all">
                           <div className="flex items-center gap-3">
                              <img src={product?.images[0]} loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover bg-slate-50" alt="" />
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-black text-slate-900 truncate uppercase">{product?.name}</p>
                                 <p className="text-[10px] text-slate-400 font-bold">¥{product?.listPrice.toLocaleString()}</p>
                              </div>
                              <button onClick={() => removeProduct(pp.productId)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                 <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                      );
                    })}
                 </div>
               )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <h3 className="text-lg font-black text-slate-900">条件設定と収支確認</h3>
               <div className="space-y-6">
                  {projectData.products?.map(pp => {
                     const product = products.find(d => d.id === pp.productId);
                     return (
                        <div key={pp.productId} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
                           <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex min-w-0 items-center gap-4">
                                 {product?.images[0] ? (
                                   <img src={product.images[0]} loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-2xl object-cover bg-slate-50 shadow-sm" alt="" />
                                 ) : (
                                   <div className="h-16 w-16 shrink-0 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 shadow-sm">
                                     <ImageIcon size={24} />
                                   </div>
                                 )}
                                 <div className="min-w-0">
                                    <h6 className="font-black text-slate-900 text-sm leading-snug line-clamp-2">{product?.name}</h6>
                                    <p className="mt-1 text-[10px] text-slate-400 font-black uppercase tracking-widest">JAN: {product?.janCode ?? '-'}</p>
                                 </div>
                              </div>
                              <label className="inline-flex w-fit items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                                <input type="checkbox" checked={pp.isAdopted} onChange={e => updateProduct(pp.productId, { isAdopted: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
                                採用推奨
                              </label>
                           </div>

                           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">原価</label>
                                 <div className="h-11 rounded-xl border border-slate-100 bg-slate-50 px-4 flex items-center text-sm font-black text-slate-600">
                                    ¥{pp.cost.toLocaleString()}
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">提案価格</label>
                                 <input
                                    type="number"
                                    min={0}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-black outline-none transition-all focus:ring-4 focus:ring-primary/10"
                                    value={pp.sellingPrice}
                                    onChange={e => updateProduct(pp.productId, { sellingPrice: Number(e.target.value) })}
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">数量</label>
                                 <input
                                    type="number"
                                    min={1}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-black outline-none transition-all focus:ring-4 focus:ring-primary/10"
                                    value={pp.quantity}
                                    onChange={e => updateProduct(pp.productId, { quantity: Number(e.target.value) })}
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">単体粗利</label>
                                 <div className="h-11 rounded-xl border border-emerald-100 bg-emerald-50 px-4 flex items-center text-sm font-black text-emerald-600">
                                    ¥{(pp.sellingPrice - pp.cost).toLocaleString()}
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">提案コメント</label>
                             <textarea
                               rows={3}
                               className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold leading-relaxed outline-none transition-all focus:ring-4 focus:ring-primary/10"
                               value={pp.proposalComment}
                               onChange={e => updateProduct(pp.productId, { proposalComment: e.target.value })}
                             />
                           </div>

                           <div className="space-y-3">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">推奨理由</p>
                             <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                               {[0, 1, 2].map((index) => (
                                 <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                                   <input
                                     placeholder={`理由タイトル ${index + 1}`}
                                     className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black outline-none focus:ring-4 focus:ring-primary/10"
                                     value={pp.recommendationReasons?.[index]?.title ?? ''}
                                     onChange={e => {
                                       const reasons = [...(pp.recommendationReasons ?? [{ title: '', detail: '' }, { title: '', detail: '' }, { title: '', detail: '' }])];
                                       reasons[index] = { ...(reasons[index] ?? { title: '', detail: '' }), title: e.target.value };
                                       updateProduct(pp.productId, { recommendationReasons: reasons });
                                     }}
                                   />
                                   <textarea
                                     placeholder={`推奨理由 ${index + 1}`}
                                     rows={3}
                                     className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-relaxed outline-none focus:ring-4 focus:ring-primary/10"
                                     value={pp.recommendationReasons?.[index]?.detail ?? ''}
                                     onChange={e => {
                                       const reasons = [...(pp.recommendationReasons ?? [{ title: '', detail: '' }, { title: '', detail: '' }, { title: '', detail: '' }])];
                                       reasons[index] = { ...(reasons[index] ?? { title: '', detail: '' }), detail: e.target.value };
                                       updateProduct(pp.productId, { recommendationReasons: reasons });
                                     }}
                                   />
                                 </div>
                               ))}
                             </div>
                           </div>

                           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                             <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">発注予定日</label>
                               <JapaneseDatePicker
                                 value={pp.orderPlannedDate ?? ''}
                                 onChange={(dateValue) => updateProduct(pp.productId, { orderPlannedDate: dateValue })}
                                 placeholder="発注予定日"
                               />
                             </div>
                             <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">配送方法</label>
                               <select
                                 className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition-all focus:ring-4 focus:ring-primary/10 appearance-none"
                                 value={pp.deliveryMethod ?? ProjectProductDeliveryMethod.WAREHOUSE}
                                 onChange={e => updateProduct(pp.productId, { deliveryMethod: e.target.value as ProjectProductDeliveryMethod })}
                               >
                                 {Object.values(ProjectProductDeliveryMethod).map((method) => (
                                   <option key={method} value={method}>{deliveryMethodLabelMap[method]}</option>
                                 ))}
                               </select>
                             </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">備考</label>
                 <textarea
                   rows={3}
                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                   value={projectData.remarks ?? ''}
                   onChange={e => setProjectData(prev => ({ ...prev, remarks: e.target.value }))}
                 />
               </div>

               <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-2xl space-y-6">
                  <div className="flex justify-between items-end border-b border-white/10 pb-6">
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">予想粗利益合計</p>
                        <p className="text-4xl font-black text-emerald-400">¥{calculateTotals().totalProfit.toLocaleString()}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">粗利率</p>
                        <p className="text-2xl font-black text-primary">
                           {calculateTotals().totalRevenue > 0
                              ? ((calculateTotals().totalProfit / calculateTotals().totalRevenue) * 100).toFixed(1)
                              : 0}%
                        </p>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 text-sm">
                     <div className="flex justify-between">
                        <span className="text-slate-500 font-bold uppercase tracking-widest">合計販売数量</span>
                        <span className="font-bold">{projectData.products?.reduce((acc, p) => acc + p.quantity, 0)} 個</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500 font-bold uppercase tracking-widest">予想売上合計</span>
                        <span className="font-bold">¥{calculateTotals().totalRevenue.toLocaleString()}</span>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onCancel()}
            className="px-8 py-4 text-slate-500 font-black hover:text-slate-800 transition-colors uppercase tracking-widest text-xs"
          >
            {step === 1 ? '作成をキャンセル' : 'ステップ ' + (step - 1) + ' に戻る'}
          </button>
          <div className="flex gap-4">
             <button
               onClick={handleSaveDraft}
               className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-black flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm"
             >
               下書き保存
             </button>
             <button
               onClick={() => {
                  if (step === 1 && (!projectData.title || !projectData.clientId)) {
                     onNotify?.({
                       tone: 'error',
                       title: '入力を確認してください',
                       message: '案件名とクライアント名を入力してください。',
                     });
                     return;
                  }
                  if (step === 3) handleComplete();
                  else setStep(step + 1);
               }}
               className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-3 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200"
             >
               {step === 3 ? '案件を確定する' : '次のステップへ'} <ArrowRight size={20} />
             </button>
          </div>
        </div>
      </div>

      {/* Side-Floating Product Selector Modal */}
      {isProductSelectorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsProductSelectorOpen(false)} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="relative h-full w-full max-w-5xl bg-white shadow-2xl flex flex-col z-[110]"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div>
                  <h3 className="text-2xl font-black text-slate-900">商品カタログ</h3>
                  <p className="text-sm text-slate-500 font-medium">クリックして今回の案件に追加します。</p>
               </div>
               <button onClick={() => setIsProductSelectorOpen(false)} className="p-3 hover:bg-white rounded-full transition-colors text-slate-400">
                  <X size={28} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <ProductCatalog products={products} onSelect={(p) => { addProduct(p); /* keeps it open as requested for batch adding */ }} isSelectionMode />
            </div>

            <div className="p-8 border-t border-slate-100 bg-white">
               <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">現在のアドオン</p>
                    <p className="text-lg font-black text-primary">{projectData.products?.length} 商品が選択済み</p>
                  </div>
                  <button
                    onClick={() => setIsProductSelectorOpen(false)}
                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-2xl shadow-slate-200 hover:scale-105 transition-all"
                  >
                    選定を終了
                  </button>
               </div>
               <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                  {projectData.products?.map(pp => {
                    const product = products.find(d => d.id === pp.productId);
                    return (
                      <div key={pp.productId} className="flex-shrink-0 relative">
                         <img src={product?.images[0]} loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover bg-slate-50 border border-slate-200" alt="" />
                         <button
                            onClick={() => removeProduct(pp.productId)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                         >
                            <X size={10} />
                         </button>
                      </div>
                    );
                  })}
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const DocumentExportPanel = ({
  title,
  format,
  document,
  isLoading,
  onDownload,
  onRegenerate,
}: {
  title: string;
  format: string;
  document?: GeneratedDocument;
  isLoading: boolean;
  onDownload: () => void;
  onRegenerate: () => void;
}) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format}</p>
        <h5 className="font-black text-slate-900">{title}</h5>
        <p className="text-xs text-slate-400 font-medium mt-1 truncate max-w-[220px]">
          {document ? document.originalName : '未生成'}
        </p>
      </div>
      <Badge status={document ? 'READY' : 'DRAFT'}>{document ? '保存済み' : '未生成'}</Badge>
    </div>
    <div className="flex gap-2">
      <button
        onClick={onDownload}
        disabled={isLoading}
        className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? '処理中...' : document ? 'ダウンロード' : '生成'}
      </button>
      <button
        onClick={onRegenerate}
        disabled={isLoading}
        className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-black hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        再生成
      </button>
    </div>
  </div>
);

const ProjectManagement = ({
  projects,
  products,
  clients = [],
  users = [],
  currentUser,
  onUpdate,
  onAdd,
  onDelete,
  onUpdateOrderStatus,
  onNotify,
}: {
  projects: Project[],
  products: Product[],
  clients?: Client[],
  users?: User[],
  currentUser?: User | null,
  onUpdate: (p: Project) => void,
  onAdd: (p: Project) => void,
  onDelete: (id: string) => void,
  onUpdateOrderStatus?: (projectId: string, orderId: string, status: OrderStatus) => Promise<OrderRequest | undefined>,
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void,
}) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [draftProjectForEdit, setDraftProjectForEdit] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [projectCompositionFilter, setProjectCompositionFilter] = useState<'ALL' | 'SINGLE' | 'MULTI' | 'ADOPTED'>('ALL');
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ORDERS'>('DETAILS');
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [manualAddStep, setManualAddStep] = useState<'SELECT' | 'CUSTOMIZE' | null>(null);
  const [selectedProductForManual, setSelectedProductForManual] = useState<Product | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<GeneratedDocument[]>([]);
  const [documentLoading, setDocumentLoading] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const location = useLocation();
  const canManageProjects = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.PRODUCT_MANAGER;
  const isSupplierUser = currentUser?.role === UserRole.SUPPLIER;
  const salesUsers = useMemo(() => users.filter((user) => user.role === UserRole.SALES && !user.deleted), [users]);
  const supplierOrderNotifications = useMemo(
    () => isSupplierUser
      ? projects.flatMap((project) => (project.orderRequests ?? []).map((order) => ({ project, order })))
      : [],
    [isSupplierUser, projects],
  );

  const handleAddProject = (newProject: Project) => {
    onAdd(newProject);
    setIsWizardOpen(false);
    setDraftProjectForEdit(null);
  };

  const handleUpdateProject = (updated: Project) => {
    onUpdate(updated);
    setSelectedProject(updated);
    setIsEditingProject(false);
    setDraftProjectForEdit(null);
    setIsWizardOpen(false);
  };

  const handleSaveProjectDraft = (project: Project) => {
    if (draftProjectForEdit) {
      handleUpdateProject(project);
    } else {
      handleAddProject(project);
    }
  };

  const handleDeleteProject = (id: string) => {
    onDelete(id);
    setSelectedProject(null);
  };

  const applyOrderStatusToSelectedProject = (updatedOrder: OrderRequest) => {
    setSelectedProject((current) => {
      if (!current) return current;
      return {
        ...current,
        orderRequests: (current.orderRequests ?? []).map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order,
        ),
        products: current.products.map((product) =>
          product.productId === updatedOrder.productId
            ? { ...product, orderStatus: updatedOrder.status }
            : product,
        ),
      };
    });
  };

  const handleChangeOrderStatus = async (orderRequest: OrderRequest, status: OrderStatus) => {
    if (!selectedProject || !onUpdateOrderStatus) return;
    const updatedOrder = await onUpdateOrderStatus(selectedProject.id, orderRequest.id, status);
    if (updatedOrder) {
      applyOrderStatusToSelectedProject(updatedOrder);
    }
  };

  const loadProjectDocuments = useCallback((projectId: string) => {
    api.listProjectDocuments(projectId)
      .then((response) => {
        setProjectDocuments(response.documents);
        setDocumentError(null);
      })
      .catch((err) => {
        setDocumentError(err instanceof Error ? err.message : 'ドキュメント一覧の取得に失敗しました。');
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectId = params.get('projectId');
    if (!projectId) return;
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    setSelectedProject(project);
    setActiveTab(params.get('tab') === 'ORDERS' ? 'ORDERS' : 'DETAILS');
    setProjectDocuments([]);
    if (canManageProjects) loadProjectDocuments(project.id);
  }, [canManageProjects, loadProjectDocuments, location.search, projects]);

  const openGeneratedDocument = (document: GeneratedDocument) => {
    const link = window.document.createElement('a');
    link.href = document.downloadUrl;
    link.download = document.originalName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleGenerateDocument = (documentType: 'proposal-pptx' | 'pl-xlsx', force = false) => {
    if (!selectedProject) return;
    const shouldForce = force || documentType === 'proposal-pptx';
    setDocumentLoading(`${documentType}:${shouldForce ? 'force' : 'reuse'}`);
    setDocumentError(null);
    api.generateProjectDocument(selectedProject.id, documentType, shouldForce)
      .then((response) => {
        setProjectDocuments((current) => [
          response.document,
          ...current.filter((document) => document.purpose !== response.document.purpose),
        ]);
        openGeneratedDocument(response.document);
        onNotify?.({
          tone: 'success',
          title: response.reused ? 'ドキュメントを開きました' : 'ドキュメントを生成しました',
          message: response.document.originalName,
        });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'ドキュメント生成に失敗しました。';
        setDocumentError(message);
        onNotify?.({
          tone: 'error',
          title: 'ドキュメント生成に失敗しました',
          message,
        });
      })
      .finally(() => setDocumentLoading(null));
  };

  const latestProposal = projectDocuments.find((document) => document.purpose === 'PROJECT_PROPOSAL_PPTX');
  const latestProfitAndLoss = projectDocuments.find((document) => document.purpose === 'PROJECT_PL_XLSX');

  const projectClients = useMemo(() => {
    const clientMap = new Map<string, string>();
    clients.forEach((client) => clientMap.set(client.id, client.name));
    projects.forEach((project) => clientMap.set(project.clientId, project.clientName));
    return Array.from(clientMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, projects]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch = !normalizedSearch ||
        project.title.toLowerCase().includes(normalizedSearch) ||
        project.clientName.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
      const matchesClient = clientFilter === 'ALL' || project.clientId === clientFilter;
      const matchesComposition =
        projectCompositionFilter === 'ALL' ||
        (projectCompositionFilter === 'SINGLE' && project.products.length === 1) ||
        (projectCompositionFilter === 'MULTI' && project.products.length > 1) ||
        (projectCompositionFilter === 'ADOPTED' && project.products.some((product) => product.isAdopted));
      return matchesSearch && matchesStatus && matchesClient && matchesComposition;
    });
  }, [clientFilter, projectCompositionFilter, projects, searchQuery, statusFilter]);

  if (isWizardOpen) {
    return (
      <ProjectWizard
        onComplete={draftProjectForEdit ? handleUpdateProject : handleAddProject}
        onSaveDraft={handleSaveProjectDraft}
        onCancel={() => {
          setIsWizardOpen(false);
          setDraftProjectForEdit(null);
        }}
        products={products}
        clients={clients}
        salesUsers={salesUsers}
        initialProject={draftProjectForEdit}
        onNotify={onNotify}
      />
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{isSupplierUser ? '関連案件・発注通知' : '案件管理'}</h1>
            <p className="text-slate-500">
              {isSupplierUser
                ? '自社商品に発注依頼が届いた案件のみ確認できます。'
                : '提案中の案件および成約済み案件の管理を行います。'}
            </p>
          </div>
          {canManageProjects && (
            <button
              onClick={() => {
                setDraftProjectForEdit(null);
                setIsWizardOpen(true);
              }}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/10 hover:bg-emerald-700 transition-all"
            >
              <Plus size={20} /> 新規案件を作成
            </button>
          )}
        </div>

        {isSupplierUser && supplierOrderNotifications.length > 0 && (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <Bell size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-emerald-700">新しい発注対象があります</p>
                <p className="mt-1 text-xs font-bold text-emerald-600/80">
                  自社商品に関する発注通知が {supplierOrderNotifications.length} 件あります。関連案件の詳細から発注状況を確認してください。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={cn(stickyToolbarClass, "p-4 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 lg:grid-cols-[1fr_repeat(3,220px)] gap-3 items-center")}>
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="案件名、クライアント名で検索..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <label className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-600 outline-none appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">すべてのステータス</option>
              {Object.values(ProjectStatus).map(s => (
                      <option key={s} value={s}>{projectStatusMap[s] ?? s}</option>
              ))}
            </select>
          </label>
          <label className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-600 outline-none appearance-none"
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
            >
              <option value="ALL">すべてのクライアント</option>
              {projectClients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label className="relative">
            <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-600 outline-none appearance-none"
              value={projectCompositionFilter}
              onChange={(event) => setProjectCompositionFilter(event.target.value as typeof projectCompositionFilter)}
            >
              <option value="ALL">商品構成すべて</option>
              <option value="SINGLE">1商品案件</option>
              <option value="MULTI">複数商品案件</option>
              <option value="ADOPTED">採用商品あり</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((proj) => (
            <div key={proj.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
              <div className="flex items-center gap-4 flex-1">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner",
                  proj.status === ProjectStatus.ADOPTED ? "bg-green-50 text-green-600" : (proj.status === ProjectStatus.REJECTED ? "bg-red-50 text-red-600" : "bg-primary-light text-primary")
                )}>
                  {proj.clientName.substring(0, 1)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Badge status={proj.status}>{projectStatusMap[proj.status] || proj.status}</Badge>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{proj.id}</span>
                  </div>
                  <h3 className="font-black text-slate-900 text-xl group-hover:text-primary transition-colors uppercase tracking-tight">{proj.title}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{proj.clientName} • 更新: {proj.updatedAt}</p>
                </div>
              </div>

              {isSupplierUser ? (
                <div className="flex items-center gap-6 px-10 border-x border-slate-50 h-10">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">自社商品</p>
                    <p className="font-black text-slate-900 text-lg">{proj.products.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 text-emerald-400">発注通知</p>
                    <p className="font-black text-emerald-600 text-lg">{proj.orderRequests?.length ?? 0}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-10 px-10 border-x border-slate-50 h-10">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">売上</p>
                    <p className="font-black text-slate-900 text-lg">¥{proj.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 text-emerald-400">利益</p>
                    <p className="font-black text-emerald-600 text-lg">¥{proj.totalProfit.toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                {canManageProjects && proj.status === ProjectStatus.DRAFT && (
                  <button
                    onClick={() => {
                      setDraftProjectForEdit(proj);
                      setIsWizardOpen(true);
                    }}
                    className="px-5 py-3 bg-white text-primary border border-primary/10 rounded-xl font-black text-sm hover:bg-primary-light transition-all"
                  >
                    下書きを編集
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedProject(proj);
                    setProjectDocuments([]);
                    setActiveTab((isSupplierUser && (proj.orderRequests?.length ?? 0) > 0) ? 'ORDERS' : 'DETAILS');
                    if (canManageProjects) loadProjectDocuments(proj.id);
                  }}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-100"
                >
                  詳細を表示
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-end overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedProject(null)} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative h-full w-full max-w-4xl bg-white shadow-2xl flex flex-col z-[70]"
          >

            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-3">
                <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                  <X size={24} />
                </button>
                <h2 className="text-xl font-black text-slate-900">案件詳細マネージャ</h2>
              </div>
              <div className="flex items-center gap-3">
                 {canManageProjects && selectedProject.status === ProjectStatus.DRAFT && (
                   <button
                     onClick={() => {
                       setDraftProjectForEdit(selectedProject);
                       setSelectedProject(null);
                       setIsWizardOpen(true);
                     }}
                     className="px-4 py-2.5 bg-white border border-primary/10 text-primary rounded-xl text-sm font-black hover:bg-primary-light transition-all"
                   >
                     下書きを編集
                   </button>
                 )}
                 {canManageProjects && (
                   <select
                     className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-600 outline-none"
                     value={selectedProject.assignedSalesUserId ?? ''}
                     onChange={(e) => handleUpdateProject({
                       ...selectedProject,
                       assignedSalesUserId: e.target.value || undefined,
                       assignedSalesUserName: salesUsers.find(user => user.id === e.target.value)?.name,
                       updatedAt: new Date().toISOString().split('T')[0],
                     })}
                   >
                     <option value="">営業未割当</option>
                     {salesUsers.map(user => (
                       <option key={user.id} value={user.id}>{user.name}</option>
                     ))}
                   </select>
                 )}
                 {canManageProjects && (
                   <select
                     className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-600 outline-none"
                     value={selectedProject.status}
                     onChange={(e) => handleUpdateProject({ ...selectedProject, status: e.target.value as ProjectStatus, updatedAt: new Date().toISOString().split('T')[0] })}
                   >
                     {Object.values(ProjectStatus).map(s => (
                       <option key={s} value={s}>{projectStatusMap[s] ?? s}</option>
                     ))}
                   </select>
                 )}
                 <Badge status={selectedProject.status}>{projectStatusMap[selectedProject.status] || selectedProject.status}</Badge>
                 {canManageProjects && (
                   <button
                     onClick={() => handleDeleteProject(selectedProject.id)}
                     className="p-3 border border-red-100 text-red-500 rounded-2xl hover:bg-red-50 transition-all"
                     aria-label="案件を削除"
                   >
                     <Trash2 size={18} />
                   </button>
                 )}
              </div>
            </div>

            <div className="flex border-b border-slate-100 bg-white sticky top-0 z-10">
               <button
                 onClick={() => setActiveTab('DETAILS')}
                 className={cn(
                   "flex-1 py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all",
                   activeTab === 'DETAILS' ? "border-primary text-primary bg-primary-light/60" : "border-transparent text-slate-400 hover:text-slate-600"
                 )}
               >
                 基本情報 & 商品
               </button>
               <button
                 onClick={() => setActiveTab('ORDERS')}
                 className={cn(
                   "flex-1 py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all",
                   activeTab === 'ORDERS' ? "border-primary text-primary bg-primary-light/60" : "border-transparent text-slate-400 hover:text-slate-600"
                 )}
               >
                 発注管理
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               {activeTab === 'DETAILS' ? (
                 isEditingProject ? (
                   <div className="max-w-xl space-y-8 animate-in slide-in-from-right-4 duration-300">
                      <h3 className="text-2xl font-black text-slate-900">案件基本情報の編集</h3>
                      <form
                        onSubmit={(e) => {
                           e.preventDefault();
                           const formData = new FormData(e.target as HTMLFormElement);
                           const clientId = formData.get('clientId') as string;
                           const client = clients.find(c => c.id === clientId);
                           handleUpdateProject({
                              ...selectedProject,
                              title: formData.get('title') as string,
                              proposalBackground: formData.get('proposalBackground') as string,
                              recommendationPoints: [
                                formData.get('recommendationPoint1') as string,
                                formData.get('recommendationPoint2') as string,
                                formData.get('recommendationPoint3') as string,
                              ].filter(Boolean),
                              remarks: formData.get('remarks') as string,
                              clientId: clientId,
                              clientName: client?.name || selectedProject.clientName,
                              updatedAt: new Date().toISOString().split('T')[0]
                           });
                        }}
                        className="space-y-6"
                      >
                         <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">案件名</label>
                            <input
                              name="title"
                              defaultValue={selectedProject.title}
                              required
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">提案背景</label>
                            <textarea name="proposalBackground" defaultValue={selectedProject.proposalBackground} rows={4} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold" />
                         </div>
                         <div className="space-y-3">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">おすすめポイント</label>
                            {[0, 1, 2].map((index) => (
                              <input key={index} name={`recommendationPoint${index + 1}`} defaultValue={selectedProject.recommendationPoints?.[index] ?? ''} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold" />
                            ))}
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">備考</label>
                            <textarea name="remarks" defaultValue={selectedProject.remarks} rows={3} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">クライアント</label>
                            <select
                              name="clientId"
                              defaultValue={selectedProject.clientId}
                              required
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold appearance-none"
                            >
                              {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                         </div>
                         <div className="flex gap-4 pt-4">
                            <button
                              type="button"
                              onClick={() => setIsEditingProject(false)}
                              className="flex-1 py-4 text-slate-400 font-black hover:text-slate-600 uppercase tracking-widest text-xs"
                            >
                              キャンセル
                            </button>
                            <button
                              type="submit"
                              className="flex-1 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/10 hover:scale-105 transition-all uppercase tracking-widest text-xs"
                             >
                               変更を保存
                             </button>
                          </div>
                      </form>
                   </div>
                 ) : (
                 <div className="space-y-10">
                   <div className="flex justify-between items-start">
                     <div className="space-y-2">
                       <p className="text-sm font-bold text-primary uppercase tracking-widest">{selectedProject.clientName}</p>
                       <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedProject.title}</h2>
                       <div className="flex items-center gap-4 text-xs text-slate-400 font-bold uppercase tracking-widest">
                         <span>ID: {selectedProject.id}</span>
                         <span>•</span>
                         <span>作成: {selectedProject.createdAt}</span>
                         {selectedProject.assignedSalesUserName && (
                           <>
                             <span>•</span>
                             <span>営業担当: {selectedProject.assignedSalesUserName}</span>
                           </>
                         )}
                       </div>
                     </div>
                     {canManageProjects && (
                       <button
                         onClick={() => setIsEditingProject(true)}
                         className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                       >
                         <Edit size={20} />
                       </button>
                     )}
                  </div>

                  {isSupplierUser ? (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
                        <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">自社提案商品</p>
                        <p className="text-3xl font-black">{selectedProject.products.length}</p>
                      </div>
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 text-emerald-700">
                        <p className="text-[10px] font-bold text-emerald-400 mb-2 uppercase tracking-widest">発注通知</p>
                        <p className="text-3xl font-black">{selectedProject.orderRequests?.length ?? 0}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
                        <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">売上合計(想定)</p>
                        <p className="text-3xl font-black">¥{selectedProject.totalRevenue.toLocaleString()}</p>
                      </div>
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 text-emerald-700">
                        <p className="text-[10px] font-bold text-emerald-400 mb-2 uppercase tracking-widest">利益合計(想定)</p>
                        <p className="text-3xl font-black">¥{selectedProject.totalProfit.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {canManageProjects && (
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                    <div>
                      <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        <FileText className="text-primary" size={20} />
                        出力済みドキュメント
                      </h4>
                      <p className="text-xs text-slate-400 font-bold mt-1">生成済みの提案書と損益計算書を保存し、再ダウンロードできます。</p>
                    </div>
                    {documentError && (
                      <div className="px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertCircle size={16} /> {documentError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DocumentExportPanel
                        title="提案書"
                        format="PPTX"
                        document={latestProposal}
                        isLoading={documentLoading?.startsWith('proposal-pptx') ?? false}
                        onDownload={() => handleGenerateDocument('proposal-pptx', true)}
                        onRegenerate={() => handleGenerateDocument('proposal-pptx', true)}
                      />
                      <DocumentExportPanel
                        title="損益計算書"
                        format="XLSX"
                        document={latestProfitAndLoss}
                        isLoading={documentLoading?.startsWith('pl-xlsx') ?? false}
                        onDownload={() => latestProfitAndLoss ? openGeneratedDocument(latestProfitAndLoss) : handleGenerateDocument('pl-xlsx')}
                        onRegenerate={() => handleGenerateDocument('pl-xlsx', true)}
                      />
                    </div>
                  </div>
                  )}

                  <div className="space-y-6">
                    <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                      <Package className="text-primary" size={20} />
                      提案中商品リスト
                    </h4>

                    <div className="space-y-4">
                      {selectedProject.products.filter(pp => !pp.allowOrder).length > 0 ? selectedProject.products.filter(pp => !pp.allowOrder).map(pp => {
                        const product = products.find(d => d.id === pp.productId);

                        const handleAdoptProduct = () => {
                           if (selectedProject.status !== ProjectStatus.ADOPTED) {
                             onNotify?.({
                               tone: 'info',
                               title: '成約後に発注へ切り替えできます',
                               message: '案件ステータスを成約に変更してから発注管理へ移動してください。',
                             });
                             return;
                           }
                           const today = new Date().toISOString().split('T')[0];
                           const updatedProducts = selectedProject.products.map(p =>
                             p.productId === pp.productId
                               ? {
                                   ...p,
                                   isAdopted: true,
                                   adoptionDate: p.adoptionDate || today,
                                   companyProductCode: p.companyProductCode || `CMP-${today.replace(/-/g, '')}-${pp.productId.slice(0, 6)}`,
                                   allowPublish: p.allowPublish ?? false,
                                   allowOrder: true,
                                 }
                               : p
                           );

                           const newOrderRequest: OrderRequest = {
                             id: `ORD-${Math.floor(Math.random() * 10000)}`,
                             projectId: selectedProject.id,
                             productId: pp.productId,
                             productName: product?.name || 'Unknown',
                             supplierId: product?.supplierId || 'Unknown',
                             quantity: pp.quantity,
                             status: OrderStatus.REQUESTED,
                             orderType: 'NEW',
                             createdAt: today,
                             deliveryDate: '未定',
                             deliveryLocation: selectedProject.clientName
                           };

                           handleUpdateProject({
                             ...selectedProject,
                             products: updatedProducts,
                             orderRequests: [...(selectedProject.orderRequests || []), newOrderRequest],
                             updatedAt: new Date().toISOString().split('T')[0]
                           });
                        };

                        return (
                          <div key={pp.productId} className="p-6 bg-white border border-slate-100 rounded-3xl flex flex-col md:flex-row items-center gap-6 group hover:border-primary/20 transition-all">
                             <img src={product?.images[0]} loading="lazy" decoding="async" className="w-20 h-20 rounded-2xl object-cover bg-slate-50 border border-slate-100" alt="" />
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                   <div className="flex items-center gap-2">
                                      <p className="font-black text-slate-900 text-lg uppercase truncate">{product?.name}</p>
                                      <Badge status={pp.isAdopted ? 'ADOPTED' : 'PROPOSED'}>{pp.isAdopted ? '採用推奨' : '提案中'}</Badge>
                                   </div>
                                   {canManageProjects && (
                                      <button
                                        onClick={handleAdoptProduct}
                                        disabled={selectedProject.status !== ProjectStatus.ADOPTED}
                                        title={selectedProject.status !== ProjectStatus.ADOPTED ? '成約後に発注へ切り替えできます。' : undefined}
                                        className={cn(
                                          "px-4 py-2 text-[10px] font-black rounded-lg transition-all shadow-md uppercase tracking-widest",
                                          selectedProject.status === ProjectStatus.ADOPTED
                                            ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100"
                                            : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none",
                                        )}
                                      >
                                        発注に切り替える
                                      </button>
                                   )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                   {!isSupplierUser && (
                                     <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">提案単価</p>
                                        <p className="font-black text-slate-900">¥{pp.sellingPrice.toLocaleString()}</p>
                                     </div>
                                   )}
                                   <div className="space-y-0.5">
                                      <p className="text-[10px] font-black text-slate-400 uppercase">数量</p>
                                      <p className="font-black text-slate-900">{pp.quantity}</p>
                                   </div>
                                   {!isSupplierUser && (
                                     <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase font-black text-emerald-500">見込み利益</p>
                                        <p className="font-black text-emerald-600">¥{((pp.sellingPrice - pp.cost) * pp.quantity).toLocaleString()}</p>
                                     </div>
                                   )}
                                   <div className="space-y-0.5">
                                      <p className="text-[10px] font-black text-slate-400 uppercase">配送方法</p>
                                      <p className="font-black text-slate-900">{deliveryMethodLabelMap[pp.deliveryMethod ?? ProjectProductDeliveryMethod.WAREHOUSE]}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                        );
                      }) : (
                        <div className="py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-2">
                          <CheckCircle2 className="text-emerald-300" size={36} />
                          <p className="text-sm font-black text-slate-500">提案中の商品はありません</p>
                          <p className="text-xs font-bold text-slate-400">発注へ切り替えた商品は「発注管理」タブで確認できます。</p>
                        </div>
                      )}
                    </div>
                  </div>
               </div>
             )) : (
               <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                       <div>
                          <h3 className="text-xl font-black text-slate-900">発注管理</h3>
                          <p className="text-sm text-slate-500">プロジェクトごとの商品発注状況を管理・追跡します。</p>
                       </div>
                       {canManageProjects && (
                         <span className="px-4 py-2.5 rounded-xl bg-slate-50 text-xs font-black text-slate-400 border border-slate-100">
                           手動追加は現在無効です
                         </span>
                       )}
                    </div>

                    <div className="space-y-4">
                       {selectedProject.products.filter(pp => pp.allowOrder).length > 0 ? (
                          selectedProject.products.filter(pp => pp.allowOrder).map(pp => {
                            const product = products.find(d => d.id === pp.productId);
                            const orderRequest = selectedProject.orderRequests?.find(or => or.productId === pp.productId);
                            const canSupplierMarkShipped = Boolean(
                              isSupplierUser &&
                              orderRequest &&
                              ![OrderStatus.SHIPPED, OrderStatus.RECEIVED, OrderStatus.CANCELLED].includes(orderRequest.status),
                            );
                            const canManagerMarkReceived = Boolean(
                              canManageProjects &&
                              orderRequest?.status === OrderStatus.SHIPPED,
                            );
                            return (
                              <div key={pp.productId} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col gap-6 md:flex-row md:items-center hover:border-emerald-200 transition-all">
                                <img src={product?.images[0]} loading="lazy" decoding="async" className="w-20 h-20 rounded-2xl object-cover bg-slate-50 border border-slate-100" alt="" />
                                <div className="flex-1 min-w-0 space-y-3">
                                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-black text-slate-900 text-lg uppercase truncate">{product?.name ?? pp.productId}</p>
                                        <Badge status="ADOPTED">採用</Badge>
                                      </div>
                                      <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        {orderRequest?.id ?? 'ORDER READY'} • {orderRequest?.createdAt ?? pp.adoptionDate ?? '未生成'}
                                      </p>
                                    </div>
                                    <Badge status={orderRequest?.status ?? OrderStatus.REQUESTED}>{orderStatusMap[orderRequest?.status ?? OrderStatus.REQUESTED]}</Badge>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {!isSupplierUser && (
                                      <div className="p-3 bg-slate-50 rounded-2xl">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">提案単価</p>
                                        <p className="font-black text-slate-900">¥{pp.sellingPrice.toLocaleString()}</p>
                                      </div>
                                    )}
                                    <div className="p-3 bg-slate-50 rounded-2xl">
                                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">数量</p>
                                      <p className="font-black text-slate-900">{pp.quantity}</p>
                                    </div>
                                    {!isSupplierUser && (
                                      <div className="p-3 bg-emerald-50 rounded-2xl">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">見込み利益</p>
                                        <p className="font-black text-emerald-600">¥{((pp.sellingPrice - pp.cost) * pp.quantity).toLocaleString()}</p>
                                      </div>
                                    )}
                                    <div className="p-3 bg-slate-50 rounded-2xl">
                                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">納品希望日</p>
                                      <p className="font-black text-slate-900">{orderRequest?.deliveryDate ?? '未定'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-2xl">
                                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">配送方法</p>
                                      <p className="font-black text-slate-900">{deliveryMethodLabelMap[pp.deliveryMethod ?? ProjectProductDeliveryMethod.WAREHOUSE]}</p>
                                    </div>
                                  </div>
                                  {(canSupplierMarkShipped || canManagerMarkReceived) && orderRequest && (
                                    <div className="flex justify-end">
                                      {canSupplierMarkShipped && (
                                        <button
                                          type="button"
                                          onClick={() => void handleChangeOrderStatus(orderRequest, OrderStatus.SHIPPED)}
                                          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-colors"
                                        >
                                          発送済みにする
                                        </button>
                                      )}
                                      {canManagerMarkReceived && (
                                        <button
                                          type="button"
                                          onClick={() => void handleChangeOrderStatus(orderRequest, OrderStatus.RECEIVED)}
                                          className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-lg shadow-primary/10 hover:bg-emerald-700 transition-colors"
                                        >
                                          受取済みにする
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                       ) : (
                          <div className="py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
                             <ShoppingCart className="text-slate-200" size={48} />
                             <div>
                                <p className="text-slate-400 font-bold">まだ発注依頼はありません</p>
                                <p className="text-xs text-slate-300 font-medium mt-1">成約済みの商品に対して発注依頼を作成してください。</p>
                             </div>
                          </div>
                       )}
                    </div>
                 </div>
               )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Project Info Modal */}
      {isEditingProject && selectedProject && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center p-6 overflow-y-auto custom-scrollbar">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditingProject(false)} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6 my-auto"
          >
             <h3 className="text-xl font-black text-slate-900">案件情報の基本編集</h3>
             <div className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">案件名</label>
                   <input
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                     defaultValue={selectedProject.title}
                     id="edit-project-title"
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">クライアント名</label>
                   <input
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                     defaultValue={selectedProject.clientName}
                     id="edit-project-client"
                   />
                </div>
             </div>
             <div className="flex gap-4">
                <button onClick={() => setIsEditingProject(false)} className="flex-1 py-4 text-slate-500 font-bold hover:text-slate-800">CANCEL</button>
                <button
                  onClick={() => {
                    const title = (document.getElementById('edit-project-title') as HTMLInputElement).value;
                    const client = (document.getElementById('edit-project-client') as HTMLInputElement).value;
                    handleUpdateProject({ ...selectedProject, title, clientName: client, updatedAt: new Date().toISOString().split('T')[0] });
                  }}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/10"
                >
                  SAVE CHANGES
                </button>
             </div>
          </motion.div>
        </div>
      )}

      {/* Manual Add Step 1: Select */}
      {manualAddStep === 'SELECT' && selectedProject && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setManualAddStep(null)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">商品カタログ</h3>
                  <p className="text-slate-400 font-medium">クリックして今回の案件に追加します。</p>
                </div>
                <button onClick={() => setManualAddStep(null)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="商品名、カテゴリ、JANで検索..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-slate-600"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 custom-scrollbar bg-[#F8FAFB]">
               {products.filter(p =>
                 p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 p.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
               ).map(p => {
                 const isAlreadyAdded = selectedProject.products.some(pp => pp.productId === p.id);
                 return (
                   <div
                     key={p.id}
                     onClick={() => !isAlreadyAdded && (setSelectedProductForManual(p), setManualAddStep('CUSTOMIZE'))}
                     className={cn(
                       "bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all group cursor-pointer flex flex-col overflow-hidden",
                       isAlreadyAdded && "opacity-60 cursor-not-allowed grayscale-[0.5]"
                     )}
                   >
                     <div className="relative aspect-video overflow-hidden">
                        <img src={p.images[0]} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute top-4 left-4">
                           <span className="bg-white/90 backdrop-blur-md text-[10px] font-black text-slate-900 px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider">
                              {p.categoryName}
                           </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="w-full bg-primary text-white py-3 rounded-2xl flex items-center justify-center gap-2 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform font-black text-xs uppercase tracking-widest">
                              <Plus size={18} strokeWidth={3} />
                              選択して追加
                           </div>
                        </div>
                        {isAlreadyAdded && (
                           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                              <span className="text-[10px] bg-white text-slate-900 px-6 py-2.5 rounded-full font-black uppercase tracking-widest shadow-2xl">案件に追加済み</span>
                           </div>
                        )}
                     </div>
                     <div className="p-8 flex flex-col">
                        <div className="flex items-start justify-between gap-4 mb-4">
                           <h4 className="font-black text-slate-900 text-xl uppercase leading-tight flex-1">{p.name}</h4>
                           <span className="text-[10px] font-black text-slate-300 mt-1">v{p.version}</span>
                        </div>
                        <div className="pt-6 border-t border-slate-50 flex items-end justify-between">
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">原価</p>
                              <div className="flex items-baseline gap-1">
                                 <span className="text-sm font-black text-slate-400">¥</span>
                                 <span className="text-2xl font-black text-slate-900">{p.cost.toLocaleString()}</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">サプライヤー</p>
                              <p className="text-xs font-black text-slate-600 truncate max-w-[120px]">{p.supplierName}</p>
                           </div>
                        </div>
                     </div>
                   </div>
                 );
               })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Manual Add Step 2: Customize */}
      {manualAddStep === 'CUSTOMIZE' && selectedProductForManual && selectedProject && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setManualAddStep('SELECT')} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative bg-white rounded-[48px] w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="p-10 bg-slate-900 text-white relative">
               <div className="absolute top-0 right-0 p-10 opacity-10">
                  <Package size={120} strokeWidth={1} />
               </div>
               <div className="relative z-10">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">プロジェクト条件設定</p>
                  <h3 className="text-3xl font-black leading-tight uppercase">{selectedProductForManual.name}</h3>
               </div>
               <button onClick={() => setManualAddStep('SELECT')} className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full text-white/40 transition-colors">
                  <X size={24} />
               </button>
            </div>
            <form
              onSubmit={(e) => {
                 e.preventDefault();
                 const formData = new FormData(e.target as HTMLFormElement);
                 const quantity = Number(formData.get('quantity'));
                 const sellingPrice = Number(formData.get('sellingPrice'));
                 const cost = selectedProductForManual.cost;

                 const newProjectProduct: ProjectProduct = {
                    productId: selectedProductForManual.id,
                    proposalComment: '手動追加注文',
                    cost: cost,
                    sellingPrice: sellingPrice,
                    quantity: quantity,
                    isAdopted: true,
                    adoptionDate: new Date().toISOString().split('T')[0],
                    companyProductCode: `CMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${selectedProductForManual.id.slice(0, 6)}`,
                    allowPublish: false,
                    allowOrder: false
                 };

                 const newOrderRequest: OrderRequest = {
                    id: `ORD-${Math.floor(Math.random() * 10000)}`,
                    projectId: selectedProject.id,
                    productId: selectedProductForManual.id,
                    productName: selectedProductForManual.name,
                    supplierId: selectedProductForManual.supplierId,
                    quantity: quantity,
                    status: OrderStatus.REQUESTED,
                    orderType: 'NEW',
                    createdAt: new Date().toISOString().split('T')[0],
                    deliveryDate: '未定',
                    deliveryLocation: selectedProject.clientName
                 };

                 const updatedProducts = [...selectedProject.products, newProjectProduct];

                 const totalRevenue = updatedProducts.reduce((acc, p) => acc + (p.sellingPrice * p.quantity), 0);
                 const totalProfit = updatedProducts.reduce((acc, p) => acc + ((p.sellingPrice - p.cost) * p.quantity), 0);

                 handleUpdateProject({
                    ...selectedProject,
                    products: updatedProducts,
                    orderRequests: [...(selectedProject.orderRequests || []), newOrderRequest],
                    totalRevenue,
                    totalProfit,
                    updatedAt: new Date().toISOString().split('T')[0]
                 });
                 setManualAddStep(null);
                 setSelectedProductForManual(null);
              }}
              className="p-10 space-y-8"
            >
               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">提案数量</label>
                     <input
                       name="quantity"
                       type="number"
                       defaultValue={1}
                       required
                       min={1}
                       className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[24px] focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-2xl"
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">提案単価 (¥)</label>
                     <input
                       name="sellingPrice"
                       type="number"
                       defaultValue={selectedProductForManual.cost}
                       required
                       className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[24px] focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-2xl"
                     />
                  </div>
               </div>
               <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">1ユニットあたりの利益</p>
                     <p className="text-2xl font-black text-emerald-600">¥0</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                     <TrendingUp className="text-emerald-600" size={24} />
                  </div>
               </div>
               <div className="flex flex-col gap-4 pt-6">
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-[24px] font-black shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm">
                    プロジェクトに追加保存
                  </button>
                  <button type="button" onClick={() => setManualAddStep('SELECT')} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 border border-transparent hover:border-slate-100 rounded-2xl transition-all">
                    選び直す
                  </button>
               </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
};

const Dashboard = ({
  projects,
  products,
  suppliers,
  clients,
}: {
  projects: Project[],
  products: Product[],
  suppliers: Supplier[],
  clients: Client[],
}) => {
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const dashboardClients = useMemo(() => {
    const clientMap = new Map<string, string>();
    clients.forEach((client) => clientMap.set(client.id, client.name));
    projects.forEach((project) => clientMap.set(project.clientId, project.clientName));
    return Array.from(clientMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, projects]);

  const filteredDashboardProjects = useMemo(() => {
    const startDate = fromDateFilter ? new Date(`${fromDateFilter}T00:00:00`) : null;
    const endDate = toDateFilter ? new Date(`${toDateFilter}T23:59:59`) : null;

    return projects.filter((project) => {
      const projectDate = new Date(project.createdAt);
      const matchesRange = (!startDate || projectDate >= startDate) && (!endDate || projectDate <= endDate);
      const matchesClient = clientFilter === 'ALL' || project.clientId === clientFilter;
      const matchesSupplier = supplierFilter === 'ALL' || project.products.some((projectProduct) => (
        productById.get(projectProduct.productId)?.supplierId === supplierFilter
      ));
      return matchesRange && matchesClient && matchesSupplier;
    });
  }, [clientFilter, fromDateFilter, productById, projects, supplierFilter, toDateFilter]);

  const chartData = useMemo(() => [
    { name: '提案中', value: filteredDashboardProjects.filter(p => p.status === ProjectStatus.DRAFT || p.status === ProjectStatus.PROPOSED).length },
    { name: '成約済み', value: filteredDashboardProjects.filter(p => p.status === ProjectStatus.ADOPTED).length },
    { name: '失注', value: filteredDashboardProjects.filter(p => p.status === ProjectStatus.REJECTED).length },
  ], [filteredDashboardProjects]);

  const totalRevenue = useMemo(() => filteredDashboardProjects.reduce((acc, p) => acc + p.totalRevenue, 0), [filteredDashboardProjects]);
  const totalProfit = useMemo(() => filteredDashboardProjects.reduce((acc, p) => acc + p.totalProfit, 0), [filteredDashboardProjects]);
  const activeProductsCount = useMemo(
    () => products.filter((product) => supplierFilter === 'ALL' || product.supplierId === supplierFilter).length,
    [products, supplierFilter],
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">おかえりなさい、管理者様</h1>
          <p className="text-slate-500 text-sm mt-1">現在の業務ステータスと案件の進捗状況をリアルタイムで確認できます。</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-600">
            <Calendar size={16} className="text-slate-400" />
            {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm">
            <Download size={16} />
            エクスポート
          </button>
        </div>
      </div>

      <div className={cn(stickyToolbarClass, "p-4 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3")}>
        <JapaneseDatePicker
          value={fromDateFilter}
          onChange={(dateValue) => {
            setFromDateFilter(dateValue);
            if (dateValue && toDateFilter && toDateFilter < dateValue) {
              setToDateFilter(dateValue);
            }
          }}
          placeholder="開始日"
        />
        <JapaneseDatePicker
          value={toDateFilter}
          onChange={setToDateFilter}
          placeholder="終了日"
          min={fromDateFilter || undefined}
        />
        <label className="relative">
          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none appearance-none"
          >
            <option value="ALL">すべてのクライアント</option>
            {dashboardClients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </label>
        <label className="relative">
          <ShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none appearance-none"
          >
            <option value="ALL">すべてのサプライヤー</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                  <Wallet className="text-primary" size={20} />
                </div>
                <span className="font-semibold text-slate-700">全案件 受注総額</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold text-slate-900">¥{totalRevenue.toLocaleString()}</p>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="flex items-center gap-0.5 text-primary bg-primary-light px-1.5 py-0.5 rounded-md font-bold">
                  <TrendingUp size={10} /> +5.4%
                </span>
                <span className="text-slate-400 font-medium whitespace-nowrap">前月比推移</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <Link to="/projects" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all">
              <FileBarChart size={16} /> 案件一覧
            </Link>
            <Link to="/catalog" className="flex-1 py-3 bg-slate-50 text-slate-700 border border-slate-100 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
              <Package size={16} /> カタログ
            </Link>
          </div>
        </div>

        {/* Mini Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                  <Package className="text-primary" size={20} />
                </div>
                <span className="font-semibold text-slate-700">登録製品数</span>
              </div>
              <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal size={20} /></button>
            </div>
            <div className="mt-8">
              <p className="text-3xl font-bold text-slate-900">{activeProductsCount.toLocaleString()} <span className="text-sm font-bold text-slate-400 italic">品目</span></p>
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <span className="flex items-center gap-0.5 text-primary bg-primary-light px-1.5 py-0.5 rounded-md font-bold">
                  <TrendingUp size={10} /> +12
                </span>
                <span className="text-slate-400 font-medium">今週の新規登録</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Calculator className="text-emerald-500" size={20} />
                </div>
                <span className="font-semibold text-slate-700">見込み総利益</span>
              </div>
              <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal size={20} /></button>
            </div>
            <div className="mt-8">
              <p className="text-3xl font-bold text-slate-900">¥{totalProfit.toLocaleString()}</p>
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <span className="flex items-center gap-0.5 text-primary bg-primary-light px-1.5 py-0.5 rounded-md font-bold">
                  <TrendingUp size={10} /> +4.5%
                </span>
                <span className="text-slate-400 font-medium">前月比益率</span>
              </div>
            </div>
          </div>

          {/* Overview Chart Card */}
          <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-primary" size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">案件ステータス分布</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-primary" />
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">案件数</span>
                </div>
                <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal size={20} /></button>
              </div>
            </div>
            <div className="h-[280px] w-full mt-4">
              <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={0}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{payload[0].payload.name}</p>
                            <p className="text-sm font-black">{payload[0].value} 案件</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#00A36C' : '#E2E8F0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-lg font-bold text-slate-900">主要サプライヤー</h2>
             <Link to="/suppliers" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
               すべて見る
             </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            {suppliers.slice(0, 4).map((s, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-primary transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-300 text-xs">{s.name.substring(0, 1)}</div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-lg">{s.name}</p>
                    <p className="text-[10px] font-bold mt-1 text-primary">取引中</p>
                  </div>
                </div>
                <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal size={18} /></button>
              </div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                    <Target className="text-primary" size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">進捗達成率</h2>
                </div>
                <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal size={20} /></button>
            </div>

            <div className="space-y-6">
              {[
                { label: '成約目標達成', icon: Globe, current: 8, target: 12, value: 66 },
                { label: '新規カタログ登録', icon: Zap, current: 120, target: 150, value: 80 },
              ].map((plan, i) => (
                <div key={i} className="space-y-4 pt-6 first:pt-0 border-t border-slate-50 first:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                      <plan.icon className="text-slate-400" size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{plan.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{plan.current}/{plan.target}</p>
                    </div>
                    <span className="text-sm font-black text-slate-900">{plan.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${plan.value}%` }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions Table Section */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 flex items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                <CreditCard className="text-primary" size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">最近のプロジェクト動向</h2>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              <Filter size={16} /> フィルター
            </button>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full">
                <thead className="bg-[#F8FAFB] text-slate-400 uppercase text-[10px] font-black tracking-widest text-left">
                   <tr>
                      <th className="px-8 py-4 font-black">プロジェクト</th>
                      <th className="px-8 py-4 font-black">更新日</th>
                      <th className="px-8 py-4 font-black text-right">想定収益</th>
                      <th className="px-8 py-4 font-black">ステータス</th>
                      <th className="px-8 py-4"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {filteredDashboardProjects.slice(0, 8).map((proj, i) => (
                      <tr key={i} className="group hover:bg-[#F8FAFB] transition-colors">
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center p-2 font-black text-slate-300 text-xs">
                                  {proj.clientName.substring(0, 1)}
                               </div>
                               <span className="text-sm font-bold text-slate-700">{proj.title}</span>
                            </div>
                         </td>
                         <td className="px-8 py-5 text-sm font-medium text-slate-500">{proj.updatedAt}</td>
                         <td className="px-8 py-5 text-sm font-bold text-slate-900 text-right">¥{proj.totalRevenue.toLocaleString()}</td>
                         <td className="px-8 py-5">
                            <div className={cn(
                              "flex items-center gap-1.5 text-[10px] font-black uppercase",
                              proj.status === ProjectStatus.ADOPTED ? "text-primary" : "text-slate-400"
                            )}>
                               <div className={cn("w-1.5 h-1.5 rounded-full", proj.status === ProjectStatus.ADOPTED ? "bg-primary" : "bg-slate-300")} />
                               {projectStatusMap[proj.status] || proj.status}
                            </div>
                         </td>
                         <td className="px-8 py-5 text-right">
                            <button className="text-slate-300 hover:text-slate-600 transition-colors">
                               <MoreHorizontal size={18} />
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardCockpit = ({
  projects,
  products,
  suppliers,
  clients,
}: {
  projects: Project[],
  products: Product[],
  suppliers: Supplier[],
  clients: Client[],
}) => {
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const todayValue = useMemo(() => formatDateInputValue(new Date()), []);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const dashboardClients = useMemo(() => {
    const clientMap = new Map<string, string>();
    clients.forEach((client) => clientMap.set(client.id, client.name));
    projects.forEach((project) => clientMap.set(project.clientId, project.clientName));
    return Array.from(clientMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, projects]);

  const filteredProjects = useMemo(() => {
    const startDate = fromDateFilter ? new Date(`${fromDateFilter}T00:00:00`) : null;
    const endDate = toDateFilter ? new Date(`${toDateFilter}T23:59:59`) : null;
    return projects.filter((project) => {
      const projectDate = new Date(project.createdAt);
      const matchesRange = (!startDate || projectDate >= startDate) && (!endDate || projectDate <= endDate);
      const matchesClient = clientFilter === 'ALL' || project.clientId === clientFilter;
      const matchesSupplier = supplierFilter === 'ALL' || project.products.some((projectProduct) => (
        productById.get(projectProduct.productId)?.supplierId === supplierFilter
      ));
      return matchesRange && matchesClient && matchesSupplier;
    });
  }, [clientFilter, fromDateFilter, productById, projects, supplierFilter, toDateFilter]);

  const metrics = useMemo(() => {
    const orderRequests = filteredProjects.flatMap((project) => project.orderRequests ?? []);
    const totalRevenue = filteredProjects.reduce((sum, project) => sum + project.totalRevenue, 0);
    const totalProfit = filteredProjects.reduce((sum, project) => sum + project.totalProfit, 0);
    const adoptedProjects = filteredProjects.filter((project) => project.status === ProjectStatus.ADOPTED).length;
    const pendingApprovals = products.filter((product) => (
      product.status === ProductStatus.PENDING_APPROVAL &&
      (supplierFilter === 'ALL' || product.supplierId === supplierFilter)
    )).length;
    const negativeProjects = filteredProjects.filter((project) => project.totalProfit < 0).length;
    const overdueOrders = orderRequests.filter((order) => (
      order.deliveryDate &&
      order.deliveryDate < todayValue &&
      ![OrderStatus.RECEIVED, OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status)
    )).length;
    return {
      orderRequests,
      projectCount: filteredProjects.length,
      adoptedProjects,
      winRate: filteredProjects.length ? Math.round((adoptedProjects / filteredProjects.length) * 100) : 0,
      totalRevenue,
      totalProfit,
      grossMargin: totalRevenue ? Math.round((totalProfit / totalRevenue) * 100) : 0,
      pendingApprovals,
      negativeProjects,
      overdueOrders,
    };
  }, [filteredProjects, products, supplierFilter, todayValue]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `¥${Math.round(value / 1000).toLocaleString()}K`;
    return `¥${value.toLocaleString()}`;
  };

  const trendData = useMemo(() => {
    const end = toDateFilter ? parseDateInputValue(toDateFilter) ?? new Date() : new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(end.getFullYear(), end.getMonth() - (5 - index), 1);
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      return { key, name: month.toLocaleDateString('ja-JP', { month: 'short' }), 売上: 0, 粗利: 0 };
    });
    const monthMap = new Map(months.map((month) => [month.key, month]));
    filteredProjects.forEach((project) => {
      const date = parseDateInputValue(project.updatedAt) ?? parseDateInputValue(project.createdAt);
      if (!date) return;
      const bucket = monthMap.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      if (!bucket) return;
      bucket.売上 += project.totalRevenue;
      bucket.粗利 += project.totalProfit;
    });
    return months;
  }, [filteredProjects, toDateFilter]);

  const funnelData = useMemo(() => {
    const orders = metrics.orderRequests;
    return [
      { label: '下書き', value: filteredProjects.filter((project) => project.status === ProjectStatus.DRAFT).length, icon: FileText },
      { label: '提案中', value: filteredProjects.filter((project) => project.status === ProjectStatus.PROPOSED).length, icon: Send },
      { label: '成約', value: metrics.adoptedProjects, icon: CheckCircle2 },
      { label: '発注依頼', value: orders.filter((order) => [OrderStatus.REQUESTED, OrderStatus.CONFIRMED, OrderStatus.IN_PROGRESS].includes(order.status)).length, icon: ShoppingCart },
      { label: '発送済み', value: orders.filter((order) => order.status === OrderStatus.SHIPPED).length, icon: ArrowUpRight },
      { label: '受取済み', value: orders.filter((order) => [OrderStatus.RECEIVED, OrderStatus.COMPLETED].includes(order.status)).length, icon: Check },
    ];
  }, [filteredProjects, metrics]);

  const statusDonutData = useMemo(() => [
    { name: '下書き', value: filteredProjects.filter((project) => project.status === ProjectStatus.DRAFT).length, color: '#94A3B8' },
    { name: '提案中', value: filteredProjects.filter((project) => project.status === ProjectStatus.PROPOSED).length, color: '#F59E0B' },
    { name: '成約', value: filteredProjects.filter((project) => project.status === ProjectStatus.ADOPTED).length, color: '#00A36C' },
    { name: '却下', value: filteredProjects.filter((project) => project.status === ProjectStatus.REJECTED).length, color: '#EF4444' },
  ].filter((entry) => entry.value > 0), [filteredProjects]);

  const supplierRanking = useMemo(() => {
    const supplierMap = new Map<string, { id: string; name: string; revenue: number; products: number }>();
    filteredProjects.forEach((project) => {
      project.products.forEach((projectProduct) => {
        const product = productById.get(projectProduct.productId);
        if (!product) return;
        const current = supplierMap.get(product.supplierId) ?? { id: product.supplierId, name: product.supplierName, revenue: 0, products: 0 };
        current.revenue += projectProduct.sellingPrice * projectProduct.quantity;
        current.products += 1;
        supplierMap.set(product.supplierId, current);
      });
    });
    return Array.from(supplierMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredProjects, productById]);

  const categoryMix = useMemo(() => {
    const categoryMap = new Map<string, { name: string; value: number }>();
    filteredProjects.forEach((project) => {
      project.products.forEach((projectProduct) => {
        const product = productById.get(projectProduct.productId);
        const name = product?.categoryName ?? '未分類';
        const current = categoryMap.get(name) ?? { name, value: 0 };
        current.value += 1;
        categoryMap.set(name, current);
      });
    });
    if (!categoryMap.size) {
      products.forEach((product) => {
        if (supplierFilter !== 'ALL' && product.supplierId !== supplierFilter) return;
        const current = categoryMap.get(product.categoryName) ?? { name: product.categoryName, value: 0 };
        current.value += 1;
        categoryMap.set(product.categoryName, current);
      });
    }
    return Array.from(categoryMap.values()).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredProjects, productById, products, supplierFilter]);

  const actionItems = useMemo(() => [
    { label: '承認待ち商品', value: metrics.pendingApprovals, tone: 'red', icon: AlertCircle, to: '/approvals' },
    { label: '発注依頼済み', value: metrics.orderRequests.filter((order) => order.status === OrderStatus.REQUESTED).length, tone: 'green', icon: ShoppingCart, to: '/projects' },
    { label: '発送確認待ち', value: metrics.orderRequests.filter((order) => order.status === OrderStatus.SHIPPED).length, tone: 'amber', icon: ArrowUpRight, to: '/projects' },
    { label: '赤字案件', value: metrics.negativeProjects, tone: 'red', icon: TrendingDown, to: '/projects' },
    { label: '納期超過リスク', value: metrics.overdueOrders, tone: 'amber', icon: Calendar, to: '/projects' },
  ], [metrics]);

  const compactProjects = useMemo(
    () => filteredProjects.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 5),
    [filteredProjects],
  );

  const funnelTotal = useMemo(() => Math.max(funnelData.reduce((sum, item) => sum + item.value, 0), 1), [funnelData]);
  const actionChartData = useMemo(() => {
    const colorByTone: Record<string, string> = {
      red: '#EF4444',
      amber: '#F59E0B',
      green: '#00A36C',
    };
    const data = actionItems
      .filter((item) => item.value > 0)
      .map((item) => ({
        name: item.label,
        value: item.value,
        color: colorByTone[item.tone] ?? '#94A3B8',
      }));
    return data.length ? data : [{ name: '対応なし', value: 1, color: '#E2E8F0' }];
  }, [actionItems]);
  const actionTotal = useMemo(() => actionItems.reduce((sum, item) => sum + item.value, 0), [actionItems]);

  const applyRangePreset = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER') => {
    const today = new Date();
    const start = new Date(today);
    if (preset === 'ALL') {
      setFromDateFilter('');
      setToDateFilter('');
      return;
    }
    if (preset === 'WEEK') start.setDate(today.getDate() - 6);
    if (preset === 'MONTH') start.setMonth(today.getMonth() - 1);
    if (preset === 'QUARTER') start.setMonth(today.getMonth() - 3);
    setFromDateFilter(formatDateInputValue(preset === 'TODAY' ? today : start));
    setToDateFilter(formatDateInputValue(today));
  };

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-0 flex-col gap-3 overflow-hidden animate-in fade-in duration-500">
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Executive BI Cockpit</p>
          <h1 className="truncate text-2xl font-black text-slate-900">おかえりなさい、管理者様</h1>
          <p className="truncate text-xs font-bold text-slate-500">案件・採用・発注・納品の全体状況を1画面で確認できます。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: '全期間', value: 'ALL' },
            { label: '今日', value: 'TODAY' },
            { label: '7日', value: 'WEEK' },
            { label: '30日', value: 'MONTH' },
            { label: '四半期', value: 'QUARTER' },
          ].map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => applyRangePreset(preset.value as 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER')}
              className="rounded-full border border-slate-100 bg-white px-3 py-2 text-[11px] font-black text-slate-500 shadow-sm transition-colors hover:border-primary/20 hover:bg-primary-light hover:text-primary"
            >
              {preset.label}
            </button>
          ))}
          <button className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-sm transition-all hover:bg-slate-800">
            <Download size={15} className="mr-2 inline" />
            エクスポート
          </button>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-2 rounded-[28px] border border-slate-100 bg-white/90 p-3 shadow-sm backdrop-blur md:grid-cols-4">
        <JapaneseDatePicker value={fromDateFilter} onChange={(value) => {
          setFromDateFilter(value);
          if (value && toDateFilter && toDateFilter < value) setToDateFilter(value);
        }} placeholder="開始日" />
        <JapaneseDatePicker value={toDateFilter} onChange={setToDateFilter} placeholder="終了日" min={fromDateFilter || undefined} />
        <label className="relative">
          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
          <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-black text-slate-600 outline-none transition-all focus:ring-4 focus:ring-primary/10">
            <option value="ALL">すべてのクライアント</option>
            {dashboardClients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <label className="relative">
          <ShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
          <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-black text-slate-600 outline-none transition-all focus:ring-4 focus:ring-primary/10">
            <option value="ALL">すべてのサプライヤー</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </label>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-5">
        {[
          { label: '案件数', value: metrics.projectCount.toLocaleString(), sub: `${metrics.adoptedProjects}件 成約`, icon: FileBarChart, tone: 'green' },
          { label: '成約率', value: `${metrics.winRate}%`, sub: '全案件ベース', icon: Target, tone: 'amber' },
          { label: '売上見込', value: formatCurrency(metrics.totalRevenue), sub: `${metrics.grossMargin}% 粗利率`, icon: Wallet, tone: 'green' },
          { label: '粗利見込', value: formatCurrency(metrics.totalProfit), sub: metrics.totalProfit < 0 ? '赤字注意' : '利益確保', icon: Calculator, tone: metrics.totalProfit < 0 ? 'red' : 'green' },
          { label: '要対応', value: actionItems.reduce((sum, item) => sum + item.value, 0).toLocaleString(), sub: '未処理アクション', icon: Bell, tone: 'red' },
        ].map((metric) => (
          <div key={metric.label} className="min-h-20 rounded-[24px] border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
                metric.tone === 'red' ? "bg-red-50 text-red-500" : metric.tone === 'amber' ? "bg-amber-50 text-amber-600" : "bg-primary-light text-primary",
              )}>
                <metric.icon size={19} />
              </div>
              <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-400">LIVE</span>
            </div>
            <p className="mt-2 text-[11px] font-black text-slate-400">{metric.label}</p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="truncate text-xl font-black text-slate-900">{metric.value}</p>
              <p className="truncate text-[10px] font-bold text-slate-400">{metric.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[minmax(0,1.08fr)_minmax(0,0.92fr)] gap-3">
        <div className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-slate-100 bg-white p-4 shadow-sm xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">売上・粗利トレンド</h2>
              <p className="text-[10px] font-bold text-slate-400">直近6か月の推移</p>
            </div>
            <div className="flex gap-3 text-[10px] font-black text-slate-400">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />売上</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />粗利</span>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00A36C" stopOpacity={0.24}/>
                    <stop offset="95%" stopColor="#00A36C" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.22}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', fontWeight: 800 }} />
                <Area type="monotone" dataKey="売上" stroke="#00A36C" strokeWidth={3} fill="url(#revenueGradient)" />
                <Area type="monotone" dataKey="粗利" stroke="#F59E0B" strokeWidth={2} fill="url(#profitGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-slate-100 bg-white p-3 shadow-sm xl:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">案件ファネル</h2>
              <p className="text-[10px] font-bold text-slate-400">提案から納品まで</p>
            </div>
            <Badge status={ProjectStatus.ADOPTED}>{metrics.winRate}%</Badge>
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
            <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50 p-3">
              <div className="flex h-12 overflow-hidden rounded-2xl bg-white">
                {funnelData.map((stage, index) => {
                  const width = Math.max(8, Math.round((stage.value / funnelTotal) * 100));
                  return (
                    <motion.div
                      key={stage.label}
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      className={cn(
                        "relative flex min-w-8 items-center justify-center border-r border-white/70 last:border-r-0",
                        index < 2 ? "bg-amber-300" : index < 4 ? "bg-primary" : "bg-emerald-300",
                      )}
                      title={`${stage.label}: ${stage.value}`}
                    >
                      <stage.icon size={15} className="text-white drop-shadow-sm" />
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-black text-slate-400">
                <span>START</span>
                <span>{funnelData.reduce((sum, item) => sum + item.value, 0)}件</span>
                <span>DELIVERY</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {funnelData.map((stage, index) => (
                <div key={stage.label} className="min-w-0 rounded-2xl bg-slate-50 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", index < 2 ? "bg-amber-300" : index < 4 ? "bg-primary" : "bg-emerald-300")} />
                    <span className="text-xs font-black text-slate-900">{stage.value}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[9px] font-black text-slate-400">{stage.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 min-h-0 xl:col-span-3">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">要対応</h2>
              <Bell size={16} className="text-primary" />
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 content-center gap-4">
              <div className="relative mx-auto flex h-[118px] w-[118px] items-center justify-center">
                <ResponsiveContainer width={118} height={118} minWidth={0} minHeight={0}>
                  <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <Pie
                      data={actionChartData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={54}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {actionChartData.map((entry, index) => <Cell key={`action-${index}`} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <span className="absolute text-2xl font-black text-slate-900">{actionTotal}</span>
              </div>
              <div className="grid min-h-0 grid-rows-5 gap-1">
                {actionItems.map((item) => (
                  <Link key={item.label} to={item.to} className="flex min-h-0 items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-1.5 transition-colors hover:bg-primary-light">
                    <span className="flex min-w-0 items-center gap-2 text-[10px] font-black text-slate-600">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", item.tone === 'red' ? "bg-red-500" : item.tone === 'amber' ? "bg-amber-400" : "bg-primary")} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-900">{item.value}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 row-start-2 grid min-h-0 grid-cols-12 gap-3">
          <div className="col-span-12 min-h-0 overflow-hidden rounded-[30px] border border-slate-100 bg-white p-3 shadow-sm lg:col-span-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">サプライヤー売上 Top</h2>
              <Link to="/suppliers" className="text-[10px] font-black text-primary">詳細</Link>
            </div>
            <div className="grid h-[calc(100%-2rem)] content-center gap-2">
              {(supplierRanking.length ? supplierRanking : [{ id: 'empty', name: 'データなし', revenue: 0, products: 0 }]).map((supplier) => {
                const maxRevenue = Math.max(...supplierRanking.map((item) => item.revenue), 1);
                const width = supplier.revenue > 0 ? Math.max(8, Math.round((supplier.revenue / maxRevenue) * 100)) : 0;
                return (
                  <div key={supplier.id} className="min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-black">
                      <span className="truncate text-slate-600">{supplier.name}</span>
                      <span className="shrink-0 text-primary">{formatCurrency(supplier.revenue)}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-span-12 min-h-0 overflow-hidden rounded-[30px] border border-slate-100 bg-white p-3 shadow-sm lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">カテゴリ構成</h2>
              <Package size={16} className="text-primary" />
            </div>
            <div className="space-y-2">
              {categoryMix.map((category, index) => {
                const maxValue = Math.max(...categoryMix.map((item) => item.value), 1);
                return (
                  <div key={category.name} className="space-y-1">
                    <div className="flex justify-between gap-2 text-[10px] font-black">
                      <span className="truncate text-slate-600">{category.name}</span>
                      <span className="text-slate-400">{category.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-50">
                      <div className={cn("h-full rounded-full", index === 0 ? "bg-primary" : index === 1 ? "bg-amber-400" : "bg-slate-300")} style={{ width: `${Math.max(8, (category.value / maxValue) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-span-12 min-h-0 overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-sm lg:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-50 px-4 py-2.5">
              <h2 className="text-sm font-black text-slate-900">進行中案件</h2>
              <Link to="/projects" className="text-[10px] font-black text-primary">すべて見る</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {compactProjects.length ? compactProjects.slice(0, 4).map((project) => (
                <Link key={project.id} to="/projects" className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 transition-colors hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-800">{project.title}</p>
                    <p className="truncate text-[10px] font-bold text-slate-400">{project.clientName}</p>
                  </div>
                  <Badge status={project.status}>{projectStatusMap[project.status] ?? project.status}</Badge>
                  <p className={cn("text-right text-xs font-black", project.totalProfit < 0 ? "text-red-500" : "text-primary")}>{formatCurrency(project.totalProfit)}</p>
                </Link>
              )) : <div className="grid h-32 place-items-center text-xs font-black text-slate-300">対象案件はありません</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProposalBuilder = () => (
  <div className="p-8 bg-white rounded-2xl border border-slate-100 font-bold text-slate-400 text-center">提案書構成画面（案件管理内フローに集約予定）</div>
);

const ProfitLossCalc = () => (
  <div className="p-8 bg-white rounded-2xl border border-slate-100 font-bold text-slate-400 text-center">損益計算画面（案件管理内フローに集約予定）</div>
);

const ApprovalList = ({ products, onApprove, onReject }: {
  products: Product[],
  onApprove: (productId: string, version?: ProductVersion) => void,
  onReject: (productId: string) => void
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const pendingProductsBase = useMemo(
    () => products.filter(p => p.status === ProductStatus.PENDING_APPROVAL),
    [products],
  );
  const approvalCategories = useMemo(
    () => Array.from(new Set(pendingProductsBase.map((product) => product.categoryName).filter(Boolean))).sort(),
    [pendingProductsBase],
  );
  const approvalSuppliers = useMemo(() => {
    const supplierMap = new Map<string, string>();
    pendingProductsBase.forEach((product) => supplierMap.set(product.supplierId, product.supplierName));
    return Array.from(supplierMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [pendingProductsBase]);
  const pendingProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return pendingProductsBase.filter((product) => {
      const matchesSearch = !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.supplierName.toLowerCase().includes(normalizedSearch) ||
        product.categoryName.toLowerCase().includes(normalizedSearch) ||
        product.janCode.toLowerCase().includes(normalizedSearch);
      const matchesCategory = categoryFilter === 'ALL' || product.categoryName === categoryFilter;
      const matchesSupplier = supplierFilter === 'ALL' || product.supplierId === supplierFilter;
      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [categoryFilter, pendingProductsBase, searchQuery, supplierFilter]);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900">承認待ち管理</h1>
        <p className="text-slate-500">修正された商品データの確認と承認を行います。</p>
      </div>

      <div className={cn(stickyToolbarClass, "p-4 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 lg:grid-cols-[1fr_220px_220px] gap-3")}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="商品名、サプライヤー、JANで検索..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
          />
        </div>
        <label className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none appearance-none"
          >
            <option value="ALL">すべてのカテゴリ</option>
            {approvalCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="relative">
          <ShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none appearance-none"
          >
            <option value="ALL">すべてのサプライヤー</option>
            {approvalSuppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </label>
      </div>

      {pendingProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {pendingProducts.map(p => {
            const currentVersion = p.versions?.[p.versions.length - 1]; // The latest one waiting for approval
            const previousVersion = p.versions?.[p.versions.length - 2];
            const pendingChange = p.pendingChange;
            const legacyFieldDiffs = !pendingChange && currentVersion
              ? [
                  { label: '原価', before: `¥${(previousVersion?.cost ?? p.cost).toLocaleString()}`, after: `¥${currentVersion.cost.toLocaleString()}` },
                  { label: '小売価格', before: `¥${(previousVersion?.listPrice ?? p.listPrice).toLocaleString()}`, after: `¥${currentVersion.listPrice.toLocaleString()}` },
                  { label: '商品説明', before: previousVersion?.description ?? p.description, after: currentVersion.description },
                ].filter((diff) => diff.before !== diff.after)
              : [];
            const fieldDiffs = pendingChange?.fieldDiffs ?? legacyFieldDiffs;
            const imageDiffs = pendingChange?.imageDiffs ?? [];
            const changeLabels = [
              fieldDiffs.length ? '商品情報' : '',
              imageDiffs.some((diff) => diff.type === 'ADD') ? '画像追加' : '',
              imageDiffs.some((diff) => diff.type === 'DELETE') ? '画像削除' : '',
              imageDiffs.some((diff) => diff.type === 'REORDER') ? '画像並び替え' : '',
              !pendingChange && currentVersion ? '旧承認データ' : '',
            ].filter(Boolean);
            const hasDiff = Boolean(pendingChange?.hasDiff ?? (fieldDiffs.length > 0 || imageDiffs.length > 0));

            return (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-primary shadow-sm border border-slate-100">
                        {p.name.substring(0, 1)}
                      </div>
                      <div>
                         <h3 className="font-black text-slate-900 text-lg">{p.name}</h3>
                         <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>ID: {p.id}</span>
                            <span>•</span>
                            <span>バージョン: {pendingChange?.targetVersion ?? (p.version || 1) + 1}（承認待ち）</span>
                         </div>
                         <div className="mt-2 flex flex-wrap gap-2">
                           {changeLabels.map((label) => (
                             <span key={label} className="px-2.5 py-1 bg-primary-light text-primary rounded-full text-[10px] font-black">
                               {label}
                             </span>
                           ))}
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <button
                        onClick={() => onReject(p.id)}
                        className="px-6 py-2.5 bg-white border border-red-100 text-red-500 rounded-xl text-sm font-black hover:bg-red-50 transition-all"
                      >
                        却下
                      </button>
                      <button
                        disabled={!hasDiff}
                        onClick={() => hasDiff && onApprove(p.id, currentVersion)}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                          hasDiff
                            ? "bg-primary text-white hover:bg-emerald-700 shadow-lg shadow-primary/10"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                      >
                        <Check size={18} /> 修正を承認
                      </button>
                   </div>
                </div>

                <div className="p-8 space-y-6">
                  {!hasDiff && (
                    <div className="p-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold">
                      差分情報を取得できません。再提出してください。
                    </div>
                  )}

                  {fieldDiffs.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest px-2">修正された項目</p>
                      <div className="grid grid-cols-1 gap-3">
                        {fieldDiffs.map((diff) => (
                          <div key={diff.label} className="grid grid-cols-1 md:grid-cols-[180px_1fr_32px_1fr] gap-3 items-start p-5 bg-primary-light/60 border border-primary/10 rounded-2xl">
                            <span className="text-xs font-black text-primary">{diff.label}</span>
                            <div className="min-h-11 rounded-xl bg-white/80 border border-white px-4 py-3 text-sm font-bold text-slate-500 whitespace-pre-wrap">
                              {diff.before}
                            </div>
                            <ArrowRight size={18} className="text-primary mt-3 hidden md:block" />
                            <div className="min-h-11 rounded-xl bg-white border border-primary/20 px-4 py-3 text-sm font-black text-slate-900 whitespace-pre-wrap">
                              {diff.after}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {imageDiffs.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 px-2">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">画像の変更</p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
                          {imageDiffs.length}件
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {imageDiffs.map((diff, index) => (
                          <div key={`${diff.type}-${diff.fileId ?? diff.imageId ?? index}`} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black",
                                diff.type === 'DELETE' ? "bg-red-50 text-red-500" : "bg-primary-light text-primary"
                              )}>
                                {diff.label}
                              </span>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-400">
                                #{index + 1}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={!diff.url}
                              onClick={() => diff.url && setPreviewImage({ url: diff.url, name: diff.originalName ?? diff.label })}
                              className={cn(
                                "mt-3 flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white transition-all",
                                diff.url && "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                              )}
                              title={diff.url ? '画像を拡大表示' : undefined}
                            >
                              {diff.url ? (
                                <img
                                  src={diff.url}
                                  alt={diff.originalName ?? diff.label}
                                  loading="lazy"
                                  decoding="async"
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-300">
                                  <ImageIcon size={36} />
                                  <span className="text-[10px] font-black">プレビューなし</span>
                                </div>
                              )}
                            </button>
                            <div className="mt-3 min-h-10 rounded-2xl bg-white px-3 py-2">
                              <p className="truncate text-xs font-black text-slate-700">{diff.originalName ?? '画像並び替え'}</p>
                              {typeof diff.sizeBytes === 'number' && (
                                <p className="mt-0.5 text-[10px] font-bold text-slate-400">{Math.ceil(diff.sizeBytes / 1024).toLocaleString()} KB</p>
                              )}
                            </div>
                            {diff.type === 'REORDER' && (
                              <p className="mt-3 text-xs font-bold text-slate-500">
                                {diff.previousOrder?.length ?? 0} 件の画像順を更新します。
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2 text-[10px] text-primary font-bold">
                    <History size={14} />
                    修正日: {pendingChange?.createdAt ?? currentVersion?.createdAt ?? '-'} / {pendingChange?.requestedByName ?? 'システム管理者'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-32 bg-white rounded-[40px] border border-slate-100 flex flex-col items-center justify-center text-center space-y-6">
           <div className="w-24 h-24 bg-primary-light rounded-[32px] flex items-center justify-center">
              <CheckCircle2 size={48} className="text-primary/20" />
           </div>
           <div>
              <p className="text-xl font-black text-slate-900">承認待ちの商品はありません</p>
              <p className="text-slate-400 font-medium mt-2">すべての商品データは最新の状態です。</p>
           </div>
        </div>
      )}
      {previewImage && (
        <ModalPortal>
          <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setPreviewImage(null);
              }}
              className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-2xl bg-white/95 text-slate-500 shadow-xl transition-colors hover:text-slate-900"
              aria-label="画像プレビューを閉じる"
            >
              <X size={22} />
            </button>
            <div className="max-h-[88vh] w-full max-w-5xl rounded-[32px] bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between gap-3 px-2">
                <p className="truncate text-sm font-black text-slate-800">{previewImage.name}</p>
                <span className="rounded-full bg-primary-light px-3 py-1 text-[10px] font-black text-primary">プレビュー</span>
              </div>
              <div className="flex h-[min(72vh,720px)] items-center justify-center rounded-[24px] bg-slate-50">
                <img src={previewImage.url} alt={previewImage.name} className="max-h-full max-w-full object-contain" />
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

const UserManagement = ({
  users,
  suppliers,
  onSave,
  onDelete,
}: {
  users: User[],
  suppliers: Supplier[],
  onSave: (input: { id?: string; name: string; email: string; role: UserRole; supplierId?: string; password?: string }) => void,
  onDelete: (id: string) => void,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleDraft, setRoleDraft] = useState<UserRole>(UserRole.SALES);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.supplierName?.toLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      return matchesSearch && matchesRole && !user.deleted;
    });
  }, [roleFilter, searchQuery, users]);

  const openCreate = () => {
    setEditingUser(null);
    setRoleDraft(UserRole.SALES);
    setIsModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setRoleDraft(user.role);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingUser(null);
    setIsModalOpen(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');
    onSave({
      id: editingUser?.id,
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      role: roleDraft,
      supplierId: roleDraft === UserRole.SUPPLIER ? String(formData.get('supplierId') ?? '') : undefined,
      password: password || undefined,
    });
    closeModal();
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">ユーザー管理</h1>
          <p className="text-slate-500">管理者・商品担当・営業担当・サプライヤーのユーザーと権限を管理します。</p>
        </div>
        <button onClick={openCreate} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-100 flex items-center gap-2">
          <Plus size={20} /> 新規ユーザー
        </button>
      </div>

      <div className={cn(stickyToolbarClass, "p-4 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3")}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="名前、メール、サプライヤーで検索..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
          />
        </div>
        <label className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as UserRole | 'ALL')}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 outline-none appearance-none"
          >
            <option value="ALL">すべてのロール</option>
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>{roleLabelMap[role]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1fr_160px_1fr_120px] gap-4 px-6 py-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span>ユーザー</span>
          <span>メール</span>
          <span>ロール</span>
          <span>サプライヤー</span>
          <span className="text-right">操作</span>
        </div>
        <div className="divide-y divide-slate-50">
          {filteredUsers.map((user) => (
            <div key={user.id} className="grid grid-cols-[1.2fr_1fr_160px_1fr_120px] gap-4 px-6 py-5 items-center">
              <div>
                <p className="font-black text-slate-900">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-400">{user.id}</p>
              </div>
              <p className="text-sm font-bold text-slate-500 truncate">{user.email}</p>
              <Badge status={user.role}>{roleLabelMap[user.role]}</Badge>
              <p className="text-sm font-bold text-slate-500">{user.supplierName ?? '-'}</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => openEdit(user)} className="p-2 text-slate-300 hover:text-primary transition-colors">
                  <Edit size={18} />
                </button>
                <button onClick={() => onDelete(user.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[300] flex items-start justify-center p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />
          <motion.form
            onSubmit={handleSubmit}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] bg-white rounded-3xl shadow-2xl flex flex-col my-auto overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 sm:p-8 pb-4">
              <h3 className="text-xl font-black text-slate-900">{editingUser ? 'ユーザー編集' : '新規ユーザー登録'}</h3>
              <button type="button" onClick={closeModal} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                <X size={22} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 px-6 sm:px-8 py-2 overflow-y-auto custom-scrollbar">
              <label className="space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">名前</span>
                <input name="name" defaultValue={editingUser?.name} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">メール</span>
                <input name="email" type="email" defaultValue={editingUser?.email} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">ロール</span>
                <select value={roleDraft} onChange={(event) => setRoleDraft(event.target.value as UserRole)} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none appearance-none">
                  {Object.values(UserRole).map((role) => (
                    <option key={role} value={role}>{roleLabelMap[role]}</option>
                  ))}
                </select>
              </label>
              {roleDraft === UserRole.SUPPLIER && (
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">サプライヤー</span>
                  <select name="supplierId" defaultValue={editingUser?.supplierId ?? ''} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none appearance-none">
                    <option value="">選択してください</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  {editingUser ? '新しいパスワード（任意）' : '初期パスワード'}
                </span>
                <input name="password" type="password" minLength={8} required={!editingUser} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
              </label>
            </div>
            <div className="flex gap-4 p-6 sm:p-8 pt-4 border-t border-slate-100 bg-white">
              <button type="button" onClick={closeModal} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">キャンセル</button>
              <button type="submit" className="flex-1 py-4 bg-primary text-white rounded-2xl font-black shadow-xl uppercase text-xs">保存</button>
            </div>
          </motion.form>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

const MainLayout = ({
  children,
  user,
  onLogout,
  notificationCount = 0,
  notifications = [],
  onNotificationClick,
}: {
  children: React.ReactNode,
  user: User,
  onLogout: () => void,
  notificationCount?: number,
  notifications?: Notification[],
  onNotificationClick?: (notification: Notification) => void,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuSections = user.role === UserRole.SUPPLIER
    ? [{
        title: 'サプライヤー',
        items: [
          { to: '/catalog', icon: Package, label: '商品登録' },
          {
            to: '/projects',
            icon: Bell,
            label: notificationCount > 0 ? `関連案件 (${notificationCount})` : '関連案件',
          },
        ],
      }]
    : user.role === UserRole.SALES
      ? [{
          title: '営業',
          items: [
            { to: '/projects', icon: FileBarChart, label: '担当案件' },
            { to: '/catalog', icon: Package, label: '商品カタログ' },
          ],
        }]
      : [
        {
          title: 'メインメニュー',
          items: [
            { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' },
            { to: '/projects', icon: FileBarChart, label: '案件管理' },
            { to: '/catalog', icon: Package, label: '商品カタログ' },
            ...(user.role === UserRole.ADMIN ? [{ to: '/approvals', icon: Bell, label: '承認待ち' }] : []),
            ...(user.role === UserRole.ADMIN ? [{ to: '/users', icon: Users, label: 'ユーザー管理' }] : []),
          ],
        },
        {
          title: '機能',
          items: [
            { to: '/suppliers', icon: ShoppingCart, label: 'サプライヤー' },
            { to: '/clients', icon: Users, label: 'クライアント' },
            { to: '/exports', icon: Download, label: 'データ出力' },
          ],
        },
      ];

  return (
    <div className="min-h-screen bg-[#F8FAFB] font-sans flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 88 }}
        transition={{ type: 'spring', stiffness: 360, damping: 38, mass: 0.75 }}
        className="sticky top-0 h-screen bg-white border-r border-slate-100 flex-shrink-0 z-30 overflow-hidden will-change-[width]"
      >
        <div className={cn("h-full flex flex-col transition-[padding] duration-200", isSidebarOpen ? "p-8" : "px-4 py-6")}>
          <div className={cn("mb-10 flex", isSidebarOpen ? "items-start justify-between" : "flex-col items-center gap-4")}>
            <div className={cn("flex min-w-0", isSidebarOpen ? "w-full flex-col items-center gap-3" : "items-center justify-center")}>
              <img src={logoIconSrc} alt="提案一元管理" className={cn("object-contain shrink-0", isSidebarOpen ? "w-28 h-28" : "w-12 h-12")} />
              {isSidebarOpen && <p className="text-xl font-bold text-slate-900 tracking-tight leading-tight text-center">提案一元管理</p>}
            </div>
            <button
              onClick={() => setIsSidebarOpen((open) => !open)}
              className="text-slate-300 hover:text-slate-600 transition-colors"
              aria-label={isSidebarOpen ? 'サイドメニューを閉じる' : 'サイドメニューを開く'}
            >
               {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <nav className={cn("flex-1 overflow-y-auto custom-scrollbar", isSidebarOpen ? "space-y-8 pr-2" : "space-y-5")}>
            {menuSections.map((section, idx) => (
              <div key={idx} className={cn(isSidebarOpen ? "space-y-4" : "space-y-2")}>
                {isSidebarOpen && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">{section.title}</p>}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.label}
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      active={location.pathname === item.to}
                      collapsed={!isSidebarOpen}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto pt-6">
            <button
              onClick={onLogout}
              title={!isSidebarOpen ? 'ログアウト' : undefined}
              className={cn(
                "w-full mt-6 py-3 flex items-center text-xs font-bold text-slate-500 hover:text-red-500 transition-colors rounded-xl",
                isSidebarOpen ? "justify-between px-4 border border-slate-50" : "justify-center px-0",
              )}
            >
               {isSidebarOpen && 'ログアウト'} <LogOut size={16} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-screen flex flex-col overflow-y-auto w-full relative">
        <header className="h-20 flex items-center justify-between px-10 sticky top-3 z-20 mt-3 mx-6">
          <div className="flex items-center gap-8">
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.open(resolveManualUrl(), '_blank', 'noopener,noreferrer')}
                className="p-2 text-slate-400 hover:text-primary transition-colors"
                aria-label="操作マニュアルを開く"
              >
                <HelpCircle size={20} />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen((open) => !open)}
                  className="p-2 text-slate-400 hover:text-primary transition-colors relative"
                  aria-label="通知"
                >
                  <Bell size={20} />
                  {notificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-primary text-white border-2 border-white text-[10px] font-black flex items-center justify-center">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>
                {isNotificationOpen && (
                  <div className="absolute right-0 top-12 w-[360px] max-h-[520px] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/70 z-[80]">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">通知</p>
                        <p className="text-[10px] font-bold text-slate-400">{notificationCount} 件の未読</p>
                      </div>
                      <Bell size={18} className="text-primary" />
                    </div>
                    <div className="max-h-[440px] overflow-y-auto">
                      {notifications.length ? notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => {
                            setIsNotificationOpen(false);
                            onNotificationClick?.(notification);
                            if (notification.projectId) {
                              navigate(`/projects?projectId=${notification.projectId}&tab=ORDERS`);
                            }
                          }}
                          className={cn(
                            "w-full text-left p-4 border-b border-slate-50 hover:bg-primary-light/50 transition-colors flex gap-3",
                            !notification.read && "bg-emerald-50/50"
                          )}
                        >
                          <div className="mt-1">
                            {!notification.read ? <Circle size={9} className="fill-primary text-primary" /> : <Circle size={9} className="text-slate-200" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900">{notification.title}</p>
                            <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">{notification.message}</p>
                            <p className="mt-2 text-[10px] font-black text-slate-400">{notification.createdAt}</p>
                          </div>
                        </button>
                      )) : (
                        <div className="p-8 text-center">
                          <p className="text-sm font-black text-slate-400">通知はありません</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-px h-8 bg-slate-100" />

            <button className="flex items-center gap-3 group">
               <div className="relative">
                 <div className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden group-hover:ring-2 ring-primary transition-all">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="" />
                 </div>
                 <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
               </div>
               <div className="text-left hidden 2xl:block">
                  <p className="text-sm font-bold text-slate-900 leading-none mb-1">{user.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{roleLabelMap[user.role]}</p>
               </div>
               <ChevronRight size={16} className="text-slate-400 rotate-90" />
            </button>
          </div>
        </header>

        <div className="p-10 max-w-8xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

const SupplierMaster = ({ suppliers, canManage = false, onAdd, onUpdate, onDelete }: { suppliers: Supplier[], canManage?: boolean, onAdd: (s: Supplier) => void, onUpdate: (s: Supplier) => void, onDelete: (id: string) => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const supplierData: Supplier = {
      id: editingSupplier?.id || `SUP-${Math.floor(Math.random() * 10000)}`,
      name: formData.get('name') as string,
      contactName: formData.get('contactName') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
    };
    if (editingSupplier) onUpdate(supplierData);
    else onAdd(supplierData);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className={cn(stickyToolbarClass, "flex justify-between items-center p-4 rounded-3xl border border-slate-100 shadow-sm")}>
          <div>
            <h1 className="text-2xl font-black text-slate-900">サプライヤーマスター</h1>
            <p className="text-slate-500">取引先仕入先の情報を管理します。</p>
          </div>
          {canManage && (
            <button onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }} className="px-6 py-3 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/10 flex items-center gap-2">
              <Plus size={20} /> 新規登録
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center font-black text-primary text-xl">{s.name.charAt(0)}</div>
                {canManage && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingSupplier(s); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-primary"><Edit size={18} /></button>
                    <button onClick={() => onDelete(s.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{s.name}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{s.id}</p>
              </div>
              <div className="space-y-2 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <Users size={16} className="text-slate-400" /> {s.contactName}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <Bell size={16} className="text-slate-400" /> {s.email}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 overflow-y-auto custom-scrollbar">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-lg max-h-[calc(100vh-3rem)] bg-white rounded-3xl shadow-2xl p-8 space-y-6 my-auto overflow-y-auto custom-scrollbar"
          >
            <h3 className="text-xl font-black text-slate-900">{editingSupplier ? 'サプライヤー編集' : 'サプライヤー登録'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">サプライヤー名</label>
                <input name="name" defaultValue={editingSupplier?.name} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">担当者名</label>
                  <input name="contactName" defaultValue={editingSupplier?.contactName} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">電話番号</label>
                  <input name="phone" defaultValue={editingSupplier?.phone} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">メールアドレス</label>
                <input name="email" type="email" defaultValue={editingSupplier?.email} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">住所</label>
                <input name="address" defaultValue={editingSupplier?.address} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">キャンセル</button>
                <button type="submit" className="flex-1 py-4 bg-primary text-white rounded-2xl font-black shadow-xl uppercase text-xs">保存</button>
              </div>
            </form>
          </motion.div>
        </div>
        </ModalPortal>
      )}
    </>
  );
};

const ClientMaster = ({ clients, canManage = false, onAdd, onUpdate, onDelete }: { clients: Client[], canManage?: boolean, onAdd: (c: Client) => void, onUpdate: (c: Client) => void, onDelete: (id: string) => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const clientData: Client = {
      id: editingClient?.id || `CLI-${Math.floor(Math.random() * 10000)}`,
      name: formData.get('name') as string,
      contactName: formData.get('contactName') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
    };
    if (editingClient) onUpdate(clientData);
    else onAdd(clientData);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className={cn(stickyToolbarClass, "flex justify-between items-center p-4 rounded-3xl border border-slate-100 shadow-sm")}>
          <div>
            <h1 className="text-2xl font-black text-slate-900">クライアントマスター</h1>
            <p className="text-slate-500">取引先顧客の情報を管理します。</p>
          </div>
          {canManage && (
            <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-100 flex items-center gap-2">
              <Plus size={20} /> 新規登録
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(c => (
            <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white text-xl">{c.name.charAt(0)}</div>
                {canManage && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingClient(c); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-primary"><Edit size={18} /></button>
                    <button onClick={() => onDelete(c.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{c.name}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{c.id}</p>
              </div>
              <div className="space-y-2 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <Users size={16} className="text-slate-400" /> {c.contactName}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <Bell size={16} className="text-slate-400" /> {c.email}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 overflow-y-auto custom-scrollbar">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-lg max-h-[calc(100vh-3rem)] bg-white rounded-3xl shadow-2xl p-8 space-y-6 my-auto overflow-y-auto custom-scrollbar"
          >
            <h3 className="text-xl font-black text-slate-900">{editingClient ? 'クライアント編集' : 'クライアント登録'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">クライアント名</label>
                <input name="name" defaultValue={editingClient?.name} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">担当者名</label>
                  <input name="contactName" defaultValue={editingClient?.contactName} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">電話番号</label>
                  <input name="phone" defaultValue={editingClient?.phone} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">メールアドレス</label>
                <input name="email" type="email" defaultValue={editingClient?.email} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">住所</label>
                <input name="address" defaultValue={editingClient?.address} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">キャンセル</button>
                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl uppercase text-xs">保存</button>
              </div>
            </form>
          </motion.div>
        </div>
        </ModalPortal>
      )}
    </>
  );
};

const LoginPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const response = await api.login({ email, password });
      onLogin(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] px-6 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-xl bg-white rounded-[32px] p-8 shadow-2xl shadow-slate-200/70 border border-slate-100 space-y-7">
        <div className="space-y-4">
          <img src={logoTitleSrc} alt="提案一元管理" className="mx-auto h-64 max-w-full object-contain" />
          <div>
            <h1 className="text-2xl font-black text-slate-900">ログイン</h1>
            <p className="text-sm font-medium text-slate-500 mt-2">アカウント情報を入力してシステムにアクセスしてください。</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">メールアドレス</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold"
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none font-bold"
              required
            />
          </label>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 disabled:opacity-60"
        >
          {isSubmitting ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [appError, setAppError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const loadCoreData = useCallback(async () => {
    setIsLoadingData(true);
    setAppError('');
    try {
      const shouldLoadUsers = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.PRODUCT_MANAGER;
      const shouldLoadMasterData = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.PRODUCT_MANAGER || currentUser?.role === UserRole.SUPPLIER;
      const shouldLoadClients = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.PRODUCT_MANAGER;
      const [supplierResult, clientResult, productResult, projectResult, userResult, notificationResult] = await Promise.all([
        shouldLoadMasterData ? api.listSuppliers() : Promise.resolve({ suppliers: [] }),
        shouldLoadClients ? api.listClients() : Promise.resolve({ clients: [] }),
        api.listProducts(),
        api.listProjects(),
        shouldLoadUsers ? api.listUsers(currentUser?.role === UserRole.PRODUCT_MANAGER ? { role: UserRole.SALES } : {}) : Promise.resolve({ users: [] }),
        api.listNotifications(),
      ]);
      setSuppliers(supplierResult.suppliers);
      setClients(clientResult.clients);
      setProducts(productResult.products);
      setProjects(projectResult.projects);
      setUsers(userResult.users);
      setNotifications(notificationResult.notifications);
      setUnreadNotificationCount(notificationResult.unreadCount);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      if (!getStoredAccessToken() && !getStoredRefreshToken()) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const response = getStoredRefreshToken()
          ? await api.refresh()
          : await api.me();
        if (isMounted) setCurrentUser(response.user);
      } catch (error) {
        clearSession();
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setIsBootstrapping(false);
      }
    };

    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      void loadCoreData();
    }
  }, [currentUser, loadCoreData]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [{ ...toast, id }, ...current].slice(0, 4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, toast.tone === 'error' ? 6000 : 3600);
  }, []);

  const showConfirm = useCallback((state: ConfirmDialogState) => {
    setConfirmDialog(state);
  }, []);

  const runMutation = async (operation: () => Promise<void>, successMessage?: string) => {
    setAppError('');
    try {
      await operation();
      if (successMessage) {
        showToast({ tone: 'success', title: successMessage });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '処理に失敗しました。';
      setAppError(message);
      showToast({
        tone: 'error',
        title: '処理に失敗しました',
        message,
      });
    } finally {
      await loadCoreData();
    }
  };

  const handleUpdateProduct = (updated: Product, imageFiles: File[] = []) => {
    void runMutation(async () => {
      await api.updateProduct(updated);
      if (imageFiles.length) {
        await api.uploadProductImages(updated.id, imageFiles);
      }
    }, '商品情報を更新しました');
  };

  const handleAddProduct = (newProduct: Product, imageFiles: File[] = []) => {
    void runMutation(async () => {
      const response = await api.createProduct(newProduct);
      if (imageFiles.length) {
        await api.uploadProductImages(response.product.id, imageFiles);
      }
    }, '商品を登録しました');
  };

  const handleDeleteProduct = (id: string) => {
    showConfirm({
      title: '商品を削除しますか？',
      message: 'この商品をカタログから削除します。関連する提案データは保持されます。',
      confirmLabel: '削除する',
      intent: 'danger',
      onConfirm: () => void runMutation(async () => {
        await api.deleteProduct(id);
      }, '商品を削除しました'),
    });
  };

  const handleDeleteProductImage = (productId: string, imageId: string) => {
    showConfirm({
      title: '画像を削除しますか？',
      message: 'この商品画像を削除します。削除後は商品詳細と提案書への反映対象から外れます。',
      confirmLabel: '削除する',
      intent: 'danger',
      onConfirm: () => void runMutation(async () => {
        await api.deleteProductImage(productId, imageId);
      }, '画像を削除しました'),
    });
  };

  const handleApproveProductChange = (productId: string, version?: ProductVersion) => {
    void version;
    void runMutation(async () => {
      await api.approveProduct(productId);
    }, '商品変更を承認しました');
  };

  const handleRejectProductChange = (productId: string) => {
    void runMutation(async () => {
      await api.rejectProduct(productId);
    }, '商品変更を却下しました');
  };

  const handleUpdateProject = (updated: Project) => {
    void runMutation(async () => {
      await api.updateProject(updated);
    }, '案件を更新しました');
  };

  const handleUpdateOrderStatus = async (projectId: string, orderId: string, status: OrderStatus) => {
    let updatedOrder: OrderRequest | undefined;
    await runMutation(async () => {
      const response = await api.updateOrderStatus(projectId, orderId, status);
      updatedOrder = response.orderRequest;
    }, '発注ステータスを更新しました');
    return updatedOrder;
  };

  const handleNotificationClick = (notification: Notification) => {
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    setUnreadNotificationCount((count) => Math.max(0, count - (notification.read ? 0 : 1)));
    void api.markNotificationRead(notification.id).catch(() => {
      void loadCoreData();
    });
  };

  const handleAddProject = (newProject: Project) => {
    void runMutation(async () => {
      await api.createProject(newProject);
    }, '案件を作成しました');
  };

  const handleDeleteProject = (id: string) => {
    showConfirm({
      title: '案件を削除しますか？',
      message: 'この案件を一覧から削除します。生成済みファイルや監査ログは保持されます。',
      confirmLabel: '削除する',
      intent: 'danger',
      onConfirm: () => void runMutation(async () => {
        await api.deleteProject(id);
      }, '案件を削除しました'),
    });
  };

  const handleAddSupplier = (newSupplier: Supplier) => {
    void runMutation(async () => {
      await api.createSupplier(newSupplier);
    }, 'サプライヤーを登録しました');
  };
  const handleUpdateSupplier = (updated: Supplier) => {
    void runMutation(async () => {
      await api.updateSupplier(updated);
    }, 'サプライヤーを更新しました');
  };
  const handleDeleteSupplier = (id: string) => {
    showConfirm({
      title: 'サプライヤーを削除しますか？',
      message: 'このサプライヤーを削除します。関連データがある場合はサーバー側の制約に従って処理されます。',
      confirmLabel: '削除する',
      intent: 'danger',
      onConfirm: () => void runMutation(async () => {
        await api.deleteSupplier(id);
      }, 'サプライヤーを削除しました'),
    });
  };

  const handleAddClient = (newClient: Client) => {
    void runMutation(async () => {
      await api.createClient(newClient);
    }, 'クライアントを登録しました');
  };
  const handleUpdateClient = (updated: Client) => {
    void runMutation(async () => {
      await api.updateClient(updated);
    }, 'クライアントを更新しました');
  };
  const handleDeleteClient = (id: string) => {
    showConfirm({
      title: 'クライアントを削除しますか？',
      message: 'このクライアントを削除します。関連データがある場合はサーバー側の制約に従って処理されます。',
      confirmLabel: '削除する',
      intent: 'danger',
      onConfirm: () => void runMutation(async () => {
        await api.deleteClient(id);
      }, 'クライアントを削除しました'),
    });
  };

  const handleSaveUser = (input: { id?: string; name: string; email: string; role: UserRole; supplierId?: string; password?: string }) => {
    void runMutation(async () => {
      if (input.id) {
        await api.updateUser(input.id, {
          name: input.name,
          email: input.email,
          role: input.role,
          supplierId: input.supplierId ?? '',
        });
        if (input.password) {
          await api.resetUserPassword(input.id, input.password);
        }
      } else {
        await api.createUser({
          name: input.name,
          email: input.email,
          role: input.role,
          supplierId: input.supplierId,
          password: input.password ?? '',
        });
      }
    }, input.id ? 'ユーザーを更新しました' : 'ユーザーを登録しました');
  };

  const handleDeleteUser = (id: string) => {
    showConfirm({
      title: 'ユーザーを削除しますか？',
      message: 'このユーザーを無効化します。削除後はログインできません。',
      confirmLabel: '削除する',
      intent: 'danger',
      onConfirm: () => void runMutation(async () => {
        await api.deleteUser(id);
      }, 'ユーザーを削除しました'),
    });
  };

  const handleLogout = () => {
    void api.logout();
    setCurrentUser(null);
    setProducts([]);
    setProjects([]);
    setSuppliers([]);
    setClients([]);
    setUsers([]);
    setNotifications([]);
    setUnreadNotificationCount(0);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const loadingScreen = (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-black">
      読み込み中...
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/manual" element={<Navigate to={resolveManualUrl()} replace />} />
        <Route path="/manual/*" element={<Navigate to={resolveManualUrl()} replace />} />
        <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/*" element={
          isBootstrapping ? loadingScreen : !currentUser ? <Navigate to="/login" replace /> : (
            <MainLayout
              user={currentUser}
              onLogout={handleLogout}
              notificationCount={unreadNotificationCount}
              notifications={notifications}
              onNotificationClick={handleNotificationClick}
            >
              {appError && (
                <div className="mb-6 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm font-bold">
                  {appError}
                </div>
              )}
              {isLoadingData && (
                <div className="mb-6 px-4 py-3 bg-primary-light text-primary border border-primary/10 rounded-2xl text-sm font-bold">
                  データを読み込んでいます...
                </div>
              )}
              <Routes>
                <Route path="/" element={
                  currentUser.role === UserRole.SUPPLIER
                    ? <Navigate to="/projects" replace />
                    : currentUser.role === UserRole.SALES
                      ? <Navigate to="/projects" replace />
                    : <DashboardCockpit projects={projects} products={products} suppliers={suppliers} clients={clients} />
                } />
                <Route path="/users" element={
                  currentUser.role === UserRole.ADMIN
                    ? <UserManagement users={users} suppliers={suppliers} onSave={handleSaveUser} onDelete={handleDeleteUser} />
                    : <Navigate to="/" replace />
                } />
                <Route path="/suppliers" element={
                  currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PRODUCT_MANAGER
                    ? <SupplierMaster suppliers={suppliers} canManage={currentUser.role === UserRole.ADMIN} onAdd={handleAddSupplier} onUpdate={handleUpdateSupplier} onDelete={handleDeleteSupplier} />
                    : <Navigate to="/" replace />
                } />
                <Route path="/clients" element={
                  currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PRODUCT_MANAGER
                    ? <ClientMaster clients={clients} canManage={currentUser.role === UserRole.ADMIN} onAdd={handleAddClient} onUpdate={handleUpdateClient} onDelete={handleDeleteClient} />
                    : <Navigate to="/" replace />
                } />
                <Route path="/projects" element={
                  <ProjectManagement
                    projects={projects}
                    products={products}
                    clients={clients}
                    users={users}
                    currentUser={currentUser}
                    onUpdate={handleUpdateProject}
                    onAdd={handleAddProject}
                    onDelete={handleDeleteProject}
                    onUpdateOrderStatus={handleUpdateOrderStatus}
                    onNotify={showToast}
                  />
                } />
                <Route path="/catalog" element={
                  <ProductCatalog
                    products={products}
                    suppliers={suppliers}
                    currentUser={currentUser}
                    onUpdate={handleUpdateProduct}
                    onAdd={handleAddProduct}
                    onDelete={handleDeleteProduct}
                    onDeleteImage={handleDeleteProductImage}
                    onNotify={showToast}
                  />
                } />
                <Route path="/approvals" element={
                  currentUser.role === UserRole.ADMIN
                    ? (
                      <ApprovalList
                        products={products}
                        onApprove={handleApproveProductChange}
                        onReject={handleRejectProductChange}
                      />
                    )
                    : <Navigate to="/" replace />
                } />
                <Route path="/exports" element={
                  currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PRODUCT_MANAGER
                    ? <ExportData />
                    : <Navigate to="/" replace />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          )
        } />
      </Routes>
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog state={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </Router>
  );
}
