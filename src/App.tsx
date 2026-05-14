/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useLocation, 
  Navigate 
} from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Calculator, 
  CheckCircle2, 
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
  SearchIcon,
  HelpCircle,
  Mail,
  Calendar,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Wallet,
  Target,
  Zap,
  TrendingUp,
  TrendingDown,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell
} from 'recharts';

import { 
  Project, ProjectStatus, Product, ProjectProduct, ProductStatus, ProductType, ProductVersion, Supplier, Client, OrderRequest, OrderStatus
} from './types';
import { 
  dummyProducts, dummyChangeRequests, dummyProjects as initialProjects, dummySuppliers, dummyClients 
} from './lib/dummyData';

// --- Components ---

const projectStatusMap: Record<string, string> = {
  [ProjectStatus.DRAFT]: '下書き',
  [ProjectStatus.PROPOSED]: '提案中',
  [ProjectStatus.ADOPTED]: '成約',
  [ProjectStatus.REJECTED]: '却下',
};

const productStatusMap: Record<string, string> = {
  [ProductStatus.DRAFT]: '下書き',
  [ProductStatus.SUBMITTED]: '申請中',
  [ProductStatus.PENDING_APPROVAL]: '承認待ち',
  [ProductStatus.ACTIVE]: '公開中',
  [ProductStatus.ADOPTED]: '採用済み',
  [ProductStatus.INACTIVE]: '非公開',
  [ProductStatus.CANCELLED]: '中止',
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Badge = ({ children, status }: { children: React.ReactNode; status: string }) => {
  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider",
      status === 'ACTIVE' || status === 'ADOPTED' || status === 'COMPLETED' || status === 'APPROVED' || status === 'Success'
        ? "bg-primary-light text-primary border-primary/10" 
        : (status === 'CANCELLED' || status === 'REJECTED' ? "bg-red-50 text-red-500 border-red-100" : "bg-slate-50 text-slate-400 border-slate-100")
    )}>
      {children}
    </span>
  );
};

interface SidebarItemProps {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  to, 
  icon: Icon, 
  label, 
  active,
}) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
      active 
        ? "bg-primary-light text-primary" 
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full" />}
    <Icon size={20} className={cn(
      "transition-transform",
      active ? "text-primary" : "text-slate-400 group-hover:text-slate-900"
    )} />
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

