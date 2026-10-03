import type { Product } from "@/lib/types";

export const DEMO_STORE = { id: "safeway-sf-01", name: "Safeway-style demo store · Market St" };

export const OUT_OF_STOCK = new Set(["sw-001"]);

export const KIND: Record<string, string> = {
  "sw-001": "oat-milk",
  "sw-002": "oat-milk",
  "sw-003": "oat-milk",
  "sw-004": "oat-milk",
  "sw-005": "pasta",
  "sw-006": "pasta",
  "sw-007": "sauce",
  "sw-008": "sauce",
  "sw-017": "bread",
  "sw-019": "bread",
};

export const CATALOG: Product[] = [
  {
    "id": "sw-001",
    "name": "Oatly Oat Milk Barista Edition",
    "brand": "Oatly",
    "store_brand": false,
    "department": "Dairy alternatives",
    "aisle": "7",
    "size": "32 fl oz",
    "price": 5.49,
    "diet_tags": [
      "vegan",
      "dairy_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTnVh7gSGfHQJ8aEkKdS_20v10hcXDsqBq2Jt90NsSH5hhnX2nJMw0bjAtNgJaOKxFXxC5D_E0wf41Y35mbgN6P6vAPdrmZhvrN7Jy1F8cVlbH_zk-B6e2iWw"
  },
  {
    "id": "sw-002",
    "name": "O Organics Oat Milk Original",
    "brand": "O Organics",
    "store_brand": true,
    "department": "Dairy alternatives",
    "aisle": "7",
    "size": "64 fl oz",
    "price": 3.99,
    "diet_tags": [
      "vegan",
      "dairy_free",
      "organic"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRXsYv-OtAFt0zVU2NdJBfDGzz57JqcL-cafgxY6X4wVq0m3bdy5YVO1JEoFoh3-k2PcQBR295-rL8NZUvvzIqWs3TSvdBd57ijzExB_A"
  },
  {
    "id": "sw-003",
    "name": "Califia Farms Barista Blend Oat Milk",
    "brand": "Califia Farms",
    "store_brand": false,
    "department": "Dairy alternatives",
    "aisle": "7",
    "size": "32 fl oz",
    "price": 4.99,
    "diet_tags": [
      "vegan",
      "dairy_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcTOmiSvrG0lgaYWMiEW2XKAkXvncmeYDpu4NjV0uDZEbGAMQwnhGyidOtVl9szEUEiLtRrvLZLnTBva1Y32Tg0kNws9sB6gZ7gdNQ-bCA"
  },
  {
    "id": "sw-004",
    "name": "Pacific Foods Barista Series Oat",
    "brand": "Pacific Foods",
    "store_brand": false,
    "department": "Dairy alternatives",
    "aisle": "7",
    "size": "32 fl oz",
    "price": 3.89,
    "diet_tags": [
      "vegan",
      "dairy_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQBX5AeeXRsboX7V9Jq48EwMtu7U6ew8Qv39q4CIKv6HTVkwTXeWou_tyEhqfUlnaL-1yPn3mqaYhIuBtBZpLZKhFoi_XmbBwVmelamw7iSfU5oprolhnr4"
  },
  {
    "id": "sw-005",
    "name": "Signature Select Penne Rigate",
    "brand": "Signature Select",
    "store_brand": true,
    "department": "Pasta & sauces",
    "aisle": "9",
    "size": "16 oz",
    "price": 1.29,
    "diet_tags": [
      "vegan",
      "vegetarian"
    ],
    "allergens": [
      "wheat"
    ],
    "image_url": "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTJRK9ZmhXQmv3QBIsgI6X9ohMv-6I5p36ORjJvF4iBbM7ESpuWXrW3SC0LSeTC7nXtJgXz5zPQXti8CYFp0OOtcDWYwJsJ0PCVaL6YDNDDjfhKltPOx4_h"
  },
  {
    "id": "sw-006",
    "name": "Barilla Penne",
    "brand": "Barilla",
    "store_brand": false,
    "department": "Pasta & sauces",
    "aisle": "9",
    "size": "16 oz",
    "price": 2.19,
    "diet_tags": [
      "vegan",
      "vegetarian"
    ],
    "allergens": [
      "wheat"
    ],
    "image_url": "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcQ7MtJKJ-V8GHq8SxpQvfVUkRbk7Z6oKRfVOwIb15vOCuJXlC8A8yxYpoigVs_153TwrOUEwazey9fVYBLqnCMcCaKZT722pHsM7eNaczNkiBJD6_k2w21M"
  },
  {
    "id": "sw-007",
    "name": "Rao's Homemade Marinara Sauce",
    "brand": "Rao's",
    "store_brand": false,
    "department": "Pasta & sauces",
    "aisle": "9",
    "size": "24 oz",
    "price": 8.99,
    "diet_tags": [
      "vegan",
      "vegetarian",
      "gluten_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcSP5VpgYEWN68I6nFvuzhQKFoaBcJQOkcoq4r7oZXga1rHZN2-FUsMDmcYXMXREdhhArosLwQNt847axE_M2zD0y8xGKUbV"
  },
  {
    "id": "sw-008",
    "name": "Signature Select Marinara Sauce",
    "brand": "Signature Select",
    "store_brand": true,
    "department": "Pasta & sauces",
    "aisle": "9",
    "size": "24 oz",
    "price": 2.99,
    "diet_tags": [
      "vegan",
      "vegetarian"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcSSmNwWI2SoRhQtHLc1Nyx6IclofL_4_RV1o1h2LRbGV2M6MwO3etrKPp3K9YMWmW_yYIwu8ztrkbtk13WtpThhGPetwMPHVsaY3HlBu9OYxw_YRCLGPf7O"
  },
  {
    "id": "sw-009",
    "name": "Parmigiano Reggiano Wedge",
    "brand": "Primo Taglio",
    "store_brand": true,
    "department": "Cheese",
    "aisle": "4",
    "size": "8 oz",
    "price": 8.99,
    "diet_tags": [
      "vegetarian",
      "gluten_free"
    ],
    "allergens": [
      "milk"
    ],
    "image_url": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcTueKxcFz5GqsuLXrfaBcmUWMrpSlpYlkZ_f8P1hUxBUmlKzKVXzSmmrfxNyv3IsyC6Zpbx7lQAJ-8hdQaWFUa_A66c0wNLReSFCnTXC32mCbL_AIlJEiOE"
  },
  {
    "id": "sw-010",
    "name": "O Organics Baby Spinach",
    "brand": "O Organics",
    "store_brand": true,
    "department": "Produce",
    "aisle": "1",
    "size": "5 oz",
    "price": 3.99,
    "diet_tags": [
      "vegan",
      "vegetarian",
      "gluten_free",
      "organic"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRyfe6GggrN07KKIjOXsPXuT_UnbLDOpDUabEYWd7mBQFt5jWMLSqmqX-nVQiIHOx47UzUItAmnkNhaQw0O29gr-druzZ31Vg"
  },
  {
    "id": "sw-011",
    "name": "Fresh Basil",
    "brand": "Signature Farms",
    "store_brand": true,
    "department": "Produce",
    "aisle": "1",
    "size": "0.75 oz",
    "price": 2.49,
    "diet_tags": [
      "vegan",
      "vegetarian",
      "gluten_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTaio5WGNbssr6GESODuJuLGSDm4C6BQgOVwcGne4kvESIYPJJgsOfVfFssF2OpLnzoHikCDRUywd190MsisN9-w1wL34yf"
  },
  {
    "id": "sw-012",
    "name": "Bananas",
    "brand": "Produce",
    "store_brand": false,
    "department": "Produce",
    "aisle": "1",
    "size": "~2 lb bunch",
    "price": 1.74,
    "diet_tags": [
      "vegan",
      "vegetarian",
      "gluten_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRIVImb3dwR5Ha11a6JQgd2ew-cfsXpsvPGLxL-5SNXgnnmIIimrL_xhC4_LPUU5mKbLqB4BUyrWK3FsBZ_nTAJj4Bj5zEx8T-odG0An70"
  },
  {
    "id": "sw-013",
    "name": "Chobani Plain Greek Yogurt",
    "brand": "Chobani",
    "store_brand": false,
    "department": "Dairy",
    "aisle": "6",
    "size": "32 oz",
    "price": 5.99,
    "diet_tags": [
      "vegetarian",
      "gluten_free"
    ],
    "allergens": [
      "milk"
    ],
    "image_url": "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcQOU1VEPywH2r62SRcXgCzY6GTCXzmt4H4HxbqGsj0zyW0NyKPKREF6ojgYxNE70hpfi1hU1j1lt3eglqOLLdyg6GK0oxUXU4C1HvZcPRYGjShAdRUUbxe4"
  },
  {
    "id": "sw-014",
    "name": "Garlic",
    "brand": "Produce",
    "store_brand": false,
    "department": "Produce",
    "aisle": "1",
    "size": "3 ct",
    "price": 1.49,
    "diet_tags": [
      "vegan",
      "vegetarian",
      "gluten_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRg4ymjlKVNLMcgbRznN9umhuDPTdnFvaSOqZFOwrMMNun-YJBahJBe38StZnI1GFOTQH0oX2KHrvZGH0CY1y2KsH7x60bfNjxPmWv2KYI"
  },
  {
    "id": "sw-015",
    "name": "Ground Beef 80/20",
    "brand": "Signature Farms",
    "store_brand": true,
    "department": "Meat",
    "aisle": "12",
    "size": "1 lb",
    "price": 5.99,
    "diet_tags": [
      "gluten_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcR6V9uYqoZsV--7t4xSZhClWPPWyfInS0XSIwvOL_cv9WHhA26PtqhCQrX2rUvYbTfN7MJiyPyqkJVnwfNg45sLbGrjXGaq4PHlfo37lgC-3fYG7cSLymiC"
  },
  {
    "id": "sw-016",
    "name": "Boneless Chicken Breast",
    "brand": "Signature Farms",
    "store_brand": true,
    "department": "Meat",
    "aisle": "12",
    "size": "1.5 lb",
    "price": 8.99,
    "diet_tags": [
      "gluten_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRBCH1j6NG4TC5C3aKY9xuCiWHqakG_H9QDW0K7qNfJhEzoggj-3b8FWk2hGv6yx7fK_2KusPyBRsbf7Snq2uqQAUtTHTPiZe4mxZeyKKsl5T5_Aid-1LaX"
  },
  {
    "id": "sw-017",
    "name": "Sourdough Bread",
    "brand": "Signature Select",
    "store_brand": true,
    "department": "Bakery",
    "aisle": "3",
    "size": "24 oz",
    "price": 4.99,
    "diet_tags": [
      "vegan",
      "vegetarian"
    ],
    "allergens": [
      "wheat"
    ],
    "image_url": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcSNXMx1Eqrg1rCwINkRcYWuT8Y69ywM-g8oH4a-lbDdoA2XKJQkcA89pookLAyU7TN5lTl3ydSvbBaHmnZUsEL2UQeHSBL7YpEemvCA5qY"
  },
  {
    "id": "sw-018",
    "name": "O Organics Extra Virgin Olive Oil",
    "brand": "O Organics",
    "store_brand": true,
    "department": "Pantry",
    "aisle": "8",
    "size": "16.9 fl oz",
    "price": 8.99,
    "diet_tags": [
      "vegan",
      "vegetarian",
      "gluten_free",
      "organic"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRI_XZpeMKssRyBYxTXwA0IbMfuOJ9cDtiTwxsnKYYLOEF-44m96tDuxufwtnBSKl1MinP6vhSqI4_BSzgJ6jY4gzl1hseYj9LyVKEYLSZgl5PQKEagjaTW"
  },
  {
    "id": "sw-019",
    "name": "Acme Bread Pain au Levain",
    "brand": "Acme Bread Co.",
    "store_brand": false,
    "department": "Bakery",
    "aisle": "3",
    "size": "1.5 lb",
    "price": 7.49,
    "diet_tags": [
      "vegan",
      "vegetarian"
    ],
    "allergens": [
      "wheat"
    ],
    "image_url": "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQ7gdZxm_rUWZelWw9jc3YRzRgkgrYFk_SfPB5Hqqn85H04Q5eHZ87MmqfdsJtP31YfWknmyXaEUgOeKyP0IOhLoP3sdSkckPHRdDmoFn5f"
  },
  {
    "id": "sw-020",
    "name": "Strawberries",
    "brand": "Produce",
    "store_brand": false,
    "department": "Produce",
    "aisle": "1",
    "size": "1 lb",
    "price": 4.99,
    "diet_tags": [
      "vegan",
      "vegetarian",
      "gluten_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTztW4RlhaHYsZN8R1emUYXGH83K2dPQ45cjsiAMxm6iyQqjc3EuWXjlfNKaWwgKBWIfm1ynvGjQNThjzq1kAz8haoedGosPEU2LwsKf1LH"
  },
  {
    "id": "sw-021",
    "name": "O Organics Large Brown Eggs",
    "brand": "O Organics",
    "store_brand": true,
    "department": "Dairy",
    "aisle": "6",
    "size": "12 ct",
    "price": 5.99,
    "diet_tags": [
      "vegetarian",
      "gluten_free",
      "organic"
    ],
    "allergens": [
      "eggs"
    ],
    "image_url": "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcS9FKBv_stYRiEpVkk5DKf6GhhzcChbbL7QkVHVU3KzTREK_qsFDI4PxVZZjD6SD_InMSf8vV8rEXuyss-ck49-wjF5es_NjuRxvqPnSg5xnQV1qCUDqCHx"
  },
  {
    "id": "sw-022",
    "name": "Philz Coffee Tesora Whole Bean",
    "brand": "Philz Coffee",
    "store_brand": false,
    "department": "Coffee & tea",
    "aisle": "8",
    "size": "12 oz",
    "price": 15.99,
    "diet_tags": [
      "vegan",
      "vegetarian",
      "gluten_free"
    ],
    "allergens": [],
    "image_url": "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRD1TfeGdarBdqUP-JXS3SuK-65LBEE6CTPTvVRJmi1KweNITNV0CJ0QbIdJ6HS11S8hrUQSfGBngAO1buUe2HqyCJZFWRweXBhKt8PAjmuz8zfMqM1MBFCwA"
  }
];

export const productById = (id: string) => CATALOG.find((p) => p.id === id);
