import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// Every test starts with the hosted login switched off, as in production by default.
export const server = setupServer(
  http.get('http://localhost:8081/api/auth/config', () =>
    HttpResponse.json({ meishiSso: { enabled: false, authorizeUrl: null, clientId: null } }),
  ),
)
