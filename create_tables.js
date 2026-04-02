import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  iterations: 50,
  vus: 1,
};

export default function () {
  const url = 'https://us-central1-warungpos-9e429.cloudfunctions.net/api/tables';
  
  const token = ""

  const i = __ITER + 1;
  const payload = JSON.stringify({
    nameTH: `${i}`,
    code: `${i}`,
    zone: "Zone",
    capacity: 23,
    isActive: true
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  console.log(`[Iter:${i}] Creating Table: สุ่ม-${i}...`);
  
  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  if (res.status !== 200 && res.status !== 201) {
    console.error(`[Iter:${i}] Failed: ${res.status} ${res.body}`);
  } else {
    console.log(`[Iter:${i}] Success!`);
  }

  sleep(1);
}
