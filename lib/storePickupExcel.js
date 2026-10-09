import { getStoreOrderDisplayItems } from '@/lib/storeOrderLineItems';
import { getOrderLineProduct } from '@/lib/orderDisplay';
import { isBulkBundleVariantOption, matchVariantByOptions } from '@/lib/productVariantOptions';

const PICKUP_EXCEL_HEADERS = [
  'Sno',
  'Courier',
  'Courier Reference',
  'SKU',
  'Shipment Description',
  'Quantity',
  'Amount',
];

function formatPickupTitleDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Dubai',
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Dubai',
  });
}

function resolvePickupTracking(order = {}) {
  return String(
    order?.trackingId
    || order?.waslah?.emxTrackingNumber
    || order?.waslah?.trackingNumber
    || order?.waslah?.reference
    || ''
  ).trim();
}

function pickSku(...candidates) {
  for (const candidate of candidates) {
    const sku = String(candidate ?? '').trim();
    if (!sku) continue;
    if (/^[a-fA-F0-9]{24}$/.test(sku)) continue;
    return sku;
  }
  return '';
}

function resolveLineSku(item = {}) {
  const product = getOrderLineProduct(item);
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const matchedVariant = matchVariantByOptions(variants, item?.variantOptions || {});
  const isBundle = Boolean(
    item.isBulkBundle
    || Number(item.bundleUnits) > 1
    || Number(item?.variantOptions?.bundleQty) > 1
    || isBulkBundleVariantOption(matchedVariant)
  );
  const regularVariantSkus = variants
    .filter((variant) => !isBulkBundleVariantOption(variant))
    .map((variant) => variant?.sku);

  // Bundle rows keep the same SKU as the regular product — bundle variants often have none.
  return pickSku(
    isBundle ? '' : matchedVariant?.sku,
    item.sku,
    item.variantSku,
    product?.sku,
    item.productId?.sku,
    ...regularVariantSkus,
    matchedVariant?.sku,
    ...variants.map((variant) => variant?.sku),
  );
}

function resolveLineQuantity(item = {}) {
  const units = Number(item.quantity) || 0;
  const packs = Number(item.packQuantity) || 0;
  const bundleUnits = Number(item.bundleUnits) || 0;
  if (bundleUnits > 1) return units || (bundleUnits * (packs || 1));
  return units || packs || 0;
}

function buildShipmentDescription(item = {}) {
  const name = String(item.name || '').trim();
  const bundleUnits = Number(item.bundleUnits) || 0;
  if (item.isBulkBundle && bundleUnits > 1 && !/bundle of\s+\d+/i.test(name)) {
    return `${name} Bundle of ${bundleUnits}`.trim();
  }
  return name;
}

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}

export function buildPickupManifestRows(orders = []) {
  const rows = [];
  let sno = 0;

  (Array.isArray(orders) ? orders : []).forEach((order) => {
    const items = getStoreOrderDisplayItems(order);
    const lines = items.length
      ? items
      : [{
          name: String(order.displayOrderNumber || order.shortOrderNumber || '').trim(),
          quantity: 1,
          lineTotal: Number(order.total || 0),
        }];

    sno += 1;
    const tracking = resolvePickupTracking(order);
    const courier = String(order.courier || 'EMX').trim() || 'EMX';
    const orderAmount = lines.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0)
      || Number(order.total || 0);

    lines.forEach((item, itemIndex) => {
      const bundleUnits = Number(item.bundleUnits) || 0;
      const isFirst = itemIndex === 0;
      rows.push({
        sno: isFirst ? sno : null,
        courier: isFirst ? courier : null,
        courierReference: isFirst ? tracking : null,
        sku: resolveLineSku(item),
        description: buildShipmentDescription(item)
          || String(order.displayOrderNumber || order.shortOrderNumber || '').trim(),
        quantity: resolveLineQuantity(item) || 1,
        amount: isFirst ? formatAmount(orderAmount) : null,
        isBundle: Boolean(item.isBulkBundle || bundleUnits > 1),
        orderRowSpan: lines.length,
        isOrderFirst: isFirst,
      });
    });
  });

  return rows;
}

