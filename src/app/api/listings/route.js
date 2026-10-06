import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '../../../lib/serverSupabase';

/**
 * GET /api/listings
 * Search, filter, and paginate marketplace listings (Jiji-style discovery engine)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';
    const subcategory = searchParams.get('subcategory')?.trim() || '';
    const condition = searchParams.get('condition')?.trim() || '';
    const location = searchParams.get('location')?.trim() || '';
    const sellerId = searchParams.get('sellerId')?.trim() || '';
    const minPrice = parseFloat(searchParams.get('minPrice')) || 0;
    const maxPrice = parseFloat(searchParams.get('maxPrice')) || null;
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const supabase = createAdminSupabase();

    // Query builder
    let query = supabase
      .from('listings')
      .select(`
        id, seller_id, title, description, price, negotiable, 
        category_slug, subcategory_slug, condition, location, state, 
        status, views_count, phone_reveals_count, created_at, updated_at,
        profiles:seller_id (id, full_name, name, phone, avatar_url, verified, average_rating, review_count, created_at),
        listing_images (id, image_url, position, is_cover)
      `, { count: 'exact' });

    // Status filter
    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    } else {
      query = query.eq('status', 'active');
    }

    // Full text search / title search
    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`);
    }

    // Category / Subcategory
    if (category && category !== 'all') {
      query = query.eq('category_slug', category);
    }
    if (subcategory) {
      query = query.eq('subcategory_slug', subcategory);
    }

    // Condition (Brand New, Used)
    if (condition && condition !== 'all') {
      query = query.eq('condition', condition);
    }

    // Location
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    // Price range
    if (minPrice > 0) {
      query = query.gte('price', minPrice);
    }
    if (maxPrice && maxPrice > minPrice) {
      query = query.lte('price', maxPrice);
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'popular':
        query = query.order('views_count', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.warn('Listing query notice (using fallback handler if table pending):', error.message);
      return NextResponse.json({
        success: true,
        page,
        limit,
        total: 0,
        totalPages: 0,
        data: []
      });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      page,
      limit,
      total: count || 0,
      totalPages,
      data: data || []
    });
  } catch (err) {
    console.error('GET /api/listings error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/listings
 * Publish a new advert with media and automated confirmation notification
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    const body = await request.json();

    const {
      title,
      description,
      price,
      negotiable = true,
      category,
      subcategory,
      condition,
      location,
      sellerId,
      images = [],
      phone
    } = body;

    // Strict validation
    if (!title || !price || !category || !location || !sellerId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required listing fields: title, price, category, location, sellerId are mandatory.'
      }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // 1. Ensure seller profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, phone')
      .eq('id', sellerId)
      .maybeSingle();

    if (!profile) {
      await supabase.from('profiles').upsert({
        id: sellerId,
        phone: phone || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }

    // 2. Insert Listing
    const newListingPayload = {
      seller_id: sellerId,
      title: title.trim(),
      description: description || '',
      price: parseFloat(price) || 0,
      negotiable: Boolean(negotiable),
      category_slug: category,
      subcategory_slug: subcategory || category,
      condition: condition || null,
      location: location.trim(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdListing, error: listingError } = await supabase
      .from('listings')
      .insert(newListingPayload)
      .select()
      .single();

    if (listingError) {
      throw listingError;
    }

    // 3. Insert Images
    if (Array.isArray(images) && images.length > 0) {
      const imageRows = images.map((imgUrl, idx) => ({
        listing_id: createdListing.id,
        image_url: imgUrl,
        position: idx,
        is_cover: idx === 0
      }));

      await supabase.from('listing_images').insert(imageRows);
    }

    // 4. Trigger In-App System Notification for Seller
    await supabase.from('notifications').insert({
      user_id: sellerId,
      type: 'system',
      title: 'Ad Published Successfully!',
      message: `Your listing "${title}" is now live and visible to buyers on InfiBuy.`,
      action_link: `/product/${createdListing.id}`,
      item_img: images[0] || null,
      is_read: false,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Advert published successfully',
      data: createdListing
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/listings error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
