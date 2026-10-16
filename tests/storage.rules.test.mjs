import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage'

const projectId = 'demo-pride-electronics'
const bucket = `${projectId}.appspot.com`
let testEnvironment

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    storage: {
      rules: await readFile(new URL('../storage.rules', import.meta.url), 'utf8'),
    },
  })
})

after(async () => {
  await testEnvironment?.cleanup()
})

const image = new Uint8Array([137, 80, 78, 71])
const metadata = { contentType: 'image/png' }

test('a user can write and read only their own profile image', async () => {
  const userA = testEnvironment.authenticatedContext('UID_A').storage(bucket)
  const userB = testEnvironment.authenticatedContext('UID_B').storage(bucket)
  const ownPhoto = ref(userA, 'users/UID_A/profile/photo.png')

  await assertSucceeds(uploadBytes(ownPhoto, image, metadata))
  await assertSucceeds(getBytes(ownPhoto))
  await assertFails(getBytes(ref(userB, 'users/UID_A/profile/photo.png')))
  await assertFails(
    uploadBytes(ref(userB, 'users/UID_A/profile/attacker.png'), image, metadata),
  )
  await assertSucceeds(deleteObject(ownPhoto))
})

test('unauthenticated clients cannot read profile images', async () => {
  const publicStorage = testEnvironment.unauthenticatedContext().storage(bucket)
  await assertFails(getBytes(ref(publicStorage, 'users/UID_A/profile/photo.png')))
})

test('only an admin claim can mutate product images', async () => {
  const user = testEnvironment.authenticatedContext('UID_A').storage(bucket)
  const admin = testEnvironment
    .authenticatedContext('UID_ADMIN', { admin: true })
    .storage(bucket)
  const productPath = 'products/product-1/photo.png'

  await assertFails(uploadBytes(ref(user, productPath), image, metadata))
  await assertSucceeds(uploadBytes(ref(admin, productPath), image, metadata))
  await assertSucceeds(deleteObject(ref(admin, productPath)))
})

test('non-image and oversized uploads are rejected', async () => {
  const user = testEnvironment.authenticatedContext('UID_A').storage(bucket)
  await assertFails(
    uploadBytes(
      ref(user, 'users/UID_A/profile/profile.txt'),
      new Uint8Array([1, 2, 3]),
      { contentType: 'text/plain' },
    ),
  )
  await assertFails(
    uploadBytes(
      ref(user, 'users/UID_A/profile/oversized.png'),
      new Uint8Array(8 * 1024 * 1024),
      metadata,
    ),
  )
})