export async function downloadPickupManifestExcel(orders = [], options = {}) {
  if (!orders.length) {
    throw new Error('No pickup orders to export');
  }

  const ExcelJSMod = await import('exceljs');
  const ExcelJS = ExcelJSMod.default || ExcelJSMod;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pickup');
  const title = options.title || formatPickupTitleDate(options.date || new Date());
  const rows = buildPickupManifestRows(orders);

  sheet.mergeCells(1, 1, 1, PICKUP_EXCEL_HEADERS.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, name: 'Calibri' };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const headerRow = sheet.getRow(2);
  PICKUP_EXCEL_HEADERS.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, size: 11, name: 'Calibri' };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    };
  });
  headerRow.height = 22;

  const sharedColumns = new Set([0, 1, 2, 6]);
  const cellBorder = {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  };

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 3);
    const values = [
      row.sno,
      row.courier,
      row.courierReference,
      row.sku,
      row.description,
      row.quantity,
      row.amount,
    ];
    values.forEach((value, columnIndex) => {
      const cell = excelRow.getCell(columnIndex + 1);
      if (row.isOrderFirst || !sharedColumns.has(columnIndex)) {
        cell.value = value;
      }
      cell.font = {
        name: 'Calibri',
        size: 11,
        color: row.isBundle && columnIndex === 4 ? { argb: 'FFFF0000' } : { argb: 'FF000000' },
        bold: row.isBundle && columnIndex === 4,
      };
      cell.alignment = {
        vertical: 'middle',
        wrapText: columnIndex === 4,
        horizontal: columnIndex === 0 || columnIndex === 5 || columnIndex === 6 ? 'center' : 'left',
      };
      cell.border = cellBorder;
    });
    excelRow.height = 18;
  });

  rows.forEach((row, rowIndex) => {
    if (!row.isOrderFirst || row.orderRowSpan <= 1) return;
    const startRow = rowIndex + 3;
    const endRow = startRow + row.orderRowSpan - 1;
    [1, 2, 3, 7].forEach((column) => {
      sheet.mergeCells(startRow, column, endRow, column);
      const cell = sheet.getCell(startRow, column);
      cell.alignment = {
        vertical: 'middle',
        horizontal: column === 2 || column === 3 ? 'left' : 'center',
      };
      cell.border = cellBorder;
    });
  });

  sheet.columns = [
    { width: 8 },
    { width: 14 },
    { width: 22 },
    { width: 22 },
    { width: 56 },
    { width: 12 },
    { width: 14 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = options.filename
    || `pickup-manifest-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return rows.length;
}

const PICKUP_EXCEL_STATUSES = new Set([
  'WAITING_FOR_PICKUP',
  'PICKUP_REQUESTED',
  'PICKED_UP',
]);

export function canExportPickupExcel(order = {}) {
  const status = String(order?.status || '').toUpperCase();
  return Boolean(
    PICKUP_EXCEL_STATUSES.has(status)
    || order?.warehousePacking?.packed === true
    || order?.waslah?.pickupRequestedAt
    || order?.pickupRequestedAt
  );
}

export function resolveEmxSentAt(order = {}) {
  const candidates = [
    order?.waslah?.pickupRequestedAt,
    order?.pickupRequestedAt,
    order?.waslah?.processedAt,
  ];
  for (const value of candidates) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

export function isSentToEmxOrder(order = {}) {
  const status = String(order?.status || '').toUpperCase();
  if (['CANCELLED', 'REFUNDED', 'PAYMENT_FAILED', 'TRASH', 'DELETED'].includes(status)) {
    return false;
  }
  return Boolean(
    resolveEmxSentAt(order)
    || String(order?.waslah?.orderId || '').trim()
    || status === 'PICKUP_REQUESTED'
  );
}

export function isSentToEmxInRange(order = {}, start, end) {
  if (!start || !end) return false;
  const sentAt = resolveEmxSentAt(order);
  if (!sentAt) return false;
  return sentAt >= start && sentAt < end;
}

export function orderHasPickupRequested(order = {}) {
  return canExportPickupExcel(order);
}

const TODAY_CSV_STATUSES = new Set([
  'WAITING_FOR_PICKUP',
  'PICKUP_REQUESTED',
  'PICKED_UP',
]);

const TODAY_CSV_EXCLUDED_STATUSES = new Set([
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
  'PAYMENT_FAILED',
  'RTO',
]);

export function isPackedPickupOrPickedUpOrder(order = {}) {
  const status = String(order?.status || '').toUpperCase();
  if (TODAY_CSV_STATUSES.has(status)) return true;
  return order?.warehousePacking?.packed === true && !TODAY_CSV_EXCLUDED_STATUSES.has(status);
}
