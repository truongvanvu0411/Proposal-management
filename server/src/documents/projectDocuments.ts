import fs from 'node:fs/promises';
import path from 'node:path';
import PizZip from 'pizzip';
import sharp from 'sharp';
import type { StorageService } from '../types';
import { toDateOnly, toNumber } from '../shared/dto';

export const documentPurposes = {
  proposal: 'PROJECT_PROPOSAL_PPTX',
  profitAndLoss: 'PROJECT_PL_XLSX',
} as const;

export type DocumentPurpose = (typeof documentPurposes)[keyof typeof documentPurposes];

export const documentConfig: Record<
  DocumentPurpose,
  { extension: string; mimeType: string; label: string }
> = {
  PROJECT_PROPOSAL_PPTX: {
    extension: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    label: 'proposal',
  },
  PROJECT_PL_XLSX: {
    extension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    label: 'pl',
  },
};

type ProjectDocument = {
  id: string;
  title: string;
  status: string;
  proposalBackground?: string | null;
  recommendationPoints?: unknown;
  remarks?: string | null;
  client?: { name: string } | null;
  totalRevenue: unknown;
  totalProfit: unknown;
  createdAt: Date;
  updatedAt: Date;
  products?: ProjectProductDocument[];
  orderRequests?: Array<{ deliveryDate?: Date | null }>;
};

type ProjectProductDocument = {
  proposalComment?: string | null;
  recommendationReasons?: unknown;
  cost: unknown;
  sellingPrice: unknown;
  quantity: number;
  displayOrder?: number;
  isAdopted: boolean;
  adoptionDate?: Date | null;
  orderPlannedDate?: Date | null;
  deliveryMethod?: string | null;
  product?: {
    name: string;
    description: string;
    modelNumber?: string | null;
    features?: unknown;
    janCode: string;
    productType: string;
    listPrice: unknown;
    minLot: number;
    leadTime: string;
    imageUrl?: string | null;
    category?: { name: string } | null;
    images?: Array<{
      sortOrder: number;
      file?: {
        objectKey: string;
        mimeType: string;
      } | null;
    }>;
  } | null;
};

