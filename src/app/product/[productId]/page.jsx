import ProductDetails from '../../../views/ProductDetails';

// Server Component: await params (Next.js 15 pattern for async params)
export default async function ProductDetailPage({ params }) {
  const resolvedParams = await params;
  return <ProductDetails params={resolvedParams} />;
}
