import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

const projectId = 'demo-pride-electronics'
let testEnvironment

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  })
})

beforeEach(async () => {
  await testEnvironment.clearFirestore()
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore()
    await setDoc(doc(database, 'users', 'UID_A'), {
      uid: 'UID_A',
      name: 'User A',
      email: 'a@example.com',
      role: 'customer',
      wishlistIds: [],
      addresses: [],
      paymentMethods: [],
      cartItems: [],
      savedCartItems: [],
    })
    await setDoc(doc(database, 'users', 'UID_B'), {
      uid: 'UID_B',
      name: 'User B',
      email: 'b@example.com',
      role: 'customer',
      wishlistIds: [],
      addresses: [],
      paymentMethods: [],
      cartItems: [],
      savedCartItems: [],
    })
    await setDoc(doc(database, 'orders', 'ORDER_A'), {
      userId: 'UID_A',
      status: 'Pending',
    })
    await setDoc(doc(database, 'orders', 'ORDER_B'), {
      userId: 'UID_B',
      status: 'Pending',
    })
    await setDoc(doc(database, 'admins', 'UID_ADMIN'), {
      uid: 'UID_ADMIN',
      name: 'Store Administrator',
      role: 'Store Administrator',
    })
    await setDoc(doc(database, 'products', 'PRODUCT_1'), {
      name: 'Test product',
      stock: 5,
    })
    await setDoc(doc(database, 'subcategories', 'SUBCATEGORY_1'), {
      name: 'Test subcategory',
      categoryId: 'CATEGORY_1',
      enabled: true,
    })
    await setDoc(doc(database, 'inventoryHistory', 'ENTRY_1'), {
      productId: 'PRODUCT_1',
      adjustment: 5,
    })
  })
})

after(async () => {
  await testEnvironment?.cleanup()
})

test('User A can read their profile but direct account writes require the backend', async () => {
  const database = testEnvironment.authenticatedContext('UID_A').firestore()
  const ownProfile = doc(database, 'users', 'UID_A')

  await assertSucceeds(getDoc(ownProfile))
  await assertFails(
    updateDoc(ownProfile, {
      wishlistIds: ['product-1'],
      cartItems: [{ productId: 'product-1', quantity: 1 }],
      addresses: [{ id: 'address-1', city: 'Jaipur' }],
      paymentMethods: [{ id: 'payment-1', type: 'UPI' }],
      updatedAt: new Date(),
    }),
  )
  await assertFails(updateDoc(ownProfile, { role: 'admin' }))
  await assertFails(deleteDoc(ownProfile))
})

test('User A cannot read, update, or delete users/UID_B', async () => {
  const database = testEnvironment.authenticatedContext('UID_A').firestore()
  const otherProfile = doc(database, 'users', 'UID_B')

  await assertFails(getDoc(otherProfile))
  await assertFails(getDocs(collection(database, 'users')))
  await assertFails(updateDoc(otherProfile, { wishlistIds: ['product-1'] }))
  await assertFails(deleteDoc(otherProfile))
})

test('User B cannot read or update users/UID_A', async () => {
  const database = testEnvironment.authenticatedContext('UID_B').firestore()
  const otherProfile = doc(database, 'users', 'UID_A')

  await assertFails(getDoc(otherProfile))
  await assertFails(updateDoc(otherProfile, { addresses: [] }))
})

test('unauthenticated clients cannot read user profiles', async () => {
  const database = testEnvironment.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(database, 'users', 'UID_A')))
})

