import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ==================== Restaurant ====================
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'kafe-nusantara' },
    update: {},
    create: {
      name: 'Kafe Nusantara',
      slug: 'kafe-nusantara',
      address: 'Jl. Sudirman No. 123, Jakarta Pusat',
      phone: '+62 21 1234 5678',
      email: 'hello@kafenusantara.id',
      description: 'Merasakan cita rasa nusantara dalam suasana modern yang nyaman.',
      openHours: 'Senin–Minggu, 08.00–22.00 WIB',
      taxPercentage: 10,
      serviceCharge: 5,
      primaryColor: '#1A1A1A',
      accentColor: '#D9A441',
    },
  });

  console.log('✅ Restaurant created:', restaurant.name);

  // ==================== Users ====================
  const adminPassword = await bcrypt.hash('admin123', 12);
  const kasirPassword = await bcrypt.hash('kasir123', 12);
  const chefPassword = await bcrypt.hash('chef123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@kafenusantara.id' },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Admin Kafe',
      email: 'admin@kafenusantara.id',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });

  const kasir = await prisma.user.upsert({
    where: { email: 'kasir@kafenusantara.id' },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Kasir Satu',
      email: 'kasir@kafenusantara.id',
      passwordHash: kasirPassword,
      role: 'kasir',
    },
  });

  const chef = await prisma.user.upsert({
    where: { email: 'chef@kafenusantara.id' },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Chef Budi',
      email: 'chef@kafenusantara.id',
      passwordHash: chefPassword,
      role: 'chef',
    },
  });

  console.log('✅ Users created:', [admin.email, kasir.email, chef.email]);

  // ==================== Tables ====================
  const tableNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', 'VIP-1', 'VIP-2'];
  for (const num of tableNumbers) {
    await prisma.table.upsert({
      where: { restaurantId_tableNumber: { restaurantId: restaurant.id, tableNumber: num } },
      update: {},
      create: {
        restaurantId: restaurant.id,
        tableNumber: num,
        label: num.startsWith('VIP') ? `Meja ${num}` : `Meja ${num}`,
        capacity: num.startsWith('VIP') ? 8 : 4,
      },
    });
  }

  console.log('✅ Tables created:', tableNumbers.length);

  // ==================== Categories ====================
  const categories = [
    { name: 'Makanan Utama', slug: 'makanan-utama', sortOrder: 1 },
    { name: 'Minuman', slug: 'minuman', sortOrder: 2 },
    { name: 'Snack & Cemilan', slug: 'snack-cemilan', sortOrder: 3 },
    { name: 'Dessert', slug: 'dessert', sortOrder: 4 },
    { name: 'Promo', slug: 'promo', sortOrder: 5 },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { restaurantId_slug: { restaurantId: restaurant.id, slug: cat.slug } },
      update: {},
      create: { restaurantId: restaurant.id, ...cat },
    });
    createdCategories[cat.slug] = created.id;
  }

  console.log('✅ Categories created:', categories.length);

  // ==================== Expense Categories ====================
  const expenseCategories = ['Bahan Baku', 'Operasional Harian', 'Gaji Karyawan', 'Listrik & Air', 'Sewa Tempat', 'Pemasaran', 'Lain-lain'];
  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { restaurantId_name: { restaurantId: restaurant.id, name } },
      update: {},
      create: { restaurantId: restaurant.id, name },
    });
  }
  console.log('✅ Expense Categories created:', expenseCategories.length);

  // ==================== Menu Items ====================
  const menuItems = [
    // Makanan Utama
    {
      categoryId: createdCategories['makanan-utama'],
      name: 'Nasi Goreng Kampung Spesial',
      slug: 'nasi-goreng-kampung-spesial',
      description: 'Nasi goreng dengan bumbu kampung asli, dilengkapi telur ceplok, ayam suwir, dan kerupuk renyah.',
      price: 32000,
      imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80',
      isBestSeller: true,
      isSpicy: true,
      allergenInfo: 'Mengandung telur, kedelai',
      variants: [
        {
          name: 'Level Pedas',
          options: [
            { label: 'Tidak Pedas', additionalPrice: 0 },
            { label: 'Pedas Sedang', additionalPrice: 0 },
            { label: 'Extra Pedas', additionalPrice: 2000 },
          ],
        },
      ],
    },
    {
      categoryId: createdCategories['makanan-utama'],
      name: 'Mie Ayam Bakso Original',
      slug: 'mie-ayam-bakso-original',
      description: 'Mie ayam dengan topping bakso sapi homemade, pangsit goreng, dan kuah kaldu gurih.',
      price: 28000,
      imageUrl: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&q=80',
      isBestSeller: false,
      isSpicy: false,
      isAvailable: false,
    },
    {
      categoryId: createdCategories['makanan-utama'],
      name: 'Ayam Bakar Madu Nusantara',
      slug: 'ayam-bakar-madu-nusantara',
      description: 'Ayam kampung bakar dengan marinasi madu dan rempah pilihan, disajikan dengan lalapan segar.',
      price: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&q=80',
      isBestSeller: true,
      isSpicy: false,
      variants: [
        {
          name: 'Bagian Ayam',
          options: [
            { label: 'Paha', additionalPrice: 0 },
            { label: 'Dada', additionalPrice: 0 },
            { label: 'Sayap', additionalPrice: -5000 },
          ],
        },
      ],
    },
    {
      categoryId: createdCategories['makanan-utama'],
      name: 'Soto Betawi Santan',
      slug: 'soto-betawi-santan',
      description: 'Soto betawi kuah santan kental dengan daging sapi, kentang, tomat, dan emping melinjo.',
      price: 38000,
      imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80',
      isBestSeller: false,
      isSpicy: false,
    },
    {
      categoryId: createdCategories['makanan-utama'],
      name: 'Gado-Gado Betawi',
      slug: 'gado-gado-betawi',
      description: 'Sayuran segar rebus dengan bumbu kacang khas betawi, kerupuk, dan telur rebus.',
      price: 25000,
      imageUrl: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=800&q=80',
      isBestSeller: false,
      isSpicy: false,
      allergenInfo: 'Mengandung kacang',
    },
    // Minuman
    {
      categoryId: createdCategories['minuman'],
      name: 'Es Teh Manis Jumbo',
      slug: 'es-teh-manis-jumbo',
      description: 'Teh manis dingin yang menyegarkan dalam ukuran jumbo, sempurna menemani makan siang.',
      price: 8000,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80',
      isBestSeller: true,
      isSpicy: false,
    },
    {
      categoryId: createdCategories['minuman'],
      name: 'Kopi Susu Gula Aren',
      slug: 'kopi-susu-gula-aren',
      description: 'Kopi arabika lokal dengan susu segar dan gula aren asli, creamy dan harum.',
      price: 22000,
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80',
      isBestSeller: true,
      isSpicy: false,
      variants: [
        {
          name: 'Suhu',
          options: [
            { label: 'Es (Cold)', additionalPrice: 0 },
            { label: 'Panas (Hot)', additionalPrice: 0 },
          ],
        },
        {
          name: 'Ukuran',
          options: [
            { label: 'Regular (250ml)', additionalPrice: 0 },
            { label: 'Large (350ml)', additionalPrice: 5000 },
          ],
        },
      ],
    },
    {
      categoryId: createdCategories['minuman'],
      name: 'Jus Alpukat Coklat',
      slug: 'jus-alpukat-coklat',
      description: 'Jus alpukat segar dengan topping coklat cair DCC, creamy dan mengenyangkan.',
      price: 18000,
      imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&q=80',
      isBestSeller: false,
      isSpicy: false,
    },
    {
      categoryId: createdCategories['minuman'],
      name: 'Es Jeruk Peras Segar',
      slug: 'es-jeruk-peras-segar',
      description: 'Jeruk segar diperas langsung, tanpa tambahan sirup — murni alami dan vitamin C tinggi.',
      price: 12000,
      imageUrl: 'https://images.unsplash.com/photo-1585158531085-ebe00d9d5b80?w=800&q=80',
      isBestSeller: false,
      isSpicy: false,
    },
    // Snack
    {
      categoryId: createdCategories['snack-cemilan'],
      name: 'Pisang Goreng Crispy',
      slug: 'pisang-goreng-crispy',
      description: 'Pisang kepok goreng dengan lapisan crispy renyah, disajikan dengan topping keju dan coklat.',
      price: 15000,
      imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800&q=80',
      isBestSeller: false,
      isSpicy: false,
      variants: [
        {
          name: 'Topping',
          options: [
            { label: 'Original', additionalPrice: 0 },
            { label: 'Keju', additionalPrice: 3000 },
            { label: 'Coklat', additionalPrice: 3000 },
            { label: 'Keju + Coklat', additionalPrice: 5000 },
          ],
        },
      ],
    },
    {
      categoryId: createdCategories['snack-cemilan'],
      name: 'Singkong Keju Balado',
      slug: 'singkong-keju-balado',
      description: 'Singkong rebus goreng dengan taburan keju dan bumbu balado pedas manis.',
      price: 18000,
      imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80',
      isBestSeller: false,
      isSpicy: true,
    },
    // Dessert
    {
      categoryId: createdCategories['dessert'],
      name: 'Es Campur Nusantara',
      slug: 'es-campur-nusantara',
      description: 'Es campur dengan isian kolang-kaling, nangka, cincau, alpukat, dan es serut sirop merah.',
      price: 20000,
      imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80',
      isBestSeller: false,
      isSpicy: false,
    },
    {
      categoryId: createdCategories['dessert'],
      name: 'Klepon Pandan Isi Gula Merah',
      slug: 'klepon-pandan',
      description: 'Klepon tradisional berbahan daun pandan alami, isi gula merah leleh, balur kelapa parut segar.',
      price: 14000,
      imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80',
      isBestSeller: false,
      isSpicy: false,
    },
  ];

  for (const item of menuItems) {
    const dataToSave = {
      ...item,
      variants: item.variants ? JSON.stringify(item.variants) : null,
    };
    await prisma.menuItem.upsert({
      where: { restaurantId_slug: { restaurantId: restaurant.id, slug: item.slug } },
      update: { ...dataToSave },
      create: { restaurantId: restaurant.id, ...dataToSave },
    });
  }

  console.log('✅ Menu items created:', menuItems.length);

  // ==================== Promotions ====================
  const promotions = [
    {
      name: 'Diskon Kemerdekaan 17%',
      description: 'Diskon 17% untuk merayakan kemerdekaan (Min. order 50rb)',
      discountType: 'PERCENT',
      discountValue: 17,
      minOrderAmount: 50000,
      isActive: true,
    },
    {
      name: 'Potongan Harga 10K',
      description: 'Potongan langsung Rp 10.000 tanpa minimal belanja',
      discountType: 'FIXED',
      discountValue: 10000,
      minOrderAmount: 0,
      isActive: true,
    },
    {
      name: 'Promo Makan Keluarga',
      description: 'Diskon 20% khusus transaksi besar (Min. order 200rb)',
      discountType: 'PERCENT',
      discountValue: 20,
      minOrderAmount: 200000,
      isActive: true,
    },
  ];

  // Hapus promo lama agar tidak duplikat saat di-seed ulang
  await prisma.promotion.deleteMany({ where: { restaurantId: restaurant.id } });
  
  for (const promo of promotions) {
    await prisma.promotion.create({
      data: { restaurantId: restaurant.id, ...promo },
    });
  }
  
  console.log('✅ Promotions created:', promotions.length);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin  : admin@kafenusantara.id / admin123');
  console.log('  Kasir  : kasir@kafenusantara.id / kasir123');
  console.log('  Chef   : chef@kafenusantara.id  / chef123');
  console.log('\n🌐 Demo Restaurant: Kafe Nusantara (slug: kafe-nusantara)');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
