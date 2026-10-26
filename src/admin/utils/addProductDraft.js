import { auth } from '../../firebase/firebase'

const DRAFT_VERSION = 1
const STORAGE_PREFIX = 'pride-circuit:add-product-draft'
const DATABASE_NAME = 'pride-circuit-admin-drafts'
const STORE_NAME = 'image-files'
let draftOperation = Promise.resolve()

const enqueueDraftOperation = (operation) => {
  const nextOperation = draftOperation.then(operation, operation)
  draftOperation = nextOperation.catch(() => {})
  return nextOperation
}

const getScope = () => {
  const projectId = auth.app.options.projectId
  const uid = auth.currentUser?.uid
  if (!projectId || !uid) return null
  return `${projectId}:${uid}`
}

const getLocalStorageKey = (scope) => `${STORAGE_PREFIX}:v${DRAFT_VERSION}:${scope}`

const openDatabase = () =>
  new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }
    const request = window.indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Unable to open draft storage.'))
  })

const saveImageFiles = async (scope, files, previousKeys = []) => {
  const database = await openDatabase()
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    previousKeys.forEach((key) => store.delete(key))
    files.forEach((file, index) => {
      store.put({
        key: `${scope}:${index}:${file.name}:${file.lastModified}`,
        scope,
        index,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        blob: file,
      })
    })
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error || new Error('Unable to save draft images.'))
  })
  database.close()
}

const readImageFiles = async (scope, imageKeys = []) => {
  if (!imageKeys.length) return []
  const database = await openDatabase()
  const records = await Promise.all(
    imageKeys.map(
      (key) =>
        new Promise((resolve, reject) => {
          const request = database
            .transaction(STORE_NAME, 'readonly')
            .objectStore(STORE_NAME)
            .get(key)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error || new Error('Unable to restore draft images.'))
        }),
    ),
  )
  database.close()
  return records
    .filter(Boolean)
    .sort((first, second) => first.index - second.index)
    .map(
      (record) =>
        new File([record.blob], record.name, {
          type: record.type,
          lastModified: record.lastModified,
        }),
    )
}

export async function loadAddProductDraft() {
  const scope = getScope()
  if (!scope || typeof window === 'undefined') return null
  const rawDraft = window.localStorage.getItem(getLocalStorageKey(scope))
  if (!rawDraft) return null
  const draft = JSON.parse(rawDraft)
  if (draft.version !== DRAFT_VERSION || draft.scope !== scope) return null
  try {
    const files = await readImageFiles(scope, draft.imageKeys)
    return { form: draft.form, files }
  } catch {
    return {
      form: draft.form,
      files: [],
      imageRestoreError: 'The product details were restored, but the saved images are unavailable.',
    }
  }
}

export async function saveAddProductDraft(form, files) {
  return enqueueDraftOperation(async () => {
    const scope = getScope()
    if (!scope || typeof window === 'undefined') return
    const storageKey = getLocalStorageKey(scope)
    const previousDraft = JSON.parse(window.localStorage.getItem(storageKey) || 'null')
    const imageKeys = files.map(
      (file, index) => `${scope}:${index}:${file.name}:${file.lastModified}`,
    )
    await saveImageFiles(scope, files, previousDraft?.imageKeys || [])
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: DRAFT_VERSION,
        scope,
        updatedAt: new Date().toISOString(),
        form,
        imageKeys,
      }),
    )
  })
}

export async function clearAddProductDraft() {
  return enqueueDraftOperation(async () => {
    const scope = getScope()
    if (!scope || typeof window === 'undefined') return
    const storageKey = getLocalStorageKey(scope)
    const draft = JSON.parse(window.localStorage.getItem(storageKey) || 'null')
    if ('indexedDB' in window && draft?.imageKeys?.length) {
      const database = await openDatabase()
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        draft.imageKeys.forEach((key) => store.delete(key))
        transaction.oncomplete = resolve
        transaction.onerror = () => reject(transaction.error || new Error('Unable to clear draft images.'))
      })
      database.close()
    }
    window.localStorage.removeItem(storageKey)
  })
}
