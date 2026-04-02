import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  iterations: 100, // รันให้ครบ 100 โต๊ะ
  vus: 1,
};

export default function () {
  const createUrl = 'https://us-central1-warungpos-9e429.cloudfunctions.net/api/tables';
  const qrUrl = 'https://us-central1-warungpos-9e429.cloudfunctions.net/api/publicTables/printQR';
  
  // ใช้ Token ล่าสุดที่คุณส่งมา
  const token = '';

  const i = __ITER + 1;
  const tableName = `TEST${i}`; 
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // --- Step 1: Create Table ---
  const createPayload = JSON.stringify({
    nameTH: tableName,
    code: tableName,
    zone: "Auto-Created",
    capacity: 9,
    isActive: true
  });

  const createRes = http.post(createUrl, createPayload, { headers });

  if (createRes.status !== 200 && createRes.status !== 201) {
    console.error(`[Iter:${i}] Failed to create table: ${createRes.status} ${createRes.body}`);
    return;
  }

  const tableId = createRes.json().data.id;
  sleep(0.2); 

  // --- Step 2: Print QR ---
  const qrPayload = JSON.stringify({
    tableId: tableId,
    addressId: null
  });

  const qrRes = http.post(qrUrl, qrPayload, { headers });

  if (qrRes.status === 200) {
    const pid = qrRes.json().pid;
    // รูปแบบการ Log พิเศษเพื่อให้ AI สกัดง่ายๆ
    console.log(`[RESULT_PID]: ${pid}`);
  } else {
    console.error(`[Iter:${i}] Failed to print QR für ID: ${tableId}`);
  }

  sleep(0.5); 
}
