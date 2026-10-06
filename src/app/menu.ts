export interface ModifierOption { name: string; price: number }
// "modifier" = a choice that changes the item itself; "addon" = an extra sold alongside it.
// How Aloha exposes the two (and whether add-ons arrive as separate PLUs) is still to be confirmed,
// so the split lives in this one field and the UI only reads it for grouping.
export interface ModifierGroup { id: string; title: string; kind: "modifier" | "addon"; min: number; max: number; options: ModifierOption[] }
export interface Product { id: number; name: string; price: number; img: string; category: string; mostOrdered: boolean; description?: string }

export const categories = ["Chickenjoy", "Burgers", "Jolly Spaghetti", "Breakfast", "Desserts", "Beverages"];

export const products: Product[] = [
  { id: 1, name: "2-Piece Chickenjoy", price: 18, img: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400", category: "Chickenjoy", mostOrdered: true },
  { id: 2, name: "Spicy Chickenjoy", price: 20, img: "https://images.unsplash.com/photo-1562967914-608f82629710?w=400", category: "Chickenjoy", mostOrdered: true },
  { id: 3, name: "Family Bucket (8pc)", price: 65, img: "https://images.unsplash.com/photo-1562967914-608f82629710?w=400", category: "Chickenjoy", mostOrdered: true },
  { id: 4, name: "Chickenjoy w/ Rice", price: 22, img: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400", category: "Chickenjoy", mostOrdered: false },
  { id: 5, name: "Yumburger", price: 12, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", category: "Burgers", mostOrdered: true },
  { id: 6, name: "Amazing Aloha", price: 18, img: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400", category: "Burgers", mostOrdered: false },
  { id: 7, name: "Cheesy Deluxe", price: 16, img: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400", category: "Burgers", mostOrdered: false },
  { id: 8, name: "Jolly Spaghetti", price: 15, img: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400", category: "Jolly Spaghetti", mostOrdered: true },
  { id: 9, name: "Pancakes", price: 14, img: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400", category: "Breakfast", mostOrdered: false },
  { id: 10, name: "Peach Mango Pie", price: 6, img: "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=400", category: "Desserts", mostOrdered: false },
  { id: 11, name: "Iced Coffee", price: 10, img: "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400", category: "Beverages", mostOrdered: false },
  { id: 12, name: "2-Piece Chickenjoy Meal", price: 28, img: "https://images.unsplash.com/photo-1600555379765-f82335a7b1b0?w=400", category: "Chickenjoy", mostOrdered: false },
];

// Add-on groups are sample data; the real app fetches them per item from the menu API.
const groupsByCategory: Record<string, ModifierGroup[]> = {
  Chickenjoy: [
    { id: "flavor", title: "Flavor", kind: "modifier", min: 1, max: 1, options: [{ name: "Original", price: 0 }, { name: "Spicy", price: 0 }] },
    { id: "sides", title: "Sides", kind: "addon", min: 0, max: 2, options: [{ name: "Steamed Rice", price: 3 }, { name: "Regular Fries", price: 5 }, { name: "Extra Gravy", price: 2 }] },
  ],
  Burgers: [
    { id: "addons", title: "Extras", kind: "addon", min: 0, max: 3, options: [{ name: "Extra Cheese", price: 2 }, { name: "Beef Bacon", price: 4 }, { name: "Fried Egg", price: 3 }] },
  ],
  Beverages: [
    { id: "size", title: "Size", kind: "modifier", min: 1, max: 1, options: [{ name: "Regular", price: 0 }, { name: "Large", price: 3 }] },
  ],
};

export const modifierGroupsFor = (p: Product): ModifierGroup[] => groupsByCategory[p.category] ?? [];

// Placeholder descriptions until the menu API supplies them.
const descriptions: Record<string, string> = {
  Chickenjoy: "Crispy on the outside, juicy on the inside — Jollibee's signature fried chicken.",
  Burgers: "A beef patty in a soft bun with Jollibee's special dressing.",
  "Jolly Spaghetti": "Sweet-style spaghetti sauce loaded with sliced hotdog, ground meat and cheese.",
  Breakfast: "A warm start to the day, served until late morning.",
  Desserts: "A sweet finish, freshly prepared.",
  Beverages: "Served chilled.",
};

export const descriptionFor = (p: Product) => p.description ?? descriptions[p.category] ?? "";
export const productById = (id: number) => products.find((p) => p.id === id);
