-- ============================================================================
-- InfiBuy Marketplace - Full Enterprise PostgreSQL Database Schema
-- Production Architecture for Classifieds Marketplace (Similar to Jiji.ng)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. USER PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    name TEXT,
    phone TEXT,
    whatsapp TEXT,
    location TEXT DEFAULT 'Lagos, Nigeria',
    avatar_url TEXT,
    banner_url TEXT DEFAULT 'linear-gradient(135deg, #ffa705 0%, #e67600 100%)',
    verified BOOLEAN DEFAULT FALSE,
    average_rating NUMERIC(3, 2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    my_listings JSONB DEFAULT '[]'::jsonb,
    saved_items JSONB DEFAULT '[]'::jsonb,
    notifications JSONB DEFAULT '[]'::jsonb,
    followed_sellers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. CATEGORIES & TAXONOMY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    icon VARCHAR(100),
    requires_condition BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subcategories (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES public.categories(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    UNIQUE(category_id, slug)
);

-- Seed Initial Categories (Jiji Standard Categories)
INSERT INTO public.categories (slug, name, icon, requires_condition, display_order)
VALUES 
    ('phones-tablets', 'Phones & Tablets', 'Smartphone', TRUE, 1),
    ('vehicles', 'Vehicles & Cars', 'Car', TRUE, 2),
    ('electronics', 'Electronics & Appliances', 'Tv', TRUE, 3),
    ('real-estate', 'Real Estate & Properties', 'Home', FALSE, 4),
    ('fashion', 'Fashion & Beauty', 'Shirt', TRUE, 5),
    ('home-furniture', 'Home, Furniture & Living', 'Sofa', TRUE, 6),
    ('health-beauty', 'Health & Beauty', 'Sparkles', FALSE, 7),
    ('jobs', 'Jobs & Careers', 'Briefcase', FALSE, 8),
    ('services', 'Services & Repairs', 'Wrench', FALSE, 9),
    ('agriculture', 'Agriculture & Food', 'Apple', FALSE, 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 4. LISTINGS TABLE (CLASSIFIED ADS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug TEXT,
    description TEXT NOT NULL,
    price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
    negotiable BOOLEAN DEFAULT TRUE,
    category_slug VARCHAR(100) NOT NULL,
    subcategory_slug VARCHAR(100),
    condition VARCHAR(50), -- 'Brand New', 'Used', or NULL for services/jobs
    location VARCHAR(200) NOT NULL,
    state VARCHAR(100) DEFAULT 'Lagos',
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'expired', 'archived')),
    views_count INT DEFAULT 0,
    phone_reveals_count INT DEFAULT 0,
    search_vector tsvector,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listing Images
CREATE TABLE IF NOT EXISTS public.listing_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    position INT DEFAULT 0,
    is_cover BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. REAL-TIME CHAT & MESSAGING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message TEXT DEFAULT '',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(30) DEFAULT 'text' CHECK (type IN ('text', 'offer', 'callback', 'image')),
    content TEXT NOT NULL,
    offer_price NUMERIC(14, 2),
    offer_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. IN-APP NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'system', 'offer', 'alert', 'price_drop'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_link TEXT,
    item_img TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. SAVED ITEMS (BOOKMARKS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- ============================================================================
-- 8. SELLER REVIEWS & FEEDBACK
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seller_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(seller_id, reviewer_id)
);

-- ============================================================================
-- 9. REPORTS & MODERATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. INDEXES FOR HIGH-THROUGHPUT SEARCH & LOOKUPS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_status ON public.listings(category_slug, status);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_search_vector ON public.listings USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listing_images(listing_id, position);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON public.saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller_id ON public.seller_reviews(seller_id);

-- ============================================================================
-- 11. AUTOMATED TRIGGERS & RPC PROCEDURES
-- ============================================================================

-- A. Auto-update Search Vector on Listing Create/Edit
CREATE OR REPLACE FUNCTION public.fn_update_listing_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.location, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.category_slug, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_listing_search_vector ON public.listings;
CREATE TRIGGER trg_update_listing_search_vector
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.fn_update_listing_search_vector();

-- B. Atomic View Increment RPC
CREATE OR REPLACE FUNCTION public.increment_listing_views(p_listing_id UUID)
RETURNS INT AS $$
DECLARE
    v_new_count INT;
BEGIN
    UPDATE public.listings
    SET views_count = views_count + 1
    WHERE id = p_listing_id
    RETURNING views_count INTO v_new_count;
    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Atomic Phone Reveal Logger RPC
CREATE OR REPLACE FUNCTION public.reveal_seller_phone(p_listing_id UUID, p_buyer_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    v_phone TEXT;
BEGIN
    -- Increment reveal metrics
    UPDATE public.listings
    SET phone_reveals_count = phone_reveals_count + 1
    WHERE id = p_listing_id;

    -- Return phone number of seller
    SELECT p.phone INTO v_phone
    FROM public.listings l
    JOIN public.profiles p ON l.seller_id = p.id
    WHERE l.id = p_listing_id;

    RETURN coalesce(v_phone, 'No phone number provided');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Auto-update Seller Ratings on Review Change
CREATE OR REPLACE FUNCTION public.fn_recalculate_seller_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_avg NUMERIC(3, 2);
    v_cnt INT;
BEGIN
    v_seller_id := coalesce(NEW.seller_id, OLD.seller_id);

    SELECT coalesce(avg(rating), 0.0), count(*)
    INTO v_avg, v_cnt
    FROM public.seller_reviews
    WHERE seller_id = v_seller_id;

    UPDATE public.profiles
    SET average_rating = v_avg,
        review_count = v_cnt,
        updated_at = NOW()
    WHERE id = v_seller_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_seller_rating ON public.seller_reviews;
CREATE TRIGGER trg_recalculate_seller_rating
AFTER INSERT OR UPDATE OR DELETE ON public.seller_reviews
FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_seller_rating();

-- ============================================================================
-- 12. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can read, user can update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Listings: Everyone can view active listings, sellers can manage their own
CREATE POLICY "Active listings are public" ON public.listings FOR SELECT USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY "Sellers can insert their listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their listings" ON public.listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their listings" ON public.listings FOR DELETE USING (auth.uid() = seller_id);

-- Listing Images: Public read, seller insert/delete
CREATE POLICY "Listing images are public" ON public.listing_images FOR SELECT USING (TRUE);
CREATE POLICY "Sellers can manage listing images" ON public.listing_images FOR ALL USING (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_images.listing_id AND seller_id = auth.uid())
);

-- Conversations & Messages: Only participants can access
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING (auth.uid() IN (buyer_id, seller_id));
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() IN (buyer_id, seller_id));

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (auth.uid() IN (sender_id, recipient_id));
CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipient can mark messages as read" ON public.messages FOR UPDATE USING (auth.uid() = recipient_id);

-- Notifications: Only recipient can see & modify
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Saved items: Only owner
CREATE POLICY "Users can view own saved items" ON public.saved_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save items" ON public.saved_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove saved items" ON public.saved_items FOR DELETE USING (auth.uid() = user_id);

-- Reviews: Public read, authenticated users can write
CREATE POLICY "Reviews are public" ON public.seller_reviews FOR SELECT USING (TRUE);
CREATE POLICY "Users can write reviews" ON public.seller_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id AND auth.uid() != seller_id);
