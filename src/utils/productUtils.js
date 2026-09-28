// src/utils/productUtils.js

/**
 * Categories that fundamentally do not have physical "Brand New" or "Used" conditions.
 * E.g., Animals (living pets/creatures), Services (intangible labor), Jobs (employment opportunities), Property (real estate/land/rentals).
 */
export const NO_CONDITION_CATEGORIES = [
  'Services',
  'Jobs',
  'Animals',
  'Property'
];

/**
 * Subcategories under physical or hybrid categories where "Brand New" / "Used" condition is inappropriate.
 * E.g., Livestock/produce/services in Agriculture, salon/spa services in Beauty, service trades in Repair.
 */
export const NO_CONDITION_SUBCATEGORIES = [
  'Farm Produce',
  'Livestock & Poultry',
  'Seeds & Seedlings',
  'Agricultural Services',
  'Veterinary Services',
  'Health & Beauty Services',
  'Cleaning Services',
  'Home Services',
  'Tutoring & Lessons',
  'Event Planning',
  'Photography & Videography',
  'Legal Services',
  'IT & Tech Support',
  'Logistics & Delivery',
  'Catering & Food'
];

/**
 * Determines whether a product or category/subcategory supports a condition badge or form input.
 * @param {string} [category] 
 * @param {string} [subcategory] 
 * @returns {boolean}
 */
export function isConditionApplicable(category, subcategory) {
  if (!category) return false;
  
  const trimmedCat = category.trim();
  if (NO_CONDITION_CATEGORIES.some(c => c.toLowerCase() === trimmedCat.toLowerCase())) {
    return false;
  }
  
  if (subcategory) {
    const trimmedSub = subcategory.trim().toLowerCase();
    if (trimmedSub.includes('service')) return false;
    if (NO_CONDITION_SUBCATEGORIES.some(s => s.toLowerCase() === trimmedSub)) {
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

