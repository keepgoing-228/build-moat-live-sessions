# QR Code Generator Prototype

## System Requirements

Build a dynamic QR code system where:
- Users submit a long URL and get back a short URL token + QR code image
- The QR code encodes a short URL that redirects (302) to the original URL via your server
- Users can modify the target URL after QR code creation
- Users can delete a QR code (soft delete)
- Users can optionally set an expiration timestamp on create or update
- Deleted or expired links return appropriate HTTP status codes
- URL validation: format check, normalization, malicious URL blocking

## Design Questions

Answer these before you start coding:

1. **Static vs Dynamic QR Code:** Why does this system use dynamic QR codes (encode short URL) instead of static (encode original URL directly)? When would you choose static instead?
因為使用 static QR code 一旦產生後就不能再改URL 了，使用 dynamic 的話可以透過改 DB 資料來重新導向不需要改 QR code 圖案，但是這也是有成本的，如下：
    - 多了我的 server 的 I/O，而且每多一個 redirect round-trip 約增加 100-300 latency
    - 需要保證機器 online ，只要 offline 所有 QR codes 同時失效
    - 被駭的風險。
那什麼時候選 static？：
    - 目標 URL 永遠不會變（vCard、Wikipedia 永久連結、會議室 WiFi 設定）
    - 不需要 analytics
    - 環境網路不穩、不想依賴第三方 service 也活著（例如博物館解說牌）

2. **Token Generation:** How will you generate short URL tokens? What happens when two different URLs produce the same token? How does collision probability change as the number of tokens grows?
我會選擇使用 SHA-256 + nonce 來生成 token，因為 hash 是 deterministic 的，只要給定相同的 input，就會產生相同的 output，所以為了有唯一性要加上 nonce（可以是timestamp+attempt，未來有 user 時可以加上 user_id） 一起拿去 hash，再經過 Base62 編碼擷取前7 char，就可以生成一個短的 token。

3. **Redirect Strategy:** Why 302 (temporary) instead of 301 (permanent)? What are the trade-offs for analytics, URL modification, and latency?
用 302 的原因：
  - 每次掃描都打到 server 就可以記錄 analytics
  - 目標 URL 可以隨時修改，立刻生效
  - 支援 soft delete / expiry（301 cache 住了就沒辦法做到）

302 的代價：
  - 每次掃描多一次 server latency（靠 in-memory cache 緩解）
  - Server 需要承受所有掃描流量（不像 301 可以卸載到 browser）

4. **URL Normalization:** What normalization rules do you need? Why is `http://Example.com/` and `https://example.com` potentially the same URL?
   因為這兩個 URL 指向的實際資源相同，但字串不同，不做 normalization 會存成兩筆、產生兩個 token。
   需要的 normalization rules：
   1. scheme 統一升級為 https（http → https）
   2. host 轉小寫（Example.COM → example.com，RFC 3986 規定 host 不分大小寫）
   3. 移除尾部斜線（example.com/ → example.com）
   4. 移除 fragment（#anchor 不送到 server，直接丟掉）
   5. 移除 default port（http :80、https :443）
   normalize 之後再 hash，才能讓 deduplication 正確運作。

5. **Error Semantics:** What should happen when someone scans a deleted link vs a non-existent link? Should the HTTP status codes be different?
不存在的 token 會使用 http 404 not found，server 說明我不認識這個 URL，通常可能是 client 端打錯字。而被刪除的 token 則是用 410 Gone，說明這個 source 已經被刪除或是過期等等

## Verification

Your prototype should pass all of these:

```bash
# Create a QR code
curl -X POST http://localhost:8000/api/qr/create \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
# → 200, returns {"token": "...", "short_url": "...", "qr_code_url": "...", "original_url": "..."}

# Redirect
curl -o /dev/null -w "%{http_code}" http://localhost:8000/r/{token}
# → 302

# Get info
curl http://localhost:8000/api/qr/{token}
# → 200, returns token metadata

# Update target URL
curl -X PATCH http://localhost:8000/api/qr/{token} \
  -H "Content-Type: application/json" \
  -d '{"url": "https://new-url.com"}'
# → 200

# Redirect now goes to new URL
curl -o /dev/null -w "%{redirect_url}" http://localhost:8000/r/{token}
# → https://new-url.com

# Delete
curl -X DELETE http://localhost:8000/api/qr/{token}
# → 200

# Redirect after delete
curl -o /dev/null -w "%{http_code}" http://localhost:8000/r/{token}
# → 410

# Non-existent token
curl -o /dev/null -w "%{http_code}" http://localhost:8000/r/INVALID
# → 404

# QR code image
# (create a new one first, then)
curl -o /dev/null -w "%{http_code} %{content_type}" http://localhost:8000/api/qr/{token}/image
# → 200 image/png

# Analytics
curl http://localhost:8000/api/qr/{token}/analytics
# → 200, returns {"token": "...", "total_scans": N, "scans_by_day": [...]}
```

## Suggested Tech Stack

Python + FastAPI recommended, but you may use any language/framework.
