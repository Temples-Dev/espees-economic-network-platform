"""Fixture content for the `seed_demo` command. Pure data, no database access."""

DEMO_DOMAIN = 'demo.eenp.test'
DEMO_PASSWORD = 'DemoPass123!'

CATEGORIES = [
    'Food & Catering',
    'Fashion & Beauty',
    'Technology & Repairs',
    'Health & Wellness',
    'Education & Training',
    'Agriculture',
    'Media & Creative',
    'Construction & Trades',
]

REVIEWERS = [
    ('Abena Osei', 'abena'), ('Kwame Boateng', 'kwame'), ('Chidi Okafor', 'chidi'),
    ('Ngozi Eze', 'ngozi'), ('Yaw Mensah', 'yaw'), ('Efua Addo', 'efua'),
    ('Tunde Bakare', 'tunde'), ('Amaka Obi', 'amaka'), ('Kojo Antwi', 'kojo'),
    ('Zainab Musa', 'zainab'),
]

COMMENTS = {
    5: ['Excellent service, highly recommended.', 'Fast, friendly and fair prices.', 'Best in the network.'],
    4: ['Very good experience overall.', 'Would use again.', 'Great quality, slightly slow.'],
    3: ['Decent, but there is room to improve.', 'Okay for the price.'],
}

# name, slug-for-email, category, location, status, phone, description, ratings, offerings
# offerings: (kind, name, price, description)
BUSINESSES = [
    (
        "Mama Tee's Kitchen", 'mama-tees', 'Food & Catering', 'Accra', 'verified', '+233244100101',
        'Home-style Ghanaian catering for weddings, offices and church events. Jollof, waakye, kelewele and more.',
        [5, 5, 4, 5, 5, 4, 5, 5, 4, 5],
        [
            ('product', 'Party Jollof Tray (serves 10)', '180.00', 'Smoky party jollof with chicken.'),
            ('product', 'Waakye Family Pack', '95.00', 'Waakye with fish, egg, gari and shito.'),
            ('service', 'Event Catering (per head)', '35.00', 'Full-service catering for 50+ guests.'),
        ],
    ),
    (
        'The Golden Spoon', 'golden-spoon', 'Food & Catering', 'Kumasi', 'verified', '+233244100102',
        'Contemporary restaurant and delivery kitchen serving continental and local dishes.',
        [5, 4, 4, 5, 4, 4, 5],
        [
            ('product', 'Grilled Tilapia Meal', '60.00', 'Whole tilapia with banku and pepper.'),
            ('product', 'Office Lunch Box', '28.00', 'Daily rotating lunch box, delivered.'),
        ],
    ),
    (
        'Adwoa Bakes', 'adwoa-bakes', 'Food & Catering', 'Tema', 'pending', '+233244100103',
        'Custom cakes, pastries and small-chops baked fresh to order.',
        [4, 5, 4],
        [
            ('product', 'Celebration Cake (2 tier)', '220.00', 'Custom design, vanilla or red velvet.'),
            ('product', 'Small-Chops Platter', '75.00', 'Spring rolls, samosas, puff-puff.'),
        ],
    ),
    (
        'Kofi Tech Repairs', 'kofi-tech', 'Technology & Repairs', 'Accra', 'verified', '+233244100104',
        'Laptop, phone and tablet repairs with a 30-day warranty. Same-day screen and battery replacement.',
        [5, 5, 5, 4, 5, 5, 4, 5],
        [
            ('service', 'Laptop Diagnostic', '25.00', 'Full hardware and software check.'),
            ('service', 'Screen Replacement', '150.00', 'Phones and tablets, same day.'),
            ('product', 'Original Laptop Charger', '45.00', 'Compatible with most major brands.'),
        ],
    ),
    (
        'Byte & Bolt Electronics', 'byte-bolt', 'Technology & Repairs', 'Lagos', 'unverified', '+2348011100105',
        'Solar inverters, power banks and small electronics for home and office.',
        [4, 3, 4],
        [
            ('product', '10,000mAh Power Bank', '32.00', 'Fast-charge, dual USB.'),
            ('product', 'Home Solar Starter Kit', '640.00', '300W panel with inverter and battery.'),
        ],
    ),
    (
        'Zuri Styles', 'zuri-styles', 'Fashion & Beauty', 'Lagos', 'verified', '+2348011100106',
        'Bespoke African fashion. Ankara, aso-oke and contemporary tailoring for men and women.',
        [5, 5, 4, 5, 5, 5],
        [
            ('product', 'Ankara Shirt', '85.00', 'Made-to-measure, ready in 5 days.'),
            ('service', 'Bespoke Tailoring', '210.00', 'Two fittings included.'),
            ('product', 'Aso-Oke Set', '340.00', 'Handwoven, includes gele.'),
        ],
    ),
    (
        'Glow by Ama', 'glow-ama', 'Fashion & Beauty', 'Accra', 'verified', '+233244100107',
        'Skincare, makeup artistry and bridal beauty by certified artists.',
        [5, 4, 5, 4, 5],
        [
            ('service', 'Bridal Makeup', '300.00', 'Trial session included.'),
            ('product', 'Shea Glow Body Butter', '22.00', 'Raw shea, cocoa and vitamin E.'),
        ],
    ),
    (
        'Vitality Wellness Clinic', 'vitality', 'Health & Wellness', 'Abuja', 'verified', '+2348011100108',
        'Family clinic offering check-ups, physiotherapy and nutrition counselling.',
        [5, 5, 5, 4, 5, 4, 5, 5],
        [
            ('service', 'General Consultation', '40.00', 'Thirty-minute appointment.'),
            ('service', 'Physiotherapy Session', '65.00', 'One hour with a licensed therapist.'),
        ],
    ),
    (
        'BrightPath Academy', 'brightpath', 'Education & Training', 'Kumasi', 'verified', '+233244100109',
        'After-school tutoring and exam preparation for primary and secondary students.',
        [5, 4, 5, 4],
        [
            ('service', 'Monthly Tutoring Plan', '120.00', 'Three sessions a week, any two subjects.'),
            ('service', 'WASSCE Prep Bootcamp', '260.00', 'Four-week intensive.'),
        ],
    ),
    (
        'CodeHive Africa', 'codehive', 'Education & Training', 'Accra', 'pending', '+233244100110',
        'Practical coding classes and web design services for young people and small businesses.',
        [5, 5],
        [
            ('service', 'Web Design Starter', '450.00', 'Five-page business website.'),
            ('service', 'Coding Bootcamp (8 weeks)', '380.00', 'Beginner-friendly, project based.'),
        ],
    ),
    (
        'GreenAcre Farms', 'greenacre', 'Agriculture', 'Takoradi', 'verified', '+233244100111',
        'Farm-fresh vegetables, poultry and eggs delivered weekly to homes and restaurants.',
        [4, 5, 4, 4, 5, 3],
        [
            ('product', 'Weekly Veggie Box', '55.00', 'Seasonal vegetables from our farm.'),
            ('product', 'Crate of Eggs (30)', '42.00', 'Free-range, collected daily.'),
        ],
    ),
    (
        'Harvest Link Co-op', 'harvest-link', 'Agriculture', 'Kumasi', 'unverified', '+233244100112',
        'A cooperative connecting smallholder farmers with buyers. Bulk maize, cassava and yam.',
        [],
        [
            ('product', 'Maize (50kg bag)', '110.00', 'Dry, cleaned and bagged.'),
            ('product', 'Yam Tubers (bulk)', '260.00', 'Per 100 tubers, farm gate price.'),
        ],
    ),
    (
        'Lens & Light Studios', 'lens-light', 'Media & Creative', 'Accra', 'verified', '+233244100113',
        'Photography, videography and brand content for events, weddings and businesses.',
        [5, 5, 4, 5, 5, 4, 5],
        [
            ('service', 'Event Photography (4 hrs)', '320.00', 'Edited gallery within 5 days.'),
            ('service', 'Brand Video Shoot', '780.00', 'Script, shoot and edit.'),
        ],
    ),
    (
        'SolidBuild Contractors', 'solidbuild', 'Construction & Trades', 'Abuja', 'verified', '+2348011100114',
        'Residential building, renovation and plumbing by licensed tradespeople.',
        [4, 4, 5, 3],
        [
            ('service', 'Bathroom Renovation', '1400.00', 'Materials and labour quoted per project.'),
            ('service', 'Plumbing Call-out', '50.00', 'Diagnosis and minor repairs.'),
        ],
    ),
]

