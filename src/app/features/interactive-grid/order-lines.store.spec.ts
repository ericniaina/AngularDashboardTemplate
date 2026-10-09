import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { OrderLine, Product } from './order-line.model';
import { OrderLinesStore } from './order-lines.store';

const products: Product[] = [{ id: 'p-5', name: 'Mouse', listPrice: 39 }];
const saved: OrderLine[] = [{ id: 'l-1', productId: 'p-5', quantity: 1, unitPrice: 39 }];

describe('OrderLinesStore', () => {
  let store: OrderLinesStore;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [OrderLinesStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(OrderLinesStore);
    http = TestBed.inject(HttpTestingController);
    const loaded = store.load();
    http.expectOne('/api/products').flush(products);
    http.expectOne('/api/order-lines').flush(saved);
    await loaded;
  });

  afterEach(() => http.verify());

  it('addLines appends in memory only: new ids, dirty, nothing sent until save', () => {
    const ids = store.addLines([
      { productId: 'p-5', quantity: 2, unitPrice: 39 },
      { productId: null, quantity: 1, unitPrice: null },
    ]);

    expect(ids).toHaveLength(2);
    expect(new Set([...ids, 'l-1']).size).toBe(3);
    expect(store.lines().map((l) => l.id)).toEqual(['l-1', ...ids]);
    expect(store.dirty()).toBe(true);
    expect(store.invalidCount()).toBe(1);
    expect(store.canSave()).toBe(false);
    http.expectNone(() => true);
  });

  it('discard drops imported lines', () => {
    store.addLines([{ productId: 'p-5', quantity: 2, unitPrice: 39 }]);
    store.discard();
    expect(store.lines()).toEqual(saved);
    expect(store.dirty()).toBe(false);
  });

  it('save sends the whole set, imported lines included', async () => {
    const [id] = store.addLines([{ productId: 'p-5', quantity: 2, unitPrice: 39 }]);
    const saving = store.save();
    const req = http.expectOne({ method: 'PUT', url: '/api/order-lines' });
    expect(req.request.body.map((l: OrderLine) => l.id)).toEqual(['l-1', id]);
    req.flush(req.request.body);
    await saving;
    expect(store.dirty()).toBe(false);
  });
});
