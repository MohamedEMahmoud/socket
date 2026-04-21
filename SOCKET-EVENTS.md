# Socket.IO — توثيق التكامل (Web & Flutter)

مستند موجّه لفريق الويب (JavaScript/TypeScript) وفريق Flutter. الأسماء والحقول كما في السيرفر (`nodeServer`).

**إصدار الخادم:** Socket.IO `4.x` (متوافق مع عميل JS `socket.io-client@4` وعميل Dart `socket_io_client` المناسب لـ v4).

---

## 1) عنوان الاتصال (Base URL)

| بيئة (حسب `NODE_MODE` في `.env`) | الصيغة | مثال (راجع `.env` عندك) |
|----------------------------------|--------|---------------------------|
| `live` (HTTPS + شهادات SSL)      | `https://{NODE_HOST}:{NODE_PORT}` | `https://wesell.com.sa:4983` |
| `test` (HTTP)                    | `http://{NODE_HOST}:{NODE_PORT}`  | مثل `http://127.0.0.1:3030` |

- استخدم **نفس عنوان HTTP/HTTPS** للخادم؛ عميل Socket.IO يفتح WebSocket تلقائياً (لا حاجة لكتابة `https://` يدوياً في عنوان `io(...)`).
- **CORS:** السيرفر يقيّد `origin` إلى `APP_URL` من `.env` مع `credentials: true`. من المتصفح قد تحتاج `withCredentials: true` في خيارات العميل إذا كان التطبيق يعتمد الكوكيز.

---

## 2) معاملات الاتصال (Query — إلزامية)

يُرسل كل الحقول التالية كـ **query parameters** عند إنشاء الاتصال. القيم تُقرأ كنصوص على السيرفر؛ يجب أن تكون موجودة وغير فارغة.

| المفتاح       | النوع للعميل | إلزامي | ملاحظات |
|---------------|----------------|--------|---------|
| `userId`      | `string`       | نعم    | رقم صحيح وغير `"0"` (يُتحقق رقمياً على السيرفر) |
| `userType`    | `string`       | نعم    | انظر جدول morph أدناه |
| `name`        | `string`       | نعم    | اسم العرض |
| `lang`        | `string`       | نعم    | مثل `ar` أو `en` |
| `deviceType`  | `string`       | نعم    | مثل `android` · `ios` · `web` |
| `deviceId`    | `string`       | نعم    | معرّف جهاز / FCM token إلخ |

### قيم `userType` المدعومة لرسائل قاعدة البيانات (morph)

| `userType` في الـ query | استخدام |
|-------------------------|---------|
| `user`                  | مدعوم |
| `admin`                 | مدعوم |
| `provider`              | مدعوم |

أي قيمة أخرى قد لا يُسجَّل لها `senderable_type` بشكل صحيح عند حفظ الرسالة.

### سلوك الخطأ عند نقص الـ query

عند فشل التحقق من أحد الحقول الإلزامية، السيرفر يرسل `error_message` وقد **يُغلق الاتصال** (`disconnect`). يُنصح بإعادة المحاولة بعد تصحيح المعاملات.

---

## 3) أحداث من العميل → السيرفر (`emit`)

| الحدث | الجسم (JSON) | تحقق على السيرفر |
|--------|----------------|-------------------|
| `enter-chat` | `{ "room_id": <number> }` | `room_id` رقم صالح |
| `send-message` | `{ "room_id": <number>, "type": "text"\|"image", "body": "<string>" }` | نفس التحقق + `type` و `body` |
| `exit-chat` | `{ "room_id": <number> }` | `room_id` رقم صالح |
| `start-call` | `{ "room_id": <number>, "shareLink": "<string>" }` | لا يوجد تحقق صارم في الكود الحالي؛ يُفضَّل إرسال قيم صحيحة |
| `answer-call` | `{ "room_id": <number> }` | — |
| `reject-call` | `{ "room_id": <number> }` | — |
| `return-from-call` | `{ "room_id": <number> }` | — |

**ترتيب مقترح:** بعد `connect` → اشترك في `message-received` و `error_message` → أرسل `enter-chat` قبل الرسائل داخل الغرفة.

---

## 4) أحداث من السيرفر → العميل (`on`)

### `message-received`

**أ) رسالة محفوظة (`type`: `text` أو `image`)**

| الحقل | النوع في JSON | ملاحظات |
|--------|----------------|---------|
| `id` | number | معرّف الرسالة |
| `sender_id` | number | |
| `sender_type` | string | |
| `sender_name` | string | |
| `room_id` | number | |
| `body` | string | نص؛ أو URL كامل للصورة عند `type === "image"` |
| `type` | string | `text` أو `image` |
| `avatar` | string | قد يكون `""` |
| `is_sender` | number | `0` أو `1` |
| `is_seen` | number | `0` أو `1` |
| `created_at` | string | نص نسبي (مثل «منذ لحظات») حسب `lang` |
| `updated_at` | string (ISO) | وقت من السيرفر |

**ب) حدث مكالمة (`type`: `call` | `answer-call` | `call-rejected` | `return-from-call`)**

| الحقل | النوع | ملاحظات |
|--------|--------|---------|
| `room_id` | **string** | مثل `"5"` — عالِج التحويل إلى رقم في الواجهة إذا لزم |
| `type` | string | أحد القيم أعلاه |
| `shareLink` | string | يظهر عند `type === "call"` فقط |

