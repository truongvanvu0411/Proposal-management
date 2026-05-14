import { 
  User, UserRole, Supplier, Client, Product, ProductStatus, ProductType, 
  OrderRequest, OrderStatus, ChangeRequest, Proposal, Project, ProjectStatus 
} from '../types';

export const dummySuppliers: Supplier[] = [
  { id: 'sup-1', name: '株式会社ABCマニュファクチャリング', contactName: '佐藤 健一', email: 'sato@abc-mf.jp', address: '東京都江東区3-1-1', phone: '03-1111-2222' },
  { id: 'sup-2', name: 'グローバル貿易株式会社', contactName: '田中 美穂', email: 'tanaka@global-trade.com', address: '大阪府大阪市北区1-2-3', phone: '06-3333-4444' },
  { id: 'sup-3', name: 'テック用品工業', contactName: '鈴木 浩', email: 'suzuki@tech-goods.jp', address: '神奈川県横浜市中区5-5-5', phone: '045-888-9999' },
];

export const dummyClients: Client[] = [
  { id: 'cli-1', name: '三井不動産株式会社', contactName: '山本 智也', email: 'yamamoto@mitsui-fudosan.co.jp', address: '東京都中央区日本橋2-1-1', phone: '03-5555-6666' },
  { id: 'cli-2', name: '森ビル株式会社', contactName: '伊藤 香織', email: 'ito@mori.co.jp', address: '東京都港区六本木6-10-1', phone: '03-7777-8888' },
  { id: 'cli-3', name: '三菱地所株式会社', contactName: '小林 竜馬', email: 'kobayashi@mec.co.jp', address: '東京都千代田区大手町1-1-1', phone: '03-9999-0000' },
];

export const dummyProducts: Product[] = [
  {
    id: 'p-1',
    name: 'エコフレンドリー 竹製カトラリーセット',
    description: '環境に優しい竹素材を使用したポータブルなカトラリーセットです。ケース付き。キャンプやオフィスでのランチに最適です。100%生分解性の素材を使用しています。',
    categoryId: 'cat-1',
    categoryName: 'キッチン用品',
    janCode: '4901234567890',
    productType: ProductType.WAREHOUSE,
    cost: 350,
    listPrice: 1200,
    minLot: 100,
    leadTime: '14日',
    supplierId: 'sup-1',
    supplierName: '株式会社ABCマニュファクチャリング',
    status: ProductStatus.ACTIVE,
    images: ['https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&q=80&w=400'],
    attachments: ['spec_sheet.pdf'],
    createdAt: '2024-01-15',
    version: 1,
  },
  {
    id: 'p-2',
    name: 'ノイズキャンセリング ワイヤレスイヤホン V2',
    description: '最新のチップを搭載した高音質ワイヤレスイヤホン。周囲のノイズを最大98%カット。連続再生8時間、ケース併用で最大30時間使用可能。',
    categoryId: 'cat-2',
    categoryName: 'ガジェット',
    janCode: '4901112223334',
    productType: ProductType.DIRECT,
    cost: 4500,
    listPrice: 15800,
    minLot: 20,
    leadTime: '7日',
    supplierId: 'sup-3',
    supplierName: 'テック用品工業',
    status: ProductStatus.ACTIVE,
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400'],
    attachments: ['manual_jp.pdf', 'certification.zip'],
    createdAt: '2024-02-01',
    version: 1,
  },
  {
    id: 'p-3',
    name: '高品質オーガニックコットン トートバッグ',
    description: '厚手のキャンバス生地を使用した丈夫なトートバッグ。環境負荷の低い染料を使用しており、長くお使いいただけます。企業ロゴの印刷も承ります。',
    categoryId: 'cat-3',
    categoryName: 'バッグ・小物',
    janCode: '4905556667778',
    productType: ProductType.WAREHOUSE,
    cost: 800,
    listPrice: 2500,
    minLot: 50,
    leadTime: '21日',
    supplierId: 'sup-2',
    supplierName: 'グローバル貿易株式会社',
    status: ProductStatus.ACTIVE,
    images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400'],
    attachments: [],
    createdAt: '2024-03-10',
    version: 1,
  },
  {
    id: 'p-4',
    name: 'スマート温湿度計 (IoT対応)',
    description: 'スマホと連携して室内環境をリアルタイム監視。アプリで履歴の確認や、他デバイスとの連携が可能です。ミニマルなデザインで部屋の雰囲気を壊しません。',
    categoryId: 'cat-2',
    categoryName: 'ガジェット',
    janCode: '4908889990001',
    productType: ProductType.DIRECT,
    cost: 1200,
    listPrice: 3980,
    minLot: 30,
    leadTime: '10日',
    supplierId: 'sup-3',
    supplierName: 'テック用品工業',
    status: ProductStatus.ACTIVE,
    images: ['https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&q=80&w=400'],
    attachments: [],
    createdAt: '2024-05-01',
    version: 1,
  }
];

