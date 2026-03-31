import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },  // 2 นาทีแรก: ค่อยๆ เพิ่มคนเป็น 50 คน
    { duration: '6m', target: 50 },  // 6 นาทีต่อมา: ยิงแช่ไว้ที่ 50 คน ดูความเสถียร
    { duration: '2m', target: 0 },   // 2 นาทีสุดท้าย: ค่อยๆ ลดคนลงจนเหลือ 0 (รวมเป็น 10 นาทีพอดี)
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // ตั้งเป้าว่า Error ต้องน้อยกว่า 1%
    http_req_duration: ['p(95)<500'], // 95% ของ Request ต้องตอบกลับภายใน 500ms
  },
};

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function () {
  const baseUrl = 'https://us-central1-warungpos-9e429.cloudfunctions.net/api';
  const adminId = "UTT1cWu772MXhrnORl2kWGion8F3";

  // 1. Verify Override Token
  const verifyUrl = `${baseUrl}/guest/override/verify`;
  const verifyPayload = JSON.stringify({
    code: "1001",
    reason: "จำเป็นต้องอนุญาตการเข้าถึงตำแหน่งก่อนใช้งาน",
    pid: "jQJocFrLRF",
    id: adminId
  });

  const verifyRes = http.post(verifyUrl, verifyPayload, {
    headers: {
      'Content-Type': 'application/json',
      'x-guest-admin-id': adminId,
    }
  });

  check(verifyRes, {
    'verify status is 200': (r) => r.status === 200,
    'verify has token': (r) => r.json().token !== undefined,
  });

  if (verifyRes.status !== 200) {
    console.error(`Verify failed: ${verifyRes.status} ${verifyRes.body}`);
    return;
  }

  const token = verifyRes.json().token;
  const guestKey = randomString(24);

  sleep(2);

  // 2. Create Session
  const sessionUrl = `${baseUrl}/guest/sessions`;
  const sessionPayload = JSON.stringify({
    pid: "jQJocFrLRF",
    id: adminId,
    guestKey: guestKey,
    overrideToken: token
  });

  const sessionRes = http.post(sessionUrl, sessionPayload, {
    headers: {
      'Content-Type': 'application/json',
      'x-guest-admin-id': adminId,
      'x-guest-override-token': token,
    }
  });

  check(sessionRes, {
    'session status is 200': (r) => r.status === 200,
    'session has sessionId': (r) => r.json().sessionId !== undefined,
  });

  if (sessionRes.status === 200) {
    const sessionId = sessionRes.json().sessionId;
    console.log(`[VU:${__VU}] Session created: ${sessionId}`);
  } else {
    console.error(`[VU:${__VU}] Session failed: ${sessionRes.status} ${sessionRes.body}`);
    return;
  }

  sleep(2);

  const sessionId = sessionRes.json().sessionId;
  
  // Common headers for subsequent events/orders
  const commonHeaders = {
    'Content-Type': 'application/json',
    'x-guest-admin-id': adminId,
    'x-guest-override-token': token,
    'x-guest-session-id': sessionId,
  };

  // 3. Send "Add to Cart" Event
  const eventsUrl = `${baseUrl}/guest/events`;
  const eventPayload = JSON.stringify({
    type: "add_to_cart",
    ts: Date.now(),
    sessionId: sessionId,
    tableName: "D",
    contactName: "ppm",
    tableId: "i5xADQxqYVXrGG19C20n",
    branchId: "c9997882-3ada-4d57-bd62-3d38bfc4421a",
    groupId: null,
    businessDay: "20260331",
    membersId: guestKey,
    payload: {
      menuId: "Nj8l8Smstya5aGnLDHKb",
      menuName: { th: "ข้าวกะเพรา", en: "Thai Basil on Rice", ms: "Nasi Basil Thai" },
      qty: 1,
      total: 55,
      currency: "THB",
      builds: [
        {
          id: "dmq9uym",
          tierKey: "M",
          mods: {
            "0225de19-d5f2-46d6-85e8-749839e32935": { "6a69dcee-8949-4800-aaea-f80b00d6ab12": { th: "เผ็ดน้อย", en: "Mild", ms: "Sederhana" } },
            "c7b7da42-fc18-4465-b7b9-1fcf3120fce7": { "9f70a136-91fe-497e-9ab4-be273ee3e3c3": { th: "ไก่", en: "Chicken", ms: "Ayam" } }
          },
          each: 55
        }
      ],
      kitchenStation: "4VimoAU6yEYqIrt9wl3N"
    }
  });

  const eventRes = http.post(eventsUrl, eventPayload, { headers: commonHeaders });
  check(eventRes, {
    'event status is 200': (r) => r.status === 200,
  });

  if (eventRes.status === 200) {
    console.log(`[VU:${__VU}] Event 'add_to_cart' sent for session: ${sessionId}`);
  } else {
    console.error(`[VU:${__VU}] Event failed: ${eventRes.status} ${eventRes.body}`);
  }

  sleep(2);

  // 4. Send "Order" Event
  const orderUrl = `${baseUrl}/guest/events/order`;
  const orderPayload = JSON.stringify({
    ts: Date.now(),
    sessionId: sessionId,
    currency: "THB",
    itemsCount: 1,
    subtotal: 55,
    items: [
      {
        menuId: "Nj8l8Smstya5aGnLDHKb",
        menuName: { th: "ข้าวกะเพรา", en: "Thai Basil on Rice", ms: "Nasi Basil Thai" },
        qty: 1,
        total: 55,
        builds: [
          {
            id: "krwihrr",
            tierKey: "M",
            each: 55,
            mods: {
              "0225de19-d5f2-46d6-85e8-749839e32935": [{ th: "เผ็ดน้อย", en: "Mild", ms: "Sederhana" }],
              "c7b7da42-fc18-4465-b7b9-1fcf3120fce7": [{ th: "ไก่", en: "Chicken", ms: "Ayam" }]
            }
          }
        ],
        kitchenStation: "4VimoAU6yEYqIrt9wl3N"
      }
    ],
    url: `https://warungpos-9e429.web.app/guest/cart/?pid=${sessionId}`,
    ref: "",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    contactName: "ddz",
    tableName: "D",
    tableId: "i5xADQxqYVXrGG19C20n",
    branchId: "c9997882-3ada-4d57-bd62-3d38bfc4421a",
    groupId: "",
    businessDay: "20260331",
    membersId: guestKey
  });

  const orderRes = http.post(orderUrl, orderPayload, { headers: commonHeaders });
  check(orderRes, {
    'order status is 200': (r) => r.status === 200,
  });

  if (orderRes.status === 200) {
    console.log(`[VU:${__VU}] Order placed successfully for session: ${sessionId}`);
  } else {
    console.error(`[VU:${__VU}] Order failed: ${orderRes.status} <REDACTED>`);
  }

  sleep(2);
}

