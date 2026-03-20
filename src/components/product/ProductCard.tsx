'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types/database.types';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="group rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30">
      <Link href={`/products/${product.id}`}>
        <div className="mb-3 aspect-square overflow-hidden rounded-md bg-gradient-to-br from-muted to-muted/50">
          <div className="flex h-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/50" />
          </div>
        </div>

        <h3 className="mb-1 text-sm font-medium leading-tight line-clamp-2">
          {product.name}
        </h3>
        <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
          {product.description}
        </p>
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-bold">${Number(product.price).toFixed(2)}</span>
          {product.stock > 0 ? (
            <span className="ml-2 text-xs text-green-500">In Stock</span>
          ) : (
            <span className="ml-2 text-xs text-red-500">Out of Stock</span>
          )}
        </div>
        {product.dpp_hash && (
          <span className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
            DPP ✓
          </span>
        )}
      </div>

      <Button
        className="mt-3 w-full"
        size="sm"
        disabled={product.stock === 0}
        onClick={(e) => {
          e.preventDefault();
          onAddToCart?.(product);
        }}
      >
        Add to Cart
      </Button>
    </div>
  );
}
