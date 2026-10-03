// Seed list of grocery staples: drives the synthetic catalog and the search terms for the Kroger import.
import type { Allergen, DietTag } from "../lib/catalog/types.ts";

// [department, aisle, name, size, list price, tags, allergens, brands]
// tags: v=vegan vg=vegetarian gf=gluten_free k=kosher o=organic
// allergens: m=milk e=eggs p=peanuts tn=tree_nuts s=soy w=wheat f=fish sh=shellfish se=sesame
// brands: "|"-separated; "@" prefix = Safeway store brand. "O Organics" is always organic.
export type Base = [string, string, string, string, number, string, string, string];

export const BASES: Base[] = [
  // Produce
  ["produce", "Fresh Fruits", "Bananas", "1 lb", 0.69, "v gf k", "", "@Signature Farms|Dole|@O Organics"],
  ["produce", "Fresh Fruits", "Honeycrisp Apples", "3 lb bag", 6.99, "v gf k", "", "@Signature Farms|@O Organics"],
  ["produce", "Fresh Fruits", "Hass Avocados", "4 ct bag", 5.99, "v gf k", "", "@Signature Farms|@O Organics|Mission"],
  ["produce", "Fresh Fruits", "Strawberries", "1 lb", 4.99, "v gf k", "", "Driscoll's|@O Organics"],
  ["produce", "Fresh Fruits", "Blueberries", "6 oz", 3.99, "v gf k", "", "Driscoll's|@O Organics"],
  ["produce", "Fresh Fruits", "Lemons", "2 lb bag", 4.49, "v gf k", "", "Sunkist|@O Organics"],
  ["produce", "Fresh Fruits", "Limes", "1 lb bag", 2.99, "v gf k", "", "@Signature Farms"],
  ["produce", "Fresh Vegetables", "Baby Spinach", "5 oz", 3.99, "v gf k", "", "@O Organics|Earthbound Farm|Taylor Farms"],
  ["produce", "Fresh Vegetables", "Romaine Hearts", "3 ct", 3.99, "v gf k", "", "@Signature Farms|Tanimura & Antle|@O Organics"],
  ["produce", "Fresh Vegetables", "Yellow Onions", "3 lb bag", 3.49, "v gf k", "", "@Signature Farms|@O Organics"],
  ["produce", "Fresh Vegetables", "Garlic", "3 ct", 1.99, "v gf k", "", "@Signature Farms|Christopher Ranch"],
  ["produce", "Fresh Vegetables", "Roma Tomatoes", "1 lb", 1.99, "v gf k", "", "@Signature Farms|@O Organics"],
  ["produce", "Fresh Vegetables", "Russet Potatoes", "5 lb bag", 4.99, "v gf k", "", "@Signature Farms|@O Organics"],
  ["produce", "Fresh Vegetables", "Carrots", "2 lb bag", 2.49, "v gf k", "", "Grimmway Farms|@O Organics|Bolthouse Farms"],
  ["produce", "Fresh Vegetables", "Broccoli Crowns", "1 lb", 2.99, "v gf k", "", "@Signature Farms|@O Organics"],
  ["produce", "Fresh Vegetables", "Red Bell Peppers", "3 ct", 4.99, "v gf k", "", "@Signature Farms|@O Organics"],
  ["produce", "Fresh Vegetables", "Cilantro", "1 bunch", 0.99, "v gf k", "", "@Signature Farms|@O Organics"],
  ["produce", "Fresh Vegetables", "Sweet Potatoes", "3 lb bag", 4.49, "v gf k", "", "@Signature Farms|@O Organics"],
  ["produce", "Fresh Vegetables", "Zucchini", "1 lb", 2.49, "v gf k", "", "@Signature Farms|@O Organics"],
  ["produce", "Fresh Herbs & Salads", "Spring Mix Salad", "5 oz", 4.49, "v gf k", "", "@O Organics|Earthbound Farm|Fresh Express"],
  ["produce", "Fresh Herbs & Salads", "Caesar Salad Kit", "10 oz", 4.99, "vg", "m e w f", "@Signature Farms|Taylor Farms|Fresh Express"],
  ["produce", "Packaged Produce", "Extra Firm Tofu", "14 oz", 2.99, "v gf k", "s", "@O Organics|Hodo|Nasoya|House Foods"],

  // Dairy & eggs
  ["dairy eggs", "Milk", "Whole Milk", "1 gal", 5.49, "vg gf k", "m", "@Lucerne|@O Organics|Clover Sonoma|Horizon Organic"],
  ["dairy eggs", "Milk", "2% Reduced Fat Milk", "1 gal", 5.29, "vg gf k", "m", "@Lucerne|@O Organics|Clover Sonoma|Horizon Organic"],
  ["dairy eggs", "Milk", "Lactose Free 2% Milk", "half gal", 4.99, "vg gf k", "m", "Lactaid|@Lucerne"],
  ["dairy eggs", "Milk", "Fairlife Ultra-Filtered Whole Milk", "52 fl oz", 5.49, "vg gf k", "m", "fairlife"],
  ["dairy eggs", "Dairy Alternatives", "Oat Milk Original", "64 fl oz", 4.99, "v k", "", "Oatly|@O Organics|Califia Farms|Planet Oat|Chobani"],
  ["dairy eggs", "Dairy Alternatives", "Oat Milk Barista Edition", "32 fl oz", 4.99, "v k", "", "Oatly|Califia Farms|Minor Figures|@Signature Select"],
  ["dairy eggs", "Dairy Alternatives", "Unsweetened Almond Milk", "64 fl oz", 3.99, "v gf k", "tn", "Almond Breeze|Silk|@O Organics|Califia Farms"],
  ["dairy eggs", "Dairy Alternatives", "Original Soy Milk", "64 fl oz", 3.99, "v gf k", "s", "Silk|@O Organics|Westsoy"],
  ["dairy eggs", "Dairy Alternatives", "Coconut Milk Beverage Unsweetened", "64 fl oz", 3.99, "v gf k", "", "So Delicious|Silk|@Signature Select"],
  ["dairy eggs", "Dairy Alternatives", "Oat Creamer Vanilla", "25.4 fl oz", 5.49, "v", "", "Oatly|Califia Farms|Nutpods|@Signature Select"],
  ["dairy eggs", "Eggs", "Large Grade AA Eggs", "12 ct", 4.49, "vg gf k", "e", "@Lucerne|Vital Farms|Pete and Gerry's|@O Organics"],
  ["dairy eggs", "Eggs", "Cage Free Brown Eggs", "18 ct", 6.99, "vg gf k", "e", "@Lucerne|Vital Farms|@O Organics"],
  ["dairy eggs", "Yogurt", "Greek Yogurt Plain Nonfat", "32 oz", 5.99, "vg gf k", "m", "Chobani|Fage|@Lucerne|@O Organics"],
  ["dairy eggs", "Yogurt", "Greek Yogurt Strawberry", "5.3 oz", 1.49, "vg gf k", "m", "Chobani|Oikos|@Lucerne"],
  ["dairy eggs", "Yogurt", "Oat Milk Yogurt Plain", "24 oz", 5.99, "v gf", "", "Oatly|Silk|Kite Hill"],
  ["dairy eggs", "Yogurt", "Kids Yogurt Tubes", "8 ct", 3.99, "vg gf k", "m", "Go-Gurt|Stonyfield Organic|@Lucerne"],
  ["dairy eggs", "Butter", "Salted Butter", "16 oz", 5.99, "vg gf k", "m", "@Lucerne|Tillamook|Kerrygold|Challenge"],
  ["dairy eggs", "Butter", "Plant Butter Sticks", "16 oz", 5.99, "v gf k", "", "Country Crock Plant Butter|Miyoko's|Earth Balance"],
  ["dairy eggs", "Cheese", "Sharp Cheddar Cheese Block", "8 oz", 3.99, "vg gf k", "m", "Tillamook|@Lucerne|Cabot|@O Organics"],
  ["dairy eggs", "Cheese", "Shredded Mexican Blend Cheese", "8 oz", 3.49, "vg gf", "m", "@Lucerne|Tillamook|Sargento"],
  ["dairy eggs", "Cheese", "Shredded Mozzarella", "16 oz", 5.49, "vg gf k", "m", "@Lucerne|Galbani|Sargento"],
  ["dairy eggs", "Cheese", "Grated Parmesan", "8 oz", 4.99, "gf", "m", "Kraft|@Signature Select|BelGioioso"],
  ["dairy eggs", "Cheese", "Dairy-Free Cheddar Shreds", "7.1 oz", 4.99, "v gf", "", "Violife|Daiya|Follow Your Heart"],
  ["dairy eggs", "Cheese", "Feta Crumbles", "6 oz", 4.49, "vg gf", "m", "Athenos|@Lucerne|President"],
  ["dairy eggs", "Cream", "Heavy Whipping Cream", "16 fl oz", 4.49, "vg gf k", "m", "@Lucerne|Clover Sonoma|@O Organics"],
  ["dairy eggs", "Cream", "Sour Cream", "16 oz", 2.99, "vg gf k", "m", "@Lucerne|Daisy|Tillamook"],
  ["dairy eggs", "Cream", "Half and Half", "32 fl oz", 4.29, "vg gf k", "m", "@Lucerne|Clover Sonoma|@O Organics"],

  // Bakery
  ["bakery", "Bread", "Whole Wheat Sandwich Bread", "24 oz", 3.99, "v k", "w", "Dave's Killer Bread|Oroweat|@Signature Select|Nature's Own"],
  ["bakery", "Bread", "Sourdough Bread", "24 oz", 4.99, "v k", "w", "Boudin|@Signature Select|Acme Bread"],
  ["bakery", "Bread", "Gluten Free Sandwich Bread", "18 oz", 6.49, "v gf", "", "Canyon Bakehouse|Schar|@Open Nature"],
  ["bakery", "Bread", "Hamburger Buns", "8 ct", 3.49, "v k", "w", "@Signature Select|Martin's|Franz"],
  ["bakery", "Tortillas", "Flour Tortillas", "10 ct", 3.49, "v k", "w", "Mission|Guerrero|@Signature Select"],
  ["bakery", "Tortillas", "Corn Tortillas", "30 ct", 2.99, "v gf k", "", "Mission|Guerrero|La Tortilla Factory|@Signature Select"],
  ["bakery", "Tortillas", "Taco Shells", "12 ct", 2.49, "v gf k", "", "Old El Paso|Ortega|@Signature Select"],
  ["bakery", "Bagels & Muffins", "Plain Bagels", "6 ct", 3.99, "v k", "w", "Thomas'|@Signature Select|Dave's Killer Bread"],
  ["bakery", "Bagels & Muffins", "English Muffins", "6 ct", 3.99, "v k", "w", "Thomas'|@Signature Select"],

  // Meat & seafood
  ["meat seafood", "Chicken", "Boneless Skinless Chicken Breasts", "1.5 lb", 8.99, "gf", "", "Foster Farms|@Signature Farms|@O Organics|Mary's"],
  ["meat seafood", "Chicken", "Boneless Skinless Chicken Thighs", "1.5 lb", 7.49, "gf", "", "Foster Farms|@Signature Farms|@O Organics"],
  ["meat seafood", "Beef", "Ground Beef 85% Lean", "1 lb", 6.99, "gf", "", "@Signature Farms|@O Organics|Open Nature"],
  ["meat seafood", "Beef", "Ribeye Steak", "1 lb", 15.99, "gf", "", "@Signature Farms|Certified Angus Beef"],
  ["meat seafood", "Pork", "Thick Cut Bacon", "16 oz", 7.99, "gf", "", "Oscar Mayer|@Signature Select|Applegate|Wright"],
  ["meat seafood", "Turkey", "Ground Turkey 93% Lean", "1 lb", 5.99, "gf", "", "Jennie-O|Foster Farms|@O Organics"],
  ["meat seafood", "Seafood", "Atlantic Salmon Fillet", "1 lb", 11.99, "gf", "f", "@Waterfront Bistro|Kvaroy Arctic"],
  ["meat seafood", "Seafood", "Raw Shrimp Peeled & Deveined", "1 lb", 9.99, "gf", "sh", "@Waterfront Bistro|SeaPak"],
  ["meat seafood", "Plant-Based Meat", "Plant-Based Ground", "16 oz", 8.99, "v", "s", "Beyond Meat|Impossible|@Open Nature"],
  ["meat seafood", "Plant-Based Meat", "Plant-Based Burger Patties", "2 ct", 6.99, "v", "", "Beyond Meat|Impossible"],
  ["meat seafood", "Sausage", "Italian Sausage", "19 oz", 6.49, "gf", "", "Johnsonville|@Signature Farms|Aidells"],

  // Deli
  ["deli", "Lunch Meat", "Oven Roasted Turkey Breast", "8 oz", 5.49, "gf", "", "@Primo Taglio|Oscar Mayer|Applegate|Hillshire Farm"],
  ["deli", "Lunch Meat", "Black Forest Ham", "8 oz", 5.49, "gf", "", "@Primo Taglio|Hillshire Farm"],
  ["deli", "Hummus & Dips", "Classic Hummus", "10 oz", 3.99, "v gf k", "se", "Sabra|@Signature Cafe|Cedar's|@O Organics"],
  ["deli", "Hummus & Dips", "Guacamole", "8 oz", 4.49, "v gf", "", "Wholly Guacamole|@Signature Cafe|Good Foods"],
  ["deli", "Hummus & Dips", "Fresh Salsa Medium", "16 oz", 4.29, "v gf", "", "@Signature Cafe|Garden Fresh Gourmet|Calavo"],
  ["deli", "Prepared Meals", "Rotisserie Chicken", "each", 7.99, "gf", "", "@Signature Cafe"],

  // Pantry / dry goods
  ["dry goods pasta", "Pasta", "Spaghetti", "16 oz", 1.79, "v k", "w", "Barilla|@Signature Select|@O Organics|De Cecco"],
  ["dry goods pasta", "Pasta", "Penne Rigate", "16 oz", 1.79, "v k", "w", "Barilla|@Signature Select|@O Organics|De Cecco"],
  ["dry goods pasta", "Pasta", "Gluten Free Penne", "12 oz", 3.49, "v gf k", "", "Barilla|Banza|Jovial|@Open Nature"],
  ["dry goods pasta", "Pasta", "Chickpea Rotini", "8 oz", 3.99, "v gf", "", "Banza|@Open Nature"],
  ["dry goods pasta", "Pasta Sauce", "Marinara Sauce", "24 oz", 3.99, "v gf k", "", "Rao's Homemade|Prego|Barilla|@Signature Select|@O Organics"],
  ["dry goods pasta", "Pasta Sauce", "Basil Pesto", "6.7 oz", 4.99, "vg gf", "m tn", "Barilla|@Signature Select|Buitoni"],
  ["dry goods pasta", "Rice & Grains", "Jasmine Rice", "5 lb", 7.99, "v gf k", "", "Mahatma|@Signature Select|Lundberg"],
  ["dry goods pasta", "Rice & Grains", "Brown Rice", "2 lb", 3.49, "v gf k", "", "@Signature Select|Lundberg|@O Organics"],
  ["dry goods pasta", "Rice & Grains", "Quinoa", "16 oz", 5.49, "v gf k", "", "@O Organics|Ancient Harvest|Bob's Red Mill"],
  ["dry goods pasta", "Rice & Grains", "Instant Ramen Noodles", "6 ct", 3.99, "v", "w s", "Nissin|Maruchan|Immi"],
  ["canned goods", "Canned Beans", "Black Beans", "15 oz", 1.29, "v gf k", "", "Bush's|@Signature Select|@O Organics|S&W"],
  ["canned goods", "Canned Beans", "Pinto Beans", "15 oz", 1.29, "v gf k", "", "Bush's|@Signature Select|@O Organics"],
  ["canned goods", "Canned Beans", "Garbanzo Beans", "15 oz", 1.29, "v gf k", "", "Goya|@Signature Select|@O Organics"],
  ["canned goods", "Canned Beans", "Refried Beans", "16 oz", 1.99, "v gf k", "", "Rosarita|Old El Paso|@Signature Select"],
  ["canned goods", "Canned Tomatoes", "Diced Tomatoes", "14.5 oz", 1.49, "v gf k", "", "Hunt's|Muir Glen|@Signature Select|@O Organics"],
  ["canned goods", "Canned Tomatoes", "Tomato Paste", "6 oz", 0.99, "v gf k", "", "Hunt's|Contadina|@Signature Select"],
  ["canned goods", "Soup & Broth", "Chicken Broth Low Sodium", "32 oz", 2.99, "gf", "", "Swanson|Pacific Foods|@Signature Select|@O Organics"],
  ["canned goods", "Soup & Broth", "Vegetable Broth", "32 oz", 2.99, "v gf k", "", "Swanson|Pacific Foods|@Signature Select|@O Organics"],
  ["canned goods", "Soup & Broth", "Tomato Soup", "18.3 oz", 2.79, "vg", "m", "Progresso|Campbell's|@Signature Select|Pacific Foods"],
  ["canned goods", "Canned Fish", "Chunk Light Tuna in Water", "5 oz", 1.49, "gf", "f", "StarKist|Bumble Bee|@Waterfront Bistro|Wild Planet"],
  ["canned goods", "Canned Vegetables", "Coconut Milk", "13.5 oz", 2.49, "v gf k", "", "Thai Kitchen|@Signature Select|Native Forest"],
  ["pantry", "Baking", "All Purpose Flour", "5 lb", 4.49, "v k", "w", "Gold Medal|King Arthur|@Signature Select"],
  ["pantry", "Baking", "Granulated Sugar", "4 lb", 3.99, "v gf k", "", "C&H|@Signature Select"],
  ["pantry", "Baking", "Semi-Sweet Chocolate Chips", "12 oz", 3.99, "vg gf k", "m s", "Nestle Toll House|Ghirardelli|@Signature Select|Enjoy Life"],
  ["pantry", "Oils & Vinegars", "Extra Virgin Olive Oil", "16.9 fl oz", 8.99, "v gf k", "", "California Olive Ranch|Bertolli|@Signature Select|@O Organics"],
  ["pantry", "Oils & Vinegars", "Avocado Oil", "16.9 fl oz", 9.99, "v gf k", "", "Chosen Foods|@Signature Select"],
  ["pantry", "Oils & Vinegars", "Balsamic Vinegar", "16.9 fl oz", 4.99, "v gf k", "", "Pompeian|@Signature Select|@O Organics"],
  ["pantry", "Spices & Seasonings", "Taco Seasoning Mix", "1 oz", 1.29, "v gf", "", "Old El Paso|McCormick|@Signature Select"],
  ["pantry", "Spices & Seasonings", "Ground Cumin", "1.5 oz", 3.49, "v gf k", "", "McCormick|Simply Organic|@Signature Select"],
  ["pantry", "Spices & Seasonings", "Kosher Salt", "3 lb", 3.99, "v gf k", "", "Diamond Crystal|Morton|@Signature Select"],
  ["pantry", "Condiments", "Mayonnaise", "30 fl oz", 5.99, "gf k", "e", "Best Foods|Sir Kensington's|@Signature Select"],
  ["pantry", "Condiments", "Vegan Mayo", "24 fl oz", 5.99, "v gf k", "", "Hellmann's Vegan|Follow Your Heart|Sir Kensington's"],
  ["pantry", "Condiments", "Ketchup", "32 oz", 3.99, "v gf k", "", "Heinz|@Signature Select|@O Organics"],
  ["pantry", "Condiments", "Dijon Mustard", "12 oz", 3.49, "v gf k", "", "Grey Poupon|Maille|@Signature Select"],
  ["pantry", "Condiments", "Soy Sauce", "15 fl oz", 3.49, "v k", "s w", "Kikkoman|@Signature Select|San-J"],
  ["pantry", "Condiments", "Tamari Gluten Free Soy Sauce", "10 fl oz", 4.49, "v gf k", "s", "San-J|Kikkoman"],
  ["pantry", "Condiments", "Sriracha Hot Sauce", "17 oz", 4.49, "v gf", "", "Huy Fong|@Signature Select|Flying Goose"],
  ["pantry", "Spreads", "Creamy Peanut Butter", "16 oz", 3.49, "v gf k", "p", "Jif|Skippy|@Signature Select|@O Organics|Adams"],
  ["pantry", "Spreads", "Almond Butter", "12 oz", 7.99, "v gf k", "tn", "Justin's|Barney Butter|@O Organics"],
  ["pantry", "Spreads", "Sunflower Seed Butter", "16 oz", 5.99, "v gf k", "", "SunButter|@Open Nature"],
  ["pantry", "Spreads", "Strawberry Preserves", "18 oz", 3.99, "v gf k", "", "Smucker's|Bonne Maman|@Signature Select"],
  ["pantry", "Spreads", "Honey", "12 oz", 5.49, "vg gf k", "", "Nature Nate's|Sue Bee|@O Organics"],

  // Breakfast
  ["breakfast", "Cereal", "Honey Nut Cheerios", "10.8 oz", 4.99, "vg k", "", "General Mills"],
  ["breakfast", "Cereal", "Toasted Oats Cereal", "12 oz", 2.99, "vg k", "", "@Signature Select|@O Organics|Cheerios"],
  ["breakfast", "Cereal", "Granola Honey Almond", "12 oz", 4.99, "vg k", "tn", "Nature's Path|Bear Naked|@O Organics|@Open Nature"],
  ["breakfast", "Cereal", "Gluten Free Granola", "11 oz", 5.99, "v gf", "", "Purely Elizabeth|@Open Nature|Bob's Red Mill"],
  ["breakfast", "Oatmeal", "Old Fashioned Rolled Oats", "42 oz", 5.49, "v k", "", "Quaker|@Signature Select|@O Organics|Bob's Red Mill"],
  ["breakfast", "Oatmeal", "Instant Oatmeal Maple Brown Sugar", "10 ct", 3.99, "v k", "", "Quaker|@Signature Select|@O Organics"],
  ["breakfast", "Pancake Mix", "Buttermilk Pancake Mix", "32 oz", 3.99, "vg k", "w m", "Krusteaz|Bisquick|@Signature Select"],
  ["breakfast", "Pancake Mix", "Pure Maple Syrup", "12.5 fl oz", 8.99, "v gf k", "", "Coombs Family Farms|@O Organics|@Signature Select"],

  // Snacks
  ["snacks", "Chips", "Tortilla Chips", "13 oz", 4.29, "v gf k", "", "Tostitos|Late July|@Signature Select|Siete"],
  ["snacks", "Chips", "Potato Chips Sea Salt", "8 oz", 4.49, "v gf k", "", "Kettle Brand|Lay's|@Signature Select|Cape Cod"],
  ["snacks", "Crackers", "Whole Wheat Crackers", "8.5 oz", 3.99, "v k", "w", "Triscuit|@Signature Select|Mary's Gone Crackers"],
  ["snacks", "Crackers", "Cheddar Bunnies", "7.5 oz", 3.99, "vg k", "w m", "Annie's|Goldfish|@O Organics"],
  ["snacks", "Bars", "Chewy Granola Bars", "8 ct", 3.99, "vg k", "", "Nature Valley|Quaker|@Signature Select|@O Organics"],
  ["snacks", "Bars", "Protein Bars Chocolate Peanut Butter", "4 ct", 7.99, "vg gf", "p m s", "Clif Builders|RXBAR|Kind"],
  ["snacks", "Nuts & Trail Mix", "Roasted Almonds", "16 oz", 7.99, "v gf k", "tn", "Blue Diamond|@Signature Select|Wonderful"],
  ["snacks", "Nuts & Trail Mix", "Trail Mix", "26 oz", 8.99, "vg gf", "p tn", "@Signature Select|Kirkland Signature|Planters"],
  ["snacks", "Popcorn", "Sea Salt Popcorn", "4.4 oz", 3.49, "v gf k", "", "SkinnyPop|Boom Chicka Pop|@Signature Select"],
  ["snacks", "Fruit Snacks", "Fruit Snacks", "10 ct", 3.49, "gf", "", "Annie's|Welch's|@Signature Select|@O Organics"],
  ["snacks", "Cookies", "Chocolate Sandwich Cookies", "14.3 oz", 4.49, "v k", "w s", "Oreo|@Signature Select|Newman's Own"],

  // Beverages
  ["beverages", "Coffee", "Medium Roast Ground Coffee", "12 oz", 9.99, "v gf k", "", "Peet's Coffee|Philz Coffee|@Signature Select|@O Organics|Starbucks"],
  ["beverages", "Coffee", "Cold Brew Coffee", "48 fl oz", 6.99, "v gf k", "", "Stumptown|Chameleon|@Signature Select"],
  ["beverages", "Tea", "Green Tea Bags", "20 ct", 3.99, "v gf k", "", "Bigelow|Tazo|@O Organics"],
  ["beverages", "Juice", "Orange Juice No Pulp", "52 fl oz", 4.99, "v gf k", "", "Tropicana|Simply Orange|@Signature Select|@O Organics"],
  ["beverages", "Juice", "Apple Juice", "64 fl oz", 3.99, "v gf k", "", "Martinelli's|@Signature Select|@O Organics"],
  ["beverages", "Sparkling Water", "Sparkling Water Lime", "8 pk", 4.99, "v gf k", "", "LaCroix|Bubly|@Soleil|Spindrift"],
  ["beverages", "Soda", "Cola", "12 pk", 8.99, "v gf k", "", "Coca-Cola|Pepsi|@Signature Select"],
  ["beverages", "Water", "Spring Water", "24 pk", 5.99, "v gf k", "", "Crystal Geyser|Arrowhead|@Signature Select"],
  ["beverages", "Kombucha", "Kombucha Ginger", "16 fl oz", 3.99, "v gf", "", "GT's|Health-Ade|Humm"],

  // Frozen
  ["frozen", "Frozen Pizza", "Margherita Pizza", "15 oz", 7.99, "vg", "w m", "Amy's|DiGiorno|@Signature Select|Newman's Own"],
  ["frozen", "Frozen Vegetables", "Frozen Broccoli Florets", "12 oz", 2.29, "v gf k", "", "Birds Eye|@Signature Select|@O Organics|Green Giant"],
  ["frozen", "Frozen Vegetables", "Frozen Sweet Corn", "16 oz", 2.29, "v gf k", "", "Birds Eye|@Signature Select|@O Organics"],
  ["frozen", "Frozen Vegetables", "Frozen Peas", "16 oz", 2.29, "v gf k", "", "Birds Eye|@Signature Select|@O Organics"],
  ["frozen", "Frozen Fruit", "Frozen Mixed Berries", "48 oz", 11.99, "v gf k", "", "@Signature Select|@O Organics|Wyman's"],
  ["frozen", "Frozen Meals", "Bean & Cheese Burritos", "6 ct", 6.99, "vg", "w m", "Amy's|El Monterey|@Signature Select"],
  ["frozen", "Frozen Meals", "Vegetable Fried Rice", "20 oz", 4.99, "v", "s w", "Trader Ming's|Ling Ling|@Signature Select"],
  ["frozen", "Ice Cream", "Vanilla Ice Cream", "1.5 qt", 5.99, "vg gf k", "m e", "Tillamook|Häagen-Dazs|@Signature Select|Breyers"],
  ["frozen", "Ice Cream", "Oat Milk Frozen Dessert Chocolate", "16 oz", 5.99, "v", "", "Oatly|So Delicious|Ben & Jerry's Non-Dairy"],
  ["frozen", "Frozen Breakfast", "Frozen Waffles", "10 ct", 3.49, "vg k", "w m e", "Eggo|Van's|@Signature Select"],

  // International
  ["international", "Asian Foods", "Coconut Curry Simmer Sauce", "12 oz", 4.49, "v gf", "", "Maya Kaimal|@Signature Select|Thai Kitchen"],
  ["international", "Asian Foods", "Rice Noodles", "14 oz", 3.49, "v gf k", "", "Thai Kitchen|A Taste of Thai|@Signature Select"],
  ["international", "Latin Foods", "Green Chile Enchilada Sauce", "15 oz", 2.79, "v gf", "", "Old El Paso|Hatch|@Signature Select|Las Palmas"],

  // Babies
  ["babies", "Baby Food", "Baby Food Pouch Apple Spinach", "4 oz", 1.99, "v gf k", "", "Happy Baby|Plum Organics|@O Organics|Gerber"],
  ["babies", "Diapers", "Diapers Size 4", "60 ct", 22.99, "", "", "Pampers|Huggies|@Signature Care"],
  ["babies", "Formula", "Infant Formula Milk-Based", "20.7 oz", 34.99, "vg gf", "m s", "Similac|Enfamil|@Signature Care"],

  // Household & personal care
  ["household", "Paper Goods", "Paper Towels", "6 rolls", 12.99, "", "", "Bounty|Viva|@Signature Select"],
  ["household", "Paper Goods", "Toilet Paper", "12 rolls", 13.99, "", "", "Charmin|Cottonelle|@Signature Select|Seventh Generation"],
  ["household", "Cleaning", "Dish Soap", "19.4 fl oz", 3.99, "", "", "Dawn|Seventh Generation|@Signature Select|Mrs. Meyer's"],
  ["household", "Cleaning", "Laundry Detergent", "92 fl oz", 14.99, "", "", "Tide|Seventh Generation|@Signature Select|all"],
  ["household", "Food Storage", "Gallon Freezer Bags", "28 ct", 5.49, "", "", "Ziploc|Glad|@Signature Select"],
  ["personal care", "Oral Care", "Fluoride Toothpaste", "4.8 oz", 4.49, "", "", "Colgate|Crest|@Signature Care|Tom's of Maine"],
  ["personal care", "Hair Care", "Shampoo", "12 fl oz", 6.99, "", "", "Pantene|Head & Shoulders|@Signature Care|Dove"],
];

