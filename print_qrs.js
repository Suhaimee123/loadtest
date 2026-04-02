import http from 'k6/http';
import { check, sleep } from 'k6';

// ตรวจสอบและแก้ไขรูปแบบ Table ID ให้ถูกต้องครบทั้ง 58 ตัว
const tableIds = [
  "0HvSCLyhYUApTUA18kXu", "0sqtkAMGIopYynwcKMmN", "12BFEEL1qga1QdNUs9cI", "14LEiXp6K5lxAlW2IpMi",
  "1WF6prnKSbnycmJV3YfI", "1cYqAPNKFJD75g7hyeA2", "36LuMQwBssbecQg2BZn3", "3GGAz2qlVqWsD2iOrXbc",
  "54OCkhweIUqCAUdD14h1", "6K59VM4aIbPCPQ3H25YC", "6U8Nkc0kES9vm2b1VFZ5", "6yANtriXRks3pmJWyHUR",
  "7AKX72vZkArf1TcuJLcz", "9sHdksmYQA9xBaFpKwH0", "BYg5wO9nRwJ78EllBeVN", "Bx6tf4IkqhopH5BrsiXn",
  "CFNk1tVSTmw0WO8xcGuR", "CNWfzj3l1IoGjundGVz6", "CPicP8HupUafo08mTXES", "EGrqyvmaA4OsxapsZ0Oy",
  "EUMgp6btSQnghzJuFEJR", "EeV8Amx7sIYdIJlyf00j", "FCnS8IfwskAHlFSZtspr", "GW8ys2g7yDQOkzf8XfB7",
  "HSGQsoOUTHkn5s6f4Qbj", "IFKt7oawGpcJdEThazKn", "JzSorZW34Co94CHEbDg3", "KBDzrgyObeSgMnt96iYP",
  "Kxyxol24k7QlmH51opC1", "L1BKUy28KyY74LvXcqSq", "MgVTPx3w1LOgvNL6Jemd", "POmlGLMrSH0ar1lUzM4b",
  "QtgcPvrqcQn2mRsjS7NH", "R3VMQxkva5zmS0FQWvEn", "RLY3NW7AR0MQsEt42fFX", "TY8CjCi6BuUS5udHImVq",
  "VWFRnvvAV3THxQ5mj1OP", "Vvf2tANZ4BYNNp8XZIN2", "WI2tfCwPRRlmbziGOIj9", "X6JGPIs84g5RPaS1W4eI",
  "XeqZXiSeMX9ovsPjPMoP", "YSzfEsDokbXOABFkBFpM", "ZyTYVWZTJt8lK5wxxzY9", "aU2cmW57wNPytwpDx2tO",
  "c7It3JYELqwXF3G2tELb", "f0eeSnubqPKNfGEup7Se", "fPY2Y37iYQwKf0ptCmNt", "fUA3LzhyDpxa7wd73BzK",
  "fvrhjw7iTn06G53XXIJE", "go72XYuAKevOe4o0MjaI", "i5xADQxqYVXrGG19C20n", "iJEKGdbS2fjLUCpd9HDp",
  "iWmd1Fc5Ps4DTtgLjs4r", "iuuYjqp8i2CDoP833CGV", "jBeXCtubKsIlgg3NbvZu", "kQu9hfh0qLkvIaUSGQyk",
  "kYlIJq2Npa6IpF6hM7I5", "ke6wqu3jxkBoYFZjra5n", "lA4uKVaJuVA3db9lp7BP", "mggzolNDSWpnphaexUSu",
  "nxHLWiN83iHBPA62gyAZ", "obOQzHUuK3xgbO1Y1k4W", "p1EBC9h61BCgzBHPsMJg", "rn8M0NaglywAK7jX2kiG",
  "temd8hPgfrAD9zZTRCf3", "wE7o6gnwdwxrUV6EVbvH", "wLSth4uVrxhNAkFRyUKq", "wZ7HNrS73nJyoSRCkcbu",
  "whBXfQL8J69prwLAa6qn", "xZktcFXX9eEWAfq081OA", "xtoJUPHgCloq6GKrUjId", "y6YtyGOhXAy8LULXWBNb",
  "yPOxBCPzaS9QhONTS1bP", "zTV17v5aKDX5bEOLKMn3", "zqqbYzwCnsUnQyfrZiTH"
];

export const options = {
  iterations: tableIds.length,
  vus: 1,
};

export default function () {
  const url = 'https://us-central1-warungpos-9e429.cloudfunctions.net/api/publicTables/printQR';
  const tableId = tableIds[__ITER];

    const token = '';


  const payload = JSON.stringify({
    tableId: tableId,
    addressId: null
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  console.log(`[${__ITER + 1}/${tableIds.length}] Printing QR for Table ID: ${tableId}...`);

  const res = http.post(url, payload, params);

  check(res, {
    'is status 200': (r) => r.status === 200,
  });

  if (res.status !== 200) {
    console.error(`[FAIL] ID ${tableId}: Status ${res.status} ${res.body}`);
  }

  sleep(0.3); // ปรับ Sleep เล็กน้อยให้มั่นใจว่าไม่โดน Rate Limit
}
