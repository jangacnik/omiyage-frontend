import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const BASE = 'http://localhost:8081'

// Nearly every page renders a price via <Money>, which always queries this endpoint regardless
// of whether a conversion is actually needed - a default handler here means individual tests
// don't each need to stub it just to avoid an "unhandled request" failure.
export const server = setupServer(
  http.get(`${BASE}/api/exchange-rate`, () => HttpResponse.json({ jpyPerEur: 150 })),
)
