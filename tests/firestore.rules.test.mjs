import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
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
    .authenticatedContext('UID_ADMIN', { admin: true })
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

test('payment and backend index collections are inaccessible to customers', async () => {
  const database = testEnvironment.authenticatedContext('UID_A').firestore()
  for (const collectionName of ['paymentIntents', 'couponUsages', '_authPhoneIndex']) {
    await assertFails(getDoc(doc(database, collectionName, 'private-record')))
    await assertFails(
      setDoc(doc(database, collectionName, 'private-record'), { userId: 'UID_A' }),
    )
  }
})
