/**
 * Canteen Module Seed Data
 * Run: npx ts-node prisma/seed-canteen.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🍽️ Seeding Canteen Module...")

  // ── Meal Slots ────────────────────────────
  const mealSlots = await Promise.all([
    prisma.canteenMealSlot.upsert({
      where: { code: "BF" },
      update: {},
      create: { name: "Breakfast", code: "BF", startTime: "07:00", endTime: "09:00", sortOrder: 1 },
    }),
    prisma.canteenMealSlot.upsert({
      where: { code: "LN" },
      update: {},
      create: { name: "Lunch", code: "LN", startTime: "12:00", endTime: "14:00", sortOrder: 2 },
    }),
    prisma.canteenMealSlot.upsert({
      where: { code: "ES" },
      update: {},
      create: { name: "Evening Snacks", code: "ES", startTime: "16:00", endTime: "17:30", sortOrder: 3 },
    }),
    prisma.canteenMealSlot.upsert({
      where: { code: "DN" },
      update: {},
      create: { name: "Dinner", code: "DN", startTime: "19:00", endTime: "21:00", sortOrder: 4 },
    }),
  ])
  console.log(`  ✅ ${mealSlots.length} meal slots`)

  // ── Diet Plans ────────────────────────────
  const dietPlans = await Promise.all([
    prisma.canteenDietPlan.upsert({
      where: { code: "NRM" },
      update: {},
      create: {
        name: "Normal", code: "NRM",
        description: "Standard balanced hospital diet with all food groups",
        calorieTarget: 2000,
      },
    }),
    prisma.canteenDietPlan.upsert({
      where: { code: "DIA" },
      update: {},
      create: {
        name: "Diabetic", code: "DIA",
        description: "Low-glycemic index diet for diabetic patients",
        restrictions: "No sugar, no white rice, limited carbohydrates, no sweetened beverages",
        calorieTarget: 1600,
      },
    }),
    prisma.canteenDietPlan.upsert({
      where: { code: "CAR" },
      update: {},
      create: {
        name: "Cardiac", code: "CAR",
        description: "Low-sodium, low-fat diet for cardiac patients",
        restrictions: "No salt, no fried food, no red meat, low-fat dairy only",
        calorieTarget: 1500,
      },
    }),
    prisma.canteenDietPlan.upsert({
      where: { code: "LIQ" },
      update: {},
      create: {
        name: "Liquid", code: "LIQ",
        description: "Clear and full liquid diet for post-operative patients",
        restrictions: "Only soups, juices, buttermilk, water, glucose water — no solid food",
        calorieTarget: 1000,
      },
    }),
    prisma.canteenDietPlan.upsert({
      where: { code: "SFT" },
      update: {},
      create: {
        name: "Soft Diet", code: "SFT",
        description: "Soft, easily digestible food for recovering patients",
        restrictions: "No raw vegetables, no fried food, no spicy food",
        calorieTarget: 1800,
      },
    }),
    prisma.canteenDietPlan.upsert({
      where: { code: "RNL" },
      update: {},
      create: {
        name: "Renal", code: "RNL",
        description: "Low-protein, low-potassium diet for kidney patients",
        restrictions: "Limited protein, no banana, no coconut water, no tomato, no spinach",
        calorieTarget: 1400,
      },
    }),
  ])
  console.log(`  ✅ ${dietPlans.length} diet plans`)

  // ── Menu Items (Indian Hospital Canteen) ──
  const items = [
    // Main Course
    { name: "Plain Rice", category: "VEG", subCategory: "Main Course", price: 30, ipdPrice: 20 },
    { name: "Jeera Rice", category: "VEG", subCategory: "Main Course", price: 50, ipdPrice: 35 },
    { name: "Roti (2 pcs)", category: "VEG", subCategory: "Main Course", price: 20, ipdPrice: 15 },
    { name: "Paratha", category: "VEG", subCategory: "Main Course", price: 30, ipdPrice: 25 },
    { name: "Khichdi", category: "VEG", subCategory: "Main Course", price: 40, ipdPrice: 30 },
    { name: "Curd Rice", category: "VEG", subCategory: "Main Course", price: 40, ipdPrice: 30 },
    { name: "Chicken Curry", category: "NON_VEG", subCategory: "Main Course", price: 80, ipdPrice: 60 },
    { name: "Egg Curry", category: "EGG", subCategory: "Main Course", price: 50, ipdPrice: 40 },

    // Side Dishes
    { name: "Dal Fry", category: "VEG", subCategory: "Side Dish", price: 40, ipdPrice: 30 },
    { name: "Mix Veg Sabzi", category: "VEG", subCategory: "Side Dish", price: 40, ipdPrice: 30 },
    { name: "Aloo Gobi", category: "VEG", subCategory: "Side Dish", price: 35, ipdPrice: 25 },
    { name: "Palak Paneer", category: "VEG", subCategory: "Side Dish", price: 60, ipdPrice: 45 },
    { name: "Raita", category: "VEG", subCategory: "Side Dish", price: 20, ipdPrice: 15 },
    { name: "Pickle & Papad", category: "VEG", subCategory: "Side Dish", price: 10, ipdPrice: 10 },
    { name: "Boiled Egg (2)", category: "EGG", subCategory: "Side Dish", price: 20, ipdPrice: 15 },

    // Soups
    { name: "Tomato Soup", category: "VEG", subCategory: "Soup", price: 30, ipdPrice: 20 },
    { name: "Sweet Corn Soup", category: "VEG", subCategory: "Soup", price: 40, ipdPrice: 30 },
    { name: "Chicken Soup", category: "NON_VEG", subCategory: "Soup", price: 50, ipdPrice: 40 },

    // Beverages
    { name: "Tea", category: "VEG", subCategory: "Beverage", price: 15, ipdPrice: 10 },
    { name: "Coffee", category: "VEG", subCategory: "Beverage", price: 20, ipdPrice: 15 },
    { name: "Buttermilk", category: "VEG", subCategory: "Beverage", price: 15, ipdPrice: 10 },
    { name: "Fresh Juice", category: "VEG", subCategory: "Beverage", price: 40, ipdPrice: 30 },
    { name: "Glucose Water", category: "VEG", subCategory: "Beverage", price: 10, ipdPrice: 10 },

    // Snacks
    { name: "Bread Toast", category: "VEG", subCategory: "Snack", price: 20, ipdPrice: 15 },
    { name: "Poha", category: "VEG", subCategory: "Snack", price: 25, ipdPrice: 20 },
    { name: "Upma", category: "VEG", subCategory: "Snack", price: 25, ipdPrice: 20 },
    { name: "Idli (3 pcs)", category: "VEG", subCategory: "Snack", price: 30, ipdPrice: 20 },
    { name: "Biscuit Pack", category: "VEG", subCategory: "Snack", price: 15, ipdPrice: 10 },

    // Desserts
    { name: "Kheer", category: "VEG", subCategory: "Dessert", price: 30, ipdPrice: 25 },
    { name: "Fruit Plate", category: "VEG", subCategory: "Dessert", price: 40, ipdPrice: 30 },
  ]

  let created = 0
  for (const item of items) {
    try {
      await prisma.canteenMenuItem.upsert({
        where: { id: `seed-${item.name.replace(/\s/g, "-").toLowerCase()}` },
        update: {},
        create: {
          name: item.name,
          category: item.category as any,
          subCategory: item.subCategory,
          price: item.price,
          ipdPrice: item.ipdPrice,
        },
      })
      created++
    } catch {
      // Might already exist, skip
      await prisma.canteenMenuItem.create({
        data: {
          name: item.name,
          category: item.category as any,
          subCategory: item.subCategory,
          price: item.price,
          ipdPrice: item.ipdPrice,
        },
      }).catch(() => {}) // duplicate, skip
    }
  }
  console.log(`  ✅ ${created} menu items`)

  // ── Canteen Inventory Items ───────────────
  const inventoryItems = [
    { name: "Basmati Rice", category: "Grains", unit: "kg", minStockLevel: 50, costPerUnit: 80 },
    { name: "Toor Dal", category: "Grains", unit: "kg", minStockLevel: 20, costPerUnit: 120 },
    { name: "Atta (Wheat Flour)", category: "Grains", unit: "kg", minStockLevel: 30, costPerUnit: 40 },
    { name: "Cooking Oil", category: "Oil & Fats", unit: "ltr", minStockLevel: 20, costPerUnit: 150 },
    { name: "Ghee", category: "Oil & Fats", unit: "kg", minStockLevel: 5, costPerUnit: 500 },
    { name: "Sugar", category: "Other", unit: "kg", minStockLevel: 10, costPerUnit: 45 },
    { name: "Salt", category: "Spices", unit: "kg", minStockLevel: 5, costPerUnit: 20 },
    { name: "Turmeric Powder", category: "Spices", unit: "kg", minStockLevel: 2, costPerUnit: 200 },
    { name: "Chilli Powder", category: "Spices", unit: "kg", minStockLevel: 2, costPerUnit: 250 },
    { name: "Curd", category: "Dairy", unit: "ltr", minStockLevel: 10, costPerUnit: 60 },
    { name: "Milk", category: "Dairy", unit: "ltr", minStockLevel: 20, costPerUnit: 55 },
    { name: "Tea Powder", category: "Beverages", unit: "kg", minStockLevel: 3, costPerUnit: 350 },
    { name: "Onion", category: "Vegetables", unit: "kg", minStockLevel: 20, costPerUnit: 30 },
    { name: "Potato", category: "Vegetables", unit: "kg", minStockLevel: 20, costPerUnit: 25 },
    { name: "Tomato", category: "Vegetables", unit: "kg", minStockLevel: 10, costPerUnit: 35 },
  ]

  let invCreated = 0
  for (const inv of inventoryItems) {
    try {
      await prisma.canteenInventoryItem.create({
        data: {
          name: inv.name,
          category: inv.category,
          unit: inv.unit,
          minStockLevel: inv.minStockLevel,
          costPerUnit: inv.costPerUnit,
          currentStock: inv.minStockLevel * 2, // Start with 2× minimum
        },
      })
      invCreated++
    } catch {
      // Duplicate, skip
    }
  }
  console.log(`  ✅ ${invCreated} inventory items`)

  // ── Set Today's Menu ──────────────────────
  const allMenuItems = await prisma.canteenMenuItem.findMany({ where: { isActive: true } })
  const allSlots = await prisma.canteenMealSlot.findMany({ where: { isActive: true } })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let menuAssignments = 0
  for (const slot of allSlots) {
    // Assign relevant items to each slot
    const slotItems = allMenuItems.filter((mi) => {
      if (slot.code === "BF") return ["Snack", "Beverage"].includes(mi.subCategory || "")
      if (slot.code === "LN" || slot.code === "DN") return ["Main Course", "Side Dish", "Dessert", "Beverage", "Soup"].includes(mi.subCategory || "")
      if (slot.code === "ES") return ["Snack", "Beverage"].includes(mi.subCategory || "")
      return false
    })

    for (const mi of slotItems) {
      try {
        await prisma.canteenDailyMenu.create({
          data: { date: today, mealSlotId: slot.id, menuItemId: mi.id },
        })
        menuAssignments++
      } catch {
        // Duplicate, skip
      }
    }
  }
  console.log(`  ✅ ${menuAssignments} daily menu assignments for today`)

  console.log("\n🎉 Canteen module seeding complete!")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