test('a signed-in user can create only their validated customer profile', async () => {
  const database = testEnvironment.authenticatedContext('UID_NEW', {
    email: 'new@example.com',
    email_verified: true,
  }).firestore()
  const ownProfile = doc(database, 'users', 'UID_NEW')

  await assertSucceeds(setDoc(ownProfile, {
    uid: 'UID_NEW',
    name: 'New Customer',
    phone: '9876543210',
    phoneNormalized: '9876543210',
    email: 'new@example.com',
    emailVerified: true,
    role: 'customer',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(ownProfile, { role: 'admin' }))
})

test('profile creation rejects forged identity and privileged fields', async () => {
  const database = testEnvironment.authenticatedContext('UID_FORGED', {
    email: 'owner@example.com',
    email_verified: false,
  }).firestore()

  await assertFails(setDoc(doc(database, 'users', 'UID_OTHER'), {
    uid: 'UID_OTHER',
    name: 'Wrong Owner',
    email: 'owner@example.com',
    emailVerified: false,
    role: 'customer',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(setDoc(doc(database, 'users', 'UID_FORGED'), {
    uid: 'UID_FORGED',
    name: 'Forged Admin',
    email: 'different@example.com',
    emailVerified: true,
    role: 'admin',
    status: 'Active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
})

test('subcategory catalog documents remain publicly readable', async () => {
  const database = testEnvironment.unauthenticatedContext().firestore()
  await assertSucceeds(
    getDoc(doc(database, 'subcategories', 'SUBCATEGORY_1')),
  )
})

test('orders are readable only by their owner and require an ownership query', async () => {
  const database = testEnvironment.authenticatedContext('UID_A').firestore()

  await assertSucceeds(getDoc(doc(database, 'orders', 'ORDER_A')))
  await assertFails(getDoc(doc(database, 'orders', 'ORDER_B')))
  await assertSucceeds(
    getDocs(query(
      // Queries must carry the same userId constraint enforced by the rules.
      // This prevents listing orders that belong to another Firebase uid.
      collection(database, 'orders'),
      where('userId', '==', 'UID_A'),
    )),
  )
  await assertFails(getDocs(collection(database, 'orders')))
})

test('customers cannot directly create, update, or delete order documents', async () => {
  const database = testEnvironment.authenticatedContext('UID_A').firestore()

  await assertFails(
    setDoc(doc(database, 'orders', 'ORDER_NEW'), {
      userId: 'UID_A',
      status: 'Pending',
    }),
  )
  await assertFails(updateDoc(doc(database, 'orders', 'ORDER_A'), { status: 'Delivered' }))
  await assertFails(deleteDoc(doc(database, 'orders', 'ORDER_A')))
})

test('unused top-level cart, wishlist, and address paths stay default-denied', async () => {
  const database = testEnvironment.authenticatedContext('UID_A').firestore()

  for (const collectionName of ['carts', 'wishlists', 'addresses']) {
    await assertFails(getDoc(doc(database, collectionName, 'UID_A')))
    await assertFails(setDoc(doc(database, collectionName, 'UID_A'), { userId: 'UID_A' }))
  }
})

test('a normal user cannot read admin data or perform direct admin writes', async () => {
  const database = testEnvironment.authenticatedContext('UID_A').firestore()

  await assertFails(getDoc(doc(database, 'admins', 'UID_ADMIN')))
  await assertFails(getDoc(doc(database, 'inventoryHistory', 'ENTRY_1')))
  await assertFails(updateDoc(doc(database, 'products', 'PRODUCT_1'), { stock: 999 }))
  await assertFails(
    updateDoc(doc(database, 'subcategories', 'SUBCATEGORY_1'), { enabled: false }),
  )
  await assertFails(
    setDoc(doc(database, 'admins', 'UID_A'), {
      uid: 'UID_A',
      role: 'Store Administrator',
    }),
  )
})

test('an admin custom claim authorizes privileged Firestore operations', async () => {
  const database = testEnvironment
    .authenticatedContext('UID_ADMIN', { admin: true, role: 'Store Administrator' })
    .firestore()

  await assertSucceeds(getDoc(doc(database, 'users', 'UID_B')))
  await assertSucceeds(getDoc(doc(database, 'inventoryHistory', 'ENTRY_1')))
  await assertSucceeds(
    updateDoc(doc(database, 'products', 'PRODUCT_1'), { stock: 4 }),
  )
  await assertSucceeds(
    updateDoc(doc(database, 'subcategories', 'SUBCATEGORY_1'), { enabled: false }),
  )
  await assertSucceeds(
    updateDoc(doc(database, 'users', 'UID_B'), { status: 'Suspended' }),
  )
})

test('scoped admin claims cannot bypass their assigned permissions', async () => {
  const database = testEnvironment
    .authenticatedContext('UID_ORDER_MANAGER', {
      admin: true,
      role: 'Order Manager',
      permissions: ['orders', 'users'],
    })
    .firestore()

  await assertSucceeds(getDoc(doc(database, 'users', 'UID_B')))
  await assertFails(
    updateDoc(doc(database, 'products', 'PRODUCT_1'), { stock: 3 }),
  )
})

test('admin product creates require complete fields and valid INR pricing', async () => {
  const database = testEnvironment
    .authenticatedContext('UID_ADMIN', { admin: true, role: 'Store Administrator' })
    .firestore()
  const validProduct = {
    name: 'Validated product',
    brand: 'Pride',
    description: 'A complete product description for validation.',
    categoryId: 'CATEGORY_1',
    category: 'Electronics',
    subcategoryId: 'SUBCATEGORY_1',
    subcategory: 'Accessories',
    originalPrice: 1000.5,
    price: 900.45,
    discount: 10,
    stock: 5,
    modelNumber: 'MODEL-1',
    hsnCode: '85371000',
    specs: ['Power: 10 W'],
  }

  await assertSucceeds(
    setDoc(doc(database, 'products', 'VALID_PRODUCT'), validProduct),
  )
  await assertFails(
    setDoc(doc(database, 'products', 'MISSING_SUBCATEGORY'), {
      ...validProduct,
      subcategoryId: '',
      subcategory: '',
    }),
  )
  await assertFails(
    setDoc(doc(database, 'products', 'INVALID_HSN'), {
      ...validProduct,
      hsnCode: '85371A00',
    }),
  )
  await assertFails(
    setDoc(doc(database, 'products', 'MISSING_HSN'),
      Object.fromEntries(
        Object.entries(validProduct).filter(([key]) => key !== 'hsnCode'),
      ),
    ),
  )
  await assertFails(
    setDoc(doc(database, 'products', 'INVALID_PRECISION'), {
      ...validProduct,
      price: 900.451,
    }),
  )
  await assertFails(
    setDoc(doc(database, 'products', 'INVALID_DISCOUNT'), {
      ...validProduct,
      discount: 100.01,
    }),
  )
  await assertFails(
    setDoc(doc(database, 'products', 'MISMATCHED_DISCOUNT_PRICE'), {
      ...validProduct,
      price: 950,
    }),
  )
})

test('authorized admins can add and update a valid HSN code on legacy products', async () => {
  const database = testEnvironment
    .authenticatedContext('UID_ADMIN', { admin: true, role: 'Store Administrator' })
    .firestore()
  const legacyProduct = doc(database, 'products', 'PRODUCT_1')

  await assertFails(
    setDoc(legacyProduct, { hsnCode: '85371A00', updatedAt: '2026-10-15T00:00:00.000Z' }, { merge: true }),
  )
  await assertSucceeds(
    setDoc(legacyProduct, { hsnCode: '85371000', updatedAt: '2026-10-15T00:00:00.000Z' }, { merge: true }),
  )
  await assertSucceeds(
    setDoc(legacyProduct, { hsnCode: '85423900', updatedAt: '2026-10-15T00:01:00.000Z' }, { merge: true }),
  )
  await assertFails(
    setDoc(legacyProduct, { hsnCode: '', updatedAt: '2026-10-15T00:02:00.000Z' }, { merge: true }),
  )
})

test('authorized admins can normalize legacy pricing while adding an HSN code', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'products', 'LEGACY_PRICING_PRODUCT'), {
      name: 'Legacy pricing product',
      brand: 'Pride',
      description: 'A legacy product with string-formatted INR pricing.',
      categoryId: 'CATEGORY_1',
      category: 'Electronics',
      subcategoryId: 'SUBCATEGORY_1',
      subcategory: 'Accessories',
      originalPrice: '₹50',
      price: '₹50',
      discount: '',
      stock: 5,
      modelNumber: 'MODEL-1',
      specs: ['Power: 10 W'],
    })
  })
  const database = testEnvironment
    .authenticatedContext('UID_ADMIN', { admin: true, role: 'Store Administrator' })
    .firestore()

  await assertSucceeds(
    setDoc(
      doc(database, 'products', 'LEGACY_PRICING_PRODUCT'),
      {
        originalPrice: 50,
        price: 50,
        discount: deleteField(),
        hsnCode: '85371000',
        updatedAt: '2026-10-15T00:00:00.000Z',
      },
      { merge: true },
    ),
  )
})

test('non-admin users cannot add an HSN code to legacy products', async () => {
  const database = testEnvironment.authenticatedContext('UID_A').firestore()

  await assertFails(
    setDoc(
      doc(database, 'products', 'PRODUCT_1'),
      { hsnCode: '85371000', updatedAt: '2026-10-15T00:00:00.000Z' },
      { merge: true },
    ),
  )
})

test('payment and backend index collections are inaccessible to customers', async () => {
  const database = testEnvironment.authenticatedContext('UID_A').firestore()
  for (const collectionName of [
    'paymentIntents',
    'stockReservations',
    'couponUsages',
    '_authPhoneIndex',
    'invoices',
  ]) {
    await assertFails(getDoc(doc(database, collectionName, 'private-record')))
    await assertFails(
      setDoc(doc(database, collectionName, 'private-record'), { userId: 'UID_A' }),
    )
  }
})