// Placeholder components for missing pages
const AdoptionList = () => <div className="p-8 bg-white rounded-2xl border border-slate-100 font-bold text-slate-400 text-center">採用管理画面（開発中）</div>;
const OrderManagement = () => <div className="p-8 bg-white rounded-2xl border border-slate-100 font-bold text-slate-400 text-center">発注管理画面（開発中）</div>;
const ExportData = () => {
  const datasets = [
    { id: 'projects', label: '案件一覧データ', desc: '全プロジェクトの基本情報、顧客情報、合計収支。', icon: FileBarChart, format: 'CSV / EXCEL' },
    { id: 'catalog', label: '商品マスタデータ', desc: '商品カタログの全マスタ情報（JAN、原価、上代等）。', icon: Package, format: 'CSV / JSON' },
    { id: 'web-extract', label: 'Web掲載データ抽出', desc: 'ECサイトやWebカタログ掲載用の画像・説明文一括抽出。', icon: Globe, format: 'ZIP (IMAGES+CSV)' },
    { id: 'internal-master', label: '社内用商品マスタ出力', desc: '基幹システム連携用の内部管理項目を含むフルデータ。', icon: LayoutDashboard, labelSuffix: ' (社内用)', format: 'EXCEL' },
    { id: 'orders', label: '発注履歴データ', desc: '成約案件に基づく個別の発注・仕入れ実績。', icon: ShoppingCart, format: 'EXCEL' },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">データ出力</h1>
        <p className="text-slate-500">業務データの外部出力およびバックアップを行います。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {datasets.map((d) => (
          <div key={d.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center">
            <div className="p-4 bg-slate-50 rounded-2xl mb-6 group-hover:bg-primary group-hover:text-white transition-all">
              <d.icon size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2 truncate w-full px-2">
              {d.label}
              {d.labelSuffix && <span className="text-xs text-blue-600">{d.labelSuffix}</span>}
            </h3>
            <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed h-10 line-clamp-2">{d.desc}</p>
            <div className="mt-auto w-full space-y-3">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d.format}</div>
              <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-100">
                <Download size={18} /> ダウンロード
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-primary rounded-3xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="space-y-2 relative z-10">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Instant Proposal Generator</h2>
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
  onUpdate, 
  onAdd, 
  onDelete, 
  onSelect, 
  isSelectionMode = false 
}: { 
  products: Product[],
  suppliers?: Supplier[],
  onUpdate?: (p: Product) => void,
  onAdd?: (p: Product) => void,
  onDelete?: (id: string) => void,
  onSelect?: (p: Product) => void, 
  isSelectionMode?: boolean 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCudModalOpen, setIsCudModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'INFO' | 'HISTORY'>('INFO');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalTab === 'HISTORY') return; // History tab doesn't have a form

    const formData = new FormData(e.target as HTMLFormElement);
    
    if (editingProduct) {
       // Push to approval instead of direct update
       const pendingProduct: Product = {
          ...editingProduct,
          status: ProductStatus.PENDING_APPROVAL,
          versions: [
             ...(editingProduct.versions || []),
             {
                version: (editingProduct.version || 1) + 1,
                cost: Number(formData.get('cost')),
                listPrice: Number(formData.get('listPrice')),
                description: formData.get('description') as string,
                createdAt: new Date().toISOString().split('T')[0]
             }
          ]
       };
       onUpdate?.(pendingProduct);
    } else {
       const supplierId = formData.get('supplierId') as string;
       const supplier = suppliers.find(s => s.id === supplierId);
       const newProduct: Product = {
          id: `PD-${Math.floor(Math.random() * 100000)}`,
          name: formData.get('name') as string,
          categoryName: formData.get('categoryName') as string,
          categoryId: 'cat-gen',
          janCode: formData.get('janCode') as string,
          cost: Number(formData.get('cost')),
          listPrice: Number(formData.get('listPrice')),
          images: [formData.get('imageUrl') as string || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
          status: ProductStatus.ACTIVE,
          description: formData.get('description') as string,
          supplierName: supplier?.name || 'Unknown Supplier',
          supplierId: supplierId || 'sup-gen',
          productType: ProductType.WAREHOUSE,
          minLot: Number(formData.get('minLot')) || 1,
          leadTime: formData.get('leadTime') as string || '3 days',
          attachments: [],
          createdAt: new Date().toISOString().split('T')[0],
          version: 1,
          versions: []
       };
       onAdd?.(newProduct);
    }
    
    setIsCudModalOpen(false);
    setEditingProduct(null);
    setModalTab('INFO');
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
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!isSelectionMode && (
            <button 
              onClick={() => { setIsCudModalOpen(true); setEditingProduct(null); }}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all shrink-0"
            >
              <Plus size={20} /> 新規登録
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredProducts.map((product) => (
          <motion.div 
            key={product.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col"
          >
            <div className="relative aspect-square overflow-hidden bg-slate-50">
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
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
            <div className="p-5 flex-1 flex flex-col justify-between" onClick={() => !isSelectionMode && setEditingProduct(product)}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight uppercase flex-1">{product.name}</h3>
                  <span className="text-[10px] font-black text-slate-300 ml-2">v{product.version || 1}</span>
                </div>
                {!isSelectionMode && (
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">JAN: {product.janCode}</p>
                    {product.status === ProductStatus.PENDING_APPROVAL && (
                       <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-widest">承認待ち</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-end justify-between mt-auto">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">販売単価</p>
                  <p className="text-lg font-black text-slate-900">¥{product.listPrice.toLocaleString()}</p>
                </div>
                {!isSelectionMode && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setIsCudModalOpen(true); }}
                      className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsCudModalOpen(false); setModalTab('INFO'); }} />
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
                <button type="button" onClick={() => { setIsCudModalOpen(false); setModalTab('INFO'); }} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              {editingProduct && (
                <div className="flex p-1 bg-slate-50 rounded-xl">
                  <button 
                    onClick={() => setModalTab('INFO')}
                    className={cn(
                      "flex-1 py-2 text-xs font-black rounded-lg transition-all",
                      modalTab === 'INFO' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    基本情報
                  </button>
                  <button 
                    onClick={() => setModalTab('HISTORY')}
                    className={cn(
                      "flex-1 py-2 text-xs font-black rounded-lg transition-all",
                      modalTab === 'HISTORY' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
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
                      <input name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">カテゴリ</label>
                      <input name="categoryName" defaultValue={editingProduct?.categoryName} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">JANコード</label>
                      <input name="janCode" defaultValue={editingProduct?.janCode} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">画像URL</label>
                      <input name="imageUrl" defaultValue={editingProduct?.images[0]} placeholder="https://..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">卸原価 (¥)</label>
                      <input name="cost" type="number" defaultValue={editingProduct?.cost} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">メーカー希望小売価格 (¥)</label>
                      <input name="listPrice" type="number" defaultValue={editingProduct?.listPrice} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">サプライヤー</label>
                      <select 
                        name="supplierId" 
                        defaultValue={editingProduct?.supplierId} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold appearance-none"
                      >
                        <option value="">選択してください</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">リードタイム</label>
                      <input name="leadTime" defaultValue={editingProduct?.leadTime} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">商品説明 (今回の更新内容をここに記述してください)</label>
                    <textarea name="description" defaultValue={editingProduct?.description} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                  </div>
                </div>
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                  <button type="button" onClick={() => { setIsCudModalOpen(false); setModalTab('INFO'); }} className="flex-1 py-3 text-slate-500 font-bold hover:text-slate-800">
                    キャンセル
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100">
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
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Version</p>
                        <p className="text-sm font-black text-slate-900">Current Production</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">原価</p>
                        <p className="font-bold text-slate-900">¥{editingProduct?.cost.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">小売価格</p>
                        <p className="font-bold text-slate-900">¥{editingProduct?.listPrice.toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 italic leading-relaxed">{editingProduct?.description || 'No description provided.'}</p>
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
                            <p className="text-sm font-bold text-slate-700">Archived Version</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="p-3 bg-slate-50/50 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">原価</p>
                            <p className="text-sm font-bold text-slate-600">¥{v.cost.toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-slate-50/50 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">小売価格</p>
                            <p className="text-sm font-bold text-slate-600">¥{v.listPrice.toLocaleString()}</p>
                          </div>
                        </div>
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
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                  <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-[10px] text-blue-700 font-bold leading-relaxed whitespace-pre-wrap">
                    変更履歴は読み取り専用です。バージョンを戻す場合は、基本情報タブから新しく上書き申請を行ってください。
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

const ProjectWizard = ({ onComplete, onCancel, products, clients = [] }: { onComplete: (p: Project) => void, onCancel: () => void, products: Product[], clients?: Client[] }) => {
  const [step, setStep] = useState(1);
  const [projectData, setProjectData] = useState<Partial<Project>>({
    title: '',
    clientId: '',
    clientName: '',
    products: [],
    status: ProjectStatus.DRAFT,
  });
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

  const addProduct = (p: Product) => {
    const exists = projectData.products?.find(pp => pp.productId === p.id);
    if (exists) return;

    const newProduct: ProjectProduct = {
      productId: p.id,
      proposalComment: '',
      cost: p.cost,
      sellingPrice: p.listPrice,
      quantity: 1,
      isAdopted: false
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

  const handleComplete = () => {
    const { totalRevenue, totalProfit } = calculateTotals();
    const finalProject: Project = {
      id: `PJ-${Math.floor(Math.random() * 10000)}`,
      title: projectData.title || '無題の案件',
      clientId: projectData.clientId!,
      clientName: projectData.clientName || '未記入クライアント',
      status: ProjectStatus.DRAFT,
      products: projectData.products || [],
      orderRequests: [],
      totalRevenue,
      totalProfit,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    onComplete(finalProject);
  };

  return (
    <div className="relative">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto">
        {/* Sticky Global Header */}
        <div className="p-8 border-b border-slate-100 bg-white sticky top-0 z-40">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
               <FileText className="text-blue-600" size={24} />
               新規案件作成
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
                  step === s ? "bg-blue-600 text-white scale-110 shadow-lg shadow-blue-100" : (step > s ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400")
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
                   <p className="text-sm font-bold text-blue-600">{projectData.products?.length} 商品</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">合計利益</p>
                   <p className="text-sm font-black text-emerald-600">¥{calculateTotals().totalProfit.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-8 min-h-[400px]">
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto space-y-6 py-10">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">案件名 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="例: 2024年秋季ノベルティ商談"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                  value={projectData.title}
                  onChange={e => setProjectData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">クライアント <span className="text-red-500">*</span></label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold appearance-none"
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
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition-all"
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
                              <img src={product?.images[0]} className="w-12 h-12 rounded-xl object-cover bg-slate-50" alt="" />
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
                        <div key={pp.productId} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col md:flex-row gap-6">
                           <div className="flex items-center gap-4 w-full md:w-1/3">
                              <img src={product?.images[0]} className="w-16 h-16 rounded-2xl object-cover bg-white shadow-sm" alt="" />
                              <div className="min-w-0">
                                 <h6 className="font-bold text-slate-900 text-sm truncate uppercase">{product?.name}</h6>
                                 <p className="text-[10px] text-slate-400 font-bold">原価: ¥{pp.cost.toLocaleString()}</p>
                              </div>
                           </div>
                           <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">提案価格</label>
                                 <input 
                                    type="number" 
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    value={pp.sellingPrice}
                                    onChange={e => updateProduct(pp.productId, { sellingPrice: Number(e.target.value) })}
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">数量</label>
                                 <input 
                                    type="number" 
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    value={pp.quantity}
                                    onChange={e => updateProduct(pp.productId, { quantity: Number(e.target.value) })}
                                 />
                              </div>
                              <div className="space-y-2 hidden md:block">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">単体粗利</label>
                                 <div className="px-4 py-2.5 bg-emerald-50 text-emerald-600 font-black text-sm rounded-xl border border-emerald-100 flex items-center">
                                    ¥{(pp.sellingPrice - pp.cost).toLocaleString()}
                                 </div>
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>

               <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-2xl space-y-6">
                  <div className="flex justify-between items-end border-b border-white/10 pb-6">
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">予想粗利益合計</p>
                        <p className="text-4xl font-black text-emerald-400">¥{calculateTotals().totalProfit.toLocaleString()}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">粗利率</p>
                        <p className="text-2xl font-black text-blue-400">
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

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onCancel()}
            className="px-8 py-4 text-slate-500 font-black hover:text-slate-800 transition-colors uppercase tracking-widest text-xs"
          >
            {step === 1 ? '作成をキャンセル' : 'ステップ ' + (step - 1) + ' に戻る'}
          </button>
          <div className="flex gap-4">
             <button
               onClick={() => {
                  if (step === 1 && (!projectData.title || !projectData.clientName)) {
                     alert('案件名とクライアント名を入力してください。');
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
            className="relative h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col z-[110]"
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
                    <p className="text-lg font-black text-blue-600">{projectData.products?.length} 商品が選択済み</p>
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
                         <img src={product?.images[0]} className="w-14 h-14 rounded-xl object-cover bg-slate-50 border border-slate-200" alt="" />
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

const ProjectManagement = ({ 
  projects, 
  products, 
  clients = [],
  onUpdate, 
  onAdd, 
  onDelete 
}: { 
  projects: Project[], 
  products: Product[],
  clients?: Client[],
  onUpdate: (p: Project) => void, 
  onAdd: (p: Project) => void, 
  onDelete: (id: string) => void 
}) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ORDERS'>('DETAILS');
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [manualAddStep, setManualAddStep] = useState<'SELECT' | 'CUSTOMIZE' | null>(null);
  const [selectedProductForManual, setSelectedProductForManual] = useState<Product | null>(null);

  const handleAddProject = (newProject: Project) => {
    onAdd(newProject);
    setIsWizardOpen(false);
  };

  const handleUpdateProject = (updated: Project) => {
    onUpdate(updated);
    setSelectedProject(updated);
    setIsEditingProject(false);
  };

  const handleDeleteProject = (id: string) => {
    onDelete(id);
    setSelectedProject(null);
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isWizardOpen) {
    return <ProjectWizard onComplete={handleAddProject} onCancel={() => setIsWizardOpen(false)} products={products} clients={clients} />;
  }

  return (
    <>
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">案件管理</h1>
            <p className="text-slate-500">提案中の案件および成約済み案件の管理を行います。</p>
          </div>
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
          >
            <Plus size={20} /> 新規案件を作成
          </button>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="案件名、クライアント名で検索..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="text-slate-400 shrink-0" size={18} />
            <select 
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 outline-none w-full md:w-48 appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">すべてのステータス</option>
              {Object.values(ProjectStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((proj) => (
            <div key={proj.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
              <div className="flex items-center gap-4 flex-1">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner",
                  proj.status === ProjectStatus.ADOPTED ? "bg-green-50 text-green-600" : (proj.status === ProjectStatus.REJECTED ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")
                )}>
                  {proj.clientName.substring(0, 1)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Badge status={proj.status}>{projectStatusMap[proj.status] || proj.status}</Badge>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{proj.id}</span>
                  </div>
                  <h3 className="font-black text-slate-900 text-xl group-hover:text-blue-600 transition-colors uppercase tracking-tight">{proj.title}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{proj.clientName} • 更新: {proj.updatedAt}</p>
                </div>
              </div>

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

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setSelectedProject(proj); setActiveTab('DETAILS'); }}
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
                 <select 
                   className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-600 outline-none"
                   value={selectedProject.status}
                   onChange={(e) => handleUpdateProject({ ...selectedProject, status: e.target.value as ProjectStatus, updatedAt: new Date().toISOString().split('T')[0] })}
                 >
                   {Object.values(ProjectStatus).map(s => (
                     <option key={s} value={s}>{s}</option>
                   ))}
                 </select>
                 <Badge status={selectedProject.status}>{projectStatusMap[selectedProject.status] || selectedProject.status}</Badge>
              </div>
            </div>

            <div className="flex border-b border-slate-100 bg-white sticky top-0 z-10">
               <button 
                 onClick={() => setActiveTab('DETAILS')}
                 className={cn(
                   "flex-1 py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all",
                   activeTab === 'DETAILS' ? "border-blue-600 text-blue-600 bg-blue-50/20" : "border-transparent text-slate-400 hover:text-slate-600"
                 )}
               >
                 基本情報 & 商品
               </button>
               <button 
                 onClick={() => setActiveTab('ORDERS')}
                 className={cn(
                   "flex-1 py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all",
                   activeTab === 'ORDERS' ? "border-blue-600 text-blue-600 bg-blue-50/20" : "border-transparent text-slate-400 hover:text-slate-600"
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
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold" 
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">クライアント</label>
                            <select 
                              name="clientId" 
                              defaultValue={selectedProject.clientId} 
                              required 
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold appearance-none"
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
                              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:scale-105 transition-all uppercase tracking-widest text-xs"
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
                       <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{selectedProject.clientName}</p>
                       <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedProject.title}</h2>
                       <div className="flex items-center gap-4 text-xs text-slate-400 font-bold uppercase tracking-widest">
                         <span>ID: {selectedProject.id}</span>
                         <span>•</span>
                         <span>作成: {selectedProject.createdAt}</span>
                       </div>
                     </div>
                     <button 
                       onClick={() => setIsEditingProject(true)}
                       className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                     >
                       <Edit size={20} />
                     </button>
                  </div>

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

                  <div className="space-y-6">
                    <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                      <Package className="text-blue-600" size={20} />
                      提案・採用商品リスト
                    </h4>

                    <div className="space-y-4">
                      {selectedProject.products.map(pp => {
                        const product = products.find(d => d.id === pp.productId);
                        
                        const handleAdoptProduct = () => {
                           const updatedProducts = selectedProject.products.map(p => 
                             p.productId === pp.productId ? { ...p, isAdopted: true } : p
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
                             createdAt: new Date().toISOString().split('T')[0],
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
                          <div key={pp.productId} className="p-6 bg-white border border-slate-100 rounded-3xl flex flex-col md:flex-row items-center gap-6 group hover:border-blue-200 transition-all">
                             <img src={product?.images[0]} className="w-20 h-20 rounded-2xl object-cover bg-slate-50 border border-slate-100" alt="" />
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                   <div className="flex items-center gap-2">
                                      <p className="font-black text-slate-900 text-lg uppercase truncate">{product?.name}</p>
                                      <Badge status={pp.isAdopted ? 'ADOPTED' : 'PROPOSED'}>{pp.isAdopted ? '採用' : '提案中'}</Badge>
                                   </div>
                                   {!pp.isAdopted && (
                                      <button 
                                        onClick={handleAdoptProduct}
                                        className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-lg hover:bg-emerald-600 transition-all shadow-md shadow-emerald-100 uppercase tracking-widest"
                                      >
                                        発注に切り替える
                                      </button>
                                   )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                   <div className="space-y-0.5">
                                      <p className="text-[10px] font-black text-slate-400 uppercase">提案単価</p>
                                      <p className="font-black text-slate-900">¥{pp.sellingPrice.toLocaleString()}</p>
                                   </div>
                                   <div className="space-y-0.5">
                                      <p className="text-[10px] font-black text-slate-400 uppercase">数量</p>
                                      <p className="font-black text-slate-900">{pp.quantity}</p>
                                   </div>
                                   <div className="space-y-0.5">
                                      <p className="text-[10px] font-black text-slate-400 uppercase font-black text-emerald-500">見込み利益</p>
                                      <p className="font-black text-emerald-600">¥{((pp.sellingPrice - pp.cost) * pp.quantity).toLocaleString()}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                        );
                      })}
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
                       <button 
                         onClick={() => setManualAddStep('SELECT')}
                         className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black flex items-center gap-2 hover:bg-slate-800 transition-all"
                       >
                          <Plus size={18} /> 新規発注を手動追加
                       </button>
                    </div>

                    <div className="space-y-4">
                       {selectedProject.orderRequests && selectedProject.orderRequests.length > 0 ? (
                          selectedProject.orderRequests.map(or => (
                             <div key={or.id} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs shadow-inner">ID</div>
                                      <div>
                                         <p className="font-black text-slate-900">{or.productName}</p>
                                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{or.id} • {or.createdAt}</p>
                                      </div>
                                   </div>
                                   <Badge status={or.status}>{or.status}</Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   <div className="p-3 bg-slate-50 rounded-2xl">
                                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">数量</p>
                                      <p className="font-bold text-slate-900">{or.quantity} units</p>
                                   </div>
                                   <div className="p-3 bg-slate-50 rounded-2xl">
                                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">納品希望日</p>
                                      <p className="font-bold text-slate-900">{or.deliveryDate}</p>
                                   </div>
                                   <div className="p-3 bg-slate-50 rounded-2xl md:col-span-2">
                                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">納品場所</p>
                                      <p className="font-bold text-slate-900">{or.deliveryLocation}</p>
                                   </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                   <button className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all">発注書PDF</button>
                                   <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-100">詳細・更新</button>
                                </div>
                             </div>
                          ))
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

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
               <button className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                  <FileText size={20} /> 提案書(PPTX)を出力
               </button>
               <button 
                 onClick={() => handleDeleteProject(selectedProject.id)}
                 className="px-6 py-4 border border-red-100 text-red-500 rounded-2xl font-black hover:bg-red-50 transition-all"
               >
                  <Trash2 size={20} />
               </button>
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
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                     defaultValue={selectedProject.title}
                     id="edit-project-title"
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">クライアント名</label>
                   <input 
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
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
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100"
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
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-600"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 custom-scrollbar bg-[#FAFBFF]">
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
                       "bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all group cursor-pointer flex flex-col overflow-hidden",
                       isAlreadyAdded && "opacity-60 cursor-not-allowed grayscale-[0.5]"
                     )}
                   >
                     <div className="relative aspect-video overflow-hidden">
                        <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute top-4 left-4">
                           <span className="bg-white/90 backdrop-blur-md text-[10px] font-black text-slate-900 px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider">
                              {p.categoryName}
                           </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="w-full bg-blue-600 text-white py-3 rounded-2xl flex items-center justify-center gap-2 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform font-black text-xs uppercase tracking-widest">
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
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">メーカー希望小売価格</p>
                              <div className="flex items-baseline gap-1">
                                 <span className="text-sm font-black text-slate-400">¥</span>
                                 <span className="text-2xl font-black text-slate-900">{p.listPrice.toLocaleString()}</span>
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
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">プロジェクト条件設定</p>
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
                    isAdopted: true
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
                       className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[24px] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-2xl" 
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">提案単価 (¥)</label>
                     <input 
                       name="sellingPrice" 
                       type="number" 
                       defaultValue={selectedProductForManual.listPrice} 
                       required 
                       className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[24px] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-2xl" 
                     />
                  </div>
               </div>
               <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">1ユニットあたりの利益</p>
                     <p className="text-2xl font-black text-emerald-600">¥{(selectedProductForManual.listPrice - selectedProductForManual.cost).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                     <TrendingUp className="text-emerald-600" size={24} />
                  </div>
               </div>
               <div className="flex flex-col gap-4 pt-6">
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black shadow-2xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm">
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

const Dashboard = () => {
  const chartData = useMemo(() => [
    { name: '提案中', value: initialProjects.filter(p => p.status === ProjectStatus.DRAFT || p.status === ProjectStatus.PROPOSED).length },
    { name: '成約済み', value: initialProjects.filter(p => p.status === ProjectStatus.ADOPTED).length },
    { name: '失注', value: initialProjects.filter(p => p.status === ProjectStatus.REJECTED).length },
  ], []);

  const totalRevenue = useMemo(() => initialProjects.reduce((acc, p) => acc + p.totalRevenue, 0), []);
  const totalProfit = useMemo(() => initialProjects.reduce((acc, p) => acc + p.totalProfit, 0), []);
  const activeProductsCount = dummyProducts.length;

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
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Package className="text-blue-500" size={20} />
                </div>
                <span className="font-semibold text-slate-700">登録製品数</span>
              </div>
              <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal size={20} /></button>
            </div>
            <div className="mt-8">
              <p className="text-3xl font-bold text-slate-900">{activeProductsCount.toLocaleString()} <span className="text-sm font-bold text-slate-400 italic">SKUs</span></p>
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
              <ResponsiveContainer width="100%" height="100%">
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
            {dummySuppliers.slice(0, 4).map((s, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-primary transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-300 text-xs">{s.name.substring(0, 1)}</div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-lg">{s.name}</p>
                    <p className="text-[10px] font-bold mt-1 text-primary">Active Partner</p>
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
                   {initialProjects.slice(0, 8).map((proj, i) => (
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

const ProposalBuilder = () => (
  <div className="p-8 bg-white rounded-2xl border border-slate-100 font-bold text-slate-400 text-center">提案書構成画面（案件管理内フローに集約予定）</div>
);

const ProfitLossCalc = () => (
  <div className="p-8 bg-white rounded-2xl border border-slate-100 font-bold text-slate-400 text-center">損益計算画面（案件管理内フローに集約予定）</div>
);

const ApprovalList = ({ products, onApprove, onReject }: { 
  products: Product[], 
  onApprove: (productId: string, version: ProductVersion) => void,
  onReject: (productId: string) => void
}) => {
  const pendingProducts = products.filter(p => p.status === ProductStatus.PENDING_APPROVAL);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900">承認待ち管理</h1>
        <p className="text-slate-500">修正された商品データの確認と承認を行います。</p>
      </div>

      {pendingProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {pendingProducts.map(p => {
            const currentVersion = p.versions?.[p.versions.length - 1]; // The latest one waiting for approval
            const previousVersion = p.versions?.[p.versions.length - 2];

            return (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-100">
                        {p.name.substring(0, 1)}
                      </div>
                      <div>
                         <h3 className="font-black text-slate-900 text-lg">{p.name}</h3>
                         <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>ID: {p.id}</span>
                            <span>•</span>
                            <span>Version: {(p.version || 1) + 1} (Pending)</span>
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
                        onClick={() => currentVersion && onApprove(p.id, currentVersion)}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
                      >
                        <Check size={18} /> 修正を承認
                      </button>
                   </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">旧データ (Ver.{p.version || 1})</p>
                      <div className="p-6 bg-slate-50 rounded-3xl space-y-3 opacity-60">
                         <div className="flex justify-between border-b border-white/50 pb-2">
                            <span className="text-xs font-bold text-slate-500">原価</span>
                            <span className="font-bold text-slate-700">¥{previousVersion?.cost.toLocaleString() || (p.cost.toLocaleString())}</span>
                         </div>
                         <div className="flex justify-between border-b border-white/50 pb-2">
                            <span className="text-xs font-bold text-slate-500">小売価格</span>
                            <span className="font-bold text-slate-700">¥{previousVersion?.listPrice.toLocaleString() || (p.listPrice.toLocaleString())}</span>
                         </div>
                         <div className="text-xs text-slate-500 italic">
                            {previousVersion?.description || p.description}
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-2">修正案 (Ver.{(p.version || 1) + 1})</p>
                      <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-3xl space-y-3">
                         <div className={cn(
                           "flex justify-between border-b border-blue-50 pb-2",
                           currentVersion?.cost !== (previousVersion?.cost || p.cost) && "bg-blue-50 p-1 rounded -m-1"
                         )}>
                            <span className="text-xs font-bold text-blue-600">原価</span>
                            <span className="font-black text-slate-900 flex items-center gap-2">
                               ¥{currentVersion?.cost.toLocaleString()}
                               {currentVersion?.cost !== (previousVersion?.cost || p.cost) && <ArrowUpRight size={14} className="text-blue-500" />}
                            </span>
                         </div>
                         <div className={cn(
                           "flex justify-between border-b border-blue-50 pb-2",
                           currentVersion?.listPrice !== (previousVersion?.listPrice || p.listPrice) && "bg-blue-50 p-1 rounded -m-1"
                         )}>
                            <span className="text-xs font-bold text-blue-600">小売価格</span>
                            <span className="font-black text-slate-900 flex items-center gap-2">
                               ¥{currentVersion?.listPrice.toLocaleString()}
                               {currentVersion?.listPrice !== (previousVersion?.listPrice || p.listPrice) && <ArrowUpRight size={14} className="text-blue-500" />}
                            </span>
                         </div>
                         <div className="text-xs text-slate-700 font-medium leading-relaxed">
                            {currentVersion?.description}
                         </div>
                         <div className="mt-4 pt-4 border-t border-blue-50 flex items-center gap-2 text-[10px] text-blue-400 font-bold">
                            <History size={14} />
                            修正日: {currentVersion?.createdAt} by System Admin
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-32 bg-white rounded-[40px] border border-slate-100 flex flex-col items-center justify-center text-center space-y-6">
           <div className="w-24 h-24 bg-blue-50 rounded-[32px] flex items-center justify-center">
              <CheckCircle2 size={48} className="text-blue-200" />
           </div>
           <div>
              <p className="text-xl font-black text-slate-900">承認待ちの商品はありません</p>
              <p className="text-slate-400 font-medium mt-2">すべての商品データは最新の状態です。</p>
           </div>
        </div>
      )}
    </div>
  );
};

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const menuSections = [
    {
      title: 'メインメニュー',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' },
        { to: '/projects', icon: FileBarChart, label: '案件管理' },
        { to: '/catalog', icon: Package, label: '商品カタログ' },
        { to: '/approvals', icon: Bell, label: '承認待ち' },
      ]
    },
    {
      title: '機能',
      items: [
        { to: '/suppliers', icon: ShoppingCart, label: 'サプライヤー' },
        { to: '/clients', icon: Users, label: 'クライアント' },
        { to: '/exports', icon: Download, label: 'データ出力' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFB] font-sans flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-slate-100 flex-shrink-0 z-30"
      >
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                 <Zap className="text-white fill-white" size={18} />
              </div>
              <p className="text-xl font-bold text-slate-900 tracking-tight">提案一元管理</p>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-300 hover:text-slate-600">
               <ChevronLeft size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
            {menuSections.map((section, idx) => (
              <div key={idx} className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarItem 
                      key={item.label} 
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      active={location.pathname === item.to} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto pt-6">
            <div className="bg-primary p-6 rounded-3xl relative overflow-hidden group">
               <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full transition-transform group-hover:scale-150 duration-500" />
               <div className="relative z-10 space-y-4">
                  <div>
                    <h4 className="text-white font-bold text-sm">プロ版へアップグレード 🚀</h4>
                    <p className="text-white/70 text-[10px] mt-1 font-medium leading-relaxed">より高度な組織管理と生産性の向上を</p>
                  </div>
                  <button className="w-full py-2.5 bg-white text-primary rounded-xl text-xs font-bold shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                    <TrendingUp size={14} /> アップグレード
                  </button>
               </div>
            </div>

            <button className="w-full mt-6 py-3 flex items-center justify-between text-xs font-bold text-slate-500 hover:text-red-500 transition-colors px-4 border border-slate-50 rounded-xl">
               ログアウト <LogOut size={16} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto w-full relative">
        <header className="h-20 flex items-center justify-between px-10 bg-white/80 backdrop-blur-md border-b border-slate-50 sticky top-0 z-20">
          <div className="flex items-center gap-8 w-full max-w-2xl">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-500 shadow-sm hover:bg-slate-50 transition-all"
              >
                <Menu size={20} />
              </button>
            )}
            
            <div className="relative flex-1 group">
               <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
               <input 
                type="text" 
                placeholder="検索..." 
                className="w-full h-11 pl-12 pr-10 bg-[#F8FAFB] border border-transparent rounded-2xl focus:bg-white focus:border-slate-100 outline-none transition-all text-sm font-medium"
               />
               <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white px-1.5 py-0.5 border border-slate-100 rounded-lg text-[10px] font-black text-slate-300">
                  <ChevronRight size={10} className="rotate-270" /> K
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {[HelpCircle, Mail, Bell].map((Icon, i) => (
                <button key={i} className="p-2.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl transition-all relative">
                  <Icon size={20} />
                  {i === 2 && <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white" />}
                </button>
              ))}
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
                  <p className="text-sm font-bold text-slate-900 leading-none mb-1">田中 太郎</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">管理者</p>
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

const SupplierMaster = ({ suppliers, onAdd, onUpdate, onDelete }: { suppliers: Supplier[], onAdd: (s: Supplier) => void, onUpdate: (s: Supplier) => void, onDelete: (id: string) => void }) => {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900">サプライヤーマスター</h1>
            <p className="text-slate-500">取引先仕入先の情報を管理します。</p>
          </div>
          <button onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center gap-2">
            <Plus size={20} /> 新規登録
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center font-black text-blue-600 text-xl">{s.name.charAt(0)}</div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingSupplier(s); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-600"><Edit size={18} /></button>
                  <button onClick={() => onDelete(s.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
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
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 overflow-y-auto custom-scrollbar">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6 my-auto"
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
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl uppercase text-xs">保存</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
};

const ClientMaster = ({ clients, onAdd, onUpdate, onDelete }: { clients: Client[], onAdd: (c: Client) => void, onUpdate: (c: Client) => void, onDelete: (id: string) => void }) => {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900">クライアントマスター</h1>
            <p className="text-slate-500">取引先顧客の情報を管理します。</p>
          </div>
          <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-100 flex items-center gap-2">
            <Plus size={20} /> 新規登録
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(c => (
            <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white text-xl">{c.name.charAt(0)}</div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingClient(c); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-600"><Edit size={18} /></button>
                  <button onClick={() => onDelete(c.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
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
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 overflow-y-auto custom-scrollbar">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6 my-auto"
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
      )}
    </>
  );
};

export default function App() {
  const [products, setProducts] = useState<Product[]>(dummyProducts);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [suppliers, setSuppliers] = useState<Supplier[]>(dummySuppliers);
  const [clients, setClients] = useState<Client[]>(dummyClients);

  const handleUpdateProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('この商品をカタログから削除してもよろしいですか？')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleApproveProductChange = (productId: string, version: ProductVersion) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          version: version.version,
          cost: version.cost,
          listPrice: version.listPrice,
          description: version.description,
          status: ProductStatus.ACTIVE,
          updatedAt: new Date().toISOString().split('T')[0]
        };
      }
      return p;
    }));
  };

  const handleRejectProductChange = (productId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        // Remove the latest pending version
        const newVersions = [...(p.versions || [])];
        newVersions.pop();
        return {
          ...p,
          status: ProductStatus.ACTIVE,
          versions: newVersions
        };
      }
      return p;
    }));
  };

  const handleUpdateProject = (updated: Project) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleAddProject = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('この案件を削除してもよろしいですか？')) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleAddSupplier = (newSupplier: Supplier) => setSuppliers(prev => [newSupplier, ...prev]);
  const handleUpdateSupplier = (updated: Supplier) => setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
  const handleDeleteSupplier = (id: string) => {
    if (confirm('このサプライヤーを削除してもよろしいですか？')) {
      setSuppliers(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleAddClient = (newClient: Client) => setClients(prev => [newClient, ...prev]);
  const handleUpdateClient = (updated: Client) => setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
  const handleDeleteClient = (id: string) => {
    if (confirm('このクライアントを削除してもよろしいですか？')) {
      setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold text-2xl">BPMS Login</div>} />
        <Route path="/*" element={
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/suppliers" element={<SupplierMaster suppliers={suppliers} onAdd={handleAddSupplier} onUpdate={handleUpdateSupplier} onDelete={handleDeleteSupplier} />} />
              <Route path="/clients" element={<ClientMaster clients={clients} onAdd={handleAddClient} onUpdate={handleUpdateClient} onDelete={handleDeleteClient} />} />
              <Route path="/projects" element={
                <ProjectManagement 
                  projects={projects} 
                  products={products}
                  clients={clients}
                  onUpdate={handleUpdateProject} 
                  onAdd={handleAddProject} 
                  onDelete={handleDeleteProject} 
                />
              } />
              <Route path="/catalog" element={
                <ProductCatalog 
                  products={products}
                  suppliers={suppliers}
                  onUpdate={handleUpdateProduct}
                  onAdd={handleAddProduct}
                  onDelete={handleDeleteProduct}
                />
              } />
              <Route path="/approvals" element={
                <ApprovalList 
                  products={products} 
                  onApprove={handleApproveProductChange}
                  onReject={handleRejectProductChange}
                />
              } />
              <Route path="/exports" element={<ExportData />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MainLayout>
        } />
      </Routes>
    </Router>
  );
}