export async function generateProposalPptx(
  project: ProjectDocument,
  actorName = '',
  storage?: StorageService,
) {
  const template = await fs.readFile(
    path.join(process.cwd(), 'template', 'Product_Proposal_Green_Theme.pptx'),
  );
  const zip = new PizZip(template);
  const products = [...(project.products ?? [])].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );
  const recommended = getRecommendedProduct(products);
  const today = toDateOnly(new Date());

  for (const fileName of Object.keys(zip.files).filter(
    (file) => file.startsWith('ppt/slides/slide') && file.endsWith('.xml'),
  )) {
    let xml = zip.file(fileName)?.asText() ?? '';
    for (const [find, replace] of buildGreenSlideReplacements(
      path.basename(fileName),
      project,
      products,
      recommended,
      today,
      actorName,
    )) {
      xml = replaceFirstXmlText(xml, find, replace);
    }
    zip.file(fileName, xml);
  }
  addGreenSlideOverlays(zip, project, products, today, actorName);

  if (storage) {
    await embedProposalProductImages(zip, products, storage);
  }

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function generateProfitAndLossXlsx(project: ProjectDocument) {
  const products = project.products ?? [];
  if (products.length > 12) {
    const error = new Error('P/L template supports up to 12 products');
    error.name = 'PL_TEMPLATE_ROW_LIMIT_EXCEEDED';
    throw error;
  }

  const template = await fs.readFile(
    path.join(process.cwd(), 'template', 'japanese_jissen_pl_template.xlsx'),
  );
  const zip = new PizZip(template);
  const sheetFile = zip.file('xl/worksheets/sheet1.xml');
  if (!sheetFile) {
    throw new Error('P/L worksheet not found');
  }
  let sheetXml = sheetFile.asText();

  const adoptedDate = products.find((product) => product.adoptionDate)?.adoptionDate;
  const deliveryDate = project.orderRequests?.[0]?.deliveryDate;
  const totalRevenue = products.reduce(
    (sum, product) => sum + toNumber(product.sellingPrice) * product.quantity,
    0,
  );
  const totalCost = products.reduce(
    (sum, product) => sum + toNumber(product.cost) * product.quantity,
    0,
  );
  const totalProfit = totalRevenue - totalCost;
  const grossMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  sheetXml = setXlsxCell(sheetXml, 'A4', '案件名');
  sheetXml = setXlsxCell(sheetXml, 'B4', project.title);
  sheetXml = setXlsxCell(sheetXml, 'C4', 'クライアント名');
  sheetXml = setXlsxCell(sheetXml, 'D4', project.client?.name ?? '');
  sheetXml = setXlsxCell(sheetXml, 'E4', '担当者');
  sheetXml = setXlsxCell(sheetXml, 'F4', '');
  sheetXml = setXlsxCell(sheetXml, 'G4', '受注予定日');
  sheetXml = setXlsxCell(sheetXml, 'H4', adoptedDate ? toDateOnly(adoptedDate) : '');
  sheetXml = setXlsxCell(sheetXml, 'I4', '通貨');
  sheetXml = setXlsxCell(sheetXml, 'J4', 'JPY');
  sheetXml = setXlsxCell(sheetXml, 'A5', '見積番号');
  sheetXml = setXlsxCell(sheetXml, 'B5', project.id);
  sheetXml = setXlsxCell(sheetXml, 'C5', '提案日');
  sheetXml = setXlsxCell(sheetXml, 'D5', toDateOnly(project.createdAt));
  sheetXml = setXlsxCell(sheetXml, 'E5', '採用日');
  sheetXml = setXlsxCell(sheetXml, 'F5', adoptedDate ? toDateOnly(adoptedDate) : '');
  sheetXml = setXlsxCell(sheetXml, 'G5', '納品予定日');
  sheetXml = setXlsxCell(sheetXml, 'H5', deliveryDate ? toDateOnly(deliveryDate) : '');
  sheetXml = setXlsxCell(sheetXml, 'L5', `Generated ${toDateOnly(new Date())}`);
  sheetXml = setXlsxCell(sheetXml, 'N4', totalRevenue);
  sheetXml = setXlsxCell(sheetXml, 'N5', totalCost);
  sheetXml = setXlsxCell(sheetXml, 'N6', totalProfit);
  sheetXml = setXlsxCell(sheetXml, 'N7', grossMargin);

  for (let row = 9; row <= 20; row += 1) {
    sheetXml = setXlsxCell(sheetXml, `B${row}`, '');
    sheetXml = setXlsxCell(sheetXml, `C${row}`, '');
    sheetXml = setXlsxCell(sheetXml, `D${row}`, '');
    sheetXml = setXlsxCell(sheetXml, `E${row}`, '');
    sheetXml = setXlsxCell(sheetXml, `F${row}`, '');
    sheetXml = setXlsxCell(sheetXml, `G${row}`, '');
    sheetXml = setXlsxCell(sheetXml, `H${row}`, '');
    sheetXml = setXlsxCell(sheetXml, `I${row}`, '');
    sheetXml = setXlsxCell(sheetXml, `J${row}`, '');
    sheetXml = setXlsxCell(sheetXml, `K${row}`, '');
  }

  products.forEach((projectProduct, index) => {
    const row = 9 + index;
    const revenue = toNumber(projectProduct.sellingPrice) * projectProduct.quantity;
    const costTotal = toNumber(projectProduct.cost) * projectProduct.quantity;
    const profit = revenue - costTotal;
    sheetXml = setXlsxCell(sheetXml, `B${row}`, projectProduct.product?.name ?? '');
    sheetXml = setXlsxCell(sheetXml, `C${row}`, getDeliveryMethodLabel(projectProduct.deliveryMethod ?? projectProduct.product?.productType));
    sheetXml = setXlsxCell(sheetXml, `D${row}`, projectProduct.quantity);
    sheetXml = setXlsxCell(sheetXml, `E${row}`, toNumber(projectProduct.sellingPrice));
    sheetXml = setXlsxCell(sheetXml, `F${row}`, revenue);
    sheetXml = setXlsxCell(sheetXml, `G${row}`, toNumber(projectProduct.cost));
    sheetXml = setXlsxCell(sheetXml, `H${row}`, costTotal);
    sheetXml = setXlsxCell(sheetXml, `I${row}`, profit);
    sheetXml = setXlsxCell(sheetXml, `J${row}`, revenue > 0 ? profit / revenue : 0);
    sheetXml = setXlsxCell(sheetXml, `K${row}`, projectProduct.proposalComment ?? '');
  });

  sheetXml = setXlsxCell(sheetXml, 'B25', 0);
  sheetXml = setXlsxCell(sheetXml, 'B26', 0);
  sheetXml = setXlsxCell(sheetXml, 'B27', 0);
  sheetXml = setXlsxCell(sheetXml, 'B28', 0);
  sheetXml = setXlsxCell(sheetXml, 'F21', totalRevenue);
  sheetXml = setXlsxCell(sheetXml, 'H21', totalCost);
  sheetXml = setXlsxCell(sheetXml, 'I21', totalProfit);
  sheetXml = setXlsxCell(sheetXml, 'J21', grossMargin);
  sheetXml = setXlsxCell(sheetXml, 'B29', 0);
  sheetXml = setXlsxCell(sheetXml, 'N9', totalProfit);

  zip.file('xl/worksheets/sheet1.xml', sheetXml);
  setXlsxDefaultFont(zip, 'Yu Mincho');

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export function buildGeneratedObjectKey(projectId: string, purpose: DocumentPurpose) {
  const config = documentConfig[purpose];
  return [
    'generated',
    'projects',
    projectId,
    purpose.toLowerCase(),
    `${new Date().toISOString().replace(/[:.]/g, '-')}.${config.extension}`,
  ].join('/');
}

export async function uploadGeneratedDocument(
  storage: StorageService,
  input: {
    objectKey: string;
    contentType: string;
    body: Buffer;
  },
) {
  await storage.putObject({
    objectKey: input.objectKey,
    body: input.body,
    contentType: input.contentType,
  });
}

function buildGreenSlideReplacements(
  slideName: string,
  project: ProjectDocument,
  products: ProjectProductDocument[],
  recommended: ProjectProductDocument | undefined,
  today: string,
  actorName: string,
) {
  const first = products[0];
  const second = products[1];
  const third = products[2];
  const points = normalizeStringArray(project.recommendationPoints);
  const recommendedReasons = normalizeRecommendationReasons(recommended?.recommendationReasons);
  const recommendedProduct = recommended ?? first;
  const clearThreeImageSlots: Array<[string, string]> = Array.from({ length: 3 }, () => ['[ 画像 ]', '']);
  const clearSixImageSlots: Array<[string, string]> = Array.from({ length: 6 }, () => ['[ 画像 ]', '']);
  const replacements: Record<string, Array<[string, string]>> = {
    'slide1.xml': [
      ['案件名', '案件名：'],
      ['ご提案先', 'ご提案先：'],
      ['提案日', '提案日：'],
      ['担当', '担当：'],
    ],
    'slide2.xml': [
      ['背景情報をここに記載してください', fitTwoLines(project.proposalBackground || `${project.client?.name ?? ''}向けの案件「${project.title}」に基づく商品提案です。`, 23, 3)],
      ['ポイント１を記載', fitSingleLine(points[0] ?? first?.proposalComment ?? first?.product?.description ?? '品質と価格のバランスに優れています。', 24)],
      ['ポイント２を記載', fitSingleLine(points[1] ?? second?.proposalComment ?? second?.product?.description ?? '納期と数量条件に柔軟に対応できます。', 24)],
      ['ポイント３を記載', fitSingleLine(points[2] ?? third?.proposalComment ?? third?.product?.description ?? '顧客向け提案に使いやすい商品構成です。', 24)],
      ['________________', fitTwoLines(recommended?.product?.name ?? first?.product?.name, 14, 2)],
    ],
    'slide3.xml': [
      ['[ 商品画像 ]', ''],
      ['________________', fitSingleLine(recommendedProduct?.product?.name, 34)],
      ['________________', fitSingleLine(recommendedProduct?.product?.modelNumber ?? recommendedProduct?.product?.janCode, 34)],
      ['________________', `¥${formatNumber(recommendedProduct?.sellingPrice ?? recommendedProduct?.product?.listPrice)}`],
      ['________________', fitSingleLine(recommendedProduct?.product?.leadTime, 28)],
      ['________________', fitSingleLine(recommendedProduct?.product?.minLot, 28)],
      ['・ 特徴１を記載してください', `・ ${fitSingleLine(getFeature(recommendedProduct, 0), 38)}`],
      ['・ 特徴２を記載してください', `・ ${fitSingleLine(getFeature(recommendedProduct, 1), 38)}`],
      ['・ 特徴３を記載してください', `・ ${fitSingleLine(getFeature(recommendedProduct, 2), 38)}`],
    ],
    'slide4.xml': [
      ...clearThreeImageSlots,
      ['商品名 ①', fitSingleLine(first?.product?.name, 15) || '商品名 ①'],
      ['商品名 ②', fitSingleLine(second?.product?.name, 15) || '商品名 ②'],
      ['商品名 ③', fitSingleLine(third?.product?.name, 15) || '商品名 ③'],
      ['¥〇〇〇', ''],
      ['¥〇〇〇', ''],
      ['¥〇〇〇', ''],
      ['コメントを記載', fitSingleLine(first?.proposalComment, 24)],
      ['コメントを記載', fitSingleLine(second?.proposalComment, 24)],
      ['コメントを記載', fitSingleLine(third?.proposalComment, 24)],
      ['特徴を記載', fitSingleLine(getFeature(first, 0), 16)],
      ['特徴を記載', fitSingleLine(getFeature(second, 0), 16)],
      ['特徴を記載', fitSingleLine(getFeature(third, 0), 16)],
    ],
    'slide5.xml': [...clearSixImageSlots, ['商品名 ①', fitSingleLine(first?.product?.name, 20) || '商品名 ①']],
    'slide6.xml': [...clearSixImageSlots, ['商品名②', fitSingleLine(second?.product?.name, 20) || '商品名②']],
    'slide7.xml': [...clearSixImageSlots, ['商品名③', fitSingleLine(third?.product?.name, 20) || '商品名③']],
    'slide8.xml': [
      ['[ 採用商品画像 ]', ''],
      ['________________', fitTwoLines(recommended?.product?.name ?? first?.product?.name, 15, 2)],
      ['理由タイトル１', fitSingleLine(recommendedReasons[0]?.title || '品質', 12)],
      ['推奨理由の詳細を記載してください。品質やコスト面での優位性など。', fitSingleLine(recommendedReasons[0]?.detail || recommended?.proposalComment || recommended?.product?.description || '品質と価格のバランスに優れています。', 36)],
      ['理由タイトル２', fitSingleLine(recommendedReasons[1]?.title || '納期', 12)],
      ['推奨理由の詳細を記載してください。納期やサポート面での優位性など。', fitSingleLine(recommendedReasons[1]?.detail || '納期条件に柔軟に対応できます。', 36)],
      ['理由タイトル３', fitSingleLine(recommendedReasons[2]?.title || '実績', 12)],
      ['推奨理由の詳細を記載してください。実績や信頼性など。', fitSingleLine(recommendedReasons[2]?.detail || '提案先の用途に合わせやすい商品です。', 36)],
    ],
    'slide9.xml': [
      ['________________', today],
      ['________________', recommended?.adoptionDate ? toDateOnly(recommended.adoptionDate) : '未定'],
      ['________________', recommended?.orderPlannedDate ? toDateOnly(recommended.orderPlannedDate) : '未定'],
      ['________________', project.orderRequests?.[0]?.deliveryDate ? toDateOnly(project.orderRequests[0].deliveryDate) : recommended?.product?.leadTime ?? '未定'],
      ['備考事項を記載してください', project.remarks ?? '正式な日程は採用決定後に調整します。'],
    ],
    'slide10.xml': [['Company Name', process.env.COMPANY_DISPLAY_NAME ?? 'Company Name']],
  };
  return replacements[slideName] ?? [];
}

function replaceFirstXmlText(xml: string, find: string, replace: string) {
  return xml.replace(escapeXml(find), escapeXml(replace));
}

function addGreenSlideOverlays(
  zip: PizZip,
  project: ProjectDocument,
  products: ProjectProductDocument[],
  today: string,
  actorName: string,
) {
  const coverValues = [
    { value: project.title, x: 1945005, y: 4344670, cx: 4389120 },
    { value: project.client?.name ?? '', x: 1945005, y: 4893309, cx: 4389120 },
    { value: today, x: 1945005, y: 5441949, cx: 4389120 },
    { value: actorName, x: 1945005, y: 5990589, cx: 4389120 },
  ];

  coverValues.forEach((item) => {
    addTextBoxToSlide(zip, 'slide1.xml', {
      x: item.x,
      y: item.y,
      cx: item.cx,
      cy: 365760,
      text: fitSingleLine(item.value, 38),
      fontSize: 1400,
      color: '52647A',
    });
  });

  const comparisonValueSlots = [
    {
      priceLabelX: 747574,
      priceValueX: 762000,
      quantityLabelX: 1897126,
      quantityValueX: 1897126,
      revenueLabelX: 2811526,
      revenueValueX: 2811526,
    },
    {
      priceLabelX: 4625747,
      priceValueX: 4690793,
      quantityLabelX: 5669280,
      quantityValueX: 5669280,
      revenueLabelX: 6583680,
      revenueValueX: 6583680,
    },
    {
      priceLabelX: 8463434,
      priceValueX: 8528480,
      quantityLabelX: 9509760,
      quantityValueX: 9509760,
      revenueLabelX: 10424160,
      revenueValueX: 10424160,
    },
  ];

  products.slice(0, 3).forEach((projectProduct, index) => {
    const slot = comparisonValueSlots[index];
    const price = formatNumber(projectProduct.sellingPrice ?? projectProduct.product?.listPrice);
    const quantity = formatNumber(projectProduct.quantity);
    const revenue = formatNumber(toNumber(projectProduct.sellingPrice) * projectProduct.quantity);
    const values = [
      { text: price ? `¥${price}` : '', x: slot.priceValueX, y: 5350478, cx: 1005840, fontSize: 1200, color: '172033', bold: true },
      { text: '数量', x: slot.quantityLabelX, y: 5060918, cx: 914400, fontSize: 900, color: '52647A' },
      { text: quantity, x: slot.quantityValueX, y: 5350478, cx: 1005840, fontSize: 1200, color: '172033', bold: true },
      { text: '売上', x: slot.revenueLabelX, y: 5060918, cx: 914400, fontSize: 900, color: '52647A' },
      { text: revenue ? `¥${revenue}` : '', x: slot.revenueValueX, y: 5350478, cx: 1240000, fontSize: 1200, color: '172033', bold: true },
    ];
    values.forEach((item) => {
      addTextBoxToSlide(zip, 'slide4.xml', {
        ...item,
        cy: 274320,
      });
    });
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setXlsxDefaultFont(zip: PizZip, fontName: string) {
  const stylesFile = zip.file('xl/styles.xml');
  if (!stylesFile) return;

  const escapedFontName = escapeXml(fontName);
  const stylesXml = stylesFile
    .asText()
    .replace(/(<(?:\w+:)?name\b[^>]*\bval=")[^"]*(")/g, `$1${escapedFontName}$2`);

  zip.file('xl/styles.xml', stylesXml);
}

function setXlsxCell(xml: string, cell: string, value: string | number) {
  const selfClosingPattern = new RegExp(`(<x:c\\b[^>]*\\br="${cell}"[^>]*)\\s*/>`);
  const selfClosingMatch = xml.match(selfClosingPattern);
  if (selfClosingMatch) {
    return xml.replace(selfClosingPattern, renderXlsxCell(selfClosingMatch[1], value));
  }

  const cellPattern = new RegExp(`(<x:c\\b[^>]*\\br="${cell}"[^>]*>)([\\s\\S]*?)(</x:c>)`);
  const match = xml.match(cellPattern);
  if (!match) {
    throw new Error(`P/L template cell ${cell} not found`);
  }

  return xml.replace(cellPattern, renderXlsxCell(match[1], value));
}

function renderXlsxCell(startTag: string, value: string | number) {
  const isNumber = typeof value === 'number';
  const normalizedStartTag = startTag.replace(/\s+t="[^"]*"/, '').replace(/>$/, '');
  const typedStartTag = `${normalizedStartTag} t="${isNumber ? 'n' : 'str'}">`;
  const cellValue = isNumber ? String(value) : escapeXml(value);

  return `${typedStartTag}<x:v>${cellValue}</x:v></x:c>`;
}

function formatComparison(projectProduct?: ProjectProductDocument) {
  if (!projectProduct?.product) {
    return '商品名\n特徴\n価格\nコメント';
  }
  return [
    `商品名 ${projectProduct.product.name}`,
    `特徴 ${projectProduct.product.description}`,
    `価格 ¥${formatNumber(projectProduct.sellingPrice)}`,
    `コメント ${projectProduct.proposalComment ?? ''}`,
  ].join('\n');
}

function getRecommendedProduct(products: ProjectProductDocument[]) {
  return products.find((product) => product.isAdopted) ?? products[0];
}

function getFeature(projectProduct: ProjectProductDocument | undefined, index: number) {
  const features = normalizeStringArray(projectProduct?.product?.features);
  return features[index] ?? projectProduct?.product?.description ?? projectProduct?.proposalComment ?? '';
}

function normalizeTemplateText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

function fitSingleLine(value: unknown, maxChars: number) {
  const normalized = normalizeTemplateText(value);
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function fitTwoLines(value: unknown, charsPerLine: number, maxLines: number) {
  const normalized = normalizeTemplateText(value);
  if (!normalized) {
    return '';
  }
  const lines: string[] = [];
  let remaining = normalized;
  while (remaining && lines.length < maxLines) {
    lines.push(remaining.slice(0, charsPerLine));
    remaining = remaining.slice(charsPerLine);
  }
  if (remaining && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(0, charsPerLine - 1)).trimEnd()}…`;
  }
  return lines.join('\n');
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function normalizeRecommendationReasons(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is { title?: unknown; detail?: unknown } => typeof item === 'object' && item !== null)
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : '',
      detail: typeof item.detail === 'string' ? item.detail : '',
    }));
}

function formatNumber(value: unknown) {
  const number = toNumber(value);
  return Number.isFinite(number) ? number.toLocaleString('ja-JP') : '';
}

function getDeliveryMethodLabel(value: unknown) {
  return value === 'DIRECT' ? '直送' : '倉庫';
}

async function embedProposalProductImages(
  zip: PizZip,
  products: ProjectProductDocument[],
  storage: StorageService,
) {
  ensureJpegContentType(zip);
  let mediaCounter = 1;
  const addProductImage = async (
    slideName: string,
    projectProduct: ProjectProductDocument | undefined,
    imageIndex: number,
    box: ImageBox,
  ) => {
    const bytes = await getProductImageBytes(projectProduct, imageIndex, storage);
    if (!bytes?.length) {
      return null;
    }
    const croppedBytes = await cropImageCover(bytes, box);
    const mediaName = `image-product-${mediaCounter}.jpg`;
    mediaCounter += 1;
    zip.file(`ppt/media/${mediaName}`, croppedBytes);
    addImageToSlide(zip, slideName, mediaName, box);
  };
  const detailImageBox = {
    x: 678500,
    y: 2134909,
    cx: 3850000,
    cy: 2860000,
  };
  await addProductImage('slide3.xml', products[0], 0, detailImageBox);

  const comparisonImageBoxes: ImageBox[] = [
    { x: 1135999, y: 1826016, cx: 2300000, cy: 1740000 },
    { x: 4979800, y: 1805382, cx: 2300000, cy: 1740000 },
    { x: 8820501, y: 1814411, cx: 2300000, cy: 1740000 },
  ];
  await Promise.all(
    products.slice(0, 3).map((projectProduct, index) =>
      addProductImage('slide4.xml', projectProduct, 0, comparisonImageBoxes[index]),
    ),
  );

  const recommended = getRecommendedProduct(products);
  await addProductImage('slide8.xml', recommended, 0, {
    x: 1773584,
    y: 1991141,
    cx: 2396431,
    cy: 2875717,
  });

  const galleryBoxes = [
    { x: 1296864, y: 1885026, cx: 2709792, cy: 1580712 },
    { x: 4771584, y: 1885026, cx: 2709792, cy: 1580712 },
    { x: 8246304, y: 1885026, cx: 2709792, cy: 1580712 },
    { x: 1296864, y: 4132926, cx: 2709792, cy: 1580712 },
    { x: 4771584, y: 4132926, cx: 2709792, cy: 1580712 },
    { x: 8246304, y: 4132926, cx: 2709792, cy: 1580712 },
  ];
  await Promise.all(
    products.slice(0, 3).map(async (projectProduct, productIndex) => {
      for (const [imageIndex, box] of galleryBoxes.entries()) {
        await addProductImage(`slide${5 + productIndex}.xml`, projectProduct, imageIndex, box);
      }
    }),
  );
}

async function getProductImageBytes(
  projectProduct: ProjectProductDocument | undefined,
  imageIndex: number,
  storage: StorageService,
) {
  const image = [...(projectProduct?.product?.images ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[imageIndex];
  if (image?.file?.objectKey) {
    const bytes = await storage.getObject({ objectKey: image.file.objectKey }).catch(() => null);
    if (bytes?.length) {
      return bytes;
    }
  }

  if (imageIndex !== 0) {
    return null;
  }
  return readImageUrl(projectProduct?.product?.imageUrl);
}

async function readImageUrl(imageUrl?: string | null) {
  if (!imageUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    const response = await fetch(imageUrl).catch(() => null);
    if (!response?.ok) {
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  }

  const localPath = path.resolve(
    process.cwd(),
    'public',
    imageUrl.replace(/^\/+/, '').replace(/^assets[\\/]/, 'assets/'),
  );
  try {
    return await fs.readFile(localPath);
  } catch {
    return null;
  }
}

function ensureJpegContentType(zip: PizZip) {
  const file = zip.file('[Content_Types].xml');
  const xml = file?.asText();
  if (!xml || xml.includes('Extension="jpg"')) {
    return;
  }
  zip.file(
    '[Content_Types].xml',
    xml.replace(
      '</Types>',
      '<Default Extension="jpg" ContentType="image/jpeg"/></Types>',
    ),
  );
}

type ImageBox = { x: number; y: number; cx: number; cy: number };

async function cropImageCover(bytes: Buffer, box: ImageBox) {
  const aspect = box.cx / box.cy;
  const width = 1600;
  const height = Math.max(1, Math.round(width / aspect));
  return sharp(bytes, { failOn: 'none' })
    .rotate()
    .resize({
      width,
      height,
      fit: 'cover',
      position: sharp.strategy.attention,
    })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

function addImageToSlide(
  zip: PizZip,
  slideName: string,
  mediaName: string,
  box: ImageBox,
) {
  const slidePath = `ppt/slides/${slideName}`;
  const relsPath = `ppt/slides/_rels/${slideName}.rels`;
  const slideFile = zip.file(slidePath);
  if (!slideFile) {
    return;
  }
  let relsXml =
    zip.file(relsPath)?.asText() ??
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const relationIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]));
  const rId = `rId${Math.max(0, ...relationIds) + 1}`;
  relsXml = relsXml.replace(
    '</Relationships>',
    `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName}"/></Relationships>`,
  );
  zip.file(relsPath, relsXml);

  const picId = 9000 + Math.floor(Math.random() * 999);
  const pictureXml = `
<p:pic>
  <p:nvPicPr>
    <p:cNvPr id="${picId}" name="Product image"/>
    <p:cNvPicPr/>
    <p:nvPr/>
  </p:nvPicPr>
  <p:blipFill>
    <a:blip r:embed="${rId}"/>
    <a:stretch><a:fillRect/></a:stretch>
  </p:blipFill>
  <p:spPr>
    <a:xfrm>
      <a:off x="${box.x}" y="${box.y}"/>
      <a:ext cx="${box.cx}" cy="${box.cy}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
  </p:spPr>
</p:pic>`;
  const slideXml = slideFile.asText();
  zip.file(slidePath, slideXml.replace('</p:spTree>', `${pictureXml}</p:spTree>`));
}

function addTextBoxToSlide(
  zip: PizZip,
  slideName: string,
  box: ImageBox & { text: string; fontSize: number; color: string; bold?: boolean },
) {
  const slidePath = `ppt/slides/${slideName}`;
  const slideFile = zip.file(slidePath);
  if (!slideFile || !box.text) {
    return;
  }
  const shapeId = 8000 + Math.floor(Math.random() * 999);
  const textXml = `
<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${shapeId}" name="Generated text"/>
    <p:cNvSpPr txBox="1"/>
    <p:nvPr/>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="${box.x}" y="${box.y}"/>
      <a:ext cx="${box.cx}" cy="${box.cy}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:noFill/>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  <p:txBody>
    <a:bodyPr wrap="none" anchor="ctr"/>
    <a:lstStyle/>
    <a:p>
      <a:r>
        <a:rPr lang="ja-JP" sz="${box.fontSize}" dirty="0"${box.bold ? ' b="1"' : ''}>
          <a:solidFill><a:srgbClr val="${box.color}"/></a:solidFill>
          <a:latin typeface="Yu Gothic"/>
          <a:ea typeface="Yu Gothic"/>
        </a:rPr>
        <a:t>${escapeXml(box.text)}</a:t>
      </a:r>
      <a:endParaRPr lang="ja-JP" sz="${box.fontSize}" dirty="0"/>
    </a:p>
  </p:txBody>
</p:sp>`;
  zip.file(slidePath, slideFile.asText().replace('</p:spTree>', `${textXml}</p:spTree>`));
}
