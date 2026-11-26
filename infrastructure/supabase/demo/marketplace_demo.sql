-- =====================================================================
-- DEMO DATA for the consumer app (marketplace look and feel).
--
--   * kitchen-001 (the real, monitored kitchen) gets a listing and a menu.
--   * A few DEMO kitchens (code 'demo-...') with menus. They have no
--     devices, so the app shows them as "Not monitored": no hygiene grade is
--     ever invented for them.
--
-- Run once in the Supabase SQL Editor after the marketplace migrations.
-- Safe to re-run (updates/inserts only what is missing). Remove the demo
-- kitchens with:  delete from public.kitchens where code like 'demo-%';
-- =====================================================================

-- The real kitchen's listing (operators can edit these fields later).
update public.kitchens
   set cuisine          = coalesce(cuisine, 'Sri Lankan · Rice & Curry'),
       description      = coalesce(description, 'Home-style Sri Lankan meals from a kitchen monitored live by sensors and AI.'),
       emoji            = coalesce(emoji, '🍛'),
       delivery_fee_lkr = 200,
       prep_minutes     = 25
 where code = 'kitchen-001';

insert into public.kitchens (code, name, location, is_public, cuisine, description, emoji, delivery_fee_lkr, prep_minutes, opens_at, closes_at)
values
  ('demo-kottu',   'Kandy Kottu House (demo)',   'Kandy',       true, 'Kottu · Street food',  'Demo listing — not a real kitchen.', '🥘', 250, 30, '11:00', '23:30'),
  ('demo-burger',  'Lakeside Burgers (demo)',    'Kandy',       true, 'Burgers · Fast food',  'Demo listing — not a real kitchen.', '🍔', 300, 20, '10:00', '23:00'),
  ('demo-pizza',   'Hill Country Pizza (demo)',  'Peradeniya',  true, 'Pizza · Italian',      'Demo listing — not a real kitchen.', '🍕', 350, 35, '12:00', '23:00'),
  ('demo-healthy', 'Green Bowl (demo)',          'Kandy',       true, 'Healthy · Salads',     'Demo listing — not a real kitchen.', '🥗', 250, 20, '08:00', '20:00'),
  ('demo-dessert', 'Sweet Corner (demo)',        'Katugastota', true, 'Desserts · Bakery',    'Demo listing — not a real kitchen.', '🍰', 200, 15, '09:00', '22:00')
on conflict (code) do nothing;

insert into public.menu_items (kitchen_id, name, description, category, price_lkr, emoji, sort_order)
select k.id, m.name, m.description, m.category, m.price, m.emoji, m.sort_order
  from public.kitchens k
  join (values
    ('kitchen-001', 'Chicken rice & curry', 'Red rice, chicken curry, dhal, two vegetables, papadam', 'Rice & curry', 750, '🍛', 1),
    ('kitchen-001', 'Fish rice & curry',    'Red rice, fish ambul thiyal, dhal, two vegetables',      'Rice & curry', 800, '🐟', 2),
    ('kitchen-001', 'Vegetable rice & curry','Red rice, five vegetable curries, papadam',             'Rice & curry', 550, '🥬', 3),
    ('kitchen-001', 'Egg fried rice',       'With chilli paste',                                       'Fried rice',   650, '🍳', 4),
    ('kitchen-001', 'Lime juice',           'Fresh, lightly sweetened',                                'Drinks',       250, '🍋', 5),
    ('demo-kottu',  'Chicken kottu',        'Godamba roti, chicken, egg, vegetables',                  'Kottu',        950, '🥘', 1),
    ('demo-kottu',  'Cheese kottu',         'With mozzarella',                                          'Kottu',       1150, '🧀', 2),
    ('demo-kottu',  'Egg kottu',            NULL,                                                       'Kottu',        750, '🥚', 3),
    ('demo-burger', 'Classic chicken burger', 'Crispy chicken, lettuce, mayo',                         'Burgers',     1250, '🍔', 1),
    ('demo-burger', 'Beef burger',          'Grilled beef, cheese, pickles',                           'Burgers',     1450, '🍔', 2),
    ('demo-burger', 'Fries',                NULL,                                                       'Sides',        500, '🍟', 3),
    ('demo-pizza',  'Margherita (medium)',  'Tomato, mozzarella, basil',                                'Pizza',       2200, '🍕', 1),
    ('demo-pizza',  'Devilled chicken (medium)', 'Sri Lankan devilled chicken, onion, capsicum',       'Pizza',       2600, '🌶️', 2),
    ('demo-healthy','Grilled chicken salad','Greens, grilled chicken, honey-lime dressing',             'Salads',      1350, '🥗', 1),
    ('demo-healthy','Fruit bowl',           'Seasonal fruit',                                           'Bowls',        800, '🍉', 2),
    ('demo-dessert','Watalappan',           'Jaggery and coconut custard',                              'Desserts',     450, '🍮', 1),
    ('demo-dessert','Chocolate cake slice', NULL,                                                       'Cakes',        550, '🍰', 2)
  ) as m(code, name, description, category, price, emoji, sort_order) on m.code = k.code
on conflict (kitchen_id, name) do nothing;
