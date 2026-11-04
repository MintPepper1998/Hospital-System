# 🚀 Quick EMR Queue Seed - TL;DR

## One Command to Rule Them All

```bash
npx ts-node prisma/seed-queue.ts
```

**Then restart your dev server:**

```bash
npm run dev
```

---

## What You Get

✅ **1 Doctor** - Dr. Rajesh Kumar  
✅ **5 Patients** - Rahul, Priya, Amit, Sneha, Vikram  
✅ **5 Appointments** - TODAY (3 PENDING, 2 IN_PROGRESS)

---

## Test It

1. Navigate to: `/dashboard/clinical/emr`
2. See 5 appointments in the queue
3. Click "Start Consultation"
4. Fill the form
5. Add medicines (1-0-1, SOS, etc.)
6. Click "Save & Complete"
7. Print prescription

---

## Login as Doctor

```
Email: doctor.test@hospital.com
Password: doctor123
```

---

## The 5 Test Patients

| Patient | Age | Complaint | Time | Status |
|---------|-----|-----------|------|--------|
| Rahul Sharma | 35 | Fever & Cold | 09:00 | 🟠 PENDING |
| Priya Patel | 28 | Stomach Pain | 10:00 | 🟠 PENDING |
| Amit Verma | 42 | Diabetes Follow-up | 11:00 | 🟠 PENDING |
| Sneha Gupta | 31 | Severe Headache | 12:00 | 🔵 IN_PROGRESS |
| Vikram Singh | 50 | Health Checkup | 13:00 | 🔵 IN_PROGRESS |

---

## Troubleshooting

**Queue empty?**
- Restart dev server
- Check: `npx prisma studio`

**Email exists error?**
- Clear test data first
- Or modify script with new names

**Wrong date?**
- Script always uses TODAY
- Delete old appointments in Prisma Studio

---

## Clean Up (Optional)

To remove test data:

```bash
# Open Prisma Studio
npx prisma studio

# Delete users with email containing "@test.com"
# Delete patients with patientId starting with "PAT-TEST-"
# Delete their appointments
```

---

## Full Documentation

See `EMR-QUEUE-SEED-GUIDE.md` for complete guide.

---

**🎉 That's it! You're ready to test the EMR module!**
