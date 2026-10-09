import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOrderStockReservationPlan,
  StockReservationPlanError,
} from '../lib/orderStockReservationPlan.js';

const PRODUCT_ID = '507f1f77bcf86cd799439011';

function product(overrides = {}) {
  return {
    _id: PRODUCT_ID,
    stockQuantity: 6,
    variants: [
      { options: { color: 'Black' }, stock: 4 },
      { options: { color: 'Blue' }, stock: 2 },
    ],
    ...overrides,
  };
}

test('aggregates duplicate product and selected-variant quantities', () => {
  const plan = buildOrderStockReservationPlan({
    orderItems: [
      { productId: PRODUCT_ID, quantity: 1, variantOptions: { color: 'Black' } },
      { productId: PRODUCT_ID, quantity: 2, variantOptions: { color: 'Black' } },
      { productId: PRODUCT_ID, quantity: 1, variantOptions: { color: 'Blue' } },
    ],
  }, [product()]);

  assert.deepEqual(plan, [{
    productId: PRODUCT_ID,
    totalQuantity: 4,
    stockQuantity: 6,
    variants: [
      { index: 0, quantity: 3, stock: 4 },
      { index: 1, quantity: 1, stock: 2 },
    ],
  }]);
});

test('rejects aggregate product over-allocation before a transaction writes', () => {
  assert.throws(
    () => buildOrderStockReservationPlan({
      orderItems: [
        { productId: PRODUCT_ID, quantity: 4 },
        { productId: PRODUCT_ID, quantity: 3 },
      ],
    }, [product()]),
    (error) => error instanceof StockReservationPlanError
      && error.code === 'INSUFFICIENT_PRODUCT_STOCK',
  );
});

test('rejects aggregate selected-variant over-allocation', () => {
  assert.throws(
    () => buildOrderStockReservationPlan({
      orderItems: [
        { productId: PRODUCT_ID, quantity: 3, variantOptions: { color: 'Blue' } },
      ],
    }, [product()]),
    (error) => error instanceof StockReservationPlanError
      && error.code === 'INSUFFICIENT_VARIANT_STOCK',
  );
});

test('bundle of 2 stored as 1 pack removes 2 inventory units', () => {
  const plan = buildOrderStockReservationPlan({
    orderItems: [
      { productId: PRODUCT_ID, quantity: 1, variantOptions: { bundleQty: 2 } },
    ],
  }, [product({
    variants: [
      { options: { bundleQty: 2 }, stock: 8 },
    ],
  })]);

  assert.deepEqual(plan, [{
    productId: PRODUCT_ID,
    totalQuantity: 2,
    stockQuantity: 6,
    variants: [
      { index: 0, quantity: 2, stock: 8 },
    ],
  }]);
});

test('bundle packs share one unit pool so Buy 1 and Bundle of 3 cannot oversell', () => {
  const plan = buildOrderStockReservationPlan({
    orderItems: [
      { productId: PRODUCT_ID, quantity: 1, variantOptions: { bundleQty: 3 } },
      { productId: PRODUCT_ID, quantity: 2, variantOptions: { bundleQty: 1 } },
    ],
  }, [product({
    stockQuantity: 8,
    variants: [
      { options: { bundleQty: 1 }, stock: 8 },
      { options: { bundleQty: 3 }, stock: 8 },
    ],
  })]);

  assert.deepEqual(plan, [{
    productId: PRODUCT_ID,
    totalQuantity: 5,
    stockQuantity: 8,
    variants: [
      { index: 0, quantity: 5, stock: 8 },
      { index: 1, quantity: 5, stock: 8 },
    ],
  }]);
});

test('rejects bundle sales that exceed the shared admin unit stock', () => {
  assert.throws(
    () => buildOrderStockReservationPlan({
      orderItems: [
        { productId: PRODUCT_ID, quantity: 2, variantOptions: { bundleQty: 3 } },
        { productId: PRODUCT_ID, quantity: 3, variantOptions: { bundleQty: 1 } },
      ],
    }, [product({
      stockQuantity: 8,
      variants: [
        { options: { bundleQty: 1 }, stock: 8 },
        { options: { bundleQty: 3 }, stock: 8 },
      ],
    })]),
    (error) => error instanceof StockReservationPlanError
      && (error.code === 'INSUFFICIENT_VARIANT_STOCK'
        || error.code === 'INSUFFICIENT_PRODUCT_STOCK'),
  );
});

test('rejects a selected variant that no longer exists', () => {
  assert.throws(
    () => buildOrderStockReservationPlan({
      orderItems: [
        { productId: PRODUCT_ID, quantity: 1, variantOptions: { color: 'Red' } },
      ],
    }, [product()]),
    (error) => error instanceof StockReservationPlanError
      && error.code === 'VARIANT_NOT_FOUND',
  );
});
