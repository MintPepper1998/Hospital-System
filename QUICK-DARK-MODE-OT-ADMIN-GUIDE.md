# Quick Reference: Dark Mode & OT Admin Management

## 🌓 Dark Mode Features

### How to Toggle Theme:
1. Look for the **Sun/Moon icon** button in the top-right header
2. Click to open theme menu
3. Select:
   - ☀️ **Light** - Bright theme
   - 🌙 **Dark** - Dark theme
   - 💻 **System** - Auto-match OS preference

### Fixed Dark Mode Issues:
- ✅ OT Surgery Scheduler - Patient/Doctor selection now visible
- ✅ All search dropdowns have proper contrast
- ✅ All new admin components support dark mode

---

## 🏥 Admin Theater Management

### Quick Access:
**Dashboard → Admin → Theaters**

### Three Main Actions:

#### 1️⃣ Add New Theater
1. Click **"Add New Theater"** button
2. Enter theater name (e.g., "Main OT", "Cardiac OT 2")
3. Select type: Major / Minor / Emergency / Cardiac / Neuro / Orthopedic
4. Toggle operational status (ON = Active, OFF = Maintenance)
5. Click **"Create Theater"**

#### 2️⃣ Edit Theater
1. Find theater in table
2. Click the **three dots (⋮)** menu
3. Select **"Edit"**
4. Modify fields
5. Click **"Update Theater"**

#### 3️⃣ Delete Theater
1. Find theater in table
2. Click the **three dots (⋮)** menu
3. Select **"Delete"**
4. Confirm deletion
5. ⚠️ **Cannot delete** if active/scheduled surgeries exist

---

## 📊 Theater Status

### Operational (Green Badge)
- Theater is active and available for scheduling
- Can be selected when scheduling surgeries

### Maintenance (Yellow Badge)
- Theater is temporarily unavailable
- Cannot be selected for new surgeries
- Existing scheduled surgeries are not affected

---

## 🎨 Color-Coded Theater Types

| Type | Color | Use Case |
|------|-------|----------|
| **MAJOR** | 🔴 Red | Complex surgeries, long procedures |
| **MINOR** | 🔵 Blue | Simple procedures, short duration |
| **EMERGENCY** | 🟠 Orange | Emergency cases, 24/7 ready |
| **CARDIAC** | 🟣 Purple | Heart surgeries, specialized equipment |
| **NEURO** | 🩵 Cyan | Brain/nerve surgeries |
| **ORTHOPEDIC** | 🟢 Green | Bone/joint surgeries |

---

## ⚠️ Important Notes

### Delete Protection:
- You **cannot** delete a theater if it has:
  - Scheduled surgeries (Status: SCHEDULED)
  - Ongoing surgeries (Status: IN_PROGRESS)
- System will show error: *"Cannot delete theater with X active/scheduled surgeries"*
- **Solution**: Cancel or complete all surgeries first, then delete

### Operational Status:
- Toggling to "Maintenance" does **NOT** cancel existing surgeries
- It only prevents **new** surgeries from being scheduled
- Use this for planned maintenance or repairs

---

## 🔑 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Theme | Click sun/moon icon (top-right) |
| Add Theater | Click "Add New Theater" button |
| Save Form | Enter key (when in dialog) |
| Cancel Dialog | Escape key |

---

## 📱 Responsive Design

All pages work perfectly on:
- ✅ Desktop (1920x1080+)
- ✅ Laptop (1366x768+)
- ✅ Tablet (768x1024+)
- ✅ Mobile (375x667+)

---

## 🐛 Troubleshooting

### Issue: "Can't see selected patient/doctor in OT scheduler"
**Solution**: ✅ FIXED! Dark mode now shows proper contrast.

### Issue: "Theme button not visible"
**Location**: Top-right corner of dashboard header, next to "Hospital Management System" title.

### Issue: "Cannot delete theater"
**Reason**: Active or scheduled surgeries exist. Check the OT schedule first.

### Issue: "Theater page shows 404"
**Solution**: Clear browser cache and restart dev server.

---

## 📚 Related Documentation

- **Main Implementation**: `DARK-MODE-OT-ADMIN-IMPLEMENTATION.md`
- **OT Module Guide**: `OT-MODULE-GUIDE.md`
- **Dark Mode Setup**: Theme system using `next-themes`

---

**Last Updated**: 2026-01-24
**Status**: ✅ All features implemented and tested