export function handleSummary(data) {
  const passes = data.metrics.checks.values.passes;
  const fails = data.metrics.checks.values.fails;
  const errorRate = (data.metrics.http_req_failed.values.rate * 100).toFixed(2);
  const p95 = data.metrics.http_req_duration.values['p(95)'].toFixed(2);
  const avg = data.metrics.http_req_duration.values.avg.toFixed(2);
  const max = data.metrics.http_req_duration.values.max.toFixed(2);

  // QuickChart Pie Chart (Checks)
  const pieChart = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
    type: 'pie',
    data: {
      labels: ['Pass', 'Fail'],
      datasets: [{
        data: [passes, fails],
        backgroundColor: ['#28a745', '#dc3545']
      }]
    },
    options: { title: { display: true, text: 'Check Results (Pass vs Fail)' } }
  }))}`;

  // QuickChart Bar Chart (Latency Profile)
  const barChart = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
    type: 'bar',
    data: {
      labels: ['Avg', 'p(95)', 'Max'],
      datasets: [{
        label: 'Latency (ms)',
        data: [avg, p95, max],
        backgroundColor: ['#4bc0c0', '#ffcd56', '#ff6384']
      }]
    },
    options: { title: { display: true, text: 'Latency Performance (ms)' } }
  }))}`;

  return {
    'summary.md': `## 🚀 Load Test Results

| Metrics | Value |
| :--- | :--- |
| **Requests Failed** | ${errorRate}% |
| **P95 Latency** | ${p95} ms |
| **Total Iterations** | ${data.metrics.iterations.values.count} |

### 📊 Performance Charts
![Check Results](${pieChart})
![Latency Profile](${barChart})

### ✅ Check Details
- **Succeeded:** ${passes}
- **Failed:** ${fails}

---
*Generated by WarungPOS Load Test System*
`,
  };
}