# title, description, purpose, goal, percent raised, contributors, business-slug (owner) or reviewer slug
CAMPAIGNS = [
    ('Community Borehole for Ashaiman', 'Drilling a clean-water borehole to serve 400 households.',
     'Clean water', '5000.00', 25, 6, 'mama-tees'),
    ('School Library for BrightPath', 'Stocking a new library with 1,500 books and reading tables.',
     'Education', '2000.00', 62, 9, 'brightpath'),
    ('Youth Coding Lab', 'Ten laptops and internet access for a free after-school coding lab.',
     'Technology', '3500.00', 41, 7, 'codehive'),
    ('Solar Power for Vitality Clinic', 'Installing solar panels so the clinic never loses power.',
     'Health', '4200.00', 88, 10, 'vitality'),
    ("Women's Farming Co-op Tractor", 'A shared tractor for 60 women smallholder farmers.',
     'Agriculture', '9000.00', 14, 5, 'harvest-link'),
    ('Sports Field Renovation', 'Resurfacing the community football and netball pitch.',
     'Community', '6000.00', 5, 3, 'solidbuild'),
]

MEMBER_ORDERS = [
    # business name, offering name, quantity, status, hours ago
    ("Mama Tee's Kitchen", 'Party Jollof Tray (serves 10)', 1, 'pending', 3),
    ('Kofi Tech Repairs', 'Laptop Diagnostic', 1, 'confirmed', 30),
    ('Zuri Styles', 'Ankara Shirt', 2, 'fulfilled', 96),
]

MEMBER_NOTIFICATIONS = [
    # category, title, message, read, hours ago
    ('commerce', 'Order placed', "Your order with Mama Tee's Kitchen is awaiting confirmation.", False, 3),
    ('commerce', 'Order confirmed', 'Kofi Tech Repairs confirmed your laptop diagnostic.', False, 28),
    ('campaign', 'Campaign milestone', 'Solar Power for Vitality Clinic just passed 85% funded.', True, 50),
    ('communication', 'New message', 'Zuri Styles replied to your enquiry.', True, 70),
    ('security', 'New sign-in', 'A new device signed in to your account.', True, 120),
]

MEMBER_CONVERSATIONS = [
    # business name, [(from_business, body)], unread from business
    ("Mama Tee's Kitchen", [
        (False, 'Hello, is the party jollof available for Saturday?'),
        (True, 'Hi! Yes, we can deliver Saturday by noon.'),
        (True, 'Shall I confirm 20 portions for you?'),
    ]),
    ('Kofi Tech Repairs', [
        (False, 'My laptop keeps shutting down. Can you look at it?'),
        (True, 'Bring it in any time before 5pm, diagnostics take about an hour.'),
    ]),
]
