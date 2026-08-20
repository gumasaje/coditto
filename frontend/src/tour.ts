const KEY = 'coditto.workspaceTourSeen'

export function hasSeenWorkspaceTour(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    // 저장소가 막혀 있으면 아직 보지 않은 것으로 두고 투어는 그대로 연다.
    return false
  }
}

export function markWorkspaceTourSeen(): void {
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    // quota·차단 예외가 투어를 닫는 동작을 가로채지 않게 둔다.
  }
}
