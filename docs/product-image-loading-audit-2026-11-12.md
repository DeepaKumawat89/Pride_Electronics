# Product image loading and Googlebot audit

Date: 2026-11-12 (Asia/Calcutta)

## Production evidence

- The public Firestore REST collection returned 213 product documents.
- Those documents contained 214 product image URL/path pairs.
- Every pair used `https://firebasestorage.googleapis.com`, the configured
  `ecommerce-78081.firebasestorage.app` bucket, and the same decoded object path
  stored in `imageStoragePaths`.
- All 214 tokenized image URLs returned HTTP 200 at audit time.
- No object was missing and no token was expired or revoked.
- All 214 responses used `Cache-Control: public,max-age=31536000,immutable`.
- The largest current product image reported a content length of 420,156 bytes.
- A product object also returned HTTP 200 after its download token was removed,
  confirming that deployed product-image reads are public without Firebase Auth.
- `/`, `/products`, and `/sitemap.xml` returned HTTP 200. `/products` returned a
  204,136-byte server-rendered HTML document, and the sitemap returned a
  38,205-byte XML document.

## Root-cause conclusion

The reported historical Google Search Console “Other error” is not reproducible
as invalid data or an authorization failure. The current URLs, tokens, objects,
cache headers, and public-read behavior are all valid.

The strongest evidence-based explanation is transient request pressure during
Google's rendered live test: the server-rendered `/products` response emitted the
entire 213-product image catalog, closely matching the reported 242 total page
resources. That creates a large cross-origin image burst. This conclusion is an
inference because the historical Googlebot network trace is not available, but
the audit rules out the persistent causes listed above.

The earlier Firestore Listen/channel failures are separate. Public storefront
catalog loading already uses Firestore Lite one-shot reads; only authenticated
admin catalog views retain a realtime listener with retry/backoff. Googlebot
therefore does not depend on a long-lived Listen channel.

## Changes made

- Limited server-rendered catalog image requests to 24 while retaining every
  product name, description, and canonical product link in the HTML. Each
  product detail route still exposes its full image and Product structured data.
- Marked only the first four server-rendered catalog images, the home hero, and
  the product-detail hero as eager/high priority. Catalog, search, promotion,
  related-product, and gallery-thumbnail images are lazy.
- Added explicit dimensions and async decoding to reduce layout and decode work.
- Added preconnect and DNS-prefetch hints for Firebase Storage.
- Added a reusable storefront image fallback that logs the rejected original URL
  and retains it in `data-original-src`/`data-failed-src` before showing the
  fallback. This keeps failures diagnosable.
- New admin uploads now create a 640 px WebP thumbnail alongside the optimized
  full image. Both use immutable one-year caching and aligned Firestore URL/path
  fields. Existing products remain compatible and are not bulk-migrated.
- Replacement, duplication, variant handling, failed-upload rollback, and
  deletion now account for both full images and thumbnails.
- Added client and Firestore validation for optional thumbnail URL/path groups.
- Added regression coverage for unauthenticated product-image reads and the
  server-rendered image request budget.

## Security assessment

```json
{
  "score": 5,
  "summary": "Product images are intentionally public-read, while create, update, and delete require an authenticated admin claim. Uploads are constrained by product path, filename, WebP content type, size, and uploader metadata. Thumbnail fields receive the same alignment and path validation without weakening existing rules.",
  "findings": []
}
```

No Storage rule was loosened and no download token was regenerated.

## Verification boundary

Per the request, the application, build, and test suites were not run. Static
diff validation (`git diff --check`) passed. The production checks above were
read-only HTTP/Firestore/Storage requests.