export const ALLERGEN_CODES: Record<string, Allergen> = {
  m: "milk", e: "eggs", p: "peanuts", tn: "tree_nuts", s: "soy", w: "wheat", f: "fish", sh: "shellfish", se: "sesame",
};
export const TAG_CODES: Record<string, DietTag> = { v: "vegan", vg: "vegetarian", gf: "gluten_free", k: "kosher", o: "organic" };
export const NON_FOOD_DEPARTMENTS = new Set(["household", "personal care"]);

export function parseTags(tags: string): DietTag[] {
  return tags.split(" ").filter(Boolean).map((c) => TAG_CODES[c]);
}

export function parseAllergens(spec: string): Allergen[] {
  return spec.split(" ").filter(Boolean).map((c) => ALLERGEN_CODES[c]);
}

// Diet tags for one concrete product: base tags + what we can derive from allergens and the name.
export function deriveDietTags(baseTags: string, allergens: Allergen[], department: string, name: string): DietTag[] {
  const diet = new Set(parseTags(baseTags));
  if (/organic/i.test(name)) diet.add("organic");
  if (/gluten[- ]free/i.test(name)) diet.add("gluten_free");
  if (diet.has("vegan")) diet.add("vegetarian");
  if (!NON_FOOD_DEPARTMENTS.has(department)) {
    if (!allergens.includes("milk")) diet.add("dairy_free");
    if (!allergens.includes("peanuts") && !allergens.includes("tree_nuts")) diet.add("nut_free");
  }
  return [...diet].sort();
}
