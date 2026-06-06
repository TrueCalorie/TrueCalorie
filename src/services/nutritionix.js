import { supabase } from '../supabase'

/**
 * Nutritionix service module.
 *
 * In dev / pre-activation (no keys), returns realistic mock data from official
 * chain nutrition pages so athletes can use restaurant search immediately.
 * When VITE_NUTRITIONIX_APP_ID and VITE_NUTRITIONIX_APP_KEY exist, hits the real API.
 *
 * Components should NEVER call Nutritionix directly. Always go through here.
 * Swap-in: set env vars → delete MOCK_RESTAURANTS → done.
 *
 * Macro data sourced from official restaurant nutrition pages (all publicly available).
 * Values are per stated serving. Customizations (add-ons, sauces, cheese) not included
 * unless part of the standard item name. Nutritionix will replace these with exact data.
 */


// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — 28 chains, ~250 items
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_RESTAURANTS = [

  // ── Chipotle ──────────────────────────────────────────────────────────────
  { food_name: 'Chicken Burrito Bowl',         brand_name: 'Chipotle', nf_calories: 630,  nf_protein: 45, nf_total_carbohydrate: 58,  nf_total_fat: 23, serving_unit: 'bowl',     serving_qty: 1 },
  { food_name: 'Steak Burrito',                brand_name: 'Chipotle', nf_calories: 940,  nf_protein: 47, nf_total_carbohydrate: 110, nf_total_fat: 33, serving_unit: 'burrito',  serving_qty: 1 },
  { food_name: 'Carnitas Burrito Bowl',        brand_name: 'Chipotle', nf_calories: 705,  nf_protein: 38, nf_total_carbohydrate: 63,  nf_total_fat: 32, serving_unit: 'bowl',     serving_qty: 1 },
  { food_name: 'Barbacoa Burrito Bowl',        brand_name: 'Chipotle', nf_calories: 665,  nf_protein: 43, nf_total_carbohydrate: 58,  nf_total_fat: 26, serving_unit: 'bowl',     serving_qty: 1 },
  { food_name: 'Sofritas Burrito Bowl',        brand_name: 'Chipotle', nf_calories: 580,  nf_protein: 22, nf_total_carbohydrate: 70,  nf_total_fat: 22, serving_unit: 'bowl',     serving_qty: 1 },
  { food_name: 'Veggie Burrito Bowl',          brand_name: 'Chipotle', nf_calories: 505,  nf_protein: 16, nf_total_carbohydrate: 68,  nf_total_fat: 18, serving_unit: 'bowl',     serving_qty: 1 },
  { food_name: 'Chorizo Burrito Bowl',         brand_name: 'Chipotle', nf_calories: 695,  nf_protein: 38, nf_total_carbohydrate: 61,  nf_total_fat: 30, serving_unit: 'bowl',     serving_qty: 1 },
  { food_name: 'Chicken Tacos (3)',            brand_name: 'Chipotle', nf_calories: 470,  nf_protein: 35, nf_total_carbohydrate: 48,  nf_total_fat: 14, serving_unit: 'order',    serving_qty: 1 },
  { food_name: 'Chicken Salad Bowl',           brand_name: 'Chipotle', nf_calories: 545,  nf_protein: 42, nf_total_carbohydrate: 35,  nf_total_fat: 25, serving_unit: 'salad',   serving_qty: 1 },
  { food_name: 'Chips & Guacamole',            brand_name: 'Chipotle', nf_calories: 770,  nf_protein: 9,  nf_total_carbohydrate: 88,  nf_total_fat: 44, serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'Chicken Burrito',              brand_name: 'Chipotle', nf_calories: 855,  nf_protein: 51, nf_total_carbohydrate: 98,  nf_total_fat: 28, serving_unit: 'burrito', serving_qty: 1 },

  // ── Chick-fil-A ───────────────────────────────────────────────────────────
  { food_name: 'Grilled Chicken Sandwich',           brand_name: 'Chick-fil-A', nf_calories: 390, nf_protein: 28, nf_total_carbohydrate: 44, nf_total_fat: 12, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Spicy Deluxe Chicken Sandwich',      brand_name: 'Chick-fil-A', nf_calories: 550, nf_protein: 33, nf_total_carbohydrate: 48, nf_total_fat: 24, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Chicken Nuggets (12 ct)',            brand_name: 'Chick-fil-A', nf_calories: 380, nf_protein: 40, nf_total_carbohydrate: 16, nf_total_fat: 18, serving_unit: 'order',    serving_qty: 1 },
  { food_name: 'Grilled Nuggets (12 ct)',            brand_name: 'Chick-fil-A', nf_calories: 200, nf_protein: 38, nf_total_carbohydrate: 2,  nf_total_fat: 5,  serving_unit: 'order',    serving_qty: 1 },
  { food_name: 'Cobb Salad with Grilled Chicken',    brand_name: 'Chick-fil-A', nf_calories: 440, nf_protein: 41, nf_total_carbohydrate: 19, nf_total_fat: 24, serving_unit: 'salad',    serving_qty: 1 },
  { food_name: 'Grilled Cool Wrap',                  brand_name: 'Chick-fil-A', nf_calories: 350, nf_protein: 37, nf_total_carbohydrate: 27, nf_total_fat: 12, serving_unit: 'wrap',     serving_qty: 1 },
  { food_name: 'Chicken Biscuit',                    brand_name: 'Chick-fil-A', nf_calories: 450, nf_protein: 20, nf_total_carbohydrate: 48, nf_total_fat: 19, serving_unit: 'biscuit',  serving_qty: 1 },
  { food_name: 'Egg White Grill',                    brand_name: 'Chick-fil-A', nf_calories: 300, nf_protein: 26, nf_total_carbohydrate: 30, nf_total_fat: 7,  serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Mac & Cheese (large)',               brand_name: 'Chick-fil-A', nf_calories: 450, nf_protein: 19, nf_total_carbohydrate: 42, nf_total_fat: 24, serving_unit: 'side',     serving_qty: 1 },
  { food_name: 'Waffle Potato Fries (medium)',       brand_name: 'Chick-fil-A', nf_calories: 400, nf_protein: 6,  nf_total_carbohydrate: 50, nf_total_fat: 21, serving_unit: 'medium',   serving_qty: 1 },

  // ── Starbucks ─────────────────────────────────────────────────────────────
  { food_name: 'Caffè Latte (grande, 2% milk)',              brand_name: 'Starbucks', nf_calories: 190, nf_protein: 12, nf_total_carbohydrate: 19, nf_total_fat: 7,  serving_unit: 'grande',  serving_qty: 1 },
  { food_name: 'Caramel Macchiato (grande, 2% milk)',        brand_name: 'Starbucks', nf_calories: 250, nf_protein: 10, nf_total_carbohydrate: 37, nf_total_fat: 7,  serving_unit: 'grande',  serving_qty: 1 },
  { food_name: 'Iced Brown Sugar Oat Shaken Espresso (grande)', brand_name: 'Starbucks', nf_calories: 120, nf_protein: 2, nf_total_carbohydrate: 25, nf_total_fat: 3, serving_unit: 'grande', serving_qty: 1 },
  { food_name: 'Strawberry Acai Refresher (grande)',         brand_name: 'Starbucks', nf_calories: 130, nf_protein: 0,  nf_total_carbohydrate: 31, nf_total_fat: 0,  serving_unit: 'grande',  serving_qty: 1 },
  { food_name: 'Egg White & Roasted Red Pepper Egg Bites',   brand_name: 'Starbucks', nf_calories: 170, nf_protein: 13, nf_total_carbohydrate: 13, nf_total_fat: 8,  serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'Bacon & Gruyere Egg Bites',                  brand_name: 'Starbucks', nf_calories: 300, nf_protein: 19, nf_total_carbohydrate: 9,  nf_total_fat: 22, serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'Spinach, Feta & Egg White Wrap',             brand_name: 'Starbucks', nf_calories: 290, nf_protein: 20, nf_total_carbohydrate: 33, nf_total_fat: 8,  serving_unit: 'wrap',    serving_qty: 1 },
  { food_name: 'Turkey, Provolone & Pesto Sandwich',         brand_name: 'Starbucks', nf_calories: 490, nf_protein: 26, nf_total_carbohydrate: 52, nf_total_fat: 19, serving_unit: 'sandwich',serving_qty: 1 },
  { food_name: 'Protein Box Eggs & Cheese',                  brand_name: 'Starbucks', nf_calories: 470, nf_protein: 25, nf_total_carbohydrate: 40, nf_total_fat: 25, serving_unit: 'box',     serving_qty: 1 },
  { food_name: 'Pumpkin Cream Cheese Muffin',                brand_name: 'Starbucks', nf_calories: 350, nf_protein: 5,  nf_total_carbohydrate: 52, nf_total_fat: 14, serving_unit: 'muffin',  serving_qty: 1 },

  // ── McDonald's ────────────────────────────────────────────────────────────
  { food_name: 'Big Mac',                          brand_name: "McDonald's", nf_calories: 590, nf_protein: 25, nf_total_carbohydrate: 46, nf_total_fat: 34, serving_unit: 'burger',   serving_qty: 1 },
  { food_name: 'Quarter Pounder with Cheese',      brand_name: "McDonald's", nf_calories: 520, nf_protein: 30, nf_total_carbohydrate: 42, nf_total_fat: 26, serving_unit: 'burger',   serving_qty: 1 },
  { food_name: 'Double Quarter Pounder with Cheese', brand_name: "McDonald's", nf_calories: 740, nf_protein: 48, nf_total_carbohydrate: 43, nf_total_fat: 43, serving_unit: 'burger', serving_qty: 1 },
  { food_name: 'McDouble',                         brand_name: "McDonald's", nf_calories: 400, nf_protein: 25, nf_total_carbohydrate: 35, nf_total_fat: 20, serving_unit: 'burger',   serving_qty: 1 },
  { food_name: 'McChicken',                        brand_name: "McDonald's", nf_calories: 400, nf_protein: 14, nf_total_carbohydrate: 39, nf_total_fat: 21, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Crispy Chicken Sandwich',          brand_name: "McDonald's", nf_calories: 470, nf_protein: 26, nf_total_carbohydrate: 46, nf_total_fat: 20, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Filet-O-Fish',                     brand_name: "McDonald's", nf_calories: 390, nf_protein: 16, nf_total_carbohydrate: 39, nf_total_fat: 19, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Egg McMuffin',                     brand_name: "McDonald's", nf_calories: 310, nf_protein: 17, nf_total_carbohydrate: 30, nf_total_fat: 13, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Sausage McMuffin with Egg',        brand_name: "McDonald's", nf_calories: 480, nf_protein: 21, nf_total_carbohydrate: 30, nf_total_fat: 31, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Medium French Fries',              brand_name: "McDonald's", nf_calories: 320, nf_protein: 4,  nf_total_carbohydrate: 44, nf_total_fat: 14, serving_unit: 'medium',   serving_qty: 1 },
  { food_name: 'Chicken McNuggets (10 pc)',         brand_name: "McDonald's", nf_calories: 410, nf_protein: 23, nf_total_carbohydrate: 26, nf_total_fat: 24, serving_unit: 'order',    serving_qty: 1 },

  // ── Subway ────────────────────────────────────────────────────────────────
  { food_name: 'Turkey Breast 6"',         brand_name: 'Subway', nf_calories: 280, nf_protein: 18, nf_total_carbohydrate: 46, nf_total_fat: 4,  serving_unit: '6 inch', serving_qty: 1 },
  { food_name: 'Rotisserie-Style Chicken 6"', brand_name: 'Subway', nf_calories: 330, nf_protein: 29, nf_total_carbohydrate: 46, nf_total_fat: 5, serving_unit: '6 inch', serving_qty: 1 },
  { food_name: 'Italian B.M.T. 6"',        brand_name: 'Subway', nf_calories: 410, nf_protein: 21, nf_total_carbohydrate: 47, nf_total_fat: 16, serving_unit: '6 inch', serving_qty: 1 },
  { food_name: 'Spicy Italian 6"',         brand_name: 'Subway', nf_calories: 480, nf_protein: 20, nf_total_carbohydrate: 46, nf_total_fat: 24, serving_unit: '6 inch', serving_qty: 1 },
  { food_name: 'Meatball Marinara 6"',     brand_name: 'Subway', nf_calories: 480, nf_protein: 22, nf_total_carbohydrate: 55, nf_total_fat: 18, serving_unit: '6 inch', serving_qty: 1 },
  { food_name: 'Steak & Cheese 6"',        brand_name: 'Subway', nf_calories: 370, nf_protein: 25, nf_total_carbohydrate: 46, nf_total_fat: 9,  serving_unit: '6 inch', serving_qty: 1 },
  { food_name: 'Tuna 6"',                  brand_name: 'Subway', nf_calories: 480, nf_protein: 21, nf_total_carbohydrate: 46, nf_total_fat: 24, serving_unit: '6 inch', serving_qty: 1 },
  { food_name: 'Black Forest Ham 6"',      brand_name: 'Subway', nf_calories: 290, nf_protein: 18, nf_total_carbohydrate: 46, nf_total_fat: 5,  serving_unit: '6 inch', serving_qty: 1 },
  { food_name: 'Veggie Delite 6"',         brand_name: 'Subway', nf_calories: 200, nf_protein: 8,  nf_total_carbohydrate: 40, nf_total_fat: 3,  serving_unit: '6 inch', serving_qty: 1 },

  // ── Panera Bread ──────────────────────────────────────────────────────────
  { food_name: 'Mediterranean Bowl with Chicken',      brand_name: 'Panera Bread', nf_calories: 530, nf_protein: 32, nf_total_carbohydrate: 56, nf_total_fat: 19, serving_unit: 'bowl',     serving_qty: 1 },
  { food_name: 'Chipotle Chicken Avocado Melt',        brand_name: 'Panera Bread', nf_calories: 720, nf_protein: 44, nf_total_carbohydrate: 70, nf_total_fat: 28, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Green Goddess Cobb Salad with Chicken',brand_name: 'Panera Bread', nf_calories: 530, nf_protein: 38, nf_total_carbohydrate: 25, nf_total_fat: 33, serving_unit: 'salad',    serving_qty: 1 },
  { food_name: 'Fuji Apple Salad with Chicken',        brand_name: 'Panera Bread', nf_calories: 560, nf_protein: 39, nf_total_carbohydrate: 43, nf_total_fat: 24, serving_unit: 'salad',    serving_qty: 1 },
  { food_name: 'Strawberry Poppyseed Salad with Chicken', brand_name: 'Panera Bread', nf_calories: 430, nf_protein: 30, nf_total_carbohydrate: 43, nf_total_fat: 14, serving_unit: 'salad', serving_qty: 1 },
  { food_name: 'Broccoli Cheddar Soup (bowl)',         brand_name: 'Panera Bread', nf_calories: 420, nf_protein: 17, nf_total_carbohydrate: 38, nf_total_fat: 24, serving_unit: 'bowl',     serving_qty: 1 },
  { food_name: 'Broccoli Cheddar Soup (cup)',          brand_name: 'Panera Bread', nf_calories: 230, nf_protein: 9,  nf_total_carbohydrate: 19, nf_total_fat: 14, serving_unit: 'cup',      serving_qty: 1 },
  { food_name: 'Chicken & Wild Rice Soup (cup)',       brand_name: 'Panera Bread', nf_calories: 170, nf_protein: 10, nf_total_carbohydrate: 23, nf_total_fat: 4,  serving_unit: 'cup',      serving_qty: 1 },
  { food_name: 'Frontega Chicken Panini',              brand_name: 'Panera Bread', nf_calories: 860, nf_protein: 48, nf_total_carbohydrate: 90, nf_total_fat: 32, serving_unit: 'sandwich', serving_qty: 1 },

  // ── Qdoba ─────────────────────────────────────────────────────────────────
  { food_name: 'Chicken Burrito Bowl',       brand_name: 'Qdoba', nf_calories: 770,  nf_protein: 55, nf_total_carbohydrate: 79, nf_total_fat: 25, serving_unit: 'bowl',    serving_qty: 1 },
  { food_name: 'Steak Burrito Bowl',         brand_name: 'Qdoba', nf_calories: 800,  nf_protein: 47, nf_total_carbohydrate: 79, nf_total_fat: 28, serving_unit: 'bowl',    serving_qty: 1 },
  { food_name: 'Steak Burrito',              brand_name: 'Qdoba', nf_calories: 850,  nf_protein: 47, nf_total_carbohydrate: 90, nf_total_fat: 30, serving_unit: 'burrito', serving_qty: 1 },
  { food_name: 'Grilled Chicken Quesadilla', brand_name: 'Qdoba', nf_calories: 760,  nf_protein: 42, nf_total_carbohydrate: 60, nf_total_fat: 36, serving_unit: 'quesadilla', serving_qty: 1 },
  { food_name: 'Chicken Street Tacos (3)',   brand_name: 'Qdoba', nf_calories: 490,  nf_protein: 35, nf_total_carbohydrate: 46, nf_total_fat: 18, serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'Barbacoa Burrito Bowl',      brand_name: 'Qdoba', nf_calories: 700,  nf_protein: 45, nf_total_carbohydrate: 72, nf_total_fat: 24, serving_unit: 'bowl',    serving_qty: 1 },
  { food_name: 'Impossible Fajita Bowl',     brand_name: 'Qdoba', nf_calories: 590,  nf_protein: 23, nf_total_carbohydrate: 70, nf_total_fat: 24, serving_unit: 'bowl',    serving_qty: 1 },
  { food_name: '3-Cheese Nachos with Chicken', brand_name: 'Qdoba', nf_calories: 1010, nf_protein: 52, nf_total_carbohydrate: 82, nf_total_fat: 50, serving_unit: 'order', serving_qty: 1 },

  // ── Panda Express ─────────────────────────────────────────────────────────
  { food_name: 'Orange Chicken',              brand_name: 'Panda Express', nf_calories: 490, nf_protein: 25, nf_total_carbohydrate: 51, nf_total_fat: 23, serving_unit: 'serving (5.7oz)', serving_qty: 1 },
  { food_name: 'Grilled Teriyaki Chicken',    brand_name: 'Panda Express', nf_calories: 300, nf_protein: 36, nf_total_carbohydrate: 8,  nf_total_fat: 13, serving_unit: 'serving',         serving_qty: 1 },
  { food_name: 'Kung Pao Chicken',            brand_name: 'Panda Express', nf_calories: 290, nf_protein: 18, nf_total_carbohydrate: 22, nf_total_fat: 14, serving_unit: 'serving',         serving_qty: 1 },
  { food_name: 'String Bean Chicken Breast',  brand_name: 'Panda Express', nf_calories: 190, nf_protein: 14, nf_total_carbohydrate: 15, nf_total_fat: 9,  serving_unit: 'serving',         serving_qty: 1 },
  { food_name: 'Broccoli Beef',               brand_name: 'Panda Express', nf_calories: 130, nf_protein: 9,  nf_total_carbohydrate: 13, nf_total_fat: 5,  serving_unit: 'serving',         serving_qty: 1 },
  { food_name: 'Chow Mein',                   brand_name: 'Panda Express', nf_calories: 510, nf_protein: 13, nf_total_carbohydrate: 80, nf_total_fat: 18, serving_unit: 'serving (9.4oz)', serving_qty: 1 },
  { food_name: 'Fried Rice',                  brand_name: 'Panda Express', nf_calories: 530, nf_protein: 11, nf_total_carbohydrate: 85, nf_total_fat: 16, serving_unit: 'serving (9.3oz)', serving_qty: 1 },
  { food_name: 'Steamed White Rice',          brand_name: 'Panda Express', nf_calories: 380, nf_protein: 7,  nf_total_carbohydrate: 86, nf_total_fat: 0,  serving_unit: 'serving (8.1oz)', serving_qty: 1 },
  { food_name: 'Super Greens',                brand_name: 'Panda Express', nf_calories: 90,  nf_protein: 6,  nf_total_carbohydrate: 13, nf_total_fat: 3,  serving_unit: 'serving',         serving_qty: 1 },
  { food_name: 'Honey Walnut Shrimp',         brand_name: 'Panda Express', nf_calories: 360, nf_protein: 13, nf_total_carbohydrate: 35, nf_total_fat: 23, serving_unit: 'serving',         serving_qty: 1 },

  // ── Taco Bell ─────────────────────────────────────────────────────────────
  { food_name: 'Crunchwrap Supreme',              brand_name: 'Taco Bell', nf_calories: 530, nf_protein: 17, nf_total_carbohydrate: 71, nf_total_fat: 21, serving_unit: 'item',   serving_qty: 1 },
  { food_name: 'Chicken Quesadilla',              brand_name: 'Taco Bell', nf_calories: 500, nf_protein: 28, nf_total_carbohydrate: 40, nf_total_fat: 26, serving_unit: 'item',   serving_qty: 1 },
  { food_name: 'Power Menu Bowl - Chicken',       brand_name: 'Taco Bell', nf_calories: 470, nf_protein: 26, nf_total_carbohydrate: 51, nf_total_fat: 19, serving_unit: 'bowl',   serving_qty: 1 },
  { food_name: 'Steak Quesadilla',                brand_name: 'Taco Bell', nf_calories: 520, nf_protein: 26, nf_total_carbohydrate: 39, nf_total_fat: 28, serving_unit: 'item',   serving_qty: 1 },
  { food_name: 'Bean & Cheese Burrito',           brand_name: 'Taco Bell', nf_calories: 380, nf_protein: 15, nf_total_carbohydrate: 55, nf_total_fat: 10, serving_unit: 'burrito',serving_qty: 1 },
  { food_name: 'Cheesy Gordita Crunch',           brand_name: 'Taco Bell', nf_calories: 490, nf_protein: 21, nf_total_carbohydrate: 48, nf_total_fat: 24, serving_unit: 'item',   serving_qty: 1 },
  { food_name: 'Doritos Locos Taco Supreme',      brand_name: 'Taco Bell', nf_calories: 190, nf_protein: 10, nf_total_carbohydrate: 16, nf_total_fat: 10, serving_unit: 'taco',   serving_qty: 1 },
  { food_name: 'Grande Scrambler Burrito - Chicken', brand_name: 'Taco Bell', nf_calories: 680, nf_protein: 36, nf_total_carbohydrate: 70, nf_total_fat: 27, serving_unit: 'burrito', serving_qty: 1 },

  // ── Wendy's ───────────────────────────────────────────────────────────────
  { food_name: "Dave's Single",                  brand_name: "Wendy's", nf_calories: 590, nf_protein: 30, nf_total_carbohydrate: 40, nf_total_fat: 34, serving_unit: 'burger',   serving_qty: 1 },
  { food_name: "Dave's Double",                  brand_name: "Wendy's", nf_calories: 820, nf_protein: 49, nf_total_carbohydrate: 41, nf_total_fat: 52, serving_unit: 'burger',   serving_qty: 1 },
  { food_name: 'Baconator',                      brand_name: "Wendy's", nf_calories: 950, nf_protein: 57, nf_total_carbohydrate: 37, nf_total_fat: 62, serving_unit: 'burger',   serving_qty: 1 },
  { food_name: 'Spicy Chicken Sandwich',         brand_name: "Wendy's", nf_calories: 530, nf_protein: 35, nf_total_carbohydrate: 57, nf_total_fat: 18, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Grilled Chicken Sandwich',       brand_name: "Wendy's", nf_calories: 370, nf_protein: 34, nf_total_carbohydrate: 36, nf_total_fat: 9,  serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Apple Pecan Chicken Salad (full)', brand_name: "Wendy's", nf_calories: 570, nf_protein: 42, nf_total_carbohydrate: 43, nf_total_fat: 25, serving_unit: 'salad',  serving_qty: 1 },
  { food_name: 'Chili (small)',                  brand_name: "Wendy's", nf_calories: 190, nf_protein: 17, nf_total_carbohydrate: 17, nf_total_fat: 6,  serving_unit: 'small',    serving_qty: 1 },
  { food_name: 'Jr. Cheeseburger',               brand_name: "Wendy's", nf_calories: 290, nf_protein: 16, nf_total_carbohydrate: 26, nf_total_fat: 14, serving_unit: 'burger',   serving_qty: 1 },

  // ── Five Guys ─────────────────────────────────────────────────────────────
  { food_name: 'Little Hamburger',       brand_name: 'Five Guys', nf_calories: 540, nf_protein: 26, nf_total_carbohydrate: 40, nf_total_fat: 31, serving_unit: 'burger', serving_qty: 1 },
  { food_name: 'Little Cheeseburger',    brand_name: 'Five Guys', nf_calories: 610, nf_protein: 29, nf_total_carbohydrate: 40, nf_total_fat: 39, serving_unit: 'burger', serving_qty: 1 },
  { food_name: 'Hamburger',             brand_name: 'Five Guys', nf_calories: 700, nf_protein: 34, nf_total_carbohydrate: 40, nf_total_fat: 43, serving_unit: 'burger', serving_qty: 1 },
  { food_name: 'Cheeseburger',          brand_name: 'Five Guys', nf_calories: 840, nf_protein: 43, nf_total_carbohydrate: 40, nf_total_fat: 55, serving_unit: 'burger', serving_qty: 1 },
  { food_name: 'Bacon Cheeseburger',    brand_name: 'Five Guys', nf_calories: 920, nf_protein: 51, nf_total_carbohydrate: 40, nf_total_fat: 60, serving_unit: 'burger', serving_qty: 1 },
  { food_name: 'Little Bacon Burger',   brand_name: 'Five Guys', nf_calories: 620, nf_protein: 31, nf_total_carbohydrate: 40, nf_total_fat: 38, serving_unit: 'burger', serving_qty: 1 },
  { food_name: 'Five Guys Style Fries (regular)', brand_name: 'Five Guys', nf_calories: 953, nf_protein: 15, nf_total_carbohydrate: 131, nf_total_fat: 41, serving_unit: 'regular', serving_qty: 1 },

  // ── Jersey Mike's ─────────────────────────────────────────────────────────
  { food_name: 'Turkey & Provolone #4 (regular)',  brand_name: "Jersey Mike's", nf_calories: 560, nf_protein: 34, nf_total_carbohydrate: 63, nf_total_fat: 18, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Roast Beef & Provolone #5 (regular)', brand_name: "Jersey Mike's", nf_calories: 530, nf_protein: 36, nf_total_carbohydrate: 63, nf_total_fat: 16, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Club Supreme #26 (regular)',       brand_name: "Jersey Mike's", nf_calories: 700, nf_protein: 40, nf_total_carbohydrate: 63, nf_total_fat: 29, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Chicken Philly #55 (regular)',     brand_name: "Jersey Mike's", nf_calories: 660, nf_protein: 45, nf_total_carbohydrate: 65, nf_total_fat: 25, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Philly Cheese Steak #56 (regular)',brand_name: "Jersey Mike's", nf_calories: 730, nf_protein: 44, nf_total_carbohydrate: 65, nf_total_fat: 31, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'BLT #7 (regular)',                 brand_name: "Jersey Mike's", nf_calories: 640, nf_protein: 23, nf_total_carbohydrate: 64, nf_total_fat: 32, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Ham & Provolone #2 (regular)',     brand_name: "Jersey Mike's", nf_calories: 520, nf_protein: 31, nf_total_carbohydrate: 63, nf_total_fat: 17, serving_unit: 'regular', serving_qty: 1 },

  // ── Jimmy John's ──────────────────────────────────────────────────────────
  { food_name: 'Turkey Tom #4',           brand_name: "Jimmy John's", nf_calories: 540, nf_protein: 30, nf_total_carbohydrate: 55, nf_total_fat: 21, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Big John #2 (Roast Beef)',brand_name: "Jimmy John's", nf_calories: 540, nf_protein: 31, nf_total_carbohydrate: 56, nf_total_fat: 21, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Bootlegger Club #7',      brand_name: "Jimmy John's", nf_calories: 670, nf_protein: 40, nf_total_carbohydrate: 56, nf_total_fat: 31, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Beach Club #12',          brand_name: "Jimmy John's", nf_calories: 730, nf_protein: 36, nf_total_carbohydrate: 57, nf_total_fat: 41, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Italian Night Club #9',   brand_name: "Jimmy John's", nf_calories: 810, nf_protein: 38, nf_total_carbohydrate: 57, nf_total_fat: 48, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Hunter\'s Club #10',      brand_name: "Jimmy John's", nf_calories: 670, nf_protein: 41, nf_total_carbohydrate: 56, nf_total_fat: 30, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Totally Tuna #6',         brand_name: "Jimmy John's", nf_calories: 620, nf_protein: 27, nf_total_carbohydrate: 57, nf_total_fat: 31, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Slim 1 Ham (8")',          brand_name: "Jimmy John's", nf_calories: 450, nf_protein: 26, nf_total_carbohydrate: 55, nf_total_fat: 14, serving_unit: 'sandwich', serving_qty: 1 },

  // ── Raising Cane's ────────────────────────────────────────────────────────
  { food_name: '3 Finger Combo',         brand_name: "Raising Cane's", nf_calories: 770,  nf_protein: 42, nf_total_carbohydrate: 68, nf_total_fat: 31, serving_unit: 'combo',   serving_qty: 1 },
  { food_name: 'Box Combo (4 Fingers)',  brand_name: "Raising Cane's", nf_calories: 1000, nf_protein: 52, nf_total_carbohydrate: 86, nf_total_fat: 42, serving_unit: 'combo',   serving_qty: 1 },
  { food_name: 'Chicken Sandwich',       brand_name: "Raising Cane's", nf_calories: 680,  nf_protein: 38, nf_total_carbohydrate: 62, nf_total_fat: 27, serving_unit: 'sandwich',serving_qty: 1 },
  { food_name: 'Chicken Finger (1 pc)',  brand_name: "Raising Cane's", nf_calories: 135,  nf_protein: 11, nf_total_carbohydrate: 7,  nf_total_fat: 6,  serving_unit: 'piece',   serving_qty: 1 },
  { food_name: 'Crinkle-Cut Fries (regular)', brand_name: "Raising Cane's", nf_calories: 340, nf_protein: 4, nf_total_carbohydrate: 46, nf_total_fat: 16, serving_unit: 'regular', serving_qty: 1 },
  { food_name: "Cane's Sauce",           brand_name: "Raising Cane's", nf_calories: 190,  nf_protein: 0,  nf_total_carbohydrate: 2,  nf_total_fat: 20, serving_unit: 'serving', serving_qty: 1 },
  { food_name: 'Texas Toast (1 slice)',  brand_name: "Raising Cane's", nf_calories: 100,  nf_protein: 2,  nf_total_carbohydrate: 12, nf_total_fat: 5,  serving_unit: 'slice',   serving_qty: 1 },

  // ── Popeyes ───────────────────────────────────────────────────────────────
  { food_name: 'Chicken Sandwich',                    brand_name: 'Popeyes', nf_calories: 700, nf_protein: 28, nf_total_carbohydrate: 50, nf_total_fat: 42, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Spicy Chicken Sandwich',              brand_name: 'Popeyes', nf_calories: 700, nf_protein: 28, nf_total_carbohydrate: 50, nf_total_fat: 42, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Handcrafted Tenders (3 pc)',          brand_name: 'Popeyes', nf_calories: 370, nf_protein: 26, nf_total_carbohydrate: 20, nf_total_fat: 22, serving_unit: 'order',    serving_qty: 1 },
  { food_name: 'Spicy Chicken Breast (bone-in)',      brand_name: 'Popeyes', nf_calories: 420, nf_protein: 35, nf_total_carbohydrate: 21, nf_total_fat: 22, serving_unit: 'piece',    serving_qty: 1 },
  { food_name: 'Mild Chicken Breast (bone-in)',       brand_name: 'Popeyes', nf_calories: 390, nf_protein: 35, nf_total_carbohydrate: 21, nf_total_fat: 18, serving_unit: 'piece',    serving_qty: 1 },
  { food_name: 'Red Beans & Rice (regular)',          brand_name: 'Popeyes', nf_calories: 230, nf_protein: 8,  nf_total_carbohydrate: 31, nf_total_fat: 9,  serving_unit: 'regular',  serving_qty: 1 },
  { food_name: 'Mashed Potatoes with Cajun Gravy (regular)', brand_name: 'Popeyes', nf_calories: 110, nf_protein: 2, nf_total_carbohydrate: 18, nf_total_fat: 4, serving_unit: 'regular', serving_qty: 1 },

  // ── Wingstop ──────────────────────────────────────────────────────────────
  { food_name: 'Classic Wings (6 pc)',      brand_name: 'Wingstop', nf_calories: 490,  nf_protein: 38, nf_total_carbohydrate: 10, nf_total_fat: 34, serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'Classic Wings (10 pc)',     brand_name: 'Wingstop', nf_calories: 820,  nf_protein: 63, nf_total_carbohydrate: 17, nf_total_fat: 57, serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'Boneless Wings (6 pc)',     brand_name: 'Wingstop', nf_calories: 540,  nf_protein: 28, nf_total_carbohydrate: 50, nf_total_fat: 22, serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'Chicken Sandwich (Classic)', brand_name: 'Wingstop', nf_calories: 490, nf_protein: 32, nf_total_carbohydrate: 42, nf_total_fat: 20, serving_unit: 'sandwich',serving_qty: 1 },
  { food_name: 'Seasoned Fries (regular)',  brand_name: 'Wingstop', nf_calories: 390,  nf_protein: 7,  nf_total_carbohydrate: 55, nf_total_fat: 17, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Louisiana Voodoo Fries',    brand_name: 'Wingstop', nf_calories: 820,  nf_protein: 18, nf_total_carbohydrate: 93, nf_total_fat: 43, serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'Cajun Corn (1 ear)',        brand_name: 'Wingstop', nf_calories: 200,  nf_protein: 3,  nf_total_carbohydrate: 42, nf_total_fat: 3,  serving_unit: 'ear',     serving_qty: 1 },

  // ── Sweetgreen ────────────────────────────────────────────────────────────
  { food_name: 'Harvest Bowl',              brand_name: 'Sweetgreen', nf_calories: 705, nf_protein: 34, nf_total_carbohydrate: 67, nf_total_fat: 34, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Chicken Pesto Parm',        brand_name: 'Sweetgreen', nf_calories: 640, nf_protein: 48, nf_total_carbohydrate: 36, nf_total_fat: 34, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Hot Honey Chicken Plate',   brand_name: 'Sweetgreen', nf_calories: 790, nf_protein: 52, nf_total_carbohydrate: 76, nf_total_fat: 29, serving_unit: 'plate',serving_qty: 1 },
  { food_name: 'Guacamole Greens',          brand_name: 'Sweetgreen', nf_calories: 605, nf_protein: 21, nf_total_carbohydrate: 44, nf_total_fat: 42, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Shroomami',                 brand_name: 'Sweetgreen', nf_calories: 595, nf_protein: 19, nf_total_carbohydrate: 73, nf_total_fat: 27, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Kale Caesar',               brand_name: 'Sweetgreen', nf_calories: 475, nf_protein: 20, nf_total_carbohydrate: 24, nf_total_fat: 33, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Super Green Goddess',       brand_name: 'Sweetgreen', nf_calories: 440, nf_protein: 27, nf_total_carbohydrate: 40, nf_total_fat: 19, serving_unit: 'bowl', serving_qty: 1 },

  // ── Cava ──────────────────────────────────────────────────────────────────
  { food_name: 'Grilled Chicken Bowl',       brand_name: 'Cava', nf_calories: 620, nf_protein: 48, nf_total_carbohydrate: 62, nf_total_fat: 20, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Lamb Meatball Bowl',         brand_name: 'Cava', nf_calories: 750, nf_protein: 45, nf_total_carbohydrate: 65, nf_total_fat: 28, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Harissa Honey Chicken Bowl', brand_name: 'Cava', nf_calories: 670, nf_protein: 48, nf_total_carbohydrate: 62, nf_total_fat: 21, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Falafel Bowl',               brand_name: 'Cava', nf_calories: 680, nf_protein: 23, nf_total_carbohydrate: 80, nf_total_fat: 31, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Grilled Chicken Pita',       brand_name: 'Cava', nf_calories: 540, nf_protein: 35, nf_total_carbohydrate: 60, nf_total_fat: 17, serving_unit: 'pita', serving_qty: 1 },
  { food_name: 'Crazy Feta Beef Bowl',       brand_name: 'Cava', nf_calories: 720, nf_protein: 44, nf_total_carbohydrate: 64, nf_total_fat: 28, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Roasted Veggie Bowl',        brand_name: 'Cava', nf_calories: 580, nf_protein: 18, nf_total_carbohydrate: 75, nf_total_fat: 24, serving_unit: 'bowl', serving_qty: 1 },

  // ── Shake Shack ───────────────────────────────────────────────────────────
  { food_name: 'ShackBurger',              brand_name: 'Shake Shack', nf_calories: 530, nf_protein: 29, nf_total_carbohydrate: 40, nf_total_fat: 29, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'SmokeShack',              brand_name: 'Shake Shack', nf_calories: 660, nf_protein: 36, nf_total_carbohydrate: 40, nf_total_fat: 40, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'Shack Stack',             brand_name: 'Shake Shack', nf_calories: 810, nf_protein: 41, nf_total_carbohydrate: 40, nf_total_fat: 49, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'Chick\'n Shack',          brand_name: 'Shake Shack', nf_calories: 540, nf_protein: 31, nf_total_carbohydrate: 53, nf_total_fat: 22, serving_unit: 'sandwich',serving_qty: 1 },
  { food_name: 'Double SmokeShack',       brand_name: 'Shake Shack', nf_calories: 910, nf_protein: 56, nf_total_carbohydrate: 40, nf_total_fat: 63, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'Crinkle-Cut Fries (regular)', brand_name: 'Shake Shack', nf_calories: 470, nf_protein: 7, nf_total_carbohydrate: 62, nf_total_fat: 22, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Vanilla Shake (small)',    brand_name: 'Shake Shack', nf_calories: 570, nf_protein: 15, nf_total_carbohydrate: 78, nf_total_fat: 23, serving_unit: 'small',   serving_qty: 1 },

  // ── Domino's ──────────────────────────────────────────────────────────────
  { food_name: 'Pepperoni Pizza (2 slices, large hand tossed)',   brand_name: "Domino's", nf_calories: 490, nf_protein: 21, nf_total_carbohydrate: 59, nf_total_fat: 19, serving_unit: '2 slices', serving_qty: 1 },
  { food_name: 'Cheese Pizza (2 slices, large hand tossed)',      brand_name: "Domino's", nf_calories: 410, nf_protein: 16, nf_total_carbohydrate: 59, nf_total_fat: 14, serving_unit: '2 slices', serving_qty: 1 },
  { food_name: 'BBQ Chicken Pizza (2 slices, large hand tossed)', brand_name: "Domino's", nf_calories: 460, nf_protein: 21, nf_total_carbohydrate: 64, nf_total_fat: 14, serving_unit: '2 slices', serving_qty: 1 },
  { food_name: 'MeatZZa Pizza (2 slices, large hand tossed)',     brand_name: "Domino's", nf_calories: 560, nf_protein: 27, nf_total_carbohydrate: 57, nf_total_fat: 25, serving_unit: '2 slices', serving_qty: 1 },
  { food_name: 'Chicken Parm Sandwich',                           brand_name: "Domino's", nf_calories: 850, nf_protein: 45, nf_total_carbohydrate: 91, nf_total_fat: 31, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Pepperoni Stuffed Cheesy Bread (2 pc)',           brand_name: "Domino's", nf_calories: 380, nf_protein: 14, nf_total_carbohydrate: 39, nf_total_fat: 19, serving_unit: '2 pieces', serving_qty: 1 },
  { food_name: 'Chocolate Lava Crunch Cake (1)',                  brand_name: "Domino's", nf_calories: 370, nf_protein: 5,  nf_total_carbohydrate: 55, nf_total_fat: 15, serving_unit: 'cake',     serving_qty: 1 },

  // ── In-N-Out Burger ───────────────────────────────────────────────────────
  { food_name: 'Double-Double',                    brand_name: 'In-N-Out Burger', nf_calories: 670, nf_protein: 37, nf_total_carbohydrate: 39, nf_total_fat: 41, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'Cheeseburger',                     brand_name: 'In-N-Out Burger', nf_calories: 480, nf_protein: 22, nf_total_carbohydrate: 39, nf_total_fat: 27, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'Hamburger',                        brand_name: 'In-N-Out Burger', nf_calories: 390, nf_protein: 16, nf_total_carbohydrate: 39, nf_total_fat: 19, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'Double-Double Protein Style',       brand_name: 'In-N-Out Burger', nf_calories: 520, nf_protein: 33, nf_total_carbohydrate: 11, nf_total_fat: 39, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'Cheeseburger Protein Style',        brand_name: 'In-N-Out Burger', nf_calories: 330, nf_protein: 18, nf_total_carbohydrate: 11, nf_total_fat: 25, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'French Fries',                     brand_name: 'In-N-Out Burger', nf_calories: 400, nf_protein: 7,  nf_total_carbohydrate: 54, nf_total_fat: 18, serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'Animal Style Fries',               brand_name: 'In-N-Out Burger', nf_calories: 750, nf_protein: 18, nf_total_carbohydrate: 59, nf_total_fat: 49, serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'Vanilla Shake',                    brand_name: 'In-N-Out Burger', nf_calories: 580, nf_protein: 9,  nf_total_carbohydrate: 85, nf_total_fat: 21, serving_unit: 'shake',   serving_qty: 1 },

  // ── Arby's ────────────────────────────────────────────────────────────────
  { food_name: 'Classic Roast Beef',         brand_name: "Arby's", nf_calories: 360, nf_protein: 23, nf_total_carbohydrate: 37, nf_total_fat: 14, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Double Roast Beef',          brand_name: "Arby's", nf_calories: 510, nf_protein: 35, nf_total_carbohydrate: 37, nf_total_fat: 25, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Beef & Cheddar (Classic)',   brand_name: "Arby's", nf_calories: 450, nf_protein: 25, nf_total_carbohydrate: 44, nf_total_fat: 19, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Smokehouse Brisket Sandwich',brand_name: "Arby's", nf_calories: 700, nf_protein: 37, nf_total_carbohydrate: 53, nf_total_fat: 37, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Crispy Fish Sandwich',       brand_name: "Arby's", nf_calories: 490, nf_protein: 19, nf_total_carbohydrate: 51, nf_total_fat: 23, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Turkey Classic',             brand_name: "Arby's", nf_calories: 430, nf_protein: 30, nf_total_carbohydrate: 41, nf_total_fat: 15, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Curly Fries (medium)',       brand_name: "Arby's", nf_calories: 490, nf_protein: 8,  nf_total_carbohydrate: 62, nf_total_fat: 24, serving_unit: 'medium',   serving_qty: 1 },

  // ── Noodles & Company ─────────────────────────────────────────────────────
  { food_name: 'Wisconsin Mac & Cheese',            brand_name: 'Noodles & Company', nf_calories: 930, nf_protein: 32, nf_total_carbohydrate: 126, nf_total_fat: 35, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Pasta Fresca with Chicken',         brand_name: 'Noodles & Company', nf_calories: 700, nf_protein: 38, nf_total_carbohydrate: 88,  nf_total_fat: 19, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Penne Rosa with Chicken',           brand_name: 'Noodles & Company', nf_calories: 760, nf_protein: 39, nf_total_carbohydrate: 93,  nf_total_fat: 24, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Zucchini Pesto with Chicken',       brand_name: 'Noodles & Company', nf_calories: 620, nf_protein: 42, nf_total_carbohydrate: 48,  nf_total_fat: 28, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Japanese Pan Noodles',              brand_name: 'Noodles & Company', nf_calories: 780, nf_protein: 21, nf_total_carbohydrate: 133, nf_total_fat: 18, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Med Salad with Grilled Chicken',    brand_name: 'Noodles & Company', nf_calories: 480, nf_protein: 37, nf_total_carbohydrate: 41,  nf_total_fat: 18, serving_unit: 'salad',   serving_qty: 1 },
  { food_name: 'Chinese Chop Salad with Chicken',   brand_name: 'Noodles & Company', nf_calories: 480, nf_protein: 34, nf_total_carbohydrate: 48,  nf_total_fat: 17, serving_unit: 'salad',   serving_qty: 1 },
  { food_name: 'Buttered Noodles',                  brand_name: 'Noodles & Company', nf_calories: 810, nf_protein: 25, nf_total_carbohydrate: 125, nf_total_fat: 25, serving_unit: 'regular', serving_qty: 1 },

  // ── Dutch Bros ────────────────────────────────────────────────────────────
  { food_name: 'Caramelizer (medium, 2% milk)',       brand_name: 'Dutch Bros', nf_calories: 380, nf_protein: 9,  nf_total_carbohydrate: 55, nf_total_fat: 15, serving_unit: 'medium', serving_qty: 1 },
  { food_name: 'Annihilator (medium, 2% milk)',       brand_name: 'Dutch Bros', nf_calories: 460, nf_protein: 9,  nf_total_carbohydrate: 69, nf_total_fat: 18, serving_unit: 'medium', serving_qty: 1 },
  { food_name: 'Kicker (medium, 2% milk)',            brand_name: 'Dutch Bros', nf_calories: 360, nf_protein: 9,  nf_total_carbohydrate: 48, nf_total_fat: 15, serving_unit: 'medium', serving_qty: 1 },
  { food_name: 'Golden Eagle (medium, 2% milk)',      brand_name: 'Dutch Bros', nf_calories: 440, nf_protein: 9,  nf_total_carbohydrate: 63, nf_total_fat: 18, serving_unit: 'medium', serving_qty: 1 },
  { food_name: 'Vanilla Cold Brew (medium, 2% milk)', brand_name: 'Dutch Bros', nf_calories: 280, nf_protein: 8,  nf_total_carbohydrate: 42, nf_total_fat: 9,  serving_unit: 'medium', serving_qty: 1 },
  { food_name: 'Iced Americano (medium)',             brand_name: 'Dutch Bros', nf_calories: 10,  nf_protein: 1,  nf_total_carbohydrate: 1,  nf_total_fat: 0,  serving_unit: 'medium', serving_qty: 1 },
  { food_name: 'Blue Rebel Energy Drink (medium)',    brand_name: 'Dutch Bros', nf_calories: 160, nf_protein: 0,  nf_total_carbohydrate: 38, nf_total_fat: 0,  serving_unit: 'medium', serving_qty: 1 },
  { food_name: 'Chai Tea Latte (medium, 2% milk)',    brand_name: 'Dutch Bros', nf_calories: 320, nf_protein: 8,  nf_total_carbohydrate: 50, nf_total_fat: 9,  serving_unit: 'medium', serving_qty: 1 },

  // ── KFC ───────────────────────────────────────────────────────────────────
  { food_name: 'Original Recipe Chicken Breast',   brand_name: 'KFC', nf_calories: 380, nf_protein: 38, nf_total_carbohydrate: 11, nf_total_fat: 21, serving_unit: 'piece',    serving_qty: 1 },
  { food_name: 'Extra Crispy Chicken Breast',      brand_name: 'KFC', nf_calories: 530, nf_protein: 38, nf_total_carbohydrate: 22, nf_total_fat: 35, serving_unit: 'piece',    serving_qty: 1 },
  { food_name: 'Kentucky Grilled Chicken Breast',  brand_name: 'KFC', nf_calories: 220, nf_protein: 38, nf_total_carbohydrate: 0,  nf_total_fat: 7,  serving_unit: 'piece',    serving_qty: 1 },
  { food_name: 'Chicken Pot Pie',                  brand_name: 'KFC', nf_calories: 720, nf_protein: 28, nf_total_carbohydrate: 79, nf_total_fat: 33, serving_unit: 'pie',      serving_qty: 1 },
  { food_name: 'Famous Bowl',                      brand_name: 'KFC', nf_calories: 710, nf_protein: 26, nf_total_carbohydrate: 86, nf_total_fat: 27, serving_unit: 'bowl',     serving_qty: 1 },
  { food_name: 'Original Recipe Chicken Thigh',    brand_name: 'KFC', nf_calories: 310, nf_protein: 22, nf_total_carbohydrate: 8,  nf_total_fat: 21, serving_unit: 'piece',    serving_qty: 1 },
  { food_name: 'Biscuit',                          brand_name: 'KFC', nf_calories: 180, nf_protein: 4,  nf_total_carbohydrate: 22, nf_total_fat: 8,  serving_unit: 'biscuit',  serving_qty: 1 },
  { food_name: 'Cole Slaw (individual)',            brand_name: 'KFC', nf_calories: 170, nf_protein: 1,  nf_total_carbohydrate: 21, nf_total_fat: 9,  serving_unit: 'side',     serving_qty: 1 },

  // ── Burger King ───────────────────────────────────────────────────────────
  { food_name: 'Whopper',                       brand_name: 'Burger King', nf_calories: 660, nf_protein: 28, nf_total_carbohydrate: 49, nf_total_fat: 40, serving_unit: 'burger',   serving_qty: 1 },
  { food_name: 'Double Whopper',                brand_name: 'Burger King', nf_calories: 900, nf_protein: 48, nf_total_carbohydrate: 50, nf_total_fat: 56, serving_unit: 'burger',   serving_qty: 1 },
  { food_name: 'Crispy Chicken Sandwich',       brand_name: 'Burger King', nf_calories: 660, nf_protein: 28, nf_total_carbohydrate: 60, nf_total_fat: 34, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Impossible Whopper',            brand_name: 'Burger King', nf_calories: 630, nf_protein: 25, nf_total_carbohydrate: 58, nf_total_fat: 34, serving_unit: 'burger',   serving_qty: 1 },
  { food_name: 'Chicken Junior',                brand_name: 'Burger King', nf_calories: 430, nf_protein: 17, nf_total_carbohydrate: 44, nf_total_fat: 20, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Sausage, Egg & Cheese Croissan\'wich', brand_name: 'Burger King', nf_calories: 490, nf_protein: 17, nf_total_carbohydrate: 28, nf_total_fat: 35, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Medium French Fries',           brand_name: 'Burger King', nf_calories: 380, nf_protein: 4,  nf_total_carbohydrate: 50, nf_total_fat: 17, serving_unit: 'medium',   serving_qty: 1 },

  // ── Buffalo Wild Wings ────────────────────────────────────────────────────
  { food_name: 'Traditional Wings (6 pc)',       brand_name: 'Buffalo Wild Wings', nf_calories: 360,  nf_protein: 33, nf_total_carbohydrate: 0,  nf_total_fat: 24, serving_unit: 'order',    serving_qty: 1 },
  { food_name: 'Boneless Wings (6 pc)',          brand_name: 'Buffalo Wild Wings', nf_calories: 480,  nf_protein: 26, nf_total_carbohydrate: 38, nf_total_fat: 25, serving_unit: 'order',    serving_qty: 1 },
  { food_name: 'Crispy Chicken Sandwich',        brand_name: 'Buffalo Wild Wings', nf_calories: 630,  nf_protein: 36, nf_total_carbohydrate: 60, nf_total_fat: 27, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Street Tacos with Chicken (3 pc)', brand_name: 'Buffalo Wild Wings', nf_calories: 480, nf_protein: 29, nf_total_carbohydrate: 42, nf_total_fat: 18, serving_unit: 'order',  serving_qty: 1 },
  { food_name: 'Asian Zing Wings (6 pc traditional)', brand_name: 'Buffalo Wild Wings', nf_calories: 410, nf_protein: 33, nf_total_carbohydrate: 12, nf_total_fat: 24, serving_unit: 'order', serving_qty: 1 },
  { food_name: 'Lemon Pepper Wings (6 pc traditional)', brand_name: 'Buffalo Wild Wings', nf_calories: 430, nf_protein: 33, nf_total_carbohydrate: 1, nf_total_fat: 32, serving_unit: 'order', serving_qty: 1 },
  { food_name: 'Mozzarella Sticks (6 pc)',       brand_name: 'Buffalo Wild Wings', nf_calories: 730,  nf_protein: 23, nf_total_carbohydrate: 65, nf_total_fat: 41, serving_unit: 'order',    serving_qty: 1 },
  { food_name: 'Cheeseburger',                   brand_name: 'Buffalo Wild Wings', nf_calories: 840,  nf_protein: 47, nf_total_carbohydrate: 59, nf_total_fat: 48, serving_unit: 'burger',   serving_qty: 1 },

  // ── Culver's ──────────────────────────────────────────────────────────────
  { food_name: 'ButterBurger Single',        brand_name: "Culver's", nf_calories: 390, nf_protein: 21, nf_total_carbohydrate: 33, nf_total_fat: 19, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'ButterBurger Double',        brand_name: "Culver's", nf_calories: 540, nf_protein: 31, nf_total_carbohydrate: 33, nf_total_fat: 30, serving_unit: 'burger',  serving_qty: 1 },
  { food_name: 'Chicken Tenders (3 pc)',     brand_name: "Culver's", nf_calories: 430, nf_protein: 27, nf_total_carbohydrate: 28, nf_total_fat: 23, serving_unit: 'order',   serving_qty: 1 },
  { food_name: 'North Atlantic Cod Sandwich',brand_name: "Culver's", nf_calories: 430, nf_protein: 20, nf_total_carbohydrate: 44, nf_total_fat: 19, serving_unit: 'sandwich',serving_qty: 1 },
  { food_name: 'Wisconsin Cheese Curds (regular)', brand_name: "Culver's", nf_calories: 520, nf_protein: 20, nf_total_carbohydrate: 40, nf_total_fat: 32, serving_unit: 'regular', serving_qty: 1 },
  { food_name: 'Concrete Mixer Vanilla (small)',   brand_name: "Culver's", nf_calories: 490, nf_protein: 11, nf_total_carbohydrate: 61, nf_total_fat: 23, serving_unit: 'small',   serving_qty: 1 },
  { food_name: 'Crinkle-Cut Fries (regular)',      brand_name: "Culver's", nf_calories: 380, nf_protein: 5,  nf_total_carbohydrate: 51, nf_total_fat: 17, serving_unit: 'regular', serving_qty: 1 },

]

// ─────────────────────────────────────────────────────────────────────────────
// RELEVANCE SCORING
// ─────────────────────────────────────────────────────────────────────────────

function scoreResult(item, query) {
  let score = 0
  const name  = item.food_name.toLowerCase()
  const brand = (item.brand_name || '').toLowerCase()
  const q     = query.toLowerCase()

  // Exact / prefix / contains on food name
  if (name === q)           score += 100
  if (name.startsWith(q))   score += 50
  if (name.includes(q))     score += 25

  // Brand matches
  if (brand === q)          score += 60
  if (brand.startsWith(q))  score += 40
  if (brand.includes(q))    score += 15

  // Multi-word query: score each word individually
  const words = q.split(/\s+/).filter(w => w.length > 2)
  for (const word of words) {
    if (name.includes(word))  score += 10
    if (brand.includes(word)) score += 8
  }

  return score
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search restaurant menu items.
 * @param {string} query
 * @returns {Promise<Array>} Array of food items matching the Nutritionix shape.
 */
export async function searchRestaurants(query) {
  if (!query?.trim()) return []
  try {
    const items = await callRestaurantSearch(query, 'search')
    if (items) return items
  } catch {}
  return searchRestaurantsMock(query)
}

async function searchRestaurantsMock(query) {
  // Simulate network latency so loading states are testable
  await new Promise(r => setTimeout(r, 350))

  return MOCK_RESTAURANTS
    .map(item => ({ ...item, _score: scoreResult(item, query) }))
    .filter(item => item._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 20)
    .map(({ _score, ...item }) => item)  // strip internal _score before returning
}

async function callRestaurantSearch(query, mode = 'search') {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/restaurant-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ query, mode }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.items || []
}

export const NUTRITIONIX_HAS_REAL_KEYS = true

// ─────────────────────────────────────────────────────────────────────────────
// CHAIN BROWSER EXPORTS
// Used by the restaurant chain picker UI.
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORTED_CHAINS = [
  "Applebee's", "Arby's", "Auntie Anne's", 'Baja Fresh', 'Baskin-Robbins',
  'Bob Evans', 'Boston Market', "Braum's", "Bruegger's Bagels", 'Buffalo Wild Wings',
  'Burger King', 'California Pizza Kitchen', "Captain D's", "Carl's Jr.", 'Cava',
  "Checkers/Rally's", 'Cheesecake Factory', 'Chick-fil-A', "Chili's", 'Chipotle',
  "Church's Chicken", 'Cinnabon', 'Corner Bakery', 'Costco Food Court', 'Cracker Barrel',
  "Culver's", 'Dairy Queen', 'Del Taco', "Denny's", "Domino's", 'Dutch Bros',
  'El Pollo Loco', "Fazoli's", 'Firehouse Subs', 'First Watch', 'Five Guys',
  'Golden Corral', 'Habit Burger', "Hardee's", 'IHOP', 'In-N-Out Burger',
  'Jack in the Box', "Jason's Deli", "Jersey Mike's", "Jimmy John's", "Joe's Crab Shack",
  'KFC', 'Krispy Kreme', 'Little Caesars', "Long John Silver's", "Luby's",
  "McAlister's Deli", "McDonald's", "Moe's Southwest Grill", 'Noodles & Company',
  'Olive Garden', 'On the Border', 'Outback Steakhouse', 'Panda Express', 'Panera Bread',
  "Papa John's", "Papa Murphy's", 'Perkins', 'Pizza Hut', 'Popeyes', 'Port of Subs',
  'Potbelly', 'Qdoba', "Raising Cane's", 'Red Lobster', 'Red Robin', "Rubio's",
  'Sbarro', 'Shake Shack', 'Slim Chickens', 'Smoothie King', 'Sonic Drive-In',
  'Starbucks', "Steak 'n Shake", 'Subway', 'Sweetgreen', 'TGI Fridays', 'Taco Bell',
  'Tim Hortons', 'Tropical Smoothie Cafe', 'Waffle House', "Wendy's", 'Whataburger',
  'White Castle', 'Wingstop', "Zaxby's", 'Zoes Kitchen',
]

export const CHAIN_NAMES = SUPPORTED_CHAINS.sort()

/**
 * Get all menu items for a specific chain.
 * In mock mode: filters local data (no limit, all items).
 * In real mode: calls Nutritionix instant search with the brand name.
 */
export async function getChainMenuItems(brandName) {
  if (!brandName) return []
  try {
    const items = await callRestaurantSearch(brandName, 'chain')
    if (items && items.length > 0) {
      return items.filter(i =>
        i.brand_name?.toLowerCase().includes(brandName.toLowerCase()) ||
        brandName.toLowerCase().includes(i.brand_name?.toLowerCase())
      )
    }
  } catch {}
  await new Promise(r => setTimeout(r, 250))
  return MOCK_RESTAURANTS.filter(item => item.brand_name === brandName)
}
