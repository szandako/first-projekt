# Supabase Storage Policies Setup

## Bucket létrehozása (ha még nem létezik)

1. Menj a Supabase Dashboard-ra
2. Kattints a **Storage** menüpontra
3. Kattints a **New Bucket** gombra
4. Bucket név: `post-images`
5. **Public bucket**: kapcsold KI (private bucket legyen)
6. Kattints a **Save** gombra

---

## Policies létrehozása (UI-ból)

Kattints a `post-images` bucket mellett a **"⋮"** (három pont) menüre, majd a **Policies** opcióra.

### Policy 1: Owners can upload images

- **Policy Name:** `Owners can upload images`
- **Allowed operation:** INSERT
- **Policy definition:**
  ```sql
  (
    bucket_id = 'post-images'
    AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  ```
- **WITH CHECK expression:** ugyanaz mint a Policy definition

---

### Policy 2: Owners can read their images

- **Policy Name:** `Owners can read their images`
- **Allowed operation:** SELECT
- **Policy definition:**
  ```sql
  (
    bucket_id = 'post-images'
    AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  ```

---

### Policy 3: Shared users can read images

- **Policy Name:** `Shared users can read images`
- **Allowed operation:** SELECT
- **Policy definition:**
  ```sql
  (
    bucket_id = 'post-images'
    AND
    EXISTS (
      SELECT 1 FROM feed_shares
      WHERE feed_shares.feed_id::text = (storage.foldername(name))[2]
      AND feed_shares.shared_with_user_id = auth.uid()
    )
  )
  ```

---

### Policy 4: Owners can delete images

- **Policy Name:** `Owners can delete images`
- **Allowed operation:** DELETE
- **Policy definition:**
  ```sql
  (
    bucket_id = 'post-images'
    AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  ```

---

### Policy 5: Owners can update images

- **Policy Name:** `Owners can update images`
- **Allowed operation:** UPDATE
- **Policy definition:**
  ```sql
  (
    bucket_id = 'post-images'
    AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  ```

---

## Ellenőrzés

1. Menj a Storage → post-images bucket-re
2. Kattints a **Policies** fülre
3. Látod mind az 5 policy-t? ✅

Ha minden policy létrejött, akkor a Storage kész!

---

## Tesztelés

1. Lépj be az appba
2. Hozz létre egy új feedet
3. Kattints a feedre
4. Adj hozzá egy új posztot
5. Kattints a posztra és tölts fel egy képet
6. Ha a kép feltöltődik és megjelenik → **Működik!** 🎉

