// src/utils/productUtils.js

/**
 * Categories that fundamentally do not have physical "Brand New" or "Used" conditions.
 * E.g., Repair & Construction, Services, Jobs, Animals, Property.
 */
export const NO_CONDITION_CATEGORIES = [
  'Services',
  'Jobs',
  'Animals',
  'Property',
  'Repair & Construction',
  'Repair and Construction',
  'Repairs & Construction',
  'Repair',
  'Construction'
];

/**
 * Subcategories under physical or hybrid categories where "Brand New" / "Used" condition is inappropriate.
 * E.g., Live animals, farm produce, consumables, hygiene items, trade skills, and all intangible services.
 */
export const NO_CONDITION_SUBCATEGORIES = [
  // Agriculture non-machinery items
  'Farm Produce',
  'Livestock & Poultry',
  'Seeds & Seedlings',
  'Fertilizers & Pesticides',
  'Agricultural Services',
  'Livestock',
  'Poultry',
  'Seeds',

  // Animals & Pets (living animals & pet services)
  'Dogs',
  'Cats',
  'Birds',
  'Fish & Aquarium',
  'Reptiles',
  'Pet Food & Supplies',
  'Veterinary Services',

  // Repair & Construction trade work & materials
  'Building Materials',
  'Plumbing',
  'Electrical Work',
  'Painting & Decorating',
  'Carpentry & Woodwork',
  'HVAC & Air Conditioning',
  'Roofing',
  'Tiling & Flooring',

  // Health, Beauty & Personal Care consumables & personal hygiene
  'Health & Beauty Services',
  'Vitamins & Supplements',
  'Makeup',
  'Fragrance',
  'Face Care',
  'Body Care',
  'Oral Care',
  'Sexual Wellness',

  // Services
  'Cleaning Services',
  'Home Services',
  'Tutoring & Lessons',
  'Event Planning',
  'Photography & Videography',
  'Legal Services',
  'IT & Tech Support',
  'Logistics & Delivery',
  'Catering & Food',

  // Real estate & Rentals
  'Houses & Apartments for Rent',
  'Houses & Apartments for Sale',
  'Land & Plots',
  'Commercial Property',
  'Short Let'
];

/**
 * Determines whether a product or category/subcategory supports a condition badge or form input.
 * @param {string} [category] 
 * @param {string} [subcategory] 
 * @returns {boolean}
 */
export function isConditionApplicable(category, subcategory) {
  if (!category) return false;
  
  const normCat = category.trim().toLowerCase();

  // 1. Direct category match
  if (NO_CONDITION_CATEGORIES.some(c => c.toLowerCase() === normCat)) {
    return false;
  }

  // 2. Keyword heuristic on category (e.g. Repair, Construction, Service, Job, Property, Animal)
  if (
    normCat.includes('repair') ||
    normCat.includes('construction') ||
    normCat.includes('service') ||
    normCat.includes('job') ||
    normCat.includes('property') ||
    normCat.includes('animal')
  ) {
    return false;
  }
  
  // 3. Subcategory match & heuristics
  if (subcategory) {
    const normSub = subcategory.trim().toLowerCase();
    
    if (NO_CONDITION_SUBCATEGORIES.some(s => s.toLowerCase() === normSub)) {
      return false;
    }

    if (
      normSub.includes('service') ||
      normSub.includes('repair') ||
      normSub.includes('construction') ||
      normSub.includes('rent') ||
      normSub.includes('produce') ||
      normSub.includes('livestock') ||
      normSub.includes('poultry') ||
      normSub.includes('seed') ||
      normSub.includes('fertilizer') ||
      normSub.includes('supplement') ||
      normSub.includes('tutoring') ||
      normSub.includes('plumbing') ||
      normSub.includes('roofing') ||
      normSub.includes('tiling')
    ) {
      return false;
    }
  }
  
  return true;
}

/**
 * Checks whether a given product object should display a condition badge in cards, carousels, or lists.
 * @param {object} product
 * @returns {boolean}
 */
export function shouldShowConditionBadge(product) {
  if (!product) return false;
  if (!product.condition) return false;
  const cond = String(product.condition).trim().toLowerCase();
  if (!cond || cond === 'n/a' || cond === 'none' || cond === 'service' || cond === 'not applicable') {
    return false;
  }
  return isConditionApplicable(product.category, product.subcategory);
}

/**
 * Accurately formats the user's membership tenure on InfiBuy from their creation timestamp.
 * Replaces any legacy "BuyOh" branding with "InfiBuy".
 * @param {string|null} [rawMemberSince]
 * @param {string|Date|null} [createdAt]
 * @returns {string} e.g. "2+ years on InfiBuy", "5 months on InfiBuy", "< 1 year on InfiBuy"
 */
export function formatMemberSince(rawMemberSince, createdAt) {
  if (createdAt) {
    try {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        const diffMs = Math.max(0, Date.now() - date.getTime());
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffYears = Math.floor(diffDays / 365.25);
        const diffMonths = Math.floor(diffDays / 30.4375);

        if (diffYears >= 1) {
          return `${diffYears}+ year${diffYears > 1 ? 's' : ''} on InfiBuy`;
        } else if (diffMonths >= 1) {
          return `${diffMonths} month${diffMonths > 1 ? 's' : ''} on InfiBuy`;
        } else if (diffDays >= 7) {
          const weeks = Math.floor(diffDays / 7);
          return `${weeks} week${weeks > 1 ? 's' : ''} on InfiBuy`;
        } else if (diffDays >= 1) {
          return `${diffDays} day${diffDays > 1 ? 's' : ''} on InfiBuy`;
        } else {
          return '< 1 year on InfiBuy';
        }
      }
    } catch (e) {}
  }

  if (rawMemberSince && typeof rawMemberSince === 'string') {
    return rawMemberSince.replace(/buyoh/gi, 'InfiBuy');
  }

  return '1+ year on InfiBuy';
}

/**
 * Formats when an advertisement was listed (e.g. "Just now", "2h ago", "3d ago", "2w ago").
 * @param {string|Date|number|null} [createdAt]
 * @returns {string}
 */
export function formatAdPostedTime(createdAt) {
  if (!createdAt) return 'Recently listed';
  try {
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) return 'Recently listed';
    const diffMs = Math.max(0, Date.now() - date.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return diffMins <= 2 ? 'Just now' : `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  } catch {
    return 'Recently listed';
  }
}

