const VISITOR_ID_KEY = 'visitor_id'

export function getVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_ID_KEY)
  if (existing) {
    return existing
  }

  const generated = crypto.randomUUID()
  localStorage.setItem(VISITOR_ID_KEY, generated)
  return generated
}
