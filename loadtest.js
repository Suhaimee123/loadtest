import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter } from 'k6/metrics';

const status503Counter = new Counter('http_req_status_503');

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '10m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration{name:1. Verify Override Token}': [],
    'http_req_duration{name:2. Create Session}': [],
    'http_req_duration{name:3. Add to Cart}': [],
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

// 🚀 รายชื่อ PID ชุดใหม่ 99 ตัว (TEST1 - TEST100) ที่เพิ่งสร้างสดๆ ร้อนๆ
const pids = [
  "UZ6aQcJvDd", "y-HMttaeZ-", "jgvwvV6i8j", "LF5TQrk5UD", "WnsjB3yUt7", "Y4VHI2UxLo", "NF3xdiYc9B", "FLr-Psu0z-",
  "t2HDJvgpil", "SwfPgKbF1O", "tqB8YymKOT", "TdGiGbeeEu", "Rys-synldr", "EyvmVN4Cos", "utsxgb2Xx2", "oAbSB4lozi",
  "ZDUQl0UyFq", "fyOoRLlOuf", "hpkqZsCxgE", "txMoWQ6oBg", "b1wEKbkcw3", "1qjvhNT9E1", "LW0ax5pwGh", "z9veYifJ8c",
  "pI-x_j8h45", "BAF0Vo23UJ", "Q3oC8AwKkk", "QuTQ7MxI-1", "vMwtLlKZZs", "HIohjtDXdw", "XkBER1ZOaI", "ku2OyRwIpd",
  "7AmfaH0BAf", "xNomfiuHy2", "00N8saqf6J", "3WE2R9nY45", "WYWHPkUt75", "aOYUBubvTf", "nK1nIleiLB", "IFlPYVSUU4",
  "A31lhHGO_H", "0j3uiJFMnr", "zjsmNUaS5s", "Ydu4ot5NZ1", "GQeZWsEz84", "wV2gvNIgel", "tZpLftpD3D", "ala42CqT2h",
  "OhskPWsVN8", "EtuVKjPCe-", "khGwavVU2i", "TTBI2p5hl9", "Y_J14u2kJx", "KvCxyTC93x", "o51UdvaWNu", "ts-qQSuI8X",
  "7bATvO7PO0", "wt8YRVbFXf", "Nvi8Nqscle", "lUA-IxJjTe", "bv0rd8ur06", "AT0BsY5SkQ", "cE0x8TsJnj", "QzE-71YI15",
  "rV558uw3qZ", "-JS8zGvKEe", "c4v18TeBlW", "P8eJYIXYlG", "Z8rQaUEQZL", "v1y_2bZAOB", "IeeboaydSo", "7doEDfqDUv",
  "rla8tnSl51", "EQEiR6IitE", "HQH5Il6YyP", "Bx0cWduYYL", "trtqnSHSoC", "_BppRjyMlG", "H_gqqC6peE", "vQpwkohUMd",
  "ay5M39ipiQ", "GiHlJsCj_M", "u7J38r-Jhv", "MzPJIEy-0x", "KXFzJw4K55", "DTVvAEkkiF", "FPI3y_Qxwp", "s_DVCjOBi3",
  "AqpRFihhfZ", "FNZDfGFcpY", "sEEzfbCWgi", "cC7viw7VM3", "KGbTzZEgZJ", "D5EAJaF9IS", "n7_r4QIyUw", "EVl3rZ01so",
  "0mUgUMBPAT", "a2h8y7I9Bv", "ppBeLwT7In", "edak--7AWq"
];

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
      code: "1001", pid: pid, id: adminId, reason: "Load Test 100 VUs - New Batch"
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

  // 3. Add to Cart
  let v3_success = false;
  group('Step 3: Add to Cart', function () {
    const res = http.post(`${baseUrl}/guest/events`, JSON.stringify({
      type: "add_to_cart", ts: Date.now(), sessionId: sessionId,
      tableName: `T-${vuId}`, contactName: contactName,
      tableId: "i5xADQxqYVXrGG19C20n", branchId: "c9997882-3ada-4d57-bd62-3d38bfc4421a",
      businessDay: businessDay, membersId: guestKey,
      payload: {
        menuId: "Nj8l8Smstya5aGnLDHKb", 
        menuName: { th: "กะเพรา" }, qty: 1, total: 55, currency: "THB",
        builds: [{ id: randomString(7), tierKey: "M", mods: {}, each: 55 }],
        kitchenStation: "4VimoAU6yEYqIrt9wl3N"
      }
    }), { headers: headers, tags: { name: '3. Add to Cart' } });

    trackStatus(res);
    v3_success = check(res, { 'v3_ok': (r) => r.status === 200 });
    if (!v3_success) console.error(`[VU:${vuId}] Step 3 Fail: ${res.status} ${res.body}`);
  });
  if (!v3_success) { sleep(0.3); return; }

  sleep(0.3); 

  // 4. Order
  let v4_success = false;
  group('Step 4: Order', function () {
    const res = http.post(`${baseUrl}/guest/events/order`, JSON.stringify({
      ts: Date.now(), sessionId: sessionId, currency: "THB", itemsCount: 1, subtotal: 55,
      items: [{
        menuId: "Nj8l8Smstya5aGnLDHKb", menuName: { th: "กะเพรา" }, qty: 1, total: 55,
        builds: [{ id: randomString(7), tierKey: "M", each: 55, mods: {} }],
        kitchenStation: "4VimoAU6yEYqIrt9wl3N"
      }],
      url: `https://warungpos.app/cart?pid=${sessionId}`,
      contactName: contactName, tableName: `T-${vuId}`,
      tableId: "i5xADQxqYVXrGG19C20n", branchId: "c9997882-3ada-4d57-bd62-3d38bfc4421a",
      businessDay: businessDay, membersId: guestKey
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
    getStat('3. Add to Cart'),
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
    'stdout': `\n🚀 Detailed Load Test Summary (VUs: 10, 503s: ${s503Count}, Time: 10m)\n` +
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