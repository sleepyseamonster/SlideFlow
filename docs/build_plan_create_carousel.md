# Build Plan: Create Carousel (Square, Images Only)

Scope: When the user clicks **Next Step** on `/slideboard`, create a new carousel (square 1080×1080) from the images already uploaded to Supabase Storage. No captions, no brand styles, no derivatives in this step. If any media insert fails, fail the whole operation and clean up.

## User Flow (Frontend)
- Uploads happen immediately when the user adds files to the slideboard (before Next Step). Store per-file metadata: `bucket`, `path`, `mime_type`, `size_bytes`, and the visual order.
- On **Next Step**, call a new Edge Function `create-carousel` with:
  - Auth header: `Authorization: Bearer <user access token>`
  - Body: `{ title, files: [{ bucket, path, mime_type, size_bytes }], aspect: "square", status: "draft" }`
  - (No captions, no brand profile, no styles here.)
- On success, store `carouselId` client-side and navigate to the results page to continue the flow (later steps will add captions, brand profile, styles).

## Edge Function: `create-carousel`
### Auth + RLS
- Require `Authorization: Bearer <user JWT>` in the request; use the Supabase client with the anon key and set the auth to the user token so RLS enforces `user_id = auth.uid()`.
- Reject missing/invalid tokens (401).

### Validation
- Body must include: `files` (array, 1–10), each with `bucket="media"`, `path`, `mime_type`, `size_bytes > 0`.
- Ensure each `path` is namespaced to the caller: `path` starts with `user_<auth.uid()>` (or `<auth.uid()>` if that variant is allowed).
- `title`: optional; fallback to `"Untitled Carousel"`.
- `aspect`: default to `"square"`; `status`: default to `"draft"`.

### Core Steps (transactional intent)
1) `carouselId = crypto.randomUUID()`.
2) Insert into `carousel` with `{ id: carouselId, user_id: auth.uid(), title, aspect: 'square', status: 'draft' }`.
3) For each file in order:
   - Insert into `media` with provided metadata plus `user_id`, `filename = last(path)`, `media_type = 'image'`, `visibility = 'private'`.
   - Insert into `carousel_slide` with `{ carousel_id: carouselId, user_id: auth.uid(), media_id, position = index+1, type_code = 'image' }`.
4) Return `{ carouselId, slideCount: files.length, mediaIds: [...], aspect: 'square' }`.

### Failure Handling
- If any insert fails, attempt compensating cleanup: delete inserted `carousel_slide` rows, then `media` rows, then the `carousel` row. If cleanup fails, log error and surface a 500 with an error code.
- Emit structured errors: 401 (auth), 422 (validation), 409 (constraint), 500 (unexpected).
- Log errors with enough context (user_id, carouselId, step, message).

## Frontend Changes (Slideboard Page)
- Ensure uploads still occur on add-to-board; keep the array of uploaded file metadata in order.
- Wire **Next Step** to call `create-carousel` (Supabase functions invoke) instead of N8n flows.
- Handle success: persist `carouselId` (e.g., context/router state) and navigate to results page.
- Handle failure: show toast/modal with the error message.

## Data Contract
- Request:  
  ```json
  {
    "title": "string (optional)",
    "files": [
      { "bucket": "media", "path": "user_<uid>/.../file.png", "mime_type": "image/png", "size_bytes": 12345 }
    ],
    "aspect": "square",
    "status": "draft"
  }
  ```
- Response on 200:  
  ```json
  { "carouselId": "<uuid>", "slideCount": 3, "mediaIds": ["<uuid>", "..."], "aspect": "square" }
  ```
- Errors: `{ "error": "message", "code": "<string>" }`.

## Open Decisions
- Cleanup vs. DB transaction: For full atomicity, we can add a Postgres function to wrap the inserts in a transaction; otherwise, implement compensating deletes in the Edge Function.
- Results page contract: define how it consumes `carouselId` and whether it needs the `mediaIds` list.

