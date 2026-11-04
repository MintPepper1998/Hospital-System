# 🔧 FIX: Prisma Client Sync Error on Windows

## 🚨 The Problem

You're seeing this error:
```
Runtime PrismaClientValidationError
Invalid `prisma.appointment.findMany()` invocation
```

**Root Cause:** The Prisma client code is **out of sync** with your schema. Even though `prisma/schema.prisma` has the correct field (`appointmentDate`), the generated Prisma client in `node_modules/.prisma` is stale.

**Why It Happens on Windows:** The dev server (`npm run dev`) locks the Prisma client DLL files, preventing `npx prisma generate` from updating them. This is a known Windows-specific file locking issue.

---

## ✅ Solution: Use the Automated Fix Script

### **Option A: Batch Script (Easiest)**

1. **Stop your dev server** (in terminal, press `Ctrl+C`)

2. **Run the fix script:**
   ```cmd
   fix-prisma.bat
   ```

3. **Start dev server:**
   ```cmd
   npm run dev
   ```

4. **Refresh browser:** Navigate to `/dashboard/clinical/emr`

---

### **Option B: PowerShell Script**

1. **Stop your dev server** (press `Ctrl+C`)

2. **Run PowerShell as Administrator** (right-click → Run as Administrator)

3. **Navigate to your project:**
   ```powershell
   cd C:\hospital-erp
   ```

4. **Run the fix script:**
   ```powershell
   .\fix-prisma.ps1
   ```

5. **Start dev server:**
   ```cmd
   npm run dev
   ```

---

### **Option C: Manual Steps (If Scripts Don't Work)**

#### **Step 1: Stop EVERYTHING**

1. In your terminal, press `Ctrl+C` to stop the dev server
2. Close your terminal completely
3. Open **Task Manager** (`Ctrl+Shift+Esc`)
4. Go to **Details** tab
5. Find and **End Task** for any `node.exe` processes

#### **Step 2: Clean Prisma Client**

Open a **new terminal** and run:

```cmd
rmdir /s /q node_modules\.prisma
```

If you get "Access Denied", restart your computer and try again.

#### **Step 3: Regenerate Prisma Client**

```cmd
npx prisma generate
```

**If you see EPERM error:**
- Restart your computer
- Don't start the dev server
- Run `npx prisma generate` immediately after booting
- Then start `npm run dev`

#### **Step 4: Restart Dev Server**

```cmd
npm run dev
```

Wait for compilation to finish (look for "✓ Compiled" message).

#### **Step 5: Test**

1. Refresh your browser
2. Navigate to `/dashboard/clinical/emr`
3. ✅ Error should be gone!

---

## 🔍 Verification

After running the fix, check:

1. **Terminal output** should show:
   ```
   ✔ Generated Prisma Client (x.x.x) to .\node_modules\@prisma\client
   ```

2. **Browser** should load `/dashboard/clinical/emr` without errors

3. **Console** (F12) should have no Prisma errors

---

## 🚨 If Still Not Working

### **Nuclear Option: Full Reinstall**

1. **Stop dev server** (`Ctrl+C`)

2. **Delete everything:**
   ```cmd
   rmdir /s /q node_modules
   rmdir /s /q .next
   del package-lock.json
   ```

3. **Fresh install:**
   ```cmd
   npm install
   ```

4. **Generate Prisma:**
   ```cmd
   npx prisma generate
   ```

5. **Start dev:**
   ```cmd
   npm run dev
   ```

---

## 🧪 Test Case: Verify It Works

1. Navigate to `/dashboard/clinical/emr`
2. Check that the page loads with:
   - ✅ Stats cards (Waiting, In Progress, Completed)
   - ✅ Appointments table
   - ✅ Color-coded status badges
   - ✅ No console errors
   - ✅ No error overlay

---

## 📊 Technical Details

### **What `npx prisma generate` Does:**

1. Reads `prisma/schema.prisma`
2. Generates TypeScript types in `node_modules/@prisma/client`
3. Generates query engine DLLs in `node_modules/.prisma`
4. Creates type-safe client with exact field names

### **Why It Gets Out of Sync:**

- You edit `schema.prisma`
- You run `npx prisma db push` (updates database)
- But `generate` doesn't run automatically
- Or dev server locks the files and prevents update

### **The Windows File Lock Problem:**

```
node.exe (dev server)
    ↓ locks
node_modules\.prisma\client\query_engine-windows.dll.node
    ↓ prevents
npx prisma generate (cannot update locked file)
    ↓ result
Stale Prisma client with old schema
```

**Solution:** Stop dev server → Clean → Regenerate → Restart

---

## 🎯 Prevention: Add to package.json

To automatically generate after schema changes:

```json
{
  "scripts": {
    "dev": "npm run prisma:generate && next dev --turbopack",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push && prisma generate",
    "prisma:studio": "prisma studio"
  }
}
```

Now `npm run dev` will always regenerate the client first!

---

## ✅ Expected Result

**Before:**
```
❌ PrismaClientValidationError: Unknown argument 'appointmentDate'
❌ nextjs-portal error overlay
❌ Page doesn't load
```

**After:**
```
✅ Page loads instantly
✅ Clean dashboard
✅ All data visible
✅ Zero errors
```

---

## 📝 Related Files

- `prisma/schema.prisma` - The source of truth (Line 303: `appointmentDate DateTime`)
- `node_modules/.prisma/` - Generated client (gets out of sync)
- `node_modules/@prisma/client/` - TypeScript types
- `app/dashboard/clinical/emr/page.tsx` - Uses the client

---

## 🆘 Still Having Issues?

1. **Check Node version:** `node --version` (should be 18+)
2. **Check Prisma version:** `npx prisma --version`
3. **Check Windows version:** Should be Windows 10/11
4. **Try running as Administrator**
5. **Check antivirus** isn't blocking file operations
6. **Try in WSL2** (Windows Subsystem for Linux) - no file locking issues there!

---

**Last Updated:** January 25, 2026  
**Issue:** Prisma Client Sync on Windows  
**Status:** ✅ Automated fix scripts provided  
**Priority:** Critical

---

**Quick Command Reference:**

```cmd
# Stop server (Ctrl+C in terminal)
# Clean
rmdir /s /q node_modules\.prisma

# Regenerate
npx prisma generate

# Restart
npm run dev
```

**That's it! Your EMR page should work now! 🎉**
