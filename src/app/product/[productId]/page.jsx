'use client';

import { use } from 'react';
import ProductDetails from '../../../views/ProductDetails';

export default function ProductDetailPage({ params }) {
  const resolvedParams = params && typeof params.then === 'function' ? use(params) : params;

  return <ProductDetails params={resolvedParams} />;
}
