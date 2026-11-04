# 🏥 OT Module - Quick Reference Card

## 🚀 Getting Started (First Time Setup)

```bash
# 1. Database migration (if not done)
npx prisma db push

# 2. Seed sample theaters
npx tsx scripts/seed-ot-theaters.ts

# 3. Start dev server
npm run dev

# 4. Navigate to: http://localhost:3000/dashboard/clinical/ot
```

---

## 📋 Common Tasks

### **Schedule a Surgery**
1. Click **"Schedule Surgery"** button
2. Search patient → Select
3. Search surgeon → Select
4. Choose theater from dropdown
5. Fill: Procedure, Date/Time, Duration
6. Submit

### **Update PAC Status**
1. Find surgery in schedule
2. Click **"Manage"**
3. Go to **PAC Status** tab
4. Select: FIT / UNFIT / CONDITIONAL / PENDING
5. Add notes
6. Submit

### **Start Surgery**
1. Click **"Manage"**
2. Go to **Surgery Status** tab
3. Change to **"In Progress"**
4. Submit (will fail if PAC is UNFIT)

### **Complete Surgery**
1. Click **"Manage"**
2. Change status to **"Completed"**
3. Add notes (optional)
4. Submit

---

## 🎨 Status Colors

| Color | Meaning |
|-------|---------|
| 🟢 Green | Available |
| 🔴 Red | In Use |
| 🟡 Yellow | Scheduled |
| ⚫ Gray | Maintenance |

---

## ⚠️ Important Rules

1. **Cannot start surgery if PAC is UNFIT** (hard block)
2. **Cannot double-book a theater** (conflict detection)
3. **Emergency surgeries** show red badge
4. **Actual times** auto-recorded when status changes

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database models |
| `lib/actions.ts` | Server actions (lines 2119+) |
| `app/dashboard/clinical/ot/page.tsx` | Main dashboard |
| `components/ot/schedule-surgery-dialog.tsx` | Booking form |
| `scripts/seed-ot-theaters.ts` | Sample data |

---

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Theater already booked" | Choose different time/theater |
| "Cannot start - PAC UNFIT" | Update PAC to FIT first |
| Patient not found | Ensure patient exists and isActive=true |
| Doctor not found | Ensure role=DOCTOR and isActive=true |

---

## 📊 Sample Theaters (After Seeding)

1. **Main OT 1** - Major (General Surgery)
2. **Main OT 2** - Major (Orthopedic)
3. **Minor OT** - Minor procedures
4. **Cath Lab** - Cardiac procedures
5. **Emergency OT** - 24/7 trauma

---

## 🎯 Workflow Summary

```
Schedule → PAC Check → Start → Complete
  ↓          ↓          ↓         ↓
SCHEDULED  FIT/UNFIT  IN_PROG  COMPLETED
```

---

**For detailed guide**: See `OT-MODULE-GUIDE.md`  
**For implementation details**: See `OT-MODULE-IMPLEMENTATION-SUMMARY.md`
