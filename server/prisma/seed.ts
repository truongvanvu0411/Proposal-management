import bcrypt from 'bcryptjs';
import {
  ChangeRequestStatus,
  ChangeRequestType,
  OrderStatus,
  OrderType,
  ProductStatus,
  ProductType,
  ProjectStatus,
  ProposalStatus,
  UserRole,
} from '@prisma/client';
import { getPrisma, disconnectPrisma } from '../src/db/prisma';

const prisma = getPrisma();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('SEED_ADMIN_PASSWORD is required for db:seed');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Admin User',
      passwordHash,
      role: UserRole.ADMIN,
      deletedAt: null,
    },
    create: {
      name: 'Admin User',
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const supplier1 = await prisma.supplier.upsert({
    where: { id: '11111111-1111-4111-8111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-4111-8111-111111111111',
      name: '株式会社ABCマニュファクチャリング',
      contactName: '佐藤 健一',
      email: 'sato@abc-mf.jp',
      address: '東京都江東区3-1-1',
      phone: '03-1111-2222',
    },
  });

  const supplierEmail = process.env.SEED_SUPPLIER_EMAIL ?? 'supplier@example.com';
  const supplierPassword = process.env.SEED_SUPPLIER_PASSWORD ?? adminPassword;
  await prisma.user.upsert({
    where: { email: supplierEmail },
    update: {
      name: 'Supplier User',
      passwordHash: await bcrypt.hash(supplierPassword, 12),
      role: UserRole.SUPPLIER,
      supplierId: supplier1.id,
      deletedAt: null,
    },
    create: {
      name: 'Supplier User',
      email: supplierEmail,
      passwordHash: await bcrypt.hash(supplierPassword, 12),
      role: UserRole.SUPPLIER,
      supplierId: supplier1.id,
    },
  });

  const productManager = await prisma.user.upsert({
    where: { email: 'product.staff@example.com' },
    update: {
      name: 'Product PIC',
      passwordHash,
      role: UserRole.PRODUCT_MANAGER,
      supplierId: null,
      deletedAt: null,
    },
    create: {
      name: 'Product PIC',
      email: 'product.staff@example.com',
      passwordHash,
      role: UserRole.PRODUCT_MANAGER,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: {
      name: 'Sales User',
      passwordHash,
      role: UserRole.SALES,
      supplierId: null,
      deletedAt: null,
    },
    create: {
      name: 'Sales User',
      email: 'sales@example.com',
      passwordHash,
      role: UserRole.SALES,
    },
  });

  void productManager;

  const supplier2 = await prisma.supplier.upsert({
    where: { id: '22222222-2222-4222-8222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'グローバル貿易株式会社',
      contactName: '田中 美穂',
      email: 'tanaka@global-trade.com',
      address: '大阪府大阪市北区1-2-3',
      phone: '06-3333-4444',
    },
  });

  const supplier3 = await prisma.supplier.upsert({
    where: { id: '33333333-3333-4333-8333-333333333333' },
    update: {},
    create: {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'テック用品工業',
      contactName: '鈴木 浩',
      email: 'suzuki@tech-goods.jp',
      address: '神奈川県横浜市中区5-5-5',
      phone: '045-888-9999',
    },
  });

  const client1 = await prisma.client.upsert({
    where: { id: '44444444-4444-4444-8444-444444444444' },
    update: {},
    create: {
      id: '44444444-4444-4444-8444-444444444444',
      name: '三井不動産株式会社',
      contactName: '山本 智也',
      email: 'yamamoto@mitsui-fudosan.co.jp',
      address: '東京都中央区日本橋2-1-1',
      phone: '03-5555-6666',
    },
  });

  await prisma.client.upsert({
    where: { id: '55555555-5555-4555-8555-555555555555' },
    update: {},
    create: {
      id: '55555555-5555-4555-8555-555555555555',
      name: '森ビル株式会社',
      contactName: '伊藤 香織',
      email: 'ito@mori.co.jp',
      address: '東京都港区六本木6-10-1',
      phone: '03-7777-8888',
    },
  });

  const kitchen = await prisma.category.upsert({
    where: { name: 'キッチン用品' },
    update: {},
    create: { name: 'キッチン用品' },
  });
  const gadgets = await prisma.category.upsert({
    where: { name: 'ガジェット' },
    update: {},
    create: { name: 'ガジェット' },
  });
  const bags = await prisma.category.upsert({
    where: { name: 'バッグ・小物' },
    update: {},
    create: { name: 'バッグ・小物' },
  });
  const beauty = await prisma.category.upsert({
    where: { name: 'ビューティー・ケア' },
    update: {},
    create: { name: 'ビューティー・ケア' },
  });
  const lifestyle = await prisma.category.upsert({
    where: { name: 'ライフスタイル雑貨' },
    update: {},
    create: { name: 'ライフスタイル雑貨' },
  });

  const product1 = await prisma.product.upsert({
    where: { janCode: '4901234567890' },
    update: {
      modelNumber: 'ECO-CUT-001',
      features: ['竹素材で環境配慮', '持ち運びしやすい専用ケース付き', 'ノベルティ向けに名入れ対応可能'],
    },
    create: {
      name: 'エコフレンドリー 竹製カトラリーセット',
      description: '環境に優しい竹素材を使用したポータブルなカトラリーセットです。',
      modelNumber: 'ECO-CUT-001',
      features: ['竹素材で環境配慮', '持ち運びしやすい専用ケース付き', 'ノベルティ向けに名入れ対応可能'],
      categoryId: kitchen.id,
      janCode: '4901234567890',
      productType: ProductType.WAREHOUSE,
      cost: 350,
      listPrice: 1200,
      minLot: 100,
      leadTime: '14日',
      supplierId: supplier1.id,
      status: ProductStatus.ACTIVE,
      imageUrl: 'https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&q=80&w=400',
      version: 1,
    },
  });

  const product2 = await prisma.product.upsert({
    where: { janCode: '4901112223334' },
    update: {
      modelNumber: 'NC-EAR-V2',
      features: ['高音質ノイズキャンセリング', '長時間バッテリー', '高級感のあるギフト仕様'],
    },
    create: {
      name: 'ノイズキャンセリング ワイヤレスイヤホン V2',
      description: '最新のチップを搭載した高音質ワイヤレスイヤホン。',
      modelNumber: 'NC-EAR-V2',
      features: ['高音質ノイズキャンセリング', '長時間バッテリー', '高級感のあるギフト仕様'],
      categoryId: gadgets.id,
      janCode: '4901112223334',
      productType: ProductType.DIRECT,
      cost: 4500,
      listPrice: 15800,
      minLot: 20,
      leadTime: '7日',
      supplierId: supplier3.id,
      status: ProductStatus.ACTIVE,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400',
      version: 1,
    },
  });

  const product3 = await prisma.product.upsert({
    where: { janCode: '4905556667778' },
    update: {
      modelNumber: 'ORG-TOTE-500',
      features: ['厚手キャンバスで高耐久', 'オーガニックコットン使用', '企業ロゴ印刷に対応'],
    },
    create: {
      name: '高品質オーガニックコットン トートバッグ',
      description: '厚手のキャンバス生地を使用した丈夫なトートバッグ。',
      modelNumber: 'ORG-TOTE-500',
      features: ['厚手キャンバスで高耐久', 'オーガニックコットン使用', '企業ロゴ印刷に対応'],
      categoryId: bags.id,
      janCode: '4905556667778',
      productType: ProductType.WAREHOUSE,
      cost: 800,
      listPrice: 2500,
      minLot: 50,
      leadTime: '21日',
      supplierId: supplier2.id,
      status: ProductStatus.ACTIVE,
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400',
      version: 1,
    },
  });

  const catalogProducts = [
    {
      name: 'プレミアム スキンケアギフトセット',
      description: '洗面台やホテルアメニティ向けに見栄えの良いスキンケアセットです。',
      modelNumber: 'BEA-SET-174',
      categoryId: beauty.id,
      janCode: '4910000000174',
      productType: ProductType.WAREHOUSE,
      cost: 980,
      minLot: 30,
      leadTime: '10日',
      supplierId: supplier1.id,
      imageUrl: '/assets/catalog/thumbs/174.webp',
      features: ['ギフト映えするパッケージ', '法人ノベルティ向け', '小ロット相談可能'],
    },
    {
      name: 'ナチュラル ハンドケアボトル',
      description: 'デスクや受付に置きやすい自然派ハンドケアボトルです。',
      modelNumber: 'CARE-18030441',
      categoryId: beauty.id,
      janCode: '4910001803041',
      productType: ProductType.DIRECT,
      cost: 720,
      minLot: 50,
      leadTime: '12日',
      supplierId: supplier2.id,
      imageUrl: '/assets/catalog/thumbs/18030441.webp',
      features: ['自然派イメージ', '配布しやすいサイズ', '季節キャンペーン向け'],
    },
    {
      name: 'ミニマル コスメポーチ',
      description: '日常使いしやすいシンプルなコスメポーチです。',
      modelNumber: 'POUCH-136B',
      categoryId: bags.id,
      janCode: '4910000000136',
      productType: ProductType.WAREHOUSE,
      cost: 540,
      minLot: 80,
      leadTime: '14日',
      supplierId: supplier2.id,
      imageUrl: '/assets/catalog/thumbs/2307-w006-n001-136B-p12-136.webp',
      features: ['軽量で持ち運びやすい', '名入れ対応', '女性向け販促に最適'],
    },
    {
      name: 'トラベル オーガナイザーケース',
      description: '旅行や出張の小物整理に便利な収納ケースです。',
      modelNumber: 'TRV-3B',
      categoryId: bags.id,
      janCode: '4910000000003',
      productType: ProductType.WAREHOUSE,
      cost: 680,
      minLot: 60,
      leadTime: '18日',
      supplierId: supplier3.id,
      imageUrl: '/assets/catalog/thumbs/2307-w019-n001-3B-p10-3.webp',
      features: ['収納力が高い', '出張ノベルティ向け', '落ち着いたデザイン'],
    },
    {
      name: 'アロマディフューザーセット',
      description: '空間演出に使えるアロマディフューザーのセット商品です。',
      modelNumber: 'AROMA-2533',
      categoryId: lifestyle.id,
      janCode: '4910000002533',
      productType: ProductType.DIRECT,
      cost: 1250,
      minLot: 20,
      leadTime: '9日',
      supplierId: supplier1.id,
      imageUrl: '/assets/catalog/thumbs/2533.webp',
      features: ['高級感のある見た目', '受付・客室向け', 'ギフト利用に最適'],
    },
    {
      name: 'デスクトップ リラックスグッズ',
      description: 'オフィスワーカー向けの癒やし系デスク小物です。',
      modelNumber: 'RELAX-255',
      categoryId: lifestyle.id,
      janCode: '4910000000255',
      productType: ProductType.WAREHOUSE,
      cost: 430,
      minLot: 100,
      leadTime: '15日',
      supplierId: supplier3.id,
      imageUrl: '/assets/catalog/thumbs/255.webp',
      features: ['デスクに置きやすい', '幅広い層に配布可能', '低単価で提案しやすい'],
    },
    {
      name: 'ギフト用 セルフケアボックス',
      description: '複数アイテムをまとめたセルフケア向けギフトボックスです。',
      modelNumber: 'SELF-36B',
      categoryId: beauty.id,
      janCode: '4910000000036',
      productType: ProductType.WAREHOUSE,
      cost: 1580,
      minLot: 25,
      leadTime: '16日',
      supplierId: supplier2.id,
      imageUrl: '/assets/catalog/thumbs/56Z_2111.w006.n001.36B.p18.36.webp',
      features: ['複数アイテム入り', '福利厚生ギフト向け', '開封体験が良い'],
    },
    {
      name: 'ホテルライク スキンケアアメニティ',
      description: 'ホテルや住宅展示場の来場者向けに使いやすいスキンケア商品です。',
      modelNumber: 'AMN-BATH',
      categoryId: beauty.id,
      janCode: '4910001000001',
      productType: ProductType.DIRECT,
      cost: 890,
      minLot: 40,
      leadTime: '11日',
      supplierId: supplier1.id,
      imageUrl: '/assets/catalog/thumbs/beauty-skincare-products-bathroom.webp',
      features: ['清潔感のあるデザイン', '来場特典向け', '高見えする構成'],
    },
    {
      name: 'ナチュラル オイルドロッパー',
      description: '自然派ブランド訴求に合うオイルドロッパー商品です。',
      modelNumber: 'OIL-DROP',
      categoryId: beauty.id,
      janCode: '4910001000002',
      productType: ProductType.WAREHOUSE,
      cost: 760,
      minLot: 50,
      leadTime: '13日',
      supplierId: supplier3.id,
      imageUrl: '/assets/catalog/thumbs/natural-self-care-oil-dropper.webp',
      features: ['ナチュラル訴求', '美容イベント向け', '手に取りやすいサイズ'],
    },
    {
      name: 'セルフケア ミニボトル',
      description: '配布しやすい小型サイズのセルフケアボトルです。',
      modelNumber: 'SELF-MINI',
      categoryId: beauty.id,
      janCode: '4910001000003',
      productType: ProductType.WAREHOUSE,
      cost: 520,
      minLot: 100,
      leadTime: '10日',
      supplierId: supplier2.id,
      imageUrl: '/assets/catalog/thumbs/natural-self-care-product.webp',
      features: ['小型で配布しやすい', '低予算案件向け', 'シリーズ展開可能'],
    },
  ];

  for (const item of catalogProducts) {
    await prisma.product.upsert({
      where: { janCode: item.janCode },
      update: {
        name: item.name,
        description: item.description,
        modelNumber: item.modelNumber,
        features: item.features,
        categoryId: item.categoryId,
        productType: item.productType,
        cost: item.cost,
        listPrice: item.cost,
        minLot: item.minLot,
        leadTime: item.leadTime,
        supplierId: item.supplierId,
        status: ProductStatus.ACTIVE,
        imageUrl: item.imageUrl,
      },
      create: {
        ...item,
        listPrice: item.cost,
        status: ProductStatus.ACTIVE,
        version: 1,
        versions: {
          create: {
            version: 1,
            cost: item.cost,
            listPrice: item.cost,
            description: item.description,
          },
        },
      },
    });
  }

  const project = await prisma.project.upsert({
    where: { id: '66666666-6666-4666-8666-666666666666' },
    update: {
      proposalBackground: '新規プロモーション施策向けに、実用性とブランド価値を両立できるノベルティ商品の提案が求められています。',
      recommendationPoints: ['高級感があり法人顧客向けギフトとして使いやすい', '短納期でキャンペーン日程に合わせやすい', '価格と品質のバランスが良く利益計画を立てやすい'],
      remarks: '正式発注日と納品日は採用決定後に最終調整します。',
      assignedSalesUserId: salesUser.id,
    },
    create: {
      id: '66666666-6666-4666-8666-666666666666',
      title: '三井不動産 ノベルティ提案',
      proposalBackground: '新規プロモーション施策向けに、実用性とブランド価値を両立できるノベルティ商品の提案が求められています。',
      recommendationPoints: ['高級感があり法人顧客向けギフトとして使いやすい', '短納期でキャンペーン日程に合わせやすい', '価格と品質のバランスが良く利益計画を立てやすい'],
      remarks: '正式発注日と納品日は採用決定後に最終調整します。',
      clientId: client1.id,
      assignedSalesUserId: salesUser.id,
      status: ProjectStatus.PROPOSED,
      totalRevenue: 6000000,
      totalProfit: 3690000,
      products: {
        create: {
          productId: product2.id,
          proposalComment: '高級ノベルティとして最適な最新イヤホンです。',
          recommendationReasons: [
            { title: '品質', detail: 'ノイズキャンセリング機能と高音質により、受け取った顧客の満足度が高い商品です。' },
            { title: '納期', detail: '標準リードタイムが短く、キャンペーン開始日に合わせた調整がしやすいです。' },
            { title: '訴求力', detail: '実用性とプレミアム感があり、企業ブランドの印象向上に貢献します。' },
          ],
          cost: 4500,
          sellingPrice: 12000,
          quantity: 500,
          displayOrder: 0,
          isAdopted: true,
          companyProductCode: 'CMP-2026-0001',
          adoptionDate: new Date('2026-05-01T00:00:00.000Z'),
          orderPlannedDate: new Date('2026-05-10T00:00:00.000Z'),
          allowPublish: true,
          allowOrder: true,
        },
      },
    },
  });

  await prisma.projectProduct.updateMany({
    where: {
      projectId: project.id,
      productId: product2.id,
    },
    data: {
      isAdopted: true,
      companyProductCode: 'CMP-2026-0001',
      adoptionDate: new Date('2026-05-01T00:00:00.000Z'),
      orderPlannedDate: new Date('2026-05-10T00:00:00.000Z'),
      displayOrder: 0,
      recommendationReasons: [
        { title: '品質', detail: 'ノイズキャンセリング機能と高音質により、受け取った顧客の満足度が高い商品です。' },
        { title: '納期', detail: '標準リードタイムが短く、キャンペーン開始日に合わせた調整がしやすいです。' },
        { title: '訴求力', detail: '実用性とプレミアム感があり、企業ブランドの印象向上に貢献します。' },
      ],
      allowPublish: true,
      allowOrder: true,
    },
  });

  await prisma.orderRequest.upsert({
    where: { id: '77777777-7777-4777-8777-777777777777' },
    update: {},
    create: {
      id: '77777777-7777-4777-8777-777777777777',
      projectId: project.id,
      productId: product2.id,
      productName: product2.name,
      supplierId: supplier3.id,
      quantity: 50,
      deliveryDate: new Date('2024-06-20T00:00:00.000Z'),
      deliveryLocation: '東京第一倉庫',
      status: OrderStatus.REQUESTED,
      orderType: OrderType.NEW,
    },
  });

  await prisma.changeRequest.upsert({
    where: { id: '88888888-8888-4888-8888-888888888888' },
    update: {},
    create: {
      id: '88888888-8888-4888-8888-888888888888',
      type: ChangeRequestType.COST_CHANGE,
      productId: product1.id,
      applicantId: supplier1.id,
      applicantName: supplier1.name,
      status: ChangeRequestStatus.PENDING,
      beforeValue: '350円',
      afterValue: '380円',
      comment: '原材料費高騰のため',
    },
  });

  await prisma.proposal.upsert({
    where: { id: '99999999-9999-4999-8999-999999999999' },
    update: {},
    create: {
      id: '99999999-9999-4999-8999-999999999999',
      title: '2024年 夏季プロモーション提案',
      clientId: client1.id,
      status: ProposalStatus.SENT,
      items: {
        create: [
          {
            productId: product1.id,
            comment: 'エコ意識の高い顧客層に最適です。',
          },
          {
            productId: product3.id,
            comment: 'ノベルティとしての実績が豊富です。',
          },
        ],
      },
    },
  });

  console.log('[OK] Seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
