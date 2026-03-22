import path from 'node:path';

const root = import.meta.dirname ?? __dirname;

export default {
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'functions/src/**/*.ts',
        'apps/web/src/app/api/search/route.ts',
        'apps/web/src/app/api/admin/orders/[orderId]/route.ts',
        'apps/web/src/app/api/orders/guest/route.ts',
        'apps/web/src/app/api/order/return/route.ts',
        'apps/web/src/lib/store-settings.ts',
        'packages/utils/src/**/*.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(root, 'apps/web/src'),
    },
  },
};
