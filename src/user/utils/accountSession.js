export function transitionAccountSession(activeUserUid, nextUserUid) {
  const previousUid = activeUserUid.current
  const userChanged = previousUid !== nextUserUid

  activeUserUid.current = nextUserUid

  return {
    previousUid,
    userChanged,
    shouldClearPreviousUser: Boolean(previousUid && userChanged),
  }
}
