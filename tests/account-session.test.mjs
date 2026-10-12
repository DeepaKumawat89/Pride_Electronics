import assert from 'node:assert/strict'
import { test } from 'node:test'
import { transitionAccountSession } from '../src/user/utils/accountSession.js'

test('a login result and the later Firebase observer agree on one account session', () => {
  const activeUserUid = { current: null }

  const loginTransition = transitionAccountSession(activeUserUid, 'customer-1')
  assert.equal(loginTransition.userChanged, true)
  assert.equal(loginTransition.shouldClearPreviousUser, false)
  assert.equal(activeUserUid.current, 'customer-1')

  // The account snapshot can hydrate between these two events. The delayed
  // auth observer must not reset accountReady for the same signed-in user.
  const observerTransition = transitionAccountSession(activeUserUid, 'customer-1')
  assert.equal(observerTransition.userChanged, false)
  assert.equal(observerTransition.shouldClearPreviousUser, false)
})

test('switching Firebase users clears the previous account exactly once', () => {
  const activeUserUid = { current: 'customer-1' }

  const transition = transitionAccountSession(activeUserUid, 'customer-2')
  assert.equal(transition.userChanged, true)
  assert.equal(transition.shouldClearPreviousUser, true)
  assert.equal(activeUserUid.current, 'customer-2')
})