export const dummyProjects: Project[] = [
  {
    id: 'proj-1',
    title: '三井不動産 ノベルティ提案',
    clientId: 'cli-1',
    clientName: '三井不動産株式会社',
    status: ProjectStatus.PROPOSED,
    totalRevenue: 6000000,
    totalProfit: 3690000,
    createdAt: '2024-05-10',
    updatedAt: '2024-05-12',
    products: [
      {
        productId: 'p-2',
        proposalComment: '高級ノベルティとして最適な最新イヤホンです。',
        cost: 4500,
        sellingPrice: 12000,
        quantity: 500,
        isAdopted: false
      }
    ],
    orderRequests: [
      {
        id: 'ord-1',
        projectId: 'proj-1',
        productId: 'p-2',
        productName: 'ノイズキャンセリング ワイヤレスイヤホン V2',
        supplierId: 'sup-3',
        quantity: 50,
        deliveryDate: '2024-06-20',
        deliveryLocation: '東京第一倉庫',
        status: OrderStatus.REQUESTED,
        orderType: 'NEW',
        createdAt: '2024-05-10',
      }
    ]
  }
];

export const dummyOrderRequests: OrderRequest[] = [
  {
    id: 'ord-1',
    projectId: 'proj-1',
    productId: 'p-2',
    productName: 'ノイズキャンセリング ワイヤレスイヤホン V2',
    supplierId: 'sup-3',
    quantity: 50,
    deliveryDate: '2024-06-20',
    deliveryLocation: '東京第一倉庫',
    status: OrderStatus.REQUESTED,
    orderType: 'NEW',
    createdAt: '2024-05-10',
  }
];

export const dummyChangeRequests: ChangeRequest[] = [
  {
    id: 'cr-1',
    type: 'COST_CHANGE',
    productId: 'p-1',
    productName: 'エコフレンドリー 竹製カトラリーセット',
    applicantId: 'sup-1',
    applicantName: '株式会社ABCマニュファクチャリング',
    status: 'PENDING',
    beforeValue: '350円',
    afterValue: '380円',
    comment: '原材料費高騰のため',
    createdAt: '2024-05-12',
  }
];

export const dummyProposals: Proposal[] = [
  {
    id: 'prop-1',
    title: '2024年 夏季プロモーション提案',
    clientId: 'cli-1',
    clientName: '大手流通チェーンX',
    productIds: ['p-1', 'p-3'],
    comments: {
      'p-1': 'エコ意識の高い顧客層に最適です。',
      'p-3': 'ノベルティとしての実績が豊富です。'
    },
    status: 'SENT',
    createdAt: '2024-04-20',
  }
];

export const currentUser: User = {
  id: 'u-1',
  name: '田中 太郎',
  email: 'tanaka@company.co.jp',
  role: UserRole.ADMIN,
};
