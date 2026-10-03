// Small hand-made Safeway-style catalog so the agent works end to end before the real
// catalog + Moss index (person 2) lands. Swap lib/tools/catalog-source.ts to use the real one.
import type { Product, Store, StoreStock } from '../lib/tools/types'

export const STORES: Store[] = [
  { id: 'safeway-sf-01', name: 'Safeway Market St', address: '2020 Market St, San Francisco, CA', zip: '94114' },
  { id: 'safeway-sf-02', name: 'Safeway 4th & King', address: '298 King St, San Francisco, CA', zip: '94107' },
  { id: 'safeway-sf-03', name: 'Safeway Webster St', address: '1335 Webster St, San Francisco, CA', zip: '94115' },
]

type Row = [id: string, name: string, brand: string, storeBrand: boolean, department: string, aisle: string, size: string, price: number, diet: Product['diet_tags'], allergens: Product['allergens']]

const ROWS: Row[] = [
  // Dairy & alternatives
  ['sw-0001', 'Oatly Oat Milk Barista Edition', 'Oatly', false, 'dairy eggs', 'Dairy Alternatives', '32 fl oz', 4.99, ['vegan', 'dairy_free'], ['wheat']],
  ['sw-0002', 'O Organics Oat Milk Original', 'O Organics', true, 'dairy eggs', 'Dairy Alternatives', '64 fl oz', 4.29, ['vegan', 'dairy_free', 'organic'], ['wheat']],
  ['sw-0003', 'Califia Farms Oat Barista Blend', 'Califia Farms', false, 'dairy eggs', 'Dairy Alternatives', '32 fl oz', 5.49, ['vegan', 'dairy_free', 'gluten_free'], []],
  ['sw-0004', 'Signature Select Almond Milk Unsweetened', 'Signature Select', true, 'dairy eggs', 'Dairy Alternatives', '64 fl oz', 2.99, ['vegan', 'dairy_free'], ['tree_nuts']],
  ['sw-0005', 'Lucerne 2% Reduced Fat Milk', 'Lucerne', true, 'dairy eggs', 'Milk', '1 gal', 4.79, ['vegetarian', 'gluten_free'], ['milk']],
  ['sw-0006', 'O Organics Large Brown Eggs', 'O Organics', true, 'dairy eggs', 'Eggs', '12 ct', 5.99, ['vegetarian', 'organic', 'gluten_free'], ['eggs']],
  ['sw-0007', 'Lucerne Shredded Mexican Blend Cheese', 'Lucerne', true, 'dairy eggs', 'Cheese', '8 oz', 3.49, ['vegetarian', 'gluten_free'], ['milk']],
  ['sw-0008', 'Violife Shredded Mexican Style', 'Violife', false, 'dairy eggs', 'Dairy Alternatives', '8 oz', 5.29, ['vegan', 'dairy_free', 'gluten_free'], []],
  ['sw-0011', 'O Organics Dairy-Free Shredded Cheddar Style Cheese', 'O Organics', true, 'dairy eggs', 'Dairy Alternatives', '7 oz', 4.49, ['vegan', 'dairy_free', 'gluten_free', 'organic'], []],
  ['sw-0012', 'Forager Dairy-Free Sour Cream', 'Forager Project', false, 'dairy eggs', 'Dairy Alternatives', '12 oz', 4.99, ['vegan', 'dairy_free', 'gluten_free'], ['tree_nuts']],
  ['sw-0009', 'Lucerne Sour Cream', 'Lucerne', true, 'dairy eggs', 'Dairy', '16 oz', 2.79, ['vegetarian', 'gluten_free'], ['milk']],
  ['sw-0010', 'Siggi\'s Vanilla Skyr', 'Siggi\'s', false, 'dairy eggs', 'Yogurt', '5.3 oz', 2.29, ['vegetarian', 'gluten_free'], ['milk']],
  // Produce
  ['sw-0101', 'Hass Avocados', 'Safeway Produce', true, 'produce', 'Produce', '1 each', 1.49, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0102', 'Roma Tomatoes', 'Safeway Produce', true, 'produce', 'Produce', '1 lb', 1.99, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0103', 'Yellow Onions', 'Safeway Produce', true, 'produce', 'Produce', '3 lb bag', 3.49, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0104', 'Limes', 'Safeway Produce', true, 'produce', 'Produce', '1 each', 0.5, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0105', 'Fresh Cilantro', 'Safeway Produce', true, 'produce', 'Produce', '1 bunch', 0.99, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0106', 'Iceberg Lettuce', 'Safeway Produce', true, 'produce', 'Produce', '1 head', 1.99, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0107', 'O Organics Baby Spinach', 'O Organics', true, 'produce', 'Produce', '5 oz', 3.99, ['vegan', 'gluten_free', 'dairy_free', 'organic'], []],
  ['sw-0108', 'Bananas', 'Safeway Produce', true, 'produce', 'Produce', '1 lb', 0.69, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0109', 'Honeycrisp Apples', 'Safeway Produce', true, 'produce', 'Produce', '1 lb', 2.99, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0110', 'Garlic', 'Safeway Produce', true, 'produce', 'Produce', '3 ct', 1.29, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0111', 'Jalapeño Peppers', 'Safeway Produce', true, 'produce', 'Produce', '1 lb', 1.49, ['vegan', 'gluten_free', 'dairy_free'], []],
  // Meat & seafood
  ['sw-0201', 'Open Nature Ground Beef 85% Lean', 'Open Nature', true, 'meat seafood', 'Meat', '1 lb', 6.99, ['gluten_free', 'dairy_free'], []],
  ['sw-0202', 'Signature Farms Boneless Chicken Breast', 'Signature Farms', true, 'meat seafood', 'Meat', '1.5 lb', 8.49, ['gluten_free', 'dairy_free'], []],
  ['sw-0203', 'Foster Farms Chicken Thighs Boneless', 'Foster Farms', false, 'meat seafood', 'Meat', '1.5 lb', 9.29, ['gluten_free', 'dairy_free'], []],
  ['sw-0204', 'Waterfront Bistro Wild Salmon Fillet', 'Waterfront Bistro', true, 'meat seafood', 'Seafood', '1 lb', 12.99, ['gluten_free', 'dairy_free'], ['fish']],
  ['sw-0205', 'Beyond Meat Beyond Beef Plant-Based Ground', 'Beyond Meat', false, 'meat seafood', 'Meat Alternatives', '16 oz', 9.99, ['vegan', 'dairy_free', 'gluten_free'], []],
  // Pantry
  ['sw-0301', 'Mission Flour Tortillas Soft Taco', 'Mission', false, 'pantry', 'International', '10 ct', 3.79, ['vegetarian', 'dairy_free'], ['wheat']],
  ['sw-0302', 'Signature Select Yellow Corn Tortillas', 'Signature Select', true, 'pantry', 'International', '30 ct', 2.49, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0303', 'Old El Paso Taco Seasoning Mix', 'Old El Paso', false, 'pantry', 'International', '1 oz', 1.29, ['vegan', 'dairy_free'], []],
  ['sw-0304', 'Signature Select Taco Seasoning', 'Signature Select', true, 'pantry', 'International', '1 oz', 0.99, ['vegan', 'dairy_free', 'gluten_free'], []],
  ['sw-0305', 'Signature Select Black Beans', 'Signature Select', true, 'pantry', 'Canned Goods', '15 oz', 1.19, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0306', 'O Organics Chunky Salsa Medium', 'O Organics', true, 'pantry', 'International', '16 oz', 3.29, ['vegan', 'gluten_free', 'dairy_free', 'organic'], []],
  ['sw-0307', 'Tostitos Restaurant Style Tortilla Chips', 'Tostitos', false, 'pantry', 'Snacks', '13 oz', 5.49, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0308', 'Signature Select Spaghetti', 'Signature Select', true, 'pantry', 'Pasta', '16 oz', 1.49, ['vegan', 'dairy_free'], ['wheat']],
  ['sw-0309', 'Barilla Gluten Free Penne', 'Barilla', false, 'pantry', 'Pasta', '12 oz', 2.99, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0310', 'O Organics Marinara Sauce', 'O Organics', true, 'pantry', 'Pasta', '25 oz', 3.99, ['vegan', 'gluten_free', 'dairy_free', 'organic'], []],
  ['sw-0311', 'Signature Select Jasmine Rice', 'Signature Select', true, 'pantry', 'Rice & Grains', '2 lb', 3.49, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0312', 'Signature Select Extra Virgin Olive Oil', 'Signature Select', true, 'pantry', 'Oils', '16.9 fl oz', 6.99, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0313', 'Kerrygold Pure Irish Butter', 'Kerrygold', false, 'dairy eggs', 'Dairy', '8 oz', 4.99, ['vegetarian', 'gluten_free'], ['milk']],
  ['sw-0314', 'O Organics Old Fashioned Rolled Oats', 'O Organics', true, 'pantry', 'Cereal', '18 oz', 3.99, ['vegan', 'dairy_free', 'organic'], []],
  ['sw-0315', 'Cheerios', 'General Mills', false, 'pantry', 'Cereal', '12 oz', 5.29, ['vegan', 'dairy_free'], []],
  ['sw-0316', 'Signature Select Creamy Peanut Butter', 'Signature Select', true, 'pantry', 'Spreads', '16 oz', 2.99, ['vegan', 'gluten_free', 'dairy_free'], ['peanuts']],
  ['sw-0317', 'SunButter Sunflower Seed Butter', 'SunButter', false, 'pantry', 'Spreads', '16 oz', 5.99, ['vegan', 'gluten_free', 'dairy_free', 'nut_free'], []],
  // Bakery & frozen & drinks
  ['sw-0401', 'Signature Select Whole Wheat Bread', 'Signature Select', true, 'bakery', 'Bread', '20 oz', 2.99, ['vegan', 'dairy_free'], ['wheat']],
  ['sw-0402', 'Canyon Bakehouse Gluten Free Bread', 'Canyon Bakehouse', false, 'bakery', 'Bread', '18 oz', 6.49, ['gluten_free', 'dairy_free'], ['eggs']],
  ['sw-0403', 'Signature Select Frozen Sweet Corn', 'Signature Select', true, 'frozen', 'Frozen Vegetables', '16 oz', 1.79, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0404', 'O Organics Frozen Blueberries', 'O Organics', true, 'frozen', 'Frozen Fruit', '10 oz', 4.49, ['vegan', 'gluten_free', 'dairy_free', 'organic'], []],
  ['sw-0405', 'Signature Select Sparkling Water Lime', 'Signature Select', true, 'beverages', 'Water', '12 pk', 4.99, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0406', 'Coca-Cola Classic', 'Coca-Cola', false, 'beverages', 'Soda', '12 pk', 8.99, ['vegan', 'gluten_free', 'dairy_free'], []],
  ['sw-0407', 'Signature Select Orange Juice No Pulp', 'Signature Select', true, 'beverages', 'Juice', '52 fl oz', 3.99, ['vegan', 'gluten_free', 'dairy_free'], []],
]

export const PRODUCTS: Product[] = ROWS.map(([id, name, brand, store_brand, department, aisle, size, price, diet_tags, allergens]) => ({
  id, name, brand, store_brand, department, aisle, size, price, diet_tags, allergens,
}))

// Demo setup: the out-of-stock items that make the substitute moment happen.
const OUT_OF_STOCK: Record<string, string[]> = {
  'safeway-sf-01': ['sw-0001', 'sw-0008', 'sw-0203'],
  'safeway-sf-02': ['sw-0001', 'sw-0306'],
  'safeway-sf-03': ['sw-0302'],
}

const AISLE_NUMBERS: Record<string, string> = {
  'Dairy Alternatives': '12', Milk: '12', Eggs: '12', Cheese: '12', Dairy: '12', Yogurt: '12',
  Produce: '1', Meat: '15', Seafood: '15', 'Meat Alternatives': '15',
  International: '6', 'Canned Goods': '5', Snacks: '9', Pasta: '4', 'Rice & Grains': '4', Oils: '3',
  Cereal: '7', Spreads: '7', Bread: '2', 'Frozen Vegetables': '18', 'Frozen Fruit': '18',
  Water: '10', Soda: '10', Juice: '11',
}

// Deterministic per-store price wobble so stores differ a little.
function storePrice(storeIndex: number, product: Product): number {
  const wobble = [0, 0.1, -0.1][storeIndex] ?? 0
  return Math.round((product.price + (product.store_brand ? 0 : wobble)) * 100) / 100
}

export const STOCK: StoreStock[] = STORES.flatMap((store, storeIndex) =>
  PRODUCTS.map((product, i) => {
    const out = OUT_OF_STOCK[store.id]?.includes(product.id) ?? false
    return {
      store_id: store.id,
      product_id: product.id,
      in_stock: !out,
      qty: out ? 0 : 6 + ((i * 7 + storeIndex * 3) % 30),
      aisle_number: AISLE_NUMBERS[product.aisle] ?? '20',
      price: storePrice(storeIndex, product),
    }
  }),
)
