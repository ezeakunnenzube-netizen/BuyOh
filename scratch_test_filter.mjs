import { products } from './src/data/productData.js';

// Let's test the filtering logic in Home.jsx with the user's listings!
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfylhjtgqeupspxgpwyk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxoanRncWV1cHNweGdwd3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mzg3MDIsImV4cCI6MjEwMzMxNDcwMn0.4yjz5o-lBN5VV46Z6nKS-UyY40bHJr4pxHDYACIZJWU';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: dbProfile } = await supabase.from('profiles').select('*').single();
  const user = { id: dbProfile.id, email: dbProfile.email };
  
  const defaultPlaceholder = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";
  const userListings = dbProfile.my_listings || [];
  
  const cleanedListings = userListings.map(item => {
    let img = item.image;
    if (!img || img.startsWith('blob:')) img = defaultPlaceholder;
    let imgs = Array.isArray(item.images) ? item.images.map(u => (!u || u.startsWith('blob:')) ? defaultPlaceholder : u) : [img];
    return { ...item, image: img, images: imgs };
  });

  const pool = [...cleanedListings, ...products];
  console.log('Total pool items:', pool.length);

  // Now run Home.jsx filter:
  const GHANA_REGIONS = [
    { name: 'Greater Accra Region' }
  ];
  const searchQuery = '';
  const selectedCountry = 'all';
  const selectedRegion = 'All Locations';
  const activeCategory = 'All';
  const activeSubcategory = '';
  const minPrice = '';
  const maxPrice = '';

  for (let i = 0; i < pool.length; i++) {
    const product = pool[i];
    try {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.subcategory || '').toLowerCase().includes(searchQuery.toLowerCase());

      const pLoc = (product.location || '').toLowerCase();
      const pCtry = (product.country || '').toLowerCase();
      const isGhanaProduct =
        pCtry === 'ghana' ||
        product.currency === 'GHS' ||
        pLoc.includes('ghana') ||
        pLoc.includes('accra') ||
        GHANA_REGIONS.some(r => pLoc.includes(r.name.toLowerCase().replace('region', '').trim()));

      let matchesCountry = true;
      if (selectedCountry === 'nigeria') {
        matchesCountry = !isGhanaProduct;
      } else if (selectedCountry === 'ghana') {
        matchesCountry = isGhanaProduct;
      }

      let matchesRegion = true;
      if (selectedRegion === 'All Locations') {
        matchesRegion = true;
      }

      let matchesCategory = true;
      const matchesPrice = true;
      const res = matchesSearch && matchesCountry && matchesRegion && matchesCategory && matchesPrice;
    } catch (err) {
      console.error(`ERROR on product ${i} (${product?.id}):`, err);
    }
  }
  console.log('Filter finished successfully!');
}

test().catch(console.error);
