import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const responseTime = new Trend('response_time', true);
const errorRate    = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 50  },
    { duration: '1m',  target: 200 },
    { duration: '30s', target: 200 },
    { duration: '10s', target: 0   },
  ],
  thresholds: {
    http_req_duration:    ['p(95)<300', 'p(99)<600'],
    http_req_failed:      ['rate<0.01'],
    error_rate:           ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL ?? 'http://localhost:3001/api';
const TOKEN = __ENV.TOKEN;

export default function () {
  const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  // List candidates
  const list = http.get(`${BASE}/candidates?page=1&limit=20`, { headers });
  responseTime.add(list.timings.duration);
  errorRate.add(!check(list, {
    'list: status 200': (r) => r.status === 200,
    'list: has items':  (r) => JSON.parse(r.body).items?.length >= 0,
    'list: p95 < 300ms':(r) => r.timings.duration < 300,
  }));

  sleep(0.5);

  // Single candidate (use first from list if available)
  const body = JSON.parse(list.body ?? '{}');
  if (body.items?.length > 0) {
    const id = body.items[0].id;
    const single = http.get(`${BASE}/candidates/${id}`, { headers });
    responseTime.add(single.timings.duration);
    check(single, { 'single: status 200': (r) => r.status === 200 });
  }

  sleep(0.3);
}
