import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter } from 'k6/metrics';

const status503Counter = new Counter('http_req_status_503');

export const options = {
  vus: 20,
  iterations: 100,
  thresholds: {
    'http_req_duration{name:1. Verify Override Token}': [],
    'http_req_duration{name:2. Create Session}': [],
    'http_req_duration{name:4. Place Order}': [],
  }
};

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const pids = JSON.parse(open("./pids.json"));

function trackStatus(res) {
  if (res.status === 503) status503Counter.add(1);
}

export default function () {
  const baseUrl = 'https://us-central1-warungpos-9e429.cloudfunctions.net/api';
  const adminId = "UTT1cWu772MXhrnORl2kWGion8F3";
  
  const pidIndex = (__VU - 1 + (__ITER * 100)) % pids.length; 
  const pid = pids[pidIndex];
  
  const vuId = __VU;
  const iterId = __ITER;
  const guestKey = randomString(24);
  const contactName = `T-${vuId}-${iterId}`;

  let token = '';
  let sessionId = '';
  let businessDay = '';

  // 1. Verify
  let v1_success = false;
  group('Step 1: Verify', function () {
    const res = http.post(`${baseUrl}/guest/override/verify`, JSON.stringify({
      code: "1001", pid: pid, id: adminId, reason: "Load Test 10 Iterations - Fixed Day"
    }), {
      headers: { 'Content-Type': 'application/json', 'x-guest-admin-id': adminId },
      tags: { name: '1. Verify Override Token' }
    });
    trackStatus(res);
    v1_success = check(res, { 'v1_ok': (r) => r.status === 200 });
    if (v1_success) token = res.json().token;
  });
  if (!v1_success) { sleep(0.1); return; }
  
  sleep(0.1); 

  // 2. Session
  let v2_success = false;
  group('Step 2: Session', function () {
    const res = http.post(`${baseUrl}/guest/sessions`, JSON.stringify({
      pid: pid, id: adminId, guestKey: guestKey, overrideToken: token
    }), {
      headers: {
        'Content-Type': 'application/json',
        'x-guest-admin-id': adminId,
        'x-guest-override-token': token,
      },
      tags: { name: '2. Create Session' }
    });
    trackStatus(res);
    v2_success = check(res, { 'v2_ok': (r) => r.status === 200 });
    if (v2_success) {
      const data = res.json();
      sessionId = data.sessionId;
      businessDay = data.businessDay;
    }
  });
  if (!v2_success) { sleep(0.4); return; }

  const headers = {
    'Content-Type': 'application/json',
    'x-guest-admin-id': adminId,
    'x-guest-override-token': token,
    'x-guest-session-id': sessionId,
  };

  sleep(0.5); 


  // 4. Order
  let v4_success = false;
  group('Step 4: Order', function () {
    const res = http.post(`${baseUrl}/guest/events/order`, JSON.stringify({
      ts: Date.now(),
      sessionId: sessionId,
      currency: "THB",
      itemsCount: 5,
      subtotal: 407,
      items: [
        {
          menuId: "R3BvK2IVDBpgpy3FcoRU",
          menuName: { th: "ข้าวแพนงเนื้อ", en: "Panang Beef Curry on Rice", ms: "Kari Panang Daging atas Nasi" },
          qty: 2,
          total: 178,
          builds: [
            { id: randomString(7), tierKey: "M", each: 89, mods: {} },
            { id: randomString(7), tierKey: "M", each: 89, mods: {} }
          ],
          kitchenStation: "4VimoAU6yEYqIrt9wl3N"
        },
        {
          menuId: "NeMtBZSoWpRypXWN6Csh",
          menuName: { th: "ข้าวไก่ทอดสมุนไพร", en: "Herb Fried Chicken on Rice", ms: "Nasi Ayam Goreng Herba" },
          qty: 1,
          total: 75,
          builds: [{ id: randomString(7), tierKey: "M", each: 75, mods: { "3b241c4d-0533-4749-bc2c-c18ae18a08a7": [{ th: "ซอสพริก", en: "Chili", ms: "Cili" }] } }],
          kitchenStation: "4VimoAU6yEYqIrt9wl3N"
        },
        {
          menuId: "8JGdkoInRDrg6WDNk8m5",
          menuName: { th: "ข้าวยำปักษ์ใต้", en: "Southern Thai Rice Salad", ms: "Nasi Kerabu Thai Selatan" },
          qty: 1,
          total: 69,
          builds: [{ id: randomString(7), tierKey: "M", each: 69, mods: {} }],
          kitchenStation: "4VimoAU6yEYqIrt9wl3N"
        },
        {
          menuId: "7dMGvg3fvZfVgnJ47phY",
          menuName: { th: "ข้าวมัสมั่น", en: "Massaman Curry on Rice", ms: "Nasi Massaman atas Nasi" },
          qty: 1,
          total: 85,
          builds: [{ id: randomString(7), tierKey: "M", each: 85, mods: { "ca398fce-8ac6-47a9-b8b6-dcd36e5f092a": [{ th: "ไก่", en: "Chicken", ms: "Ayam" }] } }],
          kitchenStation: "4VimoAU6yEYqIrt9wl3N"
        }
      ],
      url: `https://warungpos.app/cart?pid=${sessionId}`,
      ref: "",
      userAgent: "K6-Load-Test",
      contactName: contactName,
      tableName: `T-${vuId}`,
      tableId: "JOZzOkK2imMVuapcBtOY",
      branchId: "c9997882-3ada-4d57-bd62-3d38bfc4421a",
      groupId: "",
      businessDay: businessDay,
      membersId: guestKey
    }), { headers: headers, tags: { name: '4. Place Order' } });

    trackStatus(res);
    v4_success = check(res, { 'v4_ok': (r) => r.status === 200 });
    if (v4_success) {
      console.log(`[VU:${vuId}] Success Cycle -> PID: ${pid}`);
    } else {
      console.error(`[VU:${vuId}] Step 4 FAILED -> PID: ${pid} Status: ${res.status} Reason: ${res.body}`);
    }
  });

  sleep(0.3);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const iterations = metrics.iterations ? metrics.iterations.values.count : 0;
  const errorRateTotal = metrics.http_req_failed ? (metrics.http_req_failed.values.rate * 100).toFixed(2) : '0';
  const avgTotal = metrics.http_req_duration ? metrics.http_req_duration.values.avg.toFixed(2) : '0';
  const p95Total = metrics.http_req_duration ? metrics.http_req_duration.values['p(95)'].toFixed(2) : '0';
  const minTotal = metrics.http_req_duration ? metrics.http_req_duration.values.min.toFixed(2) : '0';
  const maxTotal = metrics.http_req_duration ? metrics.http_req_duration.values.max.toFixed(2) : '0';
  const medTotal = metrics.http_req_duration ? metrics.http_req_duration.values.med.toFixed(2) : '0';
  const passes = metrics.checks ? metrics.checks.values.passes : 0;
  const failsTotal = metrics.http_req_failed ? metrics.http_req_failed.values.passes : 0;
  const s503Count = metrics.http_req_status_503 ? metrics.http_req_status_503.values.count : 0;

  const getStat = (tag) => {
    const dur = metrics[`http_req_duration{name:${tag}}`];
    const fail = metrics[`http_req_failed{name:${tag}}`];
    if (!dur) return null;
    
    return {
      name: tag,
      avg: dur.values.avg.toFixed(2),
      p95: dur.values['p(95)'].toFixed(2),
      min: dur.values.min.toFixed(2),
      max: dur.values.max.toFixed(2),
      med: dur.values.med.toFixed(2),
      fails: fail ? fail.values.passes : 0,
      errorRate: fail ? (fail.values.rate * 100).toFixed(2) : '0'
    };
  };

  const details = [
    getStat('1. Verify Override Token'),
    getStat('2. Create Session'),
    getStat('4. Place Order')
  ].filter(s => s !== null);

  const summaryData = {
    summary: { 
      iterations, 
      passes, 
      fails: failsTotal,
      errorRate: errorRateTotal, 
      avg: avgTotal, 
      p95: p95Total,
      min: minTotal,
      max: maxTotal,
      med: medTotal,
      s503: s503Count
    },
    details: details
  };

  return {
    'summary.json': JSON.stringify(summaryData),
    'stdout': `\n🚀 Detailed Load Test Summary (VUs: 2, 503s: ${s503Count}, Iterations: 10)\n` +
              `--------------------------------------------------------------------------------\n` +
              `Endpoint                   | Avg(ms) | P95(ms) | Min(ms) | Max(ms) | Fails | Error%\n` +
              `--------------------------------------------------------------------------------\n` +
              details.map(d => 
                `${d.name.padEnd(26)} | ${d.avg.padStart(7)} | ${d.p95.padStart(7)} | ${d.min.padStart(7)} | ${d.max.padStart(7)} | ${String(d.fails).padStart(5)} | ${d.errorRate}%`
              ).join('\n') + 
              `\n--------------------------------------------------------------------------------\n` +
              `OVERALL                    | ${avgTotal.padStart(7)} | ${p95Total.padStart(7)} | Total Iters: ${iterations} | Total Fails: ${failsTotal}\n`
  };
}