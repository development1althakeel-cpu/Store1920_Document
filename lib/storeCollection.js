import {
  STORE1920_BRAND_DISPLAY,
  STORE1920_BUSINESS_HOURS_AR,
  STORE1920_BUSINESS_HOURS_EN,
} from '@/lib/businessIdentity';

export const FULFILLMENT_DELIVERY = 'DELIVERY';
export const FULFILLMENT_STORE_COLLECTION = 'STORE_COLLECTION';

export const STORE_COLLECTION_ADDRESS = Object.freeze({
  name: `${STORE1920_BRAND_DISPLAY} Warehouse`,
  street: 'Warehouse No. 1, 18 Maleha St',
  district: 'Industrial Area',
  city: 'Sharjah',
  state: 'Sharjah',
  country: 'United Arab Emirates',
  countryCode: 'AE',
  zip: '',
});

export const STORE_COLLECTION_ADDRESS_LINES = Object.freeze([
  'Warehouse No. 1',
  '18 Maleha St',
  'Industrial Area',
  'Sharjah, UAE',
]);

export function isStoreCollectionFulfillment(value) {
  return String(value || '').trim().toUpperCase() === FULFILLMENT_STORE_COLLECTION;
}

export function isStoreCollectionOrder(order = {}) {
  return isStoreCollectionFulfillment(
    order?.fulfillmentMethod
    || order?.shippingMethod
    || order?.shippingAddress?.fulfillmentMethod,
  ) || order?.shippingAddress?.isStoreCollection === true;
}

export function getStoreCollectionHours({ isArabic = false } = {}) {
  return isArabic ? STORE1920_BUSINESS_HOURS_AR : STORE1920_BUSINESS_HOURS_EN;
}

export function buildStoreCollectionShippingAddress(contact = {}) {
  const name = String(contact.name || '').trim() || STORE_COLLECTION_ADDRESS.name;
  const email = String(contact.email || '').trim();
  const phone = String(contact.phone || '').replace(/\D/g, '');
  return {
    name,
    email,
    phone,
    phoneCode: contact.phoneCode || '+971',
    alternatePhone: contact.alternatePhone || '',
    alternatePhoneCode: contact.alternatePhoneCode || contact.phoneCode || '+971',
    street: STORE_COLLECTION_ADDRESS.street,
    district: STORE_COLLECTION_ADDRESS.district,
    city: STORE_COLLECTION_ADDRESS.city,
    state: STORE_COLLECTION_ADDRESS.state,
    zip: STORE_COLLECTION_ADDRESS.zip,
    country: STORE_COLLECTION_ADDRESS.country,
    fulfillmentMethod: FULFILLMENT_STORE_COLLECTION,
    isStoreCollection: true,
  };
}

export function buildStoreCollectionGuestInfo(contact = {}) {
  const address = buildStoreCollectionShippingAddress(contact);
  return {
    name: address.name,
    email: address.email,
    phone: address.phone,
    phoneCode: address.phoneCode,
    alternatePhone: address.alternatePhone,
    alternatePhoneCode: address.alternatePhoneCode,
    street: address.street,
    address: address.street,
    city: address.city,
    state: address.state,
    district: address.district,
    country: address.country,
    pincode: '',
    zip: '',
  };
}
