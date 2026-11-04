# 🔧 Fix: Prisma Client Windows File Lock Error

## 🐛 Problem

**Error:** `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`

**Root Cause:** The dev server is running and has locked the Prisma client files in `node_modules/.prisma/client/`

---

## ✅ Solution

### **Step-by-Step Fix:**

1. **Stop the Dev Server:**
   - Go to the terminal running `npm run dev`
   - Press `Ctrl + C` to stop it
   - Wait for it to fully stop

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```
   - This should now work without the EPERM error

3. **Restart Dev Server:**
   ```bash
   npm run dev
   ```

---

## 🎯 Why This Happens

Windows locks `.dll` and `.node` files when they're in use. The dev server loads these files, preventing Prisma from updating them.

---

## ✅ Quick Fix (Copy-Paste)

```bash
# In your terminal with the running dev server:
# Press Ctrl+C to stop

# Then run:
npx prisma generate

# Then restart:
npm run dev
```

---

## 🔍 Verification

After restarting the dev server:

1. Navigate to: `/dashboard/clinical/emr`
2. ✅ Page should load without "Unknown argument 'appointmentDate'" error
3. ✅ Appointments should display

---

## 📝 Important Notes

- **The schema is correct:** `appointmentDate` is the right field name (line 303 in schema.prisma)
- **The error is NOT about the field name** - it's about the Prisma client being locked
- **Always stop the dev server** before running `npx prisma generate` on Windows

---

## 🚨 If Still Not Working

If you still get the error after following the above:

### **Nuclear Option (Windows):**

1. **Stop dev server** (Ctrl+C)
2. **Close all terminals**
3. **Delete the Prisma client folder:**
   ```bash
   rmdir /s /q node_modules\.prisma
   ```
4. **Regenerate:**
   ```bash
   npx prisma generate
   ```
5. **Restart:**
   ```bash
   npm run dev
   ```

---

## ✅ Summary

**Problem:** Windows file lock preventing Prisma client update

**Solution:** Stop dev server → `npx prisma generate` → Restart server

**Field name is correct:** `appointmentDate` ✅

---

**Quick command:**
```bash
# Stop server (Ctrl+C), then:
npx prisma generate && npm run dev
```