> **توحيد العميل:** عند بناء النماذج (TypeScript/Dart) استخدم دالة تُحوّل `room_id` إلى `int` سواء وصل كرقم أو كسلسلة.

### `error_message`

```json
{
  "key": "fail",
  "message": "<نص مترجم أو مفتاح>",
  "status": 400
}
```

| الحقل | الوصف |
|--------|--------|
| `key` | غالباً `fail` أو `exception` |
| `message` | عربي/إنجليزي حسب ملفات الترجمة في السيرفر |
| `status` | حالياً يُعاد `400` من مساعد الأخطاء في معظم الحالات |

رسائل تحقق شائعة (مفاتيح الترجمة): `userIdRequired`, `userTypeRequired`, `nameRequired`, `langRequired`, `deviceTypeRequired`, `deviceIdRequired`, `roomIdRequired`, `invalidMessageType`, `bodyRequired`, `somethingWrong`.

---

## 5) أمثلة تكامل

### JavaScript / TypeScript (متصفح أو bundler)

```javascript
import { io } from "socket.io-client";

const baseUrl = "https://wesell.com.sa:4983"; // غيّر حسب البيئة

const socket = io(baseUrl, {
  transports: ["websocket"],
  withCredentials: true, // إن لزم مع CORS + cookies
  query: {
    userId: String(userId),
    userType: "user",
    name: displayName,
    lang: "ar",
    deviceType: "web",
    deviceId: deviceToken,
  },
});

socket.on("connect", () => {
  socket.on("message-received", (payload) => {
    /* handle message or call event */
  });
  socket.on("error_message", (err) => {
    /* err.key, err.message, err.status */
  });
});

// داخل شاشة الدردشة
socket.emit("enter-chat", { room_id: roomId });
socket.emit("send-message", { room_id: roomId, type: "text", body: "مرحباً" });
socket.emit("exit-chat", { room_id: roomId });
```

### Flutter (Dart) — `socket_io_client`

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

final socket = IO.io('https://wesell.com.sa:4983', <String, dynamic>{
  'transports': ['websocket'],
  'query': <String, String>{
    'userId': userId.toString(),
    'userType': 'user',
    'name': displayName,
    'lang': 'ar',
    'deviceType': 'android',
    'deviceId': fcmToken,
  },
});

socket.on('message-received', (data) {
  // data هو Map؛ room_id قد يكون int أو String حسب نوع الحدث
});

socket.on('error_message', (data) {
  // Map: key, message, status
});

socket.emit('enter-chat', {'room_id': roomId});
socket.emit('send-message', {
  'room_id': roomId,
  'type': 'text',
  'body': 'مرحباً',
});
```

---

## 6) الصور (`type: image`)

- أرسل في `body` **اسم الملف فقط** بعد الرفع عبر REST كما يحدده الباكند Laravel.
- الرابط الكامل للعرض يُبنى على السيرفر تقريباً بالشكل:

  `{APP_URL}/{STORAGE}/images/rooms/{room_id}/{fileName}/`

  (يُستخرج `APP_URL` و`STORAGE` من `.env` على الخادم.)

---

## 7) مرجع سريع — تسلسل مكالمة

1. الطرف أ: `emit('start-call', { room_id, shareLink })`
2. الطرف ب: يستقبل `message-received` مع `type: "call"` و `shareLink`
3. الطرف ب: `emit('answer-call', { room_id })` أو `emit('reject-call', { room_id })`
4. عند الانتهاء: `emit('return-from-call', { room_id })`

---

## 8) English quick reference (for Flutter / Web)

| Item | Value |
|------|--------|
| **Library** | Server: Socket.IO 4.x. Client: `socket.io-client@4` (web) / `socket_io_client` (Flutter, io v4 compatible). |
| **Base URL** | `https://HOST:PORT` (live) or `http://HOST:PORT` (test). Use the same URL as the HTTP(S) API node. |
| **Mandatory query** | `userId`, `userType`, `name`, `lang`, `deviceType`, `deviceId` (all non-empty strings; `userId` must be a non-zero number). |
| **Supported `userType` for DB** | `user`, `admin`, `provider` |
| **Client → Server** | `enter-chat`, `send-message`, `exit-chat`, `start-call`, `answer-call`, `reject-call`, `return-from-call` |
| **Server → Client** | `message-received`, `error_message` |
| **`message-received` types** | Messages: `text`, `image`. Calls: `call`, `answer-call`, `call-rejected`, `return-from-call` |
| **`room_id` caveat** | Numeric in normal messages; **string** in call-only payloads (e.g. `"5"`). Parse defensively. |

---

## 9) جدول ملخص الأحداث

| الحدث | الاتجاه | Payload مختصر |
|--------|---------|----------------|
| `enter-chat` | → Server | `room_id` |
| `send-message` | → Server | `room_id`, `type`, `body` |
| `exit-chat` | → Server | `room_id` |
| `start-call` | → Server | `room_id`, `shareLink` |
| `answer-call` | → Server | `room_id` |
| `reject-call` | → Server | `room_id` |
| `return-from-call` | → Server | `room_id` |
| `message-received` | ← Server | رسالة أو حدث مكالمة |
| `error_message` | ← Server | `key`, `message`, `status` |